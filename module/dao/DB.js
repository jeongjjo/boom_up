var common = require("../common");
var mongodb = require("../mongodb");
var ObjectId = require("mongodb").ObjectId;

module.exports = {
  collection: function (db) {
    return mongodb.db(db);
  },
  /* 기본 select */
  get: async function (db, where) {
    if (!where) return null;

    try {
      var data = await mongodb.db(db).findOne(where);
      return data || null;
    } catch (e) {
      console.error(e);
      return null;
    }
  },
  getById: async function (db, _id, where) {
    if (!_id) return null;

    try {
      var wh = { _id: (typeof _id === 'string' ? ObjectId(_id) : _id) };
      if (where) {
        wh = Object.assign(wh, where);
      }
      var data = await mongodb.db(db).findOne(wh);
      return data || null;
    } catch (e) {
      console.error(e);
      return null;
    }
  },
  /* 기본 select list */
  getList: async function (db, where, skip, limit, sort) {
    try {
      var coll = mongodb.db(db).find(where || {});
      skip && coll.skip(skip);
      limit && coll.limit(limit);
      sort && coll.sort(sort);

      var list = await coll.toArray();
      return list || [];
    } catch (e) {
      console.error(e);
      return [];
    }
  },
  getListEx: async function (db, where, findOption, skip, limit, sort) {
    try {
      var coll = mongodb.db(db).find(where || {}, findOption);
      skip && coll.skip(skip);
      limit && coll.limit(limit);
      sort && coll.sort(sort);

      var list = await coll.toArray();
      return list || [];
    } catch (e) {
      console.error(e);
      return [];
    }
  },
  count: async function (db, where) {
    try {
      var db = mongodb.db(db);
      var result = await (db.countDocuments ? db.countDocuments(where) : db.count(where));

      return result || 0;
    } catch (e) {
      console.error(e);
    }
    return -1;
  },
  /* 기본 insert */
  insert: async function (db, data) {
    try {
      data.createTS = Date.now();
      var result = await mongodb.db(db).insertOne(data);

      return result && result.insertedCount === 1 && result.ops[0];
    } catch (e) {
      console.error(e);
    }
    return null;
  },
  insertMany: async function (db, data) {
    try {
      data.createTS = Date.now();
      var result = await mongodb.db(db).insertMany(data);

      return result && result.insertedCount === data.length && result.ops;
    } catch (e) {
      console.error(e);
    }
    return null;
  },
  updateById: async function (db, _id, updateData, updateOption) {
    if (!_id) return null;

    try {
      if (!updateData.$set) {
        updateData.$set = {};
      }
      updateData.$set.updateTS = Date.now();
      var result = await mongodb.db(db).findOneAndUpdate({ _id: (typeof _id === 'string' ? ObjectId(_id) : _id) }, updateData, Object.assign({ returnOriginal: false, upsert: false }, updateOption));

      return result && result.value ? result.value : null;
    } catch (e) {
      console.error(e);
    }
    return null;
  },
  update: async function (db, where, updateData, updateOption) {
    if (!where) return null;

    try {
      if (!updateData.$set) {
        updateData.$set = {};
      }
      updateData.$set.updateTS = Date.now();
      var result = await mongodb.db(db).findOneAndUpdate(where, updateData, Object.assign({ returnOriginal: false, upsert: false }, updateOption));

      return result && result.value ? result.value : null;
    } catch (e) {
      console.error(e);
    }
    return null;
  },
  updateMany: async function (db, where, updateData, updateOption) {
    if (!where) return false;

    try {
      if (!updateData.$set) {
        updateData.$set = {};
      }
      updateData.$set.updateTS = Date.now();

      var result = await mongodb.db(db).updateMany(where, updateData, Object.assign({ returnOriginal: false, upsert: false }, updateOption));

      return result && result.modifiedCount > 0;
    } catch (e) {
      console.error(e);
    }
    return false;
  } /* 기본 delete */,
  deleteById: async function (db, _id) {
    if (!_id) return false;

    try {
      var result = await mongodb.db(db).deleteOne({ _id: (typeof _id === 'string' ? ObjectId(_id) : _id) });

      return result && result.deletedCount > 0;
    } catch (e) {
      console.error(e);
    }
    return false;
  },
  deleteMany: async function (db, where) {
    if (!where) return false;

    try {
      var result = await mongodb.db(db).deleteMany(where);

      return result && result.deletedCount > 0;
    } catch (e) {
      console.error(e);
    }
    return false;
  },
  getAndDelete: async function (db, where, options) {
    if (!where) return null;

    try {
      var result = await mongodb.db(db).findOneAndDelete(where, options);

      return result.ok && result.value ? result.value : null;
    } catch (e) {
      console.error(e);
    }
    return null;
  }
};
