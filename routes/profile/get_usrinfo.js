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
var dbCache = require("../../module/dbCache");
var ObjectId = require('mongodb').ObjectId;


module.exports = [
    '/usrinfo/:id?',  // URI : /test2 (최종은 /<route module>/<page module> : /sameple/test2)
    [], // 권한 : null은 권한 미체크, [] array 형태로 권한 지정
    [
        // Validation 처리 ------------------------------------
        exValidator.param('id', 'REQ').not().isEmpty().trim()
        //      exValidator.header('user-agent', 'NOT FOUND').not().isEmpty().isLength({min: 4,max: 24})
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

        var isMine = !req.params.id || req.params.id === req.user._id.toHexString();
        var Userinfo = isMine ? req.user : await dbCache.get('user@' + req.params.id, function () {
            return db.getById("user", ObjectId(req.params.id));
        });
       // var shareProfile = Userinfo && Userinfo.setting && Userinfo.setting.shareProfile  ;
        
        var followed = [];
        var blocked = [];

        var userId = req.user._id.toHexString();
        var targetUserId = req.params.id;

        if (req.user && !isMine  ) {
            followed = await db.get('subscription', { userId: userId, targetUserId: targetUserId });
            blocked = await db.get('blockUser', { userId: userId, targetUserId: targetUserId });
        }
        
        res.json (  {
            
            Userinfo: Userinfo,
            isMine: isMine,
            followed: followed != null && followed != ''  ? true : false,
            blocked: blocked != null && blocked != ''  ? true : false  
             
        });
    }
];
