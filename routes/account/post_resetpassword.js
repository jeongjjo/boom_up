const exValidator = require("express-validator");
const ObjectId = require("mongodb").ObjectID;
/*
Express Validator 6.2
https://express-validator.github.io/docs/schema-validation.html
https://auth0.com/blog/express-validator-tutorial/
*/

var common = require("../../module/common");

var db = require("../../module/mongodbWrapper");

var pdf = require("../../module/pdf");
var smtp = require("../../module/smtp");

module.exports = [null, null, [
    exValidator.body('em', '사용할 수 없는 이메일 주소입니다.').not().isEmpty().isLength({
        min: 4,
        max: 128
    }).trim(),
    exValidator.body('authno', 'EARGS').notEmpty(),
    exValidator.body('pw', 'REQ').not().isEmpty().trim(),
], async function (req, res, next) {
    // server-side validation 처리
    const validationErrors = exValidator.validationResult(req);
    if (!validationErrors.isEmpty()) {
        return res.json({
            result: "error",
            codemsg: "email-validation-error"
        });
    }

    try {
        var userInfo = await db.get('user', {"auth.email.key": req.body.em})
        if (!userInfo) {
            return res.json({
                result: "error",
                codemsg: "email-nouser-error"
            });
        }

        const authno = await db.get('logEmail', {
            email: req.body.em,
            type: 'authno',
            createTS: {
                $gte: (Date.now() - (5 * 60 * 1000))
            } // 5분 이내만 유효
        });

        if (!authno || !(authno && authno.data && authno.data.authno && authno.data.authno == req.body.authno)) {
            return res.json({
                result: "error",
                codemsg: "email-authno-error"
            });
        }

        // 인증 번호가 맞으면 비밀번호 변경
        userInfo = await db.updateById('user', userInfo._id, {$set: {"auth.email.password": req.body.pw}});
        if (!userInfo) {
            return res.json({
                result: "error",
                codemsg: "email-pw-update-error"
            });
        }

        return res.json({
            result: "ok",
            codemsg: ""
        });
    } catch (e) {
        console.error(e);
        return res.json({
            result: "error",
            codemsg: "email-authno-error"
        });
    }
}];