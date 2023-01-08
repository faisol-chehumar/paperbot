import WebSocket from 'ws'

const SD15_API_URL = 'wss://runwayml-stable-diffusion-v1-5.hf.space/queue/join'
const SD21_API_URL = 'wss://stabilityai-stable-diffusion.hf.space/queue/join'

interface StableDiffusionImageResults {
  images: Buffer[]
  hash: string
  duration: number
}

interface HashData {
  session_hash: string
  fn_index: number // 3
}

type StableDiffusionMsg = TriggerMsg | ProcessCompletedMsg | QueueMsg
interface StableDiffusionImageResults {
  images: Buffer[]
  hash: string
  duration: number
}

// Can be received after sending a hash
export interface QueueMsg {
  msg: 'estimation'
  rank: number
  rank_eta: number
  avg_event_process_time: number
  avg_event_concurrent_process_time: number
  queue_eta: number
  queue_size: number
}

export interface DataMsg {
  fn_index: number //3
  data: (string | number)[]
  session_hash: string
}

interface TriggerMsg {
  msg: 'send_hash' | 'send_data' | 'process_starts' | 'queue_full'
}

interface ProcessCompletedMsg {
  msg: 'process_completed'
  output:
    | {
        average_duration: number
        data: string[][]
        duration: number
        is_generating: boolean
      }
    | {
        error: string
      }
  success: boolean
}

interface HuggingSpaceOptions {
  apiURL: string
  parameters: (string | number)[]
  onStart: () => void
  onQueue: (queue: number, total: number) => void
  hashFn: () => HashData
}

export function generateHash(fn_index = 2): HashData {
  const chars = 'qwertyuopasdfghjklizxcvbnm0123456789'
  const hash = new Array(11)
    .fill(0)
    .map(() => chars[Math.floor(Math.random() * chars.length)])
    .join('')

  return {
    fn_index,
    session_hash: hash,
  }
}

export function parseResults(data: string[]) {
  // Strip metadata from base64 strings
  const rawImages = data.map((image) => image.split(',')[1])
  return rawImages.map((image) => Buffer.from(image, 'base64'))
}

export function generateStableDiffusionV21Image(
  prompt: string,
  negativePrompt: string = '',
  cfgScale: number = 9,
  onQueue: HuggingSpaceOptions['onQueue']
): Promise<StableDiffusionImageResults> {
  return generateHuggingSpaceImage({
    apiURL: SD21_API_URL,
    hashFn: () => generateHash(3), // SD2.1 uses fn_index 3
    onQueue,
    onStart: () =>
      console.log(
        `Generating new Stable Diffusion v2.1 image with prompt: ${prompt} | ${negativePrompt}`
      ),
    parameters: [prompt, negativePrompt, cfgScale],
  })
}

export function generateStableDiffusionV15Image(
  prompt: string,
  onQueue: HuggingSpaceOptions['onQueue']
): Promise<StableDiffusionImageResults> {
  return generateHuggingSpaceImage({
    apiURL: SD15_API_URL,
    hashFn: () => generateHash(2),
    onQueue,
    onStart: () =>
      console.log(
        `Generating new Stable Diffusion v1.5 image with prompt: ${prompt}`
      ),
    parameters: [prompt],
  })
}

export async function generateHuggingSpaceImage({
  apiURL,
  hashFn,
  onQueue,
  onStart,
  parameters,
}: HuggingSpaceOptions): Promise<StableDiffusionImageResults> {
  const client = new WebSocket(apiURL)

  const hash = hashFn()
  onStart()

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
            data: parameters,
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
          generateHuggingSpaceImage({
            apiURL,
            hashFn,
            onQueue,
            onStart,
            parameters,
          }).then(resolve, reject)
          break
      }
    })
  })
}
