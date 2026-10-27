import React, { useState, useEffect } from 'react';
import {
  Plus,
  Search,
  Filter,
  Calendar,
  Clock,
  Edit,
  Trash2,
  CheckCircle2,
  CheckSquare,
  Users,
  AlertTriangle,
  CalendarDays,
  BookOpen,
  X,
} from 'lucide-react';
import { dataService } from '../../lib/dataService';
import { useToast } from '../../context/ToastContext';
import { useAuth } from '../../context/AuthContext';
import { PriorityBadge, StatusBadge } from '../../components/StatusBadge';
import { TaskModal } from '../../components/TaskModal';

export const AdminTasks = () => {
  const { addToast } = useToast();
  const { profile } = useAuth();

  const [tasks, setTasks] = useState(() => dataService.getCachedTasks());
  const [subjects, setSubjects] = useState(() => dataService.getCachedSubjects());
  const [loading, setLoading] = useState(false);

  // Task Student Progress State
  const [progressTask, setProgressTask] = useState(null);
  const [taskProgressList, setTaskProgressList] = useState([]);
  const [loadingProgress, setLoadingProgress] = useState(false);

  const handleOpenProgress = async (task) => {
    setProgressTask(task);
    setLoadingProgress(true);
    try {
      const list = await dataService.getTaskStudentProgress(task.id);
      setTaskProgressList(list);
    } catch (err) {
      console.error('Error fetching task progress:', err);
      addToast('Error fetching student progress.', 'error');
    } finally {
      setLoadingProgress(false);
    }
  };

  const refreshProgress = async (taskId) => {
    try {
      const list = await dataService.getTaskStudentProgress(taskId);
      setTaskProgressList(list);
    } catch (e) {}
  };

  // Determine authorized subjects assigned by Super Admin
  const isAllSubjects =
    !profile?.assigned_subjects ||
    profile.assigned_subjects.includes('ALL') ||
    profile.assigned_subjects.length === 0;

  const effectiveSubjects = isAllSubjects
    ? subjects
    : subjects.filter(
        (s) =>
          profile.assigned_subjects.includes(s.name) ||
          profile.assigned_subjects.includes(s.id)
      );

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [subjectFilter, setSubjectFilter] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [typeFilter, setTypeFilter] = useState('ALL');
  const [dateFilter, setDateFilter] = useState('ALL'); // 'ALL' | 'TODAY' | 'THIS_WEEK' | 'OVERDUE' | 'CUSTOM'
  const [customDate, setCustomDate] = useState('');

  // Modals
  const [isTaskModalOpen, setIsTaskModalOpen] = useState(false);
  const [taskToEdit, setTaskToEdit] = useState(null);
  const [taskToDelete, setTaskToDelete] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const loadTasksData = async (isBackground = false) => {
    if (!isBackground) setLoading(true);
    try {
      const [tList, sList] = await Promise.all([
        dataService.getTasks(),
        dataService.getSubjects(),
      ]);
      setTasks(tList);
      setSubjects(sList);
    } catch (err) {
      console.error('Error loading tasks:', err);
    } finally {
      if (!isBackground) setLoading(false);
    }
  };

  useEffect(() => {
    loadTasksData();

    // 1. Continuous Live Polling from Supabase (every 1 second)
    const pollInterval = setInterval(() => {
      loadTasksData(true);
    }, 1000);

    // 2. Auto refetch on focus / visibility change
    const handleFocus = () => loadTasksData(true);
    window.addEventListener('focus', handleFocus);
    document.addEventListener('visibilitychange', handleFocus);

    // 3. Supabase Realtime subscription
    const unsubscribe = dataService.subscribeRealtime(() => {
      loadTasksData(true);
    });

    return () => {
      clearInterval(pollInterval);
      window.removeEventListener('focus', handleFocus);
      document.removeEventListener('visibilitychange', handleFocus);
      if (unsubscribe) unsubscribe();
    };
  }, []);

  const handleDeleteTask = async () => {
    if (!taskToDelete) return;
    setIsDeleting(true);
    try {
      await dataService.deleteTask(taskToDelete.id);
      addToast(`Task "${taskToDelete.title}" deleted.`, 'info');
      setTaskToDelete(null);
      loadTasksData();
    } catch (err) {
      console.error('Failed to delete task:', err);
      addToast(err.message || 'Error deleting task.', 'error');
    } finally {
      setIsDeleting(false);
    }
  };

  const safeTasks = tasks || [];
  const filteredTasks = safeTasks.filter((t) => {
    if (!t) return false;
    if (
      searchQuery &&
      !t.title?.toLowerCase().includes(searchQuery.toLowerCase()) &&
      !t.description?.toLowerCase().includes(searchQuery.toLowerCase())
    ) {
      return false;
    }

    if (subjectFilter !== 'ALL' && t.subject_id !== subjectFilter) return false;

    // Restrict task visibility if faculty is assigned specific subjects
    if (!isAllSubjects) {
      const isTaskInAssignedSubjects = effectiveSubjects.some(
        (s) => s.id === t.subject_id || s.name === t.subjects?.name
      );
      if (!isTaskInAssignedSubjects) return false;
    }

    if (statusFilter !== 'ALL' && t.publication_status !== statusFilter) return false;
    if (typeFilter !== 'ALL' && t.task_type !== typeFilter) return false;

    // Date-based filtering
    if (dateFilter === 'TODAY') {
      const todayStr = new Date().toISOString().slice(0, 10);
      if (!t.due_at?.startsWith(todayStr)) return false;
    } else if (dateFilter === 'THIS_WEEK') {
      const now = new Date();
      const nextWeek = new Date(now.getTime() + 7 * 86400000);
      const due = new Date(t.due_at);
      if (due < now || due > nextWeek) return false;
    } else if (dateFilter === 'OVERDUE') {
      if (new Date(t.due_at) >= new Date()) return false;
    } else if (dateFilter === 'CUSTOM' && customDate) {
      if (!t.due_at?.startsWith(customDate)) return false;
    }

    return true;
  });

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Manage Academic Tasks</h1>
          <p className="page-description">
            Create, schedule, edit, and assign subject practicals, journal assignments, and homework to FY B.Sc. IT students.
          </p>
        </div>

        <button
          type="button"
          className="btn btn-primary"
          onClick={() => {
            setTaskToEdit(null);
            setIsTaskModalOpen(true);
          }}
        >
          <Plus size={16} />
          <span>Create New Task</span>
        </button>
      </div>

      {/* Allocated Subject Notice if Restricted */}
      {!isAllSubjects && (
        <div
          style={{
            background: 'rgba(99, 102, 241, 0.08)',
            border: '1px solid rgba(99, 102, 241, 0.25)',
            borderRadius: 'var(--radius-md)',
            padding: '10px 16px',
            marginBottom: '16px',
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            fontSize: '0.85rem',
            color: 'var(--primary-800)',
          }}
        >
          <BookOpen size={16} color="var(--primary-600)" />
          <div style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: '6px' }}>
            <strong>Your Teaching Subject Allocation:</strong>
            {profile.assigned_subjects.map((sub, i) => (
              <span
                key={i}
                style={{
                  background: 'var(--primary-100)',
                  color: 'var(--primary-700)',
                  padding: '2px 8px',
                  borderRadius: '4px',
                  fontWeight: 700,
                  fontSize: '0.75rem',
                }}
              >
                {sub}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Filter and Search Bar */}
      <div className="filters-bar" style={{ flexWrap: 'wrap', gap: '10px' }}>
        <div className="search-input-box" style={{ flex: '1 1 240px' }}>
          <Search size={18} color="var(--text-muted)" />
          <input
            type="text"
            placeholder="Search tasks by title, keywords..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>

        {/* Date Filter Dropdown */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <CalendarDays size={16} color="var(--primary-600)" />
          <select
            className="form-control"
            style={{ width: 'auto', minWidth: '150px' }}
            value={dateFilter}
            onChange={(e) => setDateFilter(e.target.value)}
          >
            <option value="ALL">📅 All Due Dates</option>
            <option value="TODAY">🔥 Due Today</option>
            <option value="THIS_WEEK">📆 Due This Week</option>
            <option value="OVERDUE">⚠️ Overdue</option>
            <option value="CUSTOM">🎯 Specific Date...</option>
          </select>
        </div>

        {dateFilter === 'CUSTOM' && (
          <input
            type="date"
            className="form-control"
            style={{ width: 'auto' }}
            value={customDate}
            onChange={(e) => setCustomDate(e.target.value)}
          />
        )}

        <select
          className="form-control"
          style={{ width: 'auto', minWidth: '160px' }}
          value={subjectFilter}
          onChange={(e) => setSubjectFilter(e.target.value)}
        >
          <option value="ALL">{isAllSubjects ? 'All Subjects' : 'All My Subjects'}</option>
          {effectiveSubjects.map((s) => (
            <option key={s.id} value={s.id}>
              {s.name}
            </option>
          ))}
        </select>

        <select
          className="form-control"
          style={{ width: 'auto' }}
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
        >
          <option value="ALL">All Statuses</option>
          <option value="Published">Published</option>
          <option value="Scheduled">Scheduled</option>
          <option value="Draft">Draft</option>
          <option value="Archived">Archived</option>
        </select>

        <select
          className="form-control"
          style={{ width: 'auto' }}
          value={typeFilter}
          onChange={(e) => setTypeFilter(e.target.value)}
        >
          <option value="ALL">All Task Types</option>
          <option value="Assignment">Assignment</option>
          <option value="Practical">Practical</option>
          <option value="Notes">Notes</option>
          <option value="Homework">Homework</option>
          <option value="Project">Project</option>
          <option value="Revision">Revision</option>
        </select>
      </div>

      {/* Tasks Table */}
      {filteredTasks.length === 0 ? (
        <div className="card empty-state">
          <div className="empty-state-icon">
            <CheckSquare size={28} />
          </div>
          <h3 className="empty-state-title">No tasks found</h3>
          <p className="empty-state-desc">
            No academic tasks match your filter criteria. Click "Create New Task" to add one.
          </p>
        </div>
      ) : (
        <div className="table-container">
          <table className="table">
            <thead>
              <tr>
                <th>Task Title</th>
                <th>Subject & Topic</th>
                <th>Type & Priority</th>
                <th>Due Date</th>
                <th>Marks</th>
                <th>Target</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredTasks.map((t) => (
                <tr key={t.id}>
                  <td>
                    <div style={{ fontWeight: 600, color: 'var(--text-main)', maxWidth: '300px' }}>
                      {t.title}
                    </div>
                    {t.description && (
                      <div
                        style={{
                          fontSize: '0.75rem',
                          color: 'var(--text-muted)',
                          maxWidth: '300px',
                          whiteSpace: 'nowrap',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          marginTop: '2px',
                        }}
                      >
                        {t.description}
                      </div>
                    )}
                  </td>
                  <td>
                    <span
                      style={{
                        background: 'var(--primary-50)',
                        color: 'var(--primary-700)',
                        fontSize: '0.75rem',
                        fontWeight: 600,
                        padding: '2px 6px',
                        borderRadius: 4,
                      }}
                    >
                      {t.subjects?.name || 'Subject'}
                    </span>
                    {t.topics && (
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '2px' }}>
                        {t.topics.name}
                      </div>
                    )}
                  </td>
                  <td>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                      <span style={{ fontSize: '0.8rem', fontWeight: 500 }}>{t.task_type}</span>
                      <PriorityBadge priority={t.priority} />
                    </div>
                  </td>
                  <td>
                    <div style={{ fontSize: '0.85rem' }}>
                      {new Date(t.due_at).toLocaleDateString()}
                    </div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                      {new Date(t.due_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </div>
                  </td>
                  <td>
                    <span style={{ fontWeight: 600, color: 'var(--primary-700)' }}>
                      {t.max_marks ? `${t.max_marks} pts` : '—'}
                    </span>
                  </td>
                  <td>
                    <span
                      style={{
                        fontSize: '0.75rem',
                        background: 'var(--bg-subtle)',
                        padding: '2px 8px',
                        borderRadius: 'var(--radius-full)',
                        fontWeight: 500,
                      }}
                    >
                      {t.assignment_target === 'all' ? 'All Students' : 'Selected'}
                    </span>
                  </td>
                  <td>
                    <span
                      style={{
                        background:
                          t.publication_status === 'Published'
                            ? 'var(--success-bg)'
                            : t.publication_status === 'Scheduled'
                            ? '#EEF2FF'
                            : t.publication_status === 'Draft'
                            ? 'var(--warning-bg)'
                            : 'var(--bg-subtle)',
                        color:
                          t.publication_status === 'Published'
                            ? 'var(--success-text)'
                            : t.publication_status === 'Scheduled'
                            ? 'var(--primary-700)'
                            : t.publication_status === 'Draft'
                            ? 'var(--warning-text)'
                            : 'var(--text-muted)',
                        padding: '3px 8px',
                        borderRadius: 'var(--radius-full)',
                        fontSize: '0.75rem',
                        fontWeight: 600,
                        border: t.publication_status === 'Scheduled' ? '1px solid #C7D2FE' : 'none',
                      }}
                    >
                      {t.publication_status === 'Scheduled' ? '⏳ Scheduled' : t.publication_status}
                    </span>
                    {t.publication_status === 'Scheduled' && t.scheduled_at && (
                      <div style={{ fontSize: '0.7rem', color: 'var(--primary-600)', marginTop: '3px', fontWeight: 500 }}>
                        {new Date(t.scheduled_at).toLocaleDateString([], { month: 'short', day: 'numeric' })} at {new Date(t.scheduled_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </div>
                    )}
                  </td>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <button
                        type="button"
                        className="btn btn-secondary btn-sm"
                        onClick={() => handleOpenProgress(t)}
                        title="View Student Progress & Status"
                        style={{ color: 'var(--primary-700)', fontWeight: 600 }}
                      >
                        <Users size={14} />
                        <span>Students</span>
                      </button>
                      <button
                        type="button"
                        className="btn btn-secondary btn-sm"
                        onClick={() => {
                          setTaskToEdit(t);
                          setIsTaskModalOpen(true);
                        }}
                        title="Edit Task"
                      >
                        <Edit size={14} />
                      </button>
                      <button
                        type="button"
                        className="btn btn-secondary btn-sm"
                        style={{ color: 'var(--danger-main)' }}
                        onClick={() => setTaskToDelete(t)}
                        title="Delete Task"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Task Create / Edit Modal */}
      {isTaskModalOpen && (
        <TaskModal
          taskToEdit={taskToEdit}
          subjects={effectiveSubjects}
          onClose={() => {
            setIsTaskModalOpen(false);
            setTaskToEdit(null);
          }}
          onSuccess={loadTasksData}
        />
      )}

      {/* Delete Confirmation Modal */}
      {taskToDelete && (
        <div className="modal-overlay" onClick={() => setTaskToDelete(null)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3 className="modal-title" style={{ color: 'var(--danger-main)' }}>
                Confirm Task Deletion
              </h3>
            </div>
            <div className="modal-body">
              <p style={{ fontSize: '0.925rem', marginBottom: '8px' }}>
                Are you sure you want to delete the task:
              </p>
              <div
                style={{
                  fontWeight: 600,
                  fontSize: '1rem',
                  background: 'var(--bg-subtle)',
                  padding: '10px 14px',
                  borderRadius: 'var(--radius-md)',
                }}
              >
                "{taskToDelete.title}"
              </div>
              <p style={{ fontSize: '0.8rem', color: 'var(--danger-main)', marginTop: '12px' }}>
                ⚠️ This will also remove the corresponding student assignment records.
              </p>
            </div>
            <div className="modal-footer">
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => setTaskToDelete(null)}
                disabled={isDeleting}
              >
                Cancel
              </button>
              <button
                type="button"
                className="btn btn-danger"
                onClick={handleDeleteTask}
                disabled={isDeleting}
              >
                {isDeleting ? 'Deleting...' : 'Delete Task'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Student Progress Modal */}
      {progressTask && (
        <div className="modal-overlay" onClick={() => setProgressTask(null)}>
          <div className="modal-content modal-lg" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '680px' }}>
            <div className="modal-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div style={{ background: 'var(--primary-50)', padding: '8px', borderRadius: '10px', color: 'var(--primary-600)' }}>
                  <Users size={20} />
                </div>
                <div>
                  <h3 className="modal-title">Student Progress: {progressTask.title}</h3>
                  <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', margin: 0 }}>
                    Track which students have started or submitted this task
                  </p>
                </div>
              </div>
              <button
                type="button"
                className="photo-remove-btn"
                onClick={() => setProgressTask(null)}
                style={{ position: 'static' }}
              >
                <X size={16} />
              </button>
            </div>

            <div className="modal-body">
              {/* Quick KPI stats */}
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(4, 1fr)',
                  gap: '10px',
                  marginBottom: '16px',
                }}
              >
                <div style={{ background: 'var(--bg-subtle)', padding: '10px', borderRadius: 'var(--radius-md)', textAlign: 'center' }}>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Total Students</div>
                  <strong style={{ fontSize: '1.2rem', color: 'var(--text-main)' }}>{taskProgressList.length}</strong>
                </div>
                <div style={{ background: '#EFF6FF', padding: '10px', borderRadius: 'var(--radius-md)', textAlign: 'center' }}>
                  <div style={{ fontSize: '0.75rem', color: 'var(--primary-700)' }}>In Progress</div>
                  <strong style={{ fontSize: '1.2rem', color: 'var(--primary-700)' }}>
                    {taskProgressList.filter((p) => p.status === 'In Progress').length}
                  </strong>
                </div>
                <div style={{ background: 'var(--success-bg)', padding: '10px', borderRadius: 'var(--radius-md)', textAlign: 'center' }}>
                  <div style={{ fontSize: '0.75rem', color: 'var(--success-text)' }}>Submitted</div>
                  <strong style={{ fontSize: '1.2rem', color: 'var(--success-text)' }}>
                    {taskProgressList.filter((p) => ['Submitted', 'Under Review', 'Approved'].includes(p.status)).length}
                  </strong>
                </div>
                <div style={{ background: '#FFFBEB', padding: '10px', borderRadius: 'var(--radius-md)', textAlign: 'center' }}>
                  <div style={{ fontSize: '0.75rem', color: '#B45309' }}>Not Started</div>
                  <strong style={{ fontSize: '1.2rem', color: '#B45309' }}>
                    {taskProgressList.filter((p) => p.status === 'Assigned' || p.status === 'Overdue').length}
                  </strong>
                </div>
              </div>

              {loadingProgress ? (
                <div style={{ textAlign: 'center', padding: '30px 0', color: 'var(--text-muted)' }}>
                  Loading student progress...
                </div>
              ) : taskProgressList.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '30px 0', color: 'var(--text-muted)' }}>
                  No students registered yet.
                </div>
              ) : (
                <div className="table-responsive" style={{ maxHeight: '380px', overflowY: 'auto' }}>
                  <table className="data-table">
                    <thead>
                      <tr>
                        <th>Student</th>
                        <th>Roll No</th>
                        <th>Div</th>
                        <th>Status</th>
                        <th>Activity</th>
                      </tr>
                    </thead>
                    <tbody>
                      {taskProgressList.map((item) => (
                        <tr key={item.student.id}>
                          <td>
                            <strong>{item.student.full_name}</strong>
                          </td>
                          <td>
                            <code>{item.student.roll_number}</code>
                          </td>
                          <td>{item.student.division || 'A'}</td>
                          <td>
                            <StatusBadge status={item.status} />
                          </td>
                          <td>
                            {item.status === 'In Progress' && item.started_at ? (
                              <span style={{ fontSize: '0.75rem', color: 'var(--primary-700)', fontWeight: 600 }}>
                                ⏳ Started: {new Date(item.started_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                              </span>
                            ) : item.latestSubmission ? (
                              <span style={{ fontSize: '0.75rem', color: 'var(--success-text)', fontWeight: 600 }}>
                                📤 Submitted: {new Date(item.latestSubmission.submitted_at).toLocaleDateString()}
                              </span>
                            ) : (
                              <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                                Not started yet
                              </span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            <div className="modal-footer">
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => setProgressTask(null)}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
