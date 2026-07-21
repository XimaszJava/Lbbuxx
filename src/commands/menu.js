const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('menu')
    .setDescription('Mostra o menu principal com botões de ação'),

  async execute(interaction) {
    const embed = new EmbedBuilder()
      .setColor('#142c7d')
      .setTitle('🎯 Menu LBbux')
      .setDescription(
        'Bem-vindo ao LBbux! Escolha uma opção abaixo para começar:'
      )
      .addFields(
        {
          name: '🛒 Comprar',
          value: 'Crie um ticket para fazer uma compra',
          inline: false,
        },
        {
          name: '❓ Fazer Pergunta',
          value: 'Tire suas dúvidas conosco',
          inline: false,
        },
        {
          name: '🆘 Suporte',
          value: 'Precisa de ajuda? Abra um ticket de suporte',
          inline: false,
        },
        {
          name: '💳 Pagar',
          value: 'Gere um QR Code PIX para pagamento',
          inline: false,
        }
      )
      .setFooter({ text: 'Clique nos botões abaixo para interagir' })
      .setTimestamp();

    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId('ticket_compra')
        .setLabel('🛒 Comprar')
        .setStyle(ButtonStyle.Primary),
      new ButtonBuilder()
        .setCustomId('ticket_pergunta')
        .setLabel('❓ Pergunta')
        .setStyle(ButtonStyle.Primary),
      new ButtonBuilder()
        .setCustomId('ticket_suporte')
        .setLabel('🆘 Suporte')
        .setStyle(ButtonStyle.Primary)
    );

    const row2 = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId('abrir_pagar')
        .setLabel('💳 Gerar PIX')
        .setStyle(ButtonStyle.Success)
    );

    await interaction.reply({
      embeds: [embed],
      components: [row, row2],
      ephemeral: false,
    });
  },
};
