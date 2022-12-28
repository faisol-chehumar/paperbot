import { components } from '../types/openapi.js'
import { get, post } from '../utils/get.js'
import { generateHash } from './stablediffusion.js'

export type StableDiffusionV2PostParameters =
  components['schemas']['StableDiffusionProcessingTxt2Img']

type StableDiffusionV2ImageResults =
  components['schemas']['TextToImageResponse']

// parameters: {
//     batch_size: 1,
//     cfg_scale: 7,
//     denoising_strength: 0,
//     enable_hr: false,
//     eta: null,
//     firstphase_height: 0,
//     firstphase_width: 0,
//     height: 512,
//     n_iter: 1,
//     negative_prompt: null,
//     override_settings: null,
//     override_settings_restore_afterwards: true,
//     prompt: 'Hello world',
//     restore_faces: false,
//     s_churn: 0,
//     s_noise: 1,
//     s_tmax: null,
//     s_tmin: 0,
//     sampler_index: 'Euler',
//     sampler_name: null,
//     seed: -1,
//     seed_resize_from_h: -1,
//     seed_resize_from_w: -1,
//     steps: 50,
//     styles: null,
//     subseed: -1,
//     subseed_strength: 0,
//     tiling: false,
//     width: 512,
//   },

export async function generateStableDiffusionV2Images(
  prompt: string,
  opts: Partial<StableDiffusionV2PostParameters>
) {
  console.log(
    `Generating new Stable Diffusion V2 image with prompt:\n${prompt}\nOptions: ${JSON.stringify(
      opts
    )}\n`
  )

  const start = Date.now()

  try {
    const response = await post<StableDiffusionV2ImageResults>(
      'https://492341fce9ce0a02.gradio.app/sdapi/v1/txt2img',
      {
        body: JSON.stringify({
          prompt,
          ...opts,
        } as StableDiffusionV2PostParameters),
      }
    )

    if (!response) {
      throw new Error('Something went wrong generating the image')
    }

    const duration = (Date.now() - start) / 1000

    const images =
      response.images?.map((image) => Buffer.from(image, 'base64')) ?? []

    console.log(
      `Generated ${images.length} Stable Diffusion V2 image(s) in ${duration}s`
    )

    return {
      duration,
      hash: generateHash(),
      images,
      seed: response.parameters.seed,
    }
  } catch (e) {
    console.log(e)
    throw new Error('Failed to generate Stable Diffusion V2 image')
  }
}
