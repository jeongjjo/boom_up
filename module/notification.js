var common = require("./common");
var db = require("./mongodbWrapper");
var dbCache = require("./dbCache");
var ObjectId = require('mongodb').ObjectId;

var firebase = require('firebase-admin');

module.exports = {
    send: async function (users, msg, insertDb= true) {
        if (msg && msg.body) {
            var where = [];
            var listcount = 0;
            var limit = 100; // 페이지당 row 수
            var sort = { registDate: -1 }; // 기본 검색 옵션

            var sender = msg.sender || {};
            var senderId = sender._id ? sender._id.toHexString() : null;
            var senderNickname = sender.nickname || '';
            var senderPhoto = sender.photo && sender.photo[0] ? sender.photo[0] : null;
            var kind = msg.kind;

            msg.body= msg.body.replace('[NICKNAME]', senderNickname);

            for(i in users) {
                var userInfo = users[i];
                var userId = typeof userInfo == "string" ? userInfo : userInfo._id.toHexString();
                if (userId == senderId) {
                    continue;
                }
                if (typeof userInfo == "string") {
                    userInfo = await dbCache.get('user@' + userId, () => {
                        return db.get('user', { "_id": ObjectId(userId) });
                    });
                }
    
                if (userInfo && (userInfo.setting && userInfo.setting[kind]) || kind == "answer") {
                    where.push({"userId" : userId});

                    // 푸시 정보를 DB에 기록
                    if (insertDb && sender) {
                        const result = db.insert("notification", {
                            "type" : kind == "answer" || kind ==" notice" ? "admin" : "user",
                            "kind" : kind,
                            "senderUserId" : senderId,
                            "senderNickname" : senderNickname,
                            "senderPhoto" : senderPhoto,
                            "receiver" : userInfo._id.toHexString(),
                            "receiverNickname" : userInfo.nickname,
                            "url" : msg.data.url || null,
                            "message" : msg.body,
                            "thumbnail" : msg.thumbnail || null,
                            'registDate': new Date(),
                            "readed" : false
                        });
                    }
                }
            }
    
            if (where.length <= 0) {
                return 
            }

            var userDevices  = [];
            do {
                var messages = [];
                userDevices = await db.getList("userDevice", {$or:where},listcount,limit,sort);
                for (i in userDevices) {
                    console.log();
                    var pushToken = userDevices[i].pushToken || null;
                    var userId = userDevices[i].userId || null;

                    var data = msg.data || {}
                    data['image'] = msg.thumbnail || senderPhoto || "";
                    data['click_action'] = "FLUTTER_NOTIFICATION_CLICK";

                    if (pushToken != null && userId != null) {
                        var count = await db.count("notification", {$and:[{"receiver": userId}, {"readed" : false}]});
                        var message = {
                            token: pushToken,
                            data: data,
                            notification: {
                                title:msg.title || "",
                                body: msg.body,
                                image: data.image || ""
                            },
                            android: {
                                ttl: 3600 * 1000,
                                notification: {
                                icon: 'stock_ticker_update',
                                color: '#f45342'
                                },
                            },
                            apns: {
                                payload: {
                                aps: {
                                    badge: count
                                },
                                },
                            }
                        }
                        messages.push(message);
                    }
                }

                if (messages.length > 0) {
                    firebase.messaging().sendAll(messages)
                    .then((response) => {
                        if (response.failureCount > 0) {
                            const failedTokens = [];
                            response.responses.forEach((resp, idx) => {
                                if (!resp.success) {
                                    if (messages[idx] && messages[idx].token) {
                                        failedTokens.push(messages[idx].token);
                                    }
                                }
                            });
                            console.log('List of tokens that caused failures: ' + failedTokens);
                        }
                    })
                    .catch((error) => {
                        console.log('push mesasge send fail: ' + error);
                    });
                }
                listcount += limit;
            } while(userDevices != null && userDevices.length > 0);
        }
    }
};
