var common = require("../common");
var db = require("../mongodbWrapper");
var dbCache = require("../dbCache");
var ObjectId = require('mongodb').ObjectId;
var moment = require('moment');

module.exports = {
    //포인트 계산//
    rankInit: async function(offset, limit){
        let samplePoint = 0.001
        let allBoard = await db.getList("board", {delete:false},offset,limit, {point:-1})
        for(let i in allBoard){
            let contentId = allBoard[i]._id.toString()
            let voteDownCount=(allBoard[i].votingDown||0);
            let voteUpCount=(allBoard[i].votingUp||0);
            let readCount=(allBoard[i].readCount||0);
            let bettingPoint=(allBoard[i].betting||0);
            let bettingCount=(allBoard[i].bettingCount||0);
            let commentCount = (allBoard[i].commentCount||0)
            //유지기간(전날까지 유지 포인트)
            let rankCount = (allBoard[i].rankPoint||0)
            let voteUpPoint = 0
            let voteDownPoint = 0
            if(commentCount > 0) {
                let comment = await db.getList("comment", {contentId: contentId, delete: false}, null, null, null);
                for(let i in comment){
                    voteUpPoint += comment[i].votingUp
                    voteDownPoint += comment[i].votingDown
                }
            }
            //게시글 보팅 카운트
            let contentVoting = voteUpCount - voteDownCount
            //댓글 보팅 카운트
            let commentVoting = voteUpPoint-voteDownPoint

            let diffDate = moment().diff(moment(allBoard[i].createTS), 'days')
            // console.log('content',contentVoting)
            // console.log('comment',commentVoting)
            // console.log('diff',diffDate)
            // console.log('read',readCount)
            // if(bettingPoint > 0){
            //     console.log('betting',bettingPoint)
            // }
            // console.log('bettingCount',bettingCount)
            let point = (contentVoting + commentVoting + diffDate + readCount + bettingPoint + bettingCount + rankCount) * samplePoint
            await db.update("board", {_id: ObjectId(contentId)}, {$set:{point: point}}, {upsert: true})
        }
        return true
    },
    //포인트 계산 후 랭킹 100위 이내 게시물만 유지 포인트 +1//
    rankPointInit: async function(){
        let inRanking = await db.getList("board", {delete: false}, null, 100, {point: -1})
        let outRanking = await db.getList("board", {delete: false}, 100, null, {point: -1})

        let inRankingIds = []
        let outRankingIds = []
        for(let i in inRanking){
            inRankingIds.push(ObjectId(inRanking[i]._id))
        }
        for(let i in outRanking){
            outRankingIds.push(ObjectId(outRanking[i]._id))
        }
        let inResult = await db.updateMany(
            "board",
            {_id: { $in: inRankingIds}},
            { $inc: {rankPoint: 1}},
            { multi:true, upsert: true }
        );
        let outResult = await db.updateMany(
            "board",
            {_id: { $in: outRankingIds}},
            { $set: {rankPoint: 0}},
            { multi:true, upsert: true }
        );
        return !!(inResult && outResult);
    },

    dayInit: async function(){
        console.log('dayInit')
        //게시판 포인트 계산
        //let boardList = await db.getList("board", null, null, null, null)
        //베팅한 유저들만 찾아서 포인트에 따른 마일 계산 후 유저에게 적립
        //100위 리스트 라인업
        //매일 랭킹 확인 및 DB 저장//
        await db.insert("rankingHistory",  {ranking:rankingList})


        //console.log(dateQuery)
        let rankingList = await db.getIndexData("rankingHistory", 0)
        //console.log(rankingList)
        let bettingHistory = await db.getList("bettingHistory", null, null, null, null)

        for(let i in bettingHistory){
            //console.log('bettingId', bettingHistory[i].contentId)
            let rank = rankingFind(bettingHistory[i].contentId)
            let bettingPoint = bettingHistory[i].point
            if(rank > -1){
                rank = rank + 1
            }
            let addPoint = 0
            if(rank >= 1 && rank <= 10){
                addPoint = bettingPoint * 0.003
            }else if(rank > 10 && rank <= 50){
                addPoint = bettingPoint * 0.002
            }else if(rank > 50 && rank <= 100){
                addPoint = bettingPoint * 0.001
            }
            await db.insert("mileHistory", {bettingId: bettingHistory[i]._id, userId: bettingHistory[i].userId, contentId: bettingHistory[i].contentId, boomLevel: addPoint})
        }
        function rankingFind(contentId){
            return rankingList.ranking.findIndex((e)=>{
                if(e._id == contentId){
                    return true
                }
            });
        }
        return true
    },
    weekInit: async function(){
        //console.log('testModule2')
        let currentDate = moment().format('YYYY-MM-DD 00:00:00')
        let weekDate = moment().add(7, 'days').format('YYYY-MM-DD 11:59:59')
        let startUnixTime = moment(currentDate).valueOf()
        let endUnixTime = moment(weekDate).valueOf()
        let dateQuery = { $gte : startUnixTime, $lt : endUnixTime }

        let data = [
            {$match:{ createTS:dateQuery}},
            {
                $group:{
                    _id: {$toObjectId:"$userId"},
                    totalLevel: {$sum: "$boomLevel"}
                }
            }
        ]

        let aggResult = await db.aggregate("mileHistory", data)
        console.log(aggResult)
        for(let i in aggResult){
            console.log(aggResult[i])
            await db.update("user", {_id: ObjectId(aggResult[i]._id)}, {$inc:{boomLevel: parseInt(aggResult[i].totalLevel)}}, {upsert:true})
        }
        return true
    }
    //await db.getList("vote", { targetId: { $in: cIdList }, userId: userId });

}
