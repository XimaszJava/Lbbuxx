const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, ChannelType } = require('discord.js');
const pixManager = require('../utils/pix');
const fs = require('fs');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('ticket')
    .setDescription('Gerencia tickets de suporte')
    .addSubcommand(subcommand =>
      subcommand
        .setName('criar')
        .setDescription('Cria um novo ticket')
        .addStringOption(option =>
          option
            .setName('tipo')
            .setDescription('Tipo do ticket')
            .setRequired(true)
            .addChoices(
              { name: '🛒 Compra', value: 'compra' },
              { name: '❓ Pergunta', value: 'pergunta' },
              { name: '🆘 Suporte', value: 'suporte' }
            )
        )
        .addStringOption(option =>
          option
            .setName('descricao')
            .setDescription('Descrição do ticket')
            .setRequired(true)
        )
        .addNumberOption(option =>
          option
            .setName('valor')
            .setDescription('Valor (se for compra)')
            .setRequired(false)
            .setMinValue(0.01)
        )
    )
    .addSubcommand(subcommand =>
      subcommand
        .setName('listar')
        .setDescription('Lista seus tickets')
    )
    .addSubcommand(subcommand =>
      subcommand
        .setName('fechar')
        .setDescription('Fecha um ticket')
        .addStringOption(option =>
          option
            .setName('ticket_id')
            .setDescription('ID do ticket')
            .setRequired(true)
            .setAutocomplete(true)
        )
    ),

  async execute(interaction) {
    const subcommand = interaction.options.getSubcommand();

    if (subcommand === 'criar') {
      await handleCreateTicket(interaction);
    } else if (subcommand === 'listar') {
      await handleListTickets(interaction);
    } else if (subcommand === 'fechar') {
      await handleCloseTicket(interaction);
    }
  },
};

async function handleCreateTicket(interaction) {
  await interaction.deferReply({ ephemeral: true });

  try {
    const db = interaction.client.db;
    const type = interaction.options.getString('tipo');
    const description = interaction.options.getString('descricao');
    const amount = interaction.options.getNumber('valor');

    // Obtém ou cria o usuário
    const user = await db.getOrCreateUser(
      interaction.user.id,
      interaction.user.username
    );

    // Cria o ticket
    const ticket = await db.createTicket(user.id, type, description);

    // Cria um canal privado para o ticket
    const channel = await interaction.guild.channels.create({
      name: `ticket-${ticket.id.slice(0, 8)}`,
      type: ChannelType.GuildText,
      permissionOverwrites: [
        {
          id: interaction.guild.id,
          deny: ['ViewChannel'],
        },
        {
          id: interaction.user.id,
          allow: ['ViewChannel', 'SendMessages', 'ReadMessageHistory'],
        },
      ],
    });

    // Atualiza o ticket com o ID do canal
    await db.db.run(
      'UPDATE tickets SET channel_id = ? WHERE id = ?',
      [channel.id, ticket.id]
    );

    // Cria embed informativo
    const embed = new EmbedBuilder()
      .setColor('#142c7d')
      .setTitle(`🎫 Ticket ${type.toUpperCase()} Criado`)
      .addFields(
        { name: 'ID do Ticket', value: `\`${ticket.id.slice(0, 12)}...\`` },
        { name: 'Tipo', value: type },
        { name: 'Descrição', value: description },
        { name: 'Status', value: 'Aberto ✅' }
      )
      .setFooter({ text: `Canal: ${channel.name}` })
      .setTimestamp();

    if (amount) {
      embed.addFields({ name: 'Valor', value: `R$ ${amount.toFixed(2)}` });
    }

    await interaction.editReply({ embeds: [embed] });

    // Envia mensagem no canal do ticket
    const welcomeEmbed = new EmbedBuilder()
      .setColor('#142c7d')
      .setTitle('Bem-vindo ao seu Ticket!')
      .setDescription(
        `Olá ${interaction.user}, seu ticket foi criado com sucesso!\n\n**Detalhes:**\n- Tipo: ${type}\n- Descrição: ${description}${
          amount ? `\n- Valor: R$ ${amount.toFixed(2)}` : ''
        }`
      );

    const buttons = new ActionRowBuilder();

    if (type === 'compra' && amount) {
      buttons.addComponents(
        new ButtonBuilder()
          .setCustomId(`pagar_${ticket.id}_${amount}`)
          .setLabel('💳 Gerar QR Code PIX')
          .setStyle(ButtonStyle.Success)
      );
    }

    buttons.addComponents(
      new ButtonBuilder()
        .setCustomId(`fechar_${ticket.id}`)
        .setLabel('❌ Fechar Ticket')
        .setStyle(ButtonStyle.Danger)
    );

    await channel.send({ embeds: [welcomeEmbed], components: [buttons] });

  } catch (error) {
    console.error('Erro ao criar ticket:', error);
    await interaction.editReply({
      content: '❌ Erro ao criar ticket. Tente novamente.',
    });
  }
}

async function handleListTickets(interaction) {
  await interaction.deferReply({ ephemeral: true });

  try {
    const db = interaction.client.db;
    const user = await db.getUser(interaction.user.id);

    if (!user) {
      return await interaction.editReply({
        content: 'Você não tem tickets criados.',
      });
    }

    const tickets = await db.getUserTickets(user.id);

    if (tickets.length === 0) {
      return await interaction.editReply({
        content: 'Você não tem tickets criados.',
      });
    }

    const ticketsText = tickets
      .map(
        (t, i) =>
          `${i + 1}. **${t.type.toUpperCase()}** - ${t.description.substring(0, 30)}...\n   Status: ${t.status} | ID: \`${t.id.slice(0, 12)}...\``
      )
      .join('\n\n');

    const embed = new EmbedBuilder()
      .setColor('#142c7d')
      .setTitle('📋 Seus Tickets')
      .setDescription(ticketsText)
      .setTimestamp();

    await interaction.editReply({ embeds: [embed] });

  } catch (error) {
    console.error('Erro ao listar tickets:', error);
    await interaction.editReply({
      content: '❌ Erro ao listar tickets.',
    });
  }
}

async function handleCloseTicket(interaction) {
  await interaction.deferReply({ ephemeral: true });

  try {
    const db = interaction.client.db;
    const ticketId = interaction.options.getString('ticket_id');

    const ticket = await db.getTicket(ticketId);

    if (!ticket) {
      return await interaction.editReply({
        content: '❌ Ticket não encontrado.',
      });
    }

    if (ticket.user_id !== (await db.getUser(interaction.user.id)).id) {
      return await interaction.editReply({
        content: '❌ Você não tem permissão para fechar este ticket.',
      });
    }

    await db.updateTicketStatus(ticketId, 'fechado');

    const embed = new EmbedBuilder()
      .setColor('#ff0000')
      .setTitle('✅ Ticket Fechado')
      .setDescription('Seu ticket foi fechado com sucesso.')
      .setTimestamp();

    await interaction.editReply({ embeds: [embed] });

  } catch (error) {
    console.error('Erro ao fechar ticket:', error);
    await interaction.editReply({
      content: '❌ Erro ao fechar ticket.',
    });
  }
}
