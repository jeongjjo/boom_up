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

//var mongodb = require('../../module/mongodb');
var db = require("../../module/dao/DB");
var betting = require("../../module/data/betting");
var ObjectId = require('mongodb').ObjectId;
module.exports = [
    '/test', // URI : /test2 (최종은 /<route module>/<page module> : /sameple/test2)
    null, // 권한 : null은 권한 미체크, [] array 형태로 권한 지정
    [],
    async function (req, res, next) {
        res.render('home/test')
        //await betting.dayInit()
        // let count = await db.count("board")
        // let pageCount = Math.ceil(count/1000)
        // let limit = 100
        // for(let i = 0; i < pageCount; i++){
        //     await betting.rankInit(i*limit, 100)
        // }
        // //await betting.rankInit()
        // return res.json({
        //     result: "ok"
        // });
    }
];
