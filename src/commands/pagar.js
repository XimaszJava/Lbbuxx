const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const pixManager = require('../utils/pix');
const fs = require('fs');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('pagar')
    .setDescription('Gera um QR Code PIX para você pagar')
    .addNumberOption(option =>
      option
        .setName('valor')
        .setDescription('Valor em reais para pagar')
        .setRequired(true)
        .setMinValue(0.01)
    )
    .addStringOption(option =>
      option
        .setName('descricao')
        .setDescription('Descrição do pagamento (opcional)')
        .setRequired(false)
    ),

  async execute(interaction) {
    await interaction.deferReply({ ephemeral: true });

    try {
      const amount = interaction.options.getNumber('valor');
      const description = interaction.options.getString('descricao') || '';

      // Gera o QR Code
      const qrCodePath = await pixManager.generatePixQRCode(amount, description);
      const pixData = pixManager.getPixData(amount, description);

      // Cria o embed
      const embed = new EmbedBuilder()
        .setColor('#142c7d') // Cor do Nubank
        .setTitle('💳 QR Code PIX')
        .setDescription(pixManager.formatPixInfo(pixData))
        .setImage('attachment://qrcode.png')
        .setFooter({ text: 'Válido por 30 minutos' })
        .setTimestamp();

      // Envia a resposta com o QR Code
      await interaction.editReply({
        embeds: [embed],
        files: [qrCodePath],
      });

      // Limpa o arquivo QR Code após 5 minutos
      setTimeout(() => {
        if (fs.existsSync(qrCodePath)) {
          fs.unlinkSync(qrCodePath);
        }
      }, 300000);

    } catch (error) {
      console.error('Erro ao gerar PIX:', error);
      await interaction.editReply({
        content: '❌ Erro ao gerar QR Code PIX. Tente novamente.',
        ephemeral: true,
      });
    }
  },
};
