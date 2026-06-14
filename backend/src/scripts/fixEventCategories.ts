import mongoose from "mongoose";
import dotenv from "dotenv";
import path from "path";
import Event from "../models/Event";
import Collection from "../models/Collection";
import logger from "../config/logger";

dotenv.config({ path: path.join(__dirname, "../../.env") });

const fixCategories = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI as string);
    console.log("Connected to MongoDB");

    const events = await Event.find({});
    let fixed = 0;
    
    for (const event of events) {
      if (event.category && event.category.includes("-")) {
        const oldCategory = event.category;
        let newCategory = oldCategory;
        
        // Specific known fixes based on the website's structure
        if (oldCategory === "museum-culture") newCategory = "Museum & Culture";
        else if (oldCategory === "courses-camps-workshops") newCategory = "Courses, Camps & Workshops";
        else if (oldCategory === "health-wellness") newCategory = "Health & Wellness";
        else {
          // General fallback: replace hyphens with spaces and capitalize words
          newCategory = oldCategory.replace(/-/g, " ");
          newCategory = newCategory.split(" ").map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(" ");
        }
        
        event.category = newCategory;
        await event.save();
        console.log(`Updated Event: ${oldCategory} -> ${newCategory}`);
        fixed++;
      }
    }
    console.log(`\nFixed ${fixed} event categories.`);

    // Wait, let's also fix Collection categories just in case
    const collections = await Collection.find({});
    let fixedCollections = 0;
    for (const collection of collections) {
      if (collection.category && collection.category.includes("-")) {
        const oldCategory = collection.category;
        let newCategory = oldCategory;
        
        if (oldCategory === "museum-culture") newCategory = "Museum & Culture";
        else if (oldCategory === "courses-camps-workshops") newCategory = "Courses, Camps & Workshops";
        else if (oldCategory === "health-wellness") newCategory = "Health & Wellness";
        else {
          newCategory = oldCategory.replace(/-/g, " ");
          newCategory = newCategory.split(" ").map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(" ");
        }
        
        collection.category = newCategory;
        await collection.save();
        console.log(`Updated Collection Category: ${oldCategory} -> ${newCategory}`);
        fixedCollections++;
      }
    }
    console.log(`Fixed ${fixedCollections} collection categories.`);

    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
};

fixCategories();
