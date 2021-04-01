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
var db = require("../../module/dao/DB");
const moment = require("moment");
var ObjectId = require('mongodb').ObjectId;

module.exports = [
    '/cklist', // URI : /test2 (최종은 /<route module>/<page module> : /sameple/test2)
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
        
        var userid = req.user ? req.user._id.toHexString() : null;
        var cklist =  await db.getList("concernKeyword", {},0,0,{text:1});
        var cklistMy =  await db.getList("concernKeywordMy", {"userId":userid},0,0,{"text":1});

        cklist.map(function (obj) {
            for (var i = 0; i < cklistMy.length; i++) {
                
                if(obj.text==cklistMy[i].text){
                    obj.myYn=true;
                }
            }
            //return rObj
        });

        if (cklist != null) {
            res.json({
                msg: "success",
                list: cklist
            })
        } else {
            res.json({
                msg: "error",
                list: []
            })
        }
        
    }
];
