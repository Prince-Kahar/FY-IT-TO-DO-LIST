import React, { useState, useEffect } from 'react';
import {
  CheckSquare,
  Plus,
  Flame,
  Calendar,
  Clock,
  CheckCircle2,
  AlertCircle,
  Play,
  RotateCcw,
  Trash2,
  ChevronDown,
  ChevronRight,
  Filter,
  Search,
  Sparkles,
  Download,
  List,
  Columns,
  Tag,
  BookOpen,
  ArrowRight,
  Coffee,
  Circle,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { dataService } from '../../lib/dataService';
import { PomodoroTimer } from '../../components/PomodoroTimer';

export const StudentTodoList = () => {
  const { user } = useAuth();
  const { addToast, triggerConfetti } = useToast();

  const [todos, setTodos] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [assignments, setAssignments] = useState([]);
  const [loading, setLoading] = useState(true);

  // Quick Add State
  const [quickTitle, setQuickTitle] = useState('');
  const [isExpandedAdd, setIsExpandedAdd] = useState(false);
  const [newSubjectId, setNewSubjectId] = useState('');
  const [newPriority, setNewPriority] = useState('Medium');
  const [newCategory, setNewCategory] = useState('Study');
  const [newDueDate, setNewDueDate] = useState(new Date().toISOString().slice(0, 10));
  const [newDescription, setNewDescription] = useState('');
  const [newSubtasks, setNewSubtasks] = useState([]);
  const [subtaskInput, setSubtaskInput] = useState('');

  // View & Filter State
  const [viewMode, setViewMode] = useState('list'); // 'list' | 'kanban'
  const [filterTab, setFilterTab] = useState('ALL'); // 'ALL' | 'TODAY' | 'HIGH' | 'COMPLETED' | 'IN_PROGRESS'
  const [subjectFilter, setSubjectFilter] = useState('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedTodoIds, setExpandedTodoIds] = useState([]);

  // Pomodoro Timer State
  const [activeTimerTask, setActiveTimerTask] = useState(null);
  const [isTimerOpen, setIsTimerOpen] = useState(false);

  // Inline Subtask Add State
  const [inlineSubtaskText, setInlineSubtaskText] = useState({});

  const loadTodoData = async (isBackground = false) => {
    if (!user) return;
    if (!isBackground) setLoading(true);
    try {
      const [todoList, subList, asgList] = await Promise.all([
        dataService.getTodos(user.id),
        dataService.getSubjects(),
        dataService.getStudentAssignments(user.id),
      ]);
      setTodos(todoList);
      setSubjects(subList);
      setAssignments(asgList);
      if (todoList.length > 0 && expandedTodoIds.length === 0) {
        setExpandedTodoIds([todoList[0].id]);
      }
    } catch (err) {
      console.error('Error loading todos:', err);
    } finally {
      if (!isBackground) setLoading(false);
    }
  };

  useEffect(() => {
    loadTodoData();

    // 1. Continuous Live Polling every 1 second from Supabase
    const pollInterval = setInterval(() => {
      loadTodoData(true);
    }, 1000);

    // 2. Auto refetch on focus / visibility change
    const handleFocus = () => loadTodoData(true);
    window.addEventListener('focus', handleFocus);
    document.addEventListener('visibilitychange', handleFocus);

    // 3. Supabase Realtime & mutation event bus
    const unsubscribe = dataService.subscribeRealtime(() => {
      loadTodoData(true);
    });

    return () => {
      clearInterval(pollInterval);
      window.removeEventListener('focus', handleFocus);
      document.removeEventListener('visibilitychange', handleFocus);
      if (unsubscribe) unsubscribe();
    };
  }, [user]);

  // Quick Add Task
  const handleCreateTodo = async (e) => {
    e.preventDefault();
    if (!quickTitle.trim()) {
      addToast('Please enter a task title.', 'error');
      return;
    }

    try {
      const payload = {
        user_id: user.id,
        title: quickTitle.trim(),
        description: newDescription.trim() || null,
        subject_id: newSubjectId || null,
        category: newCategory,
        priority: newPriority,
        due_date: newDueDate || null,
        status: 'pending',
        subtasks: newSubtasks.map((text, idx) => ({
          id: 'st-' + Date.now() + '-' + idx,
          text,
          completed: false,
        })),
      };

      await dataService.createTodo(payload);
      addToast('Task added to your Daily To-Do List!', 'success');

      // Reset
      setQuickTitle('');
      setNewDescription('');
      setNewSubtasks([]);
      setSubtaskInput('');
      setIsExpandedAdd(false);
      loadTodoData();
    } catch (err) {
      console.error('Failed to create todo:', err);
      addToast('Failed to add task.', 'error');
    }
  };

  const handleAddDraftSubtask = (e) => {
    e.preventDefault();
    if (!subtaskInput.trim()) return;
    setNewSubtasks((prev) => [...prev, subtaskInput.trim()]);
    setSubtaskInput('');
  };

  // Toggle Todo Status
  const handleToggleTodo = async (id, currentStatus) => {
    try {
      const newStatus = currentStatus === 'completed' ? 'pending' : 'completed';
      if (newStatus === 'completed') {
        triggerConfetti();
        addToast('🎯 Task completed! Great academic progress!', 'success');
      }
      await dataService.toggleTodoStatus(id);
      loadTodoData();
    } catch (err) {
      console.error('Toggle todo error:', err);
    }
  };

  // Change status (Kanban movement)
  const handleChangeStatus = async (id, newStatus) => {
    try {
      if (newStatus === 'completed') {
        triggerConfetti();
        addToast('Task marked as completed! 🎉', 'success');
      }
      await dataService.updateTodo(id, {
        status: newStatus,
        completed_at: newStatus === 'completed' ? new Date().toISOString() : null,
      });
      loadTodoData();
    } catch (err) {
      console.error('Update status error:', err);
    }
  };

  // Toggle Subtask
  const handleToggleSubtask = async (todoId, subtaskId) => {
    try {
      await dataService.toggleSubtask(todoId, subtaskId);
      loadTodoData();
    } catch (err) {
      console.error('Subtask toggle error:', err);
    }
  };

  // Add Inline Subtask
  const handleAddInlineSubtask = async (todoId) => {
    const text = inlineSubtaskText[todoId];
    if (!text || !text.trim()) return;

    try {
      await dataService.addSubtask(todoId, text.trim());
      setInlineSubtaskText((prev) => ({ ...prev, [todoId]: '' }));
      loadTodoData();
    } catch (err) {
      console.error('Add inline subtask error:', err);
    }
  };

  // Delete Todo
  const handleDeleteTodo = async (id) => {
    try {
      await dataService.deleteTodo(id);
      addToast('Task deleted from to-do list.', 'info');
      loadTodoData();
    } catch (err) {
      console.error('Delete error:', err);
    }
  };

  // Import Pending Teacher Academic Tasks
  const handleImportAcademicTasks = async () => {
    try {
      const count = await dataService.importAcademicTasksAsTodos(user.id, assignments);
      if (count === 0) {
        addToast('All pending academic assignments are already in your To-Do list!', 'info');
      } else {
        triggerConfetti();
        addToast(`📥 Successfully imported ${count} academic assignments into your daily To-Do!`, 'success');
        loadTodoData();
      }
    } catch (err) {
      console.error('Import error:', err);
      addToast('Failed to import academic tasks.', 'error');
    }
  };

  // Log Pomodoro study time
  const handleLogStudyTime = async (todoId, minutes) => {
    try {
      await dataService.logTodoStudyTime(todoId, minutes);
      loadTodoData();
    } catch (err) {
      console.error('Error logging study time:', err);
    }
  };

  const toggleExpand = (id) => {
    setExpandedTodoIds((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    );
  };

  // Metrics calculation with null safety
  const safeTodos = todos || [];
  const totalCount = safeTodos.length;
  const completedCount = safeTodos.filter((t) => t?.status === 'completed').length;
  const pendingCount = totalCount - completedCount;
  const completionRate = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;
  const totalStudyMinutes = safeTodos.reduce((acc, t) => acc + (t?.time_spent_minutes || 0), 0);
  const totalStudyHours = (totalStudyMinutes / 60).toFixed(1);

  // Filtered Todos
  const todayStr = new Date().toISOString().slice(0, 10);

  const filteredTodos = (todos || []).filter((t) => {
    if (!t) return false;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      if (!t.title?.toLowerCase().includes(q) && !t.description?.toLowerCase().includes(q)) {
        return false;
      }
    }

    if (subjectFilter !== 'ALL' && t.subject_id !== subjectFilter) {
      return false;
    }

    if (filterTab === 'TODAY' && t.due_date !== todayStr && t.status !== 'completed') {
      return false;
    }
    if (filterTab === 'HIGH' && t.priority !== 'High') return false;
    if (filterTab === 'COMPLETED' && t.status !== 'completed') return false;
    if (filterTab === 'IN_PROGRESS' && t.status !== 'in_progress') return false;

    return true;
  });

  return (
    <div>
      {/* Header */}
      <div className="page-header">
        <div>
          <h1 className="page-title">Daily To-Do List & Study Planner</h1>
          <p className="page-description">
            Organize daily subject practicals, journal write-ups, exam revision, and track study focus sessions.
          </p>
        </div>

        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          <button
            type="button"
            className="btn btn-secondary btn-sm"
            onClick={handleImportAcademicTasks}
            title="Import all pending teacher assignments into your daily to-do list"
          >
            <Download size={14} />
            <span>Sync Academic Assignments</span>
          </button>

          <button
            type="button"
            className="btn btn-primary btn-sm"
            onClick={() => setIsTimerOpen(!isTimerOpen)}
            style={{ background: isTimerOpen ? '#4338CA' : 'var(--primary-600)' }}
          >
            <Flame size={15} color="#FFD700" />
            <span>{isTimerOpen ? 'Hide Focus Timer' : 'Pomodoro Focus Timer'}</span>
          </button>
        </div>
      </div>

      {/* Embedded Pomodoro Timer (if toggled) */}
      {isTimerOpen && (
        <div style={{ marginBottom: '24px' }}>
          <PomodoroTimer
            currentTask={activeTimerTask}
            onLogStudyTime={handleLogStudyTime}
            onClose={() => setIsTimerOpen(false)}
          />
        </div>
      )}

      {/* Daily Progress & Streak Widget */}
      <div
        className="card"
        style={{
          background: 'linear-gradient(135deg, #EEF2FF 0%, #FFFFFF 50%, #F0FDFA 100%)',
          border: '1px solid #C7D2FE',
          marginBottom: '24px',
          padding: '20px 24px',
        }}
      >
        <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: '16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
            <div
              style={{
                width: 48,
                height: 48,
                borderRadius: 'var(--radius-md)',
                background: 'linear-gradient(135deg, #4F46E5, #0D9488)',
                color: '#fff',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: '0 4px 10px rgba(79, 70, 229, 0.3)',
              }}
            >
              <CheckSquare size={24} />
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span
                  style={{
                    background: '#FEF3C7',
                    color: '#B45309',
                    fontSize: '0.75rem',
                    fontWeight: 700,
                    padding: '2px 8px',
                    borderRadius: 'var(--radius-full)',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '4px',
                  }}
                >
                  <Flame size={13} />
                  <span>4-Day Study Streak!</span>
                </span>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                  ⏱️ {totalStudyHours} hrs study logged
                </span>
              </div>
              <h3 style={{ fontSize: '1.2rem', fontWeight: 700, marginTop: '2px' }}>
                {completedCount} of {totalCount} tasks completed ({completionRate}%)
              </h3>
            </div>
          </div>

          <div style={{ minWidth: '220px', flex: 1, maxWidth: '350px' }}>
            <div className="progress-container" style={{ height: '10px' }}>
              <div className="progress-fill" style={{ width: `${completionRate}%` }} />
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '4px' }}>
              <span>{pendingCount} Pending</span>
              <span>{completedCount} Completed</span>
            </div>
          </div>
        </div>
      </div>

      {/* Quick Add Bar */}
      <div className="card" style={{ marginBottom: '24px', padding: '16px 20px' }}>
        <form onSubmit={handleCreateTodo}>
          <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
            <div style={{ position: 'relative', flex: 1 }}>
              <input
                type="text"
                className="form-control"
                placeholder="+ Add a new daily academic to-do (e.g. Write C Pointer code, Draw DBMS ER diagram...)"
                value={quickTitle}
                onChange={(e) => setQuickTitle(e.target.value)}
                onFocus={() => setIsExpandedAdd(true)}
                style={{ paddingLeft: '14px', fontSize: '0.95rem' }}
              />
            </div>

            <button
              type="button"
              className="btn btn-secondary btn-sm"
              onClick={() => setIsExpandedAdd(!isExpandedAdd)}
              title="Expand task options"
            >
              <Tag size={15} />
              <span>{isExpandedAdd ? 'Less' : 'Details'}</span>
            </button>

            <button type="submit" className="btn btn-primary btn-sm" disabled={!quickTitle.trim()}>
              <Plus size={16} />
              <span>Add Task</span>
            </button>
          </div>

          {/* Expanded Task Options */}
          {isExpandedAdd && (
            <div
              style={{
                marginTop: '16px',
                paddingTop: '16px',
                borderTop: '1px solid var(--border-light)',
                display: 'flex',
                flexDirection: 'column',
                gap: '14px',
              }}
            >
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '12px' }}>
                <div>
                  <label className="form-label">Subject</label>
                  <select
                    className="form-control"
                    value={newSubjectId}
                    onChange={(e) => setNewSubjectId(e.target.value)}
                  >
                    <option value="">General / Personal</option>
                    {subjects.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name} ({s.subject_code || 'IT'})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="form-label">Priority</label>
                  <select
                    className="form-control"
                    value={newPriority}
                    onChange={(e) => setNewPriority(e.target.value)}
                  >
                    <option value="High">🔥 High Priority</option>
                    <option value="Medium">⚡ Medium Priority</option>
                    <option value="Low">🟢 Low Priority</option>
                  </select>
                </div>

                <div>
                  <label className="form-label">Category</label>
                  <select
                    className="form-control"
                    value={newCategory}
                    onChange={(e) => setNewCategory(e.target.value)}
                  >
                    <option value="Practical">Lab Practical</option>
                    <option value="Assignment">Assignment Write-up</option>
                    <option value="Homework">Homework Problem</option>
                    <option value="Revision">Exam Revision</option>
                    <option value="Project">Project Work</option>
                    <option value="Study">Self Study</option>
                    <option value="Personal">Personal / Supplies</option>
                  </select>
                </div>

                <div>
                  <label className="form-label">Due Date</label>
                  <input
                    type="date"
                    className="form-control"
                    value={newDueDate}
                    onChange={(e) => setNewDueDate(e.target.value)}
                  />
                </div>
              </div>

              <div>
                <label className="form-label">Instructions / Study Notes (Optional)</label>
                <textarea
                  className="form-control"
                  rows={2}
                  placeholder="Additional details, textbook page numbers, dry-run instructions..."
                  value={newDescription}
                  onChange={(e) => setNewDescription(e.target.value)}
                />
              </div>

              {/* Subtasks Builder */}
              <div>
                <label className="form-label">Checklist Steps / Subtasks ({newSubtasks.length})</label>
                <div style={{ display: 'flex', gap: '8px', marginBottom: '8px' }}>
                  <input
                    type="text"
                    className="form-control"
                    placeholder="Add step (e.g. Write code on page 12) & press Enter"
                    value={subtaskInput}
                    onChange={(e) => setSubtaskInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        handleAddDraftSubtask(e);
                      }
                    }}
                  />
                  <button
                    type="button"
                    className="btn btn-secondary btn-sm"
                    onClick={handleAddDraftSubtask}
                  >
                    Add Step
                  </button>
                </div>

                {newSubtasks.length > 0 && (
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                    {newSubtasks.map((st, idx) => (
                      <span
                        key={idx}
                        style={{
                          background: 'var(--bg-subtle)',
                          border: '1px solid var(--border-light)',
                          padding: '3px 8px',
                          borderRadius: 4,
                          fontSize: '0.75rem',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '6px',
                        }}
                      >
                        <span>{idx + 1}. {st}</span>
                        <button
                          type="button"
                          onClick={() => setNewSubtasks((prev) => prev.filter((_, i) => i !== idx))}
                          style={{ color: 'var(--danger-main)', cursor: 'pointer' }}
                        >
                          ×
                        </button>
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </form>
      </div>

      {/* Filter Tabs & View Switcher Bar */}
      <div
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '12px',
          marginBottom: '20px',
        }}
      >
        {/* Filter Pills */}
        <div style={{ display: 'flex', gap: '8px', overflowX: 'auto', paddingBottom: '4px' }}>
          {[
            { key: 'ALL', label: 'All Tasks', count: totalCount },
            {
              key: 'TODAY',
              label: "Today's Focus 🎯",
              count: todos.filter((t) => t.due_date === todayStr && t.status !== 'completed').length,
            },
            {
              key: 'IN_PROGRESS',
              label: 'In Progress ⚡',
              count: todos.filter((t) => t.status === 'in_progress').length,
            },
            {
              key: 'HIGH',
              label: 'High Priority 🔥',
              count: todos.filter((t) => t.priority === 'High' && t.status !== 'completed').length,
            },
            {
              key: 'COMPLETED',
              label: 'Completed ✅',
              count: completedCount,
            },
          ].map((tab) => (
            <button
              key={tab.key}
              type="button"
              className="btn btn-sm"
              onClick={() => setFilterTab(tab.key)}
              style={{
                background: filterTab === tab.key ? 'var(--primary-600)' : '#FFFFFF',
                color: filterTab === tab.key ? '#FFFFFF' : 'var(--text-muted)',
                border: `1px solid ${filterTab === tab.key ? 'var(--primary-600)' : 'var(--border-light)'}`,
                borderRadius: 'var(--radius-full)',
                padding: '5px 12px',
                fontWeight: 600,
                fontSize: '0.8rem',
              }}
            >
              <span>{tab.label}</span>
              <span
                style={{
                  background: filterTab === tab.key ? 'rgba(255,255,255,0.25)' : 'var(--bg-subtle)',
                  padding: '1px 6px',
                  borderRadius: 10,
                  fontSize: '0.7rem',
                  marginLeft: 4,
                }}
              >
                {tab.count}
              </span>
            </button>
          ))}
        </div>

        {/* View Switcher & Search */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <select
            className="form-control"
            style={{ width: 'auto', padding: '6px 10px', fontSize: '0.8rem' }}
            value={subjectFilter}
            onChange={(e) => setSubjectFilter(e.target.value)}
          >
            <option value="ALL">All Subjects</option>
            {subjects.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>

          <div
            style={{
              display: 'flex',
              background: 'var(--bg-subtle)',
              padding: '3px',
              borderRadius: 'var(--radius-md)',
            }}
          >
            <button
              type="button"
              onClick={() => setViewMode('list')}
              style={{
                padding: '5px 8px',
                borderRadius: 'var(--radius-sm)',
                background: viewMode === 'list' ? '#FFFFFF' : 'transparent',
                color: viewMode === 'list' ? 'var(--primary-700)' : 'var(--text-muted)',
                boxShadow: viewMode === 'list' ? 'var(--shadow-sm)' : 'none',
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
                fontSize: '0.75rem',
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              <List size={14} />
              <span>List</span>
            </button>

            <button
              type="button"
              onClick={() => setViewMode('kanban')}
              style={{
                padding: '5px 8px',
                borderRadius: 'var(--radius-sm)',
                background: viewMode === 'kanban' ? '#FFFFFF' : 'transparent',
                color: viewMode === 'kanban' ? 'var(--primary-700)' : 'var(--text-muted)',
                boxShadow: viewMode === 'kanban' ? 'var(--shadow-sm)' : 'none',
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
                fontSize: '0.75rem',
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              <Columns size={14} />
              <span>Board</span>
            </button>
          </div>
        </div>
      </div>

      {/* VIEW MODE 1: LIST VIEW */}
      {viewMode === 'list' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {filteredTodos.length === 0 ? (
            <div className="card empty-state">
              <div className="empty-state-icon">
                <CheckSquare size={28} />
              </div>
              <h3 className="empty-state-title">No tasks in this view</h3>
              <p className="empty-state-desc">
                Add a task above or click "Sync Academic Assignments" to populate your study checklist!
              </p>
            </div>
          ) : (
            filteredTodos.map((todo) => {
              const isCompleted = todo.status === 'completed';
              const isInProgress = todo.status === 'in_progress';
              const isExpanded = expandedTodoIds.includes(todo.id);
              const subtasks = todo.subtasks || [];
              const subtasksDone = subtasks.filter((st) => st.completed).length;
              const subtaskPct = subtasks.length > 0 ? Math.round((subtasksDone / subtasks.length) * 100) : 0;
              const isToday = todo.due_date === todayStr;

              return (
                <div
                  key={todo.id}
                  className="card"
                  style={{
                    padding: '16px 20px',
                    opacity: isCompleted ? 0.75 : 1,
                    borderLeft: `4px solid ${
                      isCompleted
                        ? 'var(--success-main)'
                        : todo.priority === 'High'
                        ? 'var(--danger-main)'
                        : todo.priority === 'Medium'
                        ? '#D97706'
                        : 'var(--primary-600)'
                    }`,
                    background: isCompleted ? '#F8FAFC' : '#FFFFFF',
                    transition: 'all 0.2s ease',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '12px' }}>
                    {/* Left: Checkbox + Title + Metadata */}
                    <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px', flex: 1 }}>
                      <button
                        type="button"
                        onClick={() => handleToggleTodo(todo.id, todo.status)}
                        style={{
                          marginTop: '2px',
                          color: isCompleted ? 'var(--success-main)' : 'var(--border-strong)',
                          cursor: 'pointer',
                          display: 'flex',
                          transition: 'color 0.15s',
                        }}
                        title={isCompleted ? 'Mark as Pending' : 'Mark as Complete'}
                      >
                        {isCompleted ? <CheckCircle2 size={22} fill="#DCFCE7" /> : <Circle size={22} />}
                      </button>

                      <div style={{ flex: 1 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap', marginBottom: '4px' }}>
                          {todo.subjects && (
                            <span
                              style={{
                                background: 'var(--primary-50)',
                                color: 'var(--primary-700)',
                                fontSize: '0.7rem',
                                fontWeight: 700,
                                padding: '2px 6px',
                                borderRadius: 4,
                              }}
                            >
                              {todo.subjects.subject_code || 'IT'} • {todo.subjects.name}
                            </span>
                          )}

                          <span
                            style={{
                              background: 'var(--bg-subtle)',
                              color: 'var(--text-muted)',
                              fontSize: '0.7rem',
                              fontWeight: 600,
                              padding: '2px 6px',
                              borderRadius: 4,
                            }}
                          >
                            {todo.category || 'Study'}
                          </span>

                          <span
                            style={{
                              fontSize: '0.7rem',
                              fontWeight: 700,
                              color:
                                todo.priority === 'High'
                                  ? 'var(--danger-main)'
                                  : todo.priority === 'Medium'
                                  ? '#D97706'
                                  : 'var(--text-muted)',
                            }}
                          >
                            {todo.priority === 'High' ? '🔥 High' : todo.priority === 'Medium' ? '⚡ Med' : '🟢 Low'}
                          </span>

                          {todo.due_date && (
                            <span
                              style={{
                                fontSize: '0.725rem',
                                fontWeight: isToday ? 700 : 500,
                                color: isToday ? '#B45309' : 'var(--text-muted)',
                                background: isToday ? '#FEF3C7' : 'transparent',
                                padding: isToday ? '1px 6px' : '0',
                                borderRadius: 4,
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '3px',
                              }}
                            >
                              <Calendar size={12} />
                              <span>{isToday ? 'Due Today' : `Due: ${todo.due_date}`}</span>
                            </span>
                          )}

                          {todo.time_spent_minutes > 0 && (
                            <span style={{ fontSize: '0.725rem', color: 'var(--primary-700)', fontWeight: 600 }}>
                              ⏱️ {todo.time_spent_minutes}m focused
                            </span>
                          )}
                        </div>

                        {/* Title */}
                        <div
                          style={{
                            fontSize: '1rem',
                            fontWeight: 600,
                            color: isCompleted ? 'var(--text-muted)' : 'var(--text-main)',
                            textDecoration: isCompleted ? 'line-through' : 'none',
                          }}
                        >
                          {todo.title}
                        </div>

                        {/* Description */}
                        {todo.description && (
                          <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginTop: '4px', lineHeight: 1.4 }}>
                            {todo.description}
                          </div>
                        )}

                        {/* Subtasks Progress Bar & Toggle */}
                        {subtasks.length > 0 && (
                          <div style={{ marginTop: '8px', display: 'flex', alignItems: 'center', gap: '10px' }}>
                            <div style={{ width: '120px', height: '6px', background: 'var(--border-light)', borderRadius: 999, overflow: 'hidden' }}>
                              <div style={{ width: `${subtaskPct}%`, height: '100%', background: 'var(--success-main)' }} />
                            </div>
                            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 600 }}>
                              {subtasksDone}/{subtasks.length} subtasks ({subtaskPct}%)
                            </span>
                            <button
                              type="button"
                              onClick={() => toggleExpand(todo.id)}
                              style={{ color: 'var(--primary-600)', fontSize: '0.75rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '2px' }}
                            >
                              <span>{isExpanded ? 'Hide Steps' : 'View Steps'}</span>
                              {isExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                            </button>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Right Action Buttons */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      {/* Start Focus Session Button */}
                      {!isCompleted && (
                        <button
                          type="button"
                          className="btn btn-secondary btn-sm"
                          onClick={() => {
                            setActiveTimerTask(todo);
                            setIsTimerOpen(true);
                          }}
                          title="Start 25m Focus Study Session"
                          style={{ fontSize: '0.75rem', padding: '4px 8px' }}
                        >
                          <Flame size={13} color="#E11D48" />
                          <span>Focus</span>
                        </button>
                      )}

                      <button
                        type="button"
                        onClick={() => handleDeleteTodo(todo.id)}
                        style={{ color: 'var(--text-subtle)', padding: '6px', cursor: 'pointer' }}
                        title="Delete to-do"
                      >
                        <Trash2 size={15} />
                      </button>
                    </div>
                  </div>

                  {/* Collapsible Checklist Subtasks */}
                  {isExpanded && (
                    <div
                      style={{
                        marginTop: '14px',
                        paddingTop: '12px',
                        borderTop: '1px solid var(--border-light)',
                        paddingLeft: '34px',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '6px',
                      }}
                    >
                      {subtasks.map((st) => (
                        <div
                          key={st.id}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '8px',
                            fontSize: '0.825rem',
                          }}
                        >
                          <input
                            type="checkbox"
                            checked={st.completed}
                            onChange={() => handleToggleSubtask(todo.id, st.id)}
                            style={{ cursor: 'pointer' }}
                          />
                          <span
                            style={{
                              color: st.completed ? 'var(--text-muted)' : 'var(--text-main)',
                              textDecoration: st.completed ? 'line-through' : 'none',
                            }}
                          >
                            {st.text}
                          </span>
                        </div>
                      ))}

                      {/* Add Inline Subtask */}
                      <div style={{ display: 'flex', gap: '6px', marginTop: '6px' }}>
                        <input
                          type="text"
                          className="form-control"
                          placeholder="+ Add next step..."
                          value={inlineSubtaskText[todo.id] || ''}
                          onChange={(e) =>
                            setInlineSubtaskText((prev) => ({ ...prev, [todo.id]: e.target.value }))
                          }
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              e.preventDefault();
                              handleAddInlineSubtask(todo.id);
                            }
                          }}
                          style={{ padding: '4px 8px', fontSize: '0.8rem' }}
                        />
                        <button
                          type="button"
                          className="btn btn-secondary btn-sm"
                          onClick={() => handleAddInlineSubtask(todo.id)}
                          style={{ fontSize: '0.75rem', padding: '4px 8px' }}
                        >
                          Add
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      )}

      {/* VIEW MODE 2: KANBAN BOARD VIEW */}
      {viewMode === 'kanban' && (
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
            gap: '18px',
            alignItems: 'flex-start',
          }}
        >
          {/* Column 1: To Do */}
          <div style={{ background: '#F1F5F9', borderRadius: 'var(--radius-lg)', padding: '16px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Circle size={14} color="var(--text-muted)" />
                <h3 style={{ fontSize: '0.95rem', fontWeight: 700 }}>To Do</h3>
              </div>
              <span style={{ background: '#FFFFFF', padding: '2px 8px', borderRadius: 10, fontSize: '0.75rem', fontWeight: 700 }}>
                {filteredTodos.filter((t) => t.status === 'pending').length}
              </span>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {filteredTodos
                .filter((t) => t.status === 'pending')
                .map((todo) => (
                  <div key={todo.id} className="card" style={{ padding: '14px' }}>
                    <div style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--primary-600)', marginBottom: '4px' }}>
                      {todo.subjects?.subject_code || todo.category}
                    </div>
                    <div style={{ fontSize: '0.9rem', fontWeight: 600, marginBottom: '8px' }}>
                      {todo.title}
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                        {todo.due_date ? `Due: ${todo.due_date}` : 'No deadline'}
                      </span>
                      <button
                        type="button"
                        className="btn btn-secondary btn-sm"
                        onClick={() => handleChangeStatus(todo.id, 'in_progress')}
                        style={{ fontSize: '0.725rem', padding: '3px 8px' }}
                      >
                        <span>Start</span>
                        <ArrowRight size={12} />
                      </button>
                    </div>
                  </div>
                ))}
            </div>
          </div>

          {/* Column 2: In Progress */}
          <div style={{ background: '#EEF2FF', borderRadius: 'var(--radius-lg)', padding: '16px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Clock size={14} color="var(--primary-600)" />
                <h3 style={{ fontSize: '0.95rem', fontWeight: 700, color: 'var(--primary-800)' }}>
                  In Progress
                </h3>
              </div>
              <span style={{ background: '#FFFFFF', padding: '2px 8px', borderRadius: 10, fontSize: '0.75rem', fontWeight: 700, color: 'var(--primary-700)' }}>
                {filteredTodos.filter((t) => t.status === 'in_progress').length}
              </span>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {filteredTodos
                .filter((t) => t.status === 'in_progress')
                .map((todo) => (
                  <div key={todo.id} className="card" style={{ padding: '14px', borderLeft: '3px solid var(--primary-600)' }}>
                    <div style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--primary-600)', marginBottom: '4px' }}>
                      {todo.subjects?.subject_code || todo.category}
                    </div>
                    <div style={{ fontSize: '0.9rem', fontWeight: 600, marginBottom: '8px' }}>
                      {todo.title}
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <button
                        type="button"
                        onClick={() => {
                          setActiveTimerTask(todo);
                          setIsTimerOpen(true);
                        }}
                        style={{
                          background: '#FEF2F2',
                          color: '#DC2626',
                          border: '1px solid #FECACA',
                          padding: '2px 6px',
                          borderRadius: 4,
                          fontSize: '0.7rem',
                          fontWeight: 700,
                          display: 'flex',
                          alignItems: 'center',
                          gap: '3px',
                          cursor: 'pointer',
                        }}
                      >
                        <Flame size={12} />
                        <span>Focus</span>
                      </button>

                      <button
                        type="button"
                        className="btn btn-primary btn-sm"
                        onClick={() => handleChangeStatus(todo.id, 'completed')}
                        style={{ fontSize: '0.725rem', padding: '3px 8px' }}
                      >
                        <CheckCircle2 size={12} />
                        <span>Done</span>
                      </button>
                    </div>
                  </div>
                ))}
            </div>
          </div>

          {/* Column 3: Completed */}
          <div style={{ background: '#F0FDF4', borderRadius: 'var(--radius-lg)', padding: '16px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <CheckCircle2 size={14} color="var(--success-main)" />
                <h3 style={{ fontSize: '0.95rem', fontWeight: 700, color: '#166534' }}>
                  Completed
                </h3>
              </div>
              <span style={{ background: '#FFFFFF', padding: '2px 8px', borderRadius: 10, fontSize: '0.75rem', fontWeight: 700, color: 'var(--success-main)' }}>
                {filteredTodos.filter((t) => t.status === 'completed').length}
              </span>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {filteredTodos
                .filter((t) => t.status === 'completed')
                .map((todo) => (
                  <div key={todo.id} className="card" style={{ padding: '14px', opacity: 0.8, background: '#F8FAFC' }}>
                    <div style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)' }}>
                      {todo.subjects?.subject_code || todo.category}
                    </div>
                    <div style={{ fontSize: '0.875rem', fontWeight: 600, textDecoration: 'line-through', color: 'var(--text-muted)', margin: '4px 0' }}>
                      {todo.title}
                    </div>
                    <button
                      type="button"
                      onClick={() => handleChangeStatus(todo.id, 'pending')}
                      style={{ color: 'var(--text-subtle)', fontSize: '0.7rem', cursor: 'pointer', background: 'none' }}
                    >
                      ↩ Reopen
                    </button>
                  </div>
                ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
