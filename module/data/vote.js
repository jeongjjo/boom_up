var common = require("../common");
var db = require("../mongodbWrapper");
var dbCache = require("../dbCache");
var ObjectId = require('mongodb').ObjectId;
var moment = require('moment');

module.exports = async function (user, kind, page, s, limit, keyword, id) {
    var userId = id
    var postlist = []; //post, vote
    var commentlist = []; //  댓글, vote

    var list = [];
    var cnt = 0;
            // var lastVoteId="";
            var where = { userId: id, kind:'board'}
            // req.body.lastVoteId != 'none' && req.body.first == 'N'? where._id = { $lt: ObjectId(req.body.lastVoteId) } : '';
            var c = await db.getList('vote', where, page, limit, {_id:-1});
            // lastVoteId= c.length>0?c[c.length-1]._id:'';
            var whereBoard={$and:[
                { "_id": { $in: c.map(obj => ObjectId(obj.targetId)) },delete:false  } 
            ]} 
            if (c.length > 0) {
                var g = await db.getList('board',  whereBoard  );
                if (user) {
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
                        obj.vote = obj.vote[0].type;
                        obj.followed = followed.some(mObj => { return (mObj.targetUserId.toString() == obj.userId.toString() ? mObj : null) });
                        obj.writer = userMaster.filter(mObj => { if (mObj._id.toString() == obj.userId.toString()) return mObj });
                        obj.userLevel = obj.writer && obj.writer[0] && obj.writer[0].level ? obj.writer[0].level : 0;
                        obj.userPhoto = obj.writer[0].photo || null;
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

            var where = { userId: id, kind:'comment' }
            // req.body.lastVoteId != 'none' && req.body.first == 'N'? where._id = { $lt: ObjectId(req.body.lastVoteId) } : '';
            var vote = await db.getList('vote', where, page, limit,{_id:-1});
            var whereComment={$and:[
                { "_id": { $in: vote.map(obj => ObjectId(obj.targetId)) }  } 
            ]} 
            
            if (vote.length > 0) {
                var comment = await db.getList('comment',  whereComment  );
                if (user) {
                    //var blocked = await db.getList('blockUser', { "targetUserId": { $in: g.map(obj => obj.userId) }, userId: userId }, 0, 0, {});
                    var userMaster = await db.getList('user', { "_id": { $in: comment.map(obj => ObjectId(obj.userId)) } }, 0, 0, {});
                    comment = comment.map(function (obj) {
                        obj.listType = 'comment';
                        obj.vote = vote.filter(mObj => { return (obj._id.toHexString() == mObj.targetId ? mObj : null) });
                        obj.vote = obj.vote[0].type;
                        obj.writer = userMaster.filter(mObj => { if (mObj._id.toString() == obj.userId.toString()) return mObj });
                        obj.userLevel = obj.writer[0].level || 0;
                        obj.userPhoto = obj.writer[0].photo || null;
                        obj.listType2 = '_vote';
                        return obj;
                    });
                }
                postlist = postlist.concat(comment);
            }

            // if(vote.length > 0 && c.length > 0){
            //     if(vote[vote.length-1]._id<lastVoteId){
            //         lastVoteId= vote[vote.length-1]._id;
            //     }
            // } else if(vote.length > 0 && c.length <= 0){
            //     lastVoteId= vote[vote.length-1]._id;
            // }
        
        
        if (user) {
            var keep = await db.getList('keep', { "targetId": { $in: postlist.map(obj => obj._id.toHexString()) }, userId: userId }, 0, 0, {});
            postlist = postlist.map(function (obj) {
                obj.keep = keep.filter(mObj => { return (mObj.targetId.toString() == obj._id.toString() ? mObj : null) });
                return obj;
            });
        }



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
    return {
        kind: kind,
        data: list,
        page: page,
        sort: s,
        lineup: lineup
    }
}