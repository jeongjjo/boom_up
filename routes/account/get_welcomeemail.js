const exValidator = require("express-validator");
var ObjectId = require('mongodb').ObjectId;
/*
Express Validator 6.2
https://express-validator.github.io/docs/schema-validation.html
https://auth0.com/blog/express-validator-tutorial/
*/

var common = require("../../module/common");
var db = require("../../module/mongodbWrapper");
var dbCache = require("../../module/dbCache");

module.exports = ['/welcomeemail/:fb/:deviceId', null, [
    exValidator.param('fb', 'REQ').notEmpty().trim(), // fbToken
    exValidator.param('deviceId', 'REQ').notEmpty().trim(), // deviceId
], async function (req, res, next) {
    // server-side validation 처리
    const validationErrors = exValidator.validationResult(req);
    if (!validationErrors.isEmpty()) {
        return res.sendStatus(404);
    }

    try {
        const userDevice = await db.get('userDevice', { deviceId: req.params.deviceId });
        if (!userDevice) {
            return res.sendStatus(404);
        }

        if (common.getHash(userDevice.firebaseToken) != req.params.fb) {
            return res.sendStatus(404);
        }
        
        const userInfo = await db.getById('user', ObjectId(userDevice.userId));
        if (!userInfo) {
            return res.sendStatus(404);
        }

        if (userInfo.auth && userInfo.auth.email && userInfo.auth.email.check !== true) {
        } else {
            return res.redirect('/auth/login?r=' + encodeURIComponent(req.query.r || ''));
        }

        return res.render('account/welcomeemail', {
            title: __('CHECK_EMAIL'),
            userInfo: userInfo,
            firebaseToken: req.params.fb,
            deviceId: req.params.deviceId
        });
    } catch (error) {
        console.log(error);
        return res.sendStatus(404);
    }
}];