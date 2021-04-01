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

module.exports = [null, null, [
], async function (req, res, next) {
    // server-side validation 처리
    const validationErrors = exValidator.validationResult(req);
    if (!validationErrors.isEmpty()) {
        return res.sendStatus(404);
    }

    try {
        return res.render('account/resetpassword', {
            title: __('CHANGE_PASSWORD')
        });
    } catch (error) {
        console.log(error);
        return res.sendStatus(404);
    }
}];