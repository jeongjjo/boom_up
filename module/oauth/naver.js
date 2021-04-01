var common = require("../common");
var db = require("../mongodbWrapper");
var dbCache = require("../dbCache");
var ObjectId = require('mongodb').ObjectId;

var firebase = require('firebase-admin');

const axios = require('axios');

async function signup(deviceId, userId, token, nickname, req) {
  console.log(`OAUTH/SIGNUP/NAVER,${userId},${token}`);
  var $where = {};
  $where[`auth.naver.key`] = userId + "";

  try {
    // 사용자 가입 시 페북에 사용자 정보를 요청
    var response = await axios.get('https://openapi.naver.com/v1/nid/me', {
      headers: {
        'Authorization': "Bearer " + token
      }
    });

    if (response && response.status === 200 && response.data.message === 'success' && response.data.response && response.data.response.id) {
      // 사용자 정보를 필요에 따라서 저장함
      // 상시 업데이트와 초기에만 업데이트하는 것을 구분해야 함(setOnInsert)
      const userInfo = await db.update('user', $where, {
        $set: {
          "auth": {
            "naver": {
              "key": response.data.response.id + "",
              "email": response.data.response.email || ''
            }
          },
          "nickname": nickname, //response.data.name || '',
          "use": true,
          "firstRun": true, // 가입 후 초기 설정 진행 여부
          "photo": null,
          "block": false,
        },
        $setOnInsert: {
          "setting": {
            "shareProfile": true,
            "receiveMsg": true,
            "comment": true,
            "newSubscriber": true,
            "newPostBySubscribeUser": true
          },
          "createTS": Date.now()
        }
      },
        {
          upsert: true // 사용자 없으면 만들기
        }
      );

      if (userInfo) {
        // Firebase에 사용자 정보를 업데이트 함
        try {
          var tmp = await firebase.auth().createUser({
            provider: global.config.serviceinfo.domain.sid,
            uid: userInfo._id.toHexString(),
            email: userInfo._id.toHexString() + '@' + global.config.serviceinfo.domain,
            displayName: userInfo._id.toHexString()
          });
        } catch (err) {
          // Firebase에 사용자가 없으면 생성
          console.error(err);
          console.error(`OAUTH/SIGNUP/NAVER/FBCREATE,${userId},${token}`, req.ip, req.headers['user-agent'], userInfo._id.toHexString());
          return null;
        }

        // 사용자를 가지고 인증 토큰을 생성
        // 인증 토큰은 클라이언트에서 인증 시도함
        var fbToken = await firebase.auth().createCustomToken(userInfo._id.toHexString(), {
          email: userInfo._id.toHexString() + '@' + global.config.serviceinfo.domain
        });

        if (!fbToken) {
          console.error(`OAUTH/SIGNUP/NAVER/FAILFBTK,${userId},${token}`, req.ip, req.headers['user-agent'], userInfo._id.toHexString());
          return null;
        }

        // 인증정보를 기록
        var deviceInfo = await db.update('userDevice', { deviceId: deviceId }, {
          $set: {
            firebaseToken: fbToken,
            userId: userInfo._id.toHexString(),
            lastIP: req.ip,
            lastUA: req.headers['user-agent'],
            method: 'naver'
          },
          $inc: {
            authCount: 1
          },
          $setOnInsert: {
            deviceId: deviceId,
            createTS: Date.now()
          }
        }, { upsert: true });

        // 앱에서 인증정보를 처리하기 위해서 리턴
        return {
          userId: userInfo._id,
          device: deviceInfo._id,
          token: fbToken
        };
      } else {
        console.warn('NO NAVER USER');
      }
    } else {
      console.warn('NAVER API FAIL');
    } // if response
  } catch (e) {
    console.error(e);
  }

  return null;
}

async function signin(deviceId, userId, token, req) {
  console.log(`OAUTH/SIGNIN/NAVER,${userId},${token}`);
  var $where = {};
  $where[`auth.naver.key`] = userId + "";

  try {
    // 사용자 가입 시 페북에 사용자 정보를 요청
    var response = await axios.get('https://openapi.naver.com/v1/nid/me', {
      headers: {
        'Authorization': "Bearer " + token
      }
    });

    if (response && response.status === 200 && response.data.message === 'success' && response.data.response && response.data.response.id) {
      // 사용자 정보를 필요에 따라서 저장함
      // 상시 업데이트와 초기에만 업데이트하는 것을 구분해야 함(setOnInsert)
      const userInfo = await db.get('user', $where);

      if (userInfo && userInfo.use) {
        // Firebase에 사용자 정보를 업데이트 함
        // try {
        //   var tmp = await firebase.auth().updateUser(userInfo._id.toHexString(), {
        //     // provider: global.config.serviceinfo.domain.sid,
        //     // displayName: userInfo._id.toHexString()
        //   });
        // } catch (err) {
        //   console.error(err);
        //   console.error(`OAUTH/SIGNIN/NAVER/FBUPDATE,${userId},${token}`, req.ip, req.headers['user-agent'], userInfo._id.toHexString());
        //   return null;
        // }

        // 사용자를 가지고 인증 토큰을 생성
        // 인증 토큰은 클라이언트에서 인증 시도함
        var fbToken = await firebase.auth().createCustomToken(userInfo._id.toHexString(), {
          email: userInfo._id.toHexString() + '@' + global.config.serviceinfo.domain
        });

        if (!fbToken) {
          console.error(`OAUTH/SIGNIN/NAVER/FAILFBTK,${userId},${token}`, req.ip, req.headers['user-agent'], userInfo._id.toHexString());
          return null;
        }

        // 인증정보를 기록
        var deviceInfo = await db.update('userDevice', { deviceId: deviceId }, {
          $set: {
            firebaseToken: fbToken,
            userId: userInfo._id.toHexString(),
            lastIP: req.ip,
            lastUA: req.headers['user-agent'],
            method: 'naver'
          },
          $inc: {
            authCount: 1
          },
          $setOnInsert: {
            deviceId: deviceId,
            createTS: Date.now()
          }
        }, { upsert: true });

        // 앱에서 인증정보를 처리하기 위해서 리턴
        return {
          userId: userInfo._id,
          device: deviceInfo._id,
          token: fbToken
        };
      } else {
        console.warn('NO NAVER USER');
      }
    } else {
      console.warn('NAVER API FAIL');
    } // if response
  } catch (e) {
    console.error(e);
  }

  return null;
}

async function addsignin(deviceId, origToken, userId, token, req) {
  console.log(`OAUTH/ADDSIGNIN/NAVER,${userId},${token}`);
  var $where = {};
  $where[`auth.naver.key`] = userId + "";

  try {
    var deviceInfo = await db.get('userDevice', { deviceId: deviceId });
    if (!deviceInfo) {
      console.warn('ADDSIGNIN', req.ip, req.headers['user-agent'], deviceId, 'NOTEXISTS');
      return null;
    }

    const decoededTokenInfo = await firebase.auth().verifyIdToken(origToken);
    if (!decoededTokenInfo) {
      console.warn('ADDSIGNIN', req.ip, req.headers['user-agent'], origToken, 'NOTVALIDTOKEN');
      return null;
    }

    // deviceId의 userId와 firebase의 uid(userId)가 다르면 해킹 아이디 의심해야 함
    if (decoededTokenInfo.uid !== deviceInfo.userId) {
      console.error('SECURITYWARN', req.ip, deviceId, origToken, token, deviceInfo.userId, decoededTokenInfo.uid);
      await db.insert('securityWarn', { deviceId: deviceId, origToken: origToken, snsToken: token, userIdinDevice: deviceInfo.userId, userIdinTokean: decoededTokenInfo.uid });
      return null;
    }

    // 사용자 가입 시 페북에 사용자 정보를 요청
    var response = await axios.get('https://openapi.naver.com/v1/nid/me', {
      headers: {
        'Authorization': "Bearer " + token
      }
    });

    if (response && response.status === 200 && response.data.message === 'success' && response.data.response && response.data.response.id) {
      // 사용자 정보를 필요에 따라서 저장함

      const existsUser = await db.get('user', $where);
      if (existsUser) {
        console.error(`OAUTH/ADDSIGNIN/NAVER/NOUSERINDB,${userId},${token}`, req.ip, req.headers['user-agent']);
        return null;
      }

      // 상시 업데이트와 초기에만 업데이트하는 것을 구분해야 함(setOnInsert)
      const userInfo = await db.updateById('user', decoededTokenInfo.uid, {
        $set: {
          "auth.naver": {
            "key": response.data.response.id + "",
            "email": response.data.response.email || ''
          }
        },
      },
        {
          upsert: false // 사용자 없으면 만들기
        }
      );

      // 앱에서 인증정보를 처리하기 위해서 리턴
      return {
        userId: userInfo._id,
        device: deviceInfo._id,
        token: 'OK'
      };
    } else {
      console.warn('NAVER API FAIL');
    } // if response
  } catch (e) {
    console.error(e);
  }

  return null;
}

const request = require('request-promise-native');

async function webAuth(req, res) {
  var rStat = common.parseJSON(req.query.state || '');

  if (!rStat || !rStat.d) {
    return res.redirect('/auth/login?err=EARG');
  }

  if (!req.query.code) {
    return res.redirect('/auth/login?err=EREQARG&r=' + encodeURIComponent(rStat.r || '/'));
  }

  if (rStat.m === 'su') {
    return webSignup(req, res, rStat);
  } else {
    return webSignin(req, res, rStat);
  }
}

async function webSignup(req, res, rStat) {
  if (!rStat.nn) {
    return res.redirect('/auth/join/naver?err=EINVALIDJOINSNS&r=' + encodeURIComponent(rStat.r || '/'));
  }

  try {
    var responseUT = await request.get({
      uri: 'https://nid.naver.com/oauth2.0/token',
      method: 'GET',
      qs: {
        // params: {
        grant_type: 'authorization_code',
        client_id: 'Nm4tK40AcGaKsMWH0H5g',
        client_secret: 'pHAVn9cSI4',
        redirect_uri: global.config.serviceinfo.defaultUrl + req.path,
        code: req.query.code
      },
      headers: {
        // 'Content-Type': 'application/x-www-form-urlencoded;charset=utf-8'
        'X-Naver-Client-Id': 'Nm4tK40AcGaKsMWH0H5g',
        'X-Naver-Client-Secret': 'pHAVn9cSI4'
      },
      json: true
    });

    // 사용자 토큰 정보 얻기
    if (responseUT && responseUT.access_token) {
      console.log(responseUT);

      try {
        // 사용자 가입 시 카카오에 사용자 정보를 요청
        var response = await axios.get('https://openapi.naver.com/v1/nid/me', {
          headers: {
            'Authorization': "Bearer " + responseUT.access_token
          }
        })
        if (response && response.status === 200 && response.data.message === 'success' && response.data.response && response.data.response.id) {

          // 사용자 정보를 필요에 따라서 저장함
          var $where = {};
          $where[`auth.naver.key`] = response.data.response.id + "";

          // 상시 업데이트와 초기에만 업데이트하는 것을 구분해야 함(setOnInsert)
          const userInfo = await db.update('user', $where, {
            $set: {
              "auth": {
                "naver": {
                  "key": response.data.response.id + "",
                  "email": response.data.response.email || ''
                }
              },
              "nickname": rStat.nn,// response.data.properties.nickname || '',
              "use": true,
              "firstRun": true, // 가입 후 초기 설정 진행 여부
              "photo": null,
              "block": false,
            },
            $setOnInsert: {
              "setting": {
                "shareProfile": true,
                "receiveMsg": true,
                "comment": true,
                "newSubscriber": true,
                "newPostBySubscribeUser": true
              },
              "createTS": Date.now()
            }
          },
            {
              upsert: true // 사용자 없으면 만들기
            }
          );

          if (userInfo) {
            // Firebase에 사용자 정보를 업데이트 함
            try {
              var tmp = await firebase.auth().createUser({
                provider: global.config.serviceinfo.domain.sid,
                uid: userInfo._id.toHexString(),
                email: userInfo._id.toHexString() + '@' + global.config.serviceinfo.domain,
                displayName: userInfo._id.toHexString()
              });
            } catch (err) {
              // Firebase에 사용자가 없으면 생성
              console.error(err);
              return res.redirect('/auth/join/naver?err=ENVERROR&r=' + encodeURIComponent(rStat.r || '/'));
            }

            // 사용자를 가지고 인증 토큰을 생성
            // 인증 토큰은 클라이언트에서 인증 시도함
            var fbToken = await firebase.auth().createCustomToken(userInfo._id.toHexString(), {
              email: userInfo._id.toHexString() + '@' + global.config.serviceinfo.domain
            });

            if (!fbToken) {
              console.error(`OAUTH/CALLBACK/NAVER/FAILFBTK,${userId},${responseUT.access_token}`, req.ip, req.headers['user-agent'], userInfo._id.toHexString());
              return res.redirect('/auth/join/naver?err=EUNKNOWN&r=' + encodeURIComponent(rStat.r || '/'));
            }

            // 인증정보를 기록
            var deviceInfo = await db.update('userDevice', { deviceId: rStat.d }, {
              $set: {
                firebaseToken: fbToken,
                userId: userInfo._id.toHexString(),
                lastIP: req.ip,
                lastUA: req.headers['user-agent'],
                method: 'naver'
              },
              $inc: {
                authCount: 1
              },
              $setOnInsert: {
                deviceId: rStat.d,
                createTS: Date.now()
              }
            }, { upsert: true });

            // 앱에서 인증정보를 처리하기 위해서 리턴
            req.logIn(userInfo, function (err) {
              console.log('SIGNUP/NAVER/WEB', req.ip, req.headers['user-agent'], responseUT.access_token, userInfo._id.toHexString(), 'OK');
              return res.redirect(rStat.r || '/');
            });
            return;
          } else {
            console.warn('NO NAVER USER');
            return res.redirect('/auth/join/naver?err=ENVFAIL&r=' + encodeURIComponent(rStat.r || '/'));
          }

        } else {
          console.warn('NAVER API FAIL');
          return res.redirect('/auth/join/naver?err=ENVFAIL&r=' + encodeURIComponent(rStat.r || '/'));
        } // if response
      } catch (e) {
        console.error(e);
        return res.redirect('/auth/join/naver?err=ENVFAIL&r=' + encodeURIComponent(rStat.r || '/'));
      }

    } else {
      // failed respose
      return res.redirect('/auth/join/naver?err=ENVFAIL&r=' + encodeURIComponent(rStat.r || '/'));
    }

  } catch (e) {
    console.error(e);
  }
  return res.redirect('/auth/join/naver?err=ENVERROR&r=' + encodeURIComponent(rStat.r || '/'));
}

async function webSignin(req, res, rStat) {
  try {
    var responseUT = await request.get({
      uri: 'https://nid.naver.com/oauth2.0/token',
      method: 'GET',
      qs: {
        // params: {
        grant_type: 'authorization_code',
        client_id: 'Nm4tK40AcGaKsMWH0H5g',
        client_secret: 'pHAVn9cSI4',
        redirect_uri: global.config.serviceinfo.defaultUrl + req.path,
        code: req.query.code
      },
      headers: {
        // 'Content-Type': 'application/x-www-form-urlencoded;charset=utf-8'
        'X-Naver-Client-Id': 'Nm4tK40AcGaKsMWH0H5g',
        'X-Naver-Client-Secret': 'pHAVn9cSI4'
      },
      json: true
    });

    // 사용자 토큰 정보 얻기
    if (responseUT && responseUT.access_token) {
      console.log(responseUT);

      try {
        // 사용자 가입 시 카카오에 사용자 정보를 요청
        var response = await axios.get('https://openapi.naver.com/v1/nid/me', {
          headers: {
            'Authorization': "Bearer " + responseUT.access_token
          }
        })
        if (response && response.status === 200 && response.data.message === 'success' && response.data.response && response.data.response.id) {

          // 사용자 정보를 필요에 따라서 저장함
          var $where = {};
          $where[`auth.naver.key`] = response.data.response.id + "";

          // 상시 업데이트와 초기에만 업데이트하는 것을 구분해야 함(setOnInsert)
          const userInfo = await db.get('user', $where);

          if (userInfo && userInfo.use) {

            if (userInfo.block) {
              return res.redirect('/auth/login?err=EBLOCKED&r=' + encodeURIComponent(rStat.r || '/'));
            }

            // 사용자를 가지고 인증 토큰을 생성
            // 인증 토큰은 클라이언트에서 인증 시도함
            var fbToken = await firebase.auth().createCustomToken(userInfo._id.toHexString(), {
              email: userInfo._id.toHexString() + '@' + global.config.serviceinfo.domain
            });

            if (!fbToken) {
              console.error(`OAUTH/CALLBACK/NAVER/FAILFBTK,${userId},${responseUT.access_token}`, req.ip, req.headers['user-agent'], userInfo._id.toHexString());
              return res.redirect('/auth/login?err=EUNKNOWN&r=' + encodeURIComponent(rStat.r || '/'));
            }

            // 인증정보를 기록
            var deviceInfo = await db.update('userDevice', { deviceId: rStat.d }, {
              $set: {
                firebaseToken: fbToken,
                userId: userInfo._id.toHexString(),
                lastIP: req.ip,
                lastUA: req.headers['user-agent'],
                method: 'naver'
              },
              $inc: {
                authCount: 1
              },
              $setOnInsert: {
                deviceId: rStat.d,
                createTS: Date.now()
              }
            }, { upsert: true });

            // 앱에서 인증정보를 처리하기 위해서 리턴
            req.logIn(userInfo,async function (err) {
              var resultUpdate = await db.updateById('user',
              userInfo._id, {
                  $inc: {loginCount: 1}
              });
              console.log('SIGNIN/WEB', req.ip, req.headers['user-agent'], responseUT.access_token, userInfo._id.toHexString(), 'OK');
              return res.redirect(rStat.r || '/');
            });
            return;
          } else {
            console.warn('NO NAVER USER');
            return res.redirect('/auth/login?ret=naver&r=' + encodeURIComponent(rStat.r || '/'));
          }

        } else {
          console.warn('NAVER API FAIL');
          return res.redirect('/auth/login?err=ENVFAIL&r=' + encodeURIComponent(rStat.r || '/'));
        } // if response
      } catch (e) {
        console.error(e);
        return res.redirect('/auth/login?err=ENVFAIL&r=' + encodeURIComponent(rStat.r || '/'));
      }

    } else {
      // failed respose
      return res.redirect('/auth/login?err=ENVFAIL&r=' + encodeURIComponent(rStat.r || '/'));
    }

  } catch (e) {
    console.error(e);
  }
  return res.redirect('/auth/login?err=ENVERROR&r=' + encodeURIComponent(rStat.r || '/'));
}

module.exports = {
  signup: signup,
  signin: signin,
  addsignin: addsignin,
  webAuth: webAuth
};
