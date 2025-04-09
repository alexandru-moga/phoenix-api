const https = require('https');
const fs = require('fs');
const express = require('express');
const cors = require('cors');
require('dotenv').config();

const contactRoutes = require('./routes/contactRoutes');
app.use('/api/contact', contactRoutes);

const applicationRoutes = require('./routes/applicationRoutes');
const { initDatabase } = require('./config/db');

const app = express();

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// CORS Configuration
const corsOptions = {
  origin: [
    'http://127.0.0.:5000',
    '90.95.76.115'
  ],
  methods: ['GET', 'POST', 'OPTIONS'],
  allowedHeaders: ['Content-Type'],
  credentials: true
};

app.use(cors(corsOptions));

// Initialize Database
initDatabase().catch((err) => {
  console.error('Failed to initialize database:', err);
  process.exit(1);
});

// Routes
app.use('/api/applications', applicationRoutes);

// HTTPS Options with Certbot Certificates
const options = {
  key: fs.readFileSync('/etc/letsencrypt/live/api.phoenixclub.ro/privkey.pem'),
  cert: fs.readFileSync('/etc/letsencrypt/live/api.phoenixclub.ro/fullchain.pem'),
  ca: fs.readFileSync('/etc/letsencrypt/live/api.phoenixclub.ro/chain.pem'),
  minVersion: 'TLSv1.2' // Enforce modern TLS version
};

// Start HTTPS Server
https.createServer(options, app).listen(3000, () => {
  console.log('API running on https://api.phoenixclub.ro:3000');
});
