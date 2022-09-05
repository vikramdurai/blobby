import { ApplyOptions } from '@sapphire/decorators'
import { Command } from '@sapphire/framework'
import { Message, MessageEmbed } from 'discord.js'
import { utils } from 'ka-api'
import { cookies } from '../../lib/khan-cookies'
import { latencyStats } from '../../lib/mongodb/mongodb'

@ApplyOptions<Command.Options>({
  description: "Get the bot's latency",
})
export class UserCommand extends Command {
  public override registerApplicationCommands(registry: Command.Registry) {
    registry.registerChatInputCommand(
      {
        name: this.name,
        description: this.description,
      },
      { idHints: ['1012935998713368627'] }
    )
  }

  private async embeds(interaction: Command.ChatInputInteraction) {
    const message = await interaction.fetchReply()

    const createdTime = message instanceof Message ? message.createdTimestamp : Date.parse(message.timestamp)
    const khanLatency = await utils.getLatency(cookies)
    const mongoLatencyStats = await latencyStats().catch((err) => {
      this.container.logger.error(err)
      return null
    })

    const embed = new MessageEmbed() //
      .setColor(khanLatency ? 'GREEN' : 'RED')
      .setTitle('🏓 Pong!')
      .addFields(
        {
          name: 'Bot',
          value: `${Math.round(this.container.client.ws.ping).toLocaleString()}ms`,
        },
        {
          name: 'Discord API',
          value: `${(createdTime - interaction.createdTimestamp).toLocaleString()}ms`,
        },
        {
          name: 'Khan Academy API',
          value: khanLatency ? `${Math.round(khanLatency).toLocaleString()}ms` : '❓',
        },
        {
          name: 'MongoDB',
          value: mongoLatencyStats ? `${Math.round(mongoLatencyStats.reads.latency / mongoLatencyStats.reads.ops).toLocaleString()}ms` : '❓',
        }
      )

    return [embed]
  }

  public async chatInputRun(interaction: Command.ChatInputInteraction) {
    await interaction.deferReply()

    return interaction.editReply({
      embeds: await this.embeds(interaction),
    })
  }
}
