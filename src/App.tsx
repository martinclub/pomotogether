import React, { useState, useEffect, useRef, useCallback } from 'react';
import confetti from 'canvas-confetti';
import { Users, Clock, MessageSquare } from 'lucide-react';
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
import { RoomMembersPanel } from './components/RoomMembersPanel';
import { RoomChatPanel } from './components/RoomChatPanel';

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
  const [mobileRoomTab, setMobileRoomTab] = useState<'timer' | 'members' | 'chat'>('timer');

  // Modals
  const [isRoomsOpen, setIsRoomsOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isReportOpen, setIsReportOpen] = useState(false);
  const [isProfileOpen, setIsProfileOpen] = useState(false);

  const isHost = room ? room.hostId === user.id : true;
  const isSyncedFollower = room?.syncMode === 'synced' && !isHost;

  const isSyncedFollowerRef = useRef(isSyncedFollower);
  isSyncedFollowerRef.current = isSyncedFollower;

  const userRef = useRef(user);
  userRef.current = user;

  const handleTimerCompletionRef = useRef<(skipRoomEmit?: boolean) => void>(() => {});

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
      if (updatedRoom.syncMode === 'synced' && updatedRoom.hostId !== userRef.current.id) {
        const t = updatedRoom.timer;
        setMode(t.mode);
        setTimeLeft(t.timeLeft);
        setDuration(t.duration);
        setIsRunning(t.isRunning);
        setCycle(t.cycle);
      }
    });

    const unsubParticipants = socketService.onParticipantsUpdated(({ participants }) => {
      setRoom((prev) => {
        if (!prev) return null;
        return {
          ...prev,
          participants,
        };
      });
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
      if (isSyncedFollowerRef.current) {
        setTimeLeft(serverTimeLeft);
      }
    });

    const unsubTimerCompleted = socketService.onTimerCompleted(({ room: completedRoom }) => {
      setRoom(completedRoom);
      if (isSyncedFollowerRef.current) {
        handleTimerCompletionRef.current(true);
      }
    });

    // Check URL parameters for ?room=CODE
    const params = new URLSearchParams(window.location.search);
    const roomParam = params.get('room');
    if (roomParam) {
      const cleanCode = roomParam.toUpperCase().trim();
      socketService.joinRoom(cleanCode, userRef.current);
      window.history.replaceState(null, '', `?room=${cleanCode}`);
      setMobileRoomTab('timer');
    }

    return () => {
      unsubState();
      unsubParticipants();
      unsubMsg();
      unsubReaction();
      unsubTimerTick();
      unsubTimerCompleted();
    };
  }, []);

  // Update online participant status when user, activeTask, tasks, or pomodoros change
  useEffect(() => {
    if (room) {
      const status = isRunning
        ? mode === 'pomodoro'
          ? 'focusing'
          : mode === 'shortBreak'
          ? 'shortBreak'
          : 'longBreak'
        : 'idle';

      const totalRemainingStudyPomodoros = tasks.reduce(
        (acc, t) => acc + (t.completed ? 0 : Math.max(0, t.est - t.act)),
        0
      );

      socketService.updateStatus(
        room.code,
        status,
        activeTask?.title,
        stats.pomodorosCompleted,
        activeTask?.act,
        activeTask?.est,
        totalRemainingStudyPomodoros
      );
    }
  }, [
    room?.code,
    isRunning,
    mode,
    activeTask?.title,
    activeTask?.act,
    activeTask?.est,
    tasks,
    stats.pomodorosCompleted,
  ]);

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
            cycle,
          });
          if (settings.autoStartBreaks) {
            socketService.sendTimerAction(room.code, 'start', {
              timeLeft: nextDur,
              duration: nextDur,
              cycle,
            });
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
            cycle: nextCycle,
          });
          if (settings.autoStartPomodoros) {
            socketService.sendTimerAction(room.code, 'start', {
              timeLeft: nextDur,
              duration: nextDur,
              cycle: nextCycle,
            });
          }
        }
      }
    },
    [mode, duration, settings, activeTaskId, cycle, room, isHost]
  );

  handleTimerCompletionRef.current = handleTimerCompletion;

  // Timer interval countdown
  useEffect(() => {
    if (!isRunning) return;

    // Local countdown interval for fluid display
    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          if (isSyncedFollower) {
            // Synced follower clamps to 0 and waits for host's official completion event
            return 0;
          }
          clearInterval(timer);
          handleTimerCompletion();
          return 0;
        }
        playTickSound(settings.tickingSound);
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [isRunning, isSyncedFollower, handleTimerCompletion, settings.tickingSound]);

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
        cycle,
      });
    }
  };

  // Toggle Start / Pause
  const handleToggleTimer = useCallback(() => {
    playClickSound(settings.clickSound);
    const nextRunning = !isRunning;
    setIsRunning(nextRunning);

    if (room && room.syncMode === 'synced' && isHost) {
      socketService.sendTimerAction(room.code, nextRunning ? 'start' : 'pause', {
        timeLeft,
        duration,
        cycle,
      });
    }
  }, [isRunning, room, isHost, settings.clickSound, timeLeft, duration, cycle]);

  // Global Spacebar shortcut to Start/Pause (matches Pomofocus.io)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      if (
        target &&
        (target.tagName === 'INPUT' ||
          target.tagName === 'TEXTAREA' ||
          target.isContentEditable)
      ) {
        return;
      }

      if (e.code === 'Space') {
        e.preventDefault();
        if (isSyncedFollower) return;
        handleToggleTimer();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isSyncedFollower, handleToggleTimer]);

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
        cycle,
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
          cycle,
        });
      }
    } else {
      const nextDur = settings.pomodoroTime * 60;
      const nextCycle = cycle + 1;
      setCycle(nextCycle);
      setMode('pomodoro');
      setTimeLeft(nextDur);
      setDuration(nextDur);

      if (room && room.syncMode === 'synced' && isHost) {
        socketService.sendTimerAction(room.code, 'skip', {
          mode: 'pomodoro',
          timeLeft: nextDur,
          duration: nextDur,
          cycle: nextCycle,
        });
      }
    }
  };

  // Room Handlers
  const handleJoinRoom = (code: string) => {
    const cleanCode = code.toUpperCase().trim();
    socketService.joinRoom(cleanCode, user);
    window.history.replaceState(null, '', `?room=${cleanCode}`);
    setIsRoomsOpen(false);
    setMobileRoomTab('timer');
  };

  const handleCreateRoom = (name: string, syncMode: RoomSyncMode) => {
    const randomCode = `ROOM-${Math.floor(10 + Math.random() * 90)}`;
    const timerSettings = {
      pomodoroTime: settings.pomodoroTime,
      shortBreakTime: settings.shortBreakTime,
      longBreakTime: settings.longBreakTime,
      longBreakInterval: settings.longBreakInterval,
    };
    socketService.joinRoom(randomCode, user, name, syncMode, timerSettings);
    window.history.replaceState(null, '', `?room=${randomCode}`);
    setIsRoomsOpen(false);
    setMobileRoomTab('timer');
  };

  const handleLeaveRoom = () => {
    if (room) {
      socketService.leaveRoom(room.code);
      setRoom(null);
      window.history.replaceState(null, '', window.location.pathname);
    }
  };

  const handleToggleRoomSyncMode = (syncMode: RoomSyncMode) => {
    if (room) {
      socketService.toggleSyncMode(room.code, syncMode);
    }
  };

  const handleSendRoomMessage = (text: string) => {
    if (room && !isChatLocked) {
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
    setTasks((prev) => {
      const updated = prev.map((t) => (t.id === id ? { ...t, completed: !t.completed } : t));
      const target = updated.find((t) => t.id === id);
      if (target?.completed && activeTaskId === id) {
        const nextPending = updated.find((t) => !t.completed && t.id !== id);
        if (nextPending) {
          setActiveTaskId(nextPending.id);
        }
      }
      return updated;
    });
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

  const isPureFocus = isRunning && mode === 'pomodoro';
  const isChatLocked = isRunning && mode === 'pomodoro';

  // Synchronize document.body background for full-bleed dark immersion
  useEffect(() => {
    if (isPureFocus) {
      document.body.style.backgroundColor = '#09090b';
    } else {
      const bgMap: Record<string, Record<TimerMode, string>> = {
        classic: { pomodoro: '#ba4949', shortBreak: '#38858a', longBreak: '#397097' },
        cockpit: { pomodoro: '#0f172a', shortBreak: '#134e4a', longBreak: '#1e1b4b' },
        forest: { pomodoro: '#1b4332', shortBreak: '#2d6a4f', longBreak: '#40916c' },
        sunset: { pomodoro: '#701a75', shortBreak: '#4c1d95', longBreak: '#312e81' },
      };
      const themeColors = bgMap[settings.colorTheme] || bgMap.classic;
      document.body.style.backgroundColor = themeColors[mode] || '#ba4949';
    }
  }, [isPureFocus, settings.colorTheme, mode]);

  // Dynamic Theme Colors matching Pomofocus (pure focus black mode when running pomodoro)
  const getThemeBackground = () => {
    if (isPureFocus) {
      return 'bg-[#09090b] text-white';
    }
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
      className={`min-h-screen ${getThemeBackground()} transition-colors duration-700 flex flex-col font-sans px-3 sm:px-4 select-text`}
    >
      {/* Floating animated reactions */}
      <FloatingReactions reactions={floatingReactions} />

      {/* Top Navigation */}
      <Navbar
        user={user}
        room={room}
        isPureFocus={isPureFocus}
        onOpenReport={() => setIsReportOpen(true)}
        onOpenSettings={() => setIsSettingsOpen(true)}
        onOpenRooms={() => setIsRoomsOpen(true)}
        onOpenProfile={() => setIsProfileOpen(true)}
      />

      {/* Mobile/Tablet Room View Switcher (< lg) */}
      {room && (
        <div className="w-full max-w-md mx-auto my-3 flex lg:hidden p-1 rounded-2xl bg-black/25 backdrop-blur-md border border-white/10 text-xs font-bold shadow-md">
          <button
            onClick={() => setMobileRoomTab('timer')}
            className={`flex-1 py-2 px-3 rounded-xl flex items-center justify-center space-x-1.5 transition-all ${
              mobileRoomTab === 'timer'
                ? 'bg-white text-slate-900 shadow-md'
                : 'text-white/80 hover:text-white'
            }`}
          >
            <Clock className="w-3.5 h-3.5" />
            <span>Timer</span>
          </button>
          <button
            onClick={() => setMobileRoomTab('members')}
            className={`flex-1 py-2 px-3 rounded-xl flex items-center justify-center space-x-1.5 transition-all ${
              mobileRoomTab === 'members'
                ? 'bg-white text-slate-900 shadow-md'
                : 'text-white/80 hover:text-white'
            }`}
          >
            <Users className="w-3.5 h-3.5" />
            <span>Room ({room.participants.length})</span>
          </button>
          <button
            onClick={() => setMobileRoomTab('chat')}
            className={`flex-1 py-2 px-3 rounded-xl flex items-center justify-center space-x-1.5 transition-all ${
              mobileRoomTab === 'chat'
                ? 'bg-white text-slate-900 shadow-md'
                : 'text-white/80 hover:text-white'
            }`}
          >
            <MessageSquare className="w-3.5 h-3.5" />
            <span>Chat ({room.messages.length})</span>
          </button>
        </div>
      )}

      {/* Main Focus Area */}
      <main
        className={`flex-1 w-full mx-auto pb-12 transition-all ${
          room ? 'max-w-7xl' : 'max-w-2xl'
        }`}
      >
        {room ? (
          /* Active Room 3-Column Layout: Left (Room/Members), Center (Timer+Tasks), Right (Live Chat) */
          <div className="w-full flex flex-col lg:flex-row items-start justify-center gap-6 mt-2 sm:mt-4">
            {/* Left Column: Room & Participants Panel */}
            <div
              className={`w-full lg:w-72 xl:w-80 shrink-0 ${
                mobileRoomTab === 'members' ? 'block' : 'hidden lg:block'
              }`}
            >
              <RoomMembersPanel
                room={room}
                user={user}
                isHost={isHost}
                isPureFocus={isPureFocus}
                onToggleSyncMode={handleToggleRoomSyncMode}
                onSendReaction={handleSendRoomReaction}
                onLeaveRoom={handleLeaveRoom}
              />
            </div>

            {/* Center Column: Timer Card + Task List */}
            <div
              className={`flex-1 w-full max-w-xl mx-auto flex flex-col items-center justify-start ${
                mobileRoomTab === 'timer' ? 'block' : 'hidden lg:block'
              }`}
            >
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
                isPureFocus={isPureFocus}
                onSetMode={handleSetMode}
                onToggleTimer={handleToggleTimer}
                onSkipTimer={handleSkipTimer}
                onResetTimer={handleResetTimer}
                onToggleActiveTaskComplete={() => activeTaskId && handleToggleComplete(activeTaskId)}
              />

              <div className="w-full mt-6">
                <TaskList
                  tasks={tasks}
                  activeTaskId={activeTaskId}
                  pomodoroMinutes={settings.pomodoroTime}
                  isPureFocus={isPureFocus}
                  onSelectTask={handleSelectTask}
                  onToggleComplete={handleToggleComplete}
                  onAddTask={handleAddTask}
                  onUpdateTask={handleUpdateTask}
                  onDeleteTask={handleDeleteTask}
                  onClearCompleted={handleClearCompleted}
                  onClearActPomodoros={handleClearActPomodoros}
                  onClearAllTasks={handleClearAllTasks}
                />
              </div>
            </div>

            {/* Right Column: Live Room Chat with Focus Lock */}
            <div
              className={`w-full lg:w-80 xl:w-96 shrink-0 ${
                mobileRoomTab === 'chat' ? 'block' : 'hidden lg:block'
              }`}
            >
              <RoomChatPanel
                messages={room.messages}
                user={user}
                isChatLocked={isChatLocked}
                isPureFocus={isPureFocus}
                onSendMessage={handleSendRoomMessage}
              />
            </div>
          </div>
        ) : (
          /* Solo View: Classic Centered Flow */
          <div className="flex flex-col items-center justify-start w-full max-w-2xl mx-auto">
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
              isPureFocus={isPureFocus}
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
              isPureFocus={isPureFocus}
              onSelectTask={handleSelectTask}
              onToggleComplete={handleToggleComplete}
              onAddTask={handleAddTask}
              onUpdateTask={handleUpdateTask}
              onDeleteTask={handleDeleteTask}
              onClearCompleted={handleClearCompleted}
              onClearActPomodoros={handleClearActPomodoros}
              onClearAllTasks={handleClearAllTasks}
            />
          </div>
        )}
      </main>

      {/* Modals */}
      <OnlineRoomModal
        isOpen={isRoomsOpen}
        onClose={() => setIsRoomsOpen(false)}
        user={user}
        room={room}
        isChatLocked={isChatLocked}
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
