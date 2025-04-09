const { pool } = require('../config/db');

class Contact {
  static async create(contact) {
    let conn;
    try {
      conn = await pool.getConnection();
      const result = await conn.query(
        `INSERT INTO contact_submissions 
        (name, email, message) 
        VALUES (?, ?, ?)`,
        [contact.name, contact.email, contact.message]
      );
      return { id: Number(result.insertId), ...contact };
    } finally {
      if (conn) conn.release();
    }
  }

  static async getAll() {
    let conn;
    try {
      conn = await pool.getConnection();
      return await conn.query(
        'SELECT * FROM contact_submissions ORDER BY created_at DESC'
      );
    } finally {
      if (conn) conn.release();
    }
  }
}

module.exports = Contact;
