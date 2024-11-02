import "dotenv/config"
import { MongoClient } from "mongodb";

const connectionString = process.env.ATLAS_URI || "";

const client = new MongoClient(connectionString);

let conn;
try {
  conn = await client.connect()
  console.log("Connected to Mongo")
} catch (err) {
  console.log(err)
}

const db = await conn.db("perscholas");

// console.log(db)

export default db