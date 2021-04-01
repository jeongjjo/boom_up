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

var common = require("../../../module/common");

//var mongodb = require('../../module/mongodb');
var db = require("../../../module/dao/DB");
// var ObjectId = require('mongodb').ObjectId;

var ogs = require('open-graph-scraper');

module.exports = [
    '/:url', // URI : /test2 (최종은 /<route module>/<page module> : /sameple/test2)
    null, // 권한 : null은 권한 미체크, [] array 형태로 권한 지정
    [
        // Validation 처리 ------------------------------------
        //      exValidator.param('type', 'REQ').not().isEmpty().trim(),
        //      exValidator.header('user-agent', 'NOT FOUND').not().isEmpty().isLength({min: 4,max: 24})
        //        .matches(/^MY/)  // MY로 시작되는 문자열
        //        .custom((value, {req,location,path}) => { return value.startsWith('MY'); }) // MY로 시작되는 문자열(위의 matches()랑 동일 구현)
        // 파라미터 sanitize 처리 ------------------------------
        //      sanitize* function들은 모두 validation 과 통합되었음
        exValidator.param("url").trim()
    ],
    async function (req, res, next) {
        // server-side validation 처리
        // const validationErrors = exValidator.validationResult(req);
        // if (!validationErrors.isEmpty()) {
        //     return res.sendStatus(404);
        // }
        var options = {
            url: req.params.url,
            headers: {
                'accept-language': 'ko',
                'user-agent': req.headers['user-agent']
            },
            timeout: 8000
        };
        ogs(options, function (error, results) {
            console.log('error:', error); // This is returns true or false. True if there was a error. The error it self is inside the results object.
            console.log('results:', results);
            res.json(results && results.success ? results.data : {});
        });
    }
];
