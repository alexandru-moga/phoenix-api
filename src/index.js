const https = require('https');
const fs = require('fs');
const express = require('express');
const cors = require('cors');
require('dotenv').config();

const applicationRoutes = require('./routes/applicationRoutes');
const { initDatabase } = require('./config/db');

const app = express();

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

const corsOptions = {
  methods: ['GET', 'POST', 'OPTIONS'],
  allowedHeaders: ['Content-Type'],
  credentials: true
};
app.use(cors(corsOptions));

initDatabase().catch((err) => {
  console.error('Failed to initialize database:', err);
  process.exit(1);
});

app.use('/api/applications', applicationRoutes);

const options = {
  key: fs.readFileSync('./src/ssl/api.phoenixclub.ro-pkcs8.key'),
  cert: fs.readFileSync('./src/ssl/api.phoenixclub.ro.crt'),
  secureProtocol: 'TLSv1_2_method',
  minVersion: 'TLSv1.2'
};

https.createServer(options, app).listen(3000, () => {
  console.log('API running on https://localhost:3000');
});
