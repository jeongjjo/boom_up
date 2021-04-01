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
module.exports = [
    "/chatmsgsave", // URI : /test2 (최종은 /<route module>/<page module> : /sameple/test2)
    [], // 권한 : null은 권한 미체크, [] array 형태로 권한 지정
    [
        // Validation 처리 ------------------------------------
        exValidator.body('chatRoomId', 'REQ').notEmpty().trim(),
        exValidator.body('content', 'REQ').notEmpty().trim(),
        exValidator.body('userId', 'REQ').notEmpty().trim()
        //      exValidator.param('type', 'REQ').not().isEmpty().trim(),
        //      exValidator.header('user-agent', 'NOT FOUND').not().isEmpty().isLength({min: 4,max: 24})
        //        .matches(/^MY/)  // MY로 시작되는 문자열
        //        .custom((value, {req,location,path}) => { return value.startsWith('MY'); }) // MY로 시작되는 문자열(위의 matches()랑 동일 구현)
        // 파라미터 sanitize 처리 ------------------------------
        //      sanitize* function들은 모두 validation 과 통합되었음 
    ],
    async function (req, res, next) {
        // server-side validation 처리
        const validationErrors = exValidator.validationResult(req);
        if (!validationErrors.isEmpty()) {
            return res.sendStatus(404);
        }
        var roomId = req.body.chatRoomId;
        var userId = req.user._id.toHexString();
        var nickname = req.user.nickname;
        var reciveUserId = req.body.userId;
        var userOnlineCount = req.body.userscnt;

        //상대방이 나를 차단한경우 차단대상자는 몰라야 함으로 글은 저장되고 보낸이는 보여져야 하나 받는 사람은 보이면 안댐
        //blocked:true 로 저장해야함
        var targetUserInfo=await db.getList("blockUser", {"userId":reciveUserId,"targetUserId":userId },0,0,{});
        var blocked=false;
        //나를 차단사용에게는 푸쉬 미발송
        if (targetUserInfo.length<=0){
            if (userOnlineCount < 2) {
                var url = '/chat/chatmsg/'+roomId + '/' + userId + '/' + nickname;
                global.notification.send([reciveUserId], {
                    "kind": "receiveMsg", 
                    "sender": req.user,
                    "body": __('PUSH_MESSAGE_MSG'), 
                    "data": {
                        "url": url
                    }
                });
            }
        }else{
            blocked=true;
        }
        var a = await db.insert('chatMsg', {
            chatRoomId: req.body.chatRoomId,
            userId: req.user._id,
            content: req.body.content,
            deleteYn: "N",
            blocked:blocked
        });

        var u = await db.update('chatRoom', {_id:ObjectId(req.body.chatRoomId)},{$set:{"lastMsg":req.body.content,"registDate" : Date.now()}},{}) 

        if (a) {
            return res.json({
                result: "ok",        //ok , error,
                codemsg:"chat-save",
                displaymsg: "",     
                data: [],
            });
        } else {
            return res.json({
                result: "error",        
                codemsg:"chat-save-error",
                displaymsg: "",     
                data: [],
            });
        }

    }
];
