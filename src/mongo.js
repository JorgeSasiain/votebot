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

      Mongo.db.collection('users').updateMany(
        { },
        { $pull: { availablePolls: { poll_id: _id } } }
      );

    }

  },

  /* Functions to handle a vote expiring */
  onVoteExpire: {

    notifyMucs: function(_id, callback) {

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

    let polls = [];
    let numPolls = 0;
    let onPollPushed = function() {
      numPolls --;
      if (!numPolls) callback(polls.length ? polls : false)
    }

    Mongo.db.collection('users').findOne({ user: user }, function(err, document) {

      if (!document.hasOwnProperty('availablePolls')) {
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

  /* Check if select code received matches a user's available poll and apply callback to it*/
  findUserPollBySelectCode: function(user, code, callback) {

    Mongo.db.collection('users').findOne(
      { user: user },
      { user: 1, availablePolls: { $elemMatch: { id_select: code } } },
    function(err, document) {

      /* No match */
      if (!document.hasOwnProperty('availablePolls')) {
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

  initSessionData: function(user, poll_id, callback) {

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

  eraseSessionData: function(user) {

    Mongo.db.collection('users').updateOne({user: user}, {$unset: {session: 1}});

  },

  getNextQuestion: function(user, callback) {

    Mongo.db.collection('users').findOne({user: user}, {session: 1},
    function(err, document) {

      if (err || !document) {
        callback("err", null, null, null);
        Mongo.eraseSessionData(user);
        return;
      }

      Mongo.db.collection('polls').findOne({_id: document.session.poll_id}, {questions: 1},
      function(err, doc) {

        /* Error occurred */
        if (err || !doc) {
          callback("err", null, null, null);
          Mongo.eraseSessionData(user);
          return;
        }

        /* No more questions. Poll finished */
        let numQt = document.session.numQt;
        if (numQt >= doc.questions.length) {
          callback(null, null, null, null);
          Mongo.eraseSessionData(user);
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

  applyVote: function(user, choices, callback) {

    Mongo.db.collection('users').findOne({user: user}, {session: 1},
    function(err, document) {

      if (err || !document) {
        callback("err", null, null, null);
        Mongo.eraseSessionData(user);
        return;
      }

      let numQt = document.session.numQt;
      Mongo.db.collection('users').updateOne({user: user},
        { $push: {"session.votes": choices}, $inc: {"session.numQt": 1} },
        function(err, result) {
          if (err || !result) {
            if (err) console.log("2"+err);
            callback("err", null, null, null);
            Mongo.eraseSessionData(user);
            return;
          }
          Mongo.getNextQuestion(user, callback);
        });

    });

  }

}

module.exports = Mongo;
