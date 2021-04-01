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
var ObjectId = require('mongodb').ObjectId;
module.exports = [
    null, // URI : /test2 (최종은 /<route module>/<page module> : /sameple/test2)
    [], // 권한 : null은 권한 미체크, [] array 형태로 권한 지정
    [
        // Validation 처리 ------------------------------------
        //exValidator.body("id", "REQ").notEmpty().trim(),
        //exValidator.body("memo", "REQ").notEmpty().trim()
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

        var userid = req.user ? req.user._id.toHexString() : null;
        var keyword=req.body.keyword;
        var dup=await db.getList("concernKeyword",{"text" : keyword })

        if(dup.length<=0){
            var insert=await db.update(
                                'concernKeyword',
                                {"text" : keyword},
                                {$set:{"text" : keyword}},
                                {"upsert" : true}
                            )
        }

        if (dup.length>0) {
            return res.json({
                result: "exist",
                codemsg: "ck-update",
                displaymsg: "",
                data: [],
            });
        }else{
            if (insert) {
                return res.json({
                    result: "ok",
                    codemsg: "ck-update",
                    displaymsg: "",
                    data: [{id:insert._id,text:insert.text}],
                });
            } else {
                return res.json({
                    result: "error",
                    codemsg: "ck-update",
                    displaymsg: "",
                    data: [],
                });
            }
        }
    }
];
