// config/db.js
const mongoose = require('mongoose');
const path = require('path');

// Load .env from project root
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });

const mongoURI = process.env.MONGODB_URI;

if (!mongoURI) {
  console.error('❌ MONGODB_URI not defined. Check your .env file!');
  process.exit(1); // Stop execution
}

mongoose.connect(mongoURI)
.then(() => console.log('MongoDB connected ✅'))
.catch((err) => console.error('MongoDB connection error ❌', err));
