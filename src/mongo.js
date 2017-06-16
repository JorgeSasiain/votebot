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

  connect: function(callback, param) {

    if (Mongo.db) {
      callback(param);
      return;
    }

    MongoClient.connect(Mongo.MONGO_URI, function(err, db) {
      if (err) {
        callback(null);
        return;
      }
      Mongo.db = db;
      callback(param);
    });

  },

  close: function() {
    if (Mongo.db) {
      Mongo.db.close(function(err, result) {
        Mongo.db = null;
      });
    }
  },

}

module.exports = Mongo;
