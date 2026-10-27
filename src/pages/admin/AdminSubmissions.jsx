import React, { useState, useEffect } from 'react';
import {
  Search,
  Filter,
  Eye,
  Calendar,
  CheckCircle2,
  Clock,
  AlertTriangle,
  Download,
  FileCheck,
} from 'lucide-react';
import { dataService } from '../../lib/dataService';
import { StatusBadge } from '../../components/StatusBadge';
import { ReviewModal } from '../../components/ReviewModal';

export const AdminSubmissions = () => {
  const [submissions, setSubmissions] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [subjectFilter, setSubjectFilter] = useState('ALL');
  const [lateFilter, setLateFilter] = useState('ALL');

  // Review Modal
  const [selectedSubmission, setSelectedSubmission] = useState(null);

  const loadSubmissions = async (isBackground = false) => {
    if (!isBackground) setLoading(true);
    try {
      const [subList, sbList] = await Promise.all([
        dataService.getAllSubmissions(),
        dataService.getSubjects(),
      ]);
      setSubmissions(subList);
      setSubjects(sbList);
    } catch (err) {
      console.error('Error loading submissions:', err);
    } finally {
      if (!isBackground) setLoading(false);
    }
  };

  useEffect(() => {
    loadSubmissions();

    // 1. Continuous Live Polling every 1 second for incoming student submissions
    const pollInterval = setInterval(() => {
      loadSubmissions(true);
    }, 1000);

    // 2. Auto refetch on focus / visibility change
    const handleFocus = () => loadSubmissions(true);
    window.addEventListener('focus', handleFocus);
    document.addEventListener('visibilitychange', handleFocus);

    // 3. Supabase Realtime subscription
    const unsubscribe = dataService.subscribeRealtime(() => {
      loadSubmissions(true);
    });

    return () => {
      clearInterval(pollInterval);
      window.removeEventListener('focus', handleFocus);
      document.removeEventListener('visibilitychange', handleFocus);
      if (unsubscribe) unsubscribe();
    };
  }, []);

  // Filter Submissions with null safety
  const safeSubmissions = submissions || [];
  const filteredSubmissions = safeSubmissions.filter((sub) => {
    if (!sub) return false;
    const student = sub.profiles;
    const asg = Array.isArray(sub.task_assignments) ? sub.task_assignments[0] : sub.task_assignments;
    const task = asg?.tasks;

    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      const matchName = student?.full_name?.toLowerCase().includes(q);
      const matchRoll = student?.roll_number?.toLowerCase().includes(q);
      const matchEmail = student?.email?.toLowerCase().includes(q);
      const matchTask = task?.title?.toLowerCase().includes(q);
      if (!matchName && !matchRoll && !matchEmail && !matchTask) return false;
    }

    if (statusFilter !== 'ALL' && sub.status !== statusFilter) return false;
    if (subjectFilter !== 'ALL' && task?.subject_id !== subjectFilter) return false;

    if (lateFilter === 'LATE' && !asg?.is_late) return false;
    if (lateFilter === 'ON_TIME' && asg?.is_late) return false;

    return true;
  });

  // CSV Export utility
  const handleExportCSV = () => {
    if (filteredSubmissions.length === 0) return;

    const headers = [
      'Student Name',
      'Roll Number',
      'Division',
      'Task Title',
      'Subject',
      'Submitted At',
      'Is Late',
      'Status',
      'Marks Awarded',
      'Max Marks',
      'Teacher Feedback',
    ];

    const rows = filteredSubmissions.map((s) => {
      const st = s.profiles;
      const t = s.task_assignments?.tasks;
      return [
        `"${st?.full_name || ''}"`,
        `"${st?.roll_number || ''}"`,
        `"${st?.division || ''}"`,
        `"${t?.title || ''}"`,
        `"${t?.subjects?.name || ''}"`,
        `"${new Date(s.submitted_at).toLocaleString()}"`,
        s.task_assignments?.is_late ? 'YES' : 'NO',
        `"${s.status}"`,
        s.marks_awarded !== null ? s.marks_awarded : '',
        t?.max_marks || '',
        `"${(s.feedback || '').replace(/"/g, '""')}"`,
      ];
    });

    const csvContent =
      'data:text/csv;charset=utf-8,' +
      [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `FY_IT_Submissions_Report_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Review Student Submissions</h1>
          <p className="page-description">
            Inspect handwritten proofs, practical outputs, provide qualitative feedback, and assign grades.
          </p>
        </div>

        <button
          type="button"
          className="btn btn-secondary btn-sm"
          onClick={handleExportCSV}
          disabled={filteredSubmissions.length === 0}
        >
          <Download size={16} />
          <span>Export Filtered to CSV</span>
        </button>
      </div>

      {/* Filter and Search Bar */}
      <div className="filters-bar">
        <div className="search-input-box">
          <Search size={18} color="var(--text-muted)" />
          <input
            type="text"
            placeholder="Search by student name, roll number, or task title..."
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
          <option value="Submitted">Submitted (Needs Review)</option>
          <option value="Approved">Approved</option>
          <option value="Needs Correction">Needs Correction</option>
          <option value="Rejected">Rejected</option>
        </select>

        <select
          className="form-control"
          style={{ width: 'auto' }}
          value={lateFilter}
          onChange={(e) => setLateFilter(e.target.value)}
        >
          <option value="ALL">All Deadlines</option>
          <option value="ON_TIME">On Time Submissions</option>
          <option value="LATE">Late Submissions</option>
        </select>
      </div>

      {/* Submissions Table */}
      {filteredSubmissions.length === 0 ? (
        <div className="card empty-state">
          <div className="empty-state-icon">
            <FileCheck size={28} />
          </div>
          <h3 className="empty-state-title">No submissions found</h3>
          <p className="empty-state-desc">
            No student submissions match your filter settings.
          </p>
        </div>
      ) : (
        <div className="table-container">
          <table className="table">
            <thead>
              <tr>
                <th>Student</th>
                <th>Task Title</th>
                <th>Subject</th>
                <th>Submitted At</th>
                <th>Proof Photos</th>
                <th>Marks</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredSubmissions.map((sub) => {
                const student = sub.profiles;
                const asg = Array.isArray(sub.task_assignments) ? sub.task_assignments[0] : sub.task_assignments;
                const task = asg?.tasks;
                const isLate = asg?.is_late;
                const files = sub.submission_files || sub.files || [];

                return (
                  <tr key={sub.id}>
                    <td>
                      <div style={{ fontWeight: 600, color: 'var(--text-main)' }}>
                        {student?.full_name || 'Student'}
                      </div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                        {student?.roll_number} • Div {student?.division || 'A'}
                      </div>
                    </td>
                    <td>
                      <div style={{ fontWeight: 600, maxWidth: '240px' }}>
                        {task?.title || 'Academic Task'}
                      </div>
                      {sub.comment && (
                        <div
                          style={{
                            fontSize: '0.75rem',
                            color: 'var(--text-muted)',
                            fontStyle: 'italic',
                            maxWidth: '240px',
                            whiteSpace: 'nowrap',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                          }}
                        >
                          "{sub.comment}"
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
                        {task?.subjects?.name || 'Subject'}
                      </span>
                    </td>
                    <td>
                      <div style={{ fontSize: '0.85rem' }}>
                        {new Date(sub.submitted_at).toLocaleDateString()}
                      </div>
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
                          background: 'var(--bg-subtle)',
                          color: 'var(--text-main)',
                          padding: '3px 8px',
                          borderRadius: 4,
                          fontSize: '0.75rem',
                          fontWeight: 600,
                        }}
                      >
                        {files.length} {files.length === 1 ? 'photo' : 'photos'}
                      </span>
                    </td>
                    <td>
                      <span style={{ fontWeight: 600, color: 'var(--primary-700)' }}>
                        {sub.marks_awarded !== null ? `${sub.marks_awarded} / ${task?.max_marks || '-'}` : '—'}
                      </span>
                    </td>
                    <td>
                      <StatusBadge status={sub.status} />
                    </td>
                    <td>
                      <button
                        type="button"
                        className="btn btn-primary btn-sm"
                        onClick={() => setSelectedSubmission(sub)}
                      >
                        <Eye size={14} />
                        <span>Review</span>
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Review Modal */}
      {selectedSubmission && (
        <ReviewModal
          submission={selectedSubmission}
          onClose={() => setSelectedSubmission(null)}
          onSuccess={loadSubmissions}
        />
      )}
    </div>
  );
};
