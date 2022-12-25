import {
  AutocompleteInteraction,
  ButtonInteraction,
  ChatInputCommandInteraction,
  Collection,
  Interaction,
  ModalSubmitInteraction,
  Routes,
  SelectMenuInteraction,
  SlashCommandBuilder,
} from 'discord.js'
import glob from 'glob'

import { APP_ID, discordAPI } from '../api/discordAPI'

let commands: CommandInterface[] = []
let commandCollection: Collection<string, CommandInterface>

export interface CommandInterface {
  data: Omit<SlashCommandBuilder, 'addSubcommand' | 'addSubcommandGroup'>
  onExecute: (interaction: ChatInputCommandInteraction) => Promise<void>
  onButton?: (interaction: ButtonInteraction) => Promise<void>
  onSelectMenu?: (interaction: SelectMenuInteraction) => Promise<void>
  onAutocomplete?: (interaction: AutocompleteInteraction) => Promise<void>
  onModalSubmit?: (interaction: ModalSubmitInteraction) => Promise<void>
}

export async function loadCommandFiles() {
  const files = glob.sync(`${__dirname}/**/[!index]*.ts`)
  commands = (
    await Promise.all(
      files.map(
        (file) => import(file.replace(__dirname, '.').replace('.ts', ''))
      )
    )
  ).map((command) => command.default)
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
        if (interaction.deferred) {
          await interaction.followUp({
            content: `Something went wrong running the command ${
              interaction.commandName
            }:\n${JSON.stringify(error)}`,
            ephemeral: true,
          })
        } else {
          await interaction.reply({
            content: `Something went wrong running the command ${
              interaction.commandName
            }:\n${JSON.stringify(error)}`,
            ephemeral: true,
          })
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
    console.log('Button pressed!', interaction)
  } else if (interaction.isAutocomplete()) {
    if (!interaction.commandName) return
    const command = commandCollection.get(interaction.commandName)
    command?.onAutocomplete?.(interaction)
    console.log('Autocomplete used!', interaction)
  } else if (interaction.isModalSubmit()) {
    console.log('Message component used!', interaction)
  } else if (interaction.isStringSelectMenu()) {
    console.log('Select menu changed!', interaction)
  }
}
