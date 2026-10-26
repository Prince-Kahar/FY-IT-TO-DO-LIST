import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  Users,
  CheckSquare,
  FileCheck,
  Clock,
  CheckCircle2,
  AlertCircle,
  Plus,
  BookOpen,
  Megaphone,
  TrendingUp,
  Download,
  Eye,
  AlertTriangle,
} from 'lucide-react';
import { dataService } from '../../lib/dataService';
import { StatusBadge } from '../../components/StatusBadge';
import { ReviewModal } from '../../components/ReviewModal';
import { TaskModal } from '../../components/TaskModal';
import { SubjectModal } from '../../components/SubjectModal';
import { AnnouncementModal } from '../../components/AnnouncementModal';

export const AdminDashboard = () => {
  const [students, setStudents] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [submissions, setSubmissions] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [announcements, setAnnouncements] = useState([]);
  const [loading, setLoading] = useState(true);

  // Modals
  const [reviewModalSub, setReviewModalSub] = useState(null);
  const [isTaskModalOpen, setIsTaskModalOpen] = useState(false);
  const [isSubjectModalOpen, setIsSubjectModalOpen] = useState(false);
  const [isAnnModalOpen, setIsAnnModalOpen] = useState(false);

  const loadAdminData = async () => {
    setLoading(true);
    try {
      const [stList, tList, subList, sbList, anList] = await Promise.all([
        dataService.getStudents(),
        dataService.getTasks(),
        dataService.getAllSubmissions(),
        dataService.getSubjects(),
        dataService.getAnnouncements(),
      ]);
      setStudents(stList);
      setTasks(tList);
      setSubmissions(subList);
      setSubjects(sbList);
      setAnnouncements(anList);
    } catch (err) {
      console.error('Error loading admin dashboard:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAdminData();
  }, []);

  // Compute Admin KPIs with null safety
  const safeStudents = students || [];
  const safeTasks = tasks || [];
  const safeSubmissions = submissions || [];
  const safeSubjects = subjects || [];
  const safeAnnouncements = announcements || [];

  const totalStudents = safeStudents.length;
  const activeStudents = safeStudents.filter((s) => s?.is_active).length;
  const totalPublishedTasks = safeTasks.filter((t) => t?.publication_status === 'Published').length;
  const pendingReviewSubmissions = safeSubmissions.filter((s) => ['Submitted', 'Under Review'].includes(s?.status));
  const approvedSubmissions = safeSubmissions.filter((s) => s?.status === 'Approved').length;
  const lateSubmissions = safeSubmissions.filter((s) => s?.task_assignments?.is_late).length;

  // Calculate overall class completion percentage
  const totalPossibleSubmissions = totalStudents * totalPublishedTasks;
  const classCompletionPct =
    totalPossibleSubmissions > 0
      ? Math.round((approvedSubmissions / totalPossibleSubmissions) * 100)
      : 0;

  return (
    <div>
      {/* Top Banner & Quick Action Buttons */}
      <div className="academic-banner">
        <div>
          <h2 style={{ fontSize: '1.4rem', fontWeight: 700, color: 'var(--text-main)' }}>
            Class Head & Administration Dashboard 🎓
          </h2>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem', marginTop: '4px' }}>
            FY B.Sc. Information Technology • Academic Task Administration & Review Portal
          </p>
        </div>

        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
          <button
            type="button"
            className="btn btn-primary btn-sm"
            onClick={() => setIsTaskModalOpen(true)}
          >
            <Plus size={16} />
            <span>Create Task</span>
          </button>

          <button
            type="button"
            className="btn btn-secondary btn-sm"
            onClick={() => setIsSubjectModalOpen(true)}
          >
            <BookOpen size={16} />
            <span>Add Subject</span>
          </button>

          <button
            type="button"
            className="btn btn-teal btn-sm"
            onClick={() => setIsAnnModalOpen(true)}
          >
            <Megaphone size={16} />
            <span>Post Notice</span>
          </button>
        </div>
      </div>

      {/* KPI Metrics Grid */}
      <div className="metrics-grid">
        <div className="metric-card">
          <div className="metric-icon-box primary">
            <Users size={24} />
          </div>
          <div>
            <div className="metric-value">{totalStudents}</div>
            <div className="metric-label">{activeStudents} Active Students</div>
          </div>
        </div>

        <div className="metric-card">
          <div className="metric-icon-box teal">
            <CheckSquare size={24} />
          </div>
          <div>
            <div className="metric-value">{totalPublishedTasks}</div>
            <div className="metric-label">Published Tasks</div>
          </div>
        </div>

        <div className="metric-card">
          <div className="metric-icon-box warning">
            <Clock size={24} />
          </div>
          <div>
            <div className="metric-value">{pendingReviewSubmissions.length}</div>
            <div className="metric-label">Awaiting Review</div>
          </div>
        </div>

        <div className="metric-card">
          <div className="metric-icon-box success">
            <CheckCircle2 size={24} />
          </div>
          <div>
            <div className="metric-value">{approvedSubmissions}</div>
            <div className="metric-label">Approved Submissions</div>
          </div>
        </div>

        <div className="metric-card">
          <div className="metric-icon-box danger">
            <AlertTriangle size={24} />
          </div>
          <div>
            <div className="metric-value">{lateSubmissions}</div>
            <div className="metric-label">Late Submissions</div>
          </div>
        </div>
      </div>

      {/* Submissions Awaiting Review Table */}
      <div className="card" style={{ marginBottom: '28px' }}>
        <div className="card-header">
          <div>
            <h3 className="card-title">Submissions Awaiting Faculty Review</h3>
            <p style={{ fontSize: '0.825rem', color: 'var(--text-muted)' }}>
              Inspect student handwritten notes, practical outputs, and provide marks & feedback
            </p>
          </div>
          <Link to="/admin/submissions" style={{ fontSize: '0.825rem', fontWeight: 600 }}>
            View All Submissions ({submissions.length})
          </Link>
        </div>

        {pendingReviewSubmissions.length === 0 ? (
          <div className="empty-state" style={{ padding: '32px 16px' }}>
            <CheckCircle2 size={36} color="var(--success-main)" style={{ margin: '0 auto 8px' }} />
            <h4 style={{ fontWeight: 600 }}>All Submissions Reviewed!</h4>
            <p style={{ fontSize: '0.85rem' }}>No student submissions are currently awaiting grading.</p>
          </div>
        ) : (
          <div className="table-container">
            <table className="table">
              <thead>
                <tr>
                  <th>Student</th>
                  <th>Roll Number</th>
                  <th>Task</th>
                  <th>Submitted At</th>
                  <th>Photos</th>
                  <th>Status</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {pendingReviewSubmissions.slice(0, 6).map((sub) => {
                  const student = sub.profiles;
                  const asg = Array.isArray(sub.task_assignments) ? sub.task_assignments[0] : sub.task_assignments;
                  const task = asg?.tasks;
                  const isLate = asg?.is_late;
                  const files = sub.submission_files || sub.files || [];

                  return (
                    <tr key={sub.id}>
                      <td>
                        <strong>{student?.full_name || 'Student'}</strong>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                          Div {student?.division || 'A'}
                        </div>
                      </td>
                      <td>
                        <span style={{ fontWeight: 600, color: 'var(--primary-700)' }}>
                          {student?.roll_number || 'N/A'}
                        </span>
                      </td>
                      <td>
                        <div style={{ fontWeight: 600, color: 'var(--text-main)' }}>
                          {task?.title || 'Academic Task'}
                        </div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                          {task?.subjects?.name || 'Subject'}
                        </div>
                      </td>
                      <td>
                        <div>{new Date(sub.submitted_at).toLocaleDateString()}</div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                          {new Date(sub.submitted_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </div>
                        {isLate && (
                          <span
                            style={{
                              background: 'var(--danger-bg)',
                              color: 'var(--danger-text)',
                              fontSize: '0.675rem',
                              fontWeight: 700,
                              padding: '1px 5px',
                              borderRadius: 3,
                            }}
                          >
                            Late
                          </span>
                        )}
                      </td>
                      <td>
                        <span
                          style={{
                            background: 'var(--primary-50)',
                            color: 'var(--primary-700)',
                            fontWeight: 600,
                            padding: '2px 8px',
                            borderRadius: 4,
                            fontSize: '0.75rem',
                          }}
                        >
                          {files.length} {files.length === 1 ? 'photo' : 'photos'}
                        </span>
                      </td>
                      <td>
                        <StatusBadge status={sub.status} />
                      </td>
                      <td>
                        <button
                          type="button"
                          className="btn btn-primary btn-sm"
                          onClick={() => setReviewModalSub(sub)}
                        >
                          <Eye size={14} />
                          <span>Review & Grade</span>
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Grid: Subject Completion Overview & Active Announcements */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))', gap: '24px' }}>
        {/* Subject Overview */}
        <div className="card">
          <div className="card-header">
            <h3 className="card-title">Subject Curriculum & Tasks</h3>
            <Link to="/admin/subjects" style={{ fontSize: '0.8rem', fontWeight: 600 }}>
              Manage Subjects
            </Link>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {(subjects || []).map((sub) => {
              const subTasks = (tasks || []).filter((t) => t?.subject_id === sub.id);
              const topics = sub.topics || [];

              return (
                <div
                  key={sub.id}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '12px 14px',
                    borderRadius: 'var(--radius-md)',
                    border: '1px solid var(--border-light)',
                  }}
                >
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
                    <div style={{ fontSize: '0.9rem', fontWeight: 600, color: 'var(--text-main)', marginTop: '2px' }}>
                      {sub.name}
                    </div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                      Faculty: {sub.teacher_name || 'N/A'} • {topics.length} Topics
                    </div>
                  </div>

                  <span
                    style={{
                      background: 'var(--bg-subtle)',
                      padding: '4px 10px',
                      borderRadius: 'var(--radius-full)',
                      fontSize: '0.75rem',
                      fontWeight: 600,
                    }}
                  >
                    {subTasks.length} {subTasks.length === 1 ? 'task' : 'tasks'}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Recent Announcements */}
        <div className="card">
          <div className="card-header">
            <h3 className="card-title">Published Class Notices</h3>
            <button
              type="button"
              className="btn btn-secondary btn-sm"
              onClick={() => setIsAnnModalOpen(true)}
            >
              <Plus size={14} />
              <span>New Notice</span>
            </button>
          </div>

          {(!announcements || announcements.length === 0) ? (
            <div style={{ textAlign: 'center', padding: '24px 0', color: 'var(--text-muted)' }}>
              No announcements published yet.
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {(announcements || []).slice(0, 3).map((ann) => (
                <div
                  key={ann.id}
                  style={{
                    padding: '12px 14px',
                    borderRadius: 'var(--radius-md)',
                    background: 'var(--bg-subtle)',
                    borderLeft: '3px solid var(--primary-600)',
                  }}
                >
                  <div style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--text-main)' }}>
                    {ann.title}
                  </div>
                  <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '4px' }}>
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

      {/* Review Modal */}
      {reviewModalSub && (
        <ReviewModal
          submission={reviewModalSub}
          onClose={() => setReviewModalSub(null)}
          onSuccess={loadAdminData}
        />
      )}

      {/* Task Creation Modal */}
      {isTaskModalOpen && (
        <TaskModal
          subjects={subjects}
          onClose={() => setIsTaskModalOpen(false)}
          onSuccess={loadAdminData}
        />
      )}

      {/* Subject Modal */}
      {isSubjectModalOpen && (
        <SubjectModal
          onClose={() => setIsSubjectModalOpen(false)}
          onSuccess={loadAdminData}
        />
      )}

      {/* Announcement Modal */}
      {isAnnModalOpen && (
        <AnnouncementModal
          onClose={() => setIsAnnModalOpen(false)}
          onSuccess={loadAdminData}
        />
      )}
    </div>
  );
};
