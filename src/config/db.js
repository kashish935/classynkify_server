import mongoose from "mongoose";
import { backfillEnrollments } from "../modules/enrollment/enrollment.service.js";

const connectDB = async () => {
  try {
    const conn = await mongoose.connect(process.env.MONGO_URI);

    console.log(`MongoDB Connected: ${conn.connection.host} ✅`);

    // One-time safety net: create Enrollment records for students who were
    // already in Course.enrolledStudents. Safe to run on every start.
    await backfillEnrollments();
  } catch (err) {
    console.error(`Error: ${err.message}`);
    // Exit process with failure
    process.exit(1);
  }
};

export default connectDB;
