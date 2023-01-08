import { AttachmentBuilder, SlashCommandBuilder } from 'discord.js'

import { improvePromptWithMagic } from '../api/magicprompt.js'
import {
  diffuseImage2Image,
  StableDiffusionImage2ImagePostParameters,
} from '../api/stablediffusion.js'
import { prisma } from '../main.js'
import { clearUndefinedFromObject } from '../utils/filter.js'
import { currentModelName, StoredOptions } from './config-sd.js'
import { CommandInterface } from './index.js'

const imageDiffuse: CommandInterface = {
  data: new SlashCommandBuilder()
    .setName('img-diffuse')
    .setDescription(
      'Load an image to use with Stable Diffusion img2img commands'
    )
    .addStringOption((option) =>
      option
        .setName('prompt')
        .setDescription('The prompt to generate the image with')
        .setRequired(true)
    )
    .addIntegerOption((option) =>
      option
        .setName('strength')
        .setDescription('How much to apply the initial image 0-100')
    )
    .addStringOption((option) =>
      option
        .setName('negative-prompt')
        .setDescription('The prompt NOT to guide the image generation')
    )
    .addIntegerOption((option) =>
      option
        .setName('images')
        .setDescription('Number of images to output (1-4)')
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
        .setName('seed')
        .setDescription(
          'Seed to generate the image with - if not specified, a random seed will be used'
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
        .setName('restore-faces')
        .setDescription('Restore faces in the image')
    )
    .addBooleanOption((option) =>
      option.setName('tiling').setDescription('Tile the output images')
    )
    .addBooleanOption((option) =>
      option.setName('magic').setDescription('Add some magic to your prompt')
    ),
  async onExecute(interaction) {
    const prompt = interaction.options.getString('prompt', true)
    const strength = interaction.options.getInteger('strength')
    const negative_prompt =
      interaction.options.getString('negative-prompt') ?? undefined
    const batch_size = Math.min(
      4,
      Math.max(1, interaction.options.getInteger('images') ?? 1)
    )
    const steps = interaction.options.getInteger('steps') ?? 50
    const seed = interaction.options.getInteger('seed') ?? -1
    const cfg_scale = interaction.options.getInteger('cfg') ?? 7
    const restore_faces =
      interaction.options.getBoolean('restore-faces') ?? false
    const tiling = interaction.options.getBoolean('tiling-faces') ?? false
    const guildId = interaction.guildId
    const memberId = interaction.user.id
    const magic = interaction.options.getBoolean('magic') ?? false

    const result = await prisma.image.findFirst({
      where: {
        guildId,
        memberId,
      },
    })

    if (!result) {
      await interaction.reply(
        'You need to load an image using /load-image first'
      )
      return
    }

    const denoising_strength = strength
      ? Math.max(0, Math.min(1, strength / 100))
      : undefined

    const existingConfig = await prisma.sDConfig.findFirst({
      where: {
        guildId,
        memberId,
      },
    })

    const storedConfig: StoredOptions = existingConfig?.config
      ? JSON.parse(existingConfig.config)
      : {}

    console.log(`Loaded config: ${JSON.stringify(storedConfig, null, 2)}`)

    const options: Partial<StableDiffusionImage2ImagePostParameters> = {
      ...storedConfig,
      batch_size,
      cfg_scale,
      denoising_strength,
      height: result.height,
      negative_prompt,
      restore_faces,
      seed,
      steps,
      tiling,
      width: result.width,
    }

    await interaction.deferReply()

    const finalPrompt = magic ? await improvePromptWithMagic(prompt) : prompt
    const clearedOptions = clearUndefinedFromObject(options)

    const {
      duration,
      hash,
      images,
      seed: actualSeed,
    } = await diffuseImage2Image(result.image, finalPrompt, clearedOptions)

    const imagesLen = images.length
    const attachments = images.map(
      (imageBuffer, index) =>
        new AttachmentBuilder(imageBuffer, { name: `${hash}-${index}.png` })
    )

    await interaction.followUp({
      content: `**<@${memberId}>, I have generated \`${imagesLen}\` ${
        imagesLen > 1 ? 'images' : 'image'
      } in \`${duration.toFixed(2)}s\` based on your image with prompt:**\n${
        magic ? `${finalPrompt}**Original prompt:** ${prompt}` : finalPrompt
      }${
        negative_prompt ? `\n**Negative Prompt:**\n${negative_prompt}` : ''
      }\n**Model:** ${currentModelName}\n**Seed:** ${actualSeed}  **Steps:** ${steps}  **CFG Scale:** ${cfg_scale}  **Strength:** ${strength}`,
      files: attachments,
    })
  },
}

export default imageDiffuse
