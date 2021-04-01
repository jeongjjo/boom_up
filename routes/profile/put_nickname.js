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
    '/nickname', // URI : /test2 (최종은 /<route module>/<page module> : /sameple/test2)
    [], // 권한 : null은 권한 미체크, [] array 형태로 권한 지정
    [
        exValidator.body('nickname', '사용할 수 없는 별명입니다.').not().isEmpty().custom((value, { req }) => {
            if (!(/^[ㄱ-ㅎ|가-힣|a-z|A-Z|0-9|_|\u3130-\u3163\u4E00-\u9FFF|\u3040-\u30FC]{2,10}$/.test(value))) {
                throw new Error('check nickname!');
            }

            // var len = value.length;// ? Buffer.byteLength(value, 'utf8') : 0;
            // if (len < 2 || len > 10) {
            //     throw new Error('check length!');
            // }

            // Indicates the success of this synchronous custom validator
            return true;
        }).trim(),
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

        var wheredup={$and:[{nickname:req.body.nickname},{_id:{$nin:[req.user._id ]}},{use:true}   ]}
        var list = await db.getList("user", wheredup);

        if (list.length>0){
            return res.json({
                result: "dup",
                codemsg: "nickname-duplicate",
                displaymsg: "",
                data: [{nickanme:req.user.nickname}],
            });
        }

        var a = await db.update("user",
            { _id: req.user._id },
            {
                $set: {
                    nickname: req.body.nickname
                }
            });

        if (a) {

            return res.json({
                result: "ok",
                codemsg: "nickname-update",
                displaymsg: "",
                data: [],
            });
        } else {
            return res.json({
                result: "error",
                codemsg: "nickname-update",
                displaymsg: "",
                data: [],
            });
        }

    }
];
