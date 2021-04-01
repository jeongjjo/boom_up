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
var rank = require("../../module/rankingPost");
var dbCache = require("../../module/dbCache");
var ObjectId = require('mongodb').ObjectId;

module.exports = [
    '/voting/:id/:type/:kind',
    [],
    [
        // Validation 처리 ------------------------------------
        exValidator.param('id', 'REQ').not().isEmpty().trim(),
        exValidator.param('type', 'REQ').not().isEmpty().trim(),
        exValidator.param('kind', 'REQ').not().isEmpty().trim()
    ],
    async function (req, res, next) {
        // server-side validation 처리
        const validationErrors = exValidator.validationResult(req);
        if (!validationErrors.isEmpty()) {
            return res.sendStatus(404);
        }
        var userId = req.user._id.toHexString();

        //통계를 위한 lineupKey 데이터 추가
        var board = await db.getById("board", ObjectId(req.params.id));
        var data = {
            targetId: req.params.id,
            userId: userId,
            type: req.params.type,
            kind: req.params.kind,
            lineupKey: board.lineupKey||""
        }

        var where = { targetId: data.targetId, userId: data.userId };
        var voteResult = await db.get("vote", where);
        var updateSetData = {};
        //updateSetData['voting' + (data.type == "UP" ? 'Up' : 'Down')] = 1;

        var result = null;
        var count = 0;
        var cancel=false;
        var writeUserId="";
        var isadmin=req.user.ROLE && (req.user.ROLE.indexOf('MASTERADMIN') > -1 || req.user.ROLE.indexOf('ADMIN') > -1);
         
        if (voteResult && voteResult.type) {
            // 이미 있는 경우 처리.
            // 일단 보팅 데이터 삭체.
            if (voteResult.type == data.type) {
                // 같은 경우
                if( isadmin ){
                    //관리자는 같은것을 클릭하면 계속 업만 한다.
                    updateSetData['voting' + (voteResult.type == "UP" ? 'Up' : 'Down')] = 1;
                }else{
                    let r = await db.getAndDelete('vote', where);
                    updateSetData['voting' + (voteResult.type == "UP" ? 'Up' : 'Down')] = -1;
                    count = -1;
                    var cancel=true;
                }
                
            } else {
                // 다른 경우 보팅 데이터 추가.
                //result = await db.insert("vote", data);
                result = await db.update("vote", where, { $set: data }, { upsert: true });

                updateSetData['voting' + (data.type == "UP" ? 'Up' : 'Down')] = 1;
                if( !isadmin ){
                    updateSetData['voting' + (voteResult.type == "UP" ? 'Up' : 'Down')] = -1;
                }
            }
        } else {
            // 처음 투표한 경우 추가.
            result = await db.insert("vote", data);
            updateSetData['voting' + (data.type == "UP" ? 'Up' : 'Down')] = 1;
            count = 1;
        }

        let updateResult = await db.updateById(data.kind, ObjectId(data.targetId), { $inc: updateSetData });
        if (result && result.type && updateResult) {
            updateResult.vote = result.type;
        }
        writeUserId=updateResult.userId;

        //사용자 카운트 집계 투표
        var userUpdate = await db.update("user", { _id: ObjectId(userId) }, { $inc: { countVote: count } }, { upsert: true });

        //To do 서브시스템으로 옮겨야함
        //임시적으로 여기서 point점수를 계산해서 넣는다.
        var pointSum = updateResult.votingUp - updateResult.votingDown;
        var pointUpdate = await db.update(data.kind, { _id: ObjectId(data.targetId) }, { $set: { "point": pointSum } }, { upsert: true });

        if (data.kind == "board") {
            rank.calPoint(req.params.id);
        }

        //PowerLevel
        rank.PowerLevel(data.kind,data.type,cancel,writeUserId,data.targetId)


        return res.json({
            result: updateResult ? "ok" : "error",
            codemsg: "vote-put",
            displaymsg: "",
            data: updateResult
        });
    }
];
