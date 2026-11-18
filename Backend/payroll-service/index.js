/* eslint-disable no-undef */
/* eslint-disable @typescript-eslint/no-require-imports */

require('dotenv').config({ override: true });
const express = require('express');
const app = express();
const cors = require('cors');
const helmet = require('helmet');
const { connectDB } = require('./config/database');

// 1. Import routes
const advanceSalaryRoutes = require('./routes/advanceSalary.routes');
const payrollRoutes = require('./routes/payroll.routes');
const monthlyPayrollRoutes = require('./routes/monthlyPayroll.routes');
const payrollLogController = require('./controllers/payrollLog.controller');

app.use(helmet());

app.use(cors({
  origin: '*',
  credentials: true
}));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// 2. Mount routes with the matching API base path
app.use(['/advanceSalary', '/api/advanceSalary'], advanceSalaryRoutes);
app.use(['/payroll', '/api/payroll'], payrollRoutes);
app.use(['/payrolllog', '/payrollLog', '/api/payrolllog', '/api/payrollLog'], payrollLogController);
app.use(['/monthlypayroll', '/monthlyPayroll', '/api/monthlypayroll', '/api/monthlyPayroll'], monthlyPayrollRoutes);

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

const PORT = process.env.PORT || 4004; // Updated to port 4004 to avoid conflict with API Gateway and Expense Service

connectDB().then(() => {
  app.listen(PORT, () => {
    console.log(`🚀 Payroll Service running on ${PORT}`);
  });
});

process.on('uncaughtException', err => {
  console.error('Uncaught Exception:', err);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
});
