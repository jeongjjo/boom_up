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

var common = require("../../module/common");

module.exports = [
    '/tempcontent', // URI : /test2 (최종은 /<route module>/<page module> : /sameple/test2)
    [], // 권한 : null은 권한 미체크, [] array 형as태로 권한 지정
    [
        // Validation 처리 ------------------------------------
        exValidator.body('lineupkey', 'REQ').not().isEmpty().trim(),
        exValidator.body('title', 'REQ').not().isEmpty().trim(),
        exValidator.body('content', 'REQ').not().isEmpty().trim()
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
        var sc = req.body.content;
        var tt = req.body.title;

        var concernk = [];
        var concernkId = [];
        if(req.body.concernKeyword && req.body.concernKeyword.length > 0) {
            for(var i = 0; i < req.body.concernKeyword.length; i++) {
                concernk.push(req.body.concernKeyword[i].text);
                concernkId.push(req.body.concernKeyword[i].id);
            }
        }

        var banword = false;
        var banwordList = await db.getList("banword", {});
        if(banwordList && banwordList.length > 0) {
            for(var i = 0; i < banwordList.length; i++) {
                if(sc.indexOf(banwordList[i].word) != -1) {
                    banword = true;
                }
            }
            for(var i = 0; i < banwordList.length; i++) {
                if(tt.indexOf(banwordList[i].word) != -1) {
                    banword = true;
                }
            }
        }
        if(banword) {
            return res.json({
                result: "banword"
            });
        }

        var userid = req.user._id.toHexString();
        var nm = req.user.nickname;

        var insertvalue = {
            nickname: nm, // 로그인 닉네임으로 변경
            title: req.body.title,
            content: sc,
            userId: userid, //로그인 유저아이디로 변경
            lineupKey: req.body.lineupkey.trim(),
            representationImage: req.body.reprImage,
            image: req.body.images,
            delete: false,
            searchContent: sc.replace(/<(.|\n)*?>/gim, "").replace(/(&amp;|&lt;|&gt;|&nbsp;|&quot;|&apos;|#x27;|#x2F|#39|#47)/img, ''),
            contentType: req.body.contentType,
            concernKeyword: concernk,
            concernKeywordId: concernkId
        }
        var insert = await db.insert("tempboard", insertvalue);
        //사용자 카운트 집계 게시물
        if (insert) {
            return res.json({
                result: "ok",
                id: insert._id
            });
        } else {
            return res.json({
                result: "error",
                id: null
            });
        }
    }
];
