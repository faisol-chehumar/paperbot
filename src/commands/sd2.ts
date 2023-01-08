import { AttachmentBuilder, SlashCommandBuilder } from 'discord.js'

import { generateStableDiffusionV21Image } from '../api/huggingface.js'
import { CommandInterface } from './index.js'

const sd2: CommandInterface = {
  data: new SlashCommandBuilder()
    .setName('sd2')
    .setDescription('Dream up an image (v2)')
    .addStringOption((option) =>
      option
        .setName('prompt')
        .setDescription('The prompt to generate the image with')
        .setRequired(true)
    )
    .addStringOption((option) =>
      option
        .setName('negative-prompt')
        .setDescription('The prompt NOT to guide the image generation with')
    )
    .addIntegerOption((option) =>
      option
        .setName('cfg')
        .setDescription(
          'How strongly the model follows the prompt between 0-30 (default 7)'
        )
    ),
  async onExecute(interaction) {
    console.log('Dreaming up SDv2 image for', interaction.user.username)
    const prompt = interaction.options.getString('prompt', true)
    const negativePrompt =
      interaction.options.getString('negative-prompt') ?? undefined
    const cfgScale = interaction.options.getInteger('cfg') ?? undefined

    await interaction.reply('Dreaming up image...')

    const { duration, hash, images } = await generateStableDiffusionV21Image(
      prompt,
      negativePrompt,
      cfgScale,
      (queue, total) =>
        interaction.editReply(`Queued as nr \`${queue}\` out of \`${total}\``)
    )

    const attachments = images.map(
      (imageBuffer, index) =>
        new AttachmentBuilder(imageBuffer, { name: `${hash}-${index}.png` })
    )

    const imagesLen = images.length
    const userId = interaction.user.id

    await interaction.editReply({
      content: `**<@${userId}>, I have generated \`${imagesLen}\` ${
        imagesLen > 1 ? 'images' : 'image'
      } in \`${duration.toFixed(2)}s\` with prompt:**\n${prompt}${
        negativePrompt ? `\n**Negative prompt:**\n${negativePrompt}` : ''
      }${cfgScale ? `\n**CFG scale:**\n${cfgScale}` : ''}`,
      files: attachments,
    })
  },
}

export default sd2
