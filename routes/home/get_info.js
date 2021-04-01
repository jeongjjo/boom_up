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
var dbCache = require("../../module/dbCache");
var ObjectId = require('mongodb').ObjectId;

module.exports = [
    '/info/:id?',  // URI : /test2 (최종은 /<route module>/<page module> : /sameple/test2)
    null, // 권한 : null은 권한 미체크, [] array 형태로 권한 지정
    [
        //exValidator.param('listcount', 'REQ').not().isEmpty().trim(),
        exValidator.param('id', 'REQ').notEmpty().trim()
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

        // dbCache에서 "cache id"로 데이터를 가져온다. 해당 "cache id"가 없을 경우, 다음 펑션 내에서 db 관련 처리를 하면 된다.
        // 참고) dataFetchFunction 인자의 경우, 단순 처리 일 때는 async 펑션이 아니여도 된다.

        // server-side validation 처리
        const validationErrors = exValidator.validationResult(req);
        if (!validationErrors.isEmpty()) {
            return res.sendStatus(404);
        }
         
        var subwhere = { userId:req.user._id.toHexString(), targetUserId: req.params.id}; 
        var sub = await db.get("subscription", subwhere);

        var blockwhere = { userId:req.user._id.toHexString(), targetUserId: req.params.id}; 
        var block = await db.get("blockUser", blockwhere);
        
        return res.json({
            msg: "success",
            info: sub || null,
            block: block || null
        });
    }
];
