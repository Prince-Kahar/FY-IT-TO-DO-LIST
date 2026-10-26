import React, { useState, useEffect } from 'react';
import {
  Search,
  Filter,
  Calendar,
  Clock,
  CheckCircle2,
  AlertCircle,
  UploadCloud,
  Eye,
  Play,
  RotateCcw,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { dataService } from '../../lib/dataService';
import { StatusBadge, PriorityBadge } from '../../components/StatusBadge';
import { SubmitWorkModal } from '../../components/SubmitWorkModal';
import { PhotoViewerModal } from '../../components/PhotoViewerModal';

export const StudentTasks = () => {
  const { user } = useAuth();
  const { addToast } = useToast();

  const [assignments, setAssignments] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [subjectFilter, setSubjectFilter] = useState('ALL');
  const [priorityFilter, setPriorityFilter] = useState('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState('DUE_ASC');

  // Modals
  const [activeSubmitModal, setActiveSubmitModal] = useState(null);
  const [lightboxPhotos, setLightboxPhotos] = useState(null);

  const loadTasks = async () => {
    if (!user) return;
    setLoading(true);
    try {
      const [asgData, subData] = await Promise.all([
        dataService.getStudentAssignments(user.id),
        dataService.getSubjects(),
      ]);
      setAssignments(asgData);
      setSubjects(subData);
    } catch (err) {
      console.error('Error loading tasks:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadTasks();
  }, [user]);

  const handleStartTask = async (assignmentId) => {
    try {
      await dataService.startTask(assignmentId);
      addToast('Task marked as In Progress!', 'info');
      loadTasks();
    } catch (err) {
      console.error('Error starting task:', err);
    }
  };

  // Filter & Search logic
  const filteredAssignments = assignments.filter((asg) => {
    const task = asg.tasks;
    if (!task) return false;

    // Search query
    if (
      searchQuery &&
      !task.title.toLowerCase().includes(searchQuery.toLowerCase()) &&
      !task.description?.toLowerCase().includes(searchQuery.toLowerCase())
    ) {
      return false;
    }

    // Status filter
    if (statusFilter !== 'ALL') {
      if (statusFilter === 'PENDING' && !['Assigned', 'In Progress'].includes(asg.status)) return false;
      if (statusFilter === 'SUBMITTED' && !['Submitted', 'Under Review'].includes(asg.status)) return false;
      if (statusFilter === 'APPROVED' && asg.status !== 'Approved') return false;
      if (statusFilter === 'NEEDS_CORRECTION' && asg.status !== 'Needs Correction') return false;
      if (statusFilter === 'OVERDUE' && asg.status !== 'Overdue') return false;
    }

    // Subject filter
    if (subjectFilter !== 'ALL' && task.subject_id !== subjectFilter) {
      return false;
    }

    // Priority filter
    if (priorityFilter !== 'ALL' && task.priority !== priorityFilter) {
      return false;
    }

    return true;
  });

  // Sorting
  const sortedAssignments = [...filteredAssignments].sort((a, b) => {
    const dateA = new Date(a.tasks?.due_at || 0);
    const dateB = new Date(b.tasks?.due_at || 0);

    if (sortBy === 'DUE_ASC') return dateA - dateB;
    if (sortBy === 'DUE_DESC') return dateB - dateA;
    if (sortBy === 'NEWEST') return new Date(b.assigned_at) - new Date(a.assigned_at);
    return 0;
  });

  return (
    <div>
      {/* Header */}
      <div className="page-header">
        <div>
          <h1 className="page-title">My Academic Tasks</h1>
          <p className="page-description">
            Complete daily subject practicals, notes, and assignments. Upload photo proofs for faculty review.
          </p>
        </div>
      </div>

      {/* Status Filter Tabs */}
      <div
        style={{
          display: 'flex',
          overflowX: 'auto',
          gap: '8px',
          paddingBottom: '8px',
          marginBottom: '16px',
        }}
      >
        {[
          { key: 'ALL', label: 'All Tasks', count: assignments.length },
          {
            key: 'PENDING',
            label: 'To Do / In Progress',
            count: assignments.filter((a) => ['Assigned', 'In Progress'].includes(a.status)).length,
          },
          {
            key: 'SUBMITTED',
            label: 'Submitted',
            count: assignments.filter((a) => ['Submitted', 'Under Review'].includes(a.status)).length,
          },
          {
            key: 'APPROVED',
            label: 'Approved',
            count: assignments.filter((a) => a.status === 'Approved').length,
          },
          {
            key: 'NEEDS_CORRECTION',
            label: 'Needs Correction',
            count: assignments.filter((a) => a.status === 'Needs Correction').length,
          },
          {
            key: 'OVERDUE',
            label: 'Overdue',
            count: assignments.filter((a) => a.status === 'Overdue').length,
          },
        ].map((tab) => (
          <button
            key={tab.key}
            type="button"
            className="btn btn-sm"
            onClick={() => setStatusFilter(tab.key)}
            style={{
              background: statusFilter === tab.key ? 'var(--primary-600)' : '#FFFFFF',
              color: statusFilter === tab.key ? '#FFFFFF' : 'var(--text-muted)',
              border: `1px solid ${statusFilter === tab.key ? 'var(--primary-600)' : 'var(--border-light)'}`,
              borderRadius: 'var(--radius-full)',
              padding: '6px 14px',
              fontWeight: 600,
            }}
          >
            <span>{tab.label}</span>
            <span
              style={{
                background: statusFilter === tab.key ? 'rgba(255,255,255,0.25)' : 'var(--bg-subtle)',
                color: statusFilter === tab.key ? '#FFFFFF' : 'var(--text-muted)',
                padding: '1px 6px',
                borderRadius: '10px',
                fontSize: '0.7rem',
                marginLeft: '4px',
              }}
            >
              {tab.count}
            </span>
          </button>
        ))}
      </div>

      {/* Search & Filter Controls Bar */}
      <div className="filters-bar">
        <div className="search-input-box">
          <Search size={18} color="var(--text-muted)" />
          <input
            type="text"
            placeholder="Search tasks by title, code or instructions..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>

        {/* Subject dropdown */}
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

        {/* Priority dropdown */}
        <select
          className="form-control"
          style={{ width: 'auto' }}
          value={priorityFilter}
          onChange={(e) => setPriorityFilter(e.target.value)}
        >
          <option value="ALL">All Priorities</option>
          <option value="High">High Priority</option>
          <option value="Medium">Medium Priority</option>
          <option value="Low">Low Priority</option>
        </select>

        {/* Sort By dropdown */}
        <select
          className="form-control"
          style={{ width: 'auto' }}
          value={sortBy}
          onChange={(e) => setSortBy(e.target.value)}
        >
          <option value="DUE_ASC">Due: Earliest First</option>
          <option value="DUE_DESC">Due: Latest First</option>
          <option value="NEWEST">Newest Assigned</option>
        </select>
      </div>

      {/* Task Cards List */}
      {sortedAssignments.length === 0 ? (
        <div className="card empty-state">
          <div className="empty-state-icon">
            <CheckCircle2 size={28} />
          </div>
          <h3 className="empty-state-title">No tasks found</h3>
          <p className="empty-state-desc">
            No academic tasks match your current filter settings or search query.
          </p>
          {(statusFilter !== 'ALL' || subjectFilter !== 'ALL' || searchQuery) && (
            <button
              type="button"
              className="btn btn-secondary btn-sm"
              onClick={() => {
                setStatusFilter('ALL');
                setSubjectFilter('ALL');
                setPriorityFilter('ALL');
                setSearchQuery('');
              }}
            >
              Reset Filters
            </button>
          )}
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {sortedAssignments.map((asg) => {
            const task = asg.tasks;
            const latestSubmission = asg.submissions?.[asg.submissions.length - 1];
            const isDuePassed = new Date(task.due_at) < new Date();

            return (
              <div
                key={asg.id}
                className="card"
                style={{
                  borderLeft: `4px solid ${
                    asg.status === 'Approved'
                      ? 'var(--success-main)'
                      : asg.status === 'Overdue'
                      ? 'var(--danger-main)'
                      : asg.status === 'Needs Correction'
                      ? 'var(--warning-main)'
                      : 'var(--primary-600)'
                  }`,
                }}
              >
                <div
                  style={{
                    display: 'flex',
                    flexWrap: 'wrap',
                    alignItems: 'flex-start',
                    justifyContent: 'space-between',
                    gap: '12px',
                    marginBottom: '12px',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                    <span
                      style={{
                        background: 'var(--primary-50)',
                        color: 'var(--primary-700)',
                        fontSize: '0.75rem',
                        fontWeight: 700,
                        padding: '3px 8px',
                        borderRadius: 4,
                      }}
                    >
                      {task.subjects?.subject_code || 'IT'} • {task.subjects?.name}
                    </span>

                    {task.topics && (
                      <span
                        style={{
                          background: 'var(--bg-subtle)',
                          color: 'var(--text-muted)',
                          fontSize: '0.75rem',
                          fontWeight: 500,
                          padding: '3px 8px',
                          borderRadius: 4,
                        }}
                      >
                        Topic: {task.topics.name}
                      </span>
                    )}

                    <span
                      style={{
                        background: '#F0FDFA',
                        color: 'var(--teal-700)',
                        fontSize: '0.75rem',
                        fontWeight: 600,
                        padding: '3px 8px',
                        borderRadius: 4,
                      }}
                    >
                      {task.task_type}
                    </span>

                    <PriorityBadge priority={task.priority} />
                  </div>

                  <StatusBadge status={asg.status} />
                </div>

                {/* Title & Instructions */}
                <h3 style={{ fontSize: '1.15rem', fontWeight: 700, marginBottom: '6px' }}>
                  {task.title}
                </h3>
                <p
                  style={{
                    fontSize: '0.875rem',
                    color: 'var(--text-muted)',
                    marginBottom: '16px',
                    lineHeight: 1.5,
                  }}
                >
                  {task.description}
                </p>

                {/* Teacher Feedback Alert (if Needs Correction or Approved with feedback) */}
                {latestSubmission?.feedback && (
                  <div
                    style={{
                      background:
                        asg.status === 'Needs Correction' ? '#FFFBEB' : 'var(--success-bg)',
                      border: `1px solid ${
                        asg.status === 'Needs Correction' ? '#FDE68A' : 'var(--success-border)'
                      }`,
                      borderRadius: 'var(--radius-md)',
                      padding: '12px 16px',
                      marginBottom: '16px',
                      fontSize: '0.85rem',
                    }}
                  >
                    <div style={{ fontWeight: 600, color: 'var(--text-main)', marginBottom: '2px' }}>
                      Teacher Feedback {latestSubmission.marks_awarded !== null ? `(${latestSubmission.marks_awarded}/${task.max_marks} Marks)` : ''}:
                    </div>
                    <div style={{ color: 'var(--text-muted)' }}>
                      "{latestSubmission.feedback}"
                    </div>
                  </div>
                )}

                {/* Footer Metadata & Actions */}
                <div
                  style={{
                    display: 'flex',
                    flexWrap: 'wrap',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: '12px',
                    borderTop: '1px solid var(--border-light)',
                    paddingTop: '14px',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '16px', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                    <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <Calendar size={15} />
                      <span>
                        Due: {new Date(task.due_at).toLocaleDateString()} at{' '}
                        {new Date(task.due_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </span>

                    {task.max_marks && (
                      <span style={{ fontWeight: 600, color: 'var(--primary-700)' }}>
                        Max Marks: {task.max_marks}
                      </span>
                    )}
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    {/* If Assigned -> Button to mark In Progress */}
                    {asg.status === 'Assigned' && (
                      <button
                        type="button"
                        className="btn btn-secondary btn-sm"
                        onClick={() => handleStartTask(asg.id)}
                      >
                        <Play size={14} />
                        <span>Start Task</span>
                      </button>
                    )}

                    {/* Submit / Resubmit Work button */}
                    {['Assigned', 'In Progress', 'Overdue'].includes(asg.status) && (
                      <button
                        type="button"
                        className="btn btn-primary btn-sm"
                        onClick={() => setActiveSubmitModal({ assignment: asg, task })}
                      >
                        <UploadCloud size={14} />
                        <span>Submit Work</span>
                      </button>
                    )}

                    {asg.status === 'Needs Correction' && (
                      <button
                        type="button"
                        className="btn btn-warning btn-sm"
                        style={{ background: '#EA580C', color: '#fff' }}
                        onClick={() => setActiveSubmitModal({ assignment: asg, task })}
                      >
                        <RotateCcw size={14} />
                        <span>Resubmit Corrected Work</span>
                      </button>
                    )}

                    {/* View Photos button if already submitted */}
                    {latestSubmission && latestSubmission.submission_files?.length > 0 && (
                      <button
                        type="button"
                        className="btn btn-secondary btn-sm"
                        onClick={() => setLightboxPhotos(latestSubmission.submission_files)}
                      >
                        <Eye size={14} />
                        <span>View Submitted Photos ({latestSubmission.submission_files.length})</span>
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Submit Work Modal */}
      {activeSubmitModal && (
        <SubmitWorkModal
          assignment={activeSubmitModal.assignment}
          task={activeSubmitModal.task}
          onClose={() => setActiveSubmitModal(null)}
          onSuccess={loadTasks}
        />
      )}

      {/* Photo Viewer Lightbox */}
      {lightboxPhotos && (
        <PhotoViewerModal
          photos={lightboxPhotos}
          onClose={() => setLightboxPhotos(null)}
        />
      )}
    </div>
  );
};
