import { config } from "dotenv";
config(); // ← must be first, before all other imports

import dns from 'node:dns/promises';
import app from "./src/app.js";
import connectDB from "./src/config/db.js";

dns.setServers(['8.8.8.8', '1.1.1.1']);

connectDB();

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});