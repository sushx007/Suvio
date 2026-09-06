import { MongoClient } from 'mongodb';

const uri = process.env.MONGO_URL;
const dbName = process.env.DB_NAME;

if (!uri) {
  throw new Error('Missing required environment variable: MONGO_URL');
}
if (!dbName) {
  throw new Error('Missing required environment variable: DB_NAME');
}

let client;
let clientPromise;

if (!global._mongoClientPromise) {
  client = new MongoClient(uri);
  global._mongoClientPromise = client.connect();
}
clientPromise = global._mongoClientPromise;

export async function getDb() {
  const c = await clientPromise;
  return c.db(dbName);
}

export default clientPromise;
