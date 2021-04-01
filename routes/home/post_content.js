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
    '/content', // URI : /test2 (최종은 /<route module>/<page module> : /sameple/test2)
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
        var banword = false;

        var concernk = [];
        var concernkId = [];
        if(req.body.concernKeyword && req.body.concernKeyword.length > 0) {
            for(var i = 0; i < req.body.concernKeyword.length; i++) {
                concernk.push(req.body.concernKeyword[i].text);
                concernkId.push(req.body.concernKeyword[i].id);
            }
        }

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

        var hash = common.getHashtags(sc);
        var userid = req.user._id.toHexString();
        var nm = req.user.nickname;

        var insertvalue = {
            nickname: nm, // 로그인 닉네임으로 변경
            title: req.body.title,
            content: sc,
            votingUp: 0,
            votingDown: 0,
            userId: userid, //로그인 유저아이디로 변경
            lineupKey: req.body.lineupkey.trim(),
            hashtag: hash,
            comment: 0,
            representationImage: req.body.reprImage,
            image: req.body.images,
            block: false,
            blockCode: "",
            delete: false,
            searchContent: sc.replace(/<(.|\n)*?>/gim, "").replace(/(&amp;|&lt;|&gt;|&nbsp;|&quot;|&apos;|#x27;|#x2F|#39|#47)/img, ''),
            contentType: req.body.contentType,
            concernKeyword: concernk,
            concernKeywordId: concernkId
        }
        if(concernk && concernk.length > 0) {
            await db.updateMany("concernKeyword", {text: {$in: concernk}}, {$inc :{count: 1}});
        }

        var existWhere = { "userId": userid, "lineupKey": req.body.lineupkey.trim(), "title": req.body.title, "delete": false }
        var whereTS = moment().add(-10, 'm');
        existWhere.createTS = { $gte: whereTS.valueOf() };
        var existBoard = await db.getList("board", existWhere, 0, 0, {});
        if (existBoard.length > 0) {
            return res.json({
                result: "exist"
            });
        }
        var insert = await db.insert("board", insertvalue);
        //사용자 카운트 집계 게시물
        var userUpdate = await db.update("user", { _id: ObjectId(userid) }, { $inc: { countPost: 1 } }, { upsert: true });
        var idata = [];
        var h1reulst = await db.getList("hotHashtag", { text: { $in: hash } });
        if (h1reulst && h1reulst.length > 0) {
            var hashupdateawait = await db.updateMany("hotHashtag", { text: { $in: hash } }, { $inc: { count: 1 } });
            for (var i = 0; i < h1reulst.length; i++) {
                hash.splice(hash.indexOf(h1reulst[i].text), 1);
            }
        }

        if (hash && hash.length > 0) {
            for (var i = 0; i < hash.length; i++) {
                idata.push({
                    text: hash[i],
                    count: 1
                })
            }
            var insertmany = await db.insertMany("hotHashtag", idata);
        }
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
