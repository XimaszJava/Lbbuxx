const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs');
const { v4: uuidv4 } = require('uuid');

class Database {
  constructor() {
    this.dbPath = process.env.DATABASE_PATH || path.join(__dirname, '../database/lbbux.db');
    this.ensureDbDir();
    this.db = new sqlite3.Database(this.dbPath);
    this.initializeDatabase();
  }

  ensureDbDir() {
    const dir = path.dirname(this.dbPath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
  }

  initializeDatabase() {
    const schema = fs.readFileSync(path.join(__dirname, '../database/schema.sql'), 'utf8');
    const statements = schema.split(';').filter(s => s.trim());
    
    statements.forEach(statement => {
      this.db.run(statement + ';', (err) => {
        if (err) console.error('Database error:', err);
      });
    });
  }

  // Usuários
  async createUser(discordId, username) {
    return new Promise((resolve, reject) => {
      const id = uuidv4();
      this.db.run(
        'INSERT INTO users (id, discord_id, username) VALUES (?, ?, ?)',
        [id, discordId, username],
        function(err) {
          if (err) reject(err);
          else resolve(id);
        }
      );
    });
  }

  async getUser(discordId) {
    return new Promise((resolve, reject) => {
      this.db.get(
        'SELECT * FROM users WHERE discord_id = ?',
        [discordId],
        (err, row) => {
          if (err) reject(err);
          else resolve(row);
        }
      );
    });
  }

  async getOrCreateUser(discordId, username) {
    let user = await this.getUser(discordId);
    if (!user) {
      user = { id: await this.createUser(discordId, username), discord_id: discordId };
    }
    return user;
  }

  // Tickets
  async createTicket(userId, type, description) {
    return new Promise((resolve, reject) => {
      const id = uuidv4();
      this.db.run(
        'INSERT INTO tickets (id, user_id, type, description) VALUES (?, ?, ?, ?)',
        [id, userId, type, description],
        function(err) {
          if (err) reject(err);
          else resolve({ id, ticket_number: this.lastID });
        }
      );
    });
  }

  async getTicket(ticketId) {
    return new Promise((resolve, reject) => {
      this.db.get(
        'SELECT * FROM tickets WHERE id = ?',
        [ticketId],
        (err, row) => {
          if (err) reject(err);
          else resolve(row);
        }
      );
    });
  }

  async getUserTickets(userId) {
    return new Promise((resolve, reject) => {
      this.db.all(
        'SELECT * FROM tickets WHERE user_id = ? ORDER BY created_at DESC',
        [userId],
        (err, rows) => {
          if (err) reject(err);
          else resolve(rows || []);
        }
      );
    });
  }

  async updateTicketStatus(ticketId, status) {
    return new Promise((resolve, reject) => {
      this.db.run(
        'UPDATE tickets SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
        [status, ticketId],
        (err) => {
          if (err) reject(err);
          else resolve(true);
        }
      );
    });
  }

  // PIX Payments
  async createPixPayment(userId, ticketId, amount, description, pixKey, qrCode) {
    return new Promise((resolve, reject) => {
      const id = uuidv4();
      const expiresAt = new Date(Date.now() + 30 * 60000); // 30 minutos
      
      this.db.run(
        'INSERT INTO pix_payments (id, user_id, ticket_id, amount, description, pix_key, qr_code, expires_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
        [id, userId, ticketId, amount, description, pixKey, qrCode, expiresAt],
        function(err) {
          if (err) reject(err);
          else resolve(id);
        }
      );
    });
  }

  async getPixPayment(paymentId) {
    return new Promise((resolve, reject) => {
      this.db.get(
        'SELECT * FROM pix_payments WHERE id = ?',
        [paymentId],
        (err, row) => {
          if (err) reject(err);
          else resolve(row);
        }
      );
    });
  }

  async getPixPaymentsByTicket(ticketId) {
    return new Promise((resolve, reject) => {
      this.db.all(
        'SELECT * FROM pix_payments WHERE ticket_id = ? ORDER BY created_at DESC',
        [ticketId],
        (err, rows) => {
          if (err) reject(err);
          else resolve(rows || []);
        }
      );
    });
  }

  async updatePixPaymentStatus(paymentId, status, transactionId = null) {
    return new Promise((resolve, reject) => {
      const paidAt = status === 'pago' ? new Date() : null;
      this.db.run(
        'UPDATE pix_payments SET status = ?, transaction_id = ?, paid_at = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
        [status, transactionId, paidAt, paymentId],
        (err) => {
          if (err) reject(err);
          else resolve(true);
        }
      );
    });
  }

  // Ticket Messages
  async addTicketMessage(ticketId, userId, message) {
    return new Promise((resolve, reject) => {
      const id = uuidv4();
      this.db.run(
        'INSERT INTO ticket_messages (id, ticket_id, user_id, message) VALUES (?, ?, ?, ?)',
        [id, ticketId, userId, message],
        (err) => {
          if (err) reject(err);
          else resolve(id);
        }
      );
    });
  }

  async getTicketMessages(ticketId) {
    return new Promise((resolve, reject) => {
      this.db.all(
        'SELECT * FROM ticket_messages WHERE ticket_id = ? ORDER BY created_at ASC',
        [ticketId],
        (err, rows) => {
          if (err) reject(err);
          else resolve(rows || []);
        }
      );
    });
  }

  close() {
    return new Promise((resolve, reject) => {
      this.db.close((err) => {
        if (err) reject(err);
        else resolve();
      });
    });
  }
}

module.exports = Database;
