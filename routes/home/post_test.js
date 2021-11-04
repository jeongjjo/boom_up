/**
 * @file 
 * 개발 샘플
 *
 * GET /sample/test2
 */

const exValidator = require("express-validator");
var async = require('async');
/*
Express Validator 6.2
https://express-validator.github.io/docs/schema-validation.html
https://auth0.com/blog/express-validator-tutorial/
*/
var db = require("../../module/mongodbWrapper");
var rank = require("../../module/rankingPost");
var power = require("../../module/funcPoint");
var dbCache = require("../../module/dbCache");
var ObjectId = require('mongodb').ObjectId;
var betting = require("../../module/data/betting");

module.exports = [
    '/test', // URI : /test2 (최종은 /<route module>/<page module> : /sameple/test2)
    null, // 권한 : null은 권한 미체크, [] array 형as태로 권한 지정
    [],
    async function (req, res, next) {
        // server-side validation 처리
        let type = req.body.type
        let result
        switch(type) {
            case 'rank':
                let count = await db.count("board", {delete: false})
                let pageCount = Math.ceil(count / 100)
                let limit = 100
                let procCount = 0;
                for (let i = 0; i < pageCount; i++) {
                    await betting.rankInit(i * limit, 100)
                    procCount ++
                }
                let pointResult = false
                if(procCount === pageCount){
                    pointResult = await betting.rankPointInit()
                }
                return res.json({
                    result: pointResult
                });
            case 'day': result = await betting.dayInit()
                return res.json({
                    result: result
                });
            case 'week': result = await betting.weekInit()
                return res.json({
                    result: result
                });
        }
    }
];
