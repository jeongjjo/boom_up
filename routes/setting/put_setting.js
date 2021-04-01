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
    null, // URI : /test2 (최종은 /<route module>/<page module> : /sameple/test2)
    [], // 권한 : null은 권한 미체크, [] array 형태로 권한 지정
    [
        exValidator.body("val").toBoolean() 
        // Validation 처리 ------------------------------------
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
        
        var set ;
        if(req.body.prop == 'shareProfile') set = {"setting.shareProfile" :  req.body.val }
        else if(req.body.prop == 'receiveMsg') set = {"setting.receiveMsg" :  req.body.val }
        else if(req.body.prop == 'comment') set = {"setting.comment" :  req.body.val }
        else if(req.body.prop == 'newSubscriber') set = {"setting.newSubscriber" :  req.body.val }
        else if(req.body.prop == 'newPostBySubscribeUser') set = {"setting.newPostBySubscribeUser" :  req.body.val }
 
        var z = await db.update('user', 
        {_id : req.user._id},
        {
        $set : set
        })
        
        
        if (z) {
            

            return res.json({
                result: "ok",        
                codemsg:"memo-update",
                displaymsg: "",     
                data: [],
            });
        } else {
            return res.json({
                result: "error",
                codemsg:"alert-update",
                displaymsg: "",     
                data:[],
            });
        }
        
    }
];
