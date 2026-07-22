const { InteractionType } = require('discord.js');

module.exports = {
  name: 'interactionCreate',
  async execute(interaction, client) {
    // Comandos slash
    if (interaction.isChatInputCommand()) {
      const command = client.commands.get(interaction.commandName);
      if (!command) return;

      try {
        await command.execute(interaction);
      } catch (error) {
        console.error('Erro ao executar comando:', error);
        await interaction.reply({
          content: '❌ Erro ao executar comando.',
          ephemeral: true
        });
      }
    }
  },
};