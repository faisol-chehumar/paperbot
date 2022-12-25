import {
  AudioPlayerStatus,
  createAudioPlayer,
  createAudioResource,
  entersState,
  StreamType,
} from '@discordjs/voice'
import { VoiceBasedChannel } from 'discord.js'

import { connectToChannel } from './channel'

export const audioPlayer = createAudioPlayer()

export function playAudio() {
  const resource = createAudioResource(
    'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3',
    {
      inputType: StreamType.Arbitrary,
    }
  )

  audioPlayer.play(resource)

  return entersState(audioPlayer, AudioPlayerStatus.Playing, 5000)
}

export async function playAudioFileOnChannel(
  voiceChannel: VoiceBasedChannel,
  audioPath: string
) {
  const connection = await connectToChannel(voiceChannel)
  const resource = createAudioResource(audioPath, {
    inputType: StreamType.Arbitrary,
  })
  connection.subscribe(audioPlayer)
  audioPlayer.play(resource)
}