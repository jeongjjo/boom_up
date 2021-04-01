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
var db = require("../../module/mongodbWrapper");
var dbCache = require("../../module/dbCache");
var ObjectId = require('mongodb').ObjectId;

module.exports = [
    '/keeplist/:page', // URI : /test2 (최종은 /<route module>/<page module> : /sameple/test2)
    null, // 권한 : null은 권한 미체크, [] array 형태로 권한 지정
    [
        // Validation 처리 ------------------------------------
        exValidator.param('page', 'REQ').not().isEmpty().trim()
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

        var user = req.user ? req.user._id : null;//"5e3901a8f20b944a11dc9dd3";
        var userId = req.user ? req.user._id.toHexString() : null;//DB 컬럼타입 변경작업 참조컬럼으로 ObjecId로 넣은거 String으로 변경
        var page = Math.max(1, req.params.page || 1) - 1; // 시작 pos 계산
        var countperpage = 30; // 페이지당 row 수
        var sort = { createTS: 1 }; // 기본 검색 옵션
        var where = {
            userId: userId
        }
        var keeplist = await db.getList("keep", where, page, countperpage, sort);
        
        var contentid = [];
        if (keeplist && keeplist.length > 0) {
            for(var i =0; i < keeplist.length; i++) {
                contentid.push(ObjectId(keeplist[i].contentId));
            }
        }

        var w = { _id : { $in : contentid} }
        var contentList = await db.getList("board", w);
        var vw = { targetId : { $in : contentid}, userId: userId }
        var myvote = await db.getList("vote", vw);

        var memo = [];
        var userlist = [];
        if (contentList && contentList.length > 0) {
            for(var i =0; i < contentList.length; i++) {
                memo.push(contentList[i].userId);
                userlist.push(ObjectId(contentList[i].userId));
            }
        }

        var mw = { userId: userId, targetUserId : { $in : memo}}
        var mymemo = await db.getList("userMemo", mw);

        var uw = { _id: { $in: userlist } }
        var myuser = await db.getList("user", uw);

        var bw = { userId: userId, targetUserId: { $in: memo } }
        var blocked = await db.getList("blockUser", bw);
        
        return res.json({
            result: "ok",
            data: contentList || [],
            myvote: myvote || [],
            mymemo: mymemo || [],
            myuser: myuser || [],
            blocked: blocked || []
        })
    }
];
// 커뮤니티 조회 - 투표 조회 - 
