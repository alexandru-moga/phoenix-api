const { pool } = require('../config/db');

/**
 * Application model for database operations
 */
class Application {
  /**
   * Save application to database
   */
  static async create(application) {
    let conn;
    try {
      conn = await pool.getConnection();
      const result = await conn.query(
        `INSERT INTO applications (
          email, first_name, last_name, school, class, 
          birthdate, phone, superpowers
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          application.email,
          application.first_name,
          application.last_name,
          application.school,
          application.class,
          application.birthdate,
          application.phone,
          application.superpowers
        ]
      );
      
      return { 
        id: Number(result.insertId), 
      };
    } catch (err) {
      throw err;
    } finally {
      if (conn) conn.release();
    }
  }

  /**
   * Get all applications from database
   */
  static async getAll() {
    let conn;
    try {
      conn = await pool.getConnection();
      return await conn.query('SELECT * FROM applications ORDER BY created_at DESC');
    } catch (err) {
      console.error('Error retrieving applications:', err);
      throw err;
    } finally {
      if (conn) conn.release();
    }
  }
}

module.exports = Application;