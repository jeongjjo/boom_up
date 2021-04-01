var MongoClient = require('mongodb').MongoClient;
var username = global.config.mongodb.username || null;
var password = global.config.mongodb.password || null;
var database = global.config.mongodb.database;
var url = 'mongodb://' + (username && password ? username + ':' + password + '@' : '') + global.config.mongodb.host + database;
//var url = 'mongodb://' + (username && password ? username + ':' + password + '@' : '') + global.config.mongodb.host + database+ '?replicaSet=rs1';
//var url = 'mongodb://' + (username && password ? username + ':' + password + '@' : '') + global.config.mongodb.host + database + '?authSource=admin&authMechanism=SCRAM-SHA-1';
var _mongodb = null;
// Initialize connection once
MongoClient.connect(url, global.config.mongodb.opts, function (err, objDatabase) {
    if (err) throw err;

    _mongodb = objDatabase.db(global.config.mongodb.database);

    console.log("Initialized mongo db pool");
});

module.exports = {
    db: function (coll) {
        return _mongodb.collection(coll);
    }
};
