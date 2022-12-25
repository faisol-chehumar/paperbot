import { SlashCommandBuilder } from 'discord.js'

import { getChatGPTResponse } from '~api/chatgpt'

import { CommandInterface } from './index'

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
    const response = await getChatGPTResponse(
      interaction.member?.user.id ?? 'default',
      prompt
    )

    await interaction.followUp({
      content: response.response,
    })
  },
}

export default chatgpt
