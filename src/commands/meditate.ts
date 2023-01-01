import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  SlashCommandBuilder,
} from 'discord.js'

import { getVoiceChannelOfInteraction } from '../utils/channel.js'
import { get } from '../utils/get.js'
import { playAudioFileOnChannel } from '../utils/voice.js'
import { CommandInterface } from './index.js'

type MeditationPart = MeditationQuote | MeditationTransition | MedidationStop

interface MeditationQuote {
  duration: number
  text: string
  type: 'quote'
  time: number
}

interface MeditationTransition {
  duration: number
  image: string
  type: 'transition'
  time: number
}

interface MedidationStop {
  type: 'stop'
  time: number
}

interface MindfulData {
  data: MeditationPart[]
  mp3: string
}

let sessionId = await (
  await fetch('https://inspirobot.me/api?getSesssionID=1')
).text()

const meditate: CommandInterface = {
  data: new SlashCommandBuilder()
    .setName('meditate')
    .setDescription('Be a meditating cunt')
    .addBooleanOption((option) =>
      option
        .setName('new-session')
        .setDescription('Create a new meditation session, cunt')
    ),
  async onButton(interaction) {
    const [action, sessionId] = interaction.customId.split('-')

    if (action === 'replay') {
      const voiceChannel = getVoiceChannelOfInteraction(interaction)
      if (!voiceChannel) {
        await interaction.reply({
          content: 'Try joining a voice channel before trying to replay cunt',
        })
      }
    } else if (action === 'stop') {
    }
  },
  async onExecute(interaction) {
    console.log('Meditating this cunt', interaction.user.username)
    const newSession = interaction.options.getBoolean('new-session')
    const voiceChannel = getVoiceChannelOfInteraction(interaction)

    if (!voiceChannel) {
      await interaction.reply({
        content:
          'Try joining a voice channel before running this command, cunt',
        ephemeral: true,
      })
      return
    }

    await interaction.deferReply()

    try {
      if (!sessionId || newSession) {
        sessionId = await (
          await fetch('https://inspirobot.me/api?getSesssionID=1')
        ).text()
      }
      const mindfulData = await get<MindfulData>(
        `https://inspirobot.me/api?generateFlow=1&sessionID=${sessionId}`
      )

      const totalTime = mindfulData.data[mindfulData.data.length - 1].time + 1

      const player = await playAudioFileOnChannel(voiceChannel, mindfulData.mp3)
      player.addListener(`kill-${sessionId}`, () => {
        player.stop()
      })

      const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setCustomId(`replay-${sessionId}`)
          .setLabel('Replay')
          .setStyle(ButtonStyle.Primary),
        new ButtonBuilder()
          .setCustomId(`stop-${sessionId}`)
          .setLabel('Stop')
          .setStyle(ButtonStyle.Danger)
      )

      await interaction.followUp({
        // @ts-ignore
        components: [row],
        content: `Be mindful for ${totalTime} seconds, cunt`,
      })
    } catch (error) {
      console.error(error)
      throw error
    }
  },
}

export default meditate
