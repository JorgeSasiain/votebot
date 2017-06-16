import { MongoClient } from 'mongodb';

var MONGO_URI = '';
try {
  MONGO_URI = require('./credentials').MONGO_URI;
} catch (ex) {
  MONGO_URI = process.env.MONGO_URI;
}

const Mongo = {

  MONGO_URI: MONGO_URI,

  db: null,

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

  close: function() {
    if (Mongo.db) {
      Mongo.db.close(function(err, result) {
        Mongo.db = null;
      });
    }
  },

  getAboutToExpirePollsID: function(callback) {

    let _getAboutToExpirePollsID = function(triggerDates, callback) {

      if (triggerDates == null || callback == null) return; /* Connection to DB failed */

      let triggerDatePoll = triggerDates[0];
      let triggerDateVote = triggerDates[1];

      Mongo.db.collection('polls').find({
        private: true,
        expireAt: { $lt: triggerDatePoll }
      }).toArray(function(err, result) {

        result.forEach(function(element){
          console.log(element._id);
        });

      });

      Mongo.db.collection('polls').find({
        private: false,
        expireAt: { $lt: triggerDateVote }
      }).toArray(function(err, result) {

        result.forEach(function(element){
          console.log(element._id);
        });

      });

    };

    let triggerTime = new Date().getTime();
    let triggerDatePoll = new Date(triggerTime + 24 * 60 * 60000 + 2 * 60000); /* +24h 2m */
    let triggerDateVote = new Date(triggerTime + 2 * 60000); /* +2m */

    Mongo.connect(_getAboutToExpirePollsID, [triggerDatePoll, triggerDateVote], callback);

  }

}

module.exports = Mongo;
