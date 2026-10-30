import React, { useState, useEffect, useRef, useCallback } from 'react';
import confetti from 'canvas-confetti';
import { TimerMode, Task, UserSettings, UserStats, RoomState, RoomSyncMode, RoomReaction, ChatMessage } from './types';
import {
  getOrCreateUser,
  saveUser,
  loadSettings,
  saveSettings,
  loadTasks,
  saveTasks,
  loadStats,
  recordCompletedPomodoro,
  LocalUser,
} from './utils/storage';
import { playClickSound, playAlarm, playTickSound, playCheerSound } from './utils/audio';
import { socketService } from './services/socket';
import { Navbar } from './components/Navbar';
import { TimerCard } from './components/TimerCard';
import { TaskList } from './components/TaskList';
import { OnlineRoomModal } from './components/OnlineRoomModal';
import { SettingsModal } from './components/SettingsModal';
import { ReportModal } from './components/ReportModal';
import { UserProfileModal } from './components/UserProfileModal';
import { FloatingReactions } from './components/FloatingReactions';

export function App() {
  // State
  const [user, setUser] = useState<LocalUser>(getOrCreateUser);
  const [settings, setSettings] = useState<UserSettings>(loadSettings);
  const [stats, setStats] = useState<UserStats>(loadStats);
  const [tasks, setTasks] = useState<Task[]>(loadTasks);
  const [activeTaskId, setActiveTaskId] = useState<string | null>(() => (tasks.length > 0 ? tasks[0].id : null));

  const [mode, setMode] = useState<TimerMode>('pomodoro');
  const [timeLeft, setTimeLeft] = useState<number>(() => settings.pomodoroTime * 60);
  const [duration, setDuration] = useState<number>(() => settings.pomodoroTime * 60);
  const [isRunning, setIsRunning] = useState<boolean>(false);
  const [cycle, setCycle] = useState<number>(1);

  // Online Room State
  const [room, setRoom] = useState<RoomState | null>(null);
  const [floatingReactions, setFloatingReactions] = useState<RoomReaction[]>([]);

  // Modals
  const [isRoomsOpen, setIsRoomsOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isReportOpen, setIsReportOpen] = useState(false);
  const [isProfileOpen, setIsProfileOpen] = useState(false);

  const isHost = room ? room.hostId === user.id : true;
  const isSyncedFollower = room?.syncMode === 'synced' && !isHost;

  // Active task object
  const activeTask = tasks.find((t) => t.id === activeTaskId) || null;

  // Sync tasks & settings to localStorage
  useEffect(() => {
    saveTasks(tasks);
  }, [tasks]);

  useEffect(() => {
    saveSettings(settings);
  }, [settings]);

  useEffect(() => {
    saveUser(user);
  }, [user]);

  // Connect socket and handle URL room parameter on mount
  useEffect(() => {
    socketService.connect();

    const unsubState = socketService.onRoomState((updatedRoom) => {
      setRoom(updatedRoom);
      // If synced room and not host, update local timer
      if (updatedRoom.syncMode === 'synced') {
        const t = updatedRoom.timer;
        setMode(t.mode);
        setTimeLeft(t.timeLeft);
        setDuration(t.duration);
        setIsRunning(t.isRunning);
        setCycle(t.cycle);
      }
    });

    const unsubMsg = socketService.onRoomMessage((msg: ChatMessage) => {
      setRoom((prev) => {
        if (!prev) return null;
        return {
          ...prev,
          messages: [...prev.messages, msg],
        };
      });
    });

    const unsubReaction = socketService.onRoomReaction((reaction: RoomReaction) => {
      playCheerSound();
      setFloatingReactions((prev) => [...prev, reaction]);
      setTimeout(() => {
        setFloatingReactions((prev) => prev.filter((r) => r.id !== reaction.id));
      }, 1400);
    });

    const unsubTimerTick = socketService.onTimerTick(({ timeLeft: serverTimeLeft }) => {
      if (isSyncedFollower) {
        setTimeLeft(serverTimeLeft);
      }
    });

    const unsubTimerCompleted = socketService.onTimerCompleted(({ room: completedRoom }) => {
      setRoom(completedRoom);
      if (isSyncedFollower) {
        handleTimerCompletion(true);
      }
    });

    // Check URL parameters for ?room=CODE
    const params = new URLSearchParams(window.location.search);
    const roomParam = params.get('room');
    if (roomParam) {
      handleJoinRoom(roomParam);
      setIsRoomsOpen(true);
    }

    return () => {
      unsubState();
      unsubMsg();
      unsubReaction();
      unsubTimerTick();
      unsubTimerCompleted();
    };
  }, [isSyncedFollower, user]);

  // Update online participant status when user, activeTask, or pomodoros change
  useEffect(() => {
    if (room) {
      const status = isRunning
        ? mode === 'pomodoro'
          ? 'focusing'
          : mode === 'shortBreak'
          ? 'shortBreak'
          : 'longBreak'
        : 'idle';

      socketService.updateStatus(room.code, status, activeTask?.title, stats.pomodorosCompleted);
    }
  }, [room?.code, isRunning, mode, activeTask?.title, stats.pomodorosCompleted]);

  // Document title and browser tab synchronization
  useEffect(() => {
    const mins = Math.floor(timeLeft / 60);
    const secs = timeLeft % 60;
    const timeStr = `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    const statusStr = mode === 'pomodoro' ? 'Time to focus!' : 'Time for a break!';
    document.title = `${timeStr} - ${statusStr} | Pomotogether`;
  }, [timeLeft, mode]);

  // Trigger celebration confetti and alarms
  const handleTimerCompletion = useCallback(
    (skipRoomEmit = false) => {
      try {
        confetti({
          particleCount: 100,
          spread: 70,
          origin: { y: 0.6 },
        });
      } catch (e) {
        // ignore
      }

      playAlarm(settings.alarmSound, settings.alarmVolume);

      // Desktop notification
      if ('Notification' in window && Notification.permission === 'granted') {
        const title = mode === 'pomodoro' ? 'Pomodoro Completed!' : 'Break Finished!';
        const body = mode === 'pomodoro' ? 'Great work! Take a well-deserved break.' : 'Break is over! Time to get back to flow.';
        new Notification(title, {
          body,
          icon: 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><circle cx="50" cy="55" r="42" fill="%23ba4949"/></svg>',
        });
      }

      if (mode === 'pomodoro') {
        const minutesAdded = Math.max(1, Math.round(duration / 60));
        const updatedStats = recordCompletedPomodoro(minutesAdded);
        setStats(updatedStats);

        // Update active task count
        if (activeTaskId) {
          setTasks((prev) =>
            prev.map((t) => (t.id === activeTaskId ? { ...t, act: t.act + 1 } : t))
          );
        }

        // Determine next break mode
        const isLong = cycle % settings.longBreakInterval === 0;
        const nextM: TimerMode = isLong ? 'longBreak' : 'shortBreak';
        const nextDur = isLong ? settings.longBreakTime * 60 : settings.shortBreakTime * 60;

        setMode(nextM);
        setTimeLeft(nextDur);
        setDuration(nextDur);
        setIsRunning(settings.autoStartBreaks);

        if (room && room.syncMode === 'synced' && isHost && !skipRoomEmit) {
          socketService.sendTimerAction(room.code, 'set_mode', {
            mode: nextM,
            timeLeft: nextDur,
            duration: nextDur,
          });
          if (settings.autoStartBreaks) {
            socketService.sendTimerAction(room.code, 'start');
          }
        }
      } else {
        // Break ended, start pomodoro
        const nextCycle = cycle + 1;
        const nextDur = settings.pomodoroTime * 60;

        setCycle(nextCycle);
        setMode('pomodoro');
        setTimeLeft(nextDur);
        setDuration(nextDur);
        setIsRunning(settings.autoStartPomodoros);

        if (room && room.syncMode === 'synced' && isHost && !skipRoomEmit) {
          socketService.sendTimerAction(room.code, 'set_mode', {
            mode: 'pomodoro',
            timeLeft: nextDur,
            duration: nextDur,
          });
          if (settings.autoStartPomodoros) {
            socketService.sendTimerAction(room.code, 'start');
          }
        }
      }
    },
    [mode, duration, settings, activeTaskId, cycle, room, isHost]
  );

  // Timer interval countdown
  useEffect(() => {
    if (!isRunning) return;

    // If synced follower, the host/server runs the master timer, but we still tick locally for fluid UI
    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          handleTimerCompletion();
          return 0;
        }
        playTickSound(settings.tickingSound);
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [isRunning, handleTimerCompletion, settings.tickingSound]);

  // Mode change handler
  const handleSetMode = (newMode: TimerMode) => {
    playClickSound(settings.clickSound);
    let newDuration = settings.pomodoroTime * 60;
    if (newMode === 'shortBreak') newDuration = settings.shortBreakTime * 60;
    if (newMode === 'longBreak') newDuration = settings.longBreakTime * 60;

    setMode(newMode);
    setTimeLeft(newDuration);
    setDuration(newDuration);
    setIsRunning(false);

    if (room && room.syncMode === 'synced' && isHost) {
      socketService.sendTimerAction(room.code, 'set_mode', {
        mode: newMode,
        timeLeft: newDuration,
        duration: newDuration,
      });
    }
  };

  // Toggle Start / Pause
  const handleToggleTimer = () => {
    playClickSound(settings.clickSound);
    const nextRunning = !isRunning;
    setIsRunning(nextRunning);

    if (room && room.syncMode === 'synced' && isHost) {
      socketService.sendTimerAction(room.code, nextRunning ? 'start' : 'pause', {
        timeLeft,
      });
    }
  };

  // Reset Timer
  const handleResetTimer = () => {
    playClickSound(settings.clickSound);
    setIsRunning(false);
    let dur = settings.pomodoroTime * 60;
    if (mode === 'shortBreak') dur = settings.shortBreakTime * 60;
    if (mode === 'longBreak') dur = settings.longBreakTime * 60;

    setTimeLeft(dur);
    setDuration(dur);

    if (room && room.syncMode === 'synced' && isHost) {
      socketService.sendTimerAction(room.code, 'reset', {
        mode,
        timeLeft: dur,
        duration: dur,
      });
    }
  };

  // Skip Timer to Next Mode
  const handleSkipTimer = () => {
    playClickSound(settings.clickSound);
    setIsRunning(false);
    if (mode === 'pomodoro') {
      const isLong = cycle % settings.longBreakInterval === 0;
      const nextM: TimerMode = isLong ? 'longBreak' : 'shortBreak';
      const nextDur = isLong ? settings.longBreakTime * 60 : settings.shortBreakTime * 60;
      setMode(nextM);
      setTimeLeft(nextDur);
      setDuration(nextDur);

      if (room && room.syncMode === 'synced' && isHost) {
        socketService.sendTimerAction(room.code, 'skip', {
          mode: nextM,
          timeLeft: nextDur,
          duration: nextDur,
        });
      }
    } else {
      const nextDur = settings.pomodoroTime * 60;
      setCycle((c) => c + 1);
      setMode('pomodoro');
      setTimeLeft(nextDur);
      setDuration(nextDur);

      if (room && room.syncMode === 'synced' && isHost) {
        socketService.sendTimerAction(room.code, 'skip', {
          mode: 'pomodoro',
          timeLeft: nextDur,
          duration: nextDur,
        });
      }
    }
  };

  // Room Handlers
  const handleJoinRoom = (code: string) => {
    socketService.joinRoom(code, user);
  };

  const handleCreateRoom = (name: string, syncMode: RoomSyncMode) => {
    const randomCode = `ROOM-${Math.floor(10 + Math.random() * 90)}`;
    socketService.joinRoom(randomCode, user, name, syncMode);
  };

  const handleLeaveRoom = () => {
    if (room) {
      socketService.leaveRoom(room.code);
      setRoom(null);
    }
  };

  const handleToggleRoomSyncMode = (syncMode: RoomSyncMode) => {
    if (room) {
      socketService.toggleSyncMode(room.code, syncMode);
    }
  };

  const handleSendRoomMessage = (text: string) => {
    if (room) {
      socketService.sendChatMessage(room.code, text);
    }
  };

  const handleSendRoomReaction = (emoji: string) => {
    if (room) {
      socketService.sendReaction(room.code, emoji);
    }
  };

  // Task Handlers
  const handleSelectTask = (id: string) => {
    setActiveTaskId(id);
  };

  const handleToggleComplete = (id: string) => {
    setTasks((prev) =>
      prev.map((t) => (t.id === id ? { ...t, completed: !t.completed } : t))
    );
  };

  const handleAddTask = (taskData: Omit<Task, 'id' | 'createdAt'>) => {
    const newTask: Task = {
      ...taskData,
      id: `task-${Date.now()}`,
      createdAt: Date.now(),
    };
    setTasks((prev) => [...prev, newTask]);
    if (!activeTaskId) {
      setActiveTaskId(newTask.id);
    }
  };

  const handleUpdateTask = (id: string, updates: Partial<Task>) => {
    setTasks((prev) => prev.map((t) => (t.id === id ? { ...t, ...updates } : t)));
  };

  const handleDeleteTask = (id: string) => {
    setTasks((prev) => prev.filter((t) => t.id !== id));
    if (activeTaskId === id) {
      setActiveTaskId(null);
    }
  };

  const handleClearCompleted = () => {
    setTasks((prev) => prev.filter((t) => !t.completed));
  };

  const handleClearActPomodoros = () => {
    setTasks((prev) => prev.map((t) => ({ ...t, act: 0 })));
  };

  const handleClearAllTasks = () => {
    setTasks([]);
    setActiveTaskId(null);
  };

  // Dynamic Theme Colors matching Pomofocus
  const getThemeBackground = () => {
    const theme = settings.colorTheme;
    if (theme === 'cockpit') {
      if (mode === 'pomodoro') return 'bg-[#0f172a]';
      if (mode === 'shortBreak') return 'bg-[#134e4a]';
      return 'bg-[#1e1b4b]';
    }
    if (theme === 'forest') {
      if (mode === 'pomodoro') return 'bg-[#1b4332]';
      if (mode === 'shortBreak') return 'bg-[#2d6a4f]';
      return 'bg-[#40916c]';
    }
    if (theme === 'sunset') {
      if (mode === 'pomodoro') return 'bg-[#701a75]';
      if (mode === 'shortBreak') return 'bg-[#4c1d95]';
      return 'bg-[#312e81]';
    }
    // Classic Pomofocus
    if (mode === 'pomodoro') return 'bg-[#ba4949]';
    if (mode === 'shortBreak') return 'bg-[#38858a]';
    return 'bg-[#397097]';
  };

  return (
    <div
      className={`min-h-screen ${getThemeBackground()} transition-colors duration-500 flex flex-col font-sans px-4 select-text`}
    >
      {/* Floating animated reactions */}
      <FloatingReactions reactions={floatingReactions} />

      {/* Top Navigation */}
      <Navbar
        user={user}
        room={room}
        onOpenReport={() => setIsReportOpen(true)}
        onOpenSettings={() => setIsSettingsOpen(true)}
        onOpenRooms={() => setIsRoomsOpen(true)}
        onOpenProfile={() => setIsProfileOpen(true)}
      />

      {/* Main Focus Area */}
      <main className="flex-1 flex flex-col items-center justify-start w-full max-w-2xl mx-auto">
        {/* Timer Card */}
        <TimerCard
          mode={mode}
          timeLeft={timeLeft}
          duration={duration}
          isRunning={isRunning}
          cycle={cycle}
          activeTask={activeTask}
          room={room}
          isHost={isHost}
          themeColorKey={settings.colorTheme}
          onSetMode={handleSetMode}
          onToggleTimer={handleToggleTimer}
          onSkipTimer={handleSkipTimer}
          onResetTimer={handleResetTimer}
          onToggleActiveTaskComplete={() => activeTaskId && handleToggleComplete(activeTaskId)}
        />

        {/* Task List */}
        <TaskList
          tasks={tasks}
          activeTaskId={activeTaskId}
          pomodoroMinutes={settings.pomodoroTime}
          onSelectTask={handleSelectTask}
          onToggleComplete={handleToggleComplete}
          onAddTask={handleAddTask}
          onUpdateTask={handleUpdateTask}
          onDeleteTask={handleDeleteTask}
          onClearCompleted={handleClearCompleted}
          onClearActPomodoros={handleClearActPomodoros}
          onClearAllTasks={handleClearAllTasks}
        />
      </main>

      {/* Modals */}
      <OnlineRoomModal
        isOpen={isRoomsOpen}
        onClose={() => setIsRoomsOpen(false)}
        user={user}
        room={room}
        onJoinRoom={handleJoinRoom}
        onCreateRoom={handleCreateRoom}
        onLeaveRoom={handleLeaveRoom}
        onToggleSyncMode={handleToggleRoomSyncMode}
        onSendMessage={handleSendRoomMessage}
        onSendReaction={handleSendRoomReaction}
      />

      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        settings={settings}
        onSaveSettings={(newSettings) => {
          setSettings(newSettings);
          // If not running, adjust timeLeft to updated settings
          if (!isRunning) {
            let dur = newSettings.pomodoroTime * 60;
            if (mode === 'shortBreak') dur = newSettings.shortBreakTime * 60;
            if (mode === 'longBreak') dur = newSettings.longBreakTime * 60;
            setTimeLeft(dur);
            setDuration(dur);
          }
        }}
      />

      <ReportModal
        isOpen={isReportOpen}
        onClose={() => setIsReportOpen(false)}
        stats={stats}
        tasks={tasks}
      />

      <UserProfileModal
        isOpen={isProfileOpen}
        onClose={() => setIsProfileOpen(false)}
        user={user}
        onSaveUser={setUser}
      />
    </div>
  );
}
export default App;
