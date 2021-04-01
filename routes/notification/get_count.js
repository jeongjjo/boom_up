/**
 * @file 
 * 개발 샘플
 *
 * GET /sample/test2
 */

const exValidator = require("express-validator");
/*
Express Validator 6.2
https://express-validator.github.io/docs/schema-validation.html
https://auth0.com/blog/express-validator-tutorial/
*/

var common = require("../../module/common");
var db = require("../../module/mongodbWrapper");
var dbCache = require("../../module/dbCache");
var ObjectId = require('mongodb').ObjectId;

module.exports = [
    null,
    [], // 권한 : null은 권한 미체크, [] array 형태로 권한 지정
    [],
    async function (req, res, next) {
        var userId = req.user._id.toHexString();
        var notificationCount = await db.count("notification", {$and:[{"receiver": userId}, {"readed" : false}]}) || 0;
        res.json({
            result: "ok",        //ok , error,
            codemsg:"notification-count",
            displaymsg: "",     
            data: notificationCount,
        });
    }
];
