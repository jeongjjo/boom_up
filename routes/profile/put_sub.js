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
        exValidator.body('id', 'REQ').not().isEmpty().trim(),
        exValidator.body('nm', 'REQ').not().isEmpty().trim()
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
        var data = {};
        var targetUserId = req.body.id;
        var userId = req.user._id.toHexString();
        var nickname = req.user.nickname;
        if (req.body.action == "i") { //현재 구독중. 취소할것 
            var where = { targetUserId: targetUserId, userId: userId };
            var exists = await db.getList('subscription', where);
            if (exists != null && exists != []) {
                var x = await db.getAndDelete('subscription', where);
                var a1 = await db.update("user", { _id: ObjectId(userId) }, { $inc: { subscribeUserCount: -1 } });
                var a2 = await db.update("user", { _id: ObjectId(targetUserId) }, { $inc: { subscriberCount: -1 } });
                data.subscriberCount = (a2 && a2.subscriberCount ? a2.subscriberCount : 0);
            }
        } else { // 구독 추가 할것 .
            var targetUserNickName = req.body.nm;

            var where = { targetUserId: targetUserId, userId: userId }
            var exists = await db.getList('subscription', where);
            if (exists == null || exists.length == 0 || exists == []) {
                var x = await db.update("subscription",
                    where,
                    {
                        $set: {
                            targetUserId: targetUserId, userId: userId,
                            targetUserNickname: targetUserNickName, nickname: nickname
                        }
                    },
                    { upsert: true }
                );
                var a1 = await db.update("user", { _id: ObjectId(userId) }, { $inc: { subscribeUserCount: +1 } },{ upsert: true })
                var a2 = await db.update("user", { _id: ObjectId(targetUserId) }, { $inc: { subscriberCount: +1 } },{ upsert: true })
                data.subscriberCount = (a2 && a2.subscriberCount ? a2.subscriberCount : 0);
                var url = '/profile/main/'+userId;
                global.notification.send([targetUserId], {
                    "kind": "receiveMsg", 
                    "sender": req.user,
                    "body": __('PUSH_SUBSCRIBE_MSG'), 
                    "data": {
                        "url": url
                    }
                });
            }
        }


        return res.json({
            code: 'OK',
            data: data
        });

    }
];
