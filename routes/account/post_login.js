var passport = require('../../module/auth.js');
const exValidator = require('express-validator');
/*
Express Validator 6.2
https://express-validator.github.io/docs/schema-validation.html
https://auth0.com/blog/express-validator-tutorial/
*/

module.exports = [null, null,
    [
        exValidator.body('em', '아이디 혹은 비밀번호가 올바르지 않습니다').not().isEmpty().isLength({
            min: 4,
            max: 128
        }).trim(),
        exValidator.body('epw', '아이디 혹은 비밀번호가 올바르지 않습니다').not().isEmpty().isLength({
            min: 4,
            max: 256
        }).trim(),
    ],
    function (req, res, next) {
        passport.authenticate('local', function (err, user, info) {
            // TODO : err와 user에 대해서 refactoring이 필요함
            if (err && typeof err !== 'string') {
                return res.json({
                    result: "error",
                    codemsg: "auth-error",
                    displaymsg: '내부 서버 연결 오류'
                });
            }

            if (err) {
                switch (err) {
                    case 'ENOARG': {
                        return res.json({
                            result: "error",
                            codemsg: "auth-enoarg",
                            displaymsg: '로그인 정보가 올바르지 않습니다'
                        });
                    }
                    case 'NOUSER': {
                        return res.json({
                            result: "error",
                            codemsg: "auth-notreg",
                            displaymsg: '아아디 혹은 비밀번호가 올바르지 않습니다'
                        });
                    }
                    case 'INCORRECTPASS': {
                        return res.json({
                            result: "error",
                            codemsg: "auth-invaliduser",
                            displaymsg: '아이디 혹은 비밀번호가 올바르지 않습니다'
                        });
                    }
                    case 'LOCKED': {
                        return res.json({
                            result: "error",
                            codemsg: "auth-locked",
                            displaymsg: '로그인 불가 사용자입니다'
                        });
                    }
                    default: {
                        return res.json({
                            result: "error",
                            codemsg: "auth-notsupp",
                            displaymsg: '지정되지 않은 오류입니다'
                        });
                    }
                }
            }
            req.logIn(user, async function (err) {
                var resultUpdate = await db.updateById('user',
                user._id, {
                    $inc: {loginCount: 1}
                });
                return res.json({
                    result: err ? "error" : "ok",
                    codemsg: "auth-login",
                    displaymsg: ''
                });
            });
        })(req, res, next);
    }
];