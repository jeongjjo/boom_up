var common = require('../../module/common');

module.exports = [null, null, function (req, res, next) {
    res.render('home/index', {
        title: __('청소년보호정책')
    });
}];