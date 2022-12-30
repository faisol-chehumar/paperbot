import { AttachmentBuilder, SlashCommandBuilder } from 'discord.js'

import {
  generateStableDiffusionV2Images,
  StableDiffusionV2PostParameters,
} from '../api/stablediffusion-v2-colab.js'
import { CommandInterface } from './index.js'

function clearUndefinedFromObject<T extends object = object>(
  obj: T
): Record<string, any> {
  return (Object.keys(obj) as (keyof T)[]).reduce((acc, key) => {
    if (obj[key] !== undefined && obj[key] !== null) {
      acc[key as string] = obj[key]
    }
    return acc
  }, {} as Record<string, any>)
}

const sd2colab: CommandInterface = {
  data: new SlashCommandBuilder()
    .setName('sd2colab')
    .setDescription('Dream up an image in Google Colab - Usually unavailable')
    .addStringOption((option) =>
      option
        .setName('prompt')
        .setDescription('The prompt to generate the image with')
        .setRequired(true)
    )
    .addStringOption((option) =>
      option
        .setName('negative-prompt')
        .setDescription('The prompt NOT to guide the image generation')
    )
    .addIntegerOption((option) =>
      option.setName('width').setDescription('Width of output image')
    )
    .addIntegerOption((option) =>
      option.setName('height').setDescription('Height of output image')
    )
    .addIntegerOption((option) =>
      option.setName('images').setDescription('Number of images to output')
    )
    .addIntegerOption((option) =>
      option
        .setName('steps')
        .setDescription(
          'Number of iterations to run the model for - between 20-50 is usually good (default 50)'
        )
    )
    .addIntegerOption((option) =>
      option
        .setName('cfg')
        .setDescription(
          'How strongly the model follows the prompt between 0-30 (default 7)'
        )
    )
    .addBooleanOption((option) =>
      option
        .setName('beautify')
        .setDescription(
          'Adds some keywords to the prompt in an attempt to make it more beautiful'
        )
    ),
  async onExecute(interaction) {
    const prompt = interaction.options.getString('prompt', true)
    const negative_prompt =
      interaction.options.getString('negative-prompt') ?? undefined
    const width = interaction.options.getInteger('width') ?? 768
    const height = interaction.options.getInteger('height') ?? 768
    const batch_size = interaction.options.getInteger('images') ?? 3
    const steps = interaction.options.getInteger('steps') ?? 50
    const seed = interaction.options.getInteger('seed') ?? -1
    const cfg_scale = interaction.options.getInteger('cfg') ?? 7
    const beautify = interaction.options.getBoolean('beautify') ?? false

    const options: Partial<StableDiffusionV2PostParameters> = {
      batch_size,
      cfg_scale,
      height,
      negative_prompt: beautify
        ? `${
            negative_prompt ? `${negative_prompt}, ` : ''
          }disfigured, ugly: -1.0, too many fingers: -1.0`
        : negative_prompt,
      seed,
      steps,
      width,
    }

    const finalPrompt = `${prompt}${
      beautify ? ', artstation, 4k, 8k, hd, high definition' : ''
    }`

    await interaction.deferReply()

    const { duration, hash, images } = await generateStableDiffusionV2Images(
      finalPrompt,
      clearUndefinedFromObject(options)
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

export default sd2colab
