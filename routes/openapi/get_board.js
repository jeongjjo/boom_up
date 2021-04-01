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

module.exports = [
    '/board/:cate?',
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
        var lineup = await db.getList('lineup', {}, 0, 0, {});


        var start = 0;
        var cpp = 50;
        var where = {
            "block": false,
            "delete": false,
        };
        var sort = {};

        switch (req.params.cate) {
            case 'top8': {
                var now = moment();
                var before24 = moment().add(-1, 'd');

                where.createTS = { $gte: before24.valueOf(), $lte: now.valueOf() };
                sort = { point: -1, createTS: -1 };
                cpp = 8;
                break;
            }
            default: {
                sort = { createTS: -1 };
                break;
            }
        }
        var list = await db.getList('board', where, start, cpp, sort);

        for (i in list) {
            if (lineup && list[i].lineupKey) {
                let res = lineup.filter(v => v.lineupKey === list[i].lineupKey);
                if (res && res[0]) {
                    list[i].lineup = res[0].lineup;
                }
            }

            let cnt = list[i].content.replace(/(<\/?.*?>)/mg, "").trim();
            list[i] = {
                id: list[i]._id,
                nickname: list[i].nickname.substring(0, Math.floor(list[i].nickname.length / 2)) + '****',
                category: list[i].lineup,
                title: list[i].title,
                content: cnt.length > 64 ? cnt.substring(0, 64) : cnt,
                readCount: list[i].readCount,
                votingUp: list[i].votingUp,
                votingDown: list[i].votingDown,
                commentCount: list[i].comment,
                createDate: common.getMoment(list[i].createTS).toISOString()
            };
        }

        res.json(list);
    }
];
