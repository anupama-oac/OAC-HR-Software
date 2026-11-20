require('dotenv').config({ override: true });
const express = require('express');
const app = express();
const cors = require('cors');
const helmet = require('helmet');
const { connectDB } = require('./config/database');

const expenseRoutes = require('./routes/expense.routes');
const pettyCashRoutes = require('./routes/pettyCash.routes');

// Connect to Database
connectDB().then(async () => {
  // DB initialized
  const PORT = process.env.PORT || 4003;
  app.listen(PORT, () => {
    console.log("1234567890987654321234567890");
    console.log(`🚀 Expense Service running on port ${PORT}`);
  });
}).catch(err => {
  console.error("Failed to connect to DB:", err);
});

app.use(helmet());

app.use(cors({
  origin: true,
  credentials: true
}));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Mount routes
app.use('/', expenseRoutes);
app.use('/petty-cash', pettyCashRoutes);

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({
    success: true,
    service: 'Expense Service'
  });
});

// 404 Route Not Found
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: 'Route not found'
  });
});

// Global Error Handler
app.use((err, req, res, next) => {
  res.status(err.status || 500).json({
    success: false,
    message: err.message
  });
});

process.on('uncaughtException', err => {
  console.error('Uncaught Exception:', err);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
});
