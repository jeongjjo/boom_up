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
    }).trim()
], async function (req, res, next) {
    // server-side validation 처리
    const validationErrors = exValidator.validationResult(req);
    if (!validationErrors.isEmpty()) {
        return res.json({
            result: "error",
            codemsg: "email-validation-error"
        });
    }

    const userInfo = await db.get('user', {"auth.email.key": req.body.em})
    if (!userInfo) {
        return res.json({
            result: "error",
            codemsg: "email-nouser-error"
        });
    }

    try {
        var authno = common.getRandomDigit(6)
        // 이메일 인증 이메일 전송
        var pdfResult = await pdf.getRenderTemplate('email', 'sendEmailAuthNo', { locale: req.locale, userInfo: userInfo, authno: authno });
        if (pdfResult.err) {
            console.error('[JOIN/SENDAUTHNO/FAIL]', userInfo.auth.email.key, userInfo, pdfResult.err);
            return res.json({
                result: "error",
                codemsg: "email-pdf-error"
            });
        } else {
            var emailtplinfo = /<!--SUBJECT:(.+)-->/.exec(pdfResult.template);
            var result = await smtp.sendEMail({
                to: userInfo.auth.email.key,
                subject: emailtplinfo && emailtplinfo.length === 2 ? emailtplinfo[1] : '',
                html: pdfResult.template
            });
            if (result.err) {
                console.log('[JOIN/SENDAUTHNO]', userInfo.auth.email.key, result.err);
                return res.json({
                    result: "error",
                    codemsg: "email-send-error"
                });
            }

            const emailLog = await db.insert('logEmail', {
                sendIP: req.ip,
                sendUA: req.headers['user-agent'] || '?',
                email: userInfo.auth.email.key,
                type: 'authno',
                data: {
                    authno: authno
                }
            });
        }

        return res.json({
            result: "ok",
            codemsg: "email"
        });
    } catch (e) {
        console.error(e);
        return res.json({
            result: "error",
            codemsg: "email-authno-error"
        });
    }
}];