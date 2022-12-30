import { post } from '../utils/get.js'

export interface MageSpaceOptions {
  aspect_ratio?: number // float
  num_inference_steps?: number
  guidance_scale?: number
  is_public?: boolean
  strength?: number
  negative_prompt?: string
  seed?: number
  model?: 'v1.5' | 'v2.1'
}

interface MageSpaceResponse {
  results: {
    id: string
    uid: string
    image_url: string
    width: number
    height: number
    blurhash: string
    is_nsfw: boolean
    is_public: boolean
    is_enhanced: boolean
    metadata: {
      prompt: string
      num_inference_steps: number
      guidance_scale: number
      negative_prompt: string
      model_version: string
      width: number
      height: number
      seed: number
    }
    model_name: string
    model_version: string
  }[]
}
export async function generateMageSpaceImage(
  prompt: string,
  options: MageSpaceOptions
) {
  console.log(
    `Generating new Mage Space image with prompt:\n${prompt}\nOptions: ${JSON.stringify(
      options
    )}\n`
  )

  const start = Date.now()
  const response = await post<MageSpaceResponse>(
    'https://api.mage.space/api/v2/images/generate',
    {
      body: JSON.stringify({
        prompt,
        ...options,
      }),
      headers: {
        Authorization: `Bearer eyJhbGciOiJSUzI1NiIsImtpZCI6Ijg3NTNiYmFiM2U4YzBmZjdjN2ZiNzg0ZWM5MmY5ODk3YjVjZDkwN2QiLCJ0eXAiOiJKV1QifQ.eyJuYW1lIjoiQWxkZXJ0IFZhYW5kZXJpbmciLCJwaWN0dXJlIjoiaHR0cHM6Ly9saDMuZ29vZ2xldXNlcmNvbnRlbnQuY29tL2EvQUVkRlRwN0NVdEdqX0NWM2Viem1aS08yOUExUnhkQ1pMOXJHREVWVGRQekljeDg9czk2LWMiLCJpc3MiOiJodHRwczovL3NlY3VyZXRva2VuLmdvb2dsZS5jb20vbWFnZWRvdHNwYWNlIiwiYXVkIjoibWFnZWRvdHNwYWNlIiwiYXV0aF90aW1lIjoxNjcyMjc3NDYyLCJ1c2VyX2lkIjoiT3NIbGJ5RVVDUWVINTZGZzh3TWpGRGtLQWdNMiIsInN1YiI6Ik9zSGxieUVVQ1FlSDU2Rmc4d01qRkRrS0FnTTIiLCJpYXQiOjE2NzIyNzc0NjIsImV4cCI6MTY3MjI4MTA2MiwiZW1haWwiOiJwYXBlcmZlZWRAZ21haWwuY29tIiwiZW1haWxfdmVyaWZpZWQiOnRydWUsImZpcmViYXNlIjp7ImlkZW50aXRpZXMiOnsiZ29vZ2xlLmNvbSI6WyIxMDAwOTUxMTAwODM1NDczOTgzNjgiXSwiZW1haWwiOlsicGFwZXJmZWVkQGdtYWlsLmNvbSJdfSwic2lnbl9pbl9wcm92aWRlciI6Imdvb2dsZS5jb20ifX0.Qg-0ZLrvXt_jo7z2_i40Ae_GasfnIO76m5EiFSRnHxUD1A3SbfiszfRYUQNcqYNiKMPkFjdW0SzkJGSq7QAZPnqcTsanssxBA_Y0bjs4V2R1ROg_WmLxHHIOlQodKV0GVGAZE-v8ljXnfov2tCBqagYObBao_-8kPYNo8Ke7zn2EWJJ8oKpsDEFhJyA9rKoPA_Sjz8frtMxophIs7G_8Is6dpMx49y-25p82kLhTpWsC_R4Ta9qakE7THgSsPmMnQ4Z2cDfvpKTW_VgtEyFJ9rDapDNqqtAsglLEBlhhdX30XVPbcYxpEFxrbZ2GaPY8AkxQMxM_LZui7_pRk8okEA`,
        accept: 'application/json',
      },
    }
  )
  const duration = (Date.now() - start) / 1000

  console.log(`Generated mage.space image in ${duration} seconds`)
  console.log(response)
  const image = response.results[0]
  return { duration, hash: image.uid, image: image.image_url }
}
