import { ApplyOptions } from '@sapphire/decorators'
import { Command } from '@sapphire/framework'
import type { ApplicationCommandOptionChoiceData } from 'discord.js'
import { AutoCompleteLimits } from '@sapphire/discord-utilities'
import { userMention } from '@discordjs/builders'
import config from '../../config'
import { InfoTopic, parseInfoTopics } from '../../lib/info-topics-parser'
import { rootDir } from '../../lib/constants'
import path from 'path'
import { hyperlinkSilent } from '../../lib/utils/discord'

const topics = parseInfoTopics(path.join(rootDir, 'data', 'topics'))

@ApplyOptions<Command.Options>({
  description: 'Look up common topics about programming on Khan Academy',
})
export class UserCommand extends Command {
  public override registerApplicationCommands(registry: Command.Registry) {
    registry.registerChatInputCommand(
      (builder) =>
        builder //
          .setName(this.name)
          .setDescription(this.description)
          .addStringOption((option) =>
            option //
              .setName('topic')
              .setDescription('What should I send topics about?')
              .setRequired(true)
              .setAutocomplete(true)
          )
          .addUserOption((option) =>
            option //
              .setName('mention')
              .setDescription('Should I tell anyone in particular?')
          ),
      { idHints: ['1025325503357390909', '1025290775094890547'] }
    )
  }

  public autocompleteRun(interaction: Command.AutocompleteInteraction) {
    const focusedOption = interaction.options.getFocused(true),
      query = focusedOption.value.toLowerCase()

    let results: InfoTopic[] = []
    if (focusedOption.name === 'topic') {
      results = results.concat(topics.filter((topic) => topic.data.keywords.includes(query)))
      results = results.concat(topics.filter((topic) => topic.data.keywords.find((keyword) => keyword.includes(query))))
      // noinspection JSVoidFunctionReturnValueUsed
      results = results.concat(topics.filter((topic) => topic.content.toLowerCase().includes(query)))
    }

    results = [...new Set(results)]
    if (results.length > AutoCompleteLimits.MaximumAmountOfOptions) results.splice(AutoCompleteLimits.MaximumAmountOfOptions)
    const options: ApplicationCommandOptionChoiceData[] = results.map((result) => ({ name: result.data.title, value: result.data.title }))
    return interaction.respond(options)
  }

  public async chatInputRun(interaction: Command.ChatInputInteraction) {
    const topic = interaction.options.getString('topic', true),
      mention = interaction.options.getUser('mention')
    const content = topics
      .find(({ data: { title } }) => title === topic)
      ?.content.replace(/\[(.+?)]\((.+?)\)/g, (_match, content, url) => hyperlinkSilent(content, url))

    if (!content)
      return interaction.reply({
        content: `Sorry, I don't know anything about that topic yet. If you want to share what you know let ${userMention(config.support)} know.`,
        ephemeral: true,
      })

    return interaction.reply(`${mention ? userMention(mention.id) + ' ' : ''}${content}`)
  }
}
