require('dotenv').config({ path: require('path').join(__dirname, '../.env') });

const { Client, GatewayIntentBits, Collection } = require('discord.js');
const fs = require('fs');
const path = require('path');
const Database = require('./utils/database');

console.log('🔍 Token:', process.env.DISCORD_TOKEN ? '✅ Carregado' : '❌ Não encontrado');
console.log('🔍 Guild ID:', process.env.GUILD_ID || '❌ Não encontrado');

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.DirectMessages,
  ],
});

client.commands = new Collection();
client.events = new Collection();
client.db = new Database();

// Carregar comandos
const commandsPath = path.join(__dirname, 'commands');
const commandFiles = fs.readdirSync(commandsPath).filter(file => file.endsWith('.js'));

for (const file of commandFiles) {
  const filePath = path.join(commandsPath, file);
  const command = require(filePath);
  if ('data' in command && 'execute' in command) {
    client.commands.set(command.data.name, command);
  }
}

// Carregar eventos
const eventsPath = path.join(__dirname, 'events');
const eventFiles = fs.readdirSync(eventsPath).filter(file => file.endsWith('.js'));

for (const file of eventFiles) {
  const filePath = path.join(eventsPath, file);
  const event = require(filePath);
  if (event.once) {
    client.once(event.name, (...args) => event.execute(...args, client));
  } else {
    client.on(event.name, (...args) => event.execute(...args, client));
  }
}

// Login
if (!process.env.DISCORD_TOKEN) {
  console.error('❌ ERRO: Token do Discord não encontrado no .env');
  process.exit(1);
}

client.login(process.env.DISCORD_TOKEN);

module.exports = client;
