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
var db = require("../../module/dao/DB");
var ObjectId = require('mongodb').ObjectId;
module.exports = [
    null, // URI : /test2 (최종은 /<route module>/<page module> : /sameple/test2)
    [], // 권한 : null은 권한 미체크, [] array 형태로 권한 지정
    [
        // Validation 처리 ------------------------------------
        exValidator.body('id', 'REQ').not().isEmpty().trim(),
        exValidator.body('kind', 'REQ').not().isEmpty().trim(),
        exValidator.body('info', 'REQ').not().isEmpty().trim(),
        exValidator.body('code', 'REQ').not().isEmpty().trim(),
        exValidator.body('other', 'REQ').not().isEmpty().trim(),
        exValidator.body('page', 'REQ').not().isEmpty().trim(),
        exValidator.body('maintype', 'REQ').not().isEmpty().trim(),
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
 
        var userId=req.user._id.toHexString();

        if (!req.user)
            return res.json({
                code: 'Error',
                file: ''
            });

        var search = {
            targetId: req.body.id,
            userId: userId
        }
        var searchresult = await db.get("report", search);
        if (searchresult != null) {
            return res.json({
                result: 'keep'
            });
        }

        //통계를 위한 lineupKey 데이터 추가
        var board 
        var lineupkey="";
        var nickname="";
        if(req.body.kind=="comment"){
            var comment = await db.getById("comment", ObjectId(req.body.id));
            var updatecnt = await db.update("comment",{_id:comment._id},{ $inc: { reportCnt: 1 } }, { upsert: true } );
            nickname=comment.nickname;
            board = await db.getById("board", ObjectId(comment.contentId));
            if(board){
                lineupkey=board.lineupKey;
            }
        }else{
            board = await db.getById("board", ObjectId(req.body.id));
            lineupkey="";
            if(board){
                var updatecnt = await db.update("board",{_id:board._id},{ $inc: { reportCnt: 1 } }, { upsert: true } );
                lineupkey=board.lineupKey;
                nickname=board.nickname;
            }
        }


        //사람의 신고까지 생각하여 targetId라고 명명함
        var data = {
            targetId: req.body.id,
            userId: userId,
            nickname: req.user.nickname,
            kind: req.body.kind,
            info: req.body.info,
            code: req.body.code,
            other: req.body.other,
            lineupKey: lineupkey,
            boardNickname: nickname
        }
        var a = await db.insert("report", data);
        

        var where = {
            targetId: req.body.id,
            kind: req.body.type
        }
        var select = await db.getList("report", where);
        switch(req.body.type) {
            case "A00" : 
                // 부적절한 홍보
                if (select.length  == 10) await db.update("board", { _id: ObjectId(req.body.id)}, {$set: {block: true}})
            break;
            case "A01" :
                // 음란물
                if (select.length  == 20) await db.update("board", { _id: ObjectId(req.body.id)}, {$set: {block: true}})
            break;
            case "A02" :
                // 잔인/혐오물
                if (select.length  == 20) await db.update("board", { _id: ObjectId(req.body.id)}, {$set: {block: true}})
            break;
            case "A03" :
                // 명예회손/사생활침해
                if (select.length  == 20) await db.update("board", { _id: ObjectId(req.body.id)}, {$set: {block: true}})
            break;
            case "A99" :
                //기타
                if (select.length  == 30) await db.update("board", { _id: ObjectId(req.body.id)}, {$set: {block: true}})
            break;
        }

        return res.json({
            result: a && select ? "ok" : "error",
            codemsg:"report-insert",
            displaymsg: "",     
            data: a
        });
    }
];
