var common = require('../common');
var mongodb = require('../mongodb');

module.exports = {
    /* 기본 select */
    getByUserId: async function (userid) {
        try {
            var user = await mongodb.db('user').findOne({
                _id: userid
            });
            return user || null;
        } catch (e) {
            console.error(e);
            return null;
        }
    },
    get: async function (where) {
         try {
             var user = await mongodb.db('User').findOne(where);
            return user || null;
         } catch (e) {
             console.error(e);
             return null;
         }
     },
    /* 기본 select list */
    getList: async function (where, skip, limit, sort) {
        try {
            var coll = mongodb.db('user');

            where && coll.find(where);
            skip && coll.skip(skip);
            limit && coll.limit(limit)
            sort && coll.sort(sort);

            var list = coll.toArray();
            return coll || [];
        } catch (e) {
            console.error(e);
            return [];
        }
    },
    /* 기본 insert */
    insert: async function (user) {
        try {
            var result = await mongodb.db('user').insertOne(user);

            return result && result.insertedCount == 1;
        } catch (e) {
            console.error(e);
        }
        return false;
    },
    /* 기본 update */
    // updateByUserId: async function (userid, updateData, updateOption) {
    //     try {
    //         var result = await mongodb.db('user').updateOne({_id:userid}, updateData, updateOption);

    //         return result && result.modifiedCount === 1;
    //     } catch (e) {
    //         console.error(e);
    //     }
    //     return false;
    // },
    updateByUserId: async function (userid, updateData, updateOption) {
        try {
            var result = await mongodb.db('user').findOneAndUpdate({
                _id: userid
            }, updateData, updateOption);

            return result && result.value ? result.value : null;
        } catch (e) {
            console.error(e);
        }
        return null;
    },
    /* 기본 delete */
    deleteById: async function (userid) {
        try {
            var result = await mongodb.db('user').deleteOne({
                _id: userid
            });

            return result && result.deletedCount > 0;
        } catch (e) {
            console.error(e);
        }
        return false;
    }
};