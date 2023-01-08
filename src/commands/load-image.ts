import { EmbedBuilder, SlashCommandBuilder } from 'discord.js'

import { prisma } from '../main.js'
import { fetchImageAndConvertToBase64 } from '../utils/image.js'
import { CommandInterface } from './index.js'

const loadImage: CommandInterface = {
  data: new SlashCommandBuilder()
    .setName('load-image')
    .setDescription(
      'Load an image to use with Stable Diffusion img2img commands'
    )
    .addAttachmentOption((option) =>
      option.setName('image').setDescription('The image you want to edit')
    )
    .addStringOption((option) =>
      option
        .setName('url')
        .setDescription('The URL of the image you want to edit')
    ),
  async onExecute(interaction) {
    const image = interaction.options.getAttachment('image')
    const url = interaction.options.getString('url')
    const guildId = interaction.guildId
    const memberId = interaction.user.id

    if (!image && !url) {
      await interaction.reply(
        'You need to provide either an image attachment or a URL'
      )
      return
    } else if (image && url) {
      await interaction.reply(
        'You can only provide either an image attachment or a URL'
      )
      return
    }

    if (image && !image.contentType?.startsWith('image')) {
      await interaction.reply('The attachment needs to be an image')
      return
    }

    await interaction.deferReply()
    const urlString = image?.url! ?? url
    console.log('Loading image from', urlString)
    const { base64, height, width } = await fetchImageAndConvertToBase64(
      urlString
    )

    console.log(
      'Loading image for',
      interaction.user.username,
      urlString,
      width,
      height
    )

    const currentImage = await prisma.image.findFirst({
      where: {
        guildId,
        memberId,
      },
    })

    if (currentImage) {
      await prisma.image.update({
        data: {
          height,
          image: base64,
          width,
        },
        where: {
          id: currentImage.id,
        },
      })
    } else {
      await prisma.image.create({
        data: {
          guildId,
          height,
          image: base64,
          memberId,
          width,
        },
      })
    }

    const embed = new EmbedBuilder()
      .setTitle('Image loaded')
      .setImage(urlString)
    await interaction.followUp({ embeds: [embed] })
  },
}

export default loadImage
