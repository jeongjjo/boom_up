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
    null, // URI : /test2 (최종은 /<route module>/<page module> : /sameple/test2)
    [], // 권한 : null은 권한 미체크, [] array 형태로 권한 지정
    [
        // Validation 처리 ------------------------------------
        exValidator.body("id","REQ").notEmpty().trim(),
        exValidator.body("nm","REQ").notEmpty().trim()
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

        var userId = req.user._id.toHexString();

        var where = { targetUserId: req.body.id, userId: userId };
        
        if (req.body.action == "i") { // block 중. 해제할 것. 
            var x = await db.getAndDelete('blockUser', where);
        } else { // block 추가 할것 . subscription 삭제 . 카운트 감소 
            //사용자 정보를 넣어주기 위해 조회
            //데이터를 입력하는곳에서 넣고 조회는 조인이나 재조회 없이 한번 조회로 출력하기위해
            //var list = await db.getList("user", { _id:ObjectId(req.user._id) },0,1,{});
            var list = await db.getList("userMemo", { userId:userId, targetUserId: req.body.id });
            var userMemo=(list && list.length>0)?list[0].memo:""
            // 프사되면 추가 해야함
            
            var addBlock = await db.update('blockUser',
                where,
                { $set: { targetUserId: req.body.id, userId: userId, targetUserNickname: req.body.nm, targetUserMemo:userMemo } },
                { upsert: true }
            );

            var exists = await db.getList('subscription',
                { targetUserId: req.body.id, userId: userId });

            if (exists != null && exists.length > 0) {
                var x = await db.getAndDelete("subscription",
                    { targetUserId: req.body.id, userId: userId }
                );
                var a1 = await db.update("user", { _id: ObjectId(userId) }, { $inc: { subscribeUserCount: -1 } })
                var a2 = await db.update("user", { _id: ObjectId(req.body.id) }, { $inc: { subscriberCount: -1 } })
            }
        }

        return res.json({
            code: 'OK',
            action:req.body.action,
            file: ''
        });

    }
];
