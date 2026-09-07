require('dotenv').config();

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');

// IMPORTANT: Require models to execute association setup before syncing
require('./models'); 

const { connectDB } = require('./config/database');
const initializeSystem = require('./models/initializeSystem');

// Routes
const authRoutes = require('./routes/auth.routes');
const roleRoutes = require('./routes/role.routes');
const teamRoutes = require('./routes/team.routes');
const notificationRoutes = require('./routes/notification.routes');
const userPersonalRoutes = require('./routes/userPersonal.routes');
const userAccountRoutes = require('./routes/userAccount.routes');
const userEmailRoutes = require('./routes/userEmail.routes');
const userQualificationRoutes = require('./routes/userQualification.routes');
const userAssetRoutes = require('./routes/userAsset.routes');

const app = express();

app.use(helmet());
app.use(cors({ origin: '*', credentials: true }));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Express Routes
app.use('/', authRoutes);
app.use('/', roleRoutes);
app.use('/', userPersonalRoutes);
app.use('/', userAccountRoutes);
app.use('/', userEmailRoutes);
app.use('/', userQualificationRoutes);
app.use('/', userAssetRoutes);
app.use('/', teamRoutes);
app.use('/', notificationRoutes);

// Health check
app.get('/health', (req, res) => {
  res.json({ success: true, service: 'Auth Service' });
});

const PORT = process.env.PORT || 4001;

// Start Server after Database Sync and Initialization
connectDB().then(async () => {
  await initializeSystem();
  app.listen(PORT, () => {
    console.log(`🚀 Auth Service running on ${PORT}`);
  });
});