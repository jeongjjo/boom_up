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
    "/chatroomlist/:listcount?", // URI : /test2 (최종은 /<route module>/<page module> : /sameple/test2)
    [], // 권한 : null은 권한 미체크, [] array 형태로 권한 지정
    [
        // Validation 처리 ------------------------------------
        exValidator.param("listcount", 'REQ').notEmpty().toInt()
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
         
        var listcount = req.params.listcount|| 0; 
        var userId = req.user._id.toHexString(); 
        var limit = 30; // 페이지당 row 수 
        var sort = {updateTS:-1}; // 기본 검색 옵션 
        var where = {
                        $and : [
                            {deleteInfo:{$nin:[userId]}},
                            {
                                $or:[
                                    {"userId":userId},
                                    {"members":{ $elemMatch:{"userId":userId} }}
                                ]
                            }
                        ]
                    }
        var list = await db.getList("chatRoom", where,listcount,limit,sort); 
        //{ members:{ $elemMatch:{"userId":"5e3a23bfb8dfab6afd687cb6",} }} 
  
        var userWhere=[];
        for (var i=0;i < list.length;i++){
            for (var k=0;k < list[i].members.length;k++){
                //if(list[i].members[k].userId!=userId){
                    userWhere.push({_id:ObjectId(list[i].members[k].userId)});
                //}
            }
        }

        if(userWhere.length==0)
            userWhere.push({_id:ObjectId(userId)} );

        var users = await db.getList("user", {$or:userWhere},0,0,{});
        var blockusers = await db.getList("blockUser", {userId:userId},0,0,{});

        list.map(function (obj) {
            
            for(var i=0;i<obj.members.length;i++){
                for(var k=0;k<users.length;k++){
                    if(obj.members[i].userId==users[k]._id.toHexString()){
                        obj.members[i].nickname=users[k].nickname;
                        obj.members[i].photo=users[k].photo;
                    }
                    for(var y=0;y<blockusers.length;y++){
                        if(obj.members[i].userId==blockusers[y].targetUserId){
                            obj.blocked=true;
                        }
                    }
                }
            }
        });

        if (users) {
            res.render('chat/chatRoomList', {
                title: __('MSG_TITLE') ,
                result: list==null?"error":"ok",        //ok , error,
                codemsg:"roomlist-attach list",
                displaymsg: "",     
                data: list || [],
            });
        }else{
            res.render('chat/chatRoomList', {
                title: __('MSG_TITLE') ,
                result: "error",        
                codemsg:"roomlist-error-no member user",
                displaymsg: "",     
                data: list || [],
            });
        }
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
