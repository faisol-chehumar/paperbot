import { Client, Events, GatewayIntentBits } from 'discord.js'
import dotenv from 'dotenv'
import { watch } from 'fs'
import * as path from 'path'
import * as process from 'process'

import { initializeCommandHandler } from './commands'

dotenv.config()

const { DISCORD_BOT_TOKEN, NODE_ENV } = process.env

const intents = [
  GatewayIntentBits.MessageContent,
  GatewayIntentBits.Guilds,
  GatewayIntentBits.GuildVoiceStates,
  GatewayIntentBits.GuildMessages,
]

global.appRoot = path.join(path.resolve(__dirname), '../')

async function onReady(client: Client) {
  try {
    console.log(`Paperbot is online! Logged in as ${client.user?.tag}`)
  } catch (error) {
    console.log('Something went wrong whilst trying to get ready', error)
  }
}

async function initializeBot() {
  try {
    const client = new Client({ intents })
    const commandHandler = await initializeCommandHandler()

    client.on(Events.InteractionCreate, commandHandler)
    client.once(Events.ClientReady, onReady)

    await client.login(DISCORD_BOT_TOKEN)

    if (NODE_ENV === 'development') {
      client.user?.setPresence({
        activities: [{ name: 'in development' }],
        status: 'idle',
      })

      const watchFolder = `${global.appRoot}src/commands`
      console.log(`Watching ${watchFolder} for changes`)
      watch(watchFolder, async (eventType, filename) => {
        if (eventType === 'change') {
          console.log(`Updating Command: ${watchFolder + filename}`)
          delete require.cache[require.resolve(watchFolder + filename)]
          client.off(Events.InteractionCreate, commandHandler)
          const reloadedCommandHandler = await initializeCommandHandler()
          client.on(Events.InteractionCreate, reloadedCommandHandler)
        }
      })
    }
  } catch (e) {
    console.error('Could not initialize bot', e)
  }
}

initializeBot()
