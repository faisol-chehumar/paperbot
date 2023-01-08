import { AttachmentBuilder, SlashCommandBuilder } from 'discord.js'

import { generateMageSpaceImage, MageSpaceOptions } from '../api/magespace.js'
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

const ms: CommandInterface = {
  data: new SlashCommandBuilder()
    .setName('ms')
    .setDescription('Dream up an image (MageSpace)')
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
      option.setName('aspect').setDescription('Aspect ratio of output image')
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
    const aspect_ratio = interaction.options.getInteger('aspect') ?? undefined
    const num_inference_steps = interaction.options.getInteger('steps') ?? 50
    const seed = interaction.options.getInteger('seed') ?? undefined
    const guidance_scale = interaction.options.getInteger('cfg') ?? 7
    const beautify = interaction.options.getBoolean('beautify') ?? true

    const options: MageSpaceOptions = {
      aspect_ratio,
      guidance_scale,
      negative_prompt: beautify
        ? `${
            negative_prompt ? `${negative_prompt}, ` : ''
          }disfigured, ugly: -1.0, too many fingers: -1.0`
        : negative_prompt,
      num_inference_steps,
      seed,
    }

    const finalPrompt = `${prompt}${
      beautify ? ', artstation, 4k, 8k, hd, high definition' : ''
    }`

    await interaction.deferReply()

    const { duration, hash, image } = await generateMageSpaceImage(
      finalPrompt,
      clearUndefinedFromObject(options)
    )

    const attachments = [new AttachmentBuilder(image, { name: `${hash}.png` })]

    const userId = interaction.user.id

    await interaction.followUp({
      content: `**<@${userId}>, I have generated an image in \`${duration.toFixed(
        2
      )}s\` with prompt:**\n${prompt}`,
      files: attachments,
    })
  },
}

export default ms
