require('dotenv').config();

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');

const authRoutes = require('./routes/auth.routes');
const roleRoutes = require('./routes/role.routes');
const teamRoutes = require('./routes/team.routes');
const notificationRoutes = require('./routes/notification.routes');

const app = express();

app.use(helmet());

app.use(cors({
  origin: '*',
  credentials: true
}));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ROUTES
app.use('/', authRoutes);

app.use('/', roleRoutes);

app.use('/', teamRoutes);

app.use('/', notificationRoutes);

// HEALTH
app.get('/health', (req, res) => {
  res.json({
    success: true,
    service: 'Auth Service'
  });
});

// 404
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

const PORT = process.env.PORT || 4001;

app.listen(PORT, () => {
  console.log(`🚀 Auth Service running on ${PORT}`);
});