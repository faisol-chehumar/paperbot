import { Client, Events, GatewayIntentBits } from 'discord.js'
import dotenv from 'dotenv'
import { watch } from 'fs'
import * as path from 'path'
import * as process from 'process'
import * as url from 'url'

// const __filename = url.fileURLToPath(import.meta.url);
export const __dirname = url.fileURLToPath(new URL('.', import.meta.url))

import {
  initializeCommandHandler,
  loadCommandFiles,
  messageHandler,
} from './commands/index.js'
import { post } from './utils/get.js'

dotenv.config()

const { DISCORD_BOT_TOKEN, NODE_ENV } = process.env

const intents = [
  GatewayIntentBits.MessageContent,
  GatewayIntentBits.Guilds,
  GatewayIntentBits.GuildVoiceStates,
  GatewayIntentBits.GuildMessages,
]

const appRoot = path.join(path.resolve(__dirname), '../')

export let discordClient: Client

async function onReady(client: Client) {
  try {
    console.log(`Paperbot is online! Logged in as ${client.user?.tag}`)
  } catch (error) {
    console.log('Something went wrong whilst trying to get ready', error)
  }
}

async function initializeBot() {
  try {
    discordClient = new Client({ intents })
    await loadCommandFiles()
    const commandHandler = await initializeCommandHandler()

    discordClient.on(Events.InteractionCreate, commandHandler)
    discordClient.on(Events.MessageCreate, messageHandler)
    discordClient.once(Events.ClientReady, onReady)

    await discordClient.login(DISCORD_BOT_TOKEN)

    if (NODE_ENV === 'development') {
      discordClient.user?.setPresence({
        activities: [{ name: 'in development' }],
        status: 'idle',
      })

      // const watchFolder = `${appRoot}src\\commands`
      // console.log(`Watching ${watchFolder} for changes`)
      // watch(watchFolder, async (eventType, filename) => {
      //   if (eventType === 'change') {
      //     console.log(`Updating Command: ${watchFolder + filename}`)
      //     client.off(Events.InteractionCreate, commandHandler)
      //     const reloadedCommandHandler = await initializeCommandHandler()
      //     client.on(Events.InteractionCreate, reloadedCommandHandler)
      //   }
      // })
    }
  } catch (e) {
    console.error('Could not initialize bot', e)
  }
}

initializeBot()
