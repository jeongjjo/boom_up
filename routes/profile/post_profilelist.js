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
var db = require("../../module/mongodbWrapper");
var ObjectId = require('mongodb').ObjectId;
var dbCache = require("../../module/dbCache");
module.exports = [
    '/profilelist', // URI : /test2 (최종은 /<route module>/<page module> : /sameple/test2)
    null, // 권한 : null은 권한 미체크, [] array 형태로 권한 지정
    [
        // Validation 처리 ------------------------------------
        exValidator.body('id', 'REQ').not().isEmpty().trim(),
        exValidator.body('postCheck', 'REQ').not().isEmpty().trim(),
        exValidator.body('first', 'REQ').not().isEmpty().trim(),
        exValidator.body('lastPostId', 'REQ').not().isEmpty().trim(),
        exValidator.body('lastCommentId', 'REQ').not().isEmpty().trim(),
        exValidator.body('lastReplyId', 'REQ').not().isEmpty().trim()
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

        var postlist = []; //post, vote
        var commentlist = []; //  댓글, vote
        var replylist = []; // 댓글, vote 

        var list = [];
        var cnt = 8;

        var isMine = false;
        if (req.user) {
            isMine = !req.body.id || req.body.id === req.user._id.toHexString();
        }

        var userId="";
        if(!req.user && req.body.id) {
            userId=req.body.id;
        }else{
            if(isMine){
                userId=req.user._id.toHexString();
            }else{
                userId=req.body.id;
            }
        }

        var Userinfo = await db.getById("user", ObjectId(userId));
        
        //req.body.id 가 작성한 게시물 조회 
        if (req.body.postCheck == 'Y' ) {
            var where = { userId: req.body.id,delete:false }
            //where.delete=false;
            req.body.lastPostId != 'none' && req.body.first == 'N' ? where._id = { $lt: ObjectId(req.body.lastPostId) } : '';

            var a = await db.getList('board', where, 0, cnt,{_id:-1});
            if (a.length > 0) {

                var vote = await db.getList('vote', { "targetId": { $in: a.map(obj => obj._id.toHexString()) }, userId: userId }, 0, 0, {});
                a = a.map(function (obj) {
                    obj.writer = [Userinfo]
                    obj.listType = 'post';

                    obj.listType2 = '_board';
                    obj.vote = vote.filter(mObj => { return (mObj.targetId.toString() == obj._id.toString() ? mObj : null) });
                    return obj;
                });
                if (req.user && !isMine) {
                    var followed = await db.getList('subscription', { "targetUserId": req.body.id, userId: userId }, 0, 0, {});
                    var usrmemo = await db.getList('userMemo', { "targetUserId": req.body.id, userId: userId }, 0, 0, {});
                    a = a.map(function (obj) {
                        obj.memo = usrmemo.filter(mObj => { if (mObj.targetUserId.toString() == obj.userId.toString()) return mObj.memo });
                        obj.followed = followed.some(mObj => { return (mObj.targetUserId.toString() == obj.userId.toString() ? mObj : null) });
                        return obj;
                    });
                }
                var lineup = await db.getList('lineup', {});
                a = a.map(function (obj) {
                    var array = [];
                    array = lineup.filter(mObj => { if (mObj.lineupKey == obj.lineupKey) return mObj });
                    obj.lineup = array[0];
                    return obj;
                });
            }
            postlist = postlist.concat(a);
        };


        var lastVoteId="";
        //req.body.id 가 투표한 게시물,
        if (req.body.voteCheck == 'Y'  ) {
            var where = { userId: req.body.id,kind:'board' }
            req.body.lastVoteId != 'none' && req.body.first == 'N'? where._id = { $lt: ObjectId(req.body.lastVoteId) } : '';
            var c = await db.getList('vote', where, 0, cnt,{_id:-1});
            lastVoteId= c.length>0?c[c.length-1]._id:'';
            var whereBoard={$and:[
                { "_id": { $in: c.map(obj => ObjectId(obj.targetId)) },delete:false  } 
            ]} 
            if (c.length > 0) {
                var g = await db.getList('board',  whereBoard  );
                if (req.user) {
                    var userMaster = await db.getList('user', { "_id": { $in: g.map(obj => ObjectId(obj.userId)) } }, 0, 0, {});
                    var blocked = await db.getList('blockUser', { "targetUserId": { $in: g.map(obj => obj.userId) }, userId: userId }, 0, 0, {});
                    var followed = await db.getList('subscription', { "targetUserId": { $in: g.map(obj => obj.userId) }, userId: userId }, 0, 0, {});
                    var usrmemo = await db.getList('userMemo', { "targetUserId": { $in: g.map(obj => obj.userId) }, userId: userId }, 0, 0, {});
                    var lineup = await db.getList('lineup', {});
                    var vote = c;
                    g = g.map(function (obj) {
                        obj.memo = usrmemo.filter(mObj => { if (mObj.targetUserId.toString() == obj.userId.toString()) return mObj.memo });
                        obj.blockedUser = blocked.filter(mObj => { return (mObj.targetUserId.toString() == obj.userId.toString() ? mObj : null) });
                        obj.vote = vote.filter(mObj => { return (mObj.targetId.toString() == obj._id.toString() ? mObj : null) });
                        obj.followed = followed.some(mObj => { return (mObj.targetUserId.toString() == obj.userId.toString() ? mObj : null) });
                        obj.writer = userMaster.filter(mObj => { if (mObj._id.toString() == obj.userId.toString()) return mObj });
                        var array = [];
                        array = lineup.filter(mObj => { if (mObj.lineupKey == obj.lineupKey) return mObj });
                        obj.lineup = array[0];
                        obj.listType = 'post';
                        obj.listType2 = '_vote';
                        return obj;
                    });
                }
                postlist = postlist.concat(g);
            }

            var where = { userId: req.body.id,kind:'comment' }
            req.body.lastVoteId != 'none' && req.body.first == 'N'? where._id = { $lt: ObjectId(req.body.lastVoteId) } : '';
            var vote = await db.getList('vote', where, 0, cnt,{_id:-1});
            var whereComment={$and:[
                { "_id": { $in: vote.map(obj => ObjectId(obj.targetId)) }  } 
            ]} 
            
            if (vote.length > 0) {
                var comment = await db.getList('comment',  whereComment  );
                if (req.user) {
                    //var blocked = await db.getList('blockUser', { "targetUserId": { $in: g.map(obj => obj.userId) }, userId: userId }, 0, 0, {});
                    comment = comment.map(function (obj) {
                        obj.listType = 'comment';
                        obj.vote = vote.filter(mObj => { return (obj._id.toHexString() == mObj.targetId ? mObj : null) });
                        obj.listType2 = '_vote';
                        return obj;
                    });
                }
                postlist = postlist.concat(comment);
            }

            if(vote.length > 0 && c.length > 0){
                if(vote[vote.length-1]._id<lastVoteId){
                    lastVoteId= vote[vote.length-1]._id;
                }
            } else if(vote.length > 0 && c.length <= 0){
                lastVoteId= vote[vote.length-1]._id;
            }
        
        }
        if (req.user) {
            var keep = await db.getList('keep', { "targetId": { $in: postlist.map(obj => obj._id.toHexString()) }, userId: userId }, 0, 0, {});
            postlist = postlist.map(function (obj) {
                obj.keep = keep.filter(mObj => { return (mObj.targetId.toString() == obj._id.toString() ? mObj : null) });
                return obj;
            });
        }

        //req.body.id 가 작성한 댓글 조회 
        if (req.body.datgulCheck == 'Y'  ) {
            var where = { userId: req.body.id,delete:false }
            //where.delete=false;
            req.body.lastCommentId != 'none'&& req.body.first == 'N' ? where._id = { $lt: ObjectId(req.body.lastCommentId) } : '';
            commentlist = await db.getList('comment', where, 0, cnt,{_id:-1});
           
            if (commentlist.length > 0) {
                var vote = await db.getList('vote',  { "targetId": { $in: commentlist.map(obj => obj._id.toHexString())} , kind: "comment"  , userId: userId }, 0, 0, {});
                commentlist = commentlist.map(function (obj) {
                    obj.listType = 'comment';
                    obj.listType2 = '_comment';
                    obj.vote = vote.filter(mObj => { return (mObj.targetId.toString() == obj._id.toString() ? mObj : null) });
                    return obj;
                });
            }
        };
 
        var unq = (arr, comp) => {
            const unique = arr
                .map(e => e[comp].toString())
                .map((e, i, final) => final.indexOf(e) === i && i)
                .filter(e => arr[e]).map(e => arr[e]);
            return unique;
        }
        postlist = unq(postlist, '_id');
        var compare = (a, b) => {
            const x = a.createTS;
            const y = b.createTS;
            let cmp = 0;
            if (x > y) cmp = 1;
            else if (x < y) cmp = -1;
            return cmp * -1;
        }

        list = postlist.concat(commentlist);//.concat(replylist);
        list.sort(compare);
 
        res.render('_parts/_list', {
            list: list || null,
            lastVoteId:lastVoteId,
            keyword: '', //공용 템플릿 용 ,
            fist: req.body.first,
            noDataText: 'NOPOST' 
        });

    }
];
