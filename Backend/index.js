require('dotenv').config();
const express = require('express');
const { createProxyMiddleware } = require('http-proxy-middleware');
const cors = require('cors');
const { initScheduler } = require('./scheduler/backupTask');

const app = express();
app.use(cors({ origin: '*' }));
// app.use(cors({ 
//   origin: 'https://leeds.aeroassist.in', 
//   credentials: true 
// }));


app.use(cors({
  origin: 'http://localhost:4200', // Allow your Angular app
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  credentials: true
}));



// app.use(cors({
//   origin: 'http://localhost:4200',
//   credentials: true
// }));
const AUTH_URL = process.env.AUTH_SERVICE_URL || 'http://localhost:4001';
const LEAVE_URL = process.env.LEAVE_SERVICE_URL || 'http://localhost:4002';
const PAYROLL_URL = process.env.PAYROLL_SERVICE_URL || 'http://localhost:4003';


app.use((req, res, next) => {
  next();
});
app.use('/api/auth', createProxyMiddleware({ target: AUTH_URL,  changeOrigin: true,
    pathRewrite: {
      '^/api/auth': ''   // 🔥 REQUIRED
    }, timeout: 30000, proxyTimeout: 30000
  })
);


app.use('/api/notification', createProxyMiddleware({
  target: AUTH_URL,
  changeOrigin: true,
  // pathRewrite: {
  //   '^/api/notification': '/notification'
  // }
  pathRewrite: {
   '^/api/notification': '/api/notification'
}
}));
console.log('Notification Proxy Loaded');


app.use('/api/leave', createProxyMiddleware({ target: LEAVE_URL,  changeOrigin: true,
    pathRewrite: {
      '^/api/leave': ''   // 🔥 REQUIRED
    }, timeout: 30000, proxyTimeout: 30000
  })
);
app.use('/api/payroll', createProxyMiddleware({ target: PAYROLL_URL,  changeOrigin: true,
    pathRewrite: {
      '^/api/payroll': ''   // 🔥 REQUIRED
    }, timeout: 30000, proxyTimeout: 30000
  })
);


/**
 * ✅ Body parsing ONLY for non-proxied routes
 */
app.use(express.json());
app.use(express.urlencoded({ extended: true }));


app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: 'Route not found'
  });
});


/**
 * Health & test routes
 */
app.get('/health', (req, res) => {
  res.json({ status: 'API Gateway is running' });
});

app.get('/api/test', (req, res) => {
  res.json({ message: 'API Gateway is working!' });
});

const PORT = process.env.PORT || 3000;
initScheduler();
app.listen(PORT, () => {
  console.log(`🚀 API Gateway running at http://localhost:${PORT}`);
});
