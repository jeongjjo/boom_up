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
var db = require("../../module/mongodbWrapper");
var ObjectId = require('mongodb').ObjectId;

module.exports = [
    '/memodetail/:targetid', // URI : /test2 (최종은 /<route module>/<page module> : /sameple/test2)
    [], // 권한 : null은 권한 미체크, [] array 형태로 권한 지정
    [
        // Validation 처리 ------------------------------------
        exValidator.param("targetid","REQ").notEmpty().trim()
        //        .matches(/^MY/)  // MY로 시작되는 문자열
        //        .custom((value, {req,location,path}) => { return value.startsWith('MY'); }) // MY로 시작되는 문자열(위의 matches()랑 동일 구현)
        // 파라미터 sanitize 처리 ------------------------------
        //      sanitize* function들은 모두 validation 과 통합되었음
    ],
    async function (req, res, next) {
        // server-side validation 처리
        // const validationErrors = exValidator.validationResult(req);
        // if (!validationErrors.isEmpty()) {
        //     return res.sendStatus(404);
        // }

        var userId=req.user._id.toHexString();
        if (req.user) {
            var where = { userId: userId , targetUserId: req.params.targetid }
            var list = await db.get('userMemo', where);
            var user = await db.get('user', {_id: ObjectId(req.params.targetid)});
            var r = { "targetUserId": req.params.targetid , userId: userId }
            var blocked = await db.get('blockUser', r);
            
   
            res.render('setting/memoDetail', {
                title: __('MEMO_INSERT_TITLE'),
                list: list  ,
                user : user, 
                blocked : blocked || null
            });
        } else {
            return res.json({
                code: 'error',
                file: ''
            });
        }




    }
];
