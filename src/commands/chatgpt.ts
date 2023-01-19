import {
  ChatInputCommandInteraction,
  cleanContent,
  EmbedBuilder,
  Message,
  SlashCommandBuilder,
} from 'discord.js'

import { getChatGPTResponse } from '../api/chatgpt.js'
import { CommandInterface } from './index.js'

const queue: {
  interaction?: ChatInputCommandInteraction
  message?: Message
  prevMessage?: Message
}[] = []
let locked = false

const chatgpt: CommandInterface = {
  data: new SlashCommandBuilder()
    .setName('chatgpt')
    .setDescription('Chat with GPT-3')
    .addStringOption((option) =>
      option
        .setName('prompt')
        .setDescription('The prompt to start the conversation with')
        .setRequired(true)
    )
    .addStringOption((option) =>
      option
        .setName('new-conversation')
        .setDescription(
          'Start a new conversation (with or without initial prompt)'
        )
        .addChoices(
          { name: 'WokeGPT', value: 'woke' },
          { name: 'DAN', value: 'dan' }
        )
    ),
  async onExecute(interaction) {
    const prompt = interaction.options.getString('prompt', true)
    const newConversation =
      interaction.options.getBoolean('new-conversation') ?? false

    if (queue.length > 0) {
      queue.push({ interaction })
      if (!locked) await handleQueue()
      return
    } else {
      locked = false
    }

    await interaction.deferReply()
    try {
      locked = true
      const data = await getChatGPTResponse(
        interaction.guildId,
        interaction.member?.user.id ?? null,
        prompt,
        newConversation
      )
      locked = false

      const embed = new EmbedBuilder().addFields([
        {
          name: 'Prompt',
          value: prompt,
        },
        {
          name: 'Response',
          value: data.response,
        },
      ])

      await interaction.followUp({
        // content: data.response,
        embeds: [embed],
      })

      // Check if there are any messages in the queue
      await handleQueue()
    } catch (error) {
      queue.pop()
      console.error(error)
      await interaction.followUp({
        content: 'Something went wrong, please try again later.',
      })
    }
  },
  async onMention(message) {
    if ('name' in message.channel && message.channel.name === 'best-of') {
      console.log('Ignoring message in best-of channel')
      return
    }

    const newConversation = message.content.includes('[[NEW]]')

    if (queue.length > 0) {
      const prevMessage = await message.channel.send(
        `I'm currently busy, you are nr. \`${queue.length}\` in the queue.`
      )
      queue.push({ message, prevMessage })
      if (!locked) await handleQueue()
      return
    } else {
      locked = false
    }

    const msg = await message.channel.send('Thinking...')

    try {
      locked = true
      const data = await getChatGPTResponse(
        message.guildId,
        message.author.id,
        cleanContent(message.content, message.channel)
          .replace('@Paperbot', '')
          .trimStart(),
        newConversation
      )
      locked = false

      console.log('Received response from GPT-3:', data)

      if (data.response.length > 2000) {
        const [firstMsg, ...messages] = data.response.split(/(.{2000})/)
        await msg.edit(firstMsg)
        messages.forEach((m) => message.channel.send(m))
      } else {
        await msg.edit(data.response)
      }

      // Check if there are any messages in the queue
      await handleQueue()
    } catch (error) {
      console.error("Couldn't get response from GPT-3:", error)
      msg.edit('Currently rate limited, please wait a moment')
      queue.push({ message, prevMessage: msg })
    }
  },
}

async function handleQueue() {
  if (queue.length > 0) {
    const nextInQueue = queue.shift()!

    if (nextInQueue.interaction) {
      await chatgpt.onExecute(nextInQueue.interaction)
    } else if (nextInQueue.message) {
      nextInQueue.prevMessage?.delete()
      await chatgpt.onMention!(nextInQueue.message)
    }
  }
}

export default chatgpt
