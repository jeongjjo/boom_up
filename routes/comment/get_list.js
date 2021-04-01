const exValidator = require("express-validator");

var common = require("../../module/common");
var db = require("../../module/mongodbWrapper");
var dbCache = require("../../module/dbCache");
var ObjectId = require('mongodb').ObjectId;

var moment = require('moment');

module.exports = [
    '/list/:cId/:kind/:page?/:sort?/:limit?',  // URI : /test2 (최종은 /<route module>/<page module> : /sameple/test2)
    null, // 권한 : null은 권한 미체크, [] array 형태로 권한 지정
    [
        exValidator.param('cId', 'REQ').not().isEmpty().trim(),
        exValidator.param('kind', 'REQ').not().isEmpty().trim(),
        exValidator.param("page").toInt(10),
        exValidator.param("limit").toInt(10),
        exValidator.param('sort', 'REQ').trim()
    ],
    async function (req, res, next) {
        const validationErrors = exValidator.validationResult(req);
        if (!validationErrors.isEmpty()) {
            return res.sendStatus(404);
        }
        var list = null;
        var isProfile = req.query.isProfile;
        if (req.params.kind == "single-comment") {
            var result = await db.getById('comment', ObjectId(req.params.cId));
            if (result) {
                list = [result];
            }
        } else {
            var contentId = req.params.kind !== 'comment' ? req.params.cId : null;
            var commentId = req.params.kind === 'comment' ? req.params.cId : null;
            var page = (req.params.page || 0);
            var limit = (req.params.limit || 10); // 페이지당 row 수

            var sort = null; // 기본 검색 옵션 = 최신순 RegistData
            switch (req.params.sort) {
                case 'ranking-up': {
                    //sort = { votingUp: 1 }
                    sort = { point: -1 }
                    break;
                }
                case 'ranking-down': {
                    //sort = { votingDown: -1 }
                    sort = { point: 1 }
                    break;
                }
                case 'date-up': {
                    sort = { createTS: 1 }
                    break;
                }
                default: {
                    sort = { createTS: -1 }
                    break;
                }
            }

            var where = {  };
            if(isProfile == "myprofile") {
                where.userId = contentId;
            } else {
                if (contentId) {
                    where.contentId = contentId;
                }
            }
            
            list = await db.getList('comment', where, page, limit, sort);
        }

        //댓글 대댓글 한번에 펼치기
        var replylist = [];
        var parentlist = [];
        // if(req.params.kind !== 'comment') {
        //     var replycomment = [];
        //     for(var i = 0; i < list.length; i++) {
        //         replycomment.push(list[i]._id.toHexString());
        //     }
        //     replylist = await db.getList('comment', { commentId : { $in : replycomment}});
        // }

        var myVote = null;
        var myBlockUser = null;
        var commentIdList = list.map(v => v._id.toHexString())
        var userMemo = null;
        if (req.user) {
            var userId = req.user._id.toHexString();
            myVote = await db.getList("vote", { targetId: { $in: commentIdList }, userId: userId });
            myBlockUser = await db.getList("blockUser", { userId: userId });
            userMemo = await db.getList("userMemo", { userId: userId });
        }

        //댓글에 작성자 추가하기
        var boardId = null;
        if(req.params.kind === "comment") {
            var contentId = await db.getList("comment", { commentId: req.params.cId });
            boardId = await db.getList("board", {_id: ObjectId(contentId[0].contentId)});
        } else if (req.params.kind == "single-comment") {
            boardId = await db.getList("board", {_id: ObjectId(list[0].contentId)});
        } else {
            boardId = await db.getList("board", {_id: ObjectId(req.params.cId)});
        }

        for (i in list) {
            var id = list[i]._id.toHexString();
            var userId = list[i].userId;
            userInfo = await dbCache.get('user@' + userId, () => {
                return db.get('user', { "_id": ObjectId(userId) });
            });
            list[i]._id = id;
            list[i].userPhoto = userInfo.photo;
            list[i].level = userInfo.level||1; //사용자 레벨 추가
            if (myVote) {
                let res = myVote.filter(v => v.targetId == id);
                if (res && res[0]) {
                    list[i].vote = res[0].type;
                }
            }

            list[i].delete = list[i].delete || false;
            list[i].blockUser = false;
            if (myBlockUser) {
                let res = myBlockUser.filter(v => v.targetUserId == list[i].userId);
                if (res && res[0]) {
                    list[i].blockUser = true;
                }
            }

            if (userMemo) {
                let res = userMemo.filter(v => v.targetUserId == list[i].userId);
                if (res && res[0]) {
                    list[i].userMemo = res[0].memo;
                }
            }
            if (list[i].delete == false && list[i].blockUser == false) {
                var targetNickNames = list[i].comment.match(/[@][^ ]*/gi);
                list[0].comment = list[0].comment.replace(/ /gi, '&nbsp;');
                for (ti in targetNickNames) {
                    var nm = targetNickNames[ti].replace('@', '');
                    var targetUsers =  list[i] && list[i].targetUsers || [];
                    let res = targetUsers.filter(v => v.nickname == nm);
                    if (res && res[0]) {
                        list[i].comment = list[i].comment.replace('@' + nm, '<a href="/profile/main/' + res[0].id + '">@' + nm + '</a>');
                    }
                }
            }
            if(req.params.kind != "event") {
                if(list[i].userId == (boardId[0] ? boardId[0].userId : "No")) {
                    list[i].writer = "Y";
                } else {
                    list[i].writer = "N";
                }
            }
            

            if(list[i].commentId == null) {
                parentlist.push(list[i]);
            } else {
                replylist.push(list[i]);
            }
        }
        if(isProfile == "myprofile") {
            parentlist = list;
        } else {
            if (replylist && replylist.length > 0) {
                for(var a = 0; a < parentlist.length; a++) {
                     /*
                    let res = replylist.filter(v => ObjectId(v.contentId) == parentlist[a]._id);
                    parentlist[a].replycomment=res;
                    */
                    parentlist[a].replycomment=[];
                    for(var b = 0; b < replylist.length; b++) {
                        if(replylist[b].commentId == parentlist[a]._id){
                            parentlist[a].replycomment.push(replylist[b]);
                            for(var c = 0; c < replylist.length; c++) {
                                if(replylist[b]._id==replylist[c].commentId){
                                    parentlist[a].replycomment.push(replylist[c]);
                                    for(var d = 0; d < replylist.length; d++) {
                                        if(replylist[c]._id==replylist[d].commentId){
                                            parentlist[a].replycomment.push(replylist[d]);
                                        }
                                    }
                                }
                            }
                        }
                    }
                    

                }
            }
        }
        

        
        res.render('comment/list', {
            data: req.params.kind == "single-comment" ? list : parentlist,
            isProfile: isProfile
        });
    }
];
