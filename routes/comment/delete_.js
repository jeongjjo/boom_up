const exValidator = require("express-validator");
var common = require("../../module/common");
var rank = require("../../module/rankingPost");
var db = require("../../module/mongodbWrapper");
var ObjectId = require('mongodb').ObjectId;
module.exports = [
    null, // URI : /test2 (최종은 /<route module>/<page module> : /sameple/test2)
    [], // 권한 : null은 권한 미체크, [] array 형태로 권한 지정
    [
        // Validation 처리 ------------------------------------
        exValidator.body("id","REQ").notEmpty().trim()
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

        if (!req.user) {
            return res.json({
                result: 'error',
                codemsg: 'comment-delete',
                displaymsg: '' 
            });
        }

        // 플레그만 변경처리.
        var x = await db.update("comment", {_id: ObjectId(req.body.id), userId: req.user._id.toHexString()}, {$set: {delete: true}});
        //사용자 카운트 집계 뎃글
        var userUpdate = await db.update("user", { _id:req.user._id }, { $inc: { countComment: -1 } },{upsert:true});

        //Power차감
        rank.PowerCal("comment",req.body.id,req.user._id.toHexString())

        return res.json({
            result: x ? 'ok' : 'error',
            codemsg: 'comment-delete',
            displaymsg: ''
        });
    }
];
