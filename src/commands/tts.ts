import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  EmbedBuilder,
  SlashCommandBuilder,
} from 'discord.js'

import { checkAudioStatus, synthesizeUberDuckAudio } from '../api/uberduck'
import { UberDuckVoice, UberDuckVoices } from '../api/uberduckVoiceData'
import { getVoiceChannelOfInteraction } from '../utils/channel'
import { playAudioFileOnChannel } from '../utils/voice'
import { CommandInterface } from './index'

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
      const value = focusedOption.value.toLowerCase()
      const matchingVoices = UberDuckVoices.filter((voiceData) =>
        voiceData.name.toLowerCase().includes(value)
      ).slice(0, 25)
      await interaction.respond(matchingVoices)
    }
  },
  async onButton(interaction) {
    const uuid = interaction.customId

    const voiceChannel = getVoiceChannelOfInteraction(interaction)
    const path = await checkAudioStatus(uuid)

    await interaction.deferUpdate()

    if (!path) {
      await interaction.followUp({ content: 'Test' })
      return
    }

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

    const { isError, path, uuid } = await synthesizeUberDuckAudio(
      voice,
      message
    )

    if (isError) {
      await interaction.followUp(
        'Something went wrong while trying to synthesize the audio'
      )
      return
    }

    // const assetPath = `./assets/audio/itiswednesday.mp3`
    await playAudioFileOnChannel(voiceChannel, path)

    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId(uuid)
        .setLabel('Replay')
        .setStyle(ButtonStyle.Primary)
    )

    const embed = new EmbedBuilder()
      .setTitle('Finished synthesizing audio')
      .addFields(
        { name: 'Message', value: message },
        { inline: true, name: 'Voice', value: voice },
        { inline: true, name: 'Audio File', value: path }
      )

    await interaction.followUp({
      // @ts-ignore - No idea why this is complaining
      components: [row],
      embeds: [embed],
    })
  },
}

export default tts
