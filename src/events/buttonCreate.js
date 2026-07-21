const { Events, EmbedBuilder } = require('discord.js');
const pixManager = require('../utils/pix');
const fs = require('fs');

module.exports = {
  name: Events.InteractionCreate,
  async execute(interaction, client) {
    // Slash Commands
    if (interaction.isCommand()) {
      const command = interaction.client.commands.get(interaction.commandName);

      if (!command) {
        console.error(`Comando não encontrado: ${interaction.commandName}`);
        return;
      }

      try {
        await command.execute(interaction);
      } catch (error) {
        console.error('Erro ao executar comando:', error);
        await interaction.reply({
          content: '❌ Erro ao executar o comando!',
          ephemeral: true,
        });
      }
    }

    // Button Interactions
    if (interaction.isButton()) {
      if (interaction.customId.startsWith('pagar_')) {
        await handlePixPayment(interaction);
      } else if (interaction.customId.startsWith('fechar_')) {
        await handleCloseTicket(interaction);
      }
    }
  },
};

async function handlePixPayment(interaction) {
  await interaction.deferReply({ ephemeral: true });

  try {
    const [, ticketId, amount] = interaction.customId.split('_');

    // Gera o QR Code
    const qrCodePath = await pixManager.generatePixQRCode(
      parseFloat(amount),
      `Pagamento do ticket ${ticketId.slice(0, 8)}`
    );

    const pixData = pixManager.getPixData(parseFloat(amount), '');

    // Cria o embed
    const embed = new EmbedBuilder()
      .setColor('#142c7d')
      .setTitle('💳 QR Code PIX para Pagamento')
      .setDescription(pixManager.formatPixInfo(pixData))
      .setImage('attachment://qrcode.png')
      .addFields(
        { name: 'Ticket ID', value: `\`${ticketId.slice(0, 12)}...\`` },
        { name: 'Valor', value: `R$ ${parseFloat(amount).toFixed(2)}` },
        {
          name: 'Validade',
          value: 'Este QR Code expira em 30 minutos',
        }
      )
      .setFooter({ text: 'Scaneie o código com seu app de banco' })
      .setTimestamp();

    await interaction.editReply({
      embeds: [embed],
      files: [qrCodePath],
    });

    // Limpa o arquivo após 5 minutos
    setTimeout(() => {
      if (fs.existsSync(qrCodePath)) {
        fs.unlinkSync(qrCodePath);
      }
    }, 300000);

  } catch (error) {
    console.error('Erro ao gerar PIX:', error);
    await interaction.editReply({
      content: '❌ Erro ao gerar QR Code PIX.',
    });
  }
}

async function handleCloseTicket(interaction) {
  await interaction.deferReply({ ephemeral: true });

  try {
    const db = interaction.client.db;
    const ticketId = interaction.customId.split('_')[1];

    const ticket = await db.getTicket(ticketId);

    if (!ticket) {
      return await interaction.editReply({
        content: '❌ Ticket não encontrado.',
      });
    }

    // Verifica permissões
    const user = await db.getUser(interaction.user.id);
    if (ticket.user_id !== user.id && !interaction.member.permissions.has('ADMINISTRATOR')) {
      return await interaction.editReply({
        content: '❌ Você não tem permissão para fechar este ticket.',
      });
    }

    await db.updateTicketStatus(ticketId, 'fechado');

    const embed = new EmbedBuilder()
      .setColor('#ff0000')
      .setTitle('✅ Ticket Fechado')
      .setDescription('Este ticket foi fechado com sucesso.')
      .setTimestamp();

    await interaction.editReply({ embeds: [embed] });

    // Fecha o canal após 5 segundos
    setTimeout(async () => {
      const channel = interaction.guild.channels.cache.get(ticket.channel_id);
      if (channel) {
        await channel.delete();
      }
    }, 5000);

  } catch (error) {
    console.error('Erro ao fechar ticket:', error);
    await interaction.editReply({
      content: '❌ Erro ao fechar ticket.',
    });
  }
}
