import { SlashCommandBuilder } from 'discord.js'

import { improvePromptWithMagic } from '../api/magicprompt.js'
import { CommandInterface } from './index.js'

const magicPrompt: CommandInterface = {
  data: new SlashCommandBuilder()
    .setName('magic-prompt')
    .setDescription('Enhance your prompt')
    .addStringOption((option) =>
      option
        .setName('prompt')
        .setDescription('The prompt to enhance')
        .setRequired(true)
    ),
  async onExecute(interaction) {
    const prompt = interaction.options.getString('prompt', true)
    await interaction.deferReply()

    const enhancedPrompt = await improvePromptWithMagic(prompt)
    await interaction.followUp(enhancedPrompt)
  },
}

export default magicPrompt
