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
    // Schema SQL diretamente no código (sem arquivo externo)
    const schema = `
      CREATE TABLE IF NOT EXISTS users (
        id TEXT PRIMARY KEY,
        discord_id TEXT UNIQUE NOT NULL,
        username TEXT NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS tickets (
        id TEXT PRIMARY KEY,
        ticket_number INTEGER UNIQUE,
        user_id TEXT NOT NULL,
        type TEXT NOT NULL CHECK(type IN ('compra', 'pergunta', 'suporte')),
        description TEXT NOT NULL,
        status TEXT DEFAULT 'aberto' CHECK(status IN ('aberto', 'em_progresso', 'fechado', 'cancelado')),
        priority TEXT DEFAULT 'normal' CHECK(priority IN ('baixa', 'normal', 'alta', 'urgente')),
        channel_id TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        closed_at DATETIME,
        FOREIGN KEY(user_id) REFERENCES users(id)
      );

      CREATE TABLE IF NOT EXISTS pix_payments (
        id TEXT PRIMARY KEY,
        ticket_id TEXT,
        user_id TEXT NOT NULL,
        amount DECIMAL(10, 2) NOT NULL,
        description TEXT,
        pix_key TEXT,
        qr_code TEXT,
        status TEXT DEFAULT 'pendente' CHECK(status IN ('pendente', 'pago', 'cancelado', 'expirado')),
        payment_method TEXT DEFAULT 'pix',
        transaction_id TEXT UNIQUE,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        paid_at DATETIME,
        expires_at DATETIME,
        FOREIGN KEY(ticket_id) REFERENCES tickets(id),
        FOREIGN KEY(user_id) REFERENCES users(id)
      );

      CREATE TABLE IF NOT EXISTS ticket_messages (
        id TEXT PRIMARY KEY,
        ticket_id TEXT NOT NULL,
        user_id TEXT NOT NULL,
        message TEXT NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY(ticket_id) REFERENCES tickets(id),
        FOREIGN KEY(user_id) REFERENCES users(id)
      );

      CREATE TABLE IF NOT EXISTS server_config (
        guild_id TEXT PRIMARY KEY,
        ticket_category_id TEXT,
        log_channel_id TEXT,
        prefix TEXT DEFAULT '/',
        auto_close_days INTEGER DEFAULT 7,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS logs (
        id TEXT PRIMARY KEY,
        action TEXT NOT NULL,
        user_id TEXT,
        details TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );
    `;

    const statements = schema.split(';').filter(s => s.trim());
    
    statements.forEach((statement) => {
      this.db.run(statement + ';', (err) => {
        if (err && !err.message.includes('already exists')) {
          // Ignora erros de tabelas que já existem
        }
      });
    });

    // Criar índices separadamente com tratamento de erro
    this.db.run('CREATE INDEX IF NOT EXISTS idx_tickets_user_id ON tickets(user_id)', () => {});
    this.db.run('CREATE INDEX IF NOT EXISTS idx_tickets_status ON tickets(status)', () => {});
    this.db.run('CREATE INDEX IF NOT EXISTS idx_pix_payments_user_id ON pix_payments(user_id)', () => {});
    this.db.run('CREATE INDEX IF NOT EXISTS idx_pix_payments_status ON pix_payments(status)', () => {});
    this.db.run('CREATE INDEX IF NOT EXISTS idx_ticket_messages_ticket_id ON ticket_messages(ticket_id)', () => {});
    
    console.log('✅ Banco de dados inicializado!');
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
