import mongoose from "mongoose";
import dotenv from "dotenv";
import path from "path";
import fs from "fs";

dotenv.config({ path: path.join(__dirname, "../../.env") });

const seedJSON = async () => {
  try {
    const mongoUri = process.env.MONGODB_URI;
    if (!mongoUri)
      throw new Error("MONGODB_URI environment variable is not set");

    console.log("Connecting to MongoDB...");
    await mongoose.connect(mongoUri);
    const db = mongoose.connection.db;

    if (!db) {
      throw new Error("Database connection failed.");
    }

    const jsonPath = path.join(
      __dirname,
      "../../../../kidrove.seocontents.json",
    );
    console.log(`Reading JSON from: ${jsonPath}`);

    if (!fs.existsSync(jsonPath)) {
      throw new Error(`File not found at ${jsonPath}`);
    }

    const rawData = fs.readFileSync(jsonPath, "utf8");
    const documents = JSON.parse(rawData);

    // Prepare documents by converting MongoDB Extended JSON types manually if needed
    // In this case, since we are doing a raw insert via the native driver, we need to convert
    // the $oid strings to actual ObjectIds and $date strings to Date objects.

    const convertExtendedJson = (obj: any): any => {
      if (!obj || typeof obj !== "object") return obj;

      if (Array.isArray(obj)) {
        return obj.map(convertExtendedJson);
      }

      if (obj.$oid) {
        return new mongoose.Types.ObjectId(obj.$oid);
      }

      if (obj.$date) {
        return new Date(obj.$date);
      }

      const converted: any = {};
      for (const [key, value] of Object.entries(obj)) {
        converted[key] = convertExtendedJson(value);
      }
      return converted;
    };

    const parsedDocuments = documents.map(convertExtendedJson);

    console.log(
      `Parsed ${parsedDocuments.length} documents. Clearing existing 'seocontents' collection...`,
    );
    const deleteResult = await db.collection("seocontents").deleteMany({});
    console.log(`Deleted ${deleteResult.deletedCount} existing documents.`);

    console.log("Inserting new documents...");
    const insertResult = await db
      .collection("seocontents")
      .insertMany(parsedDocuments);
    console.log(
      `Successfully inserted ${insertResult.insertedCount} documents!`,
    );
  } catch (error) {
    console.error("Error seeding JSON:", error);
  } finally {
    await mongoose.connection.close();
    console.log("MongoDB connection closed.");
    process.exit(0);
  }
};

seedJSON();
