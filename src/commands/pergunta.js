const { SlashCommandBuilder, ModalBuilder, TextInputBuilder, TextInputStyle, ActionRowBuilder } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('pergunta')
    .setDescription('❓ Faça uma pergunta ou solicite suporte'),

  async execute(interaction) {
    try {
      const modal = new ModalBuilder()
        .setCustomId('pergunta_modal')
        .setTitle('Fazer uma Pergunta');

      const perguntaInput = new TextInputBuilder()
        .setCustomId('pergunta_texto')
        .setLabel('Qual é sua pergunta/dúvida?')
        .setStyle(TextInputStyle.Paragraph)
        .setPlaceholder('Digite sua pergunta aqui...')
        .setRequired(true)
        .setMaxLength(1000);

      const row = new ActionRowBuilder().addComponents(perguntaInput);
      modal.addComponents(row);

      await interaction.showModal(modal);

    } catch (error) {
      console.error('Erro no comando pergunta:', error);
      await interaction.reply({
        content: '❌ Erro ao abrir formulário. Tente novamente.',
        ephemeral: true
      });
    }
  }
};