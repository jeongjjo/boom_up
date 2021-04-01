var moment = require('moment');
var async = require('async');
var google = require('googleapis').google;
var googlekey = require('../googlekey.json');
var googlesheets = google.sheets('v4');

var jwtClient = new google.auth.JWT(
    googlekey.client_email,
    null,
    googlekey.private_key, ['https://www.googleapis.com/auth/plus.me', 'https://www.googleapis.com/auth/drive.metadata.readonly', 'https://www.googleapis.com/auth/spreadsheets'], // an array of auth scopes
    null
);

jwtClient.authorize(function(err, tokens) {
    if (err) {
        console.log(err);
        return;
    }
});
/*
if (googlekey.detectchanges) {
    var googledrive = google.drive('v3');
    var pageToken;
    // Using the npm module 'async'
    googledrive.changes.getStartPageToken({
        auth: jwtClient
    }, function (err, res) {
        if (err) {
            return;
        }

        if (res && res.data && res.data.startPageToken) {
            pageToken = res.data.startPageToken;
            async.doWhilst(function (callback) {
                googledrive.changes.list({
                    auth: jwtClient,
                    pageToken: pageToken,
                    fields: '*'
                }, function (err, res) {
                    if (err) {
                    callback(err);
                    } else {
                    // Process changes
                    res.data.changes.forEach(function (change) {
                        console.log('Change found for file:', change.fileId);
                    });
                    pageToken = res.data.newStartPageToken || pageToken;
                    callback(res.data.newStartPageToken);
                    }
                });
            }, function () {
                return !!pageToken
            }, function (err, newStartPageToken) {
                console.log('Done fetching changes');
                // Save the token (newStartPageToken)
            });
        }
    });
}
*/
ExcelColumn = function(i) {
    var d = i / 26;
    var m = i % 26;
    if (m == 0) {
        m = 26;
        d = d - 1;
    }
    return (i <= 26 ? String.fromCharCode(i + 64) : (ExcelColumn(d) + ExcelColumn(m)));
}

googlesheethelper = function(sheetid, s, dateformat) {
    var _this = this;
    this.sheetname = s;
    this.column = [];

    this.getData = function(data, cname) {
        var idx = _this.column.indexOf(cname);
        return data[idx] || "";
    }
    this.getColumn = function(cname) {
        return ExcelColumn(_this.column.indexOf(cname));
    }
    this.getDate = function(data, cname) {
        var date = _this.getData(data, cname);
        return date && date.length > 0 ? moment(date, dateformat.date) : null;
    }

    this.getDateTime = function(data, cname) {
        var date = _this.getData(data, cname);
        return date && date.length > 0 ? moment(date, dateformat.datetime) : null;
    }

    this.get = function(r, callback) {
        if (sheetid && sheetid.length > 0) {} else {
            return;
        }
        var ranges = [_this.sheetname + "!" + "$A1:$AZ1"];
        if (r) {
            if (typeof r == "string") {
                r = r.split(",");
            }
            for (var i in r) {
                if (typeof r[i] != 'function') {
                    ranges.push(_this.sheetname + "!" + r[i]);
                }
            };
        }
        googlesheets.spreadsheets.values.batchGet({
            auth: jwtClient,
            spreadsheetId: sheetid,
            ranges: ranges,
        }, function(err, response) {
            if (err) {
                console.log(err);
                return;
            }
            
            if (response && response.data && response.data.valueRanges && response.data.valueRanges.length >= 1) {
                if (response.data.valueRanges[0]["values"] && response.data.valueRanges[0]["values"][0]) {
                    _this.column = response.data.valueRanges[0]["values"][0];
                }
                if (typeof callback == "function") {
                    callback(err, response.data.valueRanges);
                }
            }
        });
    }
    this.makeAddValue = function(value) {
        var v = new Array(_this.column.length);
        for (var i in v) {
            v[i] = "";
        }
        for (var k in value) {
            var idx = _this.column.indexOf(k);
            v[idx] = value[k];
        }
        return v;
    }
    this.add = function(values, callback) {
        if (sheetid && sheetid.length > 0) {} else {
            return;
        }
        googlesheets.spreadsheets.values.append({
            auth: jwtClient,
            spreadsheetId: sheetid,
            range: _this.sheetname + "!" + '$A2:$' + ExcelColumn(values.length) + '2',
            valueInputOption: 'USER_ENTERED',
            resource: {
                majorDimension: 'ROWS',
                values: values
            }


        }, function(err, response) {
            if (err) {
                console.log(err);
                return;
            }
            if (callback) {
                callback();
            }
        });
    }

    this.update = function(data, callback) {
        if (sheetid && sheetid.length > 0 && data) {
            var reqdata = [];
            for (var c in data) {
                var col = ExcelColumn((_this.column.indexOf(data[c].cname) * 1) + 1);
                var r = data[c].row;
                var d = data[c].data;
                reqdata.push({
                    range: _this.sheetname + '!' + col + (r + 1) + ":" + col + (r + 1),
                    values: [
                        [d]
                    ]
                });
            }

            if (reqdata.length > 0) {
                googlesheets.spreadsheets.values.batchUpdate({
                    auth: jwtClient,
                    spreadsheetId: sheetid,
                    resource: {
                        valueInputOption: 'USER_ENTERED',
                        data: reqdata
                    }
                }, function(err, response) {
                    if (err) {
                        console.log(err);
                        return;
                    }
                    if (callback) {
                        callback();
                    }
                });
            }
        }
    }
}