const exValidator = require("express-validator");
/*
Express Validator 6.2
https://express-validator.github.io/docs/schema-validation.html
https://auth0.com/blog/express-validator-tutorial/
*/

var common = require('../../module/common');

module.exports = ['/doc/:docName', null, [
    exValidator.param('docName', 'REQ').trim(),

], function (req, res, next) {

    switch (req.params.docName) {
        case 'privacy': return res.render('support/_privacy', {
            title: __('책임의 한계와 법적고지'),
            list: []
        });
        case 'terms': return res.render('support/_terms', {
            title: __('이용약관'),
            list: []
        });
        default: return res.redirect('about:blank');
    }

}];