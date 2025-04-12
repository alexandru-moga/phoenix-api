const mariadb = require('mariadb');
require('dotenv').config();

const pool = mariadb.createPool({
    host: process.env.DB_HOST,
    port: process.env.DB_PORT,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    connectionLimit: 10,
    idleTimeout: 5000,
    metaAsArray: false,
    namedPlaceholders: true,
    supportBigNumbers: true,
    typeCast: function (field, next) {
        if (field && typeof field.name === 'string') {
            const fieldName = field.name.toLowerCase();
            if (fieldName === 'userid') {
                const value = field.string();
                return value ? parseInt(value, 10) : null;
            }
        }
        return next();
    }
});

async function initDatabase() {
  let conn;
  try {
      conn = await pool.getConnection();
      console.log('Database connected successfully');
      
      await conn.beginTransaction();

      // 1. Create core tables first
      await createApplicationsTable(conn);
      await createContactSubmissionsTable(conn);
      await createMembersTable(conn); // Creates table without auth columns

      // 2. Add auth columns explicitly
      await addAuthColumns(conn);
      
      // 3. Create indexes after columns exist
      await createIndexes(conn);

      await conn.commit();
      console.log('Database schema validated successfully');
  } catch (err) {
      if (conn) await conn.rollback();
      console.error('Database initialization failed:', err);
      throw err;
  } finally {
      if (conn) conn.release();
  }
}

async function createApplicationsTable(conn) {
    await conn.query(`
        CREATE TABLE IF NOT EXISTS applications (
            id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
            email VARCHAR(255) NOT NULL,
            first_name VARCHAR(100) NOT NULL,
            last_name VARCHAR(100) NOT NULL,
            school VARCHAR(255) NOT NULL,
            class VARCHAR(20) NOT NULL,
            birthdate DATE NOT NULL,
            phone VARCHAR(20) NOT NULL,
            superpowers TEXT NOT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        ) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci
    `);
    console.log('Applications table validated');
}

async function createContactSubmissionsTable(conn) {
    await conn.query(`
        CREATE TABLE IF NOT EXISTS contact_submissions (
            id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
            name VARCHAR(255) NOT NULL,
            email VARCHAR(255) NOT NULL,
            message TEXT NOT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        ) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci
    `);
    console.log('Contact submissions table validated');
}

async function createMembersTable(conn) {
    await conn.query(`
        CREATE TABLE IF NOT EXISTS members (
            id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
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
            login_code CHAR(6) CHARACTER SET ascii COLLATE ascii_bin DEFAULT NULL,
            login_code_expires DATETIME DEFAULT NULL
        ) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin
    `);
    console.log('Members table validated');
}

async function addAuthColumns(conn) {
  const columns = [
      { name: 'login_code', type: 'CHAR(6) CHARACTER SET ascii COLLATE ascii_bin' },
      { name: 'login_code_expires', type: 'DATETIME' }
  ];

  for (const column of columns) {
      const [rows] = await conn.query(
          `SELECT COLUMN_NAME 
           FROM INFORMATION_SCHEMA.COLUMNS 
           WHERE TABLE_SCHEMA = ? 
           AND TABLE_NAME = 'members'
           AND COLUMN_NAME = ?`,
          [process.env.DB_NAME, column.name]
      );

      if (rows.length === 0) {
          console.log(`Adding column ${column.name}...`);
          await conn.query(
              `ALTER TABLE members 
               ADD COLUMN ${column.name} ${column.type} DEFAULT NULL`
          );
      }
  }
}

async function createIndexes(conn) {
  const indexes = [
      { name: 'idx_login_code', column: 'login_code' },
      { name: 'idx_login_code_expires', column: 'login_code_expires' }
  ];

  for (const index of indexes) {
      try {
          const [rows] = await conn.query(
              `SELECT INDEX_NAME 
               FROM INFORMATION_SCHEMA.STATISTICS 
               WHERE TABLE_SCHEMA = ? 
               AND TABLE_NAME = 'members' 
               AND INDEX_NAME = ?`,
              [process.env.DB_NAME, index.name]
          );

          if (!rows || rows.length === 0) {
              await conn.query(
                  `CREATE INDEX ${index.name} ON members (${index.column})`
              );
              console.log(`Created index ${index.name}`);
          } else {
              console.log(`Index ${index.name} already exists`);
          }
      } catch (error) {
          console.error(`Index operation failed for ${index.name}:`, error);
          throw error;
      }
  }
}

async function addAuthColumns(conn) {
  const columns = [
      { name: 'login_code', type: 'CHAR(6) CHARACTER SET ascii COLLATE ascii_bin' },
      { name: 'login_code_expires', type: 'DATETIME' }
  ];

  for (const column of columns) {
      try {
          const [rows = []] = await conn.query(
              `SELECT COLUMN_NAME 
               FROM INFORMATION_SCHEMA.COLUMNS 
               WHERE TABLE_SCHEMA = ? 
               AND TABLE_NAME = 'members' 
               AND COLUMN_NAME = ?`,
              [process.env.DB_NAME, column.name]
          );

          if (rows.length === 0) {
              console.log(`Adding column ${column.name}...`);
              await conn.query(
                  `ALTER TABLE members 
                   ADD COLUMN ${column.name} ${column.type} DEFAULT NULL`
              );
          }
      } catch (error) {
          console.error(`Column check failed for ${column.name}:`, error);
          throw error;
      }
  }
}


module.exports = { pool, initDatabase };