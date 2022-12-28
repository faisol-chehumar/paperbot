import {
  AutocompleteInteraction,
  ButtonInteraction,
  ChatInputCommandInteraction,
  Collection,
  Interaction,
  Message,
  ModalSubmitInteraction,
  Routes,
  SelectMenuInteraction,
  SlashCommandBuilder,
} from 'discord.js'
import * as fs from 'fs'

import { APP_ID, discordAPI } from '../api/discordAPI.js'
import { discordClient } from '../main.js'

let commands: CommandInterface[]
let commandCollection: Collection<string, CommandInterface>

export interface CommandInterface {
  data: Omit<SlashCommandBuilder, 'addSubcommand' | 'addSubcommandGroup'>
  onExecute: (interaction: ChatInputCommandInteraction) => Promise<void>
  onButton?: (interaction: ButtonInteraction) => Promise<void>
  onSelectMenu?: (interaction: SelectMenuInteraction) => Promise<void>
  onAutocomplete?: (interaction: AutocompleteInteraction) => Promise<void>
  onModalSubmit?: (interaction: ModalSubmitInteraction) => Promise<void>
  onMention?: (message: Message) => Promise<void>
}

export async function loadCommandFiles() {
  const files = fs
    .readdirSync('./src/commands')
    .map((file) => `./${file}`)
    .filter((file) => !file.endsWith('index.ts'))

  commands = await Promise.all(
    files.map((file) => import(file).then((m) => m.default))
  )
  commandCollection = new Collection<string, CommandInterface>()

  commands.forEach((command) => {
    commandCollection.set(command.data.name, command)
  })
}

async function registerCommandsWithAPI(commands: CommandInterface[]) {
  try {
    const parsedCommands = commands.map((command) => command.data.toJSON())

    await discordAPI.put(Routes.applicationCommands(APP_ID), {
      body: parsedCommands,
    })

    console.log(
      `Successfully reloaded application slash commands with ${commands.length} commands.`
    )
  } catch (error) {
    console.error(error)
  }
}

export async function initializeCommandHandler() {
  try {
    await loadCommandFiles()
    registerCommandsWithAPI(commands)

    return async (interaction: Interaction) => {
      if (!interaction.isChatInputCommand()) {
        try {
          handleInteractionResponse(interaction)
        } catch (error) {
          console.error(error)
          if ('reply' in interaction) {
            interaction.reply({
              content: `Something went wrong handling the interaction:\n${error}`,
            })
          }
        }
        return
      }

      const command = commandCollection.get(interaction.commandName)

      try {
        if (!command) {
          // noinspection ExceptionCaughtLocallyJS
          throw new Error('Could not find command')
        }

        await command.onExecute(interaction)
      } catch (error) {
        console.error(error)
        const response = {
          content: `Something went wrong running the command ${
            interaction.commandName
          }:\n${typeof error === 'object' ? JSON.stringify(error) : error}`,
          ephemeral: true,
        }

        if (interaction.deferred) {
          await interaction.followUp(response)
        } else {
          await interaction.reply(response)
        }
      }
    }
  } catch (error) {
    console.error('Could not initialize commands!', error)
    return async (interaction: Interaction) => {
      if (!interaction.isChatInputCommand()) return

      await interaction.reply({
        content: 'Something is completely broken, please try again later',
        ephemeral: true,
      })
    }
  }
}

function handleInteractionResponse(interaction: Interaction) {
  if (interaction.isButton()) {
    if (!interaction.message.interaction?.commandName) return
    const command = commandCollection.get(
      interaction.message.interaction.commandName
    )
    if (!command?.onButton) {
      console.error('Could not find button handler for interaction')
      return
    }
    command?.onButton?.(interaction)
    // console.log('Button pressed!', interaction)
  } else if (interaction.isAutocomplete()) {
    if (!interaction.commandName) return
    const command = commandCollection.get(interaction.commandName)
    command?.onAutocomplete?.(interaction)
    // console.log('Autocomplete used!', interaction)
  } else if (interaction.isModalSubmit()) {
    // console.log('Message component used!', interaction)
  } else if (interaction.isStringSelectMenu()) {
    // console.log('Select menu changed!', interaction)
  }
}

export function messageHandler(message: Message) {
  if (
    !discordClient.user ||
    message.mentions.everyone ||
    !message.mentions.has(discordClient.user.id)
  ) {
    return
  }

  const command = commandCollection.get('chatgpt')
  console.log('Mentioned by', message.author.username, '-', message.content)
  command?.onMention?.(message)
}
