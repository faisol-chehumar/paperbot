import {
  AutocompleteInteraction,
  ButtonInteraction,
  ChannelType,
  ChatInputCommandInteraction,
  Collection,
  EmbedBuilder,
  Interaction,
  Message,
  MessageReaction,
  ModalSubmitInteraction,
  PartialMessageReaction,
  PartialUser,
  Routes,
  SelectMenuInteraction,
  SlashCommandBuilder,
  User,
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
        console.error(
          `An error occurred running command ${interaction.commandName} for ${interaction.user.username}\nDetails: ${error}\n`
        )
        const response = {
          content: `Something went wrong running the command ${interaction.commandName}:\n${error}`,
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

export async function reactionHandler(
  reaction: MessageReaction | PartialMessageReaction,
  user: User | PartialUser
) {
  // console.log(`Reaction received by ${user.username}`)
  if (reaction.partial) {
    reaction = await reaction.fetch()
  }

  if (
    reaction.message.interaction?.commandName === 'diffuse' &&
    reaction.emoji.name === '💯'
  ) {
    const message = reaction.message
    const guild = await message.guild?.fetch()

    if (!guild) return

    const channels = await guild.channels.fetch()
    let bestOfChannel = channels.find((channel) => channel?.name === 'best-of')

    if (!bestOfChannel) {
      bestOfChannel = await guild.channels.create({
        name: 'best-of',
        topic:
          'Tag a message with 💯 to add it to this channel, only the best of the best :two_hearts:',
        type: ChannelType.GuildText,
      })
    }

    if (!bestOfChannel.isTextBased()) {
      console.error('#best-of channel is not text based')
      return
    }

    const messages = await bestOfChannel.messages.fetch()
    const matchingMessage = messages.find(
      (m) => m.embeds.find((e) => e.data.url === message.url) !== undefined
    )

    try {
      if (!reaction.count) {
        console.log(
          `Removing ${message.content} for ${user.username} from #best-of`
        )
        if (matchingMessage) {
          await matchingMessage?.delete()
        } else {
          console.error('Could not find matching message in #best-of')
        }
      } else if (reaction.count >= 1 && !matchingMessage) {
        console.log(
          `Adding ${message.content} for ${user.username} from #best-of`
        )

        const embed = new EmbedBuilder()
          .setURL(message.url)
          .setTitle(
            `Generation by ${message.interaction?.user.username}, pinned by ${user.username}`
          )

        bestOfChannel.send({
          embeds: [embed],
          files: message.attachments.map((attachment) => attachment.url),
        })
      }
    } catch (error) {
      console.error('Could not pin message', error)
    }

    // const channel = await reaction.message.channel.fetch()
    //
    // try {
    //   if (!reaction.count && message.pinned) {
    //     console.log(`Unpinning message ${message.content} for ${user.username}`)
    //     await channel.messages.unpin(message.id, 'No longer 💯')
    //   } else if (reaction.count >= 1 && !message.pinned) {
    //     console.log(`Pinning message ${message.content} for ${user.username}`)
    //     await channel.messages.pin(message.id, '💯💯💯💯')
    //   }
    // } catch (error) {
    //   console.error('Could not pin message', error)
    // }
  }
}
