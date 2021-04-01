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
const moment = require("moment");
var ObjectId = require('mongodb').ObjectId;

module.exports = [
    '/userrank', // URI : /test2 (최종은 /<route module>/<page module> : /sameple/test2)
    null, // 권한 : null은 권한 미체크, [] array 형태로 권한 지정
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

        var sdate=req.query.startdate;
        var edate=req.query.enddate;
        var limit=8;
        var sort=req.query.limit;
        var ck=req.query.ck;
        //선택한 관심키워드 조건 걸어야 함. 글등록시 키워드 저장 기능이 아직 안됨
        //회원 파워,레벨필드 추가 확인 해야함
        pipes = [
            {$match:{ createTS:{"$gte":moment().add(-60,'d').valueOf(),"$lte":moment().add(1,'d').valueOf()},concernKeyword:{$in:[ck]}  }},
            {
                $group: {
                    _id:{$toObjectId:"$userId"},
                    votingTotal: { $sum: {$add:["$votingUp","$votingDown"]} },
            }  
            },
            {
                $lookup:{
                  from: "user",
                  localField: "_id",
                  foreignField: "_id",
                  as: "_user"
                }
            },
            {"$unwind": "$_user" },
            {
                $project:{
                    userId:{$toString:"$_user._id"},
                    votingTotal:"$votingTotal",
                    nickname:"$_user.nickname",
                    level:"$_user.level",
                    power:"$_user.power"
                }
            },
            { $sort:{"votingTotal":-1} },
            { $limit: 8 }
        ];
        list = await db.aggregate("board",pipes);
        
        if (list != null) {
            res.json({
                msg: "success",
                list: list
            })
        } else {
            res.json({
                msg: "error",
                list: []
            })
        }
        
    }
];
