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
    '/postpushmsg/:id/:blnmsg', // URI : /test2 (최종은 /<route module>/<page module> : /sameple/test2)
    [], // 권한 : null은 권한 미체크, [] array 형as태로 권한 지정
    [
        // Validation 처리 ------------------------------------
        exValidator.param('id', 'REQ').not().isEmpty().trim(),
        exValidator.param('blnmsg', 'REQ').not().notEmpty().toBoolean(),
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
        var blnmsg = req.params.blnmsg;
        var updateBoard = await db.update("board", {_id:ObjectId(id)}, {$set:{pushmsg:blnmsg} }, { });
        
        
        if (updateBoard) {
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
