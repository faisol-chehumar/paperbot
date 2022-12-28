import { cleanContent, EmbedBuilder, SlashCommandBuilder } from 'discord.js'

import { getChatGPTResponse } from '../api/chatgpt.js'
import { CommandInterface } from './index.js'

const queue: [string | null, string, string][] = []

const chatgpt: CommandInterface = {
  data: new SlashCommandBuilder()
    .setName('chatgpt')
    .setDescription('Chat with GPT-3')
    .addStringOption((option) =>
      option
        .setName('prompt')
        .setDescription('The prompt to start the conversation with')
        .setRequired(true)
    ),
  async onExecute(interaction) {
    const prompt = interaction.options.getString('prompt', true)

    await interaction.deferReply()
    const data = await getChatGPTResponse(
      interaction.guildId,
      interaction.member?.user.id ?? null,
      prompt
    )

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
  },
  async onMention(message) {
    if (queue.length > 0) {
      queue.push([
        message.guildId,
        message.author.id,
        cleanContent(message.content, message.channel)
          .replace('@Paperbot', '')
          .trimStart(),
      ])
    }
    try {
      const msg = await message.channel.send('Thinking...')
      const data = await getChatGPTResponse(
        message.guildId,
        message.author.id,
        cleanContent(message.content, message.channel)
          .replace('@Paperbot', '')
          .trimStart()
      )

      console.log('Received response from GPT-3:', data)

      await msg.edit(data.response)
    } catch (error) {
      console.error(error)
      await message.edit('Currently rate limited, please try again later')
    }
  },
}

export default chatgpt
