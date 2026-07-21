const QRCode = require('qrcode');
const path = require('path');
const fs = require('fs');

class PIXManager {
  constructor() {
    this.pixKey = process.env.PIX_KEY; // Chave PIX estática
    this.nuBankPixUrl = 'https://nubank.com.br/cobrar/1ce925/6a5fe252-5ab6-445e-8761-f29cd7ec10e3';
    this.qrCodeDir = path.join(__dirname, '../qrcodes');
    this.ensureQRCodeDir();
  }

  ensureQRCodeDir() {
    if (!fs.existsSync(this.qrCodeDir)) {
      fs.mkdirSync(this.qrCodeDir, { recursive: true });
    }
  }

  /**
   * Gera um QR Code PIX dinamicamente com o valor
   * @param {number} amount - Valor em reais
   * @param {string} description - Descrição do pagamento
   * @returns {Promise<string>} Caminho do arquivo QR Code
   */
  async generatePixQRCode(amount, description = '') {
    try {
      // Formata o valor para PIX (sem vírgula, apenas ponto)
      const formattedAmount = parseFloat(amount).toFixed(2);

      // Cria a string PIX com o valor (formato simplificado com URL do Nubank)
      // Você pode usar a chave PIX estática ou o link do Nubank
      const pixString = this.nuBankPixUrl;

      // Gera o QR Code
      const qrCodeFilename = `qrcode_${Date.now()}_${Math.random().toString(36).substring(7)}.png`;
      const qrCodePath = path.join(this.qrCodeDir, qrCodeFilename);

      await QRCode.toFile(qrCodePath, pixString, {
        width: 300,
        margin: 2,
        color: {
          dark: '#000000',
          light: '#FFFFFF',
        },
      });

      return qrCodePath;
    } catch (error) {
      console.error('Erro ao gerar QR Code:', error);
      throw error;
    }
  }

  /**
   * Gera informações de pagamento PIX
   * @param {number} amount - Valor em reais
   * @param {string} description - Descrição
   * @returns {object} Dados do PIX
   */
  getPixData(amount, description = '') {
    return {
      pixKey: this.pixKey,
      amount: parseFloat(amount).toFixed(2),
      description: description,
      url: this.nuBankPixUrl,
      merchant: process.env.PIX_MERCHANT_NAME || 'LBbux',
      city: process.env.PIX_MERCHANT_CITY || 'São Paulo',
    };
  }

  /**
   * Formata informações de PIX para exibição
   */
  formatPixInfo(pixData) {
    return `
🔑 **Chave PIX (Cópia e Cola):**
\`${pixData.pixKey}\`

💰 **Valor:** R$ ${pixData.amount}

🏪 **Beneficiário:** ${pixData.merchant}

📍 **Cidade:** ${pixData.city}

${pixData.description ? `📝 **Descrição:** ${pixData.description}` : ''}
    `;
  }

  /**
   * Limpa QR Codes antigos (mais de 1 hora)
   */
  cleanOldQRCodes() {
    const oneHourAgo = Date.now() - 3600000;
    const files = fs.readdirSync(this.qrCodeDir);

    files.forEach(file => {
      const filePath = path.join(this.qrCodeDir, file);
      const stats = fs.statSync(filePath);
      if (stats.mtimeMs < oneHourAgo) {
        fs.unlinkSync(filePath);
      }
    });
  }
}

module.exports = new PIXManager();
