import React, { useState, useEffect } from 'react';
import {
  Users,
  Search,
  Filter,
  CheckCircle2,
  XCircle,
  Power,
  Eye,
  FileCheck,
  Calendar,
  Clock,
  X,
} from 'lucide-react';
import { dataService } from '../../lib/dataService';
import { useToast } from '../../context/ToastContext';
import { StatusBadge } from '../../components/StatusBadge';
import { PhotoViewerModal } from '../../components/PhotoViewerModal';

export const AdminStudents = () => {
  const { addToast } = useToast();

  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [divisionFilter, setDivisionFilter] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState('ALL');

  // Drilldown Modal
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [studentAssignments, setStudentAssignments] = useState([]);
  const [drilldownLoading, setDrilldownLoading] = useState(false);
  const [lightboxPhotos, setLightboxPhotos] = useState(null);

  const loadStudents = async () => {
    setLoading(true);
    try {
      const data = await dataService.getStudents();
      setStudents(data);
    } catch (err) {
      console.error('Error loading students:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadStudents();
  }, []);

  const handleToggleStatus = async (student) => {
    try {
      await dataService.toggleStudentActive(student.id, student.is_active);
      addToast(
        `Student account for ${student.full_name} is now ${!student.is_active ? 'Active' : 'Deactivated'}.`,
        'info'
      );
      loadStudents();
    } catch (err) {
      console.error('Failed to toggle status:', err);
      addToast(err.message || 'Error updating student access.', 'error');
    }
  };

  const handleOpenStudentDetails = async (student) => {
    setSelectedStudent(student);
    setDrilldownLoading(true);
    try {
      const asgs = await dataService.getStudentAssignments(student.id);
      setStudentAssignments(asgs);
    } catch (err) {
      console.error('Error fetching student details:', err);
    } finally {
      setDrilldownLoading(false);
    }
  };

  const filteredStudents = students.filter((s) => {
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      const matchName = s.full_name.toLowerCase().includes(q);
      const matchRoll = s.roll_number?.toLowerCase().includes(q);
      const matchEmail = s.email?.toLowerCase().includes(q);
      if (!matchName && !matchRoll && !matchEmail) return false;
    }

    if (divisionFilter !== 'ALL' && s.division !== divisionFilter) return false;
    if (statusFilter === 'ACTIVE' && !s.is_active) return false;
    if (statusFilter === 'INACTIVE' && s.is_active) return false;

    return true;
  });

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Manage Students Directory</h1>
          <p className="page-description">
            View registered FY B.Sc. IT students, activate or deactivate accounts, and monitor individual academic progress.
          </p>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="filters-bar">
        <div className="search-input-box">
          <Search size={18} color="var(--text-muted)" />
          <input
            type="text"
            placeholder="Search student by name, roll number, or email..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>

        <select
          className="form-control"
          style={{ width: 'auto' }}
          value={divisionFilter}
          onChange={(e) => setDivisionFilter(e.target.value)}
        >
          <option value="ALL">All Divisions</option>
          <option value="A">Division A</option>
          <option value="B">Division B</option>
          <option value="C">Division C</option>
        </select>

        <select
          className="form-control"
          style={{ width: 'auto' }}
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
        >
          <option value="ALL">All Accounts</option>
          <option value="ACTIVE">Active Students</option>
          <option value="INACTIVE">Deactivated Students</option>
        </select>
      </div>

      {/* Students Table */}
      {filteredStudents.length === 0 ? (
        <div className="card empty-state">
          <div className="empty-state-icon">
            <Users size={28} />
          </div>
          <h3 className="empty-state-title">No students found</h3>
          <p className="empty-state-desc">
            No student records match the search or filter query.
          </p>
        </div>
      ) : (
        <div className="table-container">
          <table className="table">
            <thead>
              <tr>
                <th>Student Name</th>
                <th>Roll Number</th>
                <th>Class & Division</th>
                <th>Email</th>
                <th>Status</th>
                <th>Enrolled Date</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredStudents.map((st) => (
                <tr key={st.id}>
                  <td>
                    <div style={{ fontWeight: 600, color: 'var(--text-main)' }}>
                      {st.full_name}
                    </div>
                  </td>
                  <td>
                    <span style={{ fontWeight: 700, color: 'var(--primary-700)' }}>
                      {st.roll_number || 'N/A'}
                    </span>
                  </td>
                  <td>
                    <span>{st.class_name || 'FY B.Sc. IT'}</span>
                    <span
                      style={{
                        background: 'var(--bg-subtle)',
                        padding: '2px 6px',
                        borderRadius: 4,
                        fontSize: '0.75rem',
                        fontWeight: 600,
                        marginLeft: 6,
                      }}
                    >
                      Div {st.division || 'A'}
                    </span>
                  </td>
                  <td>
                    <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                      {st.email}
                    </span>
                  </td>
                  <td>
                    <span
                      style={{
                        background: st.is_active ? 'var(--success-bg)' : 'var(--danger-bg)',
                        color: st.is_active ? 'var(--success-text)' : 'var(--danger-text)',
                        padding: '3px 8px',
                        borderRadius: 'var(--radius-full)',
                        fontSize: '0.75rem',
                        fontWeight: 600,
                      }}
                    >
                      {st.is_active ? 'Active' : 'Deactivated'}
                    </span>
                  </td>
                  <td>
                    <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                      {new Date(st.created_at).toLocaleDateString()}
                    </span>
                  </td>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <button
                        type="button"
                        className="btn btn-primary btn-sm"
                        onClick={() => handleOpenStudentDetails(st)}
                        title="View Individual Tasks & Submissions"
                      >
                        <Eye size={14} />
                        <span>Profile & Tasks</span>
                      </button>

                      <button
                        type="button"
                        className="btn btn-secondary btn-sm"
                        onClick={() => handleToggleStatus(st)}
                        title={st.is_active ? 'Deactivate Student' : 'Activate Student'}
                        style={{
                          color: st.is_active ? 'var(--danger-main)' : 'var(--success-main)',
                        }}
                      >
                        <Power size={14} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Individual Student Drilldown Modal */}
      {selectedStudent && (
        <div className="modal-overlay" onClick={() => setSelectedStudent(null)}>
          <div className="modal-content modal-lg" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <div>
                <h3 className="modal-title">{selectedStudent.full_name}</h3>
                <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                  Roll: {selectedStudent.roll_number} • Class: {selectedStudent.class_name} (Div {selectedStudent.division})
                </p>
              </div>
              <button
                className="photo-remove-btn"
                onClick={() => setSelectedStudent(null)}
                style={{ position: 'static' }}
              >
                <X size={16} />
              </button>
            </div>

            <div className="modal-body">
              {drilldownLoading ? (
                <div style={{ textAlign: 'center', padding: '32px 0', color: 'var(--text-muted)' }}>
                  Loading academic records...
                </div>
              ) : studentAssignments.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '32px 0', color: 'var(--text-muted)' }}>
                  No tasks assigned to this student yet.
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  <div style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>
                    Assigned Tasks & Progress ({studentAssignments.length})
                  </div>

                  {studentAssignments.map((asg) => {
                    const task = asg.tasks;
                    const sub = asg.submissions?.[asg.submissions.length - 1];
                    const files = sub?.submission_files || sub?.files || [];

                    return (
                      <div
                        key={asg.id}
                        style={{
                          background: 'var(--bg-subtle)',
                          borderRadius: 'var(--radius-md)',
                          padding: '14px 16px',
                          border: '1px solid var(--border-light)',
                        }}
                      >
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                          <div>
                            <span
                              style={{
                                background: 'var(--primary-100)',
                                color: 'var(--primary-700)',
                                fontSize: '0.7rem',
                                fontWeight: 700,
                                padding: '2px 6px',
                                borderRadius: 4,
                              }}
                            >
                              {task?.subjects?.name || 'Subject'}
                            </span>
                            <div style={{ fontSize: '0.95rem', fontWeight: 600, marginTop: '4px' }}>
                              {task?.title}
                            </div>
                            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '2px' }}>
                              Due: {new Date(task?.due_at).toLocaleDateString()}
                            </div>
                          </div>

                          <StatusBadge status={asg.status} />
                        </div>

                        {sub && (
                          <div
                            style={{
                              marginTop: '10px',
                              paddingTop: '10px',
                              borderTop: '1px solid var(--border-light)',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'space-between',
                            }}
                          >
                            <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                              Submitted on {new Date(sub.submitted_at).toLocaleDateString()}
                              {sub.marks_awarded !== null && (
                                <strong style={{ color: 'var(--primary-700)', marginLeft: 8 }}>
                                  ({sub.marks_awarded} Marks)
                                </strong>
                              )}
                            </div>

                            {files.length > 0 && (
                              <button
                                type="button"
                                className="btn btn-secondary btn-sm"
                                onClick={() => setLightboxPhotos(files)}
                              >
                                <Eye size={13} />
                                <span>View Photos ({files.length})</span>
                              </button>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            <div className="modal-footer">
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => setSelectedStudent(null)}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Lightbox for student proof inspection */}
      {lightboxPhotos && (
        <PhotoViewerModal
          photos={lightboxPhotos}
          onClose={() => setLightboxPhotos(null)}
        />
      )}
    </div>
  );
};
