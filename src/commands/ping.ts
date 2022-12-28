import { CommandInteraction, SlashCommandBuilder } from 'discord.js'

import { CommandInterface } from './index.js'

const ping: CommandInterface = {
  data: new SlashCommandBuilder()
    .setName('ping')
    .setDescription('Replies with Pong!'),
  async onExecute(interaction: CommandInteraction) {
    await interaction.reply({ content: 'Pong!', ephemeral: true })
  },
}

export default ping
