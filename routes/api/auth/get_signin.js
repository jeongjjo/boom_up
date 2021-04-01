var firebase = require('firebase-admin');
const exValidator = require("express-validator");
/*
Express Validator 6.2
https://express-validator.github.io/docs/schema-validation.html
https://auth0.com/blog/express-validator-tutorial/
*/

var common = require("../../../module/common");

var passport = require('../../../module/auth.js');

var db = require("../../../module/mongodbWrapper");
var dbCache = require("../../../module/dbCache");

module.exports = ['/signin', null, [
    exValidator.query('d', 'REQ').notEmpty().trim(), // deviceId
    exValidator.query('t').trim(), // firebase token
    exValidator.query('pt').trim(), // firebase push token
    exValidator.query('r').trim() // redirect url
], async function (req, res, next) {
    // server-side validation 처리
    const validationErrors = exValidator.validationResult(req);
    if (!validationErrors.isEmpty()) {
        return res.sendStatus(404);
    }

    // deviceId와 push token은 항상 처리한다.
    // 본 API는 app에서만 호출하므로 push token은 로그인 상태와 상관없이 먼저 항상 저장한다.
    var deviceInfo = await db.update('userDevice', { deviceId: req.query.d }, {
        $set: {
            pushToken: req.query.pt || '',
            firebaseToken: req.query.t || '',
            lastIP: req.ip,
            lastUA: req.headers['user-agent']
        },
        $setOnInsert: {
            deviceId: req.query.d,
            userId: null, // 보안을 위해서 항상 upsert 때는 null로 유지시킨다.
            createTS: Date.now()
        }
    }, { upsert: true });

    // firebase token이 없으면 인증 처리 안 함
    if (!req.query.t) {
        console.log('SIGNIN', req.ip, req.headers['user-agent']);
        return res.redirect(req.query.r || '/');
    }

    try {
        const decoededTokenInfo = await firebase.auth().verifyIdToken(req.query.t);

        if (!decoededTokenInfo) {
            console.warn('SIGNIN', req.ip, req.headers['user-agent'], req.query.t, 'NOTVALIDTOKEN');
            return res.redirect(req.query.r || '/');
        }

        // deviceId의 userId와 firebase의 uid(userId)가 다르면 해킹 아이디 의심해야 함
        if (decoededTokenInfo.uid !== deviceInfo.userId) {
            console.error('SECURITYWARN', req.ip, req.query.d, req.query.t, req.query.pt, deviceInfo.userId, decoededTokenInfo.uid);
            await db.insert('securityWarn', { deviceId: req.query.d, token: req.query.t, pushToken: req.query.pt, userIdinDevice: deviceInfo.userId, userIdinTokean: decoededTokenInfo.uid });
        }

        const userInfo = await db.getById('user', decoededTokenInfo.uid);

        if (!userInfo) { //  || !userInfo.PersonKey
            // TODO: errpage를 만들어서 redirect 해야함
            console.error('SIGNIN', req.ip, req.headers['user-agent'], req.query.t, decoededTokenInfo.uid, 'NOTFOUNDUSER');
            return res.redirect('/?err=autherruser');
        }

        if (!userInfo.use) {
            console.error('SIGNIN/NOTUSE', req.ip, req.headers['user-agent'], req.query.t, decoededTokenInfo.uid, 'NOTUSE');
            return res.redirect('/auth/login?err=ENOUSER');
        }

        if (userInfo.block) {
            console.error('SIGNIN/BLOCKED', req.ip, req.headers['user-agent'], req.query.t, decoededTokenInfo.uid, 'BLOCKED');
            return res.redirect('/auth/login?err=EBLOCKED');
        }

        // 이메일 인증이 안된 경우 인증 페이지로 이동 처리.
        if (userInfo.auth && userInfo.auth.email && userInfo.auth.email.check !== true) {
            return res.redirect('/auth/welcomeemail/' + common.getHash(deviceInfo.firebaseToken) + '/' + deviceInfo.deviceId + '?r=' + encodeURIComponent(req.query.r || ''));
        }

        req.logIn(userInfo, async function (err) {
            var resultUpdate = await db.updateById('user',
                decoededTokenInfo.uid, {
                $inc: {loginCount: 1}
            });
            console.log('SIGNIN', req.ip, req.headers['user-agent'], req.query.t, decoededTokenInfo.uid, 'OK');
            return res.redirect(req.query.r || '/');
        });
    } catch (err) {
        // Firebase에 사용자가 없으면 생성
        if (err.code === 'auth/id-token-revoked') {
            // TODO: errpage를 만들어서 redirect 해야함
            console.error('SIGNIN', req.ip, req.headers['user-agent'], req.query.t, 'TOKENREVOKED');
            return res.redirect('/?err=authrevoked');
        }
        console.error(err);
        console.error('SIGNIN', req.ip, req.headers['user-agent'], req.query.t, 'UNKNOWN');
        return res.redirect('/?err=authunknown');
    }
}];