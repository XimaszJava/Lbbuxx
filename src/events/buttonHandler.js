const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const qrcode = require('qrcode');
const { v4: uuidv4 } = require('uuid');

module.exports = {
  name: 'interactionCreate',
  async execute(interaction, client) {
    if (!interaction.isButton()) return;

    try {
      // Handler para comprar com PIX
      if (interaction.customId.startsWith('buy_pix_')) {
        const valor = interaction.customId.replace('buy_pix_', '');
        const pixKey = process.env.NUBANK_PIX_URL;
        
        if (!pixKey) {
          return await interaction.reply({
            content: '❌ Erro: Chave PIX não configurada',
            ephemeral: true
          });
        }

        try {
          // Gerar QR Code
          const qrCodeUrl = await qrcode.toDataURL(pixKey);
          const buffer = Buffer.from(qrCodeUrl.replace(/^data:image\/png;base64,/, ''), 'base64');

          const embed = new EmbedBuilder()
            .setColor('#00AA00')
            .setTitle('💚 PIX - Compra no LBbux')
            .setDescription(`**Valor:** R$ ${valor},00`)
            .addFields(
              { name: '📱 Escaneie o QR Code', value: 'Use seu app de banco para escanear', inline: false },
              { name: '⏰ Prazo', value: '10 minutos para pagar', inline: false },
              { name: '🔑 Destinatário', value: 'Nubank - Chave Aleatória', inline: false }
            )
            .setImage('attachment://qrcode.png')
            .setFooter({ text: 'LBbux - Pagamento PIX' })
            .setTimestamp();

          const row = new ActionRowBuilder()
            .addComponents(
              new ButtonBuilder()
                .setCustomId(`confirm_payment_${valor}`)
                .setLabel('✅ Confirmar Pagamento')
                .setStyle(ButtonStyle.Success),
              new ButtonBuilder()
                .setCustomId('cancel_payment')
                .setLabel('❌ Cancelar')
                .setStyle(ButtonStyle.Danger)
            );

          await interaction.reply({
            embeds: [embed],
            components: [row],
            files: [{ attachment: buffer, name: 'qrcode.png' }],
            ephemeral: true
          });

        } catch (error) {
          console.error('Erro ao gerar QR Code:', error);
          await interaction.reply({
            content: '❌ Erro ao gerar QR Code. Tente novamente.',
            ephemeral: true
          });
        }
      }

      // Handler para confirmar pagamento
      if (interaction.customId.startsWith('confirm_payment_')) {
        const valor = interaction.customId.replace('confirm_payment_', '');
        const pedidoId = uuidv4().slice(0, 8).toUpperCase();
        
        const embed = new EmbedBuilder()
          .setColor('#00AA00')
          .setTitle('✅ Pagamento Confirmado!')
          .setDescription(`Obrigado pela compra de R$ ${valor},00`)
          .addFields(
            { name: '📦 Seu Pedido', value: `Compra no valor de R$ ${valor}`, inline: false },
            { name: '🎫 ID da Compra', value: `#${pedidoId}`, inline: false },
            { name: '👤 Cliente', value: `${interaction.user.tag}`, inline: false },
            { name: '🕐 Data', value: new Date().toLocaleString('pt-BR'), inline: false }
          )
          .setFooter({ text: 'LBbux - Compra Realizada' })
          .setTimestamp();

        await interaction.reply({
          embeds: [embed],
          ephemeral: true
        });
      }

      // Handler para cancelar pagamento
      if (interaction.customId === 'cancel_payment') {
        await interaction.reply({
          content: '❌ Pagamento cancelado. Tente novamente quando estiver pronto.',
          ephemeral: true
        });
      }

      // Handler para tickets
      if (interaction.customId === 'ticket_compra') {
        await interaction.reply({
          content: '🛍️ **Ticket de Compra criado!**\nUm administrador entrará em contato em breve para ajudar com sua compra.',
          ephemeral: true
        });
      }

      if (interaction.customId === 'ticket_suporte') {
        await interaction.reply({
          content: '🆘 **Ticket de Suporte criado!**\nNosso time de suporte responderá em breve.',
          ephemeral: true
        });
      }

      if (interaction.customId === 'ticket_pergunta') {
        await interaction.reply({
          content: '❓ **Ticket de Pergunta criado!**\nResponderemos sua dúvida em breve.',
          ephemeral: true
        });
      }

      // Menu principal
      if (interaction.customId === 'menu_comprar') {
        const comprarCommand = client.commands.get('comprar');
        if (comprarCommand) await comprarCommand.execute(interaction);
      }

      if (interaction.customId === 'menu_pergunta') {
        const perguntaCommand = client.commands.get('pergunta');
        if (perguntaCommand) await perguntaCommand.execute(interaction);
      }

      if (interaction.customId === 'menu_ticket') {
        const ticketCommand = client.commands.get('ticket');
        if (ticketCommand) await ticketCommand.execute(interaction);
      }

    } catch (error) {
      console.error('Erro no button handler:', error);
      if (!interaction.replied && !interaction.deferred) {
        await interaction.reply({
          content: '❌ Erro ao processar ação. Tente novamente.',
          ephemeral: true
        });
      }
    }
  },
};