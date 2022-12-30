import WebSocket from 'ws'

import {
  DataMsg,
  generateHash,
  parseResults,
  StableDiffusionMsg,
} from './stablediffusion.js'

const API_URL = 'wss://stabilityai-stable-diffusion.hf.space/queue/join'

interface StableDiffusionV2ImageResults {
  images: Buffer[]
  hash: string
  duration: number
}

export async function generateStableDiffusionV2Image(
  prompt: string,
  negativePrompt: string = '',
  cfgScale: number = 9,
  onQueue: (queue: number, total: number) => void
): Promise<StableDiffusionV2ImageResults> {
  const client = new WebSocket(API_URL)

  // SD2.1 uses fn_index 3
  const hash = generateHash(3)

  console.log(
    `Generating new Stable Diffusion v2.1 image with prompt: ${prompt} | ${negativePrompt}`
  )

  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => {
      client.close()
      reject(new Error('Timed out while generating an image'))
    }, 300000)

    let rateLimiter: NodeJS.Timeout | null = null

    client.on('error', (error) => {
      clearTimeout(timeout)
      reject(error)
    })

    client.on('message', (message) => {
      const data = JSON.parse(message.toString()) as StableDiffusionMsg

      switch (data.msg) {
        case 'send_hash':
          client.send(JSON.stringify(hash))
          break
        case 'send_data':
          const sendData: DataMsg = {
            data: [prompt, negativePrompt, cfgScale],
            ...hash,
          }
          client.send(JSON.stringify(sendData))
          break
        case 'process_completed':
          clearTimeout(timeout)
          if ('error' in data.output) {
            reject(new Error('No data returned from API'))
            return
          }

          const results: string[] = data.output.data[0]
          resolve({
            duration: data.output.duration,
            hash: hash.session_hash,
            images: parseResults(results),
          })
          break
        case 'estimation':
          if (!rateLimiter) {
            onQueue(data.rank, data.queue_size)
            rateLimiter = setTimeout(() => {
              rateLimiter = null
            }, 1000)
          }
          break
        case 'queue_full':
          clearTimeout(timeout)
          generateStableDiffusionV2Image(
            prompt,
            negativePrompt,
            cfgScale,
            onQueue
          ).then(resolve, reject)
          break
      }
    })
  })
}
