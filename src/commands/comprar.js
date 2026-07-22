const { SlashCommandBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, EmbedBuilder } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('comprar')
    .setDescription('🛍️ Compre produtos no LBbux com PIX'),

  async execute(interaction) {
    try {
      const embed = new EmbedBuilder()
        .setColor('#FF6B35')
        .setTitle('🛍️ LBbux - Comprar Produtos')
        .setDescription('Selecione o valor que deseja pagar via PIX')
        .addFields(
          { name: '💳 Método de Pagamento', value: 'PIX (Instantâneo)', inline: false },
          { name: '⏱️ Confirmação', value: 'Imediata após pagamento', inline: false },
          { name: '📝 Instruções', value: 'Clique no valor desejado para gerar o QR Code', inline: false }
        )
        .setFooter({ text: 'LBbux - Sistema de Compras' })
        .setTimestamp();

      const valores = [2, 4, 5, 10, 15, 20, 30, 50, 75, 100, 150, 200, 300];
      const rows = [];
      
      for (let i = 0; i < valores.length; i += 5) {
        const row = new ActionRowBuilder();
        const chunk = valores.slice(i, i + 5);
        
        chunk.forEach(valor => {
          row.addComponents(
            new ButtonBuilder()
              .setCustomId(`buy_pix_${valor}`)
              .setLabel(`R$ ${valor}`)
              .setStyle(ButtonStyle.Primary)
              .setEmoji('💰')
          );
        });
        
        rows.push(row);
      }

      await interaction.reply({
        embeds: [embed],
        components: rows,
        ephemeral: false
      });

    } catch (error) {
      console.error('Erro no comando comprar:', error);
      await interaction.reply({
        content: '❌ Erro ao processar seu pedido. Tente novamente mais tarde.',
        ephemeral: true
      });
    }
  }
};