import WebSocket from 'ws'

const API_URL = 'wss://runwayml-stable-diffusion-v1-5.hf.space/queue/join'

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
  data: [string, string, number]
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

export type StableDiffusionMsg = TriggerMsg | ProcessCompletedMsg | QueueMsg

// Should be sent after receiving 'send_hash'
interface HashData {
  session_hash: string
  fn_index: number // 3
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

export async function generateStableDiffusionImage(
  prompt: string
): Promise<StableDiffusionImageResults> {
  const client = new WebSocket(API_URL)
  const hash = generateHash()

  console.log(`Generating new Stable Diffusion image with prompt: ${prompt}`)

  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => {
      client.close()
      reject(new Error('Timed out while generating an image'))
    }, 120000)

    client.on('error', (error) => {
      reject(error)
    })

    client.on('message', (message) => {
      const data = JSON.parse('' + message) as StableDiffusionMsg

      switch (data.msg) {
        case 'send_hash':
          client.send(JSON.stringify(hash))
          break
        case 'send_data':
          const sendData = {
            data: [prompt],
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
      }
    })
  })
}
