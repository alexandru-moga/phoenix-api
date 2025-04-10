const mariadb = require('mariadb');
require('dotenv').config();

const pool = mariadb.createPool({
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  connectionLimit: 5
});

async function initDatabase() {
  let conn;
  try {
    conn = await pool.getConnection();
    console.log('Database connected successfully');

    // Start transaction for schema updates
    await conn.beginTransaction();

    // Create or verify "applications" table
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
        superpowers TEXT NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        PRIMARY KEY (id)
      )
    `);
    console.log('Applications table verified');

    // Create or verify "contact_submissions" table
    await conn.query(`
      CREATE TABLE IF NOT EXISTS contact_submissions (
        id INT NOT NULL AUTO_INCREMENT,
        name VARCHAR(255) NOT NULL,
        email VARCHAR(255) NOT NULL,
        message TEXT NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        PRIMARY KEY (id)
      )
    `);
    console.log('Contact submissions table verified');

    // Create or verify "members" table
    await conn.query(`
      CREATE TABLE IF NOT EXISTS members (
        id INT NOT NULL AUTO_INCREMENT,
        first_name VARCHAR(100) DEFAULT NULL,
        last_name VARCHAR(100) DEFAULT NULL,
        email VARCHAR(255) NOT NULL UNIQUE, -- Ensure unique emails
        login_code VARCHAR(6) DEFAULT NULL, -- Add if not exists logic below
        login_code_expires DATETIME DEFAULT NULL, -- Add if not exists logic below
        discord_id VARCHAR(255) DEFAULT NULL,
        school VARCHAR(255) DEFAULT NULL,
        ysws_projects TEXT DEFAULT NULL,
        hcb_member VARCHAR(255) DEFAULT NULL,
        birthdate DATE DEFAULT NULL,
        class VARCHAR(20) DEFAULT NULL,
        phone VARCHAR(20) DEFAULT NULL,
        role VARCHAR(50) DEFAULT NULL,
        join_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        description TEXT DEFAULT NULL,
        PRIMARY KEY (id)
      )
    `);
    console.log('Members table verified');

    // Add any missing columns to "members" table
    const columnsToAdd = [
      { name: 'login_code', type: 'VARCHAR(6)' },
      { name: 'login_code_expires', type: 'DATETIME' }
    ];

    for (const column of columnsToAdd) {
      const [exists] = await conn.query(`
        SELECT COLUMN_NAME 
        FROM INFORMATION_SCHEMA.COLUMNS 
        WHERE TABLE_SCHEMA = ?
          AND TABLE_NAME = 'members'
          AND COLUMN_NAME = ?
      `, [process.env.DB_NAME, column.name]);

      if (!exists.length) {
        await conn.query(`
          ALTER TABLE members 
          ADD COLUMN ${column.name} ${column.type} DEFAULT NULL
        `);
        console.log(`Added column ${column.name} to members table`);
      } else {
        console.log(`Column ${column.name} already exists in members table`);
      }
    }

    // Commit all changes
    await conn.commit();
    console.log('Database schema updated successfully');
  } catch (err) {
    if (conn) await conn.rollback(); // Rollback on error
    console.error('Database initialization failed:', err);
    throw err;
  } finally {
    if (conn) conn.release(); // Release connection back to pool
  }
}

module.exports = { pool, initDatabase };