
require('dotenv').config();
const express = require('express');
const app = express();
const cors = require('cors');
const helmet = require('helmet');
const { connectDB } = require('./config/database');


const leaveRoutes = require('./routes/leave.routes');
// const compOffRoutes = require('./routes/compOff.routes');
const holidayRoutes = require('./routes/holiday.routes');
const leaveTypeRoutes = require('./routes/leaveType.routes');
const userLeaveRoutes = require('./routes/userLeave.routes');


// connect to Database;
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




// ROUTES
app.use('/holiday', holidayRoutes);
app.use('/leave', leaveRoutes);
app.use('/leaveType', leaveTypeRoutes);
app.use('/userLeave', userLeaveRoutes);

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

app.listen(PORT, () => {
  console.log(`🚀 Leave Service running on ${PORT}`);
});









