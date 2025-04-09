const express = require('express');
const app = express();
const cors = require('cors');
require('dotenv').config();

const { initDatabase } = require('./config/db');
const applicationRoutes = require('./routes/applicationRoutes');

const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors({
    methods: ['GET', 'POST'],
    allowedHeaders: ['Content-Type']
  }));
  app.use(express.json()); // Parse JSON bodies
  app.use(express.urlencoded({ extended: true })); // Parse form data

// Initialize database
initDatabase().catch(err => {
  console.error('Failed to initialize database:', err);
  process.exit(1);
});

// Routes
app.use('/api/applications', applicationRoutes);

// Root route
app.get('/', (req, res) => {
  res.send('Phoenix Club Application API is running');
});

// Start server
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});