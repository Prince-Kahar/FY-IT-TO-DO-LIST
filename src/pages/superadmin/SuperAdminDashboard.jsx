import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  ShieldAlert,
  UserPlus,
  KeyRound,
  Trash2,
  Edit,
  Power,
  Users,
  CheckCircle2,
  AlertTriangle,
  X,
  Loader2,
  Lock,
  ExternalLink,
  LogOut,
  RefreshCw,
  Eye,
  EyeOff,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { dataService } from '../../lib/dataService';

export const SuperAdminDashboard = () => {
  const { user, profile, logout } = useAuth();
  const { addToast } = useToast();
  const navigate = useNavigate();

  const [admins, setAdmins] = useState([]);
  const [studentsCount, setStudentsCount] = useState(0);
  const [tasksCount, setTasksCount] = useState(0);
  const [loading, setLoading] = useState(true);

  // Modals
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [adminToEdit, setAdminToEdit] = useState(null);
  const [adminToDelete, setAdminToDelete] = useState(null);

  const loadData = () => {
    setLoading(true);
    try {
      const list = dataService.getAdmins();
      setAdmins(list);

      // Fetch student & task count
      const localRegistered = JSON.parse(localStorage.getItem('fy_registered_students') || '[]');
      setStudentsCount(localRegistered.length + 5);

      dataService.getTasks().then((t) => setTasksCount(t?.length || 0));
    } catch (err) {
      console.error('Error loading super admin data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
    const unsub = dataService.subscribeRealtime(() => {
      loadData();
    });
    return () => {
      if (unsub) unsub();
    };
  }, []);

  const handleToggleStatus = (admin) => {
    try {
      dataService.updateAdmin(admin.id, { is_active: !admin.is_active });
      addToast(`Admin ${admin.full_name} is now ${!admin.is_active ? 'Active' : 'Inactive'}.`, 'info');
      loadData();
    } catch (err) {
      addToast(err.message || 'Error updating status', 'error');
    }
  };

  const handleDeleteAdmin = () => {
    if (!adminToDelete) return;
    try {
      dataService.deleteAdmin(adminToDelete.id);
      addToast(`Admin "${adminToDelete.full_name}" deleted.`, 'info');
      setAdminToDelete(null);
      loadData();
    } catch (err) {
      addToast(err.message || 'Error deleting admin', 'error');
    }
  };

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  return (
    <div style={{ minHeight: '100vh', background: '#0F172A', color: '#F8FAFC' }}>
      {/* Top Navbar */}
      <header
        style={{
          background: '#1E293B',
          borderBottom: '1px solid #334155',
          padding: '16px 28px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '12px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
          <div
            style={{
              width: 44,
              height: 44,
              borderRadius: '10px',
              background: 'linear-gradient(135deg, #7C3AED 0%, #4F46E5 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 4px 14px rgba(124, 58, 237, 0.4)',
            }}
          >
            <ShieldAlert size={24} color="#FFFFFF" />
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <h1 style={{ fontSize: '1.15rem', fontWeight: 800, margin: 0, color: '#FFFFFF' }}>
                STERS Super Administrator Console
              </h1>
              <span
                style={{
                  background: '#7C3AED',
                  color: '#FFFFFF',
                  fontSize: '0.675rem',
                  fontWeight: 800,
                  padding: '2px 8px',
                  borderRadius: '999px',
                  letterSpacing: '0.05em',
                }}
              >
                MASTER CONTROL
              </span>
            </div>
            <p style={{ fontSize: '0.775rem', color: '#94A3B8', margin: 0 }}>
              System-wide Administrator Credential, Role & Access Management
            </p>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <button
            type="button"
            className="btn btn-secondary btn-sm"
            onClick={loadData}
            style={{ background: '#334155', color: '#E2E8F0', borderColor: '#475569' }}
          >
            <RefreshCw size={14} />
            <span>Refresh</span>
          </button>

          <Link
            to="/admin"
            className="btn btn-secondary btn-sm"
            style={{ background: '#334155', color: '#38BDF8', borderColor: '#475569' }}
          >
            <ExternalLink size={14} />
            <span>Open Admin Portal</span>
          </Link>

          <button
            type="button"
            className="btn btn-secondary btn-sm"
            onClick={handleLogout}
            style={{ background: 'rgba(239, 68, 68, 0.2)', color: '#FCA5A5', borderColor: 'rgba(239, 68, 68, 0.4)' }}
          >
            <LogOut size={14} />
            <span>Sign Out</span>
          </button>
        </div>
      </header>

      {/* Main Container */}
      <main style={{ maxWidth: '1280px', margin: '0 auto', padding: '32px 24px' }}>
        {/* KPI Cards */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
            gap: '16px',
            marginBottom: '28px',
          }}
        >
          <div
            style={{
              background: '#1E293B',
              padding: '20px',
              borderRadius: 'var(--radius-lg)',
              border: '1px solid #334155',
            }}
          >
            <div style={{ fontSize: '0.8rem', color: '#94A3B8', fontWeight: 600 }}>Active Administrators</div>
            <div style={{ fontSize: '1.8rem', fontWeight: 800, color: '#A78BFA', marginTop: '6px' }}>
              {admins.filter((a) => a.is_active).length} / {admins.length}
            </div>
            <div style={{ fontSize: '0.75rem', color: '#64748B', marginTop: '4px' }}>Managing FY B.Sc. IT & BCA</div>
          </div>

          <div
            style={{
              background: '#1E293B',
              padding: '20px',
              borderRadius: 'var(--radius-lg)',
              border: '1px solid #334155',
            }}
          >
            <div style={{ fontSize: '0.8rem', color: '#94A3B8', fontWeight: 600 }}>Registered Students</div>
            <div style={{ fontSize: '1.8rem', fontWeight: 800, color: '#38BDF8', marginTop: '6px' }}>
              {studentsCount}
            </div>
            <div style={{ fontSize: '0.75rem', color: '#64748B', marginTop: '4px' }}>First Year IT Enrolled</div>
          </div>

          <div
            style={{
              background: '#1E293B',
              padding: '20px',
              borderRadius: 'var(--radius-lg)',
              border: '1px solid #334155',
            }}
          >
            <div style={{ fontSize: '0.8rem', color: '#94A3B8', fontWeight: 600 }}>Academic Tasks Published</div>
            <div style={{ fontSize: '1.8rem', fontWeight: 800, color: '#34D399', marginTop: '6px' }}>
              {tasksCount}
            </div>
            <div style={{ fontSize: '0.75rem', color: '#64748B', marginTop: '4px' }}>Practicals, Journals & Projects</div>
          </div>

          <div
            style={{
              background: '#1E293B',
              padding: '20px',
              borderRadius: 'var(--radius-lg)',
              border: '1px solid #334155',
            }}
          >
            <div style={{ fontSize: '0.8rem', color: '#94A3B8', fontWeight: 600 }}>Master Auth Protocol</div>
            <div style={{ fontSize: '1.8rem', fontWeight: 800, color: '#FCD34D', marginTop: '6px' }}>
              ACTIVE
            </div>
            <div style={{ fontSize: '0.75rem', color: '#64748B', marginTop: '4px' }}>Role-isolated endpoints</div>
          </div>
        </div>

        {/* Section Header */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: '16px',
            flexWrap: 'wrap',
            gap: '12px',
          }}
        >
          <div>
            <h2 style={{ fontSize: '1.25rem', fontWeight: 800, margin: 0, color: '#FFFFFF' }}>
              Admin Accounts & Password Management
            </h2>
            <p style={{ fontSize: '0.825rem', color: '#94A3B8', margin: 0 }}>
              Add new department teachers, update usernames, reset passwords, and manage administrative privileges.
            </p>
          </div>

          <button
            type="button"
            className="btn btn-primary"
            onClick={() => setIsAddModalOpen(true)}
            style={{
              background: 'linear-gradient(135deg, #7C3AED 0%, #6D28D9 100%)',
              borderColor: '#8B5CF6',
              boxShadow: '0 4px 14px rgba(124, 58, 237, 0.3)',
            }}
          >
            <UserPlus size={16} />
            <span>Add New Admin</span>
          </button>
        </div>

        {/* Admins Table */}
        <div
          style={{
            background: '#1E293B',
            borderRadius: 'var(--radius-lg)',
            border: '1px solid #334155',
            overflow: 'hidden',
          }}
        >
          <div style={{ overflowX: 'auto' }}>
            <table className="table" style={{ width: '100%', borderCollapse: 'collapse', color: '#E2E8F0' }}>
              <thead>
                <tr style={{ background: '#0F172A', borderBottom: '1px solid #334155' }}>
                  <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '0.75rem', color: '#94A3B8' }}>ADMIN / FACULTY</th>
                  <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '0.75rem', color: '#94A3B8' }}>USERNAME</th>
                  <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '0.75rem', color: '#94A3B8' }}>PASSWORD</th>
                  <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '0.75rem', color: '#94A3B8' }}>DEPARTMENT</th>
                  <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '0.75rem', color: '#94A3B8' }}>STATUS</th>
                  <th style={{ padding: '12px 16px', textAlign: 'right', fontSize: '0.75rem', color: '#94A3B8' }}>ACTIONS</th>
                </tr>
              </thead>
              <tbody>
                {admins.map((adm) => (
                  <tr
                    key={adm.id}
                    style={{
                      borderBottom: '1px solid #334155',
                      opacity: adm.is_active ? 1 : 0.6,
                      background: adm.is_default ? 'rgba(124, 58, 237, 0.05)' : 'transparent',
                    }}
                  >
                    <td style={{ padding: '14px 16px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <div
                          style={{
                            width: 36,
                            height: 36,
                            borderRadius: '50%',
                            background: '#334155',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontWeight: 700,
                            color: '#A5B4FC',
                          }}
                        >
                          {adm.full_name?.charAt(0) || 'A'}
                        </div>
                        <div>
                          <div style={{ fontWeight: 700, color: '#FFFFFF', fontSize: '0.875rem' }}>
                            {adm.full_name}
                            {adm.is_default && (
                              <span
                                style={{
                                  background: '#4F46E5',
                                  color: '#FFFFFF',
                                  fontSize: '0.65rem',
                                  fontWeight: 700,
                                  padding: '1px 6px',
                                  borderRadius: '4px',
                                  marginLeft: '8px',
                                }}
                              >
                                PRIMARY
                              </span>
                            )}
                          </div>
                          <div style={{ fontSize: '0.75rem', color: '#94A3B8' }}>{adm.email}</div>
                        </div>
                      </div>
                    </td>

                    <td style={{ padding: '14px 16px' }}>
                      <code
                        style={{
                          background: '#0F172A',
                          color: '#38BDF8',
                          padding: '2px 8px',
                          borderRadius: '4px',
                          fontSize: '0.825rem',
                        }}
                      >
                        {adm.username}
                      </code>
                    </td>

                    <td style={{ padding: '14px 16px' }}>
                      <span
                        style={{
                          background: '#0F172A',
                          color: '#FCD34D',
                          padding: '2px 8px',
                          borderRadius: '4px',
                          fontSize: '0.825rem',
                          fontFamily: 'monospace',
                        }}
                      >
                        {adm.password || '••••••••'}
                      </span>
                    </td>

                    <td style={{ padding: '14px 16px', fontSize: '0.85rem', color: '#CBD5E1' }}>
                      {adm.department || 'Information Technology'}
                    </td>

                    <td style={{ padding: '14px 16px' }}>
                      <span
                        style={{
                          background: adm.is_active ? 'rgba(34, 197, 94, 0.15)' : 'rgba(100, 116, 139, 0.2)',
                          color: adm.is_active ? '#4ADE80' : '#94A3B8',
                          padding: '2px 8px',
                          borderRadius: '999px',
                          fontSize: '0.75rem',
                          fontWeight: 700,
                          border: `1px solid ${adm.is_active ? 'rgba(34, 197, 94, 0.3)' : 'rgba(100, 116, 139, 0.3)'}`,
                        }}
                      >
                        {adm.is_active ? 'Active' : 'Inactive'}
                      </span>
                    </td>

                    <td style={{ padding: '14px 16px', textAlign: 'right' }}>
                      <div style={{ display: 'inline-flex', gap: '6px' }}>
                        <button
                          type="button"
                          className="btn btn-secondary btn-sm"
                          onClick={() => setAdminToEdit(adm)}
                          title="Edit Admin & Reset Password"
                          style={{ background: '#334155', color: '#E2E8F0', borderColor: '#475569' }}
                        >
                          <Edit size={14} />
                          <span>Edit</span>
                        </button>

                        <button
                          type="button"
                          className="btn btn-secondary btn-sm"
                          onClick={() => handleToggleStatus(adm)}
                          title={adm.is_active ? 'Deactivate Admin' : 'Activate Admin'}
                          style={{
                            background: '#334155',
                            color: adm.is_active ? '#4ADE80' : '#94A3B8',
                            borderColor: '#475569',
                          }}
                        >
                          <Power size={14} />
                        </button>

                        {!adm.is_default && (
                          <button
                            type="button"
                            className="btn btn-secondary btn-sm"
                            onClick={() => setAdminToDelete(adm)}
                            title="Delete Admin"
                            style={{
                              background: 'rgba(239, 68, 68, 0.15)',
                              color: '#F87171',
                              borderColor: 'rgba(239, 68, 68, 0.3)',
                            }}
                          >
                            <Trash2 size={14} />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </main>

      {/* Add Admin Modal */}
      {isAddModalOpen && (
        <AdminModal
          title="Add New Administrator"
          onClose={() => setIsAddModalOpen(false)}
          onSave={(data) => {
            dataService.createAdmin(data);
            addToast(`Admin "${data.full_name}" created successfully.`, 'success');
            setIsAddModalOpen(false);
            loadData();
          }}
        />
      )}

      {/* Edit Admin Modal */}
      {adminToEdit && (
        <AdminModal
          title={`Edit Admin: ${adminToEdit.full_name}`}
          initialData={adminToEdit}
          onClose={() => setAdminToEdit(null)}
          onSave={(updates) => {
            dataService.updateAdmin(adminToEdit.id, updates);
            addToast(`Admin "${updates.full_name}" updated.`, 'success');
            setAdminToEdit(null);
            loadData();
          }}
        />
      )}

      {/* Delete Confirmation Modal */}
      {adminToDelete && (
        <div className="modal-overlay" onClick={() => setAdminToDelete(null)}>
          <div
            className="modal-content"
            onClick={(e) => e.stopPropagation()}
            style={{ maxWidth: '420px', background: '#1E293B', color: '#F8FAFC', border: '1px solid #334155' }}
          >
            <div className="modal-header" style={{ borderBottom: '1px solid #334155' }}>
              <h3 className="modal-title" style={{ color: '#F87171' }}>Delete Admin Account</h3>
              <button onClick={() => setAdminToDelete(null)} style={{ background: 'none', border: 'none', color: '#94A3B8' }}>
                <X size={18} />
              </button>
            </div>
            <div className="modal-body" style={{ padding: '20px' }}>
              <p style={{ fontSize: '0.9rem', color: '#CBD5E1' }}>
                Are you sure you want to permanently remove admin account for <strong>{adminToDelete.full_name}</strong> (username: {adminToDelete.username})?
              </p>
              <p style={{ fontSize: '0.8rem', color: '#94A3B8', marginTop: '8px' }}>
                They will no longer be able to log into the Teacher & Admin portal.
              </p>
            </div>
            <div className="modal-footer" style={{ borderTop: '1px solid #334155', display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
              <button type="button" className="btn btn-secondary" onClick={() => setAdminToDelete(null)}>
                Cancel
              </button>
              <button
                type="button"
                className="btn btn-primary"
                onClick={handleDeleteAdmin}
                style={{ background: '#DC2626', borderColor: '#EF4444' }}
              >
                Delete Admin
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// Reusable Admin Create / Edit Modal
const AdminModal = ({ title, initialData = null, onClose, onSave }) => {
  const [fullName, setFullName] = useState(initialData?.full_name || '');
  const [username, setUsername] = useState(initialData?.username || '');
  const [email, setEmail] = useState(initialData?.email || '');
  const [password, setPassword] = useState(initialData?.password || '');
  const [department, setDepartment] = useState(initialData?.department || 'Information Technology');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!fullName.trim() || !username.trim() || !email.trim() || !password.trim()) {
      setError('Please fill in all required fields.');
      return;
    }
    onSave({
      full_name: fullName.trim(),
      username: username.trim().toLowerCase(),
      email: email.trim().toLowerCase(),
      password: password.trim(),
      department: department.trim(),
    });
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div
        className="modal-content"
        onClick={(e) => e.stopPropagation()}
        style={{ maxWidth: '480px', background: '#1E293B', color: '#F8FAFC', border: '1px solid #334155' }}
      >
        <div className="modal-header" style={{ borderBottom: '1px solid #334155' }}>
          <h3 className="modal-title" style={{ color: '#FFFFFF' }}>{title}</h3>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: '#94A3B8' }}>
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="modal-body" style={{ padding: '20px' }}>
            {error && (
              <div
                style={{
                  background: 'rgba(239, 68, 68, 0.2)',
                  color: '#FCA5A5',
                  padding: '10px 12px',
                  borderRadius: 'var(--radius-md)',
                  marginBottom: '16px',
                  fontSize: '0.85rem',
                }}
              >
                {error}
              </div>
            )}

            <div className="form-group">
              <label className="form-label" style={{ color: '#CBD5E1' }}>Full Name *</label>
              <input
                type="text"
                className="form-control"
                placeholder="e.g. Prof. Rakesh Patel"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                required
                style={{ background: '#0F172A', border: '1px solid #334155', color: '#FFFFFF' }}
              />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
              <div className="form-group">
                <label className="form-label" style={{ color: '#CBD5E1' }}>Admin Username *</label>
                <input
                  type="text"
                  className="form-control"
                  placeholder="e.g. rakesh"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  required
                  style={{ background: '#0F172A', border: '1px solid #334155', color: '#FFFFFF' }}
                />
              </div>

              <div className="form-group">
                <label className="form-label" style={{ color: '#CBD5E1' }}>Department</label>
                <input
                  type="text"
                  className="form-control"
                  placeholder="e.g. IT / BCA"
                  value={department}
                  onChange={(e) => setDepartment(e.target.value)}
                  style={{ background: '#0F172A', border: '1px solid #334155', color: '#FFFFFF' }}
                />
              </div>
            </div>

            <div className="form-group">
              <label className="form-label" style={{ color: '#CBD5E1' }}>Admin Official Email *</label>
              <input
                type="email"
                className="form-control"
                placeholder="e.g. rakesh@college.edu"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                style={{ background: '#0F172A', border: '1px solid #334155', color: '#FFFFFF' }}
              />
            </div>

            <div className="form-group">
              <label className="form-label" style={{ color: '#CBD5E1' }}>Password *</label>
              <div style={{ position: 'relative' }}>
                <input
                  type={showPassword ? 'text' : 'password'}
                  className="form-control"
                  placeholder="Set admin login password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  style={{ background: '#0F172A', border: '1px solid #334155', color: '#FFFFFF', paddingRight: '40px' }}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  style={{
                    position: 'absolute',
                    right: '12px',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    color: '#94A3B8',
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                  }}
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>
          </div>

          <div className="modal-footer" style={{ borderTop: '1px solid #334155', display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
            <button type="button" className="btn btn-secondary" onClick={onClose} style={{ background: '#334155', color: '#CBD5E1', borderColor: '#475569' }}>
              Cancel
            </button>
            <button
              type="submit"
              className="btn btn-primary"
              style={{ background: 'linear-gradient(135deg, #7C3AED 0%, #6D28D9 100%)', borderColor: '#8B5CF6' }}
            >
              Save Admin
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
