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

var common = require('../../module/common');

var ObjectId = require('mongodb').ObjectId;
var rank = require("../../module/rankingPost");
const { verifiedaccess_v1 } = require("googleapis");

function fn_dateTimeToFormatted(dt) {
    var min = 60 * 1000;
    var c = new Date()
    var d = new Date(dt);
    var minsAgo = Math.floor((c - d) / (min));

    var result = {
        'raw': d.getFullYear() + '-' + (d.getMonth() + 1 > 9 ? '' : '0') + (d.getMonth() + 1) + '-' + (d.getDate() > 9 ? '' : '0') + d.getDate() + ' ' + (d.getHours() > 9 ? '' : '0') + d.getHours() + ':' + (d.getMinutes() > 9 ? '' : '0') + d.getMinutes() + ':' + (d.getSeconds() > 9 ? '' : '0') + d.getSeconds(),
        'formatted': '',
    };

    if (minsAgo < 60) { // 1시간 내
        result.formatted = minsAgo + '분 전';
    } else if (minsAgo < 60 * 24) { // 하루 내
        result.formatted = Math.floor(minsAgo / 60) + '시간 전';
    } else { // 하루 이상
        result.formatted = Math.floor(minsAgo / 60 / 24) + '일 전';
    };

    return result;
};

module.exports = [
    '/detail/:pathhash/:id/:backchangeuse?', // URI : /test2 (최종은 /<route module>/<page module> : /sameple/test2)
    null, // 권한 : null은 권한 미체크, [] array 형태로 권한 지정
    [
        // Validation 처리 ------------------------------------
        exValidator.param('id', 'REQ').not().isEmpty().trim(),
        exValidator.param('pathhash', 'REQ').trim(),
        exValidator.param('backchangeuse', 'REQ').toBoolean()
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
        var tt = req.params.backchangeuse;
        var user = req.user ? req.user._id : null;//"5e3901a8f20b944a11dc9dd3";
        var userId = req.user ? req.user._id.toHexString() : null;//DB 컬럼타입 변경작업 참조컬럼으로 ObjecId로 넣은거 String으로 변경
        var where = { _id: ObjectId(req.params.id) };
        var detail = await db.get("board", where);

        if (!detail || detail.delete) {
            return res.render('alert', {
                title: __('상세페이지'),
                pathhash: req.params.pathhash,
                err: __('DELETE_POST')
            });
        }

        if (detail && detail.block) {
            return res.render('alert', {
                title: __('상세페이지'),
                pathhash: req.params.pathhash,
                err: __('BLOCK_POST')
            });
        }

        //조회이력
        if (req.user) {
            var readWhere = { "contentId": req.params.id, "userId": userId, "lineupKey": detail.lineupKey }
            var readContent = await db.getList("boardRead", readWhere);

            if (readContent.length <= 0) {
                var insert = await db.update("boardRead", readWhere, { $set: readWhere }, { upsert: true });
                var updateBoard = await db.update("board", where, { $inc: { readCount: 1, readUserCnt: 1 } }, { upsert: true });
                rank.calPoint(req.params.id);
            }
        } else {
            var readWhere = { "contentId": req.params.id, "userId": null, "lineupKey": detail.lineupKey }
            var insert = await db.update("boardRead", readWhere, { $set: readWhere }, { upsert: true });
            var updateBoard = await db.update("board", where, { $inc: { readCount: 1, readNoneCnt: 1 } }, { upsert: true });
        }

        var vwhere = { targetId: req.params.id, userId: userId };
        var myvote = await db.getList("vote", vwhere);
        var ww = { targetId: req.params.id, userId: userId }
        var mykeep = await db.getList("keep", ww);

        var memowhere = {
            userId: userId,
            targetUserId: detail.userId
        }
        var usermemo = await db.getList("userMemo", memowhere);
        var userinfo = await db.get("user", { _id: ObjectId(detail.userId) });
        var time = fn_dateTimeToFormatted(detail.createTS);
        detail.createTS2 = detail.createTS; //글경과후 시간체크 위해서
        detail.createTS = time;


        var myYN = "N";
        if (user != null) {
            if (detail.userId.toString() == user.toString()) myYN = "Y";
        }

        var countw = { contentId: ObjectId(req.params.id) }
        var countl = await db.getList("comment", countw);

        var moreyn = "N";
        if (countl.length > 10) {
            moreyn = "Y";
        }

        var lineup = await db.get("lineup", { lineupKey: detail.lineupKey });
        detail.lineup = lineup;
        if (typeof detail.pushmsg === 'boolean') {

        } else {
            detail.pushmsg = true;
        }

        var metaInfo = {
            title: detail.title,
            author: detail.nickname,
            content: detail.content.replace(/(<\/?[^>]+(>|$)|\n)/mg, "").substring(0, 128),
            imageurl: detail.representationImage && detail.representationImage.length > 3 ? detail.representationImage[3] : '',
            lastUpdatedDate: common.getMoment(detail.createTS).toISOString()
        };

        detail.content = detail.content.replace(/(?:#)([ㄱ-ㅎ|가-힣|a-z|A-Z|0-9|_]+)/gm, "<a href='/search/index/s/" + moment().valueOf() + "?target=$1'>#$1</a>");

        detail.image = detail.image || [];
        for (const imgUrl of detail.image) {
            var match = detail.content.match(new RegExp("<img(?:[^<>]*)?src=\"" + common.escapeRegExp(imgUrl[0]) + "\"(?:[^<>]*)?>", "img"));
            if (match && match.length > 0)
                detail.content = detail.content.replace(match[0], `<a data-fancybox="gallery" href="${imgUrl[0]}" class="_contentImageView"><img src="${imgUrl[0]}"/></a>`);
        }

        var contentuser = await db.getList("user", { role: 'inkiupcontent', use: true }, 0, 0, {});

        //req.user ? req.user._id
        var arrcklist = [];
        var arrReadPostList= userId==null?[]:await db.getList("boardRead", { "userId": userId }, 0, 10, {_id:-1});
        // 사용자가 읽은글 젙체 목록을 가지고 오지 않으면 인끼글의 경우 시간이 지나면 다시 표출됨 (장기간 인끼글 3순위 안에 진입된 경우)
        // 나의 관심키워드와 관련된 글이 올라옴으로 boardRead에 기록된 내용은 최신에 읽은 글이고 내가 관심키워드와 관련 글은 아주 예전글이므로 읽은글 전체를 가져오지 않으면 무조건 나온다 
        var arrReadPostId=[];
        arrReadPostId=arrReadPostList.map((a)=>{
            console.log(a.contentId)
            return ObjectId(a.contentId);
        })
        arrReadPostId.push(detail._id);
        var userCK = await db.getList("concernKeywordMy", { userId: userId }, 0, 0, {})

        if (req.user) {
            for (var i = 0; i < userCK.length; i++) {
                arrcklist.push(userCK[i].text);
            }
        } else {
            arrcklist = detail.concernKeyword;
        }

        var hotissueListDefault = arrcklist && arrcklist.length > 0 ? await db.getList("board", { concernKeyword: { $in: arrcklist }, _id:{$nin:arrReadPostId} }, 0, 3, { point: -1 }) : [];
        var hotissueList = await db.getList("board", {}, 0, 3, { _id: -1 });

       if(hotissueListDefault.length < 3){
           var listCount=hotissueListDefault.length;
            for (var i = 0; i < 3-listCount; i++) {
                hotissueListDefault.push(hotissueList[i]);
            }
       }

        res.render('home/detail', {
            title: __('상세페이지'),
            _metaInfo: metaInfo,
            detail: detail || [],
            myvote: myvote.length == 0 ? null : myvote,
            mykeep: mykeep.length == 0 ? null : mykeep,
            usermemo: usermemo.length == 0 ? "" : usermemo[0].memo,
            myyn: myYN,
            isMine: userId,
            moreyn: moreyn,
            userinfo: userinfo,
            hotissuelist: hotissueListDefault,
            pathhash: req.params.pathhash,
            backchangeuse: req.params.backchangeuse,
            cyn: req.query.cyn ? "Y" : "N",
            contentuser: contentuser
        });

    }
];
