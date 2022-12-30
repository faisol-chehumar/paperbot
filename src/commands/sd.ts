import { AttachmentBuilder, SlashCommandBuilder } from 'discord.js'

import { generateStableDiffusionImage } from '../api/stablediffusion.js'
import { CommandInterface } from './index.js'

const sd: CommandInterface = {
  data: new SlashCommandBuilder()
    .setName('sd')
    .setDescription('Dream up an image')
    .addStringOption((option) =>
      option
        .setName('prompt')
        .setDescription('The prompt to generate the image with')
        .setRequired(true)
    ),
  async onExecute(interaction) {
    console.log('Dreaming up SDv1 image for', interaction.user.username)
    const prompt = interaction.options.getString('prompt', true)

    await interaction.deferReply()
    const { duration, hash, images } = await generateStableDiffusionImage(
      prompt
    )

    const attachments = images.map(
      (imageBuffer, index) =>
        new AttachmentBuilder(imageBuffer, { name: `${hash}-${index}.png` })
    )

    const imagesLen = images.length
    const userId = interaction.user.id

    await interaction.followUp({
      content: `**<@${userId}>, I have generated \`${imagesLen}\` ${
        imagesLen > 1 ? 'images' : 'image'
      } in \`${duration.toFixed(2)}s\` with prompt:**\n${prompt}`,
      files: attachments,
    })
  },
}

export default sd
