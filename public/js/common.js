var pdata = new SharedData(window.localStorage);
Array.prototype.compare = function (array, opt) {
    if (!array)
        return -1;
    var count = 0;
    for (var i = 0; i <= this.length; i++) {
        if (array.indexOf(this[i]) >= 0) {
            count++;
            if (opt && typeof opt.match == "function") {
                opt.match(i, this[i]);
            }
        } else {
            if (opt && typeof opt.notmatch == "function") {
                opt.notmatch(i, this[i]);
            }
        }
    }
    return count;
};
String.prototype.replaceAll = function (t, e) {
    var tt = this;
    while (tt.indexOf(t) >= 0) {
        tt = tt.replace(t, e);
    }
    return tt + ""; //this.replace(new RegExp(t, "gm"), e);
}, String.prototype.trim = function () {
    return this.replace(/(^ *)|( *$)/g, "");
}, String.prototype.ltrim = function () {
    return this.replace(/(^ *)/g, "");
}, String.prototype.rtrim = function () {
    return this.replace(/( *$)/g, "");
}, String.prototype.isNumber = function () {
    return !isNaN(this);
}, String.prototype.getFloat = function () {
    if (this.isEmpty()) return 0;
    var a = this + "";
    return a = a.replace(/[^\+\-0-9\.]/g, ""), parseFloat(a);
}, String.prototype.isEmpty = function () {
    return this.length < 1 ? !0 : !1;
}, String.prototype.getNumber = function () {
    if (this.length <= 0) return 0;
    var a = this + "";
    return a = a.replace(/[^\+\-0-9\.]/g, ""), parseInt(a, 10)
}, String.prototype.padding = function (a, b) {
    return b = b || "0", this.length >= a ? this : new Array(a - this.length + 1).join(b) + this
}, String.prototype.paddingRight = function (a, b) {
    return b = b || "0", this.length >= a ? this : this + new Array(a - this.length + 1).join(b)
}, String.prototype.getCommaNumber = function (pl) {
    return getLocaleCurrency(this, pl);
}, String.prototype.getSymbolNumber = function (pl, sym) {
    if (!this || this.length === 0) return 0;
    var n = this.getNumber();
    if (!sym || sym == "") {
        sym = "K"
    }
    if (n >= 1000 && n < 1000000) {
        n = Math.floor(n / 1000);
        sym = " " + sym;
    } else if (n >= 1000000) {
        n = Math.floor(n / 1000000);
        sym = " M";
    } else {
        sym = "";
    }
    if (!pl || pl == "") {
        pl = -1
    }
    return (n.getCommaNumber(pl)) + (sym.length ? " " + sym : "");
}, String.prototype.getTimeText = function () {
    if (!this || this.length === 0) return 0;
    var t = this.getNumber();
    var today = moment();
    var duration = moment.duration(today.diff(t));
    var years = Math.floor(duration.asYears());
    var days = Math.floor(duration.asDays());
    var hours = Math.floor(duration.asHours());
    var minutes = Math.floor(duration.asMinutes());
    var second = Math.floor(duration.asSeconds());
    var returnval = moment(t).fromNow();

    return returnval;
}, String.prototype.getTimeFullText = function () {
    if (!this || this.length === 0) return 0;
    var t = this.getNumber();
    var registdate = moment(t);
    var returnval = registdate.format("L");

    return returnval;
}, String.prototype.convertTS2Date = function (dateType) {
    return (this).getNumber().convertTS2Date(dateType || 'LLL');
}, String.prototype.removeCommaNumber = function () {
    var c = moment.locale();
    c = c.split("-");
    c = c[1] ? (c[0].toLowerCase() + "-" + c[1].toUpperCase()) : "en-US";

    var t = (22.15).toLocaleString(c).replace(/[0-9]/g, "");
    var v = (this + "").split(t);
    v[0] = v[0].replace(/[^\+\-0-9]/g, "");
    return v[0] + (v[1] ? '.' + v[1] : (this.indexOf(t) > 0 ? "." : ""));
}, Number.prototype.convertTS2Date = function (dateType) {
    return moment(this).format(dateType || 'LLL');
}, Number.prototype.getCommaNumber = function (pl) {
    return getLocaleCurrency(this, pl);
}, Number.prototype.getSymbolNumber = function (pl, sym) {
    if (!this || this.length === 0) return 0;
    var n = this;
    if (!sym || sym == "") {
        sym = "K"
    }
    if (n >= 1000 && n < 1000000) {
        n = Math.floor(n / 1000);
        sym = " " + sym;
    } else if (n >= 1000000) {
        n = Math.floor(n / 1000000);
        sym = " M";
    } else {
        sym = "";
    }
    if (!pl || pl == "") {
        pl = -1
    }
    return (n.getCommaNumber(pl)) + (sym.length ? " " + sym : "");
}, Number.prototype.getTimeText = function () {
    if (!this || this.length === 0) return 0;
    var t = this;
    var today = moment();
    var duration = moment.duration(today.diff(t));
    var years = Math.floor(duration.asYears());
    var days = Math.floor(duration.asDays());
    var hours = Math.floor(duration.asHours());
    var minutes = Math.floor(duration.asMinutes());
    var second = Math.floor(duration.asSeconds());
    var returnval = moment(t).fromNow();

    return returnval;
}, Number.prototype.getTimeFullText = function () {
    if (!this || this.length === 0) return 0;
    var t = this;
    var registdate = moment(t);
    var returnval = registdate.format("L LT");

    return returnval;
};

function parseJSON(str) {
    try {
        return JSON.parse(str);
    } catch (e) { }
    return null;
}
function setCookie(name, value, exp) {
    var date = new Date();
    date.setTime(date.getTime() + exp * 24 * 60 * 60 * 1000);
    document.cookie = name + '=' + value + ';expires=' + date.toUTCString() + ';path=/';
};

function getCookie(cname) {
    var name = cname + "=";
    var decodedCookie = decodeURIComponent(document.cookie);
    var ca = decodedCookie.split(';');
    for (var i = 0; i < ca.length; i++) {
        var c = ca[i];
        while (c.charAt(0) == ' ') {
            c = c.substring(1);
        }
        if (c.indexOf(name) == 0) {
            return c.substring(name.length, c.length);
        }
    }
    return "";
}

/**
 * Shared Data using HTML5 Storage
 *
 * @returns shareddata object
 */
function SharedData(storageObject) {
    // use sessionStorage defualt
    var _storage = storageObject;

    if (typeof (Storage) !== "undefined") { } else {
        g_commondebug && debug("SHARED", "not supported web storage");
    }

    this.get = function (key, defaultValue) {
        if (_storage.hasOwnProperty(key)) {
            return _storage.getItem(key);
        } else {
            return defaultValue;
        }
    };

    this.getNumber = function (key, defaultValue) {
        if (_storage.hasOwnProperty(key)) {
            return _storage.getItem(key).getNumber();
        } else {
            return defaultValue;
        }
    };

    this.getObject = function (key, defaultValue) {
        try {
            if (_storage.hasOwnProperty(key)) {
                return JSON.parse(_storage.getItem(key));
            }
        } catch (e) { }
        return defaultValue;
    };
    /// 캐싱 데이터를 리턴
    /// key : 키 값
    /// defaultValue : 데이터가 없거나, 유효 시간 만료 시 리턴될 기본 값
    /// forceget : (옵션) 유효 시간 만료와 관계 없이 데이터를 리턴 받을 때 사용, 즉 getObject()랑 동일한 처리
    this.getCachedObject = function (key, defaultValue, forceget) {
        try {
            if (_storage.hasOwnProperty(key)) {
                var val = JSON.parse(_storage.getItem(key));
                if (forceget === true || (new Date()).getTime() <= val.exp) {
                    return val.val;
                }
            }
        } catch (e) { }
        return defaultValue;
    };

    this.set = function (key, value) {
        _storage.setItem(key, value);
        return this;
    };

    this.setObject = function (key, value) {
        try {
            _storage.setItem(key, JSON.stringify(value));
        } catch (e) { }
        return this;
    };

    /// 개싱 데이터에 저장
    /// key : 키 값
    /// value : 저장할 데이터
    /// expire : 데이터 유효 시간(msec)
    this.setCachedObject = function (key, value, expire) {
        try {
            _storage.setItem(key, JSON.stringify({
                exp: (new Date()).getTime() + (expire != null ? expire : 5 * 60 * 1000),
                val: value
            }));
        } catch (e) { }
        return this;
    };

    this.clearAll = function () {
        _storage.clear();
    };
};

function objectifyForm(formArray) { //serialize data function
    var returnArray = {};
    for (var i = 0; i < formArray.length; i++) {
        //if (!(/INPUT|SELECT|TEXTAREA/i).test(formArray[i].nodeName)) continue;
        if (!formArray[i]['name']) continue;
        switch (formArray[i].nodeName) {
            case 'SELECT': {
                var val = $(formArray[i]).val();
                returnArray[formArray[i]['name']] = Array.isArray(val) ? val.join(',') : val;
                break;
            }
            case 'INPUT': {
                var inputtype = formArray[i].getAttribute('type').toUpperCase();
                switch (inputtype) {
                    case 'CHECKBOX': {
                        returnArray[formArray[i]['name']] = formArray[i].checked ? (typeof formArray[i]['value'] !== 'undefined' ? formArray[i]['value'] : true) : false;
                        break;
                    }
                    case 'RADIO': {
                        if (!returnArray[formArray[i]['name']] || returnArray[formArray[i]['name']] === false || formArray[i].checked)
                            returnArray[formArray[i]['name']] = formArray[i].checked ? (typeof formArray[i]['value'] !== 'undefined' ? formArray[i]['value'] : true) : false;
                        break;
                    }
                    default: {
                        if (formArray[i]['name'].endsWith('[]')) {
                            var key = formArray[i]['name'].substring(0, formArray[i]['name'].length - 2);
                            if (!returnArray[key]) {
                                returnArray[key] = [formArray[i]['value']];
                            } else if (Array.isArray(returnArray[key])) {
                                returnArray[key].push(formArray[i]['value']);
                            } else {
                                returnArray[key] = [returnArray[key], formArray[i]['value']];
                            }
                        } else {
                            returnArray[formArray[i]['name']] = formArray[i]['value'];
                        }
                        break;
                    }
                }
                break;
            }
            default: {
                returnArray[formArray[i]['name']] = formArray[i]['value'];
                break;
            }
        }
    }
    return returnArray;
}

function getQueryString(t) {
    function e() {
        for (var tt, e = {}, n = /([^&=]+)=?([^&]*)/g, a = window.location.search.substring(1); tt = n.exec(a);) e[tt[1]] = decodeURIComponent(tt[2].replace(/\+/g, " "));
        return e
    }
    return this.queryStringParams || (this.queryStringParams = e()), this.queryStringParams[t]
}

function fn_dateTimeToFormatted(dt) {
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
    };

    return result;
};

function _GRD(n, t) { n = n || 0; if (!t) return n; return Math.round(n + (new Date).getTime() % (t - n + 1)) }
function _GRDf(n, t) { return n + Math.random() * (t - n) }

function getRandomItem(arr) {
    if (!arr || arr.length < 1) return null;
    return arr[_GRD(0, arr.length - 1)];
}

function blockPage() {
    $.blockUI({
        message: '<div class="sk-folding-cube sk-primary"><div class="sk-cube1 sk-cube"></div><div class="sk-cube2 sk-cube"></div><div class="sk-cube4 sk-cube"></div><div class="sk-cube3 sk-cube"></div></div><h5 style="color: #444">LOADING...</h5>',
        css: {
            backgroundColor: 'transparent',
            border: '0',
            zIndex: 9999999
        },
        overlayCSS: {
            backgroundColor: '#fff',
            opacity: 0.8,
            zIndex: 9999990
        }
    });
}

function unblockPage() {
    $.unblockUI();
}

function blockUI(id) {
    (typeof id !== 'string' ? id : $(id)).block({
        message: '<div class="sk-wave sk-primary"><div class="sk-rect sk-rect1"></div> <div class="sk-rect sk-rect2"></div> <div class="sk-rect sk-rect3"></div> <div class="sk-rect sk-rect4"></div> <div class="sk-rect sk-rect5"></div></div>',
        css: {
            backgroundColor: 'transparent',
            border: '0'
        },
        overlayCSS: {
            backgroundColor: '#fff',
            opacity: 0.8
        }
    });
}

function unblockUI(id) {
    (typeof id !== 'string' ? id : $(id)).unblock();
}

function getPhoto(obj, idx = 0, defImage) {
    //return !obj ? '/img/noimg.png' : obj.length > (idx + 1) ? obj[idx] : obj.length > 0 ? obj[0] : '/img/noimg.png';
    return !obj ? defImage || '/img/noimg.png' : obj.length > (idx + 1) ? obj[idx] : obj.length > 0 ? obj[0] : defImage || '/img/noimg.png';
};

function generateUUID() { // Public Domain/MIT
    var d = new Date().getTime();
    var d2 = (performance && performance.now && (performance.now() * 1000)) || 0;//Time in microseconds since page-load or 0 if unsupported
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
        var r = Math.random() * 16;//random number between 0 and 16
        if (d > 0) {//Use timestamp until depleted
            r = (d + r) % 16 | 0;
            d = Math.floor(d / 16);
        } else {//Use microseconds since page-load if supported
            r = (d2 + r) % 16 | 0;
            d2 = Math.floor(d2 / 16);
        }
        return (c === 'x' ? r : (r & 0x3 | 0x8)).toString(16);
    });
}

(() => {
    var _t = pdata.getObject('__d__', '');
    if (!_t) {
        pdata.setObject('__d__', generateUUID());
    }
})();

// get cookie
function $getCookie(id) { var c = document.cookie.split(/\s*;\s*/); var r = new RegExp('^(\\s*' + id + '\\s*=)'); for (var i = 0; i < c.length; i++) { if (r.test(c[i])) { return decodeURIComponent(c[i].substr(RegExp.$1.length)) } } return ''; }
function $setCookie(name, value, expires, path, domain, secure) {
    var today = new Date();
    today.setTime(today.getTime());
    if (expires) { expires = expires * 1000 * 60 * 60 * 24; }
    var expires_date = new Date(today.getTime() + (expires));
    document.cookie = name + "=" + escape(value) +
        ((expires) ? ";expires=" + expires_date.toGMTString() : "") +
        ((path) ? ";path=" + path : "") +
        ((domain) ? ";domain=" + domain : "") +
        ((secure) ? ";secure" : "");
}
