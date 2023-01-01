import {
  createAudioPlayer,
  createAudioResource,
  StreamType,
} from '@discordjs/voice'
import { VoiceBasedChannel } from 'discord.js'

import { connectToChannel } from './channel.js'

export async function playAudioFileOnChannel(
  voiceChannel: VoiceBasedChannel,
  audioPath: string
) {
  const audioPlayer = createAudioPlayer()
  const connection = await connectToChannel(voiceChannel)
  const resource = createAudioResource(audioPath, {
    inputType: StreamType.Arbitrary,
  })
  connection.subscribe(audioPlayer)
  audioPlayer.play(resource)

  return audioPlayer
}
