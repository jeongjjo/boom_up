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
    '/point/:id?',  // URI : /test2 (최종은 /<route module>/<page module> : /sameple/test2)
    null, // 권한 : null은 권한 미체크, [] array 형태로 권한 지정
    [
        // Validation 처리 ------------------------------------
        exValidator.param('id', 'REQ').trim(),
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
        var isMine = false;
        var userid = "";
        if (req.user) {
            isMine = !req.params.id || req.params.id === req.user._id.toHexString();
            userid = isMine ? req.user._id.toHexString() : req.params.id;
        } else if (!req.user && !req.params.id) {
            // 로그아웃 상태이고, id가 미지정이면 로그인하도록 유도
            return res.redirect('/auth/login');
        }
        if (!req.user && req.params.id) {
            userid = req.params.id;
        }
        var Userinfo = await db.getById("user", userid);
        var shareProfile = Userinfo && Userinfo.setting && Userinfo.setting.shareProfile;

        var followed = [];
        var blocked = [];

        var targetUserId = req.params.id;

        if (req.user && !isMine) {
            followed = await db.get('subscription', { userId: req.user._id.toHexString(), targetUserId: targetUserId });
            blocked = await db.get('blockUser', { userId: req.user._id.toHexString(), targetUserId: req.params.id });
        }
        let powerHistory = await db.getList("powerHistory", {userId: userid}, null, null, {createTS: -1})
        let powerListBoard = await db.getList("powerHistory", {userId: userid, contentType: "board"}, null, null, {createTS: -1})
        let powerListComment = await db.getList("powerHistory", {userId: userid, contentType: "comment_c"}, null, null, {createTS: -1})
        let boardIDs = []
        let commentIDs = []
        for(let i in powerListBoard){
            boardIDs.push(powerListBoard[i].contentId)
        }
        for(let i in powerListComment){
            commentIDs.push(powerListComment[i].contentId)
        }
        let boardList = await db.getList("board", {_id: {$in:boardIDs}}, null, null, {createTS: -1})
        let commentList = await db.getList("comment", {_id: {$in:commentIDs}}, null, null, {createTS: -1})

        for (let i in boardList){
            boardList[i].lineup = await db.get("lineup", {lineupKey: boardList[i].lineupKey})
            boardList[i].userPower = powerListBoard[i].point
        }
        for (let i in commentList){
            commentList[i].userPower = powerListComment[i].point
        }
        let data = [
            {$match:{
                    userId:userid
                }
            },
            {$group:{
                    _id: {$toObjectId:"$userId"},
                    totalPoint: {$sum: "$point"}
                }
            }
        ]
        let bettingLevel = await db.aggregate("bettingHistory", data)
        let totalPoint = 0
        if(bettingLevel.length > 0){
            totalPoint = bettingLevel[0].totalPoint
        }
        res.render('profile/point', {
            title: '나의 붐포인트',
            _metaInfo: {
                title: Userinfo.nickname,
                content: Userinfo.message || '',
                author: Userinfo.nickname,
                imageurl: common.getPhotoEx(Userinfo.photo, 3, 1, '/img/pro-image.png')
            },
            Userinfo: Userinfo,
            powerHistory: powerHistory||[],
            boardData: boardList||[],
            commentData: commentList||[],
            bettingPoint: totalPoint,
            isMain: !req.params.id ? true : false,
            isMine: isMine,
            followed: followed != null && followed != '' ? true : false,
            blocked: blocked != null && blocked != '' ? true : false,
            shareProfile: shareProfile == false ? "N" : "Y",
            currUserId: isMine ? req.user._id.toHexString() : req.params.id,
        });
    }
];
