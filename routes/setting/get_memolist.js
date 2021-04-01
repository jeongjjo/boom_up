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
    '/memolist/:id?', // URI : /test2 (최종은 /<route module>/<page module> : /sameple/test2)
    [], // 권한 : null은 권한 미체크, [] array 형태로 권한 지정
    [
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
        
        var userId=req.user._id.toHexString();
        var where = {
            userId: userId
        };

        if (req.params.id) where._id = { $lt: ObjectId(req.params.id) };

        var list = await db.getList('userMemo',
            where,
            0,
            50, //todo
            { _id: -1 })
        var usrList = list.map(obj => obj.targetUserId);
        var usrListObject = list.map(obj => ObjectId(obj.targetUserId));

        var w = { "_id": { $in: usrListObject } }
        var userMaster = await db.getList('user', w, 0, 0, {});
        var r = { "targetUserId": { $in: usrList }, userId: userId }
        var blocked = await db.getList('blockUser', r, 0, 0, {});
        blocked = blocked.map(obj => obj.targetUserId);

        list.map(function (obj) {
            for (var i = 0; i < userMaster.length; i++) {
                var rObj = obj;
                if (userMaster[i] && obj.targetUserId.toString() == userMaster[i]._id.toString()) {
                    rObj.targetNickname = userMaster[i].nickname;
                    rObj.photo = userMaster[i].photo ? (userMaster[i].photo.length > 2 ? userMaster[i].photo[1] : userMaster[i].photo[0]) : null;
                    rObj.blocked = blocked.some(function (val) {
                        return val.toString() === obj.targetUserId.toString();
                    })
                }
            } return rObj;
        });

        res.render('setting/_memoList', {
            list: list || null,
            id: req.params.id || null
        });
    }
];
