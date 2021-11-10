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
    '/modify', // URI : /test2 (최종은 /<route module>/<page module> : /sameple/test2)
    [], // 권한 : null은 권한 미체크, [] array 형태로 권한 지정
    [
        // Validation 처리 ------------------------------------
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

        var wheredup={$and:[{nickname:req.body.nickname},{_id:{$nin:[req.user._id ]}},{use:true}]}
        var list = await db.getList("user", wheredup);

        if (list.length>0){
            return res.json({
                result: "dup",
                codemsg: "nickname-duplicate",
                displaymsg: "",
                data: [{nickanme:req.user.nickname}],
            });
        }

        var nickname = req.body.nickname;
        var photo = null
        if(req.body.photo){
            photo = JSON.parse(req.body.photo);
        }

        var where = { _id: ObjectId(req.user._id)}

        let data = {}
        if(nickname){
            data= {
                $set: {
                    nickname: nickname
                }
            }
        }
        if(photo){
            data = {
                photo: photo.length == 1 ? photo[0] : photo,
            }
        }

        var result = await db.update("user", where, data, { upsert: true });
        if(result) {
            return res.json({
                result : "ok"
            })
        } else {
            return res.json({
                result : "error"
            })
        }

    }
];
