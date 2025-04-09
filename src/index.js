const https = require('https');
const fs = require('fs');
const express = require('express');
const cors = require('cors');
require('dotenv').config();

const app = express();

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

const corsOptions = {
  origin: [
    'http://127.0.0.1:5500',
    '90.95.76.115'
  ],
  methods: ['GET', 'POST', 'OPTIONS'],
  allowedHeaders: ['Content-Type'],
  credentials: true
};
app.use(cors(corsOptions));

const { initDatabase } = require('./config/db');
initDatabase().catch((err) => {
  console.error('Failed to initialize database:', err);
  process.exit(1);
});

const contactRoutes = require('./routes/contactRoutes');
const applicationRoutes = require('./routes/applicationRoutes');

app.use('/api/contact', contactRoutes);
app.use('/api/applications', applicationRoutes);

const options = {
  key: fs.readFileSync('/etc/letsencrypt/live/api.phoenixclub.ro/privkey.pem'),
  cert: fs.readFileSync('/etc/letsencrypt/live/api.phoenixclub.ro/fullchain.pem'),
  minVersion: 'TLSv1.2'
};

https.createServer(options, app).listen(3000, () => {
  console.log('API running on https://api.phoenixclub.ro:3000');
});