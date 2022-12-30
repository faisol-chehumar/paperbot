import { AttachmentBuilder, SlashCommandBuilder } from 'discord.js'

import { CommandInterface } from './index.js'

const inspire: CommandInterface = {
  data: new SlashCommandBuilder()
    .setName('inspire')
    .setDescription('Inspire yourself cunt')
    .addBooleanOption((option) =>
      option.setName('xmas').setDescription('Enable christmas mode')
    ),
  async onExecute(interaction) {
    console.log('Inspiring this cunt', interaction.user.username)
    const xmasMode = interaction.options.getBoolean('xmas') ?? false
    await interaction.deferReply()
    try {
      const imageUrl = await (
        await fetch(
          `https://inspirobot.me/api?generate=true${
            xmasMode ? '&season=xmas' : ''
          }`
        )
      ).text()

      await interaction.followUp({ files: [imageUrl] })
    } catch (error) {
      console.error(error)
      throw error
    }
  },
}

export default inspire
