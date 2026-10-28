const express = require('express');
const path = require('path');
const cors = require('cors');
const config = require('./config');
const { authenticateUser } = require('./middleware/auth');

// Route imports
const authRoutes = require('./routes/authRoutes');
const listingRoutes = require('./routes/listingRoutes');
const bookingRoutes = require('./routes/bookingRoutes');
const handoverRoutes = require('./routes/handoverRoutes');
const damageRoutes = require('./routes/damageRoutes');
const ledgerRoutes = require('./routes/ledgerRoutes');
const metricsRoutes = require('./routes/metricsRoutes');
const auditRoutes = require('./routes/auditRoutes');

const app = express();

// Middlewares
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Request Logger
app.use((req, res, next) => {
  const start = Date.now();
  res.on('finish', () => {
    const duration = Date.now() - start;
    if (req.path.startsWith('/api')) {
      console.log(`[HTTP] ${req.method} ${req.path} -> ${res.statusCode} (${duration}ms)`);
    }
  });
  next();
});

// Authentication Middleware
app.use(authenticateUser);

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/listings', listingRoutes);
app.use('/api/bookings', bookingRoutes);
app.use('/api/handovers', handoverRoutes);
app.use('/api/damages', damageRoutes);
app.use('/api/ledger', ledgerRoutes);
app.use('/api/metrics', metricsRoutes);
app.use('/api/audit-logs', auditRoutes);

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    service: 'Agricultural Equipment Rental and Idle-Time Exchange API',
    version: '1.0.0',
    mode: config.isSupabaseConfigured() ? 'live_supabase' : 'operational_store'
  });
});

// Serve frontend static assets from public/
const publicDir = path.join(__dirname, '..', 'public');
app.use(express.static(publicDir));

// Fallback to index.html for single-page application routing
app.get('*', (req, res, next) => {
  if (req.path.startsWith('/api')) return next();
  res.sendFile(path.join(publicDir, 'index.html'));
});

// Centralized Error Handler
app.use((err, req, res, next) => {
  console.error('[Error]', err.stack || err.message);
  res.status(err.status || 500).json({
    success: false,
    error: err.message || 'Internal Server Error'
  });
});

// Start Server
if (require.main === module) {
  app.listen(config.port, () => {
    console.log(`\n=================================================================`);
    console.log(`  🌾 Agricultural Equipment Rental & Idle-Time Exchange`);
    console.log(`  🚀 Server listening on http://localhost:${config.port}`);
    console.log(`  🗄️  Database Status: ${config.isSupabaseConfigured() ? 'Supabase Cloud Connected' : 'Operational Store (seed ready)'}`);
    console.log(`=================================================================\n`);
  });
}

module.exports = app;
