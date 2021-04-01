/**
 * @file 
 * 개발 샘플
 *
 * GET /sample/test2
 */

const exValidator = require("express-validator");
/*
Express Validator 6.2
https://express-validator.github.io/docs/schema-validation.html
https://auth0.com/blog/express-validator-tutorial/
*/

var common = require("../../module/common");

var firebase = require('firebase-admin');

//var mongodb = require('../../module/mongodb');
var db = require("../../module/mongodbWrapper");

module.exports = [
    '/unregister', // URI : /test2 (최종은 /<route module>/<page module> : /sameple/test2)
    [], // 권한 : null은 권한 미체크, [] array 형태로 권한 지정
    [
        // Validation 처리 ------------------------------------
        //      exValidator.header('user-agent', 'NOT FOUND').not().isEmpty().isLength({min: 4,max: 24})
        //        .matches(/^MY/)  // MY로 시작되는 문자열
        //        .custom((value, {req,location,path}) => { return value.startsWith('MY'); }) // MY로 시작되는 문자열(위의 matches()랑 동일 구현)
        // 파라미터 sanitize 처리 ------------------------------
        //      sanitize* function들은 모두 validation 과 통합되었음
    ],
    async function (req, res, next) {
        // server-side validation 처리
        const validationErrors = exValidator.validationResult(req);
        if (!validationErrors.isEmpty()) {
            return res.sendStatus(404);
        }
        /* 이렇게 쓰면 안댐 위에 validationErros를 이용 합시다
        if (!req.user)
            return res.json({
                code: 'Error',
                file: ''
            });
        */
        var updateMemo = await db.update("user",
            { _id: req.user._id },
            { $set: { use: false } },
            {
                $unset: {
                    auth: 1,
                    nickname: 1,
                    photo: 1
                }
            },
            { upsert: true }
        );

        var userId = req.user._id.toHexString();

        try {
            var tmp = await firebase.auth().deleteUser(userId);
        } catch (err) {
            console.error(err);
        }

        // 로그아웃 처리 시작
        var ret = await db.deleteMany('userDevice', { userId: userId });

        // 로갓!
        req.logout();
        // 세션 삭제
        req.session.destroy(function (err) {
            // 세션 정보에 접근 못 하는 영역
            if (err)
                console.error(err);
        });
        res.clearCookie(global.config.session.key); // 세션 쿠키 삭제   
        // 로그아웃 처리 끝

        if (updateMemo) {
            return res.json({
                result: "ok",
                codemsg: "unregister-success",
                displaymsg: "",
                data: [],
            });
        } else {
            return res.json({
                result: "error",
                codemsg: "unregister-error",
                displaymsg: "",
                data: [],
            });
        }

    }
];
