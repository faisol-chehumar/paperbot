import { PrismaClient } from '@prisma/client'
import { Client, Events, GatewayIntentBits, Partials } from 'discord.js'
import dotenv from 'dotenv'
import * as process from 'process'

import {
  initializeCommandHandler,
  loadCommandFiles,
  messageHandler,
  reactionHandler,
} from './commands/index.js'
import { getRawEventMessage, RawEvent } from './utils/rawEvent.js'

// const __filename = url.fileURLToPath(import.meta.url);
// export const __dirname = url.fileURLToPath(new URL('.', import.meta.url))
// const appRoot = path.join(path.resolve(__dirname), '../')

dotenv.config()

const { DISCORD_BOT_TOKEN, NODE_ENV } = process.env

const intents = [
  GatewayIntentBits.MessageContent,
  GatewayIntentBits.Guilds,
  GatewayIntentBits.GuildVoiceStates,
  GatewayIntentBits.GuildMessages,
  GatewayIntentBits.GuildMessageReactions,
  GatewayIntentBits.MessageContent,
]

export let discordClient: Client
export const prisma = new PrismaClient()

async function onReady(client: Client) {
  try {
    console.log(`Paperbot is online! Logged in as ${client.user?.tag}`)
  } catch (error) {
    console.log('Something went wrong whilst trying to get ready', error)
  }
}

async function handleRawEvent(event: RawEvent) {
  // console.log('Received raw event\n', event)
  const { message } = await getRawEventMessage(event)

  if (
    !message ||
    message.author.username !== 'Paperbot' ||
    !message.content.includes('I have generated')
  ) {
    return
  }

  switch (event.t) {
    case 'MESSAGE_REACTION_ADD':
      const emojis = message.reactions.resolve('💯')

      if (emojis && emojis.count > 1) {
        try {
          message.pin()
        } catch (e) {
          console.error('Could not pin message', e)
        }
      }
      return
    case 'MESSAGE_REACTION_REMOVE':
      console.log('reaction removed', message)
      return
  }
}

async function initializeBot() {
  try {
    discordClient = new Client({
      intents,
      partials: [Partials.Message, Partials.Reaction],
    })
    await loadCommandFiles()
    const commandHandler = await initializeCommandHandler()

    discordClient.on(Events.InteractionCreate, commandHandler)
    discordClient.on(Events.MessageCreate, messageHandler)
    discordClient.on(Events.MessageReactionAdd, reactionHandler)
    discordClient.on(Events.MessageReactionRemove, reactionHandler)
    // discordClient.on(Events.Raw, handleRawEvent)
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
