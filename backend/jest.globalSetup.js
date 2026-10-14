// One in-memory MongoDB replica set for the whole run (transactions need a
// replica set, like production). Starting one per test file timed out under
// parallel load. Each test file still gets its own database: see
// src/tests/integration/setup/testDB.ts.
const { MongoMemoryReplSet } = require("mongodb-memory-server");

module.exports = async () => {
  const replSet = await MongoMemoryReplSet.create({ replSet: { count: 1, storageEngine: "wiredTiger" } });
  globalThis.__MONGO_REPLSET__ = replSet;
  process.env.MONGO_TEST_URI = replSet.getUri();
};
