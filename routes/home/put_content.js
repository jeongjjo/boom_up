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
    null, // 권한 : null은 권한 미체크, [] array 형as태로 권한 지정
    [
        exValidator.body('lineupkey', 'REQ').not().isEmpty().trim(),
        exValidator.body('title', 'REQ').not().isEmpty().trim(),
        exValidator.body('content', 'REQ').not().isEmpty().trim()
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
        var sc = req.body.content;
        var tt = req.body.title;
        var hash = common.getHashtags(sc);
        var oldhash = [];
        oldhash = req.body.hashtag.split(",");


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

        // 삭제 된 해쉬 체크
        if(oldhash.length > 0) {
            await db.updateMany("hotHashtag", { text: { $in: oldhash } }, { $inc: { count: -1 } });
        }

        var where = {
            _id: ObjectId(req.body.id)
        }

        var ck = await db.get("board", where);
        if(ck.concernKeyword && ck.concernKeyword.length > 0) {
            await db.updateMany("concernKeyword", {text: {$in: ck.concernKeyword}}, {$inc :{count: -1}});
        }
        
        
        var orig = await db.getById("board", req.body.id);
        if (!orig) {
            return res.json({
                result: "error",
                codemsg: "content-notgt"
            });
        }
        
        if (orig.userId !== req.user._id.toHexString()) {
            return res.json({
                result: "error",
                codemsg: "content-notowner"
            });
        }
        
        var updatevalue = {
            $set: {
                title: req.body.title,
                content: sc,
                lineupKey: req.body.lineupkey,
                hashtag: hash,
                representationImage: req.body.reprImage,
                image: req.body.images,
                searchContent: sc.replace(/<(.|\n)*?>/gim, "").replace(/(&amp;|&lt;|&gt;|&nbsp;|&quot;|&apos;|#x27;|#x2F|#39|#47)/img, ''),
                contentType: req.body.contentType,
                concernKeyword: concernk,
                concernKeywordId: concernkId
            }
        }
        
        var update = await db.update("board", where, updatevalue);
        if(concernk && concernk.length > 0) {
            await db.updateMany("concernKeyword", {text: {$in: concernk}}, {$inc :{count: 1}});
        }
        
        // var toHashTag = hash;
        // var beHashTag = orig.hashtag;
        // if (toHashTag && toHashTag.length > 0) {
        //     for (var i = 0; i < toHashTag.length; i++) {
        //         beHashTag.splice(beHashTag.indexOf(toHashTag[i].text), 1);
        //     }
        //     if (beHashTag.length > 0) {
        //         await db.updateMany("hotHashtag", { text: { $in: beHashTag } }, { $inc: { count: -1 } });
        //     }
        // }

        var idata = [];
        var h1reulst = await db.getList("hotHashtag", { text: { $in: hash } });
        if (h1reulst && h1reulst.length > 0) {
            var hashupdateawait = await db.updateMany("hotHashtag", { text : { $in : hash }}, {$inc: { count: 1}}); //한번 등록된 해쉬는 수정 시 카운트 업 하지않음
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

        if (update) {
            return res.json({
                result: "ok"
            });
        } else {
            return res.json({
                result: "error"
            });
        }
    }
];
