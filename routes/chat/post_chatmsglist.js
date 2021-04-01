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


module.exports = [
    "/chatmsglist/:blocked?", // URI : /test2 (최종은 /<route module>/<page module> : /sameple/test2)
    [], // 권한 : null은 권한 미체크, [] array 형태로 권한 지정
    [
        // Validation 처리 ------------------------------------
        exValidator.param("blocked","REQ").notEmpty().toBoolean(),
        exValidator.body("listcount","REQ").notEmpty().toInt()
        //      exValidator.param('type', 'REQ').not().isEmpty().trim(),
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
        const validationErrors = exValidator.validationResult(req);
        if (!validationErrors.isEmpty()) {
            return res.sendStatus(404);
        }
        var blocked=req.params.blocked;
        var listcount = req.body.listcount||0;
        var userId = req.user._id.toHexString();
        var limit = 100; // 페이지당 row 수 
        var sort = {"createTS" :-1}; // 기본 검색 옵션 
        var where = { "chatRoomId" : req.body.roomid }; 
        if(blocked){
            where.blocked=!blocked;
        }
        var list = await db.getList("chatMsg", where,listcount,limit,sort);

        var userWhere=[];
        userWhere.push({_id:req.user._id});
        userWhere.push({_id:ObjectId(req.body.targetuserid)});
         
        var users = await db.getList("user", {$or:userWhere},0,0,{});

        list.map(function (obj) {
            for(var k=0;k<users.length;k++){
                if(obj.userId==users[k]._id.toHexString()){
                    obj.nickname=users[k].nickname;
                    obj.photo= users[k].photo;
                }
            }
        });
        
        res.render('chat/chatMsgList', {
            result: list==null?"error":"ok",        //ok , error,
            codemsg:"alertlist-attach list",
            displaymsg: "",     
            data: list || [],
            my: req.user._id.toHexString()
        });
        /*
        return res.json({
            result: list==null?"error":"ok",        //ok , error,
            codemsg:"alertlist-attach list",
            displaymsg: "",     
            data: list || [],
        });
        */
        
    }
];
