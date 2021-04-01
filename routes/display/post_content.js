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
var dbCache = require("../../module/dbCache");
var ObjectId = require('mongodb').ObjectId;

var common = require("../../module/common");

module.exports = [
    '/content', // URI : /test2 (최종은 /<route module>/<page module> : /sameple/test2)
    [], // 권한 : null은 권한 미체크, [] array 형as태로 권한 지정
    [
        exValidator.body('content', 'REQ').not().isEmpty().trim()
        // Validation 처리 ------------------------------------
        //      exValidator.param('type', 'REQ').not().isEmpty().trim(),
        //      exValidator.header('user-agent', 'NOT FOUND').not().isEmpty().isLength({min: 4,max: 24})
        //        .matches(/^MY/)  // MY로 시작되는 문자열
        //        .custom((value, {req,location,path}) => { return value.startsWith('MY'); }) // MY로 시작되는 문자열(위의 matches()랑 동일 구현)
        // 파라미터 sanitize 처리 ------------------------------
        //      sanitize* function들은 모두 validation 과 통합되었음
    ],
    async function (req, res, next) {
        // server-side validation 처리
        const validationErrors = exValidator.validationResult(req);
        if (!validationErrors.isEmpty()) {
            return res.sendStatus(404);
        }

        //status 상태값 : waiting approval reject
        var start = moment(req.body.startdate).valueOf();
        var end = moment(req.body.enddate).valueOf();
        var data = {
            text : req.body.content,
            startDate: start,
            endDate: end,
            nickname: req.user.nickname,
            userId: req.user._id.toHexString(),
            status: "waiting",
            rejectCount: 0,
            delete: false
        }
        var result = await db.insert("display", data);
        if(result) {
            return res.json({
                result: "ok"
            });
        } else {
            return res.json({
                result: "error"
            });
        }
    }
];
