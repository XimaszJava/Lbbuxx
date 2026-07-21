const { Events, REST, Routes } = require('discord.js');
const fs = require('fs');
const path = require('path');

module.exports = {
  name: Events.ClientReady,
  once: true,
  async execute(client) {
    try {
      const commands = [];
      const commandsPath = path.join(__dirname, '../commands');
      const commandFiles = fs.readdirSync(commandsPath).filter(file => file.endsWith('.js'));

      for (const file of commandFiles) {
        const command = require(path.join(commandsPath, file));
        if ('data' in command && 'execute' in command) {
          commands.push(command.data.toJSON());
        }
      }

      const rest = new REST({ version: '10' }).setToken(process.env.DISCORD_TOKEN);

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
