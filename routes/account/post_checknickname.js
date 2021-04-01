var crypto = require('crypto');
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

module.exports = [null, null,
    [
        exValidator.body('nn', '사용할 수 없는 별명입니다.').not().isEmpty().custom((value, { req }) => {
            if (!(/^[ㄱ-ㅎ|가-힣|a-z|A-Z|0-9|_|\u3130-\u3163\u4E00-\u9FFF|\u3040-\u30FC]{2,10}$/.test(value))) {
                throw new Error('check nickname!');
            }

            // var len = value.length;// ? Buffer.byteLength(value, 'utf8') : 0;
            // if (len < 2 || len > 10) {
            //     throw new Error('check length!');
            // }

            // Indicates the success of this synchronous custom validator
            return true;
        }).trim(),
    ],
    async function (req, res, next) {
        // server-side validation
        const validationErrors = exValidator.validationResult(req);
        if (!validationErrors.isEmpty()) {
            return res.send('false');
            // return res.json({
            //     ok: 0,
            //     err: validationErrors.errors.map(e => { var tmp = {}; tmp[e.param] = e.msg; return tmp; })
            // });
        }

        try {
            var user = await db.get('user', { nickname: req.body.nn });

            return res.send(user && user.use ? 'false' : 'true');

            // return res.json({
            //     ok: user ? 0 : 1,
            //     err: user ? [{ 'nn': '이미 사용 중이거나 사용할 수 없는 별명입니다' }] : null
            // });
        } catch (err) {
            console.error(err);
            return res.send('false');
            // res.json({
            //     ok: 0
            // });
        };
    }
];