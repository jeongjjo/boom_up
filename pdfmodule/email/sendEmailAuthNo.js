var mongodb = require('../../module/mongodb');

function getData(opt, callback) {
    callback(null, opt);
}

module.exports = {
    getData: getData
};