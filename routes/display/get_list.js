var common = require('../../module/common');
var db = require("../../module/dao/DB");
module.exports = ["/list/:type", null, async function (req, res, next) {


    var type = req.params.type
    var data = null;
    if (type == "my") {
        data = await db.getList("display", { userId: req.user._id.toHexString()});
    } else {
        data = await db.getList("display", {});
    }
    if(data && data != null) {
        for(var i = 0; i < data.length; i++) {
            data[i].start = moment(data[i].startDate).format('L');
            data[i].end = moment(data[i].endDate).format('L');
        }
    }
    
    res.render('display/item', {
        title: "전광판",
        data: data || null,
        type: type
    });
}];