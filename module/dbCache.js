
async function waitForDelay(timeout) { await (new Promise((resolve, reject) => { setTimeout(() => { resolve(); }, timeout); })); }

module.exports = {
    clear: function (cid) {

    },
    get: async function (cid, dataFetchFunction) {
        var result = typeof dataFetchFunction === 'function' ? await dataFetchFunction() : null;
        return result;
    }
};
