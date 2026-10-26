import React, { useState, useEffect } from 'react';
import { BarChart3, Download, Users, CheckCircle2, AlertTriangle, BookOpen } from 'lucide-react';
import { dataService } from '../../lib/dataService';

export const AdminReports = () => {
  const [students, setStudents] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [submissions, setSubmissions] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadReportData = async () => {
      setLoading(true);
      try {
        const [stList, sbList, tList, subList] = await Promise.all([
          dataService.getStudents(),
          dataService.getSubjects(),
          dataService.getTasks(),
          dataService.getAllSubmissions(),
        ]);
        setStudents(stList);
        setSubjects(sbList);
        setTasks(tList);
        setSubmissions(subList);
      } catch (err) {
        console.error('Error loading report data:', err);
      } finally {
        setLoading(false);
      }
    };
    loadReportData();
  }, []);

  // Compute student stats with null-safety
  const safeTasks = tasks || [];
  const safeStudents = students || [];
  const safeSubmissions = submissions || [];

  const publishedTasksCount = safeTasks.filter((t) => t?.publication_status === 'Published').length;

  const studentStats = safeStudents.map((st) => {
    const studentSubs = safeSubmissions.filter((s) => s?.student_id === st?.id);
    const approvedCount = studentSubs.filter((s) => s?.status === 'Approved').length;
    const submittedCount = studentSubs.filter((s) => ['Submitted', 'Under Review'].includes(s?.status)).length;
    const pct = publishedTasksCount > 0 ? Math.round((approvedCount / publishedTasksCount) * 100) : 0;

    return {
      ...st,
      approvedCount,
      submittedCount,
      completionPct: pct,
    };
  });

  // Export Full Academic Report
  const handleExportFullReport = () => {
    const headers = [
      'Roll Number',
      'Student Name',
      'Class',
      'Division',
      'Email',
      'Account Active',
      'Total Published Tasks',
      'Approved Submissions',
      'Pending Submissions',
      'Completion Rate (%)',
    ];

    const rows = studentStats.map((st) => [
      `"${st.roll_number || ''}"`,
      `"${st.full_name}"`,
      `"${st.class_name || 'FY B.Sc. IT'}"`,
      `"${st.division || 'A'}"`,
      `"${st.email}"`,
      st.is_active ? 'YES' : 'NO',
      publishedTasksCount,
      st.approvedCount,
      st.submittedCount,
      `${st.completionPct}%`,
    ]);

    const csvContent =
      'data:text/csv;charset=utf-8,' +
      [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute(
      'download',
      `FY_IT_Class_Progress_Report_${new Date().toISOString().slice(0, 10)}.csv`
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Student Progress & Class Reports</h1>
          <p className="page-description">
            Comprehensive analytics on student task submissions, subject-wise completion, and academic audits.
          </p>
        </div>

        <button
          type="button"
          className="btn btn-primary"
          onClick={handleExportFullReport}
          disabled={students.length === 0}
        >
          <Download size={16} />
          <span>Export Master CSV Report</span>
        </button>
      </div>

      {/* Subject-Wise Analytics Cards */}
      <div className="card" style={{ marginBottom: '24px' }}>
        <div className="card-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <BookOpen size={18} color="var(--primary-600)" />
            <h3 className="card-title">Subject-Wise Class Performance</h3>
          </div>
        </div>

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
            gap: '16px',
          }}
        >
          {subjects.map((sub) => {
            const subTasks = tasks.filter((t) => t.subject_id === sub.id && t.publication_status === 'Published');
            const totalExpected = subTasks.length * students.length;
            const subSubmissions = submissions.filter((s) => s.task_assignments?.tasks?.subject_id === sub.id && s.status === 'Approved');
            const rate = totalExpected > 0 ? Math.round((subSubmissions.length / totalExpected) * 100) : 0;

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
                    <h4 style={{ fontSize: '0.95rem', fontWeight: 600, marginTop: '4px' }}>
                      {sub.name}
                    </h4>
                  </div>
                  <span style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--primary-600)' }}>
                    {rate}%
                  </span>
                </div>

                <div style={{ marginTop: '12px' }}>
                  <div className="progress-container">
                    <div className="progress-fill" style={{ width: `${rate}%` }} />
                  </div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '6px' }}>
                    {subTasks.length} Published Tasks • {subSubmissions.length} Approved Submissions
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Student Progress Leaderboard / Roster */}
      <div className="card">
        <div className="card-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Users size={18} color="var(--teal-600)" />
            <h3 className="card-title">Individual Student Progress Summary</h3>
          </div>
        </div>

        <div className="table-container">
          <table className="table">
            <thead>
              <tr>
                <th>Roll Number</th>
                <th>Student Name</th>
                <th>Division</th>
                <th>Approved</th>
                <th>Pending Review</th>
                <th>Completion Rate</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {studentStats.map((st) => (
                <tr key={st.id}>
                  <td>
                    <span style={{ fontWeight: 700, color: 'var(--primary-700)' }}>
                      {st.roll_number || 'N/A'}
                    </span>
                  </td>
                  <td>
                    <div style={{ fontWeight: 600 }}>{st.full_name}</div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{st.email}</div>
                  </td>
                  <td>
                    <span>Div {st.division || 'A'}</span>
                  </td>
                  <td>
                    <span style={{ fontWeight: 600, color: 'var(--success-main)' }}>
                      {st.approvedCount} / {publishedTasksCount}
                    </span>
                  </td>
                  <td>
                    <span>{st.submittedCount}</span>
                  </td>
                  <td style={{ minWidth: '150px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <div className="progress-container" style={{ flex: 1 }}>
                        <div className="progress-fill" style={{ width: `${st.completionPct}%` }} />
                      </div>
                      <span style={{ fontSize: '0.8rem', fontWeight: 600 }}>
                        {st.completionPct}%
                      </span>
                    </div>
                  </td>
                  <td>
                    <span
                      style={{
                        background: st.is_active ? 'var(--success-bg)' : 'var(--danger-bg)',
                        color: st.is_active ? 'var(--success-text)' : 'var(--danger-text)',
                        padding: '2px 8px',
                        borderRadius: 'var(--radius-full)',
                        fontSize: '0.75rem',
                        fontWeight: 600,
                      }}
                    >
                      {st.is_active ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
