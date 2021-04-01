var multer = require('multer')
var path = require('path');
var fs = require('fs');
const AWS = require('aws-sdk');
const multerS3 = require('multer-s3');

var storage = multer.diskStorage({
    destination: function (req, file, next) {
        next(null, global.config.attach.path);
    },
    filename: function (req, file, next) {
        next(null, file.fieldname + '-' + Date.now() + path.extname(file.originalname));
    }
})

const uploadLocal = multer({
    storage: storage,
    limits: {
        fieldSize: 1024 * 1024 * 150
    }
});

var awsAccessKey = global.config.aws.AWSAccessKeyId;
var awsSecretKey = global.config.aws.AWSSecretKey;
var awsRegion = global.config.aws.REGION;
var awsBucket = global.config.aws.Bucket;
global.config.aws.s3Config = new AWS.S3({
    accessKeyId: awsAccessKey,
    secretAccessKey: awsSecretKey,
    Bucket: awsBucket
});

const multerS3Config = multerS3({
    s3: global.config.aws.s3Config,
    bucket: awsBucket,
    acl: 'public-read',
    contentType: function (req, file, cb) {
        cb(null, file.mimetype);
    },
    metadata: function (req, file, cb) {
        cb(null, {
            fieldName: file.fieldname
        });
    },
    key: function (req, file, cb) {
        //console.log("fileupload : "+JSON.stringify(file))
        cb(null, 'temp/' + file.fieldname + '-' + Date.now() + path.extname(file.originalname))
    }
});


const uploadS3 = multer({
    storage: multerS3Config,
    limits: {
        fileSize: 1024 * 1024 * 150
    }
})

function uploadLocalFilesToS3(localFile, s3DestinationKey, callback) {
    var params = {
        Bucket: awsBucket,
        ACL: 'public-read',
        Key: s3DestinationKey && s3DestinationKey.startsWith('/') ? s3DestinationKey.substr(1) : s3DestinationKey,
        Body: fs.createReadStream(localFile)
    };

    global.config.aws.s3Config.upload(params, (err, result) => {
        if (err) {
            console.error(err);
            return callback(err, null);
        }
        callback(null, {
            file: localFile,
            Key: params.Key
        });
    });
}

function downloadFileFroms3(key, outputFilePath, callback) {
    var awsBucket = global.config.aws.Bucket;
    var outputFile = fs.createWriteStream(outputFilePath);

    try {
        var stream = global.config.aws.s3Config.getObject({
            Bucket: awsBucket,
            Key: key && key.startsWith('/') ? key.substr(1) : key
        }).createReadStream();
        stream.pipe(outputFile);
        stream.on('end', function (err, result) {
            if (err) console.error(err);
            outputFile.close();
            callback(err || null, err ? false : Object.assign({}, result, {
                localFilePath: outputFilePath
            }));
        });
    } catch (e) {
        console.error(e);
        callback(true, null);
    }
}

module.exports = {
    local: uploadLocal,
    s3: uploadS3,
    uploadLocalFilesToS3: uploadLocalFilesToS3,
    downloadFileFroms3: downloadFileFroms3
};
