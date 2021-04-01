var firebase = require('firebase-admin');
const exValidator = require("express-validator");
/*
Express Validator 6.2
https://express-validator.github.io/docs/schema-validation.html
https://auth0.com/blog/express-validator-tutorial/
*/

var common = require("../../../module/common");

var fileuploadEx = require('../../../module/fileuploadExt');

var passport = require('../../../module/auth.js');

var db = require("../../../module/mongodbWrapper");
var dbCache = require("../../../module/dbCache");

module.exports = ['/signin', null, fileuploadEx.local.none(), [
    exValidator.body('d', 'REQ').not().isEmpty().trim(),
    exValidator.body('em', 'REQ').not().isEmpty().trim(),
    exValidator.body('pw', 'REQ').not().isEmpty().trim(),
    exValidator.body('lg', 'REQ').toBoolean(),
], async function (req, res, next) {
    // server-side validation 처리
    const validationErrors = exValidator.validationResult(req);
    if (!validationErrors.isEmpty()) {
        return res.sendStatus(404);
    }

    // 이메일로 직접 인증하는 경우 처리
    const userInfo = await db.get('user', { "auth.email.key": req.body.em });

    if (!userInfo) { //  || !userInfo.PersonKey
        return res.json({
            result: "error",
            codemsg: "auth-notreg"
        });
    }

    if (userInfo.auth.email.password !== req.body.pw) {
        return res.json({
            result: "error",
            codemsg: "auth-invaliduser"
        });
    }

    if (!userInfo.use) {
        return res.json({
            result: "error",
            codemsg: "auth-locked"
        });
    }

    if (userInfo.block) {
        return res.json({
            result: "error",
            codemsg: "auth-blocked"
        });
    }

    try {
        // 사용자를 가지고 인증 토큰을 생성
        // 인증 토큰은 클라이언트에서 인증 시도함
        var fbToken = null;

        try {
            fbToken = await firebase.auth().createCustomToken(userInfo._id.toHexString(), {
                email: userInfo._id.toHexString() + '@' + global.config.serviceinfo.domain
            });
        } catch (err) {
            if (userInfo.ROLE && userInfo.ROLE.length > 4) {
                var myRoles = userInfo.ROLE.split(',');
                if (myRoles.indexOf('MASTERADMIN') > -1 || myRoles.indexOf('ADMIN') > -1) {
                    console.info('[AUTH/ADMIN]', req.body.em);

                    if (err.code === 'auth/user-not-found') {
                        // Firebase에 사용자가 없으면 생성
                        var tmp = await firebase.auth().createUser({
                            provider: global.config.serviceinfo.domain.sid,
                            uid: userInfo._id.toHexString(),
                            email: userInfo._id.toHexString() + '@' + global.config.serviceinfo.domain,
                            displayName: userInfo._id.toHexString()
                        });

                        try {
                            fbToken = await firebase.auth().createCustomToken(userInfo._id.toHexString(), {
                                email: userInfo._id.toHexString() + '@' + global.config.serviceinfo.domain
                            });
                        } catch (err2) {
                        }
                    }
                }
            }
        } // catch

        if (!fbToken) {
            return res.json({
                result: "error",
                codemsg: "auth-fbtoken"
            });
        }

        // 인증정보를 기록
        var deviceInfo = await db.update('userDevice', { deviceId: req.body.d }, {
            $set: {
                firebaseToken: fbToken,
                userId: userInfo._id.toHexString(),
                lastIP: req.ip,
                lastUA: req.headers['user-agent']
            },
            $inc: {
                authCount: 1
            },
            $setOnInsert: {
                deviceId: req.body.d,
                createTS: Date.now()
            }
        }, { upsert: true });

        // 이메일 인증이 안된 경우 인증 페이지로 이동 처리.
        if (userInfo.auth && userInfo.auth.email && userInfo.auth.email.check !== true) {
            return res.json({
                result: "ok",
                codemsg: "auth-email-check",
                data: { fb: common.getHash(deviceInfo.firebaseToken), deviceId: deviceInfo.deviceId }
            });
        }

        if (req.body.lg) {
            req.logIn(userInfo, async function (err) {
                var resultUpdate = await db.updateById('user',
                    userInfo._id, {
                    $inc: { loginCount: 1 }
                });
                console.log('SIGNIN', req.ip, req.headers['user-agent'], fbToken, 'WEBOK');
                // 인증정보를 처리하기 위해서 리턴
                return res.json({
                    result: "ok",
                    codemsg: "auth-signin",
                    data: fbToken
                    //  {
                    //     userId: userInfo._id,
                    //     device: deviceInfo._id,
                    //     token: fbToken
                    // }
                });
            });
        } else {

            // 인증정보를 처리하기 위해서 리턴
            return res.json({
                result: "ok",
                codemsg: "auth-signin",
                data: fbToken
                //  {
                //     userId: userInfo._id,
                //     device: deviceInfo._id,
                //     token: fbToken
                // }
            });
        }
    } catch (e) {
        console.error(e);
        return res.json({
            result: "error",
            codemsg: "auth-error"
        });
    }
}];