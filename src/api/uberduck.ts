import { get } from '../utils/get'
import { UberDuckVoice } from './uberduckVoiceData'

interface UberDuckSpeakStatusResponse {
  failed_at: Date | null
  finished_at: Date | null
  meta: null
  path: string | null
  started_at: Date
}
const uberduckToken = `Basic ${Buffer.from(
  `${process.env.UBERDUCK_API_KEY}:${process.env.UBERDUCK_API_SECRET}`
).toString('base64')}`

/**
 * Returns an UUID that we can use to check the status of the audio
 * @param voice - Which voice to use
 * @param message - The message to speak
 */
export async function synthesizeUberDuckAudio(
  voice: UberDuckVoice,
  message: string
) {
  console.log('Creating audio request')
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

  const audioData = await waitUntilAudioIsReady(response.uuid)
  return {
    ...audioData,
    uuid: response.uuid,
  }
}

export async function checkAudioStatus(uuid: string) {
  // 15314253-e929-4859-99ff-e34a3f7b1f32
  console.log('Checking status of', uuid)
  const response = await get<UberDuckSpeakStatusResponse>(
    `https://api.uberduck.ai/speak-status?uuid=${uuid}`,
    {
      headers: {
        accept: 'application/json',
      },
    }
  )
  console.log('Received', response)
  if (response.failed_at) {
    throw new Error('Failed to synthesize audio')
  }
  return response.path
}

function waitUntilAudioIsReady(uuid: string) {
  return new Promise<
    { isError: true; path: null } | { isError: false; path: string }
  >((resolve) => {
    const interval = setInterval(async () => {
      try {
        const path = await checkAudioStatus(uuid)
        if (path) {
          clearInterval(interval)
          resolve({ isError: false, path })
        }
      } catch (error) {
        clearInterval(interval)
        resolve({ isError: true, path: null })
      }
    }, 1000)
  })
}
