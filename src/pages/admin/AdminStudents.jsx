import React, { useState, useEffect } from 'react';
import {
  Users,
  Search,
  Filter,
  CheckCircle2,
  XCircle,
  Power,
  Eye,
  EyeOff,
  FileCheck,
  Calendar,
  Clock,
  X,
  UserPlus,
  Phone,
  Mail,
  KeyRound,
  Copy,
  Check,
  ShieldCheck,
} from 'lucide-react';
import { dataService } from '../../lib/dataService';
import { useToast } from '../../context/ToastContext';
import { StatusBadge } from '../../components/StatusBadge';
import { PhotoViewerModal } from '../../components/PhotoViewerModal';

export const AdminStudents = () => {
  const { addToast } = useToast();

  const [students, setStudents] = useState(() => dataService.getCachedStudents());
  const [loading, setLoading] = useState(false);

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [divisionFilter, setDivisionFilter] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState('ALL');

  // Password Visibility & Copy States
  const [showAllPasswords, setShowAllPasswords] = useState(false);
  const [visiblePasswordIds, setVisiblePasswordIds] = useState({});
  const [copiedStudentId, setCopiedStudentId] = useState(null);
  const [modalShowPassword, setModalShowPassword] = useState(false);

  // Drilldown Modal
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [studentAssignments, setStudentAssignments] = useState([]);
  const [drilldownLoading, setDrilldownLoading] = useState(false);
  const [lightboxPhotos, setLightboxPhotos] = useState(null);

  const togglePasswordVisibility = (studentId) => {
    setVisiblePasswordIds((prev) => ({
      ...prev,
      [studentId]: !prev[studentId],
    }));
  };

  const handleCopyPassword = (studentId, password) => {
    navigator.clipboard.writeText(password);
    setCopiedStudentId(studentId);
    addToast('Password copied to clipboard!', 'info');
    setTimeout(() => {
      setCopiedStudentId(null);
    }, 2000);
  };

  // Add Student Modal State
  const [isAddStudentOpen, setIsAddStudentOpen] = useState(false);
  const [newStudentForm, setNewStudentForm] = useState({
    full_name: '',
    roll_number: '',
    mobile_number: '',
    email: '',
    class_name: 'FY B.Sc. IT',
    division: 'A',
    password: 'student@123',
  });
  const [submittingStudent, setSubmittingStudent] = useState(false);

  const loadStudents = async (isBackground = false) => {
    if (!isBackground) setLoading(true);
    try {
      const data = await dataService.getStudents();
      setStudents(data);
    } catch (err) {
      console.error('Error loading students:', err);
    } finally {
      if (!isBackground) setLoading(false);
    }
  };

  useEffect(() => {
    loadStudents();

    // 1. Continuous Live Polling every 1 second from Supabase
    const pollInterval = setInterval(() => {
      loadStudents(true);
    }, 1000);

    // 2. Auto refetch when user switches tab or window gains focus
    const handleFocus = () => loadStudents(true);
    window.addEventListener('focus', handleFocus);
    document.addEventListener('visibilitychange', handleFocus);

    // 3. Supabase Realtime & local mutation event bus
    const unsubscribe = dataService.subscribeRealtime(() => {
      loadStudents(true);
    });

    return () => {
      clearInterval(pollInterval);
      window.removeEventListener('focus', handleFocus);
      document.removeEventListener('visibilitychange', handleFocus);
      if (unsubscribe) unsubscribe();
    };
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

  const handleAddStudentSubmit = async (e) => {
    e.preventDefault();
    if (!newStudentForm.full_name.trim() || !newStudentForm.roll_number.trim() || !newStudentForm.mobile_number.trim()) {
      addToast('Please enter Student Name, Roll Number, and Mobile Number.', 'warning');
      return;
    }
    setSubmittingStudent(true);
    try {
      await dataService.addStudent({
        full_name: newStudentForm.full_name.trim(),
        roll_number: newStudentForm.roll_number.trim().toUpperCase(),
        mobile_number: newStudentForm.mobile_number.trim(),
        email: newStudentForm.email.trim() || `${newStudentForm.roll_number.trim().toLowerCase()}@college.edu`,
        class_name: newStudentForm.class_name || 'FY B.Sc. IT',
        division: newStudentForm.division || 'A',
        password: newStudentForm.password || 'student@123',
      });
      addToast(`Student "${newStudentForm.full_name}" added successfully!`, 'success');
      setIsAddStudentOpen(false);
      setNewStudentForm({
        full_name: '',
        roll_number: '',
        mobile_number: '',
        email: '',
        class_name: 'FY B.Sc. IT',
        division: 'A',
        password: 'student@123',
      });
      loadStudents();
    } catch (err) {
      console.error('Failed to add student:', err);
      addToast(err.message || 'Error adding student', 'error');
    } finally {
      setSubmittingStudent(false);
    }
  };

  const safeStudents = students || [];
  const filteredStudents = safeStudents.filter((s) => {
    if (!s) return false;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      const matchName = s.full_name?.toLowerCase().includes(q);
      const matchRoll = s.roll_number?.toLowerCase().includes(q);
      const matchEmail = s.email?.toLowerCase().includes(q);
      const matchPhone = (s.mobile_number || s.mobile || s.phone)?.toLowerCase().includes(q);
      if (!matchName && !matchRoll && !matchEmail && !matchPhone) return false;
    }

    if (divisionFilter !== 'ALL' && s.division !== divisionFilter) return false;
    if (statusFilter === 'ACTIVE' && !s.is_active) return false;
    if (statusFilter === 'INACTIVE' && s.is_active) return false;

    return true;
  });

  return (
    <div>
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <h1 className="page-title">Manage Students Directory</h1>
          <p className="page-description">
            View registered FY B.Sc. IT students, activate or deactivate accounts, and monitor individual academic progress.
          </p>
        </div>
        <button
          type="button"
          className="btn btn-primary"
          onClick={() => setIsAddStudentOpen(true)}
          style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}
        >
          <UserPlus size={16} />
          <span>Add New Student</span>
        </button>
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
                <th>Mobile</th>
                <th>Class & Division</th>
                <th>Email</th>
                <th>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <span>Password</span>
                    <button
                      type="button"
                      onClick={() => setShowAllPasswords(!showAllPasswords)}
                      style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--primary-600)', padding: 0 }}
                      title={showAllPasswords ? 'Hide all passwords' : 'Show all passwords'}
                    >
                      {showAllPasswords ? <EyeOff size={13} /> : <Eye size={13} />}
                    </button>
                  </div>
                </th>
                <th>Status</th>
                <th>Enrolled Date</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredStudents.map((st) => {
                const isPasswordRevealed = showAllPasswords || visiblePasswordIds[st.id];
                const studentPass = st.password || 'student@123';

                return (
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
                      <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                        <Phone size={12} />
                        <span>{st.mobile_number || st.mobile || st.phone || 'N/A'}</span>
                      </div>
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
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <code
                          style={{
                            background: 'var(--bg-subtle)',
                            color: 'var(--primary-700)',
                            padding: '2px 8px',
                            borderRadius: '4px',
                            fontSize: '0.825rem',
                            fontWeight: 600,
                            fontFamily: 'monospace',
                            minWidth: '85px',
                            display: 'inline-block',
                          }}
                        >
                          {isPasswordRevealed ? studentPass : '••••••••'}
                        </code>
                        <button
                          type="button"
                          onClick={() => togglePasswordVisibility(st.id)}
                          style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', padding: '2px' }}
                          title={isPasswordRevealed ? 'Hide password' : 'Show password'}
                        >
                          {isPasswordRevealed ? <EyeOff size={13} /> : <Eye size={13} />}
                        </button>
                        <button
                          type="button"
                          onClick={() => handleCopyPassword(st.id, studentPass)}
                          style={{
                            background: 'none',
                            border: 'none',
                            cursor: 'pointer',
                            color: copiedStudentId === st.id ? 'var(--success-main)' : 'var(--text-muted)',
                            padding: '2px',
                          }}
                          title="Copy Password"
                        >
                          {copiedStudentId === st.id ? <Check size={13} /> : <Copy size={13} />}
                        </button>
                      </div>
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
                          title="View Complete Profile, Credentials & Tasks"
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
                );
              })}
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
              {/* Comprehensive Student Credentials & Details Card */}
              <div
                style={{
                  background: 'var(--bg-subtle)',
                  borderRadius: 'var(--radius-lg)',
                  padding: '16px 20px',
                  border: '1px solid var(--border-light)',
                  marginBottom: '20px',
                }}
              >
                <div style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--primary-700)', textTransform: 'uppercase', marginBottom: '12px' }}>
                  Student Credentials & Contact Information
                </div>

                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                    gap: '14px',
                  }}
                >
                  <div>
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'block' }}>Roll Number</span>
                    <strong style={{ fontSize: '0.95rem', color: 'var(--text-main)' }}>{selectedStudent.roll_number}</strong>
                  </div>

                  <div>
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'block' }}>Mobile Number</span>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <Phone size={13} color="var(--primary-600)" />
                      <strong style={{ fontSize: '0.95rem', color: 'var(--text-main)' }}>
                        {selectedStudent.mobile_number || selectedStudent.mobile || selectedStudent.phone || 'N/A'}
                      </strong>
                    </div>
                  </div>

                  <div>
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'block' }}>Official Email</span>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <Mail size={13} color="var(--primary-600)" />
                      <span style={{ fontSize: '0.9rem', color: 'var(--text-main)' }}>{selectedStudent.email}</span>
                    </div>
                  </div>

                  <div>
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'block' }}>Account Password</span>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '2px' }}>
                      <code
                        style={{
                          background: 'var(--bg-surface)',
                          color: 'var(--primary-700)',
                          padding: '3px 8px',
                          borderRadius: 4,
                          fontSize: '0.875rem',
                          fontWeight: 700,
                          fontFamily: 'monospace',
                          border: '1px solid var(--border-light)',
                        }}
                      >
                        {modalShowPassword ? (selectedStudent.password || 'student@123') : '••••••••'}
                      </code>
                      <button
                        type="button"
                        onClick={() => setModalShowPassword(!modalShowPassword)}
                        className="btn btn-secondary btn-sm"
                        style={{ padding: '2px 6px', fontSize: '0.75rem' }}
                        title="Toggle password view"
                      >
                        {modalShowPassword ? <EyeOff size={13} /> : <Eye size={13} />}
                      </button>
                      <button
                        type="button"
                        onClick={() => handleCopyPassword(selectedStudent.id, selectedStudent.password || 'student@123')}
                        className="btn btn-secondary btn-sm"
                        style={{ padding: '2px 8px', fontSize: '0.75rem' }}
                      >
                        <Copy size={13} />
                        <span>Copy</span>
                      </button>
                    </div>
                  </div>

                  <div>
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'block' }}>Account Access Status</span>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '4px' }}>
                      <span
                        style={{
                          background: selectedStudent.is_active ? 'var(--success-bg)' : 'var(--danger-bg)',
                          color: selectedStudent.is_active ? 'var(--success-text)' : 'var(--danger-text)',
                          padding: '2px 8px',
                          borderRadius: 'var(--radius-full)',
                          fontSize: '0.75rem',
                          fontWeight: 700,
                        }}
                      >
                        {selectedStudent.is_active ? 'Active' : 'Deactivated'}
                      </span>
                      <button
                        type="button"
                        className="btn btn-secondary btn-sm"
                        onClick={() => {
                          handleToggleStatus(selectedStudent);
                          setSelectedStudent({ ...selectedStudent, is_active: !selectedStudent.is_active });
                        }}
                        style={{ padding: '2px 6px', fontSize: '0.75rem' }}
                      >
                        <Power size={12} />
                        <span>{selectedStudent.is_active ? 'Deactivate' : 'Activate'}</span>
                      </button>
                    </div>
                  </div>

                  <div>
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'block' }}>Registered Date</span>
                    <span style={{ fontSize: '0.85rem', color: 'var(--text-main)', marginTop: '4px', display: 'block' }}>
                      {new Date(selectedStudent.created_at).toLocaleString()}
                    </span>
                  </div>
                </div>
              </div>

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

                  {(studentAssignments || []).map((asg) => {
                    const task = asg?.tasks;
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

      {/* Add Student Modal */}
      {isAddStudentOpen && (
        <div className="modal-overlay" onClick={() => setIsAddStudentOpen(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '520px' }}>
            <div className="modal-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div style={{ background: 'var(--primary-50)', padding: '8px', borderRadius: '10px', color: 'var(--primary-600)' }}>
                  <UserPlus size={20} />
                </div>
                <div>
                  <h3 className="modal-title">Add New FY IT Student</h3>
                  <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', margin: 0 }}>
                    Register a new student account to the departmental roster
                  </p>
                </div>
              </div>
              <button
                type="button"
                className="photo-remove-btn"
                onClick={() => setIsAddStudentOpen(false)}
                style={{ position: 'static' }}
              >
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleAddStudentSubmit}>
              <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                <div className="form-group">
                  <label className="form-label">Full Name *</label>
                  <input
                    type="text"
                    className="form-control"
                    required
                    placeholder="e.g. Rahul Sharma"
                    value={newStudentForm.full_name}
                    onChange={(e) => setNewStudentForm({ ...newStudentForm, full_name: e.target.value })}
                  />
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                  <div className="form-group">
                    <label className="form-label">Roll Number *</label>
                    <input
                      type="text"
                      className="form-control"
                      required
                      placeholder="e.g. FYIT-101"
                      value={newStudentForm.roll_number}
                      onChange={(e) => setNewStudentForm({ ...newStudentForm, roll_number: e.target.value })}
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label">Mobile Number *</label>
                    <input
                      type="tel"
                      className="form-control"
                      required
                      placeholder="e.g. 9876543210"
                      value={newStudentForm.mobile_number}
                      onChange={(e) => setNewStudentForm({ ...newStudentForm, mobile_number: e.target.value })}
                    />
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label">Email Address (Optional / Auto)</label>
                  <input
                    type="email"
                    className="form-control"
                    placeholder="e.g. student@college.edu"
                    value={newStudentForm.email}
                    onChange={(e) => setNewStudentForm({ ...newStudentForm, email: e.target.value })}
                  />
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                  <div className="form-group">
                    <label className="form-label">Class</label>
                    <input
                      type="text"
                      className="form-control"
                      value={newStudentForm.class_name}
                      onChange={(e) => setNewStudentForm({ ...newStudentForm, class_name: e.target.value })}
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label">Division</label>
                    <select
                      className="form-control"
                      value={newStudentForm.division}
                      onChange={(e) => setNewStudentForm({ ...newStudentForm, division: e.target.value })}
                    >
                      <option value="A">Division A</option>
                      <option value="B">Division B</option>
                      <option value="C">Division C</option>
                    </select>
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label">Initial Password</label>
                  <input
                    type="text"
                    className="form-control"
                    placeholder="Default: student@123"
                    value={newStudentForm.password}
                    onChange={(e) => setNewStudentForm({ ...newStudentForm, password: e.target.value })}
                  />
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                    Student will log in with their Roll Number / Mobile and this password.
                  </span>
                </div>
              </div>

              <div className="modal-footer">
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setIsAddStudentOpen(false)}
                  disabled={submittingStudent}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={submittingStudent}
                >
                  {submittingStudent ? 'Registering...' : 'Add Student'}
                </button>
              </div>
            </form>
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
