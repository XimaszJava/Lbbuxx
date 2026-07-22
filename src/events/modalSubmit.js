const { EmbedBuilder, ChannelType } = require('discord.js');

module.exports = {
  name: 'interactionCreate',
  async execute(interaction, client) {
    if (!interaction.isModalSubmit()) return;

    try {
      if (interaction.customId === 'pergunta_modal') {
        const pergunta = interaction.fields.getTextInputValue('pergunta_texto');
        const user = interaction.user;

        const embed = new EmbedBuilder()
          .setColor('#4B0082')
          .setTitle('❓ Nova Pergunta Recebida')
          .addFields(
            { name: '👤 Usuário', value: `${user.tag}`, inline: true },
            { name: '🆔 User ID', value: `${user.id}`, inline: true },
            { name: '❓ Pergunta', value: pergunta, inline: false },
            { name: '🕐 Data', value: new Date().toLocaleString('pt-BR'), inline: false }
          )
          .setFooter({ text: 'LBbux - Suporte' })
          .setTimestamp();

        // Enviar para um canal de log (se configurado)
        const logChannelId = process.env.LOG_CHANNEL_ID;
        if (logChannelId) {
          try {
            const logChannel = await client.channels.fetch(logChannelId);
            if (logChannel && logChannel.type === ChannelType.GuildText) {
              await logChannel.send({ embeds: [embed] });
            }
          } catch (error) {
            console.error('Erro ao enviar para canal de log:', error);
          }
        }

        await interaction.reply({
          content: '✅ Sua pergunta foi enviada! Em breve entraremos em contato.',
          ephemeral: true
        });
      }

    } catch (error) {
      console.error('Erro no modal submit:', error);
      if (!interaction.replied && !interaction.deferred) {
        await interaction.reply({
          content: '❌ Erro ao processar formulário. Tente novamente.',
          ephemeral: true
        });
      }
    }
  },
};