var common = require("../common");
var db = require("../mongodbWrapper");
var dbCache = require("../dbCache");
var ObjectId = require('mongodb').ObjectId;
var moment = require('moment');
const STATUS = {
    UNREAD: 0,
    READ: 1
}
const TYPE = {
    BETTING: 0,
    REPLY: 1
}
module.exports = {
    setAlarm: async function(userId, type, data){
        let insertData = {
            userId: userId,
            type: type,
            status: STATUS.UNREAD,
            content: data
        }
        return await db.insert("alarm", insertData)
    }
}
