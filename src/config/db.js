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

    await conn.beginTransaction();

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

    await conn.query(`
      CREATE TABLE IF NOT EXISTS members (
        id INT NOT NULL AUTO_INCREMENT,
        first_name VARCHAR(100) DEFAULT NULL,
        last_name VARCHAR(100) DEFAULT NULL,
        email VARCHAR(255) NOT NULL UNIQUE,
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

    const columnsToAdd = [
      { name: 'login_code', type: 'VARCHAR(6)' },
      { name: 'login_code_expires', type: 'DATETIME' }
    ];

    for (const column of columnsToAdd) {
      const rows = await conn.query(`
        SELECT COLUMN_NAME 
        FROM INFORMATION_SCHEMA.COLUMNS 
        WHERE TABLE_SCHEMA = ?
          AND TABLE_NAME = 'members'
          AND COLUMN_NAME = ?
      `, [process.env.DB_NAME, column.name]);

      if (rows.length === 0) {
        await conn.query(`
          ALTER TABLE members 
          ADD COLUMN ${column.name} ${column.type} DEFAULT NULL
        `);
        console.log(`Added column ${column.name}`);
      }
    }

    await conn.commit();
    console.log('Database schema updated successfully');
  } catch (err) {
    if (conn) await conn.rollback();
    console.error('Database initialization failed:', err);
    throw err;
  } finally {
    if (conn) conn.release();
  }
}

module.exports = { pool, initDatabase };
