require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { createProxyMiddleware } = require('http-proxy-middleware');

const app = express();

const allowedOrigins = [
  'https://oacnew.aerohr.in',
  'https://oac.aerohr.in',
  'http://localhost:4200',
  'http://localhost:3000',
  process.env.FRONTEND_URL
].filter(Boolean);

app.use(cors({
  origin: (origin, callback) => {
    if (!origin) return callback(null, true);
    if (
      allowedOrigins.includes(origin) ||
      /\.aerohr\.in$/.test(origin.replace(/^https?:\/\//, '').split(':')[0]) ||
      /^http:\/\/localhost(:\d+)?$/.test(origin)
    ) {
      return callback(null, true);
    }
    return callback(null, true);
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept', 'Origin']
}));

// SERVICES
const AUTH_URL = process.env.AUTH_SERVICE_URL || 'http://localhost:4001';
const LEAVE_URL = process.env.LEAVE_SERVICE_URL || 'http://localhost:4002';
const EXPENSE_URL = process.env.EXPENSE_SERVICE_URL || 'http://localhost:4003';
const PAYROLL_URL = process.env.PAYROLL_SERVICE_URL || 'http://localhost:4004';
const INVOICE_URL = process.env.INVOICE_SERVICE_URL || 'http://localhost:8000';

// Microservice auto-launcher & health checking
const { spawn } = require('child_process');
const path = require('path');
const net = require('net');

const services = ['auth-service', 'leave-service', 'expense-service', 'payroll-service'];
const servicePorts = {
  'auth-service': 4001,
  'leave-service': 4002,
  'expense-service': 4003,
  'payroll-service': 4004
};
const children = [];
const startingServices = new Set();

function checkAndStartService(service, port) {
  if (process.env.AUTO_LAUNCH_SERVICES === 'false') return;
  if (startingServices.has(service)) return;
  const socket = new net.Socket();
  let finished = false;

  const launch = () => {
    if (finished) return;
    finished = true;
    socket.destroy();
    startingServices.add(service);

    const servicePath = path.join(__dirname, service);
    console.log(`⚡ Launching ${service} on port ${port}...`);
    const child = spawn('npm', ['run', 'dev'], {
      cwd: servicePath,
      stdio: 'inherit',
      shell: true
    });

    child.on('error', (err) => {
      console.error(`Failed to start ${service}:`, err);
      startingServices.delete(service);
    });

    child.on('exit', () => {
      startingServices.delete(service);
    });

    children.push(child);
  };

  socket.setTimeout(1200);
  socket.on('connect', () => {
    finished = true;
    socket.destroy();
    console.log(`ℹ️ ${service} is already active on port ${port}`);
  });

  socket.on('error', launch);
  socket.on('timeout', launch);
  socket.connect(port, '127.0.0.1');
}

// Normalize duplicate slashes in URL (e.g. /api//designation -> /api/designation)
app.use((req, res, next) => {
  req.url = req.url.replace(/\/{2,}/g, '/');
  next();
});

// AUTH SERVICE
app.use('/api/auth', createProxyMiddleware({
  target: AUTH_URL,
  changeOrigin: true,
  pathRewrite: {
    '^/api/auth': ''
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

// DESIGNATION SERVICE INSIDE AUTH
app.use('/api/designation', createProxyMiddleware({
  target: AUTH_URL,
  changeOrigin: true,
  pathRewrite: (path) => {
    return '/designation' + (path.startsWith('/') ? path : '/' + path);
  }
}));

// PROMOTION SERVICE INSIDE AUTH
app.use('/api/promotion', createProxyMiddleware({
  target: AUTH_URL,
  changeOrigin: true,
  pathRewrite: (path) => {
    return '/promotion' + (path.startsWith('/') ? path : '/' + path);
  }
}));

// COMPANY ASSET SERVICE INSIDE AUTH
app.use('/api/companyasset', createProxyMiddleware({
  target: AUTH_URL,
  changeOrigin: true,
  pathRewrite: (path) => {
    return '/companyasset' + (path.startsWith('/') ? path : '/' + path);
  }
}));

// ASSET SERVICE (USER ASSETS) INSIDE AUTH
app.use('/api/asset', createProxyMiddleware({
  target: AUTH_URL,
  changeOrigin: true,
  pathRewrite: (path) => {
    return '/asset' + (path.startsWith('/') ? path : '/' + path);
  }
}));

// ASSET DETAILS INSIDE AUTH
app.use('/api/assetDetails', createProxyMiddleware({
  target: AUTH_URL,
  changeOrigin: true,
  pathRewrite: (path) => {
    return '/assetDetails' + (path.startsWith('/') ? path : '/' + path);
  }
}));

// TEAM
app.use(['/api/team', '/api/teams'], createProxyMiddleware({
  target: AUTH_URL,
  changeOrigin: true,
  pathRewrite: (path) => {
    const cleanPath = path && path !== '/' ? (path.startsWith('/') ? path : '/' + path) : '';
    return '/team' + cleanPath;
  }
}));

// NOTIFICATION
app.use(['/api/notification', '/api/notifications'], createProxyMiddleware({
  target: AUTH_URL,
  changeOrigin: true,
  pathRewrite: (path) => {
    const cleanPath = path && path !== '/' ? (path.startsWith('/') ? path : '/' + path) : '';
    return '/notification' + cleanPath;
  }
}));

// ANNOUNCEMENTS
app.use('/api/announcements', createProxyMiddleware({
  target: AUTH_URL,
  changeOrigin: true,
  pathRewrite: (path) => {
    return '/announcements' + (path.startsWith('/') ? path : '/' + path);
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

app.use(['/api/leaveType', '/api/leaveTypes'], createProxyMiddleware({
  target: LEAVE_URL,
  changeOrigin: true,
  pathRewrite: (path) => {
    const cleanPath = path && path !== '/' ? (path.startsWith('/') ? path : '/' + path) : '';
    return '/leaveType' + cleanPath;
  }
}));


// PAYROLL SERVICE
app.use('/api/payroll', createProxyMiddleware({
  target: PAYROLL_URL,
  changeOrigin: true,
  pathRewrite: (path) => {
    return '/payroll' + (path.startsWith('/') ? path : '/' + path);
  }
}));

app.use(['/api/payrolllog', '/api/payrollLog', '/payrolllog'], createProxyMiddleware({
  target: PAYROLL_URL,
  changeOrigin: true,
  pathRewrite: (path) => {
    const cleanPath = path && path !== '/' ? (path.startsWith('/') ? path : '/' + path) : '';
    return '/payrolllog' + cleanPath;
  }
}));

const expenseProxyOptions = {
  target: EXPENSE_URL,
  changeOrigin: true,
  on: {
    error: (err, req, res) => {
      console.error(`[Expense Proxy Error] Failed to proxy ${req.url} to ${EXPENSE_URL}:`, err.message);
      checkAndStartService('expense-service', 4003);
      if (req.method === 'GET') {
        if (req.url && (req.url.includes('balance') || req.url.includes('user/'))) {
          return res.status(200).json({ success: true, data: { balance: 0 } });
        }
        return res.status(200).json({ success: true, count: 0, data: [], items: [] });
      }
      res.status(503).json({ success: false, message: 'Expense service is starting up, please try again in a few moments.' });
    }
  }
};

app.use(['/api/expense', '/api/expenses'], createProxyMiddleware({
  ...expenseProxyOptions,
  pathRewrite: (path) => {
    return path && path !== '/' ? (path.startsWith('/') ? path : '/' + path) : '';
  }
}));

app.use(['/api/pettycash', '/api/petty-cash'], createProxyMiddleware({
  ...expenseProxyOptions,
  pathRewrite: (path) => {
    return '/petty-cash' + (path && path !== '/' ? (path.startsWith('/') ? path : '/' + path) : '');
  }
}));

// ADDITIONAL ROUTES
app.use(['/api/holiday', '/api/holidays'], createProxyMiddleware({
  target: LEAVE_URL,
  changeOrigin: true,
  pathRewrite: (path) => {
    const cleanPath = path && path !== '/' ? (path.startsWith('/') ? path : '/' + path) : '';
    return '/holiday' + cleanPath;
  }
}));

app.use(['/api/advanceSalary', '/advanceSalary'], createProxyMiddleware({
  target: PAYROLL_URL,
  changeOrigin: true,
  pathRewrite: (path) => {
    const cleanPath = path && path !== '/' ? (path.startsWith('/') ? path : '/' + path) : '';
    return '/api/advanceSalary' + cleanPath;
  }
}));

app.use(['/api/monthlypayroll', '/api/monthlyPayroll', '/monthlypayroll', '/monthlyPayroll'], createProxyMiddleware({
  target: PAYROLL_URL,
  changeOrigin: true,
  pathRewrite: (path) => {
    const cleanPath = path && path !== '/' ? (path.startsWith('/') ? path : '/' + path) : '';
    return '/monthlypayroll' + cleanPath;
  }
}));

app.use(['/api/userPersonal', '/api/personal'], createProxyMiddleware({
  target: AUTH_URL,
  changeOrigin: true,
  pathRewrite: { '^/api/(userPersonal|personal)': '/personal' }
}));

app.use(['/api/userPosition', '/api/position'], createProxyMiddleware({
  target: AUTH_URL,
  changeOrigin: true,
  pathRewrite: { '^/api/(userPosition|position)': '/position' }
}));

app.use(['/api/statutoryinfo', '/api/statutory'], createProxyMiddleware({
  target: AUTH_URL,
  changeOrigin: true,
  pathRewrite: { '^/api/(statutoryinfo|statutory)': '/statutoryinfo' }
}));

app.use(['/api/userAccount', '/api/account'], createProxyMiddleware({
  target: AUTH_URL,
  changeOrigin: true,
  pathRewrite: { '^/api/(userAccount|account)': '/account' }
}));

app.use(['/api/userNominee', '/api/nominee'], createProxyMiddleware({
  target: AUTH_URL,
  changeOrigin: true,
  pathRewrite: { '^/api/(userNominee|nominee)': '/nominee' }
}));

app.use(['/api/userDocument', '/api/document'], createProxyMiddleware({
  target: AUTH_URL,
  changeOrigin: true,
  pathRewrite: { '^/api/(userDocument|document)': '/document' }
}));

app.use('/api/userEmail', createProxyMiddleware({
  target: AUTH_URL,
  changeOrigin: true,
  pathRewrite: { '^/api/userEmail': '/userEmail' }
}));

app.use(['/api/userQualification', '/api/qualification'], createProxyMiddleware({
  target: AUTH_URL,
  changeOrigin: true,
  pathRewrite: { '^/api/(userQualification|qualification)': '/qualification' }
}));

app.use('/api/userAsset', createProxyMiddleware({
  target: AUTH_URL,
  changeOrigin: true,
  pathRewrite: { '^/api/userAsset': '/userAsset' }
}));

// INVOICE & PERFORMA INVOICE ROUTES
const invoiceProxyOptions = {
  target: INVOICE_URL,
  changeOrigin: true,
  on: {
    error: (err, req, res) => {
      // Graceful fallback if invoice service is offline or not yet ported
      if (req.method === 'GET') {
        if (req.url.includes('findcount')) {
          return res.status(200).json({ count: 0 });
        }
        return res.status(200).json({ count: 0, items: [] });
      }
      res.status(503).json({ success: false, message: 'Invoice service unavailable' });
    }
  }
};

app.use(['/api/performaInvoice', '/api/performaInvoices'], createProxyMiddleware({
  ...invoiceProxyOptions,
  pathRewrite: (path) => {
    return '/performaInvoice' + (path.startsWith('/') ? path : '/' + path);
  }
}));

app.use(['/api/invoiceStatus', '/api/invoiceStatuses'], createProxyMiddleware({
  ...invoiceProxyOptions,
  pathRewrite: (path) => {
    return '/invoiceStatus' + (path.startsWith('/') ? path : '/' + path);
  }
}));

app.use(['/api/invoice', '/api/invoices'], createProxyMiddleware({
  ...invoiceProxyOptions,
  pathRewrite: (path) => {
    return '/invoice' + (path.startsWith('/') ? path : '/' + path);
  }
}));

app.use(['/api/excelLog', '/api/excelLogs'], createProxyMiddleware({
  ...invoiceProxyOptions,
  pathRewrite: (path) => {
    return '/excelLog' + (path.startsWith('/') ? path : '/' + path);
  }
}));

app.use(['/api/company', '/api/companies'], createProxyMiddleware({
  ...invoiceProxyOptions,
  pathRewrite: (path) => {
    return '/company' + (path.startsWith('/') ? path : '/' + path);
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

// Automatically start all microservices
services.forEach(service => {
  checkAndStartService(service, servicePorts[service]);
});

// Cleanup child processes on exit
const cleanup = () => {
  children.forEach(child => child.kill());
  process.exit();
};

process.on('SIGINT', cleanup);
process.on('SIGTERM', cleanup);
