const exValidator = require("express-validator");

var getBoard = require("../../module/data/board");
var getVote = require("../../module/data/vote");

module.exports = [
    '/list/:kind/:page?/:sort?/:limit?/:keyword?/:ejs?',  // URI : /test2 (최종은 /<route module>/<page module> : /sameple/test2)
    null, // 권한 : null은 권한 미체크, [] array 형태로 권한 지정
    [
        exValidator.param('kind', 'REQ').not().isEmpty().trim(),
        exValidator.param("page").toInt(10),
        exValidator.param("limit").toInt(10),
        exValidator.param('sort', 'REQ').not().isEmpty().trim(),
        exValidator.param('keyword', 'REQ').trim()
    ],
    async function (req, res, next) {
        const validationErrors = exValidator.validationResult(req);
        if (!validationErrors.isEmpty()) {
            return res.sendStatus(404);
        }
        if(req.params.kind == "mycontent") {
            var data = await getBoard(req.user, req.params.kind, req.params.page, req.params.sort, req.params.limit, req.params.keyword, req.query.id);
        } else if (req.params.kind == "myupdown") {
            var data = await getVote(req.user, req.params.kind, req.params.page, req.params.sort, req.params.limit, req.params.keyword, req.query.id);
        } else {
            var data = await getBoard(req.user, req.params.kind, req.params.page, req.params.sort, req.params.limit, req.params.keyword, "");
        }
        //req.params.ejs
        res.render(req.params.kind == "myupdown" ? 'profile/list' : 'board/list', data);
    }
];
