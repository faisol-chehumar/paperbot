import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  EmbedBuilder,
  SlashCommandBuilder,
} from 'discord.js'
import { existsSync } from 'fs'
import fuzzysort from 'fuzzysort'

import { checkAudioStatus, synthesizeUberDuckAudio } from '../api/uberduck.js'
import { UberDuckVoice, UberDuckVoices } from '../api/uberduckVoiceData.js'
import { getVoiceChannelOfInteraction } from '../utils/channel.js'
import { playAudioFileOnChannel } from '../utils/voice.js'
import { CommandInterface } from './index.js'

const autocompleteTargets = UberDuckVoices.map((voice) => ({
  ...voice,
  prepared: fuzzysort.prepare(voice.name),
}))

const tts: CommandInterface = {
  data: new SlashCommandBuilder()
    .setName('tts')
    .setDescription('Speaks out the text you provide')
    .addStringOption((option) =>
      option
        .setName('message')
        .setDescription('The text to speak out')
        .setRequired(true)
    )
    .addStringOption((option) =>
      option
        .setName('voice')
        .setDescription('The voice to use')
        .setAutocomplete(true)
    ),
  async onAutocomplete(interaction) {
    const focusedOption = interaction.options.getFocused(true)

    if (focusedOption.name === 'voice') {
      const value = focusedOption.value
      // const matchingVoices = UberDuckVoices.filter((voiceData) =>
      //   voiceData.name.toLowerCase().includes(value)
      // ).slice(0, 25)
      const matchingVoices = fuzzysort
        .go(value, autocompleteTargets, { key: 'prepared', limit: 25 })
        .map((result) => result.obj)
      await interaction.respond(matchingVoices)
    }
  },
  async onButton(interaction) {
    const uuid = interaction.customId

    const voiceChannel = getVoiceChannelOfInteraction(interaction)
    let path = `./.cache/uberduck/${uuid}.mp3`
    if (!existsSync(path)) {
      const url = await checkAudioStatus(uuid)
      if (!url) throw new Error('Audio file is no longer available')
      path = url
    }

    await interaction.deferUpdate()

    if (!voiceChannel) {
      await interaction.followUp({
        content: 'Try joining a voice channel before running this command!',
        ephemeral: true,
      })
      return
    }

    await playAudioFileOnChannel(voiceChannel, path)
  },
  async onExecute(interaction) {
    const voiceChannel = getVoiceChannelOfInteraction(interaction)

    if (!voiceChannel) {
      await interaction.reply({
        content: 'Try joining a voice channel before running this command!',
        ephemeral: true,
      })
      return
    }

    const message = interaction.options.getString('message', true)
    const voice =
      (interaction.options.getString('voice') as UberDuckVoice) ?? 'spongebob'

    // Confirm interaction but defer, so that we have time to synthesise the audio
    await interaction.deferReply()

    const { error, isError, path, url, uuid } = await synthesizeUberDuckAudio(
      voice,
      message
    )

    if (isError) {
      await interaction.followUp({
        content: error,
        ephemeral: true,
      })
      return
    }

    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId(uuid)
        .setLabel('Replay')
        .setStyle(ButtonStyle.Primary)
    )

    const embed = new EmbedBuilder()
      .setTitle('Finished synthesizing audio')
      .addFields(
        { inline: true, name: 'Voice', value: voice },
        { inline: true, name: 'Message', value: message },
        { name: 'Audio File', value: url }
      )

    await interaction.followUp({
      // @ts-ignore - No idea why this is complaining
      components: [row],
      embeds: [embed],
    })

    await playAudioFileOnChannel(voiceChannel, path)
  },
}

export default tts
