process.env.NODE_ENV = 'test';
import assert from 'node:assert';
import http from 'http';
import {
  prisma,
  upsertDiscordUser,
  recordUserStudySession,
  getLeaderboard,
  getUserHeatmap,
  calculateLevel,
  isSameDay,
  isYesterday,
  getEffectiveStreak,
} from '../server/db';
import { commands, handleStatsCommand, handleLeaderboardCommand } from '../server/bot';
import { app, server } from '../server/index';

console.log('--- Starting Pomotogether Discord, Prisma & Leaderboard Integration Tests ---');

async function runTests() {
  const TEST_PORT = 4015;
  let testServer: http.Server;

  await new Promise<void>((resolve) => {
    testServer = server.listen(TEST_PORT, () => {
      console.log(`Test API Server listening on port ${TEST_PORT}`);
      resolve();
    });
  });

  try {
    // Clean up test data
    await prisma.studySession.deleteMany({});
    await prisma.user.deleteMany({});

    // Test 1: Prisma User Upsert & Initial State
    console.log('\nTesting 1: Prisma User Upsert & Initial State...');
    const user1 = await upsertDiscordUser({
      discordId: 'discord-test-111',
      username: 'alice_focus',
      avatar: 'https://cdn.discordapp.com/avatars/111/abc.png',
      globalName: 'Alice Pro',
    });

    assert.strictEqual(user1.discordId, 'discord-test-111');
    assert.strictEqual(user1.username, 'alice_focus');
    assert.strictEqual(user1.globalName, 'Alice Pro');
    assert.strictEqual(user1.level, 1);
    assert.strictEqual(user1.xp, 0);
    assert.strictEqual(user1.currentStreak, 0);
    assert.strictEqual(user1.highestStreak, 0);
    console.log('✓ Test 1 Passed: User creation with initial streak 0');

    // Test 2: Study Session Recording, XP progression & Level Calculation
    console.log('\nTesting 2: Study Session Recording, XP progression & Level Calculation...');
    const sessionRes = await recordUserStudySession({
      userId: user1.id,
      minutes: 25,
      mode: 'pomodoro',
      taskTitle: 'Math Problem Set',
    });

    assert.strictEqual(sessionRes.session.userId, user1.id);
    assert.strictEqual(sessionRes.session.minutes, 25);
    assert.strictEqual(sessionRes.session.taskTitle, 'Math Problem Set');
    assert.strictEqual(sessionRes.earnedXp, 250);
    assert.strictEqual(sessionRes.user.xp, 250);
    assert.strictEqual(sessionRes.user.level, 2); // 250 XP = Level 2
    assert.strictEqual(sessionRes.user.currentStreak, 1); // 1st day studied
    assert.strictEqual(sessionRes.user.highestStreak, 1);
    console.log('✓ Test 2 Passed: Study session recorded, XP added, level leveled up to 2, streak is 1');

    // Test 3: Streak logic helper functions
    console.log('\nTesting 3: Streak calculation logic...');
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setUTCDate(today.getUTCDate() - 1);
    const twoDaysAgo = new Date(today);
    twoDaysAgo.setUTCDate(today.getUTCDate() - 2);

    assert.strictEqual(isSameDay(today, new Date(today.getTime())), true);
    assert.strictEqual(isYesterday(yesterday, today), true);
    assert.strictEqual(isYesterday(twoDaysAgo, today), false);
    assert.strictEqual(getEffectiveStreak(5, today), 5);
    assert.strictEqual(getEffectiveStreak(5, yesterday), 5);
    assert.strictEqual(getEffectiveStreak(5, twoDaysAgo), 0);
    assert.strictEqual(getEffectiveStreak(5, null), 0);
    console.log('✓ Test 3 Passed: Streak date matching logic and lapsed streak reset verified');

    // Test 4: Leaderboard Aggregation across Weekly, Monthly, Yearly
    console.log('\nTesting 4: Leaderboard Aggregation across timeframes...');
    // Create second user with more study time
    const user2 = await upsertDiscordUser({
      discordId: 'discord-test-222',
      username: 'bob_grind',
      avatar: null,
      globalName: 'Bob Grind',
    });

    await recordUserStudySession({
      userId: user2.id,
      minutes: 50,
      mode: 'pomodoro',
      taskTitle: 'Algorithm Design',
    });

    // Create an inactive 3rd user with 0 study sessions
    await upsertDiscordUser({
      discordId: 'discord-test-333',
      username: 'idle_dan',
      avatar: null,
      globalName: 'Dan Idle',
    });

    const weeklyLeaderboard = await getLeaderboard('weekly');
    // Inactive user should not clutter the leaderboard (only 2 active focusers)
    assert.strictEqual(weeklyLeaderboard.length, 2);
    assert.strictEqual(weeklyLeaderboard[0].id, user2.id); // Bob has 50 min, rank #1
    assert.strictEqual(weeklyLeaderboard[0].rank, 1);
    assert.strictEqual(weeklyLeaderboard[0].totalMinutes, 50);
    assert.strictEqual(weeklyLeaderboard[1].id, user1.id); // Alice has 25 min, rank #2
    assert.strictEqual(weeklyLeaderboard[1].rank, 2);
    assert.strictEqual(weeklyLeaderboard[1].totalMinutes, 25);

    const monthlyLeaderboard = await getLeaderboard('monthly');
    assert.strictEqual(monthlyLeaderboard.length, 2);
    assert.strictEqual(monthlyLeaderboard[0].rank, 1);

    const yearlyLeaderboard = await getLeaderboard('yearly');
    assert.strictEqual(yearlyLeaderboard.length, 2);
    assert.strictEqual(yearlyLeaderboard[0].rank, 1);
    console.log('✓ Test 4 Passed: Multi-timeframe Leaderboard ranks calculated correctly and filtered zero-minute users');

    // Test 5: Heatmap aggregation
    console.log('\nTesting 5: Heatmap aggregation...');
    const heatmap = await getUserHeatmap(user1.id);
    const todayKey = new Date().toISOString().slice(0, 10);
    assert.ok(heatmap[todayKey]);
    assert.strictEqual(heatmap[todayKey].minutes, 25);
    assert.strictEqual(heatmap[todayKey].count, 1);
    console.log('✓ Test 5 Passed: User heatmap correctly maps study sessions to calendar dates');

    // Test 6: API Endpoints (Auth, Me, StudySession, Leaderboard)
    console.log('\nTesting 6: API Endpoints over HTTP...');
    // 6a: Mock Login endpoint
    const loginRes = await fetch(`http://localhost:${TEST_PORT}/api/auth/mock-login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        discordId: 'api-user-999',
        username: 'charlie_api',
        globalName: 'Charlie API',
      }),
    });
    assert.strictEqual(loginRes.status, 200);
    const loginData = await loginRes.json();
    assert.ok(loginData.token);
    assert.strictEqual(loginData.user.username, 'charlie_api');
    const token = loginData.token;

    // 6b: GET /api/auth/me without token -> 401
    const unauthRes = await fetch(`http://localhost:${TEST_PORT}/api/auth/me`);
    assert.strictEqual(unauthRes.status, 401);

    // 6c: GET /api/auth/me with valid Bearer token -> 200
    const meRes = await fetch(`http://localhost:${TEST_PORT}/api/auth/me`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    assert.strictEqual(meRes.status, 200);
    const meData = await meRes.json();
    assert.strictEqual(meData.user.username, 'charlie_api');
    assert.ok(meData.heatmap);

    // 6d: POST /api/study-session
    const sessionApiRes = await fetch(`http://localhost:${TEST_PORT}/api/study-session`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        minutes: 30,
        mode: 'pomodoro',
        taskTitle: 'API Integration Testing',
      }),
    });
    assert.strictEqual(sessionApiRes.status, 200);
    const sessionApiData = await sessionApiRes.json();
    assert.strictEqual(sessionApiData.session.minutes, 30);
    assert.strictEqual(sessionApiData.user.xp, 300);

    // 6e: GET /api/leaderboard
    const lbApiRes = await fetch(`http://localhost:${TEST_PORT}/api/leaderboard?timeframe=weekly`);
    assert.strictEqual(lbApiRes.status, 200);
    const lbApiData = await lbApiRes.json();
    assert.strictEqual(lbApiData.timeframe, 'weekly');
    assert.ok(Array.isArray(lbApiData.leaderboard));
    assert.strictEqual(lbApiData.leaderboard.length, 3);
    console.log('✓ Test 6 Passed: Full HTTP REST Authentication & Study Session flow verified');

    // Test 7: Discord Bot Slash Command Definitions & Mock Handlers
    console.log('\nTesting 7: Discord Bot Slash Command Specifications...');
    assert.strictEqual(commands.length, 2);
    assert.strictEqual(commands[0].name, 'stats');
    assert.strictEqual(commands[1].name, 'leaderboard');

    // Test /stats handler with mock interaction
    let replyCalled = false;
    let repliedEmbeds: any[] = [];
    const mockInteraction: any = {
      user: { id: 'discord-test-111', username: 'alice_focus', displayAvatarURL: () => '' },
      options: {
        getUser: () => null,
      },
      reply: async (opts: any) => {
        replyCalled = true;
        repliedEmbeds = opts.embeds || [];
      },
    };

    await handleStatsCommand(mockInteraction);
    assert.strictEqual(replyCalled, true);
    assert.strictEqual(repliedEmbeds.length, 1);
    console.log('✓ Test 7 Passed: Discord Bot /stats handler outputs rich Embed with stats');

    // Test /leaderboard handler with mock interaction
    let lbReplyCalled = false;
    let lbRepliedEmbeds: any[] = [];
    const mockLbInteraction: any = {
      options: {
        getString: (name: string) => 'weekly',
      },
      reply: async (opts: any) => {
        lbReplyCalled = true;
        lbRepliedEmbeds = opts.embeds || [];
      },
    };

    await handleLeaderboardCommand(mockLbInteraction);
    assert.strictEqual(lbReplyCalled, true);
    assert.strictEqual(lbRepliedEmbeds.length, 1);
    console.log('✓ Test 8 Passed: Discord Bot /leaderboard handler outputs top ranked Embed');

    console.log('\n================================================================');
    console.log('ALL DISCORD, PRISMA, LEADERBOARD & BOT TESTS PASSED 100%! 🍅🚀🏆');
    console.log('================================================================\n');
  } finally {
    // Clean close server
    await new Promise<void>((resolve) => {
      testServer.close(() => {
        resolve();
      });
    });
    await prisma.$disconnect();
  }
}

runTests().catch((err) => {
  console.error('Fatal test error:', err);
  process.exit(1);
});
