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
    '/level/:id?',  // URI : /test2 (최종은 /<route module>/<page module> : /sameple/test2)
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
        let mileHistory = await db.getList("mileHistory", {userId: userid}, null, null, {createTS: -1})

        res.render('profile/level', {
            title: '나의 붐레벨',
            _metaInfo: {
                title: Userinfo.nickname,
                content: Userinfo.message || '',
                author: Userinfo.nickname,
                imageurl: common.getPhotoEx(Userinfo.photo, 3, 1, '/img/pro-image.png')
            },
            Userinfo: Userinfo,
            mileHistory: mileHistory,
            isMain: !req.params.id ? true : false,
            isMine: isMine,
            followed: followed != null && followed != '' ? true : false,
            blocked: blocked != null && blocked != '' ? true : false,
            shareProfile: shareProfile == false ? "N" : "Y",
            currUserId: isMine ? req.user._id.toHexString() : req.params.id,
        });
    }
];
