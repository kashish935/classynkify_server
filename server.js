import dns from 'node:dns/promises';

// Override system DNS with Google and Cloudflare

// ... now import your express, mongoose, and connectDB
import app from "./src/app.js";
import connectDB from "./src/config/db.js";
import dotenv from "dotenv";

dns.setServers(['8.8.8.8', '1.1.1.1']);
dotenv.config();

connectDB();

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});