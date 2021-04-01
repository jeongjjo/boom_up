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
var db = require("../../module/dao/DB");
// var ObjectId = require('mongodb').ObjectId;

module.exports = [
    null, // URI : /test2 (최종은 /<route module>/<page module> : /sameple/test2)
    [], // 권한 : null은 권한 미체크, [] array 형태로 권한 지정
    [
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
        // const validationErrors = exValidator.validationResult(req);
        // if (!validationErrors.isEmpty()) {
        //     return res.sendStatus(404);
        // }
        

        const validationErrors = exValidator.validationResult(req);
         if (!validationErrors.isEmpty()) {
             return res.sendStatus(404);
         }
         
        var userId = req.user._id.toHexString();
        var limit = 0; // 페이지당 row 수
        var skip=0;
        var sort = { reqRegDate: -1 }; // 기본 검색 옵션
        var where = { userId:  userId };
        var list = await db.getList("inquire", where,skip,limit,sort);

        for (var i=0;i<list.length;i++){
            if(list[i].confirm&&list[i].confirm=="S"){
                var update = await db.update("inquire", {_id:list[i]._id},{$set:{checkDate:Date.now()}});
            }
            
        }
         
        res.render('setting/reqList', {
            title: __("MENU_ALERT"),
            codemsg:"req-first list",
            displaymsg: "",     
            data: list || [],
        });
    }
];
