const exValidator = require('express-validator');
/*
Express Validator 6.2
https://express-validator.github.io/docs/schema-validation.html
https://auth0.com/blog/express-validator-tutorial/
*/

var common = require("../../module/common");

var passport = require('../../module/auth.js');

var db = require("../../module/mongodbWrapper");
var dbCache = require("../../module/dbCache");

module.exports = ['/logout/:deviceId?', null,
    [
        exValidator.param('deviceId').trim(),
    ],
    async function (req, res, next) {
        if (req.isAuthenticated() && req.params.deviceId) {
            var ret = await db.deleteMany('userDevice', { deviceId: req.params.deviceId });
        }

        // 로갓!
        req.logout();
        // 세션 삭제
        req.session.destroy(function (err) {
            // 세션 정보에 접근 못 하는 영역
            if (err)
                console.error(err);
        });
        res.clearCookie(global.config.session.key); // 세션 쿠키 삭제   
        res.redirect(req.query.r || '/');
    }];