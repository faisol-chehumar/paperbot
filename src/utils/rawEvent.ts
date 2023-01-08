import { discordClient } from '../main.js'

export interface RawEvent {
  d: any
  op: number
  s: number
  t: string
}

export async function getRawEventMessage(event: RawEvent) {
  const guild = await discordClient.guilds.fetch(event.d.guild_id)
  const channel = await guild.channels.fetch(event.d.channel_id)

  if (!channel || !channel.isTextBased()) return {}

  const message = await channel.messages.fetch(event.d.message_id)

  return {
    channel,
    guild,
    message,
  }
}
