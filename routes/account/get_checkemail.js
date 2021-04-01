var ObjectId = require('mongodb').ObjectId;
const exValidator = require("express-validator");
/*
Express Validator 6.2
https://express-validator.github.io/docs/schema-validation.html
https://auth0.com/blog/express-validator-tutorial/
*/

var common = require("../../module/common");

var passport = require('../../module/auth.js');

var db = require("../../module/mongodbWrapper");
var dbCache = require("../../module/dbCache");

module.exports = ['/checkemail/:fbToken/:deviceId', null, [
    exValidator.param('fbToken', 'REQ').notEmpty().trim(), // fbToken
    exValidator.param('deviceId', 'REQ').notEmpty().trim() // deviceId
], async function (req, res, next) {
    // server-side validation 처리
    const validationErrors = exValidator.validationResult(req);
    if (!validationErrors.isEmpty()) {
        return res.sendStatus(404);
    }

    const userDevice = await db.get('userDevice', {deviceId: req.params.deviceId});
    if (!userDevice) {
        return res.sendStatus(404);
    }

    if (common.getHash(userDevice.firebaseToken) != req.params.fbToken) {
        return res.sendStatus(404);
    }

    var userInfo = await db.getById('user', ObjectId(userDevice.userId));
    if (!userInfo) {
        return res.sendStatus(404);
    }
    if (userInfo.auth && userInfo.auth.email && userInfo.auth.email.check !== true) {
    } else {
        return res.redirect('/auth/login');
    }
    userInfo = await db.updateById('user', ObjectId(userDevice.userId), {$set: {"auth.email.check": true}});

    return res.render('account/checkemail', {
        title: __('CHECK_EMAIL'),
        userInfo: userInfo
    });
}];