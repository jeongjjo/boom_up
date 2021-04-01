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

module.exports = ['/signup', null, fileuploadEx.local.none(), [
    exValidator.body('d', 'REQ').not().isEmpty().trim(),
    exValidator.body('em', 'REQ').not().isEmpty().trim(),
    exValidator.body('pw', 'REQ').not().isEmpty().trim(),
    exValidator.body('nn', 'REQ').not().isEmpty().custom((value, { req }) => {
        var len = value ? Buffer.byteLength(value, 'utf8') : 0;
        if (len < 4 || len > 128) {
            throw new Error('check length!');
        }

        // Indicates the success of this synchronous custom validator
        return true;
    }).trim(),
], async function (req, res, next) {
    // server-side validation 처리
    const validationErrors = exValidator.validationResult(req);
    if (!validationErrors.isEmpty()) {
        return res.sendStatus(404);
    }

    // 사용자 정보를 필요에 따라서 저장함
    var $where = {};
    $where[`auth.email.key`] = req.body.em + "";

    // 사용자 정보를 필요에 따라서 저장함
    // 상시 업데이트와 초기에만 업데이트하는 것을 구분해야 함(setOnInsert)
    const userInfo = await db.update('user', $where, {
        $set: {
            "auth": {
                "email": {
                    "key": req.body.em,
                    "password": req.body.pw,
                    "check": false
                }
            },
            "nickname": req.body.nn,// response.data.properties.nickname || '',
            "use": true,
            "firstRun": true, // 가입 후 초기 설정 진행 여부
            "photo": null,
        },
        $setOnInsert: {
            "setting": {
                "shareProfile": true,
                "receiveMsg": true,
                "comment": true,
                "newSubscriber": true,
                "newPostBySubscribeUser": true
            },
            "createTS": Date.now()
        }
    },
        {
            upsert: true // 사용자 없으면 만들기
        });

    if (!userInfo) { //  || !userInfo.PersonKey
        return res.json({
            result: "error",
            codemsg: "auth-signup",
            err: [{ 'nn': '이메일 주소가 이미 사용 중이거나 사용할 수 없습니다.' }]
        });
    }

    try {
        // Firebase에 사용자 정보를 업데이트 함
        try {
            var tmp = await firebase.auth().updateUser(userInfo._id.toHexString(), {
                // provider: global.config.serviceinfo.domain.sid,
                // displayName: userInfo._id.toHexString()
            });
        } catch (err) {
            // Firebase에 사용자가 없으면 생성
            if (err.code === 'auth/user-not-found') {
                var tmp = await firebase.auth().createUser({
                    provider: global.config.serviceinfo.domain.sid,
                    uid: userInfo._id.toHexString(),
                    email: userInfo._id.toHexString() + '@' + global.config.serviceinfo.domain,
                    displayName: userInfo._id.toHexString()
                });
            } else {
                console.error(err);
                return res.json({
                    result: "error",
                    codemsg: "auth-fberror"
                });
            }
        }

        // 사용자를 가지고 인증 토큰을 생성
        // 인증 토큰은 클라이언트에서 인증 시도함
        var fbToken = await firebase.auth().createCustomToken(userInfo._id.toHexString(), {
            email: userInfo._id.toHexString() + '@' + global.config.serviceinfo.domain
        });

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
    } catch (e) {
        return res.json({
            result: "error",
            codemsg: "auth-error"
        });
    }
}];