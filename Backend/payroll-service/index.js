/* eslint-disable no-undef */
/* eslint-disable @typescript-eslint/no-require-imports */
console.log("1111111111111111111111");

require('dotenv').config();
const express = require('express');
const app = express();
const cors = require('cors');
const helmet = require('helmet');
const { connectDB } = require('./config/database');

// 1. Import your advanceSalary routes file
const advanceSalaryRoutes = require('./routes/advanceSalary.routes');

// Connect to Database
connectDB().then(async () => {
  // await initializeSystem();
});

app.use(helmet());

app.use(cors({
  origin: '*',
  credentials: true
}));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// 2. Mount routes with the matching API base path
app.use('/api/advanceSalary', advanceSalaryRoutes);

// HEALTH
app.get('/health', (req, res) => {
  res.json({
    success: true,
    service: 'Payroll Service'
  });
});

// 404 NOT FOUND (Triggers if route does not exist)
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: 'Route not found'
  });
});

// ERROR HANDLER
app.use((err, req, res, next) => {
  res.status(err.status || 500).json({
    success: false,
    message: err.message
  });
});

const PORT = process.env.PORT || 4000; // Updated to port 4000 to match Angular environment.apiUrl

app.listen(PORT, () => {
  console.log(`🚀 Payroll Service running on ${PORT}`);
});