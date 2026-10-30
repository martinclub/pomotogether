# Pomotogether 2.0 (Online Pomofocus Clone) 🍅

A full-fidelity clone of [pomofocus.io](https://pomofocus.io/) upgraded with **real-time multiplayer focus rooms**, synchronized group timers, live participant status, cheer reactions, and room chat.

---

## ✨ Features

### 1. ⏱ Authentic Pomofocus Core
- **Timer Modes**:
  - Pomodoro (25 min default)
  - Short Break (5 min default)
  - Long Break (15 min default)
- **Fluid Pomofocus Aesthetic**:
  - Dynamic background transitions according to mode (`#ba4949` red, `#38858a` teal, `#397097` blue).
  - Varela Round typography and authentic pill buttons.
  - Progress indicator bar at top.
  - Cycle tracker (`#1 Time to focus!`).
  - Browser tab title sync (e.g. `24:59 - Time to focus!`).
- **Web Audio API Sound Engine**:
  - 100% offline-ready synthesized audio (no broken 404s).
  - Alarm options: **Kitchen Bell**, **Digital Alarm**, **Zen Gong**, **Ascending Chime**.
  - Ticking sound options (Clock Slow, Fast, or None).
  - Tactile button press click audio.
  - Celebration confetti blast when pomodoro finishes!

### 2. 📋 Complete Task Management
- Add tasks with title, estimated pomodoros, notes, and tags.
- Select active task (shows live on timer card and syncs to room participants).
- Mark completed with strikethrough.
- Edit actual pomodoros and estimates inline.
- Three-dot task menu:
  - Clear finished tasks
  - Clear actual pomodoros
  - Clear all tasks
- Summary footer: Total estimated hours, actual hours, and estimated finish time.

### 3. 🌐 Online Multiplayer Rooms ("Pomotogether")
- **Room Creation & Joining**:
  - 6-character room codes (e.g. `FOCUS-42`, `LOBBY`).
  - 1-click **Invite Link** copying (`?room=ROOM_CODE`).
- **Two Room Modes**:
  1. **Synchronized Timer Mode**: The room host controls the timer (start, pause, skip, reset) and every member's timer ticks down in lockstep. Perfect for agile sprints, study groups, and remote team pairing.
  2. **Independent Mode**: Every participant keeps their own timer while sharing live vibes, active tasks, and cheer reactions.
- **Live Participant Grid**:
  - Live status indicators: 🟢 Focusing (pulsing), 🔵 Short Break, 🟣 Long Break, ⚪ Idle.
  - Active task visibility.
  - Completed pomodoros counter (`🍅 X`).
  - Crown icon for room host.
- **Cheer Reactions**:
  - Quick reactions (👏 High Five, 🔥 On Fire, ☕ Coffee, 🎉 Celebrate, 🍅 Pomodoro, 🚀 Rocket).
  - Floating emoji animation rising across the screen with sound effects!
- **Room Chat**:
  - Real-time instant messaging with system notifications for members joining/leaving and cycle completions.

### 4. 📊 Analytics & Reports
- Total focus hours, days accessed, current streak, and completed pomodoros.
- 7-day visual focus bar chart.
- Task completion history.
- **Export to CSV**.

### 5. ⚙️ Settings & Customization
- Custom durations for Pomodoro, Short Break, and Long Break.
- Auto-start breaks and auto-start pomodoros.
- Long break interval (after X pomodoros).
- Color themes: **Classic Pomofocus**, **Dark Cockpit (OLED)**, **Zen Forest**, **Sunset Chill**.
- HTML5 Desktop notifications toggle.

---

## 🚀 Quick Start

### 1. Development Mode
Run the backend socket server and Vite frontend concurrently or independently:

```bash
# Terminal 1: Real-time Socket.io server
npm run server

# Terminal 2: Vite dev server
npm run dev
```

Visit [http://localhost:5173](http://localhost:5173).

### 2. Production Build & Run
Compile TypeScript and bundle with Vite, then serve directly from Node.js:

```bash
# Build
npm run build

# Start Production Server (serves on port 3001)
npm start
```

Visit [http://localhost:3001](http://localhost:3001).

### 3. Automated Test Suite
Run the 5-point automated verification suite:

```bash
npm test
```
