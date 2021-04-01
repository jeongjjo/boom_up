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
var rank = require("../../module/rankingPost");
var db = require("../../module/mongodbWrapper");
var dbCache = require("../../module/dbCache");
var ObjectId = require('mongodb').ObjectId;


module.exports = [
    '/content/:id?', // URI : /test2 (최종은 /<route module>/<page module> : /sameple/test2)
    null, // 권한 : null은 권한 미체크, [] array 형as태로 권한 지정
    [
        // Validation 처리 ------------------------------------
        exValidator.param('id', 'REQ').not().isEmpty().trim(),
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
        
        var contentid = req.params.id;
        var userId = req.user._id.toHexString();
        var where = {
            _id: ObjectId(contentid)
        }
        var update = {
            $set : {
                delete: true
            }
        }
        var s = await db.update("board", where, update);

        // 해시태그 카운트 다운 deleteHash
        var deleteHash = await db.get("board", where);
        if(deleteHash.hashtag && deleteHash.hashtag.length > 0) {
            var hashCount = await db.updateMany("hotHashtag", { text: { $in : deleteHash.hashtag} }, { $inc: { count: -1 } },{upsert:true});
        }
        //사용자 카운트 집계 게시물
        var userUpdate = await db.update("user", { _id:ObjectId(userId) }, { $inc: { countPost: -1 } },{upsert:true});

        //Power차감
        rank.PowerCal("board",contentid,req.user._id.toHexString())

        if (s) {
            return res.json({
                result: "ok"
            });
        } else {
            return res.json({
                result: "err"
            });
        }
    }
];
