// mongo_native_example.js
const { MongoClient } = require('mongodb');

const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017';
const DB_NAME = 'exampledb';
const COLLECTION = 'users';

async function main() {
  const client = new MongoClient(MONGO_URI, { useUnifiedTopology: true });
  await client.connect();
  console.log('Connected to MongoDB');

  const db = client.db(DB_NAME);
  const users = db.collection(COLLECTION);

  // Ensure an index
  await users.createIndex({ email: 1 }, { unique: true });

  // Insert documents (create)
  const insertRes = await users.insertMany([
    { name: 'Alice', email: 'alice@example.com', age: 28, tags: ['admin'] },
    { name: 'Bob', email: 'bob@example.com', age: 34, tags: ['user'] },
  ]);
  console.log('Inserted:', insertRes.insertedCount);

  // Read (find)
  const adults = await users.find({ age: { $gte: 30 } }).toArray();
  console.log('Adults:', adults);

  // Update
  const updateRes = await users.updateOne(
    { email: 'bob@example.com' },
    { $set: { age: 35 }, $addToSet: { tags: 'premium' } }
  );
  console.log('Updated:', updateRes.modifiedCount);

  // Aggregation example — group by tag count
  const pipeline = [
    { $unwind: '$tags' },
    { $group: { _id: '$tags', count: { $sum: 1 } } },
    { $sort: { count: -1 } }
  ];
  const agg = await users.aggregate(pipeline).toArray();
  console.log('Tag counts:', agg);

  // Transaction example (requires replica set / Atlas)
  const session = client.startSession();
  try {
    session.startTransaction();
    await users.insertOne({ name: 'Charlie', email: 'charlie@example.com', age: 22 }, { session });
    await users.updateOne({ email: 'alice@example.com' }, { $inc: { age: 1 } }, { session });
    await session.commitTransaction();
    console.log('Transaction committed');
  } catch (err) {
    await session.abortTransaction();
    console.error('Transaction aborted', err);
  } finally {
    session.endSession();
  }

  // Delete
  const del = await users.deleteOne({ email: 'charlie@example.com' });
  console.log('Deleted:', del.deletedCount);

  await client.close();
  console.log('Connection closed');
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
