var fs = require('fs-extra');
var path = require('path');
const ffmpegPath = require('@ffmpeg-installer/ffmpeg').path;
const ffprobePath = require('@ffprobe-installer/ffprobe').path;

var ffmpeg = require('fluent-ffmpeg');
const sharp = require('sharp');

var common = require('./common');

ffmpeg.setFfmpegPath(ffmpegPath);
ffmpeg.setFfprobePath(ffprobePath);

function fetchVideoMetaData(videoPath, callback) {
    ffmpeg.ffprobe(videoPath, (err, metadata) => {
        if (err) console.error(err);

        console.info(metadata);

        callback(err || null, metadata || false);
    });
}

function getThumbnailFileName(srcPath, prefix, postfix) {
    var tmp = path.parse(srcPath);
    return path.join((prefix ? prefix : '') + tmp.name + (postfix ? postfix : '')) + '.png';
}

function remakePath(srcPath, prefix, filename, postfix, fileext) {
    var tmp = path.parse(srcPath);
    return path.join(tmp.path || tmp.dir, (prefix ? prefix : '') + (filename || tmp.name) + (postfix ? postfix : '')) + (fileext || tmp.ext || '.png');
}

function remakeFilename(srcPath, prefix, filename, postfix, fileext) {
    var tmp = path.parse(srcPath);
    return (prefix ? prefix : '') + (filename || tmp.name) + (postfix ? postfix : '') + (fileext || tmp.ext || '.png');
}

function saveStringToFile(dataString, savePath) {
    var photoData = dataString.startsWith('data:image') ? dataString.replace(/^data:image\/\w+;base64,/, "") : dataString;

    var outputTempPath = global.config.temppath;
    if (!fs.existsSync(outputTempPath)) fs.mkdirsSync(outputTempPath);

    var matches = dataString.match(/^data:([A-Za-z-+\/]+);base64,(.+)$/);
    var mimetype = matches && matches.length > 1 ? matches[1] : null;
    var imageTypeRegularExpression = /\/(.*?)$/;
    var imageTypeDetected = mimetype ? mimetype.match(imageTypeRegularExpression) : null;
    imageTypeDetected = imageTypeDetected && imageTypeDetected.length > 1 ? imageTypeDetected[1] : 'jpg';

    savePath = savePath ? savePath : path.join(outputTempPath, Date.now() + '.' + imageTypeDetected);

    try {
        fs.writeFileSync(savePath, photoData, 'base64');
    } catch (e) {
        console.error(e);
        return null;
    }

    return savePath;
}

function createThumbnailFromImage(photoPath, outputThumbnailFileName, maxWidth, maxHeight, rotateForce, isCrop, callback) {
    var outputTempPath = global.config.temppath;
    if (!fs.existsSync(outputTempPath)) fs.mkdirsSync(outputTempPath);

    var outputFilePath = path.join(outputTempPath, outputThumbnailFileName);

    console.log('THUMBNAIL', photoPath, outputThumbnailFileName, maxWidth, maxHeight);

    var sharpConv = sharp(photoPath);
    sharpConv.metadata(function (err, metadata) {

        var modified = false;
        var _w;
        var _h;
        var needRotation90 = false;

        if (metadata.orientation) {
            switch (metadata.orientation) {
                case 2:
                case 3:
                case 4: {
                    var _w = metadata.width;
                    var _h = metadata.height;
                    break;
                }
                case 5:
                case 6:
                case 7:
                case 8: {
                    var _w = metadata.height;
                    var _h = metadata.width;
                    modified = true;
                    break;
                }
                default: {
                    var _w = metadata.width;
                    var _h = metadata.height;
                    break;
                }
            }
        } else {
            var _w = metadata.width;
            var _h = metadata.height;
        }

        if (_w > _h) {
            console.log('landscape!');
            var t = maxWidth;
            maxWidth = maxHeight;
            maxHeight = t;
            needRotation90 = true;
        }

        if (isCrop)
            sharpConv.extract({ left: 0, top: 0, width: Math.min(_w, _h), height: Math.min(_w, _h) });

        if (maxWidth > _w && maxHeight > _h) {
            if (needRotation90 && rotateForce) {
                console.log('rotate!');
                sharpConv.rotate(90);
                sharpConv.toFile(outputFilePath, (err, info) => {
                    if (err) {
                        console.error(err);
                    }
                    callback(null, !err ? outputFilePath : false);
                });
                return;
            }
            console.log('keep orig!');
            if (photoPath instanceof Buffer) {
                sharpConv.toFile(outputFilePath, (err, info) => {
                    if (err) {
                        console.error(err);
                    }
                    callback(null, !err ? outputFilePath : false);
                });
                return;
            }
            return callback(null, photoPath);
        }

        if (metadata.orientation) {
            switch (metadata.orientation) {
                case 2: {
                    sharpConv.flop();
                    break;
                } // 좌우 반전 필요
                case 3: {
                    sharpConv.rotate(180);
                    break;
                } // 180도 우회전
                case 4: {
                    sharpConv.flip();
                    break;
                } // 상하 반전
                case 5: {
                    sharpConv.rotate(90).flop();
                    break;
                } // 90도 우회전 후 2번
                case 6: {
                    sharpConv.rotate(90);
                    break;
                } // 90도 후회전
                case 7: {
                    sharpConv.rotate(-90).flop();
                    break;
                } // 90도 좌회전 후 2번
                case 8: {
                    sharpConv.rotate(-90);
                    break;
                } // 90도 좌회전
            }
        } else {
            // nothing
        }

        if (needRotation90 && rotateForce) {
            console.log('rotate and resize!');
            sharpConv.rotate(90);
            sharpConv.resize(maxHeight, null);
        } else {
            console.log('resize!');
            sharpConv.resize(maxWidth, null);
        }

        sharpConv.toFile(outputFilePath, (err, info) => {
            if (err) {
                console.error(err);
            }
            callback(null, !err ? outputFilePath : false);
        });
    });
}

function createThumbnailFromVideo(videoPath, outputThumbnailFileName, maxWidth, maxHeight, rotateForce, isCrop, callback) {
    var outputTempPath = global.config.temppath;
    if (!fs.existsSync(outputTempPath)) fs.mkdirsSync(outputTempPath);

    var proc = new ffmpeg(videoPath)
        .on('codecData', function (data) {
            console.log('codecData ' + JSON.stringify(data));
            /*
{
	"format": "mov,mp4,m4a,3gp,3g2,mj2",
	"audio": "aac (LC) (mp4a / 0x6134706D)",
	"video": "h264 (High) (avc1 / 0x31637661)",
	"duration": "00:00:20.23",
	"video_details": ["h264 (High) (avc1 / 0x31637661)", "yuv420p(tv", "bt709)", "1920x1080", "13982 kb/s", "SAR 1:1 DAR 16:9", "29.90 fps", "29.92 tbr", "90k tbn", "180k tbc (default)"],
	"audio_details": ["aac (LC) (mp4a / 0x6134706D)", "48000 Hz", "stereo", "fltp", "256 kb/s (default)"]
}
            */
        })
        .on('end', function () {
            console.log('Screenshots taken');
            createThumbnailFromImage(path.join(outputTempPath, "v_" + outputThumbnailFileName), outputThumbnailFileName, maxWidth, maxHeight, rotateForce, isCrop, (err, result) => {
                if (err)
                    return callback(err, false);

                callback(null, result);
            });
        }).on('error', function (err) {
            console.error('an error happened: ' + err.message);
            callback(null, false);
        }).screenshots({
            count: 1,
            timemarks: ['0'],
            filename: "v_" + outputThumbnailFileName,
        }, outputTempPath);
}

async function resizeThumbnail(photoPath, basename, width, height, rotateForce, isCrop) {
    switch (path.extname(photoPath).toLowerCase()) {
        case '.gif':
        case '.jpeg':
        case '.jpg':
        case '.png': {
            var outputFilename = remakeFilename(basename, null, null, '-' + width + 'x' + height + '_' + Date.now(), '.png');
            return [await common.callback2asyncEx(createThumbnailFromImage, photoPath, outputFilename, width, height, rotateForce, isCrop), outputFilename];
            break;
        }
        case '.mp4': {
            var outputFilename = remakeFilename(basename, null, null, '-' + width + 'x' + height + '_' + Date.now(), '.png');
            return [await common.callback2asyncEx(createThumbnailFromVideo, photoPath, outputFilename, width, height, rotateForce, isCrop), outputFilename];
        }
        default:
            return null;
    }

}

module.exports = {
    ffmpeg: ffmpeg,
    saveStringToFile: saveStringToFile,
    remakePath: remakePath,
    remakeFilename: remakeFilename,
    getThumbnailFileName: getThumbnailFileName,
    // fetchVideoMetaData: fetchVideoMetaData,
    createThumbnailFromImage: createThumbnailFromImage,
    createThumbnailFromVideo: createThumbnailFromVideo,
    resizeThumbnail: resizeThumbnail
}