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

module.exports = [
    '/detail/:id',
    null, // 권한 : null은 권한 미체크, [] array 형태로 권한 지정
    [
        // Validation 처리 ------------------------------------
        exValidator.param('id', 'REQ').not().isEmpty().trim(),
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

        var detail = await db.getById("board", req.params.id);

        if (!detail || detail.delete) {
            return res.sendStatus(404);
        }

        if (detail && detail.block) {
            return res.sendStatus(404);
        }

        var lineup = await db.get('lineup', { lineupKey: detail.lineupKey });

        var commentList = await db.getList('comment', { contentId: detail._id.toHexString(), delete: false, block: false }, 0, 100, { createTS: -1 });

        // TODO : 조회이력

        res.json({
            id: detail._id,
            nickname: detail.nickname.substring(0, Math.floor(detail.nickname.length / 2)) + '****',
            category: lineup ? (lineup.lineup || '') : '',
            title: detail.title,
            content: detail.content.replace(/(<\/?.*?>)/mg, "").trim(),
            image: common.getPhoto(detail.representationImage, 3, 1, ''),
            readCount: detail.readCount,
            votingUp: detail.votingUp,
            votingDown: detail.votingDown,
            commentList: commentList.map((cmt) => {
                return {
                    nickname: cmt.nickname.substring(0, Math.floor(detail.nickname.length / 2)) + '****',
                    comment: cmt.comment,
                    votingUp: cmt.votingUp,
                    votingDown: cmt.votingDown,
                    createDate: common.getMoment(cmt.createTS).toISOString()
                }
            }),
            createDate: common.getMoment(detail.createTS).toISOString()
        });
    }
];
