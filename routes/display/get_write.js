var common = require('../../module/common');
var db = require("../../module/dao/DB");
module.exports = [null, null, async function (req, res, next) {
    res.render('display/write', {
        title: "전광판"
    });
}];