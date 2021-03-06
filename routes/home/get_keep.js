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

        var userid = req.user ? req.user._id.toHexString() : null;
        var lineup = await db.getList("lineup", {"delete": false},0,0,{sort:1});
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

        res.render('home/keep', {
            title: __('Keep'),
            lineup: lineup || [],
            isMine: userid,
            concernKeywordMy:concernKeywordMy,
            concernKeywordInki:concernKeywordInki
        });
    }
];
