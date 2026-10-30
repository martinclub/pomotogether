import React, { useState } from 'react';
import { Plus, MoreVertical, Check, Trash2, RotateCcw, Edit2 } from 'lucide-react';
import { Task } from '../types';

interface TaskListProps {
  tasks: Task[];
  activeTaskId: string | null;
  pomodoroMinutes: number;
  onSelectTask: (id: string) => void;
  onToggleComplete: (id: string) => void;
  onAddTask: (task: Omit<Task, 'id' | 'createdAt'>) => void;
  onUpdateTask: (id: string, updates: Partial<Task>) => void;
  onDeleteTask: (id: string) => void;
  onClearCompleted: () => void;
  onClearActPomodoros: () => void;
  onClearAllTasks: () => void;
}

export const TaskList: React.FC<TaskListProps> = ({
  tasks,
  activeTaskId,
  pomodoroMinutes,
  onSelectTask,
  onToggleComplete,
  onAddTask,
  onUpdateTask,
  onDeleteTask,
  onClearCompleted,
  onClearActPomodoros,
  onClearAllTasks,
}) => {
  const [isAdding, setIsAdding] = useState(false);
  const [editingTaskId, setEditingTaskId] = useState<string | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);

  // Form states for new task
  const [title, setTitle] = useState('');
  const [est, setEst] = useState(1);
  const [notes, setNotes] = useState('');
  const [showNotes, setShowNotes] = useState(false);

  // Form states for editing task
  const [editTitle, setEditTitle] = useState('');
  const [editEst, setEditEst] = useState(1);
  const [editAct, setEditAct] = useState(0);
  const [editNotes, setEditNotes] = useState('');

  const handleStartAdd = () => {
    setIsAdding(true);
    setTitle('');
    setEst(1);
    setNotes('');
    setShowNotes(false);
  };

  const handleSaveNew = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    onAddTask({
      title: title.trim(),
      est: Math.max(1, est),
      act: 0,
      notes: notes.trim() || undefined,
      completed: false,
    });

    setTitle('');
    setEst(1);
    setNotes('');
    setShowNotes(false);
    setIsAdding(false);
  };

  const handleStartEdit = (task: Task, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingTaskId(task.id);
    setEditTitle(task.title);
    setEditEst(task.est);
    setEditAct(task.act);
    setEditNotes(task.notes || '');
  };

  const handleSaveEdit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingTaskId || !editTitle.trim()) return;

    onUpdateTask(editingTaskId, {
      title: editTitle.trim(),
      est: Math.max(1, editEst),
      act: Math.max(0, editAct),
      notes: editNotes.trim() || undefined,
    });
    setEditingTaskId(null);
  };

  // Calculations for summary footer
  const totalEst = tasks.reduce((acc, t) => acc + (t.completed ? 0 : t.est), 0);
  const totalAct = tasks.reduce((acc, t) => acc + t.act, 0);
  const remainingEst = tasks.reduce((acc, t) => acc + (t.completed ? 0 : Math.max(0, t.est - t.act)), 0);

  // Estimated finish time
  const finishTimestamp = Date.now() + remainingEst * pomodoroMinutes * 60 * 1000;
  const finishDate = new Date(finishTimestamp);
  const finishTimeStr = `${finishDate.getHours().toString().padStart(2, '0')}:${finishDate
    .getMinutes()
    .toString()
    .padStart(2, '0')}`;

  return (
    <div className="w-full max-w-lg mx-auto mt-8 pb-16">
      {/* Header */}
      <div className="flex items-center justify-between pb-3 border-b-2 border-white/20 mb-4 relative">
        <h3 className="text-lg font-bold text-white tracking-wide">Tasks</h3>

        {/* Menu Dropdown */}
        <div className="relative">
          <button
            onClick={() => setMenuOpen(!menuOpen)}
            className="w-8 h-8 rounded-lg bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-all"
            title="Task options"
          >
            <MoreVertical className="w-4 h-4" />
          </button>

          {menuOpen && (
            <>
              <div className="fixed inset-0 z-20" onClick={() => setMenuOpen(false)} />
              <div className="absolute right-0 mt-2 w-52 bg-white rounded-xl shadow-2xl py-2 z-30 text-slate-800 text-sm border border-slate-100 animate-popIn">
                <button
                  onClick={() => {
                    onClearCompleted();
                    setMenuOpen(false);
                  }}
                  className="w-full px-4 py-2 text-left hover:bg-slate-100 flex items-center gap-2 text-slate-700"
                >
                  <Check className="w-4 h-4 text-emerald-600" /> Clear finished tasks
                </button>
                <button
                  onClick={() => {
                    onClearActPomodoros();
                    setMenuOpen(false);
                  }}
                  className="w-full px-4 py-2 text-left hover:bg-slate-100 flex items-center gap-2 text-slate-700"
                >
                  <RotateCcw className="w-4 h-4 text-amber-600" /> Clear act pomodoros
                </button>
                <div className="my-1 border-t border-slate-100" />
                <button
                  onClick={() => {
                    if (confirm('Clear all tasks?')) {
                      onClearAllTasks();
                    }
                    setMenuOpen(false);
                  }}
                  className="w-full px-4 py-2 text-left hover:bg-rose-50 flex items-center gap-2 text-rose-600 font-medium"
                >
                  <Trash2 className="w-4 h-4" /> Clear all tasks
                </button>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Task Items */}
      <div className="space-y-2.5">
        {tasks.map((task) => {
          const isActive = task.id === activeTaskId;
          const isEditing = task.id === editingTaskId;

          if (isEditing) {
            return (
              <form
                key={task.id}
                onSubmit={handleSaveEdit}
                className="bg-white rounded-xl p-4 shadow-lg text-slate-800 border border-slate-200 animate-popIn"
              >
                <input
                  type="text"
                  value={editTitle}
                  onChange={(e) => setEditTitle(e.target.value)}
                  placeholder="What are you working on?"
                  className="w-full text-base font-semibold outline-none border-b border-slate-200 pb-2 text-slate-800 placeholder-slate-400"
                  autoFocus
                />

                <div className="mt-3 flex items-center justify-between text-sm">
                  <span className="font-medium text-slate-600">Act / Est Pomodoros:</span>
                  <div className="flex items-center space-x-2">
                    <input
                      type="number"
                      min={0}
                      value={editAct}
                      onChange={(e) => setEditAct(parseInt(e.target.value) || 0)}
                      className="w-14 text-center bg-slate-100 rounded-md py-1 font-bold border border-slate-300"
                      title="Actual pomodoros"
                    />
                    <span className="text-slate-400 font-bold">/</span>
                    <input
                      type="number"
                      min={1}
                      value={editEst}
                      onChange={(e) => setEditEst(parseInt(e.target.value) || 1)}
                      className="w-14 text-center bg-slate-100 rounded-md py-1 font-bold border border-slate-300"
                      title="Estimated pomodoros"
                    />
                  </div>
                </div>

                <div className="mt-3">
                  <textarea
                    value={editNotes}
                    onChange={(e) => setEditNotes(e.target.value)}
                    placeholder="Notes..."
                    rows={2}
                    className="w-full text-xs p-2 bg-slate-50 rounded-lg border border-slate-200 outline-none text-slate-700 resize-none"
                  />
                </div>

                <div className="mt-4 flex items-center justify-between pt-2 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => onDeleteTask(task.id)}
                    className="text-xs text-rose-500 hover:text-rose-700 font-semibold flex items-center gap-1"
                  >
                    <Trash2 className="w-3.5 h-3.5" /> Delete
                  </button>
                  <div className="flex items-center space-x-2">
                    <button
                      type="button"
                      onClick={() => setEditingTaskId(null)}
                      className="px-3 py-1.5 text-xs font-semibold text-slate-500 hover:text-slate-700"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="px-4 py-1.5 text-xs font-bold text-white bg-slate-900 hover:bg-slate-800 rounded-lg shadow-sm"
                    >
                      Save
                    </button>
                  </div>
                </div>
              </form>
            );
          }

          return (
            <div
              key={task.id}
              onClick={() => onSelectTask(task.id)}
              className={`group bg-white rounded-xl p-3 sm:p-4 shadow-sm text-slate-800 cursor-pointer transition-all flex items-center justify-between border-l-4 ${
                isActive
                  ? 'border-l-slate-900 shadow-md ring-1 ring-slate-900/10'
                  : 'border-l-transparent hover:border-l-slate-300'
              }`}
            >
              <div className="flex items-center space-x-3 overflow-hidden pr-2">
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onToggleComplete(task.id);
                  }}
                  className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all shrink-0 ${
                    task.completed
                      ? 'bg-emerald-500 border-emerald-500 text-white'
                      : 'border-slate-300 hover:border-slate-400 text-transparent'
                  }`}
                >
                  <Check className="w-4 h-4 stroke-[3]" />
                </button>

                <div className="truncate">
                  <p
                    className={`font-semibold text-sm sm:text-base text-slate-800 truncate ${
                      task.completed ? 'line-through text-slate-400 font-normal' : ''
                    }`}
                  >
                    {task.title}
                  </p>
                  {task.notes && (
                    <p className="text-xs text-slate-400 truncate mt-0.5">{task.notes}</p>
                  )}
                </div>
              </div>

              <div className="flex items-center space-x-2 shrink-0">
                <span className="text-xs font-bold text-slate-500 bg-slate-100 px-2 py-1 rounded-md">
                  {task.act}/{task.est}
                </span>
                <button
                  onClick={(e) => handleStartEdit(task, e)}
                  className="w-7 h-7 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-700 flex items-center justify-center transition-all opacity-70 group-hover:opacity-100"
                  title="Edit task"
                >
                  <Edit2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Add Task Box */}
      {isAdding ? (
        <form
          onSubmit={handleSaveNew}
          className="mt-3 bg-white rounded-xl p-4 shadow-xl text-slate-800 border border-slate-200 animate-popIn"
        >
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="What are you working on?"
            className="w-full text-base font-semibold outline-none border-b border-slate-200 pb-2 text-slate-800 placeholder-slate-400"
            autoFocus
          />

          <div className="mt-4 flex items-center justify-between text-sm">
            <span className="font-medium text-slate-600">Est Pomodoros:</span>
            <div className="flex items-center space-x-1">
              <button
                type="button"
                onClick={() => setEst(Math.max(1, est - 1))}
                className="w-7 h-7 rounded-md bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold flex items-center justify-center"
              >
                -
              </button>
              <input
                type="number"
                min={1}
                value={est}
                onChange={(e) => setEst(parseInt(e.target.value) || 1)}
                className="w-12 text-center bg-slate-100 rounded-md py-1 font-bold border border-slate-300"
              />
              <button
                type="button"
                onClick={() => setEst(est + 1)}
                className="w-7 h-7 rounded-md bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold flex items-center justify-center"
              >
                +
              </button>
            </div>
          </div>

          {showNotes ? (
            <div className="mt-3">
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Some notes..."
                rows={2}
                className="w-full text-xs p-2 bg-slate-50 rounded-lg border border-slate-200 outline-none text-slate-700 resize-none"
              />
            </div>
          ) : (
            <div className="mt-3">
              <button
                type="button"
                onClick={() => setShowNotes(true)}
                className="text-xs text-slate-500 hover:text-slate-800 underline font-medium"
              >
                + Add Note
              </button>
            </div>
          )}

          <div className="mt-4 flex items-center justify-end space-x-2 pt-2 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setIsAdding(false)}
              className="px-4 py-1.5 text-xs font-semibold text-slate-500 hover:text-slate-800"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!title.trim()}
              className="px-5 py-1.5 text-xs font-bold text-white bg-slate-900 hover:bg-slate-800 disabled:opacity-50 rounded-lg shadow-sm"
            >
              Save
            </button>
          </div>
        </form>
      ) : (
        <button
          onClick={handleStartAdd}
          className="w-full mt-3 py-3 rounded-xl border-2 border-dashed border-white/40 hover:border-white/80 bg-black/10 hover:bg-black/20 text-white/90 font-bold text-sm flex items-center justify-center space-x-2 transition-all cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>Add Task</span>
        </button>
      )}

      {/* Summary Footer */}
      {tasks.length > 0 && (
        <div className="mt-6 pt-4 border-t border-white/20 flex flex-wrap items-center justify-between text-xs sm:text-sm text-white/80 font-medium px-2">
          <div className="space-x-4">
            <span>
              Est: <strong className="text-white">{totalEst}</strong> ({(totalEst * (pomodoroMinutes / 60)).toFixed(1)}h)
            </span>
            <span>
              Act: <strong className="text-white">{totalAct}</strong> ({(totalAct * (pomodoroMinutes / 60)).toFixed(1)}h)
            </span>
          </div>
          <div>
            Finish at: <strong className="text-white">{finishTimeStr}</strong>
          </div>
        </div>
      )}
    </div>
  );
};
