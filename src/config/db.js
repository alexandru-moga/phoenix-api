const mariadb = require('mariadb');
require('dotenv').config();

// Create a connection pool
const pool = mariadb.createPool({
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  connectionLimit: 5
});

// Test and initialize database
async function initDatabase() {
  let conn;
  try {
    conn = await pool.getConnection();
    console.log('Database connected successfully');
    
    // Create applications table if it doesn't exist
    await conn.query(`
      CREATE TABLE IF NOT EXISTS applications (
        id INT NOT NULL AUTO_INCREMENT,
        email VARCHAR(255) NOT NULL,
        first_name VARCHAR(100) NOT NULL,
        last_name VARCHAR(100) NOT NULL,
        school VARCHAR(255) NOT NULL,
        class VARCHAR(20) NOT NULL,
        birthdate DATE NOT NULL,
        phone VARCHAR(20) NOT NULL,
        discord_username VARCHAR(100) NOT NULL,
        student_id VARCHAR(100) NOT NULL,
        superpowers TEXT NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        PRIMARY KEY (id)
      )
    `);
    console.log('Applications table verified/created');
  } catch (err) {
    console.error('Database initialization failed:', err);
    throw err;
  } finally {
    if (conn) conn.release();
  }
}

module.exports = { pool, initDatabase };
