import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
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
  LogOut,
  RefreshCw,
  Eye,
  EyeOff,
  Copy,
  Check,
  BookOpen,
  CheckSquare,
  ShieldCheck,
  Sparkles,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { dataService } from '../../lib/dataService';

export const SuperAdminDashboard = () => {
  const { user, profile, logout } = useAuth();
  const { addToast } = useToast();
  const navigate = useNavigate();

  const [admins, setAdmins] = useState([]);
  const [availableSubjects, setAvailableSubjects] = useState([]);
  const [studentsCount, setStudentsCount] = useState(0);
  const [tasksCount, setTasksCount] = useState(0);
  const [loading, setLoading] = useState(true);

  // Password visibility & clipboard state
  const [showAllPasswords, setShowAllPasswords] = useState(false);
  const [visiblePasswords, setVisiblePasswords] = useState({});
  const [copiedAdminId, setCopiedAdminId] = useState(null);

  // Modals
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [adminToEdit, setAdminToEdit] = useState(null);
  const [adminToDelete, setAdminToDelete] = useState(null);

  const loadData = async (isBackground = false) => {
    if (!isBackground) setLoading(true);
    try {
      // 1. Fetch admins from Supabase dedicated admins table
      const [adminList, subList, stList, tList] = await Promise.all([
        dataService.fetchAdminsFromSupabase(),
        dataService.getSubjects(),
        dataService.getStudents(),
        dataService.getTasks(),
      ]);

      setAdmins(adminList || []);
      setAvailableSubjects(subList || []);
      setStudentsCount(stList?.length || 0);
      setTasksCount(tList?.length || 0);
    } catch (err) {
      console.error('Error loading super admin data:', err);
    } finally {
      if (!isBackground) setLoading(false);
    }
  };

  useEffect(() => {
    loadData();

    // 1. Live polling every 10 seconds
    const interval = setInterval(() => {
      loadData(true);
    }, 10000);

    // 2. Realtime subscription
    const unsub = dataService.subscribeRealtime(() => {
      loadData(true);
    });

    return () => {
      clearInterval(interval);
      if (unsub) unsub();
    };
  }, []);

  const handleToggleStatus = async (admin) => {
    try {
      await dataService.updateAdmin(admin.id, { is_active: !admin.is_active });
      addToast(
        `Admin account for ${admin.full_name} is now ${!admin.is_active ? 'Active' : 'Inactive'}.`,
        'info'
      );
      loadData(true);
    } catch (err) {
      addToast(err.message || 'Error updating admin status', 'error');
    }
  };

  const handleDeleteAdmin = async () => {
    if (!adminToDelete) return;
    try {
      await dataService.deleteAdmin(adminToDelete.id);
      addToast(`Admin "${adminToDelete.full_name}" deleted successfully.`, 'info');
      setAdminToDelete(null);
      loadData(true);
    } catch (err) {
      addToast(err.message || 'Error deleting admin', 'error');
    }
  };

  const handleCopyPassword = (adminId, password) => {
    navigator.clipboard.writeText(password);
    setCopiedAdminId(adminId);
    addToast('Admin password copied to clipboard!', 'info');
    setTimeout(() => {
      setCopiedAdminId(null);
    }, 2000);
  };

  const togglePasswordVisibility = (adminId) => {
    setVisiblePasswords((prev) => ({
      ...prev,
      [adminId]: !prev[adminId],
    }));
  };

  const handleLogout = async () => {
    await logout();
    navigate('/superadmin');
  };

  return (
    <div
      style={{
        minHeight: '100vh',
        background: '#0B0F19',
        color: '#F9FAFB',
        fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, sans-serif",
      }}
    >
      {/* Executive Top Header */}
      <header
        style={{
          background: 'linear-gradient(180deg, #111827 0%, #0F172A 100%)',
          borderBottom: '1px solid #1F2937',
          padding: '16px 32px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '16px',
          boxShadow: '0 4px 20px rgba(0, 0, 0, 0.4)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <div
            style={{
              width: 48,
              height: 48,
              borderRadius: '12px',
              background: 'linear-gradient(135deg, #6366F1 0%, #8B5CF6 50%, #EC4899 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 6px 20px rgba(99, 102, 241, 0.45)',
            }}
          >
            <ShieldAlert size={26} color="#FFFFFF" />
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <h1 style={{ fontSize: '1.25rem', fontWeight: 800, margin: 0, color: '#FFFFFF', letterSpacing: '-0.02em' }}>
                STERS Super Administrator Console
              </h1>
              <span
                style={{
                  background: 'linear-gradient(135deg, #6366F1 0%, #4F46E5 100%)',
                  color: '#FFFFFF',
                  fontSize: '0.675rem',
                  fontWeight: 800,
                  padding: '3px 10px',
                  borderRadius: '999px',
                  letterSpacing: '0.06em',
                  textTransform: 'uppercase',
                  boxShadow: '0 2px 8px rgba(99, 102, 241, 0.3)',
                }}
              >
                MASTER CONTROL
              </span>
            </div>
            <p style={{ fontSize: '0.8rem', color: '#9CA3AF', margin: '3px 0 0 0' }}>
              Supreme Departmental Governance, Admin Accounts & Subject Assignment Authority
            </p>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              background: 'rgba(16, 185, 129, 0.1)',
              border: '1px solid rgba(16, 185, 129, 0.3)',
              padding: '6px 12px',
              borderRadius: '999px',
              fontSize: '0.75rem',
              color: '#34D399',
              fontWeight: 600,
            }}
          >
            <span
              style={{
                width: 8,
                height: 8,
                borderRadius: '50%',
                background: '#10B981',
                boxShadow: '0 0 8px #10B981',
              }}
            />
            <span>Supabase Sync Active</span>
          </div>

          <button
            type="button"
            className="btn btn-secondary btn-sm"
            onClick={() => loadData(false)}
            style={{
              background: '#1F2937',
              color: '#E5E7EB',
              borderColor: '#374151',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '8px 14px',
              borderRadius: '8px',
            }}
          >
            <RefreshCw size={14} className={loading ? 'spin' : ''} />
            <span>Sync Live</span>
          </button>

          <button
            type="button"
            className="btn btn-secondary btn-sm"
            onClick={handleLogout}
            style={{
              background: 'rgba(239, 68, 68, 0.12)',
              color: '#F87171',
              borderColor: 'rgba(239, 68, 68, 0.3)',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '8px 14px',
              borderRadius: '8px',
            }}
          >
            <LogOut size={14} />
            <span>Sign Out</span>
          </button>
        </div>
      </header>

      {/* Main Container */}
      <main style={{ maxWidth: '1360px', margin: '0 auto', padding: '36px 28px' }}>
        {/* KPI Metrics Grid */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
            gap: '20px',
            marginBottom: '32px',
          }}
        >
          <div
            style={{
              background: '#111827',
              padding: '22px 24px',
              borderRadius: '14px',
              border: '1px solid #1F2937',
              boxShadow: '0 4px 16px rgba(0, 0, 0, 0.25)',
              position: 'relative',
              overflow: 'hidden',
            }}
          >
            <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '3px', background: '#8B5CF6' }} />
            <div style={{ fontSize: '0.8rem', color: '#9CA3AF', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              Active Faculty Admins
            </div>
            <div style={{ fontSize: '2rem', fontWeight: 800, color: '#A78BFA', marginTop: '8px' }}>
              {admins.filter((a) => a.is_active).length} <span style={{ fontSize: '1.1rem', color: '#6B7280' }}>/ {admins.length}</span>
            </div>
            <div style={{ fontSize: '0.75rem', color: '#6B7280', marginTop: '6px' }}>
              Authorized Department Teachers
            </div>
          </div>

          <div
            style={{
              background: '#111827',
              padding: '22px 24px',
              borderRadius: '14px',
              border: '1px solid #1F2937',
              boxShadow: '0 4px 16px rgba(0, 0, 0, 0.25)',
              position: 'relative',
              overflow: 'hidden',
            }}
          >
            <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '3px', background: '#06B6D4' }} />
            <div style={{ fontSize: '0.8rem', color: '#9CA3AF', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              Registered Students
            </div>
            <div style={{ fontSize: '2rem', fontWeight: 800, color: '#38BDF8', marginTop: '8px' }}>
              {studentsCount}
            </div>
            <div style={{ fontSize: '0.75rem', color: '#6B7280', marginTop: '6px' }}>
              Live in `public.students` Table
            </div>
          </div>

          <div
            style={{
              background: '#111827',
              padding: '22px 24px',
              borderRadius: '14px',
              border: '1px solid #1F2937',
              boxShadow: '0 4px 16px rgba(0, 0, 0, 0.25)',
              position: 'relative',
              overflow: 'hidden',
            }}
          >
            <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '3px', background: '#10B981' }} />
            <div style={{ fontSize: '0.8rem', color: '#9CA3AF', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              Curriculum Tasks
            </div>
            <div style={{ fontSize: '2rem', fontWeight: 800, color: '#34D399', marginTop: '8px' }}>
              {tasksCount}
            </div>
            <div style={{ fontSize: '0.75rem', color: '#6B7280', marginTop: '6px' }}>
              Practicals, Journals & Assignments
            </div>
          </div>

          <div
            style={{
              background: '#111827',
              padding: '22px 24px',
              borderRadius: '14px',
              border: '1px solid #1F2937',
              boxShadow: '0 4px 16px rgba(0, 0, 0, 0.25)',
              position: 'relative',
              overflow: 'hidden',
            }}
          >
            <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '3px', background: '#F59E0B' }} />
            <div style={{ fontSize: '0.8rem', color: '#9CA3AF', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              Database Separation
            </div>
            <div style={{ fontSize: '1.2rem', fontWeight: 800, color: '#FCD34D', marginTop: '12px' }}>
              STUDENTS / ADMINS
            </div>
            <div style={{ fontSize: '0.75rem', color: '#6B7280', marginTop: '6px' }}>
              Strict RLS Isolated Architecture
            </div>
          </div>
        </div>

        {/* Section Header */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: '20px',
            flexWrap: 'wrap',
            gap: '16px',
          }}
        >
          <div>
            <h2 style={{ fontSize: '1.35rem', fontWeight: 800, margin: 0, color: '#FFFFFF' }}>
              Faculty Administrators & Subject Access Management
            </h2>
            <p style={{ fontSize: '0.85rem', color: '#9CA3AF', margin: '4px 0 0 0' }}>
              Assign specific subjects to individual faculty members, reset credentials, and govern access rights.
            </p>
          </div>

          <button
            type="button"
            className="btn btn-primary"
            onClick={() => setIsAddModalOpen(true)}
            style={{
              background: 'linear-gradient(135deg, #6366F1 0%, #4F46E5 100%)',
              borderColor: '#6366F1',
              boxShadow: '0 4px 16px rgba(99, 102, 241, 0.4)',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              padding: '10px 18px',
              borderRadius: '10px',
              fontWeight: 700,
            }}
          >
            <UserPlus size={18} />
            <span>Add New Admin</span>
          </button>
        </div>

        {/* Admins Table */}
        <div
          style={{
            background: '#111827',
            borderRadius: '14px',
            border: '1px solid #1F2937',
            boxShadow: '0 8px 30px rgba(0, 0, 0, 0.3)',
            overflow: 'hidden',
          }}
        >
          <div style={{ overflowX: 'auto' }}>
            <table className="table" style={{ width: '100%', borderCollapse: 'collapse', color: '#E5E7EB' }}>
              <thead>
                <tr style={{ background: '#0F172A', borderBottom: '1px solid #1F2937' }}>
                  <th style={{ padding: '14px 18px', textAlign: 'left', fontSize: '0.75rem', color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                    FACULTY / ADMIN
                  </th>
                  <th style={{ padding: '14px 18px', textAlign: 'left', fontSize: '0.75rem', color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                    USERNAME
                  </th>
                  <th style={{ padding: '14px 18px', textAlign: 'left', fontSize: '0.75rem', color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <span>PASSWORD</span>
                      <button
                        type="button"
                        onClick={() => setShowAllPasswords(!showAllPasswords)}
                        style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#818CF8', padding: 0 }}
                        title={showAllPasswords ? 'Hide all passwords' : 'Show all passwords'}
                      >
                        {showAllPasswords ? <EyeOff size={13} /> : <Eye size={13} />}
                      </button>
                    </div>
                  </th>
                  <th style={{ padding: '14px 18px', textAlign: 'left', fontSize: '0.75rem', color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                    ASSIGNED SUBJECTS
                  </th>
                  <th style={{ padding: '14px 18px', textAlign: 'left', fontSize: '0.75rem', color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                    STATUS
                  </th>
                  <th style={{ padding: '14px 18px', textAlign: 'right', fontSize: '0.75rem', color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                    ACTIONS
                  </th>
                </tr>
              </thead>
              <tbody>
                {admins.map((adm) => {
                  const isPasswordRevealed = showAllPasswords || visiblePasswords[adm.id];
                  const hasAllSubjects =
                    !adm.assigned_subjects ||
                    adm.assigned_subjects.includes('ALL') ||
                    adm.assigned_subjects.length === 0;

                  return (
                    <tr
                      key={adm.id}
                      style={{
                        borderBottom: '1px solid #1F2937',
                        opacity: adm.is_active ? 1 : 0.65,
                        background: adm.is_default ? 'rgba(99, 102, 241, 0.05)' : 'transparent',
                        transition: 'background 0.15s ease',
                      }}
                    >
                      {/* Name & Dept */}
                      <td style={{ padding: '16px 18px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                          <div
                            style={{
                              width: 40,
                              height: 40,
                              borderRadius: '10px',
                              background: adm.is_default
                                ? 'linear-gradient(135deg, #6366F1 0%, #4F46E5 100%)'
                                : '#1F2937',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              fontWeight: 800,
                              color: '#FFFFFF',
                              fontSize: '0.95rem',
                              border: '1px solid #374151',
                            }}
                          >
                            {adm.full_name?.charAt(0) || 'A'}
                          </div>
                          <div>
                            <div style={{ fontWeight: 700, color: '#FFFFFF', fontSize: '0.925rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
                              <span>{adm.full_name}</span>
                              {adm.is_default && (
                                <span
                                  style={{
                                    background: 'rgba(99, 102, 241, 0.25)',
                                    color: '#A5B4FC',
                                    border: '1px solid rgba(99, 102, 241, 0.4)',
                                    fontSize: '0.65rem',
                                    fontWeight: 800,
                                    padding: '2px 8px',
                                    borderRadius: '4px',
                                    letterSpacing: '0.04em',
                                  }}
                                >
                                  HOD / PRIMARY
                                </span>
                              )}
                            </div>
                            <div style={{ fontSize: '0.775rem', color: '#9CA3AF', marginTop: '2px' }}>
                              {adm.department || 'Information Technology'} • {adm.email || 'No email set'}
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* Username */}
                      <td style={{ padding: '16px 18px' }}>
                        <code
                          style={{
                            background: '#0B0F19',
                            color: '#38BDF8',
                            border: '1px solid #1F2937',
                            padding: '3px 9px',
                            borderRadius: '6px',
                            fontSize: '0.85rem',
                            fontWeight: 600,
                            fontFamily: 'monospace',
                          }}
                        >
                          {adm.username}
                        </code>
                      </td>

                      {/* Password */}
                      <td style={{ padding: '16px 18px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <code
                            style={{
                              background: '#0B0F19',
                              color: '#FCD34D',
                              border: '1px solid #1F2937',
                              padding: '3px 9px',
                              borderRadius: '6px',
                              fontSize: '0.85rem',
                              fontFamily: 'monospace',
                              minWidth: '95px',
                              display: 'inline-block',
                            }}
                          >
                            {isPasswordRevealed ? adm.password : '••••••••'}
                          </code>
                          <button
                            type="button"
                            onClick={() => togglePasswordVisibility(adm.id)}
                            style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#9CA3AF', padding: '2px' }}
                            title={isPasswordRevealed ? 'Hide Password' : 'Show Password'}
                          >
                            {isPasswordRevealed ? <EyeOff size={14} /> : <Eye size={14} />}
                          </button>
                          <button
                            type="button"
                            onClick={() => handleCopyPassword(adm.id, adm.password)}
                            style={{
                              background: 'none',
                              border: 'none',
                              cursor: 'pointer',
                              color: copiedAdminId === adm.id ? '#10B981' : '#9CA3AF',
                              padding: '2px',
                            }}
                            title="Copy Password"
                          >
                            {copiedAdminId === adm.id ? <Check size={14} /> : <Copy size={14} />}
                          </button>
                        </div>
                      </td>

                      {/* Assigned Subjects */}
                      <td style={{ padding: '16px 18px' }}>
                        {hasAllSubjects ? (
                          <span
                            style={{
                              background: 'linear-gradient(135deg, rgba(99, 102, 241, 0.2) 0%, rgba(139, 92, 246, 0.2) 100%)',
                              color: '#C4B5FD',
                              border: '1px solid rgba(139, 92, 246, 0.4)',
                              padding: '4px 10px',
                              borderRadius: '8px',
                              fontSize: '0.75rem',
                              fontWeight: 700,
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '6px',
                            }}
                          >
                            <Sparkles size={12} color="#FBBF24" />
                            <span>All Subjects (Full Access)</span>
                          </span>
                        ) : (
                          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', maxWidth: '280px' }}>
                            {adm.assigned_subjects.map((sub, idx) => (
                              <span
                                key={idx}
                                style={{
                                  background: 'rgba(6, 182, 212, 0.15)',
                                  color: '#67E8F9',
                                  border: '1px solid rgba(6, 182, 212, 0.3)',
                                  padding: '2px 8px',
                                  borderRadius: '6px',
                                  fontSize: '0.725rem',
                                  fontWeight: 600,
                                }}
                              >
                                {sub}
                              </span>
                            ))}
                          </div>
                        )}
                      </td>

                      {/* Status */}
                      <td style={{ padding: '16px 18px' }}>
                        <span
                          style={{
                            background: adm.is_active ? 'rgba(16, 185, 129, 0.15)' : 'rgba(107, 114, 128, 0.2)',
                            color: adm.is_active ? '#34D399' : '#9CA3AF',
                            padding: '3px 10px',
                            borderRadius: '999px',
                            fontSize: '0.75rem',
                            fontWeight: 700,
                            border: `1px solid ${adm.is_active ? 'rgba(16, 185, 129, 0.35)' : 'rgba(107, 114, 128, 0.3)'}`,
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '4px',
                          }}
                        >
                          <span
                            style={{
                              width: 6,
                              height: 6,
                              borderRadius: '50%',
                              background: adm.is_active ? '#10B981' : '#6B7280',
                            }}
                          />
                          {adm.is_active ? 'Active' : 'Deactivated'}
                        </span>
                      </td>

                      {/* Actions */}
                      <td style={{ padding: '16px 18px', textAlign: 'right' }}>
                        <div style={{ display: 'inline-flex', gap: '8px' }}>
                          <button
                            type="button"
                            className="btn btn-secondary btn-sm"
                            onClick={() => setAdminToEdit(adm)}
                            title="Edit Admin & Subject Assignments"
                            style={{
                              background: '#1F2937',
                              color: '#F3F4F6',
                              borderColor: '#374151',
                              padding: '6px 10px',
                            }}
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
                              background: '#1F2937',
                              color: adm.is_active ? '#F87171' : '#34D399',
                              borderColor: '#374151',
                              padding: '6px 10px',
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
                                padding: '6px 10px',
                              }}
                            >
                              <Trash2 size={14} />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </main>

      {/* Add Admin Modal */}
      {isAddModalOpen && (
        <AdminModal
          title="Add New Faculty Administrator"
          availableSubjects={availableSubjects}
          onClose={() => setIsAddModalOpen(false)}
          onSave={async (data) => {
            await dataService.createAdmin(data);
            addToast(`Admin "${data.full_name}" registered and assigned subjects!`, 'success');
            setIsAddModalOpen(false);
            loadData(false);
          }}
        />
      )}

      {/* Edit Admin Modal */}
      {adminToEdit && (
        <AdminModal
          title={`Edit Administrator: ${adminToEdit.full_name}`}
          initialData={adminToEdit}
          availableSubjects={availableSubjects}
          onClose={() => setAdminToEdit(null)}
          onSave={async (updates) => {
            await dataService.updateAdmin(adminToEdit.id, updates);
            addToast(`Admin "${updates.full_name}" settings updated!`, 'success');
            setAdminToEdit(null);
            loadData(false);
          }}
        />
      )}

      {/* Delete Confirmation Modal */}
      {adminToDelete && (
        <div className="modal-overlay" onClick={() => setAdminToDelete(null)}>
          <div
            className="modal-content"
            onClick={(e) => e.stopPropagation()}
            style={{ maxWidth: '440px', background: '#111827', color: '#F9FAFB', border: '1px solid #374151', borderRadius: '14px' }}
          >
            <div className="modal-header" style={{ borderBottom: '1px solid #1F2937' }}>
              <h3 className="modal-title" style={{ color: '#F87171' }}>Delete Administrator Account</h3>
              <button onClick={() => setAdminToDelete(null)} style={{ background: 'none', border: 'none', color: '#9CA3AF' }}>
                <X size={18} />
              </button>
            </div>
            <div className="modal-body" style={{ padding: '22px' }}>
              <p style={{ fontSize: '0.925rem', color: '#E5E7EB', lineHeight: 1.5 }}>
                Are you sure you want to permanently delete the admin account for <strong>{adminToDelete.full_name}</strong> (Username: <code>{adminToDelete.username}</code>)?
              </p>
              <p style={{ fontSize: '0.8rem', color: '#9CA3AF', marginTop: '10px' }}>
                This will revoke their access to the Teacher & Admin portal and remove their record from Supabase.
              </p>
            </div>
            <div className="modal-footer" style={{ borderTop: '1px solid #1F2937', display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
              <button type="button" className="btn btn-secondary" onClick={() => setAdminToDelete(null)} style={{ background: '#1F2937', color: '#E5E7EB', borderColor: '#374151' }}>
                Cancel
              </button>
              <button
                type="button"
                className="btn btn-primary"
                onClick={handleDeleteAdmin}
                style={{ background: '#DC2626', borderColor: '#EF4444' }}
              >
                Delete Account
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// Reusable Admin Create / Edit Modal with Subject Assignment
const AdminModal = ({ title, initialData = null, availableSubjects = [], onClose, onSave }) => {
  const [fullName, setFullName] = useState(initialData?.full_name || '');
  const [username, setUsername] = useState(initialData?.username || '');
  const [email, setEmail] = useState(initialData?.email || '');
  const [password, setPassword] = useState(initialData?.password || '');
  const [department, setDepartment] = useState(initialData?.department || 'Information Technology');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');

  // Subject Assignment State: 'ALL' or array of subject names
  const [assignAllSubjects, setAssignAllSubjects] = useState(() => {
    if (!initialData || !initialData.assigned_subjects) return true;
    return initialData.assigned_subjects.includes('ALL');
  });

  const [selectedSubjects, setSelectedSubjects] = useState(() => {
    if (!initialData || !initialData.assigned_subjects) return [];
    if (initialData.assigned_subjects.includes('ALL')) return [];
    return initialData.assigned_subjects;
  });

  // Default fallback subject catalog if database subjects list is empty
  const defaultSubjectCatalog = [
    { id: 'sub-1', name: 'C Programming', code: 'FYS101' },
    { id: 'sub-2', name: 'Database Management Systems', code: 'FYS102' },
    { id: 'sub-3', name: 'Web Programming & UI/UX', code: 'FYS103' },
    { id: 'sub-4', name: 'Applied Mathematics - I', code: 'FYS104' },
    { id: 'sub-5', name: 'Computer Fundamentals & OS', code: 'FYS105' },
    { id: 'sub-6', name: 'Professional Communication Skills', code: 'FYS106' },
  ];

  const subjectsToDisplay = availableSubjects && availableSubjects.length > 0
    ? availableSubjects
    : defaultSubjectCatalog;

  const handleToggleSubject = (subjectName) => {
    if (selectedSubjects.includes(subjectName)) {
      setSelectedSubjects(selectedSubjects.filter((s) => s !== subjectName));
    } else {
      setSelectedSubjects([...selectedSubjects, subjectName]);
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!fullName.trim() || !username.trim() || !password.trim()) {
      setError('Please fill in Full Name, Username, and Password.');
      return;
    }

    if (!assignAllSubjects && selectedSubjects.length === 0) {
      setError('Please select at least one assigned subject, or choose "All Subjects".');
      return;
    }

    const assigned_subjects = assignAllSubjects ? ['ALL'] : selectedSubjects;

    onSave({
      full_name: fullName.trim(),
      username: username.trim().toLowerCase(),
      email: email.trim().toLowerCase() || `${username.trim().toLowerCase()}@college.edu`,
      password: password.trim(),
      department: department.trim(),
      assigned_subjects,
    });
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div
        className="modal-content"
        onClick={(e) => e.stopPropagation()}
        style={{
          maxWidth: '540px',
          background: '#111827',
          color: '#F9FAFB',
          border: '1px solid #374151',
          borderRadius: '16px',
          boxShadow: '0 12px 40px rgba(0, 0, 0, 0.5)',
        }}
      >
        <div className="modal-header" style={{ borderBottom: '1px solid #1F2937' }}>
          <div>
            <h3 className="modal-title" style={{ color: '#FFFFFF' }}>{title}</h3>
            <p style={{ fontSize: '0.775rem', color: '#9CA3AF', margin: '2px 0 0 0' }}>
              Set credentials and configure teaching subject permissions
            </p>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: '#9CA3AF' }}>
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="modal-body" style={{ padding: '22px', maxHeight: '70vh', overflowY: 'auto' }}>
            {error && (
              <div
                style={{
                  background: 'rgba(239, 68, 68, 0.2)',
                  color: '#FCA5A5',
                  padding: '10px 14px',
                  borderRadius: '8px',
                  marginBottom: '16px',
                  fontSize: '0.85rem',
                  border: '1px solid rgba(239, 68, 68, 0.3)',
                }}
              >
                {error}
              </div>
            )}

            <div className="form-group" style={{ marginBottom: '14px' }}>
              <label className="form-label" style={{ color: '#CBD5E1', fontSize: '0.85rem' }}>Full Faculty Name *</label>
              <input
                type="text"
                className="form-control"
                placeholder="e.g. Prof. Rakesh Patel"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                required
                style={{ background: '#0B0F19', border: '1px solid #374151', color: '#FFFFFF', borderRadius: '8px' }}
              />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px', marginBottom: '14px' }}>
              <div className="form-group">
                <label className="form-label" style={{ color: '#CBD5E1', fontSize: '0.85rem' }}>Admin Username *</label>
                <input
                  type="text"
                  className="form-control"
                  placeholder="e.g. rakesh"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  required
                  style={{ background: '#0B0F19', border: '1px solid #374151', color: '#FFFFFF', borderRadius: '8px' }}
                />
              </div>

              <div className="form-group">
                <label className="form-label" style={{ color: '#CBD5E1', fontSize: '0.85rem' }}>Department</label>
                <input
                  type="text"
                  className="form-control"
                  placeholder="e.g. IT / BCA"
                  value={department}
                  onChange={(e) => setDepartment(e.target.value)}
                  style={{ background: '#0B0F19', border: '1px solid #374151', color: '#FFFFFF', borderRadius: '8px' }}
                />
              </div>
            </div>

            <div className="form-group" style={{ marginBottom: '14px' }}>
              <label className="form-label" style={{ color: '#CBD5E1', fontSize: '0.85rem' }}>Admin Official Email</label>
              <input
                type="email"
                className="form-control"
                placeholder="e.g. rakesh@college.edu"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                style={{ background: '#0B0F19', border: '1px solid #374151', color: '#FFFFFF', borderRadius: '8px' }}
              />
            </div>

            <div className="form-group" style={{ marginBottom: '20px' }}>
              <label className="form-label" style={{ color: '#CBD5E1', fontSize: '0.85rem' }}>Login Password *</label>
              <div style={{ position: 'relative' }}>
                <input
                  type={showPassword ? 'text' : 'password'}
                  className="form-control"
                  placeholder="Set admin login password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  style={{ background: '#0B0F19', border: '1px solid #374151', color: '#FFFFFF', paddingRight: '40px', borderRadius: '8px' }}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  style={{
                    position: 'absolute',
                    right: '12px',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    color: '#9CA3AF',
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                  }}
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            {/* SUBJECT ASSIGNMENT CONTROLS */}
            <div
              style={{
                background: '#0B0F19',
                borderRadius: '12px',
                padding: '16px',
                border: '1px solid #1F2937',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
                <BookOpen size={16} color="#818CF8" />
                <span style={{ fontSize: '0.875rem', fontWeight: 700, color: '#FFFFFF' }}>
                  Teaching Subject Allocation
                </span>
              </div>

              {/* Toggle: All Subjects vs Specific */}
              <div style={{ display: 'flex', gap: '12px', marginBottom: '14px' }}>
                <label
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    cursor: 'pointer',
                    fontSize: '0.85rem',
                    color: assignAllSubjects ? '#A5B4FC' : '#9CA3AF',
                    fontWeight: assignAllSubjects ? 700 : 500,
                  }}
                >
                  <input
                    type="radio"
                    name="subjectScope"
                    checked={assignAllSubjects}
                    onChange={() => setAssignAllSubjects(true)}
                  />
                  <span>All Subjects (Full Department Access)</span>
                </label>

                <label
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    cursor: 'pointer',
                    fontSize: '0.85rem',
                    color: !assignAllSubjects ? '#67E8F9' : '#9CA3AF',
                    fontWeight: !assignAllSubjects ? 700 : 500,
                  }}
                >
                  <input
                    type="radio"
                    name="subjectScope"
                    checked={!assignAllSubjects}
                    onChange={() => setAssignAllSubjects(false)}
                  />
                  <span>Specific Subjects Only</span>
                </label>
              </div>

              {/* Specific Checkboxes */}
              {!assignAllSubjects && (
                <div
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '8px',
                    paddingTop: '8px',
                    borderTop: '1px solid #1F2937',
                  }}
                >
                  <div style={{ fontSize: '0.75rem', color: '#9CA3AF', marginBottom: '4px' }}>
                    Select one or more subjects assigned to this admin:
                  </div>

                  {subjectsToDisplay.map((subj) => {
                    const isChecked = selectedSubjects.includes(subj.name);

                    return (
                      <label
                        key={subj.id || subj.name}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '10px',
                          padding: '8px 12px',
                          borderRadius: '8px',
                          background: isChecked ? 'rgba(99, 102, 241, 0.15)' : '#111827',
                          border: `1px solid ${isChecked ? 'rgba(99, 102, 241, 0.4)' : '#1F2937'}`,
                          cursor: 'pointer',
                          transition: 'all 0.15s ease',
                        }}
                      >
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => handleToggleSubject(subj.name)}
                          style={{ accentColor: '#6366F1' }}
                        />
                        <div style={{ flex: 1 }}>
                          <span style={{ fontSize: '0.85rem', fontWeight: 600, color: isChecked ? '#FFFFFF' : '#D1D5DB' }}>
                            {subj.name}
                          </span>
                          {subj.code && (
                            <span style={{ fontSize: '0.7rem', color: '#6B7280', marginLeft: '6px' }}>
                              ({subj.code})
                            </span>
                          )}
                        </div>
                      </label>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          <div className="modal-footer" style={{ borderTop: '1px solid #1F2937', display: 'flex', justifyContent: 'flex-end', gap: '10px', padding: '16px 22px' }}>
            <button
              type="button"
              className="btn btn-secondary"
              onClick={onClose}
              style={{ background: '#1F2937', color: '#D1D5DB', borderColor: '#374151' }}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="btn btn-primary"
              style={{
                background: 'linear-gradient(135deg, #6366F1 0%, #4F46E5 100%)',
                borderColor: '#6366F1',
                padding: '8px 18px',
                fontWeight: 700,
              }}
            >
              Save Admin Account
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
