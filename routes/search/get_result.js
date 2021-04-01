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

var dbCache = require("../../module/dbCache");
module.exports = [
    '/result/:type/:fist', // URI : /test2 (최종은 /<route module>/<page module> : /sameple/test2)
    [], // 권한 : null은 권한 미체크, [] array 형태로 권한 지정
    [
        // Validation 처리 ------------------------------------
        exValidator.param("type", "REQ").notEmpty().trim(),
        exValidator.param("fist", "REQ").notEmpty().trim()
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



        var keyword = common.escapeRegExp(req.query.s);
        var id = req.query.id;
        var where = {};
        var userId = req.user._id.toHexString();

        if (req.params.type == 'all')
            where =
            {
                $or: [
                    { title: { $regex: keyword, $options: "i" } },
                    { content: { $regex: keyword, $options: "i" } },
                    { nickname: { $regex: keyword, $options: "i" } },
                    { hashtag: { $regex: keyword, $options: "i" } }
                ]
            };
        else if (req.params.type == "hashtag") where = { hashtag: { $regex: keyword, $options: "i" } };
        else if (req.params.type == "title") where = { title: { $regex: keyword, $options: "i" } };
        else if (req.params.type == "nickname") where = { nickname: { $regex: keyword, $options: "i" } };
        else if (req.params.type == "content") where = { content: { $regex: keyword, $options: "i" } };;

        if (id == null) await db.update('hotKeyword'
            , { text: keyword }
            , {
                $set: { text: keyword },
                $inc: { count: 1 }
            }
            , { upsert: true })

        if (id != null) where._id = { $lt: ObjectId(id) };
        
        var list = await db.getList('board', where, 0, 15, {});
        
        if (list != null && list.length > 0) {
            var userMaster = await db.getList('user', { "_id": { $in: list.map(obj => ObjectId(obj.userId)) } }, 0, 0, {});
            list = list.map(function (obj) {
                var x = obj;
                x.writer = userMaster.filter(mObj => { return (mObj._id.toString() == obj.userId.toString() ? mObj : null) });
                return x;
            });

            // todo : 블라인드 게시물 
            if (req.user) {
                var blocked = await db.getList('blockUser', { "targetUserId": { $in: list.map(obj => obj.userId) }, userId: userId }, 0, 0, {});
                var followed = await db.getList('subscription', { "targetUserId": { $in: list.map(obj => obj.userId) }, userId: userId }, 0, 0, {});
                var usrmemo = await db.getList('userMemo', { "targetUserId": { $in: list.map(obj => obj.userId) }, userId: userId }, 0, 0, {});
                var y = { "targetId": { $in: list.map(obj => obj._id.toHexString()) }, userId: userId }
                var y2 = { "contentId": { $in: list.map(obj => obj._id.toHexString()) }, userId: userId }
                var keep = await db.getList('keep', y2, 0, 0, {});
                var vote = await db.getList('vote', y, 0, 0, {});

                list = list.map(function (obj) {
                    obj.memo = usrmemo.filter(mObj => { if (mObj.targetUserId.toString() == obj.userId.toString()) return mObj.memo });
                    obj.blockedUser = blocked.filter(mObj => { return (mObj.targetUserId.toString() == obj.userId.toString() ? mObj : null) });
                    obj.keep = keep.filter(mObj => { return (mObj.contentId.toString() == obj._id.toString() ? mObj : null) });
                    obj.vote = vote.filter(mObj => { return (mObj.targetId.toString() == obj._id.toString() ? mObj : null) });
                    obj.followed = followed.some(mObj => { return (mObj.targetUserId.toString() == obj.userId.toString() ? mObj : null) });
                    obj.listType = 'post';
                    return obj;
                });
            }
        }
        res.render('_parts/_list', {
            title: '',
            list: list || null,
            keyword: keyword,
            fist: req.params.fist,
            noDataText: __('NO_SEARCH_RESULT')
        });
    }
];