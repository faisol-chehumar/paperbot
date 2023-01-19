import { AttachmentBuilder, SlashCommandBuilder } from 'discord.js'

import { improvePromptWithMagic } from '../api/magicprompt.js'
import {
  diffuseText2Image,
  StableDiffusionPostParameters,
} from '../api/stablediffusion.js'
import { prisma } from '../main.js'
import { clearUndefinedFromObject } from '../utils/filter.js'
import {
  currentModelName,
  StoredOptions,
  updateCurrentModel,
} from './config-sd.js'
import { CommandInterface } from './index.js'

const diffuse: CommandInterface = {
  data: new SlashCommandBuilder()
    .setName('diffuse')
    .setDescription(
      "Dream up an image, runs locally on master daddy's computer uwu"
    )
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
      option
        .setName('images')
        .setDescription('Number of images to output (1-4)')
    )
    .addStringOption((option) =>
      option
        .setName('ratio')
        .setDescription('Aspect ratio of output image (float)')
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
    const width = interaction.options.getInteger('width') ?? 512
    let height = interaction.options.getInteger('height') ?? 512
    const ratio = parseFloat(interaction.options.getString('ratio') ?? '1')
    height = width / ratio
    const magic = interaction.options.getBoolean('magic') ?? false
    const guildId = interaction.guildId
    const memberId = interaction.user.id

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

    const options: Partial<StableDiffusionPostParameters> = {
      batch_size,
      cfg_scale,
      height,
      negative_prompt,
      restore_faces,
      seed,
      steps,
      tiling,
      width,
    }

    await interaction.deferReply()

    const finalPrompt = magic ? await improvePromptWithMagic(prompt) : prompt
    const clearedOptions = clearUndefinedFromObject(options)

    const {
      duration,
      hash,
      images,
      seed: actualSeed,
    } = await diffuseText2Image(finalPrompt, clearedOptions)

    await updateCurrentModel()

    const attachments = images.map(
      (imageBuffer, index) =>
        new AttachmentBuilder(imageBuffer, { name: `${hash}-${index}.png` })
    )

    const imagesLen = images.length
    const userId = interaction.user.id

    await interaction.followUp({
      content: `**<@${userId}>, I have generated \`${imagesLen}\` ${
        imagesLen > 1 ? 'images' : 'image'
      } in \`${duration.toFixed(2)}s\` with prompt:**\n${
        magic ? `${finalPrompt}**Original prompt:** ${prompt}` : finalPrompt
      }${
        negative_prompt ? `\n**Negative Prompt:**\n${negative_prompt}` : ''
      }\n**Model:** ${currentModelName}\n**Seed:** ${actualSeed}  **Steps:** ${steps}  **CFG Scale:** ${cfg_scale}`,
      files: attachments,
    })
  },
}

export default diffuse
