var db = require("./mongodbWrapper");
var ObjectId = require('mongodb').ObjectId;

module.exports = {
    initUserPoint: async function(userId){
        //일주일 지났을 시 붐파워 초기화
        await db.update("user", {_id:ObjectId(userId)},{$set:{"boomPower":0}} , {upsert:true}   );
    },
    getUserPont: async function(userId){
        // var user = await mongodb.db('user').findOne({
        //     _id: userid
        // });
        // let point = user.boomPower
    },
    setUserPoint: async function(userId, contentId, contentType, point){
        //게시글 작성, 댓글 작성 시 user 포인트 +
        /*var user = await db.getById('user', userId)
        if(!user.boomPower){
            user.boomPower = 0;
        }*/
        //let boomPower = user.boomPower+point;
        //{ $inc: { readCount: 1, readNoneCnt: 1 } }
        //await db.update("user", {_id:ObjectId(userId)},{$set:{"boomPower":boomPower}} , {upsert:true}   );
        await db.update("user", {_id:ObjectId(userId)},{$inc:{boomPower:point}} , {upsert:true}   );
        await db.insert("powerHistory", {userId:userId, contentId:contentId, contentType:contentType, point:point});
    },
    setBettingPoint: async function(userId, contentId, point){
        let result_history = null
        let result_user = null
        let result_board = await db.update("board", {_id:ObjectId(contentId)},{$inc:{betting:point, bettingCount:1}} , {upsert:true}   );
        if(result_board !== null){
            result_user = await db.update("user", {_id:ObjectId(userId)},{$inc:{boomPower:-point, bettingCount:1}} , {upsert:true}   );
            result_history = await db.insert("bettingHistory", {userId:userId, contentId:contentId, point:point});
        }
        return result_board !== null && result_user !== null && result_history !== null;
    },
    bettingCheck: async function (userId, contentId){
        return await db.count("bettingHistory", {userId: userId, contentId: contentId})
    }
};
