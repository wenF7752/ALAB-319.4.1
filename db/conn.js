import "dotenv/config";
import { MongoClient } from "mongodb";

const connectionString = process.env.ATLAS_URI || "";

const client = new MongoClient(connectionString);

let conn;
try {
  conn = await client.connect();
  console.log("Connected to Mongo");
} catch (err) {
  console.log(err);
}

const db = await conn.db("perscholas");

async function createCollectionWithValidation() {
  try {
    await db.command({
      collMod: "grades", // If the collection already exists, this will modify it
      validator: {
        $jsonSchema: {
          bsonType: "object",
          required: ["class_id", "learner_id"],
          properties: {
            class_id: {
              bsonType: "int",
              minimum: 0,
              maximum: 300,
              description: "must be an integer between 0 and 300 and is required"
            },
            learner_id: {
              bsonType: "int",
              minimum: 0,
              description: "must be an integer greater than or equal to 0 and is required"
            }
          }
        }
      },
      validationLevel: "strict",
      validationAction: "warn" // Set validation action to "warn"
    });
    console.log("Validation rules with 'warn' action created on grades collection");
  } catch (error) {
    console.error("Error creating validation rules:", error);
  }
}

async function createIndexes() {
  try {
    const collection = db.collection("grades");

    // Create single-field index on class_id
    await collection.createIndex({ class_id: 1 });
    console.log("Index created on class_id");

    // Create single-field index on learner_id
    await collection.createIndex({ learner_id: 1 });
    console.log("Index created on learner_id");

    // Create compound index on learner_id and class_id (both ascending)
    await collection.createIndex({ learner_id: 1, class_id: 1 });
    console.log("Compound index created on learner_id and class_id");

  } catch (error) {
    console.error("Error creating indexes:", error);
  }
}

// Call the function to set validation rules and create indexes
createCollectionWithValidation();
createIndexes();

export default db;
