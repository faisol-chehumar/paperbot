import { createWriteStream } from 'fs'
import * as https from 'https'

import { get } from '../utils/get.js'
import { UberDuckVoice } from './uberduckVoiceData.js'

interface UberDuckSpeakStatusResponse {
  failed_at: Date | null
  finished_at: Date | null
  meta: null
  path: string | null
  started_at: Date
}

type UberDuckSpeakResponse =
  | {
      isError: true
      url: null
      path: null
      error: string
    }
  | {
      isError: false
      url: string
      path: string
      error?: undefined
    }

const uberduckToken = `Basic ${Buffer.from(
  `${process.env.UBERDUCK_API_KEY}:${process.env.UBERDUCK_API_SECRET}`
).toString('base64')}`

let retryCount = 0

/**
 * Returns a UUID that we can use to check the status of the audio
 * @param voice - Which voice to use
 * @param message - The message to speak
 */
export async function synthesizeUberDuckAudio(
  voice: UberDuckVoice,
  message: string
): Promise<
  UberDuckSpeakResponse & {
    uuid: string
  }
> {
  console.log(`Creating audio request [${voice}] - ${message}`)
  const response = await get<{ uuid: string }>(
    'https://api.uberduck.ai/speak',
    {
      body: JSON.stringify({
        pace: 1,
        speech: message,
        voice,
      }),
      headers: {
        'Content-Type': 'application/json',
        accept: 'application/json',
        authorization: uberduckToken,
      },
      method: 'POST',
    }
  )
  console.log(`Uberduck is synthesizing audio with UUID ${response.uuid}`)

  if (response.uuid === undefined) {
    console.error('Probably tripped a language filter')
    return {
      error: 'You probably tripped a language filter or something, dirty man',
      isError: true,
      path: null,
      url: null,
      uuid: '',
    }
  }

  try {
    const audioData = await waitUntilAudioIsReady(response.uuid)

    retryCount = 0
    return {
      ...audioData,
      uuid: response.uuid,
    }
  } catch (error) {
    retryCount++
    if (retryCount <= 3) {
      return synthesizeUberDuckAudio(voice, message)
    } else {
      throw new Error(
        'Something went wrong while trying to synthesize the audio'
      )
    }
  }
}

export async function checkAudioStatus(uuid: string) {
  console.log('Checking status of', uuid)
  const response = await get<UberDuckSpeakStatusResponse>(
    `https://api.uberduck.ai/speak-status?uuid=${uuid}`,
    {
      headers: {
        accept: 'application/json',
      },
    }
  )
  if (response.failed_at) {
    throw new Error('Failed to synthesize audio')
  } else if (response.finished_at) {
    console.log('Audio is ready at:', response.path)
  }
  return response.path
}

function waitUntilAudioIsReady(uuid: string) {
  return new Promise<UberDuckSpeakResponse>((resolve, reject) => {
    const interval = setInterval(async () => {
      try {
        const url = await checkAudioStatus(uuid)
        if (url) {
          clearInterval(interval)

          https.get(url, (response) => {
            const fileStream = createWriteStream(
              `./.cache/uberduck/${uuid}.mp3`
            )
            response.pipe(fileStream)
            response.on('error', (error) => {
              console.error('Something went wrong piping the response', error)
              resolve({
                error: error.toString(),
                isError: true,
                path: null,
                url: null,
              })
            })
            fileStream.on('finish', () => {
              resolve({
                isError: false,
                path: `./.cache/uberduck/${uuid}.mp3`,
                url,
              })
            })
          })
        }
      } catch (error) {
        clearInterval(interval)
        console.error('Something went wrong while checking the audio status')
        reject(error)
      }
    }, 1500)
  })
}
