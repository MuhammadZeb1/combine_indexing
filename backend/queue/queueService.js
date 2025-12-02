const { Queue } = require("bullmq");
require("dotenv").config({ path: __dirname + "/../.env" }); // adjust path if needed
console.log("DOTENV VARIABLES:", process.env.GOOGLE_PROJECT_ID, process.env.GOOGLE_CLIENT_EMAIL, process.env.GOOGLE_PRIVATE_KEY ? "OK" : "MISSING");

// NOTE: Redis must be running on this host/port!
// const connection = { host: '127.0.0.1', port: 6379 };
const connection = {
  host: process.env.REDIS_HOST, // e.g., becoming-giraffe-12886.upstash.io
  
  port: parseInt(process.env.REDIS_PORT), // 6379
  password: process.env.REDIS_PASSWORD,
  tls: true, // Upstash requires TLS
};
console.table(connection)

// Create and export the indexing queue instance
exports.indexingQueue = new Queue("indexingQueue", { connection });

console.log("BullMQ Queue initialized.");
