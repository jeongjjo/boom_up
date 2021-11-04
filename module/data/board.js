var common = require("../common");
var db = require("../mongodbWrapper");
var dbCache = require("../dbCache");
var ObjectId = require('mongodb').ObjectId;
var moment = require('moment');

module.exports = async function (user, kind, page, s, limit, keyword, id, share) {
    var userId = null;
    if(kind == "mycontent") {
        userId = id;
    } else {
        userId = user ? user._id.toHexString() : null;
    }
    

    page = page || 0;
    limit = limit || 25; // 페이지당 row 수
    keyword = common.escapeRegExp(keyword || '');
    var myKeep = null;

    var where = {};
    switch (kind) {
        case 'myinkiup': {
            if (userId) {
                var subscription = [];
                var subResult = await db.getList("subscription", { userId: userId });
                if (subResult) {
                    subscription = subResult.map(v => v.targetUserId);
                }
                subscription.push(userId);
                var subscribeLineupKey = user.subscribeLineup ? user.subscribeLineup.map(v => v.lineupKey) : null;
                if (subscribeLineupKey && subscribeLineupKey.length > 0) {
                    where = { $or: [{ userId: { $in: subscription } }, { lineupKey: { $in: subscribeLineupKey } }] };
                } else {
                    where = { userId: { $in: subscription } };
                }
            }
            break;
        }
        case 'inkiup': {
            break;
        }
        case 'inkiup_ranking': {
            kind = 'inkiup';
            break;
        }
        case 'event': {
            where = { finish: false };
            break;
        }
        case 'searchall': {
            where =
            {
                $or: [
                    { title: { $regex: keyword, $options: "i" } },
                    { searchContent: { $regex: keyword, $options: "i" } },
                    { nickname: { $regex: keyword, $options: "i" } },
                    { hashtag: { $regex: keyword, $options: "i" } }
                ]
            };

            if (user) {
                await db.update('hotKeyword'
                , { text: keyword }
                , {
                    $set: { text: keyword },
                    $inc: { count: 1 }
                }
                , { upsert: true });

                await db.update('myKeyword'
                , { text: keyword }
                , {
                    $set: { text: keyword, userId: userId }
                }
                , { upsert: true });
            } else {
                await db.update('hotKeyword'
                , { text: keyword }
                , {
                    $set: { text: keyword },
                    $inc: { count: 1,countNone: 1 }
                }
                , { upsert: true });
            }

            break;
        }
        case 'title': {
            where = { title: { $regex: keyword, $options: "i" } };
            break;
        }
        case 'hashtag': {
            where = { hashtag: { $regex: keyword, $options: "i" } };
            break;
        }
        case 'nickname': {
            where = { nickname: { $regex: keyword, $options: "i" } };
            break;
        }
        case 'content': {
            where = { searchContent: { $regex: keyword, $options: "i" } };
            break;
        }
        case 'keep': {
            if (userId) {
                myKeep = await db.getList("keep", { userId: userId });
                where = { _id: { $in: myKeep.map(v => ObjectId(v.targetId)) } };
            } else {
                return {
                    kind: kind,
                    page: page,
                    sort: sort,
                    data: []
                };
            }
            break;
        }
        case 'mycontent' : {
            where = { userId: userId};
            break;
        }
        case 'myupdown' : {
            break
        }
        default: {
            where = { lineupKey: kind };
            break;
        }
    }

    var sort = null; // 기본 검색 옵션
    if (kind != 'event') {
        switch (s) {
            case 'ranking-up': {
                sort = { votingUp: 1 }
                break;
            }
            case 'ranking-down': {
                sort = { votingUp: -1 }
                break;
            }
            case 'date-up': {
                sort = { createTS: 1 }
                break;
            }
            case 'allrank': {
                sort = { point: -1 }
                break;
            }
            case '24rank': {
                var now = moment();
                var before24 = moment().add(-1, 'd');
                where.createTS = { $gte: before24.valueOf(), $lte: now.valueOf() };
                sort = { point: -1 };
                break;
            }
            default: {
                sort = { createTS: -1 }
                break;
            }
        }
    }
    
    if (share && share.length > 24) {
        var boardIds = [];
        var cnt = share.substr(0, 1) * 1;
        for (var i = 0; i < cnt; i++) {
            boardIds.push(ObjectId(share.substr(1+(i*24), 24)));
        }
        if (boardIds.length > 0) {
            where = {_id : { $in : boardIds }};
        }
        sort = { point: -1 };
    } 

    where.delete = false;

    var list = await db.getList(kind == 'event' ? kind : 'board', where, page, limit, sort);

    var myVote = null;
    var myBlockUser = null;
    var myUserMemo = null;

    var lineup = null;
    if (kind != 'event') {
        var cIdList = list.map(v => v._id.toHexString());
        var userList = list.map(v => v.userId);
        lineup = await db.getList('lineup', {}, 0, 0, sort);
        if (userId) {
            myVote = await db.getList("vote", { targetId: { $in: cIdList }, userId: userId });
            myBlockUser = await db.getList("blockUser", { userId: userId });
            myUserMemo = await db.getList("userMemo", { userId: userId, targetUserId: { $in: userList } });
            myKeep = myKeep || await db.getList("keep", { targetId: { $in: cIdList }, userId: userId });
        }
    }

    for (i in list) {
        var id = typeof list[i]._id == "string" ? list[i]._id : list[i]._id.toHexString();
        var uId = list[i].userId || null;
        var lineupKey = list[i].lineupKey || null;
        if (uId) {
            userInfo = await dbCache.get('user@' + uId, () => {
                return db.get('user', { "_id": ObjectId(uId) });
            });
            list[i].userPhoto = (userInfo)?((userInfo.photo)?userInfo.photo:null):null;
            list[i].userLevel = (userInfo)? (userInfo.level?userInfo.level:null) : 0;
        }
        list[i]._id = id;

        if (kind != 'event') {
            if (lineup) {
                let res = lineup.filter(v => v.lineupKey == lineupKey);
                if (res && res[0]) {
                    list[i].lineup = res[0];
                }
            }

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

            list[i].userMemo = "";
            if (myUserMemo) {
                let res = myUserMemo.filter(v => v.targetUserId == list[i].userId);
                if (res && res[0]) {
                    list[i].userMemo = res[0].memo;
                }
            }

            list[i].keep = false;
            if (myKeep) {
                let res = myKeep.filter(v => v.targetId == id);
                if (res && res[0]) {
                    list[i].keep = true;
                }
            }
            list[i].bindType = "board";


        }
    }
    kind = (kind == "searchall" || kind == "title" || kind == "hashtag" || kind == "nickname" || kind == "content") ? "search" : kind;
    return {
        kind: kind,
        data: list,
        page: page,
        sort: s,
        lineup: lineup
    }
}