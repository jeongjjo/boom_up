var firebase = require('firebase-admin');
const exValidator = require("express-validator");
/*
Express Validator 6.2
https://express-validator.github.io/docs/schema-validation.html
https://auth0.com/blog/express-validator-tutorial/
*/

var common = require("../../../module/common");

var passport = require('../../../module/auth.js');

var path = require('path');
var fileuploadEx = require('../../../module/fileuploadExt');
var fs = require('fs-extra');

var db = require("../../../module/mongodbWrapper");
var dbCache = require("../../../module/dbCache");
var ObjectId = require('mongodb').ObjectId;

module.exports = ['/oauth/signin/:snstype?', null, fileuploadEx.local.none()
    , [
        exValidator.param('snstype', 'REQ').trim(),
        exValidator.body('d', 'REQ').notEmpty().trim(),
        exValidator.body('i', 'REQ').notEmpty().trim(),
        exValidator.body('t', 'REQ').notEmpty().trim()
    ], async function (req, res, next) {
        // server-side validation 처리
        const validationErrors = exValidator.validationResult(req);
        if (!validationErrors.isEmpty()) {
            return res.sendStatus(404);
        }

        return signup(req, res);
    }];

async function signup(req, res) {
    switch (req.params.snstype) {
        case 'facebook':
        case 'kakao':
        case 'naver':
        case 'google':
        case 'apple':
            {
                var result = await require(path.join('../../../module/oauth/', req.params.snstype)).signin(req.body.d, req.body.i, req.body.t, req);
                return res.json({ result: result && result.token ? "ok" : "error", data: result && result.token ? result.token : null });
            }
        default: {
            return res.json({
                result: "error",
                codemsg: "auth-notsupp"
            });
        }
    }
}
