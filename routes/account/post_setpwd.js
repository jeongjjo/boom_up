var crypto = require('crypto');
const exValidator = require('express-validator');
/*
Express Validator 6.2
https://express-validator.github.io/docs/schema-validation.html
https://auth0.com/blog/express-validator-tutorial/
*/

// var daoUser = require('../../module/dao/User');

module.exports = [null, null,
    [
        exValidator.body('newvalue', '비밀번호가 올바르지 않습니다').not().isEmpty().isLength({
            min: 4,
            max: 128
        }).trim(),
    ],
    async function (req, res, next) {
        // server-side validation
        const validationErrors = expressValidator.validationResult(req);
        if (!validationErrors.isEmpty()) {
            return res.json({
                result: "error",
                codemsg: "auth-enoarg",
                displaymsg: ''
            });
        }

        var hash1 = crypto.createHash('sha256');

        try {
            // var user = await daoUser.updateByUserId(req.user.userid, {
            //     $set: {
            //         password: hash1.update(req.body.newvalue).digest('hex')
            //     }
            // }, {
            //     upsert: false
            // });

            // return res.json({
            //     ok: user ? 1 : 0
            // });
        } catch (err) {
            console.error(err);
            res.json({
                result: "error",
                codemsg: "auth-esetpw",
                displaymsg: ""
            });
        };
    }
];