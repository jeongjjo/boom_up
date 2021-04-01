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
    '/userlist/:type/:id/:n', // URI : /test2 (최종은 /<route module>/<page module> : /sameple/test2)
    null, // 권한 : null은 권한 미체크, [] array 형태로 권한 지정
    [
        // Validation 처리 ------------------------------------
        exValidator.param('id', 'REQ').not().isEmpty().trim(),
        exValidator.param('type', 'REQ').not().isEmpty().trim()
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

        var userId = req.user ? req.user._id.toHexString() : null;

        //step1. 목록조회 (t : 구독자 목록 / f : 구독하는 목록 )
        var where = req.params.type == 't' ? { targetUserId: req.params.id } : { userId: req.params.id }

        if (req.query.s) req.params.type == 't' ?
            where.nickname = { $regex: common.escapeRegExp(req.query.s), $options: "i" } :
            where.targetUserNickname = { $regex: common.escapeRegExp(req.query.s), $options: "i" }

        var list = await db.getList('subscription', where);
        var returnList = [];
        if (list.length > 0) {
            // step2 목록의 userid 모아서 
            var usrListObject = [];
            var usrList = [];
            if (req.params.type == 't') {
                usrList = list.map(obj => obj.userId);
                usrListObject = list.map(obj => ObjectId(obj.userId));
            } else {
                usrList = list.map(obj => obj.targetUserId);
                usrListObject = list.map(obj => ObjectId(obj.targetUserId));
            }

            // step3 user의 nickname, photo get.
            var w = { "_id": { $in: usrListObject } }
            var userMaster = await db.getList('user', w, 0, 0, {});

            // step4 "나의" 맞팔 여부 조회 
            var awhere = { "targetUserId": { $in: usrList }, userId: userId }
            var followed = await db.getList('subscription', awhere, 0, 0, {});
            followed = followed.map(obj => obj.targetUserId);

            // step5 "내가" 차단한 사용자 인지 조회 
            var r = { "targetUserId": { $in: usrList }, userId: userId }
            var blocked = await db.getList('blockUser', r, 0, 0, {});
            blocked = blocked.map(obj => obj.targetUserId);


            // step6 목록의 user에 대한 "나의" memo 조회 
            var usrmemoWhere = { "targetUserId": { $in: usrList }, userId: userId }
            var usrmemo = await db.getList('userMemo', usrmemoWhere, 0, 0, {});

            //step7 목록에 memo  추가 
            list = list.map(function (obj) {
                var x = obj;
                for (var i = 0; i < usrmemo.length; i++) {
                    var x = obj;
                    if (req.params.type == 't') {
                        if (usrmemo[i] && obj.userId.toString() == usrmemo[i].targetUserId.toString()) {
                            x.memo = usrmemo[i].memo
                            usrmemo.slice(i, 1)
                        }
                    } else {
                        if (usrmemo[i] && obj.targetUserId.toString() == usrmemo[i].targetUserId.toString()) {
                            x.memo = usrmemo[i].memo
                            usrmemo.slice(i, 1)
                        }
                    }
                }
                return x;
            });

            // step8 목록에 photo, nickname, followed, memo 추가 
            returnList = list == [] ? list : list.map(function (obj) {
                var rObj = obj;
                for (var i = 0; i < userMaster.length; i++) {
                    if (req.params.type == 't') {
                        if (userMaster[i] && obj.userId.toString() == userMaster[i]._id.toString()) {
                            rObj.photo = userMaster[i].photo ? (userMaster[i].photo.length > 2 ? userMaster[i].photo[1] : userMaster[i].photo[0]) : null;
                            rObj.followerNickname = userMaster[i].nickname;
                            rObj.followed = followed.some(function (val) {
                                return val.toString() === obj.userId.toString();
                            });
                            rObj.blocked = blocked.some(function (val) {
                                return val.toString() === obj.userId.toString();
                            });
                        }
                    } else {
                        if (obj.targetUserId.toString() == userMaster[i]._id.toString()) {
                            rObj.photo = userMaster[i].photo ? (userMaster[i].photo.length > 2 ? userMaster[i].photo[1] : userMaster[i].photo[0]) : null;
                            rObj.targetNickname = userMaster[i].nickname;
                            rObj.followed = followed.some(function (val) {
                                return val.toString() === obj.targetUserId.toString();
                            });
                            rObj.blocked = blocked.some(function (val) {
                                return val.toString() === obj.targetUserId.toString();
                            });
                        }
                    }
                } return rObj;
            });
        }


        res.render('profile/_userlist', {
            title: '',
            type: req.params.type,
            n: req.params.n,
            list: returnList || null,
            MY: userId //todo
        });

    }
];
