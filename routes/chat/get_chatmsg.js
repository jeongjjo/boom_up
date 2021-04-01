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
var db = require("../../module/mongodbWrapper");
var ObjectId = require('mongodb').ObjectId;
var dbCache = require("../../module/dbCache");

module.exports = [
    '/chatmsg/:roomId?/:targetUserId?/:nickname?', // URI : /test2 (최종은 /<route module>/<page module> : /sameple/test2)
    [], // 권한 : null은 권한 미체크, [] array 형태로 권한 지정
    [
        // Validation 처리 ------------------------------------
        exValidator.param("targetUserId", 'REQ').notEmpty().trim()
        //exValidator.param("nickname").toString()
        //      exValidator.param('type', 'REQ').not().isEmpty().trim(),
        //      exValidator.header('user-agent', 'NOT FOUND').not().isEmpty().isLength({min: 4,max: 24})
        //        .matches(/^MY/)  // MY로 시작되는 문자열
        //        .custom((value, {req,location,path}) => { return value.startsWith('MY'); }) // MY로 시작되는 문자열(위의 matches()랑 동일 구현)
        // 파라미터 sanitize 처리 ------------------------------
        //      sanitize* function들은 모두 validation 과 통합되었음
    ],
    async function (req, res, next) {
        var oriroomid=req.params.roomId;
        var roomid=req.params.roomId;
        var roomStatus="";
        var userId=req.user._id.toHexString();
        if (roomid==0){
            var where = {$and:[
                {"members":{ $elemMatch:{"userId":userId} }},
                {"members":{ $elemMatch:{"userId":req.params.targetUserId} }},
                {"deleteInfo":{$nin:[userId]}}
            ]} 
            var room = await db.getList("chatRoom", where,0,1,{}); 
            if (room.length>0){
                roomid=room[0]._id.toHexString();
            }else{
                var a = await db.insert('chatRoom', {
                    "roomName" : req.user.nickname+" room",
                    "userId" : req.user._id.toHexString(),
                    "members" : [ 
                        {
                            "userId" : req.user._id.toHexString()
                        }, 
                        {
                            "userId" : req.params.targetUserId
                        }
                    ],
                    "lastMsg" : "",
                    "deleteInfo" : [],
                    "registDate" : Date.now()
                })
                roomid=a._id.toHexString();
            }
        }else{
            var where = {$and:[
                {_id:ObjectId(roomid)},
                {"deleteInfo":{$nin:[userId]}}
            ]} 
            var room = await db.getList("chatRoom",where ,0,1,{}); 
            if (room.length<=0 ){
                roomStatus="not";
            }
        }
        var blockuser = await db.getList("blockUser", {"userId":req.user._id.toHexString(),"targetUserId":req.params.targetUserId},0,0,{}); 
        var blocked=blockuser.length>0?true:false;
        // server-side validation 처리
        const validationErrors = exValidator.validationResult(req);
        if (!validationErrors.isEmpty()) {
           return res.sendStatus(404);
        }
        var chatServerUrl=global.config.chatServer.host+":"+global.config.chatServer.port+"/"+global.config.chatServer.namespace;
        res.render('chat/chatMsg', {
            title: req.params.nickname,
            blocked: blocked,
            roomid: roomid,
            targetUserId: req.params.targetUserId,
            sid:req.sessionID,
            chatserverurl:chatServerUrl,
            roomStatus:roomStatus,
            oriRoomId:oriroomid
        });
    }
];
