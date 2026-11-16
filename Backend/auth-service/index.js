require('dotenv').config({ override: true });

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
const userPositionRoutes = require('./routes/userPosition.routes');
const statutoryInfoRoutes = require('./routes/statutoryInfo.routes');
const userAccountRoutes = require('./routes/userAccount.routes');
const userNomineeRoutes = require('./routes/userNominee.routes');
const userDocumentRoutes = require('./routes/userDocument.routes');
const userEmailRoutes = require('./routes/userEmail.routes');
const userQualificationRoutes = require('./routes/userQualification.routes');
const userAssetRoutes = require('./routes/userAsset.routes');
const designationRoutes = require('./routes/designation.routes');
const companyAssetRoutes = require('./routes/companyAsset.routes');
const assetRoutes = require('./routes/asset.routes');
const assetDetailRoutes = require('./routes/assetDetail.routes');
const promotionRoutes = require('./routes/promotion.routes');
const announcementRoutes = require('./routes/announcement.routes');

const app = express();

app.use(helmet());
app.use(cors({ origin: '*', credentials: true }));
app.use(express.json({ limit: '15mb' }));
app.use(express.urlencoded({ extended: true, limit: '15mb' }));


// Express Routes
app.use('/companyasset', companyAssetRoutes);
app.use('/api/companyasset', companyAssetRoutes);
app.use('/asset', assetRoutes);
app.use('/api/asset', assetRoutes);
app.use('/assetDetails', assetDetailRoutes);
app.use('/api/assetDetails', assetDetailRoutes);
app.use('/designation', designationRoutes);
app.use('/api/designation', designationRoutes);
app.use('/api/designations', designationRoutes);

// User sub-resource prefixed routes
app.use(['/personal', '/userpersonal', '/userPersonal', '/api/userPersonal'], userPersonalRoutes);
app.use(['/position', '/userposition', '/userPosition', '/api/userPosition'], userPositionRoutes);
app.use(['/statutoryinfo', '/statutory', '/api/statutoryinfo'], statutoryInfoRoutes);
app.use(['/account', '/useraccount', '/userAccount', '/api/userAccount'], userAccountRoutes);
app.use(['/nominee', '/usernominee', '/userNominee', '/api/userNominee'], userNomineeRoutes);
app.use(['/document', '/userdocument', '/userDocument', '/api/userDocument'], userDocumentRoutes);
app.use(['/qualification', '/userqualification', '/userQualification', '/api/userQualification'], userQualificationRoutes);
app.use(['/promotion', '/api/promotion'], promotionRoutes);
app.use(['/announcements', '/api/announcements'], announcementRoutes);
app.use(['/team', '/teams', '/api/team', '/api/teams'], teamRoutes);
app.use(['/notification', '/notifications', '/api/notification', '/api/notifications'], notificationRoutes);

// Root fallback routes
app.use('/', authRoutes);
app.use('/', roleRoutes);
app.use('/', userPersonalRoutes);
app.use('/', userPositionRoutes);
app.use('/', statutoryInfoRoutes);
app.use('/', userAccountRoutes);
app.use('/', userNomineeRoutes);
app.use('/', userDocumentRoutes);
app.use('/', userEmailRoutes);
app.use('/', userQualificationRoutes);
app.use('/', userAssetRoutes);

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

process.on('uncaughtException', err => {
  console.error('Uncaught Exception:', err);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
});