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
  Users,
  AlertTriangle,
} from 'lucide-react';
import { dataService } from '../../lib/dataService';
import { useToast } from '../../context/ToastContext';
import { PriorityBadge } from '../../components/StatusBadge';
import { TaskModal } from '../../components/TaskModal';

export const AdminTasks = () => {
  const { addToast } = useToast();

  const [tasks, setTasks] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [subjectFilter, setSubjectFilter] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [typeFilter, setTypeFilter] = useState('ALL');

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

    // 1. Continuous Live Polling from Supabase
    const pollInterval = setInterval(() => {
      loadTasksData(true);
    }, 12000);

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
    if (statusFilter !== 'ALL' && t.publication_status !== statusFilter) return false;
    if (typeFilter !== 'ALL' && t.task_type !== typeFilter) return false;

    return true;
  });

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Manage Academic Tasks</h1>
          <p className="page-description">
            Create, publish, edit, and assign subject practicals, journal assignments, and homework to FY B.Sc. IT students.
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

      {/* Filter and Search Bar */}
      <div className="filters-bar">
        <div className="search-input-box">
          <Search size={18} color="var(--text-muted)" />
          <input
            type="text"
            placeholder="Search tasks by title, keywords..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>

        <select
          className="form-control"
          style={{ width: 'auto', minWidth: '160px' }}
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

        <select
          className="form-control"
          style={{ width: 'auto' }}
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
        >
          <option value="ALL">All Statuses</option>
          <option value="Published">Published</option>
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
                            : t.publication_status === 'Draft'
                            ? 'var(--warning-bg)'
                            : 'var(--bg-subtle)',
                        color:
                          t.publication_status === 'Published'
                            ? 'var(--success-text)'
                            : t.publication_status === 'Draft'
                            ? 'var(--warning-text)'
                            : 'var(--text-muted)',
                        padding: '3px 8px',
                        borderRadius: 'var(--radius-full)',
                        fontSize: '0.75rem',
                        fontWeight: 600,
                      }}
                    >
                      {t.publication_status}
                    </span>
                  </td>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
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
          subjects={subjects}
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
    </div>
  );
};
