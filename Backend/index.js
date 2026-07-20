require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { createProxyMiddleware } = require('http-proxy-middleware');

const app = express();

app.use(cors({
  origin: 'http://localhost:4200',
  credentials: true
}));

// SERVICES
const AUTH_URL = process.env.AUTH_SERVICE_URL || 'http://localhost:4001';
const LEAVE_URL = process.env.LEAVE_SERVICE_URL || 'http://localhost:4002';
const PAYROLL_URL = process.env.PAYROLL_SERVICE_URL || 'http://localhost:4003';

// AUTH SERVICE
app.use('/api/auth', createProxyMiddleware({
  target: AUTH_URL,
  changeOrigin: true,
  pathRewrite: {
    '^/api/auth': '/auth'
  }
}));


// ROLE SERVICE INSIDE AUTH
app.use('/api/role', createProxyMiddleware({
  target: AUTH_URL,
  changeOrigin: true,
  pathRewrite: {
    '^/api/role': '/role'
  }
}));

// TEAM
app.use('/api/team', createProxyMiddleware({
  target: AUTH_URL,
  changeOrigin: true,
  pathRewrite: {
    '^/api/team': '/team'
  }
}));

// NOTIFICATION
app.use('/api/notification', createProxyMiddleware({
  target: AUTH_URL,
  changeOrigin: true,
  pathRewrite: {
    '^/api/notification': '/notification'
  }
}));

// Inside API Gateway
app.use('/api/leave', createProxyMiddleware({
  target: LEAVE_URL, 
  changeOrigin: true,
    pathRewrite: {
    '^/api/leave': '/leave'
  }

}));

// Inside your API Gateway code:
app.use('/api/userLeave', createProxyMiddleware({
  target: LEAVE_URL,
  changeOrigin: true,
  pathRewrite: { '^/api/userLeave': '/userLeave' }
}));

app.use('/api/leaveType', createProxyMiddleware({
  target: LEAVE_URL,
  changeOrigin: true,
  pathRewrite: { '^/api/leaveType': '/leaveType' }
}));


// PAYROLL SERVICE
app.use('/api/payroll', createProxyMiddleware({
  target: PAYROLL_URL,
  changeOrigin: true,
  pathRewrite: {
    '^/api/payroll': '/payroll'
  }
}));

// HEALTH
app.get('/health', (req, res) => {
  res.json({
    success: true,
    message: 'API Gateway Running'
  });
});

// 404
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: 'Route not found'
  });
});

const PORT = process.env.PORT || 4000;

app.listen(PORT, () => {
  console.log(`🚀 API Gateway running on ${PORT}`);
});

