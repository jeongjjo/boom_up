var common = require('../../module/common');

module.exports = [null, null, function (req, res, next) {
    res.render('home/index', {
        title: __('책임의 한계와 법적고지'),
        list: []
    });
}];