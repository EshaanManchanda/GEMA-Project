import mongoose from "mongoose";
import dotenv from "dotenv";
import path from "path";

dotenv.config({ path: path.join(__dirname, "../../.env") });

const MONGODB_URI = process.env.MONGODB_URI || "mongodb://localhost:27017/gema";

const migrate = async () => {
  try {
    console.log("Connecting to MongoDB...");
    await mongoose.connect(MONGODB_URI);
    console.log("Connected.");

    const db = mongoose.connection.db;

    // Fix affiliate events stuck with 'not_claimable' default
    const result = await db
      .collection("events")
      .updateMany(
        { isAffiliateEvent: true, claimStatus: "not_claimable" },
        { $set: { claimStatus: "unclaimed" } },
      );

    console.log(
      `Updated ${result.modifiedCount} affiliate event(s) to claimStatus: 'unclaimed'`,
    );
  } catch (err) {
    console.error("Migration failed:", err);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
    console.log("Done.");
  }
};

migrate();
