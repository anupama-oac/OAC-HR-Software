
require('dotenv').config({ override: true });
const express = require('express');
const app = express();
const cors = require('cors');
const helmet = require('helmet');
const { connectDB } = require('./config/database');
require('./models');


const leaveRoutes = require('./routes/leave.routes');
// const compOffRoutes = require('./routes/compOff.routes');
const holidayRoutes = require('./routes/holiday.routes');
const leaveTypeRoutes = require('./routes/leaveType.routes');
const userLeaveRoutes = require('./routes/userLeave.routes');


app.use(helmet());


app.use(cors({
  origin: true,
  credentials: true
}));


app.use(express.json());
app.use(express.urlencoded({ extended: true }));




// ROUTES
app.use(['/holiday', '/holidays'], holidayRoutes);
app.use(['/leaveType', '/leaveTypes'], leaveTypeRoutes);
app.use(['/userLeave', '/userLeaves'], userLeaveRoutes);
app.use(['/leave', '/leaves'], leaveRoutes);
app.use('/', leaveRoutes);
app.use('/', leaveTypeRoutes);
app.use('/', userLeaveRoutes);

// HEALTH
app.get('/health', (req, res) => {
  res.json({
    success: true,
    service: 'Leave Service'
  });
});


// 404 Not FOUND
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




const PORT = process.env.PORT || 4002;

connectDB().then(() => {
  app.listen(PORT, () => {
    console.log(`🚀 Leave Service running on ${PORT}`);
  });
});

process.on('uncaughtException', err => {
  console.error('Uncaught Exception:', err);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
});







