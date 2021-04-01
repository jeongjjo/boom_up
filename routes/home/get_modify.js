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
    '/modify/:id/:pathhash?', // URI : /test2 (최종은 /<route module>/<page module> : /sameple/test2)
    [], // 권한 : null은 권한 미체크, [] array 형태로 권한 지정
    [
        // Validation 처리 ------------------------------------
             exValidator.param('id', 'REQ').not().isEmpty().trim(),
             exValidator.param('pathhash', 'REQ').not().isEmpty().trim(),
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
        var userid = req.user ? req.user._id.toHexString() : null;
        var lineup = await db.getList("lineup", {"delete": false},0,0,{sort:1});
        var tempHash=req.params.pathhash||'inkiup-24rank';
        var where = {
            _id: ObjectId(req.params.id)
        }
        var detail = await db.get("board", where);
        var tempcount = await db.count("tempboard", {userId : userid});
        var concernKeywordMy = await db.getList('concernKeywordMy', {"userId":userid}, 0, 0, {text:1});
        
        //인기키워드
        var keywordHash = await db.getList('hotHashtag', {}, 0, 15, {count:-1});
        var keywordHot = await db.getList('hotKeyword', {}, 0, 15, {count:-1});
        var concernKeywordInki = [];
        for(var i=0;i<keywordHash.length;i++){
            concernKeywordInki.push({"type":"hash","text":keywordHash[i].text,"count":keywordHash[i].count});
        }
        for(var i=0;i<keywordHot.length;i++){
            var blnExit=false;
            for( var j=0;j<concernKeywordInki.length;j++){
                if(keywordHot[i].text==concernKeywordInki[j].text){
                    blnExit=true;
                }
            }
            if(!blnExit)
                concernKeywordInki.push({"type":"hot","text":keywordHot[i].text,"count":keywordHot[i].count});
        }
        var sortingField = "count";
        concernKeywordInki.sort(function(a, b) {
            return b[sortingField] - a[sortingField];
        });
        concernKeywordInki = concernKeywordInki.slice(undefined, 8);
        //인기키워드

        res.render('home/write', {
            title: __('APP_NAME'),
            list: [],
            lineup: lineup || [],
            method: "PUT",
            data: detail,
            pathhash:tempHash,
            concernKeywordMy:concernKeywordMy,
            concernKeywordInki:concernKeywordInki,
            tempcount
        });
    }
];
