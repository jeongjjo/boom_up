const exValidator = require('express-validator');
/*
Express Validator 6.2
https://express-validator.github.io/docs/schema-validation.html
https://auth0.com/blog/express-validator-tutorial/
*/

var common = require("../../module/common");

module.exports = [null, null, [
    exValidator.query('r').trim(),
    exValidator.query('nr').trim(),
], function (req, res, next) {
    if (req.isAuthenticated()) {
        return res.redirect(req.query.r || '/');
    }

    // if (req.query.nr !== 'y' && !(req.headers['user-agent'] || '').endsWith('InkiupApp')) {
    //     return res.redirect(`https://go.inkiup.com/?link=${encodeURIComponent(global.config.serviceinfo.defaultUrl + "/auth/login?nr=y&r=" + encodeURIComponent(req.query.r))}&apn=com.inkiup.app&amv=1&ibi=com.inkiup.app&isi=1501274378&efr=1&st=${encodeURIComponent(global.config.serviceinfo.sitename)}&sd=&si=`);
    // }

    res.render('account/login', {
        title: __('LOGIN')
    });
}];