const { REST, Routes } = require('discord.js');
const fs = require('fs');
const path = require('path');

module.exports = {
  name: 'ready',
  once: true,
  async execute(client) {
    console.log(`✅ Bot ${client.user.tag} está online!`);
    console.log(`🤖 Conectado em ${client.guilds.cache.size} servidor(s)`);

    // Registrar comandos slash
    const commandsPath = path.join(__dirname, '../commands');
    const commandFiles = fs.readdirSync(commandsPath).filter(file => file.endsWith('.js'));
    const commands = [];

    for (const file of commandFiles) {
      const filePath = path.join(commandsPath, file);
      const command = require(filePath);
      if ('data' in command && 'execute' in command) {
        commands.push(command.data.toJSON());
      }
    }

    const rest = new REST({ version: '10' }).setToken(process.env.DISCORD_TOKEN);

    try {
      console.log(`Registrando ${commands.length} comando(s)...`);

      const data = await rest.put(
        Routes.applicationGuildCommands(client.user.id, process.env.GUILD_ID),
        { body: commands }
      );

      console.log(`✅ ${data.length} comando(s) registrado(s)!`);
    } catch (error) {
      console.error('Erro ao registrar comandos:', error);
    }
  },
};