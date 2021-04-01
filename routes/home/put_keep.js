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


module.exports = [
    '/keep/:id?', // URI : /test2 (최종은 /<route module>/<page module> : /sameple/test2)
    [], // 권한 : null은 권한 미체크, [] array 형as태로 권한 지정
    [
        // Validation 처리 ------------------------------------
        exValidator.param('id', 'REQ').not().isEmpty().trim(),
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
        
        var id = req.params.id;
        var userId = req.user ? req.user._id.toHexString() : null;//DB 컬럼타입 변경작업 참조컬럼으로 ObjecId로 넣은거 String으로 변경

        var searchWhere = {
            targetId: id,
            userId: userId
        }
        var s = await db.get("keep", searchWhere);
        if (s && s != null) {
            var deleteData = {
                targetId: id,
                userId: userId
            }
            var d = await db.getAndDelete('keep', deleteData);
            return res.json({
                result: d ? "ok" : "error",
                data: d
            });
        } else {
            var insertdata = {
                targetId: id,
                userId: userId
            }
            var a = await db.insert("keep", insertdata);
            return res.json({
                result: a ? "ok" : "error",
                data: a,
                insert: true
            });
        }
    }
];
