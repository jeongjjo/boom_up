var express = require('express');

var common = require('./common');

var async = require('async');
var fs = require('fs');

var path = require('path');
var pdf = require('html-pdf');
var ejs = require('ejs');

var optionsDefault = {
    "format": "A4",
    "orientation": "portrait",

    "margin": "0",

    "border": "0",

    "border": {
        "top": "0",
        "right": "0",
        "left": "0",
        "bottom": "0"
    },

    "zoomFactor": "1",

    "type": "pdf",
    "quality": "75"
};

function getRenderTemplate(areaName, templName, req) {
    return new Promise((resolove, reject) => {
        async.waterfall([(callback) => {
            console.log('prepare data');
            // db query result
            var pdfTemplateBinder = require('../pdfmodule/' + areaName + '/' + templName + '.js');
            pdfTemplateBinder.getData(req, callback);
        }, (data, callback) => {
            callback(null, Object.assign(data, {
                templateurl: global.config.templateurl
            }));
        }, (data, callback) => {
            var oFile = './pdftemplate/' + areaName + '/' + (req.locale ? req.locale + '/' : '') + templName + '.ejs';
            if (!fs.existsSync(oFile)) {
                oFile = './pdftemplate/' + areaName + '/' + templName + '.ejs';
            }
            console.log('prepare html', oFile);
            ejs.renderFile(oFile, Object.assign({}, data, common, {
                serviceinfo: global.config.serviceinfo
            }), callback);
        }], (err, template) => {
            resolove({err: err, template: template});
        });
    });
}

function getPDF(areaName, templName, req, next) {
    async.waterfall([(callback) => {
        console.log('prepare data');
        // db query result
        var pdfTemplateBinder = require('../pdfmodule/' + areaName + '/' + templName + '.js');
        pdfTemplateBinder.getData(req, callback);
    }, (arg, callback) => {
        callback(null, Object.assign(arg, {
            templateurl: global.config.templateurl
        }));
    }, (arg, callback) => {
        var oFile = './pdftemplate/' + areaName + '/' + (req.locale ? req.locale + '/' : '') + templName + '.ejs';
        if (!fs.existsSync(oFile)) {
            oFile = './pdftemplate/' + areaName + '/' + templName + '.ejs';
        }
        console.log('prepare html', oFile);
        ejs.renderFile(oFile, Object.assign({}, arg, common, {
            serviceinfo: global.config.serviceinfo
        }), callback);
    }, (html, callback) => {
        console.log('render pdf');
        var temppdffile = path.join(global.config.temppath, 'temp_' + process.pid + '_' + (new Date()).getTime() + '.pdf');
        var oFile = './pdftemplate/' + areaName + '/' + (req.locale ? req.locale + '/' : '') + templName + '.json';
        if (!fs.existsSync(oFile)) {
            oFile = './pdftemplate/' + areaName + '/' + templName + '.json';
        }
        var templateOptions = Object.assign({},
            JSON.parse(fs.readFileSync(oFile)), {
                base: global.config.templateurl
            });
        var pdfOptions = Object.assign({}, optionsDefault, templateOptions);

        var page = pdf.create(html, pdfOptions);
        page.toFile(temppdffile, callback);
    }], next);
}
module.exports = {
    getRenderTemplate: getRenderTemplate,
    getPDF: getPDF
}