import { prisma } from '../main.js'
import { components } from '../types/openapi.js'
import { post } from '../utils/get.js'
import { generateHash } from './huggingface.js'

export type StableDiffusionPostParameters =
  components['schemas']['StableDiffusionProcessingTxt2Img']
export type StableDiffusionImage2ImagePostParameters =
  components['schemas']['StableDiffusionProcessingImg2Img']

type StableDiffusionImageResults = components['schemas']['TextToImageResponse']

type StableDiffusionImage2ImageResults =
  components['schemas']['ImageToImageResponse']

export type StableDiffusionOptions = components['schemas']['Options']

interface PromptInfo {
  prompt: string
  all_prompts: string[]
  negative_prompt: string
  all_negative_prompts: string[]
  seed: number
  all_seeds: number[]
  subseed: number
  all_subseeds: number[]
  subseed_strenght: number
  width: number
  height: number
  sampler_name: string
  cfg_scale: number
  steps: number
  batch_size: number
  restore_faces: boolean
  face_restoration_model: string | null
  sd_model_hash: string
  seed_resize_from_w: number
  seed_resize_from_h: number
  denoising_strength: number
  extra_generation_params: Record<string, string | number>
  index_of_first_image: number
  infotexts: string[]
  styles: string[]
  job_timestamp: string
  clip_skip: number
  is_using_inpainting_conditioning: boolean
}

// http://127.0.0.1:7860/docs
// https://colab.research.google.com/drive/1QM80aCkk0psAVBr_CUgP1_4vfC6Ov3Ov

export async function diffuseText2Image(
  prompt: string,
  opts: Partial<StableDiffusionPostParameters>
) {
  console.log(
    `Generating new Stable Diffusion V2 image with prompt:\n${prompt}\nOptions: ${JSON.stringify(
      opts
    )}\n`
  )

  const start = Date.now()

  try {
    const response = await post<StableDiffusionImageResults>(
      // 'https://492341fce9ce0a02.gradio.app/sdapi/v1/txt2img',
      // 'https://paperfeed.loca.lt/sdapi/v1/txt2img',
      'http://127.0.0.1:7860/sdapi/v1/txt2img',
      {
        body: JSON.stringify({
          prompt,
          ...opts,
        } as StableDiffusionPostParameters),
      }
    )

    if (!response) {
      throw new Error('Something went wrong generating the image')
    }

    const duration = (Date.now() - start) / 1000

    const images =
      response.images?.map((image) => Buffer.from(image, 'base64')) ?? []

    const info = JSON.parse(response.info) as PromptInfo

    console.log(
      `Generated ${images.length} Stable Diffusion V2 image(s) in ${duration}s`
    )

    return {
      duration,
      hash: generateHash(),
      images,
      info,
      seed: info.seed,
    }
  } catch (error) {
    if (error instanceof TypeError) {
      console.log(error)
      throw new Error(
        'Stable Diffusion is offline, beg master daddy to turn the server on.'
      )
    } else {
      throw error
    }
  }
}

export async function diffuseImage2Image(
  image: string,
  prompt: string,
  opts: Partial<StableDiffusionPostParameters>
) {
  console.log(
    `Generating Stable Diffusion image2image with prompt:\n${prompt}\nOptions: ${JSON.stringify(
      opts
    )}\n`
  )
  const start = Date.now()

  try {
    const response = await post<StableDiffusionImage2ImageResults>(
      'http://127.0.0.1:7860/sdapi/v1/img2img',
      {
        body: JSON.stringify({
          init_images: [image],
          prompt,
          ...opts,
        } as StableDiffusionImage2ImagePostParameters),
      }
    )

    const duration = (Date.now() - start) / 1000

    const images =
      response.images?.map((image) => Buffer.from(image, 'base64')) ?? []

    const info = JSON.parse(response.info) as PromptInfo

    console.log(
      `Generated ${images.length} Stable Diffusion V2 image(s) in ${duration}s`
    )

    return {
      duration,
      hash: generateHash(),
      images,
      info,
      seed: info.seed,
    }
  } catch (error) {
    if (error instanceof TypeError) {
      console.log(error)
      throw new Error(
        'Stable Diffusion is offline, beg master daddy to turn the server on.'
      )
    } else {
      throw error
    }
  }
}
