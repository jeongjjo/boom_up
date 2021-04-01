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

var thumbnail = require("../../../module/thumbnail");

module.exports = ['/:prefix?',
    null, // 인증 필요
    fileuploadEx.local.fields([{
        name: 'attach'
    }, {
        name: 'file'
    }]), // 파일 첨부 처리
    [
        exValidator.header('iku-api-context', 'Invalid Request').trim(), // API 인증 처리 필수notEmpty().
        exValidator.param('prefix').trim(),
        exValidator.query('blob').toBoolean()
    ], // exValidator
    async function (req, res, next) {

        // API 인증 처리 필수
        // server-side validation 처리
        const validationErrors = exValidator.validationResult(req);
        if (!validationErrors.isEmpty()) {
            return res.sendStatus(404);
        }
        if (!(req.isAuthenticated())) {
            // API 인증 처리 필수
            req.user = await passport.getAPIAuthenticatedUser(req);
            if (!req.user) {
                return res.sendStatus(401);
            }
        }

        req.params.prefix = req.params.prefix || 'attaches'
        var resultList = [];
        var dbLogList = [];
        var filesdata = req.files.attach || req.files.file;
        if (filesdata && filesdata.length > 0) {

            for (var i = 0; i < filesdata.length; i++) {
                var att = filesdata[i];
                var tmp = null;
                var tmp2 = null;
                var tmp3 = null;

                if (att.size > global.config.attach.limitSize) {
                    resultList.push({ err: 'EOVERSIZE' });
                    continue;
                }

                try {
                    tmp = await thumbnail.resizeThumbnail(att.path, att.filename, 128, 128, false, false);
                    tmp2 = await thumbnail.resizeThumbnail(att.path, att.filename, 320, 320, false, false);
                    tmp3 = await thumbnail.resizeThumbnail(att.path, att.filename, 192, 192, false, true);
                } catch (e) {
                    console.error(e);
                }
                if (!tmp && !tmp2) {
                    resultList.push({ err: 'EINVALID' });
                    continue;
                }
                var info = {
                    images: [
                        global.config.attach.getAttachUrl(att.filename),
                        tmp ? global.config.attach.getAttachUrl(tmp[1]) : global.config.attach.getAttachUrl(att.filename),
                        tmp2 ? global.config.attach.getAttachUrl(tmp2[1]) : global.config.attach.getAttachUrl(att.filename),
                        tmp3 ? global.config.attach.getAttachUrl(tmp3[1]) : global.config.attach.getAttachUrl(att.filename)
                    ],
                    mimetype: att.mimetype,
                    size: att.size
                };

                // AWS 활성화 시에 S3 업로드 처리
                if (global.config.aws.enabled) {
                    try {
                        var uploadResult = await common.callback2async(fileuploadEx.uploadLocalFilesToS3, att.path, `${req.params.prefix}/${att.filename}`);
                        console.log(uploadResult);
                        if (uploadResult && uploadResult.Key) {
                            info.images = [global.config.aws.S3Url + '/' + uploadResult.Key];
                            info.originalname = att.originalname;
                            if (tmp) {
                                var uploadResult1 = await common.callback2async(fileuploadEx.uploadLocalFilesToS3, tmp[0], `${req.params.prefix}/${tmp[1]}`);
                                console.log(uploadResult1);
                                if (uploadResult1 && uploadResult1.Key) {
                                    info.images.push(global.config.aws.S3Url + '/' + uploadResult1.Key);
                                    if (tmp2) {
                                        var uploadResult2 = await common.callback2async(fileuploadEx.uploadLocalFilesToS3, tmp2[0], `${req.params.prefix}/${tmp2[1]}`);
                                        console.log(uploadResult2);
                                        if (uploadResult2 && uploadResult2.Key) {
                                            info.images.push(global.config.aws.S3Url + '/' + uploadResult2.Key);
                                            if (tmp3) {
                                                var uploadResult3 = await common.callback2async(fileuploadEx.uploadLocalFilesToS3, tmp3[0], `${req.params.prefix}/${tmp3[1]}`);
                                                console.log(uploadResult3);
                                                if (uploadResult3 && uploadResult3.Key) {
                                                    info.images.push(global.config.aws.S3Url + '/' + uploadResult3.Key);
                                                }
                                            }
                                        }
                                    }
                                }
                            }
                        }
                    } catch (e) {
                        console.error(e);
                    }
                }

                resultList.push(info);
                dbLogList.push({
                    userId: req.user._id.toHexString(),
                    uploadIp: req.ip,
                    uploadInfo: info
                });
            }

            if (dbLogList && dbLogList.length > 0)
                await db.insertMany('logAttachFiles', dbLogList);
        }
        if (req.query.blob) {
            return res.json(resultList && resultList.length > 0 ? {
                location: common.getPhoto(resultList[0].images, 0, resultList[0].images[0])
            } : {});
        }
        return res.json({
            result: resultList && resultList.length > 0 ? "ok" : "error",
            codemsg: "auth-enoarg",
            displaymsg: '',
            data: resultList
        }
        );
    }];

