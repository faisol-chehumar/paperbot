import { writeFileSync } from 'fs'
import WebSocket from 'ws'

const API_URL = 'wss://runwayml-stable-diffusion-v1-5.hf.space/queue/join'

interface StableDiffusionImageResults {
  images: Buffer[]
  hash: string
  duration: number
}

interface StableDiffusionImageResponse {
  msg: 'process_completed' | 'send_hash' | 'send_data'
  output: {
    data: string[][]
    is_generating: boolean
    duration: number
    average_duration: number
  }
  success: boolean
}

export function generateHash() {
  const chars = 'qwertyuopasdfghjklizxcvbnm0123456789'
  const hash = new Array(11)
    .fill(0)
    .map(() => chars[Math.floor(Math.random() * chars.length)])
    .join('')

  return {
    fn_index: 2,
    session_hash: hash,
  }
}

function parseResults(data: string[]) {
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
      const data = JSON.parse('' + message) as StableDiffusionImageResponse

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
          if (!data || !data.output || !data.output.data) {
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
