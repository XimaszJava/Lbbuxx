const { Events } = require('discord.js');

module.exports = {
  name: Events.ClientReady,
  once: true,
  async execute(client) {
    console.log(`✅ Bot ${client.user.tag} está online!`);
    console.log(`🤖 Conectado em ${client.guilds.cache.size} servidor(s)`);
  },
};
