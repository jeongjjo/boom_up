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

module.exports = ['/join/:type?', null,
    [
        // exValidator.body('nn', '사용할 수 없는 별명입니다.').not().isEmpty().custom((value, { req }) => {
        //     if (!(/^[ㄱ-ㅎ|가-힣|a-z|A-Z|0-9|_|\u3130-\u3163\u4E00-\u9FFF|\u3040-\u30FC]{2,10}$/.test(value))) {
        //         throw new Error('check nickname!');
        //     }

        //     // var len = value ? Buffer.byteLength(value, 'utf8') : 0;
        //     // if (len < 2 || len > 10) {
        //     //     throw new Error('check length!');
        //     // }

        //     // Indicates the success of this synchronous custom validator
        //     return true;
        // }).trim(),
        exValidator.param('type').trim(),
        exValidator.query('r').trim()
    ],
    function (req, res, next) {
        if (req.isAuthenticated()) {
            return res.redirect('/');
        }

        // if (!(req.headers['user-agent'] || '').endsWith('InkiupApp')) {
        //     return res.redirect(`https://go.inkiup.com/?link=${encodeURIComponent(global.config.serviceinfo.defaultUrl + "/auth/login?nr=y&r=" + encodeURIComponent(req.query.r))}&apn=com.inkiup.app&amv=1&ibi=com.inkiup.app&isi=1501274378&efr=1&st=${encodeURIComponent(global.config.serviceinfo.sitename)}&sd=&si=`);
        // }

        switch (req.params.type) {
            case 'facebook':
            case 'kakao':
            case 'naver':
            case 'google':
            case 'apple':
                {
                    return res.render('account/joinbysns', {
                        title: __('JOIN'),
                        type: req.params.type,
                        redirectUrl: req.query.r
                    });
                }
            default:
                return res.render('account/joinbyemail', {
                    title: __('JOIN'),
                    redirectUrl: req.query.r
                });
        }
    }];
