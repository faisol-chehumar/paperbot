import { SlashCommandBuilder } from 'discord.js'

import { StableDiffusionOptions } from '../api/stablediffusion.js'
import { prisma } from '../main.js'
import { components } from '../types/openapi.js'
import { get, post } from '../utils/get.js'
import { CommandInterface } from './index.js'

type ModelResponse = components['schemas']['SDModelItem'][]
type SampleResponse = components['schemas']['SamplerItem'][]

export interface StoredOptions {
  sampler?: string
}

export const getCurrentModel = async () =>
  (await get<StableDiffusionOptions>('http://127.0.0.1:7860/sdapi/v1/options'))
    .sd_model_checkpoint

export async function updateCurrentModel() {
  currentModelName = await getCurrentModel()
}

async function init() {
  try {
    const models = await get<ModelResponse>(
      'http://127.0.0.1:7860/sdapi/v1/sd-models'
    )
    const samplers = await get<SampleResponse>(
      'http://127.0.0.1:7860/sdapi/v1/samplers'
    )
    const modelName = await getCurrentModel()

    return {
      modelName,
      models,
      samplers,
    }
  } catch (error) {
    console.error(
      'Stable diffusion is most likely not running, so could not fetch settings'
    )
    return {
      modelName: 'Unknown',
      models: [],
      samplers: [],
    }
  }
}

const { modelName, models, samplers } = await init()

export let currentModelName = modelName

// const preparedModels = models.map((model) => ({
//   ...model,
//   prepared: fuzzysort.prepare(model.title),
// }))

const configSd: CommandInterface = {
  data: new SlashCommandBuilder()
    .setName('config-sd')
    .setDescription('Configure global Stable Diffusion parameters')
    .addStringOption((option) =>
      option
        .setName('model')
        .setDescription('The prompt to generate the image with (global)')
        .addChoices(
          ...models.map((m) => ({ name: m.model_name, value: m.title }))
        )
    )
    .addStringOption((option) =>
      option
        .setName('sampler')
        .setDescription('The sampler to use when generating images (per user)')
        .addChoices(...samplers.map((s) => ({ name: s.name, value: s.name })))
    ),
  // async onAutocomplete(interaction) {
  //   const focusedOption = interaction.options.getFocused(true)
  //
  //   if (focusedOption.name === 'model') {
  //     const value = focusedOption.value
  //     const matchingModels = fuzzysort
  //       .go(value, preparedModels, { key: 'prepared', limit: 25 })
  //       .map((result) => ({
  //         name: result.obj.model_name,
  //         value: result.obj.title,
  //       }))
  //     await interaction.respond(matchingModels)
  //   }
  // },
  async onExecute(interaction) {
    const modelName = interaction.options.getString('model')
    const samplerName = interaction.options.getString('sampler')
    const memberId = interaction.user.id
    const guildId = interaction.guildId ?? undefined

    await interaction.deferReply()

    const existingConfig = await prisma.sDConfig.findFirst({
      where: {
        guildId,
        memberId,
      },
    })

    const storedConfig: StoredOptions = existingConfig?.config
      ? JSON.parse(existingConfig.config)
      : {}

    let responseString = '**Adjusted the following settings:\n**'
    const modifiedOptions: Partial<StableDiffusionOptions> = {}

    if (modelName) {
      modifiedOptions.sd_model_checkpoint = modelName
      responseString += `Set model to ${modelName} (note: this can take a short while)\n`
    }

    if (samplerName) {
      storedConfig.sampler = samplerName
      responseString += `Set sampler to ${samplerName}\n`
    }

    if (existingConfig) {
      await prisma.sDConfig.update({
        data: {
          config: JSON.stringify(storedConfig),
        },
        where: {
          id: existingConfig.id,
        },
      })
    } else {
      await prisma.sDConfig.create({
        data: {
          config: JSON.stringify(storedConfig),
          guildId,
          memberId,
        },
      })
    }

    if (
      Object.keys(modifiedOptions).length !== 0 ||
      Object.keys(storedConfig).length !== 0
    ) {
      console.log('Updating options to', modifiedOptions, storedConfig)
      await post<StableDiffusionOptions>(
        'http://127.0.0.1:7860/sdapi/v1/options',
        { body: JSON.stringify(modifiedOptions) }
      )
      if (modelName) currentModelName = modelName

      await interaction.followUp(responseString)
    } else {
      await interaction.followUp('No settings were modified')
    }
  },
}

export default configSd
