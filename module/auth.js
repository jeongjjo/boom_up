var common = require('./common');

var passport = require('passport');
var Strategy = require('passport-local').Strategy;

var crypto = require('crypto');
var firebase = require('firebase-admin');

var db = require("./mongodbWrapper");
var dbCache = require("./dbCache");
var ObjectId = require('mongodb').ObjectId;

passport.use(new Strategy({
    usernameField: 'em',
    passwordField: 'epw',
    session: true,
    passReqToCallback: true,
},
    async function (req, userid, password, cb) {
        if (!userid || userid.length < 1 || !password || password.length < 1)
            return cb("ENOARG", null);

        console.info('[AUTH/TRY]', userid, req.ip);

        const userInfo = await db.get('user', { "auth.email.key": userid });
        if (!userInfo) {
            console.info('[AUTH/NOUSER]', userid);
            cb("NOUSER", null);
            return;
        }

        if (!userInfo.use) {
            console.info('[AUTH/UNUSED]', userid);
            cb("UNUSED", null);
            return;
        }

        if (userInfo.block) {
            console.info('[AUTH/LOCKED]', userid);
            cb("LOCKED", null);
            return;
        }

        if (userInfo.auth.email && userInfo.auth.email.password !== password) {
            console.info('[AUTH/INVALIDPW]', userid);
            cb("INCORRECTPASS", null);
            return;
        }

        if (userInfo.ROLE && userInfo.ROLE.length > 4) {
            var myRoles = userInfo.ROLE.split(',');
            if (myRoles.indexOf('MASTERADMIN') > -1 || myRoles.indexOf('ADMIN') > -1) {
                console.info('[AUTH/ADMIN]', userid);

                // TODO : admin 계정 관련 처리 업데이트
            }
        }
        try {
            // 마지막 로그인 날짜 저장
            var resultUpdate = await db.update('user',
                {
                    "auth.email.key": userid
                }, {
                $set: {
                    lastLoginDate: Date.now(),
                    lastLoginIp: req.ip
                }
            });
            console.info('[AUTH/OK]', userid);
            cb(null, resultUpdate);
        } catch (e) {
            cb(e, null);
        }
    }));

passport.serializeUser(function (user, cb) {
    cb(null, user);
});

passport.deserializeUser(async function (user, cb) {
    const userInfo = await dbCache.get('user@' + user._id, () => {
        return db.get('user', { "_id": ObjectId(user._id) });
    });
    cb(null, userInfo || null);
});

passport.isAuthenticated = function (req, res, next) {
    if (req.isAuthenticated())
        return next();

    if (req.xhr) return res.sendStatus(401); // unauthorized

    // 미인증 상태이면 로그인 페이지로 이동
    res.redirect('/auth/login');
};

passport.isAuthenticatedRole = function (checkRole) {
    return function (req, res, next) {
        // 인증 여부 체크
        if (!req.isAuthenticated()) {
            return req.xhr ? res.sendStatus(401) : res.redirect('/auth/login');
        }

        if (!checkRole || checkRole.length === 0)
            return next();

        var myRoles = req.user.ROLE.split(',');

        if (myRoles.indexOf('MASTERADMIN') > -1)
            return next();

        for (var key in checkRole) {
            if (myRoles.indexOf(checkRole[key]) > -1)
                return next();
        }

        return res.redirect('/auth/login?r=' + encodeURIComponent(req.originalUrl || req.url) + '&e=' + encodeURIComponent('ENOPERM'));
    };
};

passport.getAPIAuthenticatedUser = async function (req) {
    if (req.headers['iku-api-context']) {
        const decoededTokenInfo = await firebase.auth().verifyIdToken(req.headers['iku-api-context']);
        if (!decoededTokenInfo) {
            console.warn('APIVARIFY', req.ip, req.headers['user-agent'], req.headers['iku-api-context'], 'FAILEDVERYFY');
            return null;
        }

        const existsUser = await db.getById('user', decoededTokenInfo.uid);

        if (existsUser) {
            return existsUser;
        }
    }
    return null;
};

/** response에 인증 정보 등을 추가 하는 Middleware */
passport.checkResponseLocalInfomations = function (req, res, next) {
    res.locals.redirect2https = global.config.redirect2https || false;
    res.locals.useGoogleAnalytics = global.config.useGoogleAnalytics || false;

    res.locals._isMobile = /(Mobile|Android|iPad|Opera Mini)/.test(req.headers['user-agent'] || '');
    res.locals._isInApp = (req.headers['user-agent'] || '').endsWith('InkiupApp');
    // res.locals.isInkiupApp = /InkiupApp$/.test(req.headers['user-agent'] || '');

    res.locals.url = req.originalUrl;
    res.locals.actionpath = req._parsedUrl.pathname && req._parsedUrl.pathname.endsWith('/') ? req._parsedUrl.pathname.substr(0, req._parsedUrl.pathname.length - 1) : req._parsedUrl.pathname;
    res.locals.now = Date.now();

    res.locals._metaInfo = null;

    var l = req.locale || global.config.locales[0].split("-")[0];
    l = l || 'en';
    res.locals._locale = l.toLowerCase();

    i18n.setLocale(res.locals._locale);
    moment.locale(res.locals._locale);

    if (req.isAuthenticated()) {

        if (req.user.block) {
            req.logout();
            // 세션 삭제
            req.session.destroy(function (err) {
                // 세션 정보에 접근 못 하는 영역
                if (err)
                    console.error(err);
            });
            res.clearCookie(global.config.session.key); // 세션 쿠키 삭제   

            return res.redirect('/auth/login?err=EBLOCKED');
        }

        // 사용자 정보의 reload는 passport.deserializeUser 로 이전!
        res.locals._isAuthed = true;
        // user.ROLE의 MASTERADMIN의 확인은 여기서만 직접 문자열 검색하며, 실제로는 common.existsRole() 또는 common.existsRoleEx() 사용
        res.locals._isAdmin = req.user.ROLE && (req.user.ROLE.indexOf('MASTERADMIN') > -1 || req.user.ROLE.indexOf('ADMIN') > -1); /* res.locals._isAuthed 값에 주의 */
        //common.filterObject(json, '(PersonKey|nickname)')
        //common.filterObject(user, '!(aaa|bbb)')
        res.locals.user = req.user;
    } else {
        res.locals._isAuthed = false;
        res.locals._isAdmin = false; /* res.locals._isAuthed 값에 주의 */
        res.locals.user = false;
    }
    next();
};

module.exports = passport;