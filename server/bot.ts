import {
  Client,
  GatewayIntentBits,
  REST,
  Routes,
  SlashCommandBuilder,
  SlashCommandUserOption,
  SlashCommandStringOption,
  EmbedBuilder,
  ChatInputCommandInteraction,
  Interaction,
} from 'discord.js';
import { prisma, getLeaderboard, getEffectiveStreak, LeaderboardEntry } from './db.js';

export const commands = [
  new SlashCommandBuilder()
    .setName('stats')
    .setDescription('View Pomotogether study stats, streak, and XP')
    .addUserOption((option: SlashCommandUserOption) =>
      option.setName('user').setDescription('User to view stats for (defaults to you)').setRequired(false)
    ),
  new SlashCommandBuilder()
    .setName('leaderboard')
    .setDescription('View the Pomotogether top focus leaderboard')
    .addStringOption((option: SlashCommandStringOption) =>
      option
        .setName('timeframe')
        .setDescription('Timeframe: weekly, monthly, or yearly')
        .setRequired(false)
        .addChoices(
          { name: 'Weekly', value: 'weekly' },
          { name: 'Monthly', value: 'monthly' },
          { name: 'Current Year', value: 'yearly' }
        )
    ),
];

export async function handleStatsCommand(interaction: ChatInputCommandInteraction) {
  const targetDiscordUser = interaction.options.getUser('user') || interaction.user;

  try {
    const user = await prisma.user.findUnique({
      where: { discordId: targetDiscordUser.id },
      include: {
        studySessions: true,
      },
    });

    if (!user) {
      return await interaction.reply({
        content: `🍅 **${targetDiscordUser.username}** has not logged into Pomotogether yet! Join at the web app to start tracking your study sessions.`,
        ephemeral: true,
      });
    }

    const totalMinutes = user.studySessions.reduce((acc, s) => acc + s.minutes, 0);
    const totalHours = (totalMinutes / 60).toFixed(1);
    const sessionsCount = user.studySessions.length;

    const effectiveStreak = getEffectiveStreak(user.currentStreak, user.lastActiveDate);

    const embed = new EmbedBuilder()
      .setColor(0xe0604b)
      .setTitle(`🍅 Pomotogether Stats: ${user.globalName || user.username}`)
      .setThumbnail(user.avatar || targetDiscordUser.displayAvatarURL())
      .addFields(
        { name: '⭐ Level', value: `${user.level}`, inline: true },
        { name: '✨ Total XP', value: `${user.xp} XP`, inline: true },
        { name: '🔥 Current Streak', value: `${effectiveStreak} day(s)`, inline: true },
        { name: '🏆 Highest Streak', value: `${user.highestStreak} day(s)`, inline: true },
        { name: '⏱️ Total Study Time', value: `${totalMinutes} min (${totalHours}h)`, inline: true },
        { name: '🎯 Completed Sessions', value: `${sessionsCount}`, inline: true }
      )
      .setFooter({ text: 'Pomotogether 2.0 • Study & Focus Together' })
      .setTimestamp();

    await interaction.reply({ embeds: [embed] });
  } catch (error) {
    console.error('Error handling /stats command:', error);
    await interaction.reply({
      content: '❌ An error occurred while retrieving stats.',
      ephemeral: true,
    });
  }
}

export async function handleLeaderboardCommand(interaction: ChatInputCommandInteraction) {
  const timeframe = (interaction.options.getString('timeframe') || 'weekly') as 'weekly' | 'monthly' | 'yearly';
  const timeframeLabels: Record<string, string> = {
    weekly: 'Weekly (Current Week)',
    monthly: 'Monthly (Current Month)',
    yearly: 'Annual (Current Year)',
  };

  try {
    const leaderboard: LeaderboardEntry[] = await getLeaderboard(timeframe);
    const top10 = leaderboard.slice(0, 10);

    const embed = new EmbedBuilder()
      .setColor(0xffb703)
      .setTitle(`🏆 Pomotogether Leaderboard • ${timeframeLabels[timeframe]}`)
      .setDescription(
        top10.length === 0
          ? 'No focus sessions recorded yet for this period. Be the first!'
          : top10
              .map((u, i) => {
                const medal = i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `\`#${i + 1}\``;
                const hours = (u.totalMinutes / 60).toFixed(1);
                return `${medal} **${u.globalName || u.username}** — **${u.totalMinutes}m** (${hours}h) • Lvl ${u.level} • 🔥 ${u.currentStreak}d`;
              })
              .join('\n')
      )
      .setFooter({ text: 'Pomotogether 2.0 • Real-time Study Rankings' })
      .setTimestamp();

    await interaction.reply({ embeds: [embed] });
  } catch (error) {
    console.error('Error handling /leaderboard command:', error);
    await interaction.reply({
      content: '❌ An error occurred while retrieving leaderboard.',
      ephemeral: true,
    });
  }
}

export async function registerSlashCommands(token: string, clientId: string) {
  const rest = new REST({ version: '10' }).setToken(token);
  try {
    console.log('[Discord Bot] Refreshing application slash commands (/stats, /leaderboard)...');
    await rest.put(Routes.applicationCommands(clientId), {
      body: commands.map((cmd) => cmd.toJSON()),
    });
    console.log('[Discord Bot] Successfully registered slash commands globally.');
  } catch (err: any) {
    console.warn('[Discord Bot] Slash commands registration skipped or failed:', err.message);
  }
}

export function initDiscordBot(): Client | null {
  const token = process.env.DISCORD_BOT_TOKEN;
  const clientId = process.env.DISCORD_CLIENT_ID;

  if (!token || token.trim() === '' || token.includes('your_discord_bot_token')) {
    console.warn('[Discord Bot] No valid DISCORD_BOT_TOKEN found in environment. Bot is gracefully offline.');
    return null;
  }

  const client = new Client({
    intents: [GatewayIntentBits.Guilds],
  });

  client.once('ready', async () => {
    console.log(`[Discord Bot] Logged in successfully as ${client.user?.tag}!`);
    if (clientId) {
      await registerSlashCommands(token, clientId);
    }
  });

  client.on('interactionCreate', async (interaction: Interaction) => {
    if (!interaction.isChatInputCommand()) return;

    if (interaction.commandName === 'stats') {
      await handleStatsCommand(interaction);
    } else if (interaction.commandName === 'leaderboard') {
      await handleLeaderboardCommand(interaction);
    }
  });

  client.login(token).catch((err: any) => {
    console.warn(`[Discord Bot] Failed to login: ${err.message}. Server continues smoothly.`);
  });

  return client;
}
