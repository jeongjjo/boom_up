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

module.exports = ['/oauth/signup/:snstype?', null, fileuploadEx.local.none()
    , [
        exValidator.param('snstype', 'REQ').trim(),
        exValidator.body('d', 'REQ').notEmpty().trim(),
        exValidator.body('i', 'REQ').notEmpty().trim(),
        exValidator.body('t', 'REQ').notEmpty().trim(),
        exValidator.body('n', 'REQ').notEmpty().custom((value, { req }) => {
            if (!(/^[ㄱ-ㅎ|가-힣|a-z|A-Z|0-9|_|\u3130-\u3163\u4E00-\u9FFF|\u3040-\u30FC]{2,10}$/.test(value))) {
                throw new Error('check nickname!');
            }

            // Indicates the success of this synchronous custom validator
            return true;
        }).trim()
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
                var result = await require(path.join('../../../module/oauth/', req.params.snstype)).signup(req.body.d, req.body.i, req.body.t, req.body.n, req);
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
