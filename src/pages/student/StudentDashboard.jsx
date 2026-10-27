import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  CheckCircle2,
  Clock,
  AlertCircle,
  FileCheck,
  BookOpen,
  Calendar,
  ArrowRight,
  TrendingUp,
  Megaphone,
  UploadCloud,
  CheckSquare,
  ListTodo,
  Flame,
  Circle,
  Plus,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { dataService } from '../../lib/dataService';
import { StatusBadge, PriorityBadge } from '../../components/StatusBadge';
import { SubmitWorkModal } from '../../components/SubmitWorkModal';

export const StudentDashboard = () => {
  const { user, profile } = useAuth();
  const { addToast, triggerConfetti } = useToast();

  const [assignments, setAssignments] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [announcements, setAnnouncements] = useState([]);
  const [todos, setTodos] = useState([]);
  const [quickTodoTitle, setQuickTodoTitle] = useState('');
  const [loading, setLoading] = useState(true);

  // Modal state
  const [activeSubmitModal, setActiveSubmitModal] = useState(null);

  const loadData = async (isBackground = false) => {
    if (!user) return;
    if (!isBackground) setLoading(true);
    try {
      const [asgData, subData, annData, todoData] = await Promise.all([
        dataService.getStudentAssignments(user.id),
        dataService.getSubjects(),
        dataService.getAnnouncements(),
        dataService.getTodos(user.id),
      ]);
      setAssignments(asgData);
      setSubjects(subData);
      setAnnouncements(annData);
      setTodos(todoData);
    } catch (err) {
      console.error('Error loading student dashboard data:', err);
    } finally {
      if (!isBackground) setLoading(false);
    }
  };

  useEffect(() => {
    loadData();

    // 1. Continuous Live Polling every 12 seconds from Supabase
    const pollInterval = setInterval(() => {
      loadData(true);
    }, 12000);

    // 2. Auto refetch on focus / visibility change
    const handleFocus = () => loadData(true);
    window.addEventListener('focus', handleFocus);
    document.addEventListener('visibilitychange', handleFocus);

    // 3. Supabase Realtime subscription
    const unsubscribe = dataService.subscribeRealtime(() => {
      loadData(true);
    });

    return () => {
      clearInterval(pollInterval);
      window.removeEventListener('focus', handleFocus);
      document.removeEventListener('visibilitychange', handleFocus);
      if (unsubscribe) unsubscribe();
    };
  }, [user]);

  const handleToggleTodo = async (id, currentStatus) => {
    try {
      const newStatus = currentStatus === 'completed' ? 'pending' : 'completed';
      if (newStatus === 'completed') {
        triggerConfetti();
        addToast('🎯 Task completed! Great job!', 'success');
      }
      await dataService.toggleTodoStatus(id);
      const updatedTodos = await dataService.getTodos(user.id);
      setTodos(updatedTodos);
    } catch (err) {
      console.error('Toggle todo error:', err);
    }
  };

  const handleQuickAddTodo = async (e) => {
    e.preventDefault();
    if (!quickTodoTitle.trim()) return;

    try {
      await dataService.createTodo({
        user_id: user.id,
        title: quickTodoTitle.trim(),
        priority: 'Medium',
        category: 'Study',
        due_date: new Date().toISOString().slice(0, 10),
      });
      addToast('Task added to today\'s to-do!', 'success');
      setQuickTodoTitle('');
      const updatedTodos = await dataService.getTodos(user.id);
      setTodos(updatedTodos);
    } catch (err) {
      console.error('Quick add error:', err);
    }
  };

  // Compute metrics
  const totalTasks = assignments.length;
  const approvedTasks = assignments.filter((a) => a.status === 'Approved').length;
  const submittedTasks = assignments.filter((a) => ['Submitted', 'Under Review'].includes(a.status)).length;
  const inProgressTasks = assignments.filter((a) => a.status === 'In Progress').length;
  const pendingTasks = assignments.filter((a) => a.status === 'Assigned').length;
  const overdueTasks = assignments.filter((a) => a.status === 'Overdue').length;
  const needsCorrectionTasks = assignments.filter((a) => a.status === 'Needs Correction').length;

  const completionRate = totalTasks > 0 ? Math.round((approvedTasks / totalTasks) * 100) : 0;

  // Upcoming deadlines (next 7 days, not yet submitted/approved)
  const upcomingDeadlines = (assignments || [])
    .filter((a) => a && !['Approved', 'Submitted'].includes(a.status) && a.tasks?.due_at)
    .sort((a, b) => new Date(a.tasks?.due_at) - new Date(b.tasks?.due_at))
    .slice(0, 4);

  // Recently reviewed submissions
  const recentlyReviewed = (assignments || [])
    .filter((a) => a && Array.isArray(a.submissions) && a.submissions.some((s) => s?.reviewed_at))
    .slice(0, 3);

  return (
    <div>
      {/* Welcome Banner */}
      <div className="academic-banner">
        <div>
          <h2 style={{ fontSize: '1.4rem', fontWeight: 700, color: 'var(--text-main)' }}>
            Welcome back, {profile?.full_name || 'Student'}! 👋
          </h2>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem', marginTop: '4px' }}>
            Roll No: <strong>{profile?.roll_number || 'FYIT'}</strong> • Class: {profile?.class_name || 'FY B.Sc. IT'} (Div {profile?.division || 'A'})
          </p>
        </div>

        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
          <Link to="/todos" className="btn btn-teal btn-sm">
            <ListTodo size={16} />
            <span>Daily To-Do List 🔥</span>
          </Link>
          <Link to="/tasks" className="btn btn-primary btn-sm">
            <CheckSquare size={16} />
            <span>Academic Tasks</span>
          </Link>
        </div>
      </div>

      {/* KPI Cards Grid */}
      <div className="metrics-grid">
        <div className="metric-card">
          <div className="metric-icon-box primary">
            <CheckSquare size={24} />
          </div>
          <div>
            <div className="metric-value">{totalTasks}</div>
            <div className="metric-label">Total Assigned</div>
          </div>
        </div>

        <div className="metric-card">
          <div className="metric-icon-box warning">
            <Clock size={24} />
          </div>
          <div>
            <div className="metric-value">{pendingTasks + inProgressTasks}</div>
            <div className="metric-label">Pending / In Progress</div>
          </div>
        </div>

        <div className="metric-card">
          <div className="metric-icon-box primary">
            <FileCheck size={24} />
          </div>
          <div>
            <div className="metric-value">{submittedTasks}</div>
            <div className="metric-label">Submitted Work</div>
          </div>
        </div>

        <div className="metric-card">
          <div className="metric-icon-box success">
            <CheckCircle2 size={24} />
          </div>
          <div>
            <div className="metric-value">{approvedTasks}</div>
            <div className="metric-label">Approved Tasks</div>
          </div>
        </div>

        <div className="metric-card">
          <div className="metric-icon-box danger">
            <AlertCircle size={24} />
          </div>
          <div>
            <div className="metric-value">{overdueTasks}</div>
            <div className="metric-label">Overdue Tasks</div>
          </div>
        </div>
      </div>

      {/* Overall Progress Section */}
      <div className="card" style={{ marginBottom: '24px' }}>
        <div className="card-header">
          <div>
            <h3 className="card-title">Overall Academic Completion</h3>
            <p style={{ fontSize: '0.825rem', color: 'var(--text-muted)' }}>
              Approved submissions vs total assigned curriculum tasks
            </p>
          </div>
          <div
            style={{
              fontFamily: 'var(--font-heading)',
              fontSize: '1.5rem',
              fontWeight: 700,
              color: 'var(--primary-600)',
            }}
          >
            {completionRate}%
          </div>
        </div>

        <div className="progress-container" style={{ height: '12px' }}>
          <div className="progress-fill" style={{ width: `${completionRate}%` }} />
        </div>

        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            fontSize: '0.75rem',
            color: 'var(--text-muted)',
            marginTop: '8px',
          }}
        >
          <span>{approvedTasks} Approved</span>
          <span>{totalTasks - approvedTasks} Remaining</span>
        </div>
      </div>

      {/* Today's Daily To-Do List Widget */}
      <div className="card" style={{ marginBottom: '24px' }}>
        <div className="card-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div
              style={{
                width: 36,
                height: 36,
                borderRadius: 'var(--radius-md)',
                background: 'var(--primary-50)',
                color: 'var(--primary-600)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <ListTodo size={20} />
            </div>
            <div>
              <h3 className="card-title">Today's Study & Practical To-Do List</h3>
              <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                Your personal daily academic action items & checklist
              </p>
            </div>
          </div>

          <Link to="/todos" className="btn btn-secondary btn-sm" style={{ fontSize: '0.775rem' }}>
            <span>Full Planner & Pomodoro</span>
            <ArrowRight size={13} />
          </Link>
        </div>

        {/* Quick Add Bar */}
        <form onSubmit={handleQuickAddTodo} style={{ display: 'flex', gap: '8px', marginBottom: '16px' }}>
          <input
            type="text"
            className="form-control"
            placeholder="+ Quick add a daily task (e.g. Revise C pointer code, draw DBMS diagram)..."
            value={quickTodoTitle}
            onChange={(e) => setQuickTodoTitle(e.target.value)}
            style={{ fontSize: '0.875rem' }}
          />
          <button type="submit" className="btn btn-primary btn-sm" disabled={!quickTodoTitle.trim()}>
            <Plus size={16} />
            <span>Add</span>
          </button>
        </form>

        {/* List of Today's Todos */}
        {todos.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '16px 0', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
            No tasks in your daily to-do list. Add your first task above!
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {todos.slice(0, 4).map((td) => {
              const isDone = td.status === 'completed';
              return (
                <div
                  key={td.id}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '10px 14px',
                    borderRadius: 'var(--radius-md)',
                    background: isDone ? '#F8FAFC' : 'var(--bg-subtle)',
                    border: '1px solid var(--border-light)',
                    opacity: isDone ? 0.7 : 1,
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flex: 1 }}>
                    <button
                      type="button"
                      onClick={() => handleToggleTodo(td.id, td.status)}
                      style={{
                        color: isDone ? 'var(--success-main)' : 'var(--border-strong)',
                        cursor: 'pointer',
                        display: 'flex',
                      }}
                      title={isDone ? 'Mark Pending' : 'Mark Done'}
                    >
                      {isDone ? <CheckCircle2 size={19} fill="#DCFCE7" /> : <Circle size={19} />}
                    </button>
                    <div>
                      <div
                        style={{
                          fontSize: '0.875rem',
                          fontWeight: 600,
                          textDecoration: isDone ? 'line-through' : 'none',
                          color: isDone ? 'var(--text-muted)' : 'var(--text-main)',
                        }}
                      >
                        {td.title}
                      </div>
                      <div style={{ display: 'flex', gap: '6px', fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: '2px' }}>
                        {td.subjects && (
                          <span style={{ color: 'var(--primary-700)', fontWeight: 600 }}>
                            {td.subjects.subject_code || td.subjects.name}
                          </span>
                        )}
                        <span>• {td.category || 'Study'}</span>
                        {td.priority === 'High' && <span style={{ color: 'var(--danger-main)', fontWeight: 700 }}>• 🔥 High</span>}
                      </div>
                    </div>
                  </div>

                  <span
                    style={{
                      fontSize: '0.7rem',
                      fontWeight: 600,
                      padding: '2px 8px',
                      borderRadius: 4,
                      background: isDone ? 'var(--success-bg)' : '#FEF3C7',
                      color: isDone ? 'var(--success-text)' : '#B45309',
                    }}
                  >
                    {isDone ? 'Completed' : 'To Do'}
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Grid: Upcoming Deadlines & Class Announcements */}
      <div className="dashboard-grid-2">
        {/* Upcoming Deadlines */}
        <div className="card">
          <div className="card-header">
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Calendar size={18} color="var(--primary-600)" />
              <h3 className="card-title">Upcoming Deadlines</h3>
            </div>
            <Link to="/tasks" style={{ fontSize: '0.8rem', fontWeight: 600 }}>
              View All
            </Link>
          </div>

          {upcomingDeadlines.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '24px 0', color: 'var(--text-muted)' }}>
              <CheckCircle2 size={32} color="var(--success-main)" style={{ margin: '0 auto 8px' }} />
              <p style={{ fontSize: '0.9rem', fontWeight: 500 }}>No upcoming deadlines!</p>
              <p style={{ fontSize: '0.8rem' }}>You are completely caught up with your academic tasks.</p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {upcomingDeadlines.map((asg) => (
                <div
                  key={asg.id}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '12px 14px',
                    borderRadius: 'var(--radius-md)',
                    border: '1px solid var(--border-light)',
                    background: '#FFFFFF',
                  }}
                >
                  <div style={{ minWidth: 0, flex: 1, marginRight: '12px' }}>
                    <div style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--primary-600)' }}>
                      {asg.tasks?.subjects?.name || 'Subject'}
                    </div>
                    <div
                      style={{
                        fontSize: '0.9rem',
                        fontWeight: 600,
                        color: 'var(--text-main)',
                        whiteSpace: 'nowrap',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                      }}
                    >
                      {asg.tasks?.title}
                    </div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '2px' }}>
                      Due: {new Date(asg.tasks.due_at).toLocaleDateString()} at{' '}
                      {new Date(asg.tasks.due_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </div>
                  </div>

                  <button
                    type="button"
                    className="btn btn-primary btn-sm"
                    onClick={() => setActiveSubmitModal({ assignment: asg, task: asg.tasks })}
                  >
                    <UploadCloud size={14} />
                    <span>Submit</span>
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Latest Announcements */}
        <div className="card">
          <div className="card-header">
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Megaphone size={18} color="var(--teal-600)" />
              <h3 className="card-title">Class Announcements</h3>
            </div>
          </div>

          {announcements.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '24px 0', color: 'var(--text-muted)' }}>
              <p style={{ fontSize: '0.85rem' }}>No announcements posted yet.</p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {announcements.slice(0, 3).map((ann) => (
                <div
                  key={ann.id}
                  style={{
                    padding: '12px 14px',
                    borderRadius: 'var(--radius-md)',
                    background: 'var(--bg-subtle)',
                    borderLeft: '3px solid var(--teal-600)',
                  }}
                >
                  <div style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--text-main)' }}>
                    {ann.title}
                  </div>
                  <p
                    style={{
                      fontSize: '0.8rem',
                      color: 'var(--text-muted)',
                      marginTop: '4px',
                      lineHeight: 1.4,
                    }}
                  >
                    {ann.message}
                  </p>
                  <div style={{ fontSize: '0.7rem', color: 'var(--text-subtle)', marginTop: '6px' }}>
                    {new Date(ann.published_at).toLocaleDateString()}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Subject-Wise Progress Grid */}
      <div className="card">
        <div className="card-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <BookOpen size={18} color="var(--primary-600)" />
            <h3 className="card-title">Subject-Wise Completion</h3>
          </div>
          <Link to="/subjects" style={{ fontSize: '0.8rem', fontWeight: 600 }}>
            View Curriculum
          </Link>
        </div>

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))',
            gap: '16px',
          }}
        >
          {subjects.map((sub) => {
            const subjectAssignments = assignments.filter(
              (a) => a.tasks?.subject_id === sub.id
            );
            const subTotal = subjectAssignments.length;
            const subApproved = subjectAssignments.filter((a) => a.status === 'Approved').length;
            const pct = subTotal > 0 ? Math.round((subApproved / subTotal) * 100) : 0;

            return (
              <div
                key={sub.id}
                style={{
                  border: '1px solid var(--border-light)',
                  borderRadius: 'var(--radius-md)',
                  padding: '16px',
                  background: '#FFFFFF',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div>
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
                      {sub.subject_code || 'IT'}
                    </span>
                    <h4 style={{ fontSize: '0.95rem', fontWeight: 600, marginTop: '6px' }}>
                      {sub.name}
                    </h4>
                  </div>
                  <span style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--primary-600)' }}>
                    {pct}%
                  </span>
                </div>

                <div style={{ marginTop: '12px' }}>
                  <div className="progress-container">
                    <div className="progress-fill" style={{ width: `${pct}%` }} />
                  </div>
                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      fontSize: '0.75rem',
                      color: 'var(--text-muted)',
                      marginTop: '6px',
                    }}
                  >
                    <span>{subApproved} of {subTotal} completed</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Submit Work Modal */}
      {activeSubmitModal && (
        <SubmitWorkModal
          assignment={activeSubmitModal.assignment}
          task={activeSubmitModal.task}
          onClose={() => setActiveSubmitModal(null)}
          onSuccess={loadData}
        />
      )}
    </div>
  );
};
