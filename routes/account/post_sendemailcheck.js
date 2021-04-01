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
    exValidator.body('fb', 'REQ').not().isEmpty().trim(), // firebasetoken
    exValidator.body('deviceId', 'REQ').not().isEmpty().trim(),
    exValidator.body('em', '사용할 수 없는 이메일 주소입니다.').not().isEmpty().trim()
], async function (req, res, next) {
    // server-side validation 처리
    const validationErrors = exValidator.validationResult(req);
    if (!validationErrors.isEmpty()) {
        return res.json({
            result: "error",
            codemsg: "email-validation-error"
        });
    }

    const userDevice = await db.get('userDevice', { deviceId: req.body.deviceId });
    if (!userDevice) {
        return res.json({
            result: "error",
            codemsg: "email-user-device-error"
        });
    }

    if (common.getHash(userDevice.firebaseToken) != req.body.fb) {
        return res.json({
            result: "error",
            codemsg: "email-user-device-error"
        });
    }

    const userInfo = await db.updateById('user', ObjectId(userDevice.userId), {$set: {"auth.email.key": req.body.em}});// db.getById('user', ObjectId(userDevice.userId));
    if (!userInfo) {
        return res.json({
            result: "error",
            codemsg: "email-update-error"
        });
    }

    try {
        // 이메일 인증 이메일 전송
        var pdfResult = await pdf.getRenderTemplate('email', 'sendEmailAuth', { locale: req.locale, fbToken: req.body.fb, deviceId: userDevice.deviceId, userInfo: userInfo });
        if (pdfResult.err) {
            console.error('[JOIN/SENDAUTH/FAIL]', userInfo.auth.email.key, userInfo, pdfResult.err);
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
                console.log('[JOIN/SENDAUTH]', userInfo.auth.email.key, result.err);
                return res.json({
                    result: "error",
                    codemsg: "email-send-error"
                });
            }

            const emailLog = await db.insert('logEmail', {
                sendIP: req.ip,
                sendUA: req.headers['user-agent'] || '?',
                email: userInfo.auth.email.key,
                type: 'check',
                data: {}
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
            codemsg: "email-check-error"
        });
    }
}];