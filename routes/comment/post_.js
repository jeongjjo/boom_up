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
    null, // URI : /test2 (최종은 /<route module>/<page module> : /sameple/test2)
    [], // 권한 : null은 권한 미체크, [] array 형as태로 권한 지정
    [
        // Validation 처리 ------------------------------------
        exValidator.body('cId', 'REQ').not().isEmpty().trim(),
        exValidator.body('comment', 'REQ').not().isEmpty().trim()
        //      exValidator.header('user-agent', 'NOT FOUND').not().isEmpty().isLength({min: 4,max: 24})
        //        .matches(/^MY/)  // MY로 시작되는 문자열
        //        .custom((value, {req,location,path}) => { return value.startsWith('MY'); }) // MY로 시작되는 문자열(위의 matches()랑 동일 구현)
        // 파라미터 sanitize 처리 ------------------------------7
        //      sanitize* function들은 모두 validation 과 통합되었음
    ],
    async function (req, res, next) {
        // server-side validation 처리
        const validationErrors = exValidator.validationResult(req);
        if (!validationErrors.isEmpty()) {
            return res.sendStatus(404);
        }
        var ptype = req.body.ptype;
        var targetUserid = req.body.uId;
        var contentId = req.body.cId;
        var commentId = req.body.rcId || null;
        var contentType = req.body.contentType || 'b';
        var comment = req.body.comment;
        //photo 추가
        var photo = JSON.parse(req.body.photo);
        var originalname = req.body.originalname;
        
        var banword = false;
        var banwordList = await db.getList("banword", {});
        if(banwordList && banwordList.length > 0) {
            for(var i = 0; i < banwordList.length; i++) {
                if(comment.indexOf(banwordList[i].word) != -1) {
                    banword = true;
                }
            }
        }
        if(banword) {
            return res.json({
                result: "banword"
            });
        }

        var userId = req.user ? req.user._id.toHexString() : null;
        var nickname = req.user.nickname;
        var type = req.body.rcId ? "rc" : "c";

        //관리자가 댓글 작성자 인끼업 운영자중 선택한 경우
        var contentUserId=req.body.contentUserId;
        var contentUserNM=req.body.contentUserNM;
        var isAdmin=req.body.isAdmin;
        var adminUseUserInfo={};
        if(isAdmin && contentUserId!=""){
            userId=contentUserId;
            nickname=contentUserNM;
            adminUseUserInfo=await db.getById("user", ObjectId(userId));
        }

        //통계를 위한 lineupKey 데이터 추가
        var board = await db.getById("board", ObjectId(contentId));
        var data = {
            contentId: contentId,
            commentId: commentId,
            userId: userId,
            nickname: nickname,
            comment: comment,
            votingUp: 0,
            votingDown: 0,
            reply: 0,
            delete: false,
            block: false,
            blockCode: "",
            lineupKey:board.lineupKey||"",
            image: photo,
            imageName: originalname
        }

        var targetNickNames = comment.match(/[@][^ ]*/gi);
        var targetUserWhere = [];
        var targetUsers = [];
        for (i in targetNickNames) {
            var nm = targetNickNames[i].replace('@', '');
            targetUserWhere.push({ "nickname": nm });
        }
        var targetUserInfo = targetUserWhere.length > 0 ? await db.getList("user", { $or: targetUserWhere }, 0, 0, {}) : [];
        for (i in targetUserInfo) {
            targetUsers.push({ id: targetUserInfo[i]._id.toHexString(), nickname: targetUserInfo[i].nickname });
        }
        data['targetUsers'] = targetUsers;

        // 댓글 추가.
        var reaultInsert
        if(ptype=='up'){
            var imgs = null;
            var originalnm = null;
            if(photo == null || photo.length == 0) {
                var v = await db.get("comment", {_id: ObjectId(commentId)});
                imgs = v.image;
                originalnm = v.imageName;
            } else {
                imgs = photo;
                originalnm = originalname
            }
            reaultInsert = await db.updateById("comment", commentId,{$set:{"comment":comment, "image": imgs, "imageName": originalnm}},{} );
        } else {
            reaultInsert = await db.insert("comment", data);

            //사용자 카운트 집계 뎃글
            var userUpdate = await db.update("user", { _id: ObjectId(userId) }, { $inc: { countComment: 1 } }, { upsert: true });
            //업

            // TODO: 추후 캐쉬를 이용해서 카운트를 표출할지 수정 필요.
            var result = null;
            if (reaultInsert) {
                var uwhere = { _id: ObjectId(contentId) }
                var udata = { $inc: { comment: 1 } };
                result = await db.update(contentType === 'e' ? 'event' : "board", uwhere, udata);
            }

            switch (type) {
                case 'rc': { // replay comment
                    if (result) {
                        var cwhere = { _id: ObjectId(commentId) }
                        var cdata = { $inc: { reply: 1 } };
                        result = await db.update("comment", cwhere, cdata);
                    }
                    break;
                }
            }

            if(typeof board.pushmsg==='boolean'){
            
            }else{
                board.pushmsg=true;
            }

            // push message 전송 시작
            var pathhash="inkiup-24rank";
            if (board.pushmsg && targetUserid) {
                var url = "/detail/"+pathhash+"/"+contentId;
                var notification = __(type == 'c' ? 'PUSH_REPLY_MSG' : 'PUSH_REREPLY_MSG');
                global.notification.send([targetUserid], {
                    kind: "comment",
                    sender: (isAdmin && contentUserId!="")?adminUseUserInfo:req.user,
                    body: notification,
                    data: {
                        url: url
                    }
                });
            }

            
            
            // 댓글에 언급된 사용자에게 푸시 전송
            if (board.pushmsg && targetUserInfo && targetUserInfo.length > 0) {
                global.notification.send(targetUserInfo, {
                    kind: "comment",
                    sender: req.user,
                    body: __('PUSH_REPLYTARGET_MSG'),
                    data: {
                        url: url
                    }
                });
            }
            // push message 전송 끝

            if (data.kind == "board") {
                rank.calPoint(contentId);
            }
        }
        

        

        return res.json({
            result: reaultInsert ? "ok" : "error",
            codemsg: "comment-post",
            dispaymsg: "",
            data: reaultInsert,
            type: type
        });
    }
];
