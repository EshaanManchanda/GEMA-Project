import mongoose from "mongoose";
import { config } from "./src/config/env";
import { User } from "./src/models/User";

(async () => {
  await mongoose.connect(config.database.uri);
  const vendor = await User.findOne({ role: "vendor" }).select("+passwordHash").lean();
  if (!vendor) {
    console.log("NO_VENDOR_FOUND");
  } else {
    console.log(JSON.stringify({
      id: vendor._id,
      email: vendor.email,
      role: vendor.role,
      status: vendor.status,
      tokenVersion: (vendor as any).tokenVersion,
    }));
  }
  await mongoose.disconnect();
  process.exit(0);
})();
