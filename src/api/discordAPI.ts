import { REST } from 'discord.js'
import dotenv from 'dotenv'
import process from 'process'
dotenv.config()

if (!process.env.DISCORD_BOT_TOKEN) {
  throw new Error('No DISCORD_BOT_TOKEN provided')
}

export const APP_ID = process.env.DISCORD_APP_ID ?? ''
export const TEST_GUILD_ID = process.env.TEST_GUILD_ID ?? ''

export const discordAPI = new REST({ version: '10' }).setToken(
  process.env.DISCORD_BOT_TOKEN
)
