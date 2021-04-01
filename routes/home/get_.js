var common = require('../../module/common');
var db = require("../../module/dao/DB");
var getBoard = require("../../module/data/board");

module.exports = [null, null, async function (req, res, next) {
    var userid = req.user ? req.user._id.toHexString() : null;
    var lineup = await db.getList("lineup", {"delete": false},0,0,{sort:1});
    var notice = await db.getList("notice", {show: true}, 0, 0, { createTS: -1} );

    var setting = await db.get("syscode", {sysCode: "02", use: true});
    console.log(setting.code);
    var board = await getBoard(req.user, req.query.k || 'inkiup', 0, req.query.f || setting.code, 10, '', null, req.query.s);
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

    var popen=req.query.popen||''; //메인진입시 팝업창 오픈
    res.render('home/main', {
        title: '',
        lineup: lineup || [],
        isMine: userid,
        notice: notice || [],
        board: board,
        concernKeywordMy:concernKeywordMy,
        concernKeywordInki:concernKeywordInki,
        setting: setting.code,
        popen
    });
}];