import {
  entersState,
  joinVoiceChannel,
  VoiceConnectionStatus,
} from '@discordjs/voice'
import {
  APIInteractionGuildMember,
  GuildMember,
  Interaction,
  VoiceBasedChannel,
} from 'discord.js'

import { createDiscordJSAdapter } from './adapter.js'

export async function connectToChannel(channel: VoiceBasedChannel) {
  const connection = joinVoiceChannel({
    adapterCreator: createDiscordJSAdapter(channel),
    channelId: channel.id,
    guildId: channel.guild.id,
  })

  try {
    await entersState(connection, VoiceConnectionStatus.Ready, 30_000)
    return connection
  } catch (error) {
    connection.destroy()
    throw error
  }
}

export function getVoiceChannelOfMember(
  member: GuildMember | APIInteractionGuildMember
) {
  if ('voice' in member) {
    return member.voice.channel
  } else {
    throw new Error('Member is not in a voice channel')
  }
}

export function getVoiceChannelOfInteraction(interaction: Interaction) {
  if ('member' in interaction && interaction.member) {
    return getVoiceChannelOfMember(interaction.member)
  } else {
    throw new Error('Member is not in a voice channel')
  }
}
