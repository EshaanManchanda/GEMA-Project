import mongoose from "mongoose";
import dotenv from "dotenv";
import { Order, Event, Vendor, Teacher } from "./src/models/index";

dotenv.config();

async function run() {
  await mongoose.connect(process.env.MONGODB_URI || "mongodb://localhost:27017/kidrove");
  console.log("Connected to MongoDB");

  const orderId = "6a758d1b78ad5cc0dc73c579";
  const order = await Order.findById(orderId).populate("items.eventId");
  
  if (!order) {
    console.log("Order not found");
    process.exit(0);
  }

  const event: any = order.items[0]?.eventId;
  console.log("Event:", JSON.stringify(event, null, 2));
  
  if (event?.vendorId) {
    const vendor = await Vendor.findById(event.vendorId);
    console.log("Vendor found:", !!vendor);
  }
  
  if (event?.teacherId) {
    const teacher = await Teacher.findById(event.teacherId);
    console.log("Teacher found:", !!teacher);
  }

  process.exit(0);
}

run();
