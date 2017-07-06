import { MongoClient } from 'mongodb';

var MONGO_URI = '';
try {
  MONGO_URI = require('./credentials').MONGO_URI;
} catch (ex) {
  MONGO_URI = process.env.MONGO_URI;
}

const Mongo = {

  MONGO_URI: MONGO_URI,

  /* Connection instance */
  db: null,

  /* Function to create a connection pool to the database and execute the passed callback */
  connect: function(callback, param1, param2) {

    if (Mongo.db) {
      callback(param1, param2);
      return;
    }

    MongoClient.connect(Mongo.MONGO_URI, function(err, db) {
      if (err) {
        callback(null, null);
        return;
      }
      Mongo.db = db;
      callback(param1, param2);
    });

  },

  /* Close the connection pool to the database */
  close: function() {
    if (Mongo.db) {
      Mongo.db.close(function(err, result) {
        Mongo.db = null;
      });
    }
  },

  /* Check for polls that are about to expire */
  /* Also checks that there is an open connection (every minute) */
  getAboutToExpirePollsID: function(callback) {

    let _getAboutToExpirePollsID = function(triggerDates, callback) {

      if (triggerDates == null || callback == null) return; /* Connection to DB failed */

      let triggerDatePoll = triggerDates[0];
      let triggerDateVote = triggerDates[1];

      Mongo.db.collection('polls').find({
        private: true,
        expireAt: { $lt: triggerDatePoll }
      }).toArray(function(err, result) {

        result.forEach(function(document) {
          callback("poll", document._id, document.title);
        });

      });

      Mongo.db.collection('polls').find({
        private: false,
        expireAt: { $lt: triggerDateVote }
      }).toArray(function(err, result) {

        result.forEach(function(document) {
          callback("vote", document._id, document.questions[0].question);
        });

      });

    };

    let triggerTime = new Date().getTime();
    let triggerDatePoll = new Date(triggerTime + 24 * 60 * 60000 + 65000); /* +24h ~1m */
    let triggerDateVote = new Date(triggerTime + 65000); /* +~1m */

    Mongo.connect(_getAboutToExpirePollsID, [triggerDatePoll, triggerDateVote], callback);

  },

  /* Functions to handle a poll expiring */
  onPollExpire: {

    notifyPollOwner: function(_id, callback) {

      if (!Mongo.db) return;

      Mongo.db.collection('users').find(
        { availablePolls: { $elemMatch: { poll_id: _id } } },
        { user: 1, availablePolls: { $elemMatch: { poll_id: _id } } }
      ).toArray(function(err, result) {

        result.forEach(function(document) {
          if (document.hasOwnProperty('availablePolls')) {
            if (document.availablePolls[0].owner) {
              callback(document.user);
            }
          }
        });

      });

    },

    deleteFromUsersAvailablePolls: function(_id) {

      if (!Mongo.db) return;

      Mongo.db.collection('users').updateMany(
        { },
        { $pull: { availablePolls: { poll_id: _id } } }
      );

    }

  },

  /* Functions to handle a vote expiring */
  onVoteExpire: {

    notifyMucs: function(_id, callback) {

      if (!Mongo.db) return;

      let mucs = [];

      Mongo.db.collection('mucs').find({
        poll_id: _id
      }).toArray(function(err, result) {

        result.forEach(function(document) {
          mucs.push(document.muc);
        });

        callback(mucs);

      });

    }

  },

  /* Apply callback to each poll available to the specified user */
  getUserAvailablePolls: function(user, callback) {

    if (!Mongo.db) return;

    let polls = [];
    let numPolls = 0;
    let onPollPushed = function() {
      numPolls --;
      if (!numPolls) callback(polls.length ? polls : false)
    }

    Mongo.db.collection('users').findOne({ user: user }, function(err, document) {

      if (!document.hasOwnProperty('availablePolls') || !document.availablePolls.length) {
        callback(false);
        return;
      }
      numPolls = document.availablePolls.length;

      for (let poll of document.availablePolls) {

        /* Don't show polls created by user */
        if (poll.owner) {
          onPollPushed();
          continue;
        }

        /* Push the data of the poll to show to the user */
        Mongo.db.collection('polls')
        .findOne( {_id: poll.poll_id }, { title: 1, creator: 1 }, function(err, doc) {
          if (doc)
            polls.push({title: doc.title, creator: doc.creator, id_select: poll.id_select});
          onPollPushed();
        });

      }

    });

  },

  /* Check if select code received matches a user's available poll and apply callback to it */
  findUserPollBySelectCode: function(user, code, callback) {

    if (!Mongo.db) return;

    Mongo.db.collection('users').findOne(
      { user: user },
      { user: 1, session: 1, availablePolls: { $elemMatch: { id_select: code } } },
    function(err, document) {

      /* Another poll already selected */
      if (document.hasOwnProperty('session')) {
        callback("cant");

      /* No match */
      } else if (!document.hasOwnProperty('availablePolls')) {
        callback(null);

      /* User is creator so can't vote */
      } else if (document.availablePolls[0].owner) {
        callback("own");

      } else {
        Mongo.db.collection('polls').findOne( {_id: document.availablePolls[0].poll_id},
        function(err, doc) {
          /* Poll doesn't exist in database */
          if (!doc) {
            callback("empty");
          /* Poll available for selection */
          } else {
            callback(doc);
          }
        });
      }

    });

  },

  /* Init user's session data when a poll is selected */
  initSessionData: function(user, poll_id, callback) {

    if (!Mongo.db) return;

    let session = {};
    session.poll_id = poll_id;
    session.numQt = 0;
    session.votes = [];

    Mongo.db.collection('users').updateOne({user: user}, {$set: {session: session}},
    function(err, result) {
      if (err || !result) {
        return;
      }
      callback();
    });

  },

  /* Erase user's session data after voting in a poll is finished or a poll is discarded */
  eraseSessionData: function(user, callback) {

    if (!Mongo.db) return;

    Mongo.db.collection('users').updateOne({user: user}, {$unset: {session: 1}},
    function(err, result) {
      if (!err && result && callback) callback(result.result.nModified);
    }
    );

  },

  /* Get next question of poll to send to user, or finish if no more questions */
  getNextQuestion: function(user, callback) {

    if (!Mongo.db) return;

    Mongo.db.collection('users').findOne({user: user},
    function(err, document) {

      /* Error occurred */
      if (err || !document || !document.hasOwnProperty('availablePolls')) {
        callback("err", null, null, null);
        Mongo.eraseSessionData(user, null);
        return;
      }

      let expired = true;
      for (let item of document.availablePolls) {
        if (item.poll_id.toString() === document.session.poll_id.toString()) {
          expired = false;
          break;
        }
      }

      /* Poll expired while user was voting */
      if (expired) {
        callback("exp", null, null, null);
        Mongo.eraseSessionData(user, null);
        return;
      }

      Mongo.db.collection('polls').findOne({_id: document.session.poll_id}, {questions: 1},
      function(err, doc) {

        /* Error occurred */
        if (err || !doc) {
          callback("err", null, null, null);
          Mongo.eraseSessionData(user, null);
          return;
        }

        /* No more questions. Poll finished */
        let numQt = document.session.numQt;
        if (numQt >= doc.questions.length) {
          callback(null, null, null, null);
          Mongo.eraseSessionData(user, null);
          Mongo.sumbitVotingResults(user, document.session);
          return;
        }

        /* Another question available */
        let name = doc.questions[numQt].question;
        let multiple = doc.questions[numQt].multiple;
        let choices = doc.questions[numQt].choices;
        callback(numQt, name, multiple, choices);

      });

    });

  },

  /* Apply user's vote in a question */
  applyVote: function(user, choices, callback) {

    if (!Mongo.db) return;

    Mongo.db.collection('users').findOne({user: user}, {session: 1},
    function(err, document) {

      /* Error occurred */
      if (err || !document) {
        callback("err", null, null, null);
        Mongo.eraseSessionData(user, null);
        return;
      }

      /* Np session data (user has not selected a poll) */
      if (!document.hasOwnProperty('session')) {
        callback("notNow", null, null, null);
        return;
      }

      /* Vote OK */
      let numQt = document.session.numQt;
      Mongo.db.collection('users').updateOne({user: user},
        { $push: {"session.votes": choices}, $inc: {"session.numQt": 1} },
      function(err, result) {
        if (err || !result) {
          callback("err", null, null, null);
          Mongo.eraseSessionData(user, null);
          return;
        }
        Mongo.getNextQuestion(user, callback);
      });

    });

  },

  /* Check if user is voting in any poll at the moment */
  checkIfSessionDataExists: function(user, callback) {

    if (!Mongo.db) return;

    Mongo.db.collection('users').findOne({user: user}, {session: 1},
    function(err, document) {

      if (!err || document) {
        callback(document.hasOwnProperty('session'));
      }

    });

  },

  /* Apply voting results to corresponding document in 'polls' collection */
  sumbitVotingResults: function(user, votingResults) {

    if (!Mongo.db) return;

    Mongo.db.collection('polls').findOne({_id: votingResults.poll_id}, {questions: 1},
    function(err, doc) {

      if (err || !doc) return;

      for (let i = 0; i < doc.questions.length; i ++) {
        for (let _i = 0; _i < doc.questions[i].votes.length; _i ++) {
          if (doc.questions[i].votes[_i] !== undefined && votingResults.votes[i][_i]) {
            doc.questions[i].votes[_i] ++;
            if (!doc.questions[i].multiple) break;
          }
        }
      }

      Mongo.db.collection('polls').updateOne(
        { _id: votingResults.poll_id },
        { $set: {questions: doc.questions} },
      function(err, result) {
        if (!err && result)
          /* If poll in normal chat */
          if (user) {
            Mongo.deleteFromUserAvailablePollsAfterVoting(user, votingResults.poll_id);
          /* If vote in MUC */
          } else {

          }
      });

    });

  },

  /* Update user's available polls after voting so they can't vote in same poll more than once */
  deleteFromUserAvailablePollsAfterVoting: function(user, poll_id) {

    if (!Mongo.db) return;

    Mongo.db.collection('users').updateOne(
      { user: user },
      { $pull: { availablePolls: { poll_id: poll_id } } }
    );

  },

  /* Redo last poll question if able and update user's session data to reflect it */
  goBackToLastQuestion: function(user, callback) {

    if (!Mongo.db) return;

    Mongo.db.collection('users').findOne({user: user},
    function(err, document) {

      if (err || !document) {
        return;
      }

      /* Not voting */
      if (!document.hasOwnProperty('session')) {
        callback("notSel", null, null, null);
        return;
      }

      /* It's the first question */
      if (document.session.numQt === 0) {
        callback("cant", null, null, null);
        return;
      }

      /* Go back OK */
      Mongo.db.collection('users').updateOne({user: user},
        { $pop: {"session.votes": 1}, $inc: {"session.numQt": -1} },

      function(err, result) {
        if (err || !result) {
          return;
        }
        Mongo.getNextQuestion(user, callback);
      });

    });

  },

  getPollIDInMUC: function(muc, callback) {

    if (!Mongo.db) return;

    Mongo.db.collection('mucs').findOne({muc: muc},
    function(err, document) {

      if (err || !document) {
        callback(null);
        return;
      }

      callback(document.poll_id);

    });

  }

}

module.exports = Mongo;
