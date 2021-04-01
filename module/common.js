/*
 * 
 * 공용 스크립트 파일
 * 
 */
var crypto = require('crypto');
var moment = require('moment');

var async = require('async');
var Promise = require("bluebird");

var url = require('url');

const {
    base64encode,
    base64decode
} = require('nodejs-base64');

moment.suppressDeprecationWarnings = true;

module.exports = {
    extend: function (target) {
        var sources = [].slice.call(arguments, 1);
        sources.forEach(function (source) {
            for (var prop in source) {
                target[prop] = source[prop];
            }
        });
        return target;
    },
    xml2json: function (xml) {
        // https://davidwalsh.name/convert-xml-json
        // Create the return object
        var obj = {};

        if (xml.nodeType == 1) { // element
            // do attributes
            if (xml.attributes.length > 0) {
                obj["@attributes"] = {};
                for (var j = 0; j < xml.attributes.length; j++) {
                    var attribute = xml.attributes.item(j);
                    obj["@attributes"][attribute.nodeName] = attribute.nodeValue;
                }
            }
        } else if (xml.nodeType == 3) { // text
            obj = xml.nodeValue;
        }

        // do children
        if (xml.hasChildNodes()) {
            for (var i = 0; i < xml.childNodes.length; i++) {
                var item = xml.childNodes.item(i);
                var nodeName = item.nodeName;
                if (typeof (obj[nodeName]) == "undefined") {
                    obj[nodeName] = xmlToJson(item);
                } else {
                    if (typeof (obj[nodeName].push) == "undefined") {
                        var old = obj[nodeName];
                        obj[nodeName] = [];
                        obj[nodeName].push(old);
                    }
                    obj[nodeName].push(xmlToJson(item));
                }
            }
        }
        return obj;
    },
    existsRole: function (arr1, arr2, options) {
        if (!arr1)
            return false;

        if (!arr2 || arr2.length === 0)
            return true;

        var myRoles = arr1.split(',');

        if (myRoles.indexOf('MASTERADMIN') > -1)
            return true;

        var checkRole = arr2.split(',');

        for (var key in checkRole) {
            if (myRoles.indexOf(checkRole[key]) > -1)
                return true;
        }

        return false;
    },
    existsRoleEx: function (arr1, arr2, options) {
        if (!arr1)
            return false;

        if (!arr2 || arr2.length === 0)
            return true;

        var myRoles = arr1.split(',');

        var checkRole = arr2.split(',');

        for (var key in checkRole) {
            if (myRoles.indexOf(checkRole[key]) > -1)
                return true;
        }

        return false;
    },
    getNumber: function ($this) {
        if (!$this || $this.length === 0) return 0;
        var a = $this + "";
        return a = a.replace(/[^\+\-0-9\.]/g, ""), parseInt(a, 10);
    },
    getHash: function (data) {
        return crypto.createHash('sha1').update(data + '').digest('hex');
    },
    setTime2Min: function (dt) {
        if (typeof dt === 'string') {
            dt = new Date(!isNaN(dt) ? this.getNumber(dt) : dt)
        } else if (typeof dt === 'number') {
            dt = new Date(dt);
        }
        return new Date(dt.getFullYear(), dt.getMonth(), dt.getDate(), 0, 0, 0, 0);
    },
    setTime2Max: function (dt) {
        if (typeof dt === 'string') {
            dt = new Date(!isNaN(dt) ? this.getNumber(dt) : dt)
        } else if (typeof dt === 'number') {
            dt = new Date(dt);
        }
        return new Date(dt.getFullYear(), dt.getMonth(), dt.getDate(), 23, 59, 59, 999);
    },
    getMoment: function (ts) {
        return moment(ts);
    },
    convertTS2Date: function (ts, dateType) {
        var _ = moment(typeof ts === "string" ? this.getNumber(ts) : ts);
        return dateType === 'from' ? _.fromNow() : _.format(dateType || 'LLL');
    },
    formatDate: function (date, dateType, locale) {
        var _ = moment(date);
        if (locale) _.locale(locale);
        return dateType === 'from' ? _.fromNow() : _.format(dateType || 'LLL');
    },
    formatDateEx: function (date, parseFormat, dateType, locale) {
        var _ = moment(date, parseFormat);
        if (locale) _.locale(locale);
        return dateType === 'from' ? _.fromNow() : _.format(dateType || 'LLL');
    },
    padding: function (str, a, b) {
        var tmp = str + '';
        return b = b || "0", tmp.length >= a ? tmp : new Array(a - tmp.length + 1).join(b) + tmp;
    },
    paddingRight: function (str, a, b) {
        var tmp = str + '';
        return b = b || "0", tmp.length >= a ? tmp : tmp + new Array(a - tmp.length + 1).join(b);
    },
    timespan: function (d) {
        d = Number(d) / 1000;
        var h = Math.floor(d / 3600);
        var m = Math.floor(d % 3600 / 60);
        var s = Math.floor(d % 3600 % 60);

        var hDisplay = h > 0 ? h + (h == 1 ? " h" : " h ") : "";
        var mDisplay = m > 0 ? m + (m == 1 ? " m " : " m ") : "";
        var sDisplay = s > 0 ? s + (s == 1 ? " s" : " s") : "";
        return hDisplay + mDisplay + sDisplay;
    },
    datesplits: function (s, d) {
        var t = s.split(d);
        if (!t || t.length < 4)
            return s;
        return t[0] + '-' + t[1] + '-' + t[2] + ' ' + t[3] + '시';
    },
    diffDay: function (date1_ms, date2_ms) {
        //Get 1 day in milliseconds
        var one_day = 1000 * 60 * 60 * 24;

        // Convert both dates to milliseconds
        // var date1_ms = date1.getTime();
        // var date2_ms = date2.getTime();

        // Calculate the difference in milliseconds
        var difference_ms = date2_ms - date1_ms;

        // Convert back to days and return
        return Math.round(difference_ms / one_day);
    },
    getRandomDigit: function (length) {
        return Math.floor(Math.pow(10, length - 1) + Math.random() * (Math.pow(10, length) - Math.pow(10, length - 1) - 1));
    },
    parseJSON: function (json, def) {
        try {
            return JSON.parse(json);
        } catch (e) { }
        return def;
    },
    waitAsync: async function () {
        var args = arguments;
        if (args.length < 1 || typeof args[0] !== 'function') return null;
        var func = args[0];
        return await func.apply(null, args);
    },
    callback2async: async function () {
        var args = arguments;
        return new Promise((resolve, reject) => {
            if (args.length < 2 || typeof args[0] !== 'function') return reject();
            var func = args[0];
            args = Array.prototype.slice.call(args, 1);
            args.push((err, result) => {
                if (err) return reject(err);
                resolve(result);
            });
            func.apply(null, args);
        });
    },
    callback2asyncEx: async function (fn, ...args) {
        return new Promise((resolve, reject) => {
            return fn(...args, (err, result) => {
                return err ? reject(err) : resolve(result);
            })
        })
    },
    object2array: function (obj) {
        if (!obj)
            return [];

        var tmp = Object.keys(obj).map((key) => {
            return Object.assign(obj[key], {
                key: key
            });
        }).sort((a, b) => {
            return a.date > b.date;
        });

        return tmp;
        // var sdt= new Date();
        // var edt= new Date(list.expiredate);
        // var loop = (sdt.getFullYear()<=edt.getFullYear()) && (sdt.getMonth()<=edt.getMonth()) && (sdt.getDate()<=edt.getDate());
        // %>
        // <%-sdt%>/ <%-edt%>/ <%-loop%>/ <%-sdt.getFullYear()<=edt.getFullYear()%>/ <%-dt.getMonth()<=edt.getMonth()%>/ <%-sdt.getDate()<=edt.getDate()%>
        // <%
        // while(!loop){
        //     var tgt=list.logcount[ sdt.getFullYear() + '_' + (sdt.getMonth() + 1) + '_' + sdt.getDate()];
        //     sdt.setDate(sdt.getDate()+1);
    },
    selectObjectInArray: function (arr, selectFN) {
        if (!arr || arr.length < 1 || typeof selectFN !== 'function')
            return null;
        for (var idx = 0; idx < arr.length; idx++) {
            if (selectFN(arr[idx]))
                return arr[idx];
        }
        return null;
    },
    escapeRegExp: function (str) {
        return str.replace(/[\-\[\]\/\{\}\(\)\*\+\?\.\\\^\$\|]/g, "\\$&");
    },
    encodeBase64: function (str) {
        return base64encode(str);
    },
    decodeBase64: function (str) {
        return base64decode(str);
    },
    taskSeries: function (taskList, callback) {
        if (!taskList || taskList.length < 1) {
            typeof callback === 'function' && callback('ENOTASK', null);
            return;
        }
        async.series(taskList, callback);
    },
    taskWaterfall: function (taskList, callback) {
        if (!taskList || taskList.length < 1) {
            typeof callback === 'function' && callback('ENOTASK', null);
            return;
        }
        async.waterfall(taskList, callback);
    },
    taskWaitForAll: function (taskList, callback) {
        if (!taskList || taskList.length < 1) {
            typeof callback === 'function' && callback('ENOTASK', null);
            return;
        }

        Promise.all(taskList).then((resultAll) => {
            typeof callback === 'function' && callback(false, resultAll);
        }).catch((error) => {
            console.log('taskWaitForAll/error:', error);
        });
    },
    getExtension: function (pathFile) {
        return pathFile.substr(2 + (~-pathFile.lastIndexOf(".") >>> 0)).toLowerCase()
    },
    getParsedUrl: function (urlstr) {
        return url.parse(urlstr);
    },
    getStartWeekFromTS: function (ts) {
        var dt = new Date(ts);
        var day = dt.getDay(),
            diff = dt.getDate() - day + (day == 0 ? -6 : 1); // adjust when day is sunday
        dt.setDate(diff);
        dt.setHours(0);
        dt.setMinutes(0);
        dt.setSeconds(0);
        dt.setMilliseconds(0);
        return dt.getTime();
    },
    getMondayFromTS: function (ts) {
        var dt = new Date(ts);
        var day = dt.getDay(),
            diff = dt.getDate() - day + (day == 0 ? -6 : 1); // adjust when day is sunday
        return new Date(dt.setDate(diff));
    },
    matchReplace: function (str, regex, replaceMap) {
        var myString = str;
        var match = myString.match(regex);
        if (match && match.length > 0)
            match.forEach((key) => {
                // console.log(key);
                if (replaceMap[key]) myString = myString.replaceAll(key, replaceMap[key]);
            });

        return myString;
    },
    fn_dateTimeToFormatted: function (dt) {
        var min = 60 * 1000;
        var c = new Date()
        var d = new Date(dt);
        var minsAgo = Math.floor((c - d) / (min));

        var result = {
            'raw': d.getFullYear() + '-' + (d.getMonth() + 1 > 9 ? '' : '0') + (d.getMonth() + 1) + '-' + (d.getDate() > 9 ? '' : '0') + d.getDate() + ' ' + (d.getHours() > 9 ? '' : '0') + d.getHours() + ':' + (d.getMinutes() > 9 ? '' : '0') + d.getMinutes() + ':' + (d.getSeconds() > 9 ? '' : '0') + d.getSeconds(),
            'formatted': '',
        };

        if (minsAgo < 60) { // 1시간 내
            result.formatted = minsAgo + '분 전';
        } else if (minsAgo < 60 * 24) { // 하루 내
            result.formatted = Math.floor(minsAgo / 60) + '시간 전';
        } else { // 하루 이상
            result.formatted = Math.floor(minsAgo / 60 / 24) + '일 전';
        }; //todo - week, year 

        return result;
    },
    getHashtags: function (txt) {
        var regex = /(?:#)([ㄱ-ㅎ|가-힣|a-z|A-Z|0-9|_]+)/gm;
        var matches = [];
        var match;

        while ((match = regex.exec(txt))) {
            matches.push(match[1]);
        }

        return matches;
    },
    _GRD: function (n, t) { n = n || 0; if (!t) return n; return Math.round(n + (new Date).getTime() % (t - n + 1)) },
    _GRDf: function (n, t) { return n + Math.random() * (t - n) },
    getRandomItem: function (arr) {
        if (!arr || arr.length < 1) return null;
        return arr[this._GRD(0, arr.length - 1)];
    },
    getPhoto: function (obj, idx = 0, defImage) {
        return !obj ? defImage || '/img/noimg.png' : obj.length > idx ? obj[idx] : obj.length > 0 ? obj[0] : defImage || '/img/noimg.png';
    },
    getPhotoEx: function (obj, idx = 0, next = 0, defImage) {
        return !obj ? defImage || '/img/noimg.png' : obj.length > idx ? obj[idx] : obj.length > next ? obj[next] : obj.length > 0 ? obj[0] : defImage || '/img/noimg.png';
    },
    getLevelIcon: function (level, textviewyn) {
        var levelText = "유망주";
        level = level || 1;

        if (level == 2) {
            levelText = "지망생";
        } else if (level == 3) {
            levelText = "연습생";
        } else if (level == 4) {
            levelText = "아이돌";
        } else if (level == 5) {
            levelText = "연예인";
        } else if (level == 6) {
            levelText = "인기스타";
        } else if (level == 7) {
            levelText = "월드스타";
        } else if (level == 8) {
            levelText = "레전드";
        }else{
            level =1;
        }
        //<!-- <img class="ml-1" src="https://d39rw2lh9ylrhv.cloudfront.net/attachesmgmt/level_8.png" width="24px" height="20px"> -->
        //var retHtml = '<img src="' + global.config.attach.src + '/attachesmgmt/level_' + level + '.png" width="24px" height="20px">' + (textviewyn ? '<span class="level_icon_box">' + levelText + '</span>' : '');
        var retHtml = '<i class="lvlevel' + level + '"></i>' + (textviewyn ? '<span class="level_icon_box">' + levelText + '</span>' : '');
        return retHtml
    },
    linkContent: function (content) {
        return content.toString().replace(/(http|https):\/\/([-\/.a-zA-Z0-9_~#%$?&=:;+200-377()가-힣]+)/img, '<a href="$1://$2" target="_blank">$1://$2</a>').trim();
    },
    countDisplay: function (count) {
        var retCount=0
        if(count>999){
            retCount=Math.round(count/1000)+"K";
        }else{
            retCount=count;
        }
        return retCount;
    },
};