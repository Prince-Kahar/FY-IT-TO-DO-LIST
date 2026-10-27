import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ShieldAlert,
  UserPlus,
  Trash2,
  Edit,
  Power,
  Users,
  CheckCircle2,
  AlertTriangle,
  X,
  Loader2,
  LogOut,
  RefreshCw,
  Eye,
  EyeOff,
  Copy,
  Check,
  BookOpen,
  Sparkles,
  Megaphone,
  Plus,
  Bell,
  Send,
  Calendar,
  Layers,
  GraduationCap,
  Info,
  Paperclip,
  ExternalLink,
  FileText,
  File,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { dataService } from '../../lib/dataService';
import { pushService } from '../../lib/pushNotificationService';
import { AttachmentActions } from '../../components/AttachmentActions';

export const SuperAdminDashboard = () => {
  const { user, profile, logout } = useAuth();
  const { addToast } = useToast();
  const navigate = useNavigate();

  // Navigation tab state: 'admins' | 'subjects' | 'broadcasts'
  const [activeTab, setActiveTab] = useState('admins');

  // Core Data States
  const [admins, setAdmins] = useState(() => dataService.getCachedAdmins());
  const [availableSubjects, setAvailableSubjects] = useState(() => dataService.getCachedSubjects());
  const [announcements, setAnnouncements] = useState(() => dataService.getCachedAnnouncements());
  const [studentsCount, setStudentsCount] = useState(() => dataService.getCachedStudents()?.length || 0);
  const [tasksCount, setTasksCount] = useState(() => dataService.getCachedTasks()?.length || 0);
  const [loading, setLoading] = useState(false);

  // Password visibility & clipboard state
  const [showAllPasswords, setShowAllPasswords] = useState(false);
  const [visiblePasswords, setVisiblePasswords] = useState({});
  const [copiedAdminId, setCopiedAdminId] = useState(null);

  // Modals
  const [isAddAdminModalOpen, setIsAddAdminModalOpen] = useState(false);
  const [adminToEdit, setAdminToEdit] = useState(null);
  const [adminToDelete, setAdminToDelete] = useState(null);

  const [isSubjectModalOpen, setIsSubjectModalOpen] = useState(false);
  const [subjectToEdit, setSubjectToEdit] = useState(null);
  const [subjectToDelete, setSubjectToDelete] = useState(null);

  const [isBroadcastModalOpen, setIsBroadcastModalOpen] = useState(false);
  const [announcementToDelete, setAnnouncementToDelete] = useState(null);

  const loadData = async (isBackground = false) => {
    if (!isBackground) setLoading(true);
    try {
      const [adminList, subList, stList, tList, annList] = await Promise.all([
        dataService.fetchAdminsFromSupabase(),
        dataService.getSubjects(),
        dataService.getStudents(),
        dataService.getTasks(),
        dataService.getAnnouncements(),
      ]);

      setAdmins(adminList || []);
      setAvailableSubjects(subList || []);
      setStudentsCount(stList?.length || 0);
      setTasksCount(tList?.length || 0);
      setAnnouncements(annList || []);
    } catch (err) {
      console.error('Error loading super admin data:', err);
    } finally {
      if (!isBackground) setLoading(false);
    }
  };

  useEffect(() => {
    loadData();

    // 1. Live polling every 1 second
    const interval = setInterval(() => {
      loadData(true);
    }, 1000);

    // 2. Realtime subscription
    const unsub = dataService.subscribeRealtime(() => {
      loadData(true);
    });

    return () => {
      clearInterval(interval);
      if (unsub) unsub();
    };
  }, []);

  // Admin Actions
  const handleToggleAdminStatus = async (admin) => {
    try {
      await dataService.updateAdmin(admin.id, { is_active: !admin.is_active });
      addToast(
        `Admin account for ${admin.full_name} is now ${!admin.is_active ? 'Active' : 'Deactivated'}.`,
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

  // Subject Actions
  const handleToggleSubjectActive = async (sub) => {
    try {
      await dataService.updateSubject(sub.id, { is_active: !sub.is_active });
      addToast(
        `Subject "${sub.name}" marked as ${!sub.is_active ? 'Active' : 'Inactive'}.`,
        'info'
      );
      loadData(true);
    } catch (err) {
      addToast(err.message || 'Failed to update subject status', 'error');
    }
  };

  const handleDeleteSubject = async () => {
    if (!subjectToDelete) return;
    const targetId = subjectToDelete.id;
    const targetName = subjectToDelete.name;
    try {
      setAvailableSubjects((prev) => prev.filter((s) => s.id !== targetId));
      await dataService.deleteSubject(targetId);
      addToast(`Subject "${targetName}" removed from curriculum.`, 'info');
      setSubjectToDelete(null);
      await loadData(false);
    } catch (err) {
      addToast(err.message || 'Failed to delete subject', 'error');
      loadData(false);
    }
  };

  // Announcement Actions
  const handleDeleteAnnouncement = async () => {
    if (!announcementToDelete) return;
    try {
      await dataService.deleteAnnouncement(announcementToDelete.id);
      addToast('Notice removed successfully.', 'info');
      setAnnouncementToDelete(null);
      loadData(true);
    } catch (err) {
      addToast(err.message || 'Failed to delete announcement', 'error');
    }
  };

  const handleLogout = async () => {
    await logout();
    navigate('/superadmin');
  };

  return (
    <div
      style={{
        minHeight: '100vh',
        background: '#F8FAFC',
        color: '#0F172A',
        fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, sans-serif",
      }}
    >
      {/* Light Mode Executive Header */}
      <header
        style={{
          background: '#FFFFFF',
          borderBottom: '1px solid #E2E8F0',
          padding: '16px 32px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '16px',
          boxShadow: '0 1px 4px rgba(0, 0, 0, 0.05)',
          position: 'sticky',
          top: 0,
          zIndex: 40,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <div
            style={{
              width: 48,
              height: 48,
              borderRadius: '12px',
              background: 'linear-gradient(135deg, #4F46E5 0%, #7C3AED 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 4px 14px rgba(79, 70, 229, 0.35)',
            }}
          >
            <ShieldAlert size={26} color="#FFFFFF" />
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <h1 style={{ fontSize: '1.25rem', fontWeight: 800, margin: 0, color: '#0F172A', letterSpacing: '-0.02em' }}>
                STERS Super Administrator Console
              </h1>
              <span
                style={{
                  background: '#EEF2FF',
                  color: '#4F46E5',
                  border: '1px solid #C7D2FE',
                  fontSize: '0.675rem',
                  fontWeight: 800,
                  padding: '3px 10px',
                  borderRadius: '999px',
                  letterSpacing: '0.06em',
                  textTransform: 'uppercase',
                }}
              >
                MASTER CONTROL
              </span>
            </div>
            <p style={{ fontSize: '0.8rem', color: '#64748B', margin: '3px 0 0 0' }}>
              Departmental Governance • Admin Accounts • Academic Subjects • Campus Broadcasts
            </p>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          {/* Live Sync Status */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              background: '#ECFDF5',
              border: '1px solid #A7F3D0',
              padding: '6px 12px',
              borderRadius: '999px',
              fontSize: '0.75rem',
              color: '#047857',
              fontWeight: 600,
            }}
          >
            <span
              style={{
                width: 8,
                height: 8,
                borderRadius: '50%',
                background: '#10B981',
                boxShadow: '0 0 6px #10B981',
              }}
            />
            <span>Supabase Sync Active</span>
          </div>

          <button
            type="button"
            className="btn btn-secondary btn-sm"
            onClick={() => loadData(false)}
            style={{
              background: '#FFFFFF',
              color: '#334155',
              borderColor: '#CBD5E1',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '8px 14px',
              borderRadius: '8px',
              fontWeight: 600,
              boxShadow: '0 1px 2px rgba(0, 0, 0, 0.05)',
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
              background: '#FEF2F2',
              color: '#DC2626',
              borderColor: '#FECACA',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '8px 14px',
              borderRadius: '8px',
              fontWeight: 600,
            }}
          >
            <LogOut size={14} />
            <span>Sign Out</span>
          </button>
        </div>
      </header>

      {/* Main Container */}
      <main style={{ maxWidth: '1360px', margin: '0 auto', padding: '28px 24px' }}>
        {/* KPI Metrics Grid in Crisp Light Mode */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(230px, 1fr))',
            gap: '16px',
            marginBottom: '24px',
          }}
        >
          {/* Card 1: Faculty Admins */}
          <div
            style={{
              background: '#FFFFFF',
              padding: '20px 22px',
              borderRadius: '12px',
              border: '1px solid #E2E8F0',
              boxShadow: '0 1px 3px rgba(0, 0, 0, 0.05)',
              position: 'relative',
              overflow: 'hidden',
            }}
          >
            <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '4px', background: '#6366F1' }} />
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ fontSize: '0.8rem', color: '#64748B', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                Faculty Admins
              </div>
              <Users size={18} color="#6366F1" />
            </div>
            <div style={{ fontSize: '1.85rem', fontWeight: 800, color: '#1E293B', marginTop: '8px' }}>
              {admins.filter((a) => a.is_active).length} <span style={{ fontSize: '1.05rem', color: '#94A3B8' }}>/ {admins.length}</span>
            </div>
            <div style={{ fontSize: '0.75rem', color: '#64748B', marginTop: '4px' }}>
              Authorized Department Teachers
            </div>
          </div>

          {/* Card 2: Curriculum Subjects */}
          <div
            style={{
              background: '#FFFFFF',
              padding: '20px 22px',
              borderRadius: '12px',
              border: '1px solid #E2E8F0',
              boxShadow: '0 1px 3px rgba(0, 0, 0, 0.05)',
              position: 'relative',
              overflow: 'hidden',
            }}
          >
            <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '4px', background: '#0284C7' }} />
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ fontSize: '0.8rem', color: '#64748B', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                Academic Subjects
              </div>
              <BookOpen size={18} color="#0284C7" />
            </div>
            <div style={{ fontSize: '1.85rem', fontWeight: 800, color: '#0369A1', marginTop: '8px' }}>
              {availableSubjects.length}
            </div>
            <div style={{ fontSize: '0.75rem', color: '#64748B', marginTop: '4px' }}>
              Active Course Modules in Database
            </div>
          </div>

          {/* Card 3: Registered Students */}
          <div
            style={{
              background: '#FFFFFF',
              padding: '20px 22px',
              borderRadius: '12px',
              border: '1px solid #E2E8F0',
              boxShadow: '0 1px 3px rgba(0, 0, 0, 0.05)',
              position: 'relative',
              overflow: 'hidden',
            }}
          >
            <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '4px', background: '#10B981' }} />
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ fontSize: '0.8rem', color: '#64748B', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                Registered Students
              </div>
              <GraduationCap size={18} color="#10B981" />
            </div>
            <div style={{ fontSize: '1.85rem', fontWeight: 800, color: '#047857', marginTop: '8px' }}>
              {studentsCount}
            </div>
            <div style={{ fontSize: '0.75rem', color: '#64748B', marginTop: '4px' }}>
              Live in `public.students` Table
            </div>
          </div>

          {/* Card 4: Broadcasts & Notifications */}
          <div
            style={{
              background: '#FFFFFF',
              padding: '20px 22px',
              borderRadius: '12px',
              border: '1px solid #E2E8F0',
              boxShadow: '0 1px 3px rgba(0, 0, 0, 0.05)',
              position: 'relative',
              overflow: 'hidden',
            }}
          >
            <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '4px', background: '#F59E0B' }} />
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ fontSize: '0.8rem', color: '#64748B', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                Campus Notices
              </div>
              <Megaphone size={18} color="#F59E0B" />
            </div>
            <div style={{ fontSize: '1.85rem', fontWeight: 800, color: '#B45309', marginTop: '8px' }}>
              {announcements.length}
            </div>
            <div style={{ fontSize: '0.75rem', color: '#64748B', marginTop: '4px' }}>
              Active Student & Faculty Broadcasts
            </div>
          </div>
        </div>

        {/* Tab Navigation Segmented Bar (Horizontally scrollable on mobile) */}
        <div
          className="tab-scroll-bar"
          style={{
            background: '#FFFFFF',
            padding: '6px',
            borderRadius: '12px',
            border: '1px solid #E2E8F0',
            marginBottom: '24px',
            boxShadow: '0 1px 2px rgba(0, 0, 0, 0.04)',
          }}
        >
          <button
            type="button"
            onClick={() => setActiveTab('admins')}
            style={{
              flexShrink: 0,
              whiteSpace: 'nowrap',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
              padding: '10px 16px',
              borderRadius: '8px',
              border: 'none',
              cursor: 'pointer',
              fontWeight: 700,
              fontSize: '0.875rem',
              transition: 'all 0.15s ease',
              background: activeTab === 'admins' ? '#4F46E5' : 'transparent',
              color: activeTab === 'admins' ? '#FFFFFF' : '#64748B',
              boxShadow: activeTab === 'admins' ? '0 2px 8px rgba(79, 70, 229, 0.25)' : 'none',
            }}
          >
            <Users size={16} />
            <span>Faculty Admins & Subject Assignment</span>
            <span
              style={{
                fontSize: '0.725rem',
                padding: '2px 8px',
                borderRadius: '999px',
                background: activeTab === 'admins' ? 'rgba(255,255,255,0.2)' : '#F1F5F9',
                color: activeTab === 'admins' ? '#FFFFFF' : '#475569',
              }}
            >
              {admins.length}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('subjects')}
            style={{
              flexShrink: 0,
              whiteSpace: 'nowrap',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
              padding: '10px 16px',
              borderRadius: '8px',
              border: 'none',
              cursor: 'pointer',
              fontWeight: 700,
              fontSize: '0.875rem',
              transition: 'all 0.15s ease',
              background: activeTab === 'subjects' ? '#4F46E5' : 'transparent',
              color: activeTab === 'subjects' ? '#FFFFFF' : '#64748B',
              boxShadow: activeTab === 'subjects' ? '0 2px 8px rgba(79, 70, 229, 0.25)' : 'none',
            }}
          >
            <BookOpen size={16} />
            <span>Academic Curriculum & Subjects</span>
            <span
              style={{
                fontSize: '0.725rem',
                padding: '2px 8px',
                borderRadius: '999px',
                background: activeTab === 'subjects' ? 'rgba(255,255,255,0.2)' : '#F1F5F9',
                color: activeTab === 'subjects' ? '#FFFFFF' : '#475569',
              }}
            >
              {availableSubjects.length}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('broadcasts')}
            style={{
              flexShrink: 0,
              whiteSpace: 'nowrap',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
              padding: '10px 16px',
              borderRadius: '8px',
              border: 'none',
              cursor: 'pointer',
              fontWeight: 700,
              fontSize: '0.875rem',
              transition: 'all 0.15s ease',
              background: activeTab === 'broadcasts' ? '#4F46E5' : 'transparent',
              color: activeTab === 'broadcasts' ? '#FFFFFF' : '#64748B',
              boxShadow: activeTab === 'broadcasts' ? '0 2px 8px rgba(79, 70, 229, 0.25)' : 'none',
            }}
          >
            <Megaphone size={16} />
            <span>Broadcasts & Notifications</span>
            <span
              style={{
                fontSize: '0.725rem',
                padding: '2px 8px',
                borderRadius: '999px',
                background: activeTab === 'broadcasts' ? 'rgba(255,255,255,0.2)' : '#F1F5F9',
                color: activeTab === 'broadcasts' ? '#FFFFFF' : '#475569',
              }}
            >
              {announcements.length}
            </span>
          </button>
        </div>

        {/* =========================================================================
            TAB 1: FACULTY ADMINS & SUBJECT ASSIGNMENTS
           ========================================================================= */}
        {activeTab === 'admins' && (
          <div>
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
                <h2 style={{ fontSize: '1.25rem', fontWeight: 800, margin: 0, color: '#0F172A' }}>
                  Faculty Administrators & Subject Access Control
                </h2>
                <p style={{ fontSize: '0.825rem', color: '#64748B', margin: '3px 0 0 0' }}>
                  Assign specific subjects or "All Subjects" to individual faculty members, view credentials, and govern access rights.
                </p>
              </div>

              <button
                type="button"
                className="btn btn-primary"
                onClick={() => setIsAddAdminModalOpen(true)}
                style={{
                  background: 'linear-gradient(135deg, #4F46E5 0%, #4338CA 100%)',
                  borderColor: '#4F46E5',
                  boxShadow: '0 2px 10px rgba(79, 70, 229, 0.3)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  padding: '9px 16px',
                  borderRadius: '8px',
                  fontWeight: 700,
                  fontSize: '0.875rem',
                }}
              >
                <UserPlus size={16} />
                <span>Add New Admin</span>
              </button>
            </div>

            {/* Admins Table */}
            <div
              style={{
                background: '#FFFFFF',
                borderRadius: '12px',
                border: '1px solid #E2E8F0',
                boxShadow: '0 2px 10px rgba(0, 0, 0, 0.04)',
                overflow: 'hidden',
              }}
            >
              <div style={{ overflowX: 'auto' }}>
                <table className="table" style={{ width: '100%', borderCollapse: 'collapse', color: '#1E293B' }}>
                  <thead>
                    <tr style={{ background: '#F8FAFC', borderBottom: '1px solid #E2E8F0' }}>
                      <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '0.75rem', color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                        FACULTY / ADMIN
                      </th>
                      <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '0.75rem', color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                        USERNAME
                      </th>
                      <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '0.75rem', color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <span>PASSWORD</span>
                          <button
                            type="button"
                            onClick={() => setShowAllPasswords(!showAllPasswords)}
                            style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#4F46E5', padding: 0 }}
                            title={showAllPasswords ? 'Hide all passwords' : 'Show all passwords'}
                          >
                            {showAllPasswords ? <EyeOff size={13} /> : <Eye size={13} />}
                          </button>
                        </div>
                      </th>
                      <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '0.75rem', color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                        ASSIGNED SUBJECTS
                      </th>
                      <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '0.75rem', color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                        STATUS
                      </th>
                      <th style={{ padding: '12px 16px', textAlign: 'right', fontSize: '0.75rem', color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                        ACTIONS
                      </th>
                    </tr>
                  </thead>

                  <tbody>
                    {admins.length === 0 ? (
                      <tr>
                        <td colSpan={6} style={{ padding: '36px', textAlign: 'center', color: '#64748B' }}>
                          <Users size={32} style={{ margin: '0 auto 8px', opacity: 0.5 }} />
                          <p style={{ margin: 0, fontWeight: 600 }}>No faculty admins registered yet.</p>
                          <p style={{ margin: '4px 0 0 0', fontSize: '0.8rem' }}>Click "Add New Admin" to create the first faculty account.</p>
                        </td>
                      </tr>
                    ) : (
                      admins.map((adm) => {
                        const isPasswordRevealed = showAllPasswords || visiblePasswords[adm.id];
                        const hasAllSubjects = !adm.assigned_subjects || adm.assigned_subjects.includes('ALL');

                        return (
                          <tr
                            key={adm.id}
                            style={{
                              borderBottom: '1px solid #F1F5F9',
                              transition: 'background 0.15s ease',
                            }}
                            onMouseEnter={(e) => (e.currentTarget.style.background = '#F8FAFC')}
                            onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                          >
                            {/* Faculty Name & Department */}
                            <td style={{ padding: '14px 16px' }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                <div
                                  style={{
                                    width: 38,
                                    height: 38,
                                    borderRadius: '10px',
                                    background: '#EEF2FF',
                                    color: '#4F46E5',
                                    border: '1px solid #C7D2FE',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    fontWeight: 800,
                                    fontSize: '0.85rem',
                                  }}
                                >
                                  {adm.full_name?.charAt(0) || 'A'}
                                </div>
                                <div>
                                  <div style={{ fontWeight: 700, color: '#0F172A', fontSize: '0.9rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                    <span>{adm.full_name}</span>
                                    {adm.is_default && (
                                      <span
                                        style={{
                                          background: '#EEF2FF',
                                          color: '#4F46E5',
                                          border: '1px solid #C7D2FE',
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
                                  <div style={{ fontSize: '0.75rem', color: '#64748B', marginTop: '2px' }}>
                                    {adm.department || 'Information Technology'} • {adm.email || 'No email set'}
                                  </div>
                                </div>
                              </div>
                            </td>

                            {/* Username */}
                            <td style={{ padding: '14px 16px' }}>
                              <code
                                style={{
                                  background: '#F1F5F9',
                                  color: '#0284C7',
                                  border: '1px solid #E2E8F0',
                                  padding: '3px 8px',
                                  borderRadius: '6px',
                                  fontSize: '0.85rem',
                                  fontWeight: 600,
                                  fontFamily: 'monospace',
                                }}
                              >
                                {adm.username}
                              </code>
                            </td>

                            {/* Password with Eye/Copy */}
                            <td style={{ padding: '14px 16px' }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <code
                                  style={{
                                    background: '#FFFBEB',
                                    color: '#B45309',
                                    border: '1px solid #FDE68A',
                                    padding: '3px 8px',
                                    borderRadius: '6px',
                                    fontSize: '0.85rem',
                                    fontFamily: 'monospace',
                                    minWidth: '90px',
                                    display: 'inline-block',
                                  }}
                                >
                                  {isPasswordRevealed ? adm.password : '••••••••'}
                                </code>
                                <button
                                  type="button"
                                  onClick={() => togglePasswordVisibility(adm.id)}
                                  style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748B', padding: '2px' }}
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
                                    color: copiedAdminId === adm.id ? '#10B981' : '#64748B',
                                    padding: '2px',
                                  }}
                                  title="Copy Password"
                                >
                                  {copiedAdminId === adm.id ? <Check size={14} /> : <Copy size={14} />}
                                </button>
                              </div>
                            </td>

                            {/* Assigned Subjects */}
                            <td style={{ padding: '14px 16px' }}>
                              {hasAllSubjects ? (
                                <span
                                  style={{
                                    background: '#F3E8FF',
                                    color: '#7E22CE',
                                    border: '1px solid #E9D5FF',
                                    padding: '4px 10px',
                                    borderRadius: '6px',
                                    fontSize: '0.75rem',
                                    fontWeight: 700,
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    gap: '6px',
                                  }}
                                >
                                  <Sparkles size={12} color="#A855F7" />
                                  <span>All Subjects (Full Access)</span>
                                </span>
                              ) : (
                                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', maxWidth: '300px' }}>
                                  {adm.assigned_subjects.map((sub, idx) => (
                                    <span
                                      key={idx}
                                      style={{
                                        background: '#E0F2FE',
                                        color: '#0369A1',
                                        border: '1px solid #BAE6FD',
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
                            <td style={{ padding: '14px 16px' }}>
                              <span
                                style={{
                                  background: adm.is_active ? '#ECFDF5' : '#F1F5F9',
                                  color: adm.is_active ? '#047857' : '#64748B',
                                  padding: '3px 10px',
                                  borderRadius: '999px',
                                  fontSize: '0.75rem',
                                  fontWeight: 700,
                                  border: `1px solid ${adm.is_active ? '#A7F3D0' : '#E2E8F0'}`,
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: '5px',
                                }}
                              >
                                <span
                                  style={{
                                    width: 6,
                                    height: 6,
                                    borderRadius: '50%',
                                    background: adm.is_active ? '#10B981' : '#94A3B8',
                                  }}
                                />
                                {adm.is_active ? 'Active' : 'Deactivated'}
                              </span>
                            </td>

                            {/* Actions */}
                            <td style={{ padding: '14px 16px', textAlign: 'right' }}>
                              <div style={{ display: 'inline-flex', gap: '6px' }}>
                                <button
                                  type="button"
                                  className="btn btn-secondary btn-sm"
                                  onClick={() => setAdminToEdit(adm)}
                                  title="Edit Admin & Subject Assignments"
                                  style={{
                                    background: '#FFFFFF',
                                    color: '#334155',
                                    borderColor: '#CBD5E1',
                                    padding: '5px 9px',
                                    borderRadius: '6px',
                                  }}
                                >
                                  <Edit size={13} />
                                  <span>Edit</span>
                                </button>

                                <button
                                  type="button"
                                  className="btn btn-secondary btn-sm"
                                  onClick={() => handleToggleAdminStatus(adm)}
                                  title={adm.is_active ? 'Deactivate Admin' : 'Activate Admin'}
                                  style={{
                                    background: '#FFFFFF',
                                    color: adm.is_active ? '#DC2626' : '#16A34A',
                                    borderColor: '#CBD5E1',
                                    padding: '5px 9px',
                                    borderRadius: '6px',
                                  }}
                                >
                                  <Power size={13} />
                                </button>

                                {!adm.is_default && (
                                  <button
                                    type="button"
                                    className="btn btn-secondary btn-sm"
                                    onClick={() => setAdminToDelete(adm)}
                                    title="Delete Admin"
                                    style={{
                                      background: '#FEF2F2',
                                      color: '#DC2626',
                                      borderColor: '#FECACA',
                                      padding: '5px 9px',
                                      borderRadius: '6px',
                                    }}
                                  >
                                    <Trash2 size={13} />
                                  </button>
                                )}
                              </div>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* =========================================================================
            TAB 2: ACADEMIC CURRICULUM & SUBJECTS
           ========================================================================= */}
        {activeTab === 'subjects' && (
          <div>
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
                <h2 style={{ fontSize: '1.25rem', fontWeight: 800, margin: 0, color: '#0F172A' }}>
                  Curriculum Subjects & Course Modules
                </h2>
                <p style={{ fontSize: '0.825rem', color: '#64748B', margin: '3px 0 0 0' }}>
                  Create and manage academic subjects. All changes sync directly to Supabase and update faculty allocation options.
                </p>
              </div>

              <button
                type="button"
                className="btn btn-primary"
                onClick={() => {
                  setSubjectToEdit(null);
                  setIsSubjectModalOpen(true);
                }}
                style={{
                  background: 'linear-gradient(135deg, #4F46E5 0%, #4338CA 100%)',
                  borderColor: '#4F46E5',
                  boxShadow: '0 2px 10px rgba(79, 70, 229, 0.3)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  padding: '9px 16px',
                  borderRadius: '8px',
                  fontWeight: 700,
                  fontSize: '0.875rem',
                }}
              >
                <Plus size={16} />
                <span>Add New Subject</span>
              </button>
            </div>

            {/* Subjects Table */}
            <div
              style={{
                background: '#FFFFFF',
                borderRadius: '12px',
                border: '1px solid #E2E8F0',
                boxShadow: '0 2px 10px rgba(0, 0, 0, 0.04)',
                overflow: 'hidden',
              }}
            >
              <div style={{ overflowX: 'auto' }}>
                <table className="table" style={{ width: '100%', borderCollapse: 'collapse', color: '#1E293B' }}>
                  <thead>
                    <tr style={{ background: '#F8FAFC', borderBottom: '1px solid #E2E8F0' }}>
                      <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '0.75rem', color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                        SUBJECT NAME & DESCRIPTION
                      </th>
                      <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '0.75rem', color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                        COURSE CODE
                      </th>
                      <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '0.75rem', color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                        FACULTY / INSTRUCTOR
                      </th>
                      <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '0.75rem', color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                        STATUS
                      </th>
                      <th style={{ padding: '12px 16px', textAlign: 'right', fontSize: '0.75rem', color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                        ACTIONS
                      </th>
                    </tr>
                  </thead>

                  <tbody>
                    {availableSubjects.length === 0 ? (
                      <tr>
                        <td colSpan={5} style={{ padding: '36px', textAlign: 'center', color: '#64748B' }}>
                          <BookOpen size={32} style={{ margin: '0 auto 8px', opacity: 0.5 }} />
                          <p style={{ margin: 0, fontWeight: 600 }}>No curriculum subjects added yet.</p>
                          <p style={{ margin: '4px 0 0 0', fontSize: '0.8rem' }}>Click "Add New Subject" to configure your course units.</p>
                        </td>
                      </tr>
                    ) : (
                      availableSubjects.map((sub) => (
                        <tr
                          key={sub.id}
                          style={{
                            borderBottom: '1px solid #F1F5F9',
                            transition: 'background 0.15s ease',
                          }}
                          onMouseEnter={(e) => (e.currentTarget.style.background = '#F8FAFC')}
                          onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                        >
                          {/* Subject Name & Description */}
                          <td style={{ padding: '14px 16px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                              <div
                                style={{
                                  width: 38,
                                  height: 38,
                                  borderRadius: '10px',
                                  background: '#E0F2FE',
                                  color: '#0284C7',
                                  border: '1px solid #BAE6FD',
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  fontWeight: 800,
                                  fontSize: '0.9rem',
                                }}
                              >
                                <BookOpen size={18} />
                              </div>
                              <div>
                                <div style={{ fontWeight: 700, color: '#0F172A', fontSize: '0.925rem' }}>
                                  {sub.name}
                                </div>
                                <div style={{ fontSize: '0.75rem', color: '#64748B', marginTop: '2px', maxWidth: '340px' }}>
                                  {sub.description || 'Core academic syllabus course'}
                                </div>
                              </div>
                            </div>
                          </td>

                          {/* Code */}
                          <td style={{ padding: '14px 16px' }}>
                            <code
                              style={{
                                background: '#F1F5F9',
                                color: '#4F46E5',
                                border: '1px solid #E2E8F0',
                                padding: '3px 8px',
                                borderRadius: '6px',
                                fontSize: '0.85rem',
                                fontWeight: 700,
                                fontFamily: 'monospace',
                              }}
                            >
                              {sub.subject_code || 'FYS-GEN'}
                            </code>
                          </td>

                          {/* Teacher Name */}
                          <td style={{ padding: '14px 16px' }}>
                            <span style={{ fontSize: '0.85rem', color: '#334155', fontWeight: 600 }}>
                              {sub.teacher_name || 'Department Faculty'}
                            </span>
                          </td>

                          {/* Status */}
                          <td style={{ padding: '14px 16px' }}>
                            <span
                              style={{
                                background: sub.is_active ? '#ECFDF5' : '#F1F5F9',
                                color: sub.is_active ? '#047857' : '#64748B',
                                padding: '3px 10px',
                                borderRadius: '999px',
                                fontSize: '0.75rem',
                                fontWeight: 700,
                                border: `1px solid ${sub.is_active ? '#A7F3D0' : '#E2E8F0'}`,
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '5px',
                              }}
                            >
                              <span
                                style={{
                                  width: 6,
                                  height: 6,
                                  borderRadius: '50%',
                                  background: sub.is_active ? '#10B981' : '#94A3B8',
                                }}
                              />
                              {sub.is_active ? 'Active' : 'Inactive'}
                            </span>
                          </td>

                          {/* Actions */}
                          <td style={{ padding: '14px 16px', textAlign: 'right' }}>
                            <div style={{ display: 'inline-flex', gap: '6px' }}>
                              <button
                                type="button"
                                className="btn btn-secondary btn-sm"
                                onClick={() => {
                                  setSubjectToEdit(sub);
                                  setIsSubjectModalOpen(true);
                                }}
                                title="Edit Subject Details"
                                style={{
                                  background: '#FFFFFF',
                                  color: '#334155',
                                  borderColor: '#CBD5E1',
                                  padding: '5px 9px',
                                  borderRadius: '6px',
                                }}
                              >
                                <Edit size={13} />
                                <span>Edit</span>
                              </button>

                              <button
                                type="button"
                                className="btn btn-secondary btn-sm"
                                onClick={() => handleToggleSubjectActive(sub)}
                                title={sub.is_active ? 'Deactivate Subject' : 'Activate Subject'}
                                style={{
                                  background: '#FFFFFF',
                                  color: sub.is_active ? '#DC2626' : '#16A34A',
                                  borderColor: '#CBD5E1',
                                  padding: '5px 9px',
                                  borderRadius: '6px',
                                }}
                              >
                                <Power size={13} />
                              </button>

                              <button
                                type="button"
                                className="btn btn-secondary btn-sm"
                                onClick={() => setSubjectToDelete(sub)}
                                title="Delete Subject"
                                style={{
                                  background: '#FEF2F2',
                                  color: '#DC2626',
                                  borderColor: '#FECACA',
                                  padding: '5px 9px',
                                  borderRadius: '6px',
                                }}
                              >
                                <Trash2 size={13} />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* =========================================================================
            TAB 3: BROADCASTS & NOTIFICATIONS
           ========================================================================= */}
        {activeTab === 'broadcasts' && (
          <div>
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
                <h2 style={{ fontSize: '1.25rem', fontWeight: 800, margin: 0, color: '#0F172A' }}>
                  Campus Announcements & Broadcast Alerts
                </h2>
                <p style={{ fontSize: '0.825rem', color: '#64748B', margin: '3px 0 0 0' }}>
                  Broadcast instant notifications, deadline alerts, and unit test schedules to students and faculty members.
                </p>
              </div>

              <button
                type="button"
                className="btn btn-primary"
                onClick={() => setIsBroadcastModalOpen(true)}
                style={{
                  background: 'linear-gradient(135deg, #4F46E5 0%, #4338CA 100%)',
                  borderColor: '#4F46E5',
                  boxShadow: '0 2px 10px rgba(79, 70, 229, 0.3)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  padding: '9px 16px',
                  borderRadius: '8px',
                  fontWeight: 700,
                  fontSize: '0.875rem',
                }}
              >
                <Plus size={16} />
                <span>Broadcast New Notice</span>
              </button>
            </div>

            {/* Broadcast Feed */}
            {announcements.length === 0 ? (
              <div
                style={{
                  background: '#FFFFFF',
                  borderRadius: '12px',
                  border: '1px solid #E2E8F0',
                  padding: '48px 24px',
                  textAlign: 'center',
                  boxShadow: '0 1px 3px rgba(0, 0, 0, 0.04)',
                }}
              >
                <Megaphone size={36} color="#94A3B8" style={{ margin: '0 auto 12px' }} />
                <h3 style={{ fontSize: '1.05rem', fontWeight: 700, margin: 0, color: '#1E293B' }}>
                  No Active Broadcasts
                </h3>
                <p style={{ fontSize: '0.85rem', color: '#64748B', maxWidth: '420px', margin: '6px auto 16px' }}>
                  Post your first campus announcement or urgent notification to reach all FY IT students and teachers.
                </p>
                <button
                  type="button"
                  className="btn btn-primary btn-sm"
                  onClick={() => setIsBroadcastModalOpen(true)}
                >
                  <Plus size={14} />
                  <span>Create First Broadcast</span>
                </button>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                {announcements.map((ann) => {
                  const priorityColors = {
                    Urgent: { bg: '#FEF2F2', text: '#DC2626', border: '#FECACA' },
                    High: { bg: '#FFFBEB', text: '#D97706', border: '#FDE68A' },
                    Normal: { bg: '#EEF2FF', text: '#4F46E5', border: '#C7D2FE' },
                    Medium: { bg: '#EEF2FF', text: '#4F46E5', border: '#C7D2FE' },
                    Info: { bg: '#F0F9FF', text: '#0284C7', border: '#BAE6FD' },
                  };
                  const colors = priorityColors[ann.priority] || priorityColors.Normal;

                  return (
                    <div
                      key={ann.id}
                      style={{
                        background: '#FFFFFF',
                        borderRadius: '12px',
                        border: '1px solid #E2E8F0',
                        borderLeft: `4px solid ${colors.text}`,
                        padding: '18px 22px',
                        boxShadow: '0 1px 4px rgba(0, 0, 0, 0.04)',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'flex-start',
                        gap: '16px',
                        flexWrap: 'wrap',
                      }}
                    >
                      <div style={{ flex: 1, minWidth: '280px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap', marginBottom: '6px' }}>
                          <span
                            style={{
                              background: colors.bg,
                              color: colors.text,
                              border: `1px solid ${colors.border}`,
                              fontSize: '0.675rem',
                              fontWeight: 800,
                              padding: '2px 8px',
                              borderRadius: '4px',
                              textTransform: 'uppercase',
                              letterSpacing: '0.04em',
                            }}
                          >
                            {ann.priority || 'NORMAL'}
                          </span>

                          <span
                            style={{
                              background: '#F1F5F9',
                              color: '#475569',
                              fontSize: '0.7rem',
                              fontWeight: 600,
                              padding: '2px 8px',
                              borderRadius: '4px',
                            }}
                          >
                            Target: {ann.target_audience || 'All Students & Faculty'}
                          </span>

                          <span style={{ fontSize: '0.75rem', color: '#94A3B8', display: 'flex', alignItems: 'center', gap: '4px' }}>
                            <Calendar size={12} />
                            {new Date(ann.published_at || ann.created_at).toLocaleDateString('en-US', {
                              month: 'short',
                              day: 'numeric',
                              year: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit',
                            })}
                          </span>
                        </div>

                        <h3 style={{ fontSize: '1.025rem', fontWeight: 700, margin: '0 0 6px 0', color: '#0F172A' }}>
                          {ann.title}
                        </h3>

                        <p style={{ fontSize: '0.85rem', color: '#334155', margin: 0, lineHeight: 1.55, whiteSpace: 'pre-wrap' }}>
                          {ann.message || ann.content}
                        </p>

                        {ann.attachment && <AttachmentActions attachment={ann.attachment} theme="superadmin" />}

                        <div style={{ fontSize: '0.725rem', color: '#64748B', marginTop: '10px' }}>
                          Published by: <strong>{ann.author_name || 'Super Administrator'}</strong>
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() => setAnnouncementToDelete(ann)}
                        title="Delete Announcement"
                        style={{
                          background: '#FEF2F2',
                          color: '#DC2626',
                          border: '1px solid #FECACA',
                          padding: '6px 12px',
                          borderRadius: '6px',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '6px',
                          fontSize: '0.8rem',
                          fontWeight: 600,
                        }}
                      >
                        <Trash2 size={13} />
                        <span>Delete</span>
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </main>

      {/* =========================================================================
          MODALS IN CRISP LIGHT MODE
         ========================================================================= */}

      {/* 1. Admin Add Modal */}
      {isAddAdminModalOpen && (
        <AdminModal
          title="Add New Faculty Administrator"
          availableSubjects={availableSubjects}
          onClose={() => setIsAddAdminModalOpen(false)}
          onSave={async (data) => {
            await dataService.createAdmin(data);
            addToast(`Admin "${data.full_name}" registered and assigned subjects!`, 'success');
            setIsAddAdminModalOpen(false);
            loadData(false);
          }}
        />
      )}

      {/* 2. Admin Edit Modal */}
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

      {/* 3. Subject Add / Edit Modal */}
      {isSubjectModalOpen && (
        <SuperSubjectModal
          subjectToEdit={subjectToEdit}
          onClose={() => {
            setIsSubjectModalOpen(false);
            setSubjectToEdit(null);
          }}
          onSave={async (payload) => {
            if (subjectToEdit) {
              await dataService.updateSubject(subjectToEdit.id, payload);
              addToast(`Subject "${payload.name}" updated successfully!`, 'success');
            } else {
              await dataService.createSubject(payload);
              addToast(`New subject "${payload.name}" added to curriculum!`, 'success');
            }
            setIsSubjectModalOpen(false);
            setSubjectToEdit(null);
            loadData(false);
          }}
        />
      )}

      {/* 4. Broadcast Notification Modal */}
      {isBroadcastModalOpen && (
        <SuperBroadcastModal
          onClose={() => setIsBroadcastModalOpen(false)}
          onBroadcast={async (payload) => {
            await dataService.broadcastNotification(payload);
            addToast('Broadcast announcement published to students & faculty!', 'success');
            setIsBroadcastModalOpen(false);
            loadData(false);
          }}
        />
      )}

      {/* 5. Delete Admin Confirmation Modal */}
      {adminToDelete && (
        <div className="modal-overlay" onClick={() => setAdminToDelete(null)}>
          <div
            className="modal-content"
            onClick={(e) => e.stopPropagation()}
            style={{ maxWidth: '440px', background: '#FFFFFF', color: '#0F172A', border: '1px solid #E2E8F0', borderRadius: '14px', boxShadow: '0 12px 30px rgba(0, 0, 0, 0.15)' }}
          >
            <div className="modal-header" style={{ borderBottom: '1px solid #E2E8F0', padding: '16px 20px' }}>
              <h3 className="modal-title" style={{ color: '#DC2626', fontSize: '1.05rem', fontWeight: 800 }}>
                Delete Administrator Account
              </h3>
              <button onClick={() => setAdminToDelete(null)} style={{ background: 'none', border: 'none', color: '#64748B', cursor: 'pointer' }}>
                <X size={18} />
              </button>
            </div>
            <div className="modal-body" style={{ padding: '20px' }}>
              <p style={{ fontSize: '0.9rem', color: '#334155', lineHeight: 1.5, margin: 0 }}>
                Are you sure you want to permanently delete the admin account for <strong>{adminToDelete.full_name}</strong> (Username: <code>{adminToDelete.username}</code>)?
              </p>
              <p style={{ fontSize: '0.8rem', color: '#64748B', marginTop: '10px', marginBottom: 0 }}>
                This will revoke their access to the Teacher portal and remove their record from Supabase.
              </p>
            </div>
            <div className="modal-footer" style={{ borderTop: '1px solid #E2E8F0', display: 'flex', justifyContent: 'flex-end', gap: '10px', padding: '14px 20px' }}>
              <button type="button" className="btn btn-secondary" onClick={() => setAdminToDelete(null)} style={{ background: '#FFFFFF', color: '#334155', borderColor: '#CBD5E1' }}>
                Cancel
              </button>
              <button
                type="button"
                className="btn btn-primary"
                onClick={handleDeleteAdmin}
                style={{ background: '#DC2626', borderColor: '#DC2626', fontWeight: 700 }}
              >
                Delete Account
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 6. Delete Subject Confirmation Modal */}
      {subjectToDelete && (
        <div className="modal-overlay" onClick={() => setSubjectToDelete(null)}>
          <div
            className="modal-content"
            onClick={(e) => e.stopPropagation()}
            style={{ maxWidth: '440px', background: '#FFFFFF', color: '#0F172A', border: '1px solid #E2E8F0', borderRadius: '14px', boxShadow: '0 12px 30px rgba(0, 0, 0, 0.15)' }}
          >
            <div className="modal-header" style={{ borderBottom: '1px solid #E2E8F0', padding: '16px 20px' }}>
              <h3 className="modal-title" style={{ color: '#DC2626', fontSize: '1.05rem', fontWeight: 800 }}>
                Delete Curriculum Subject
              </h3>
              <button onClick={() => setSubjectToDelete(null)} style={{ background: 'none', border: 'none', color: '#64748B', cursor: 'pointer' }}>
                <X size={18} />
              </button>
            </div>
            <div className="modal-body" style={{ padding: '20px' }}>
              <p style={{ fontSize: '0.9rem', color: '#334155', lineHeight: 1.5, margin: 0 }}>
                Are you sure you want to remove <strong>"{subjectToDelete.name}"</strong> ({subjectToDelete.subject_code || 'General'}) from the curriculum?
              </p>
              <p style={{ fontSize: '0.8rem', color: '#64748B', marginTop: '10px', marginBottom: 0 }}>
                Any tasks associated with this subject will remain in the database without subject linkage.
              </p>
            </div>
            <div className="modal-footer" style={{ borderTop: '1px solid #E2E8F0', display: 'flex', justifyContent: 'flex-end', gap: '10px', padding: '14px 20px' }}>
              <button type="button" className="btn btn-secondary" onClick={() => setSubjectToDelete(null)} style={{ background: '#FFFFFF', color: '#334155', borderColor: '#CBD5E1' }}>
                Cancel
              </button>
              <button
                type="button"
                className="btn btn-primary"
                onClick={handleDeleteSubject}
                style={{ background: '#DC2626', borderColor: '#DC2626', fontWeight: 700 }}
              >
                Delete Subject
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 7. Delete Announcement Confirmation Modal */}
      {announcementToDelete && (
        <div className="modal-overlay" onClick={() => setAnnouncementToDelete(null)}>
          <div
            className="modal-content"
            onClick={(e) => e.stopPropagation()}
            style={{ maxWidth: '440px', background: '#FFFFFF', color: '#0F172A', border: '1px solid #E2E8F0', borderRadius: '14px', boxShadow: '0 12px 30px rgba(0, 0, 0, 0.15)' }}
          >
            <div className="modal-header" style={{ borderBottom: '1px solid #E2E8F0', padding: '16px 20px' }}>
              <h3 className="modal-title" style={{ color: '#DC2626', fontSize: '1.05rem', fontWeight: 800 }}>
                Remove Announcement
              </h3>
              <button onClick={() => setAnnouncementToDelete(null)} style={{ background: 'none', border: 'none', color: '#64748B', cursor: 'pointer' }}>
                <X size={18} />
              </button>
            </div>
            <div className="modal-body" style={{ padding: '20px' }}>
              <p style={{ fontSize: '0.9rem', color: '#334155', lineHeight: 1.5, margin: 0 }}>
                Are you sure you want to delete the broadcast <strong>"{announcementToDelete.title}"</strong>?
              </p>
            </div>
            <div className="modal-footer" style={{ borderTop: '1px solid #E2E8F0', display: 'flex', justifyContent: 'flex-end', gap: '10px', padding: '14px 20px' }}>
              <button type="button" className="btn btn-secondary" onClick={() => setAnnouncementToDelete(null)} style={{ background: '#FFFFFF', color: '#334155', borderColor: '#CBD5E1' }}>
                Cancel
              </button>
              <button
                type="button"
                className="btn btn-primary"
                onClick={handleDeleteAnnouncement}
                style={{ background: '#DC2626', borderColor: '#DC2626', fontWeight: 700 }}
              >
                Delete Broadcast
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// =========================================================================
// SUB-COMPONENT: ADMIN CREATE / EDIT MODAL (Crisp Light Mode)
// =========================================================================
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
          background: '#FFFFFF',
          color: '#0F172A',
          border: '1px solid #E2E8F0',
          borderRadius: '16px',
          boxShadow: '0 20px 40px rgba(0, 0, 0, 0.12)',
        }}
      >
        <div className="modal-header" style={{ borderBottom: '1px solid #E2E8F0', padding: '18px 22px' }}>
          <div>
            <h3 className="modal-title" style={{ color: '#0F172A', fontSize: '1.1rem', fontWeight: 800 }}>{title}</h3>
            <p style={{ fontSize: '0.775rem', color: '#64748B', margin: '2px 0 0 0' }}>
              Set credentials and configure teaching subject permissions
            </p>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: '#64748B', cursor: 'pointer' }}>
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="modal-body" style={{ padding: '22px', maxHeight: '70vh', overflowY: 'auto' }}>
            {error && (
              <div
                style={{
                  background: '#FEF2F2',
                  color: '#DC2626',
                  padding: '10px 14px',
                  borderRadius: '8px',
                  marginBottom: '16px',
                  fontSize: '0.85rem',
                  border: '1px solid #FECACA',
                }}
              >
                {error}
              </div>
            )}

            <div className="form-group" style={{ marginBottom: '14px' }}>
              <label className="form-label" style={{ color: '#334155', fontSize: '0.85rem', fontWeight: 600 }}>Full Faculty Name *</label>
              <input
                type="text"
                className="form-control"
                placeholder="e.g. Prof. Hemang"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                required
                style={{ background: '#FFFFFF', border: '1px solid #CBD5E1', color: '#0F172A', borderRadius: '8px' }}
              />
            </div>

            <div className="form-grid-2" style={{ marginBottom: '14px' }}>
              <div className="form-group">
                <label className="form-label" style={{ color: '#334155', fontSize: '0.85rem', fontWeight: 600 }}>Admin Username *</label>
                <input
                  type="text"
                  className="form-control"
                  placeholder="e.g. hemang"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  required
                  style={{ background: '#FFFFFF', border: '1px solid #CBD5E1', color: '#0F172A', borderRadius: '8px' }}
                />
              </div>

              <div className="form-group">
                <label className="form-label" style={{ color: '#334155', fontSize: '0.85rem', fontWeight: 600 }}>Department</label>
                <input
                  type="text"
                  className="form-control"
                  placeholder="e.g. IT / BCA"
                  value={department}
                  onChange={(e) => setDepartment(e.target.value)}
                  style={{ background: '#FFFFFF', border: '1px solid #CBD5E1', color: '#0F172A', borderRadius: '8px' }}
                />
              </div>
            </div>

            <div className="form-group" style={{ marginBottom: '14px' }}>
              <label className="form-label" style={{ color: '#334155', fontSize: '0.85rem', fontWeight: 600 }}>Admin Official Email</label>
              <input
                type="email"
                className="form-control"
                placeholder="e.g. hemang@college.edu"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                style={{ background: '#FFFFFF', border: '1px solid #CBD5E1', color: '#0F172A', borderRadius: '8px' }}
              />
            </div>

            <div className="form-group" style={{ marginBottom: '20px' }}>
              <label className="form-label" style={{ color: '#334155', fontSize: '0.85rem', fontWeight: 600 }}>Login Password *</label>
              <div style={{ position: 'relative' }}>
                <input
                  type={showPassword ? 'text' : 'password'}
                  className="form-control"
                  placeholder="Set admin login password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  style={{ background: '#FFFFFF', border: '1px solid #CBD5E1', color: '#0F172A', paddingRight: '40px', borderRadius: '8px' }}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  style={{
                    position: 'absolute',
                    right: '12px',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    color: '#64748B',
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
                background: '#F8FAFC',
                borderRadius: '12px',
                padding: '16px',
                border: '1px solid #E2E8F0',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
                <BookOpen size={16} color="#4F46E5" />
                <span style={{ fontSize: '0.875rem', fontWeight: 700, color: '#0F172A' }}>
                  Teaching Subject Allocation
                </span>
              </div>

              {/* Radio: All Subjects vs Specific */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '14px' }}>
                <label
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '10px',
                    cursor: 'pointer',
                    fontSize: '0.85rem',
                    color: assignAllSubjects ? '#4F46E5' : '#475569',
                    fontWeight: assignAllSubjects ? 700 : 500,
                  }}
                >
                  <input
                    type="radio"
                    name="subjectScope"
                    checked={assignAllSubjects}
                    onChange={() => setAssignAllSubjects(true)}
                    style={{ accentColor: '#4F46E5' }}
                  />
                  <span>All Subjects (Full Access to Create & Review Tasks Across All Courses)</span>
                </label>

                <label
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '10px',
                    cursor: 'pointer',
                    fontSize: '0.85rem',
                    color: !assignAllSubjects ? '#0284C7' : '#475569',
                    fontWeight: !assignAllSubjects ? 700 : 500,
                  }}
                >
                  <input
                    type="radio"
                    name="subjectScope"
                    checked={!assignAllSubjects}
                    onChange={() => setAssignAllSubjects(false)}
                    style={{ accentColor: '#0284C7' }}
                  />
                  <span>Specific Subjects Only (Restricted to Selected Subjects)</span>
                </label>
              </div>

              {/* Specific Checkboxes */}
              {!assignAllSubjects && (
                <div
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '8px',
                    paddingTop: '10px',
                    borderTop: '1px solid #E2E8F0',
                  }}
                >
                  <div style={{ fontSize: '0.75rem', color: '#64748B', marginBottom: '4px' }}>
                    Select subjects assigned to this faculty member:
                  </div>

                  {availableSubjects.length === 0 ? (
                    <div style={{ fontSize: '0.8rem', color: '#94A3B8', fontStyle: 'italic', padding: '8px' }}>
                      No subjects available in database. Add subjects in the "Curriculum & Subjects" tab first.
                    </div>
                  ) : (
                    availableSubjects.map((subj) => {
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
                            background: isChecked ? '#EEF2FF' : '#FFFFFF',
                            border: `1px solid ${isChecked ? '#A5B4FC' : '#E2E8F0'}`,
                            cursor: 'pointer',
                            transition: 'all 0.15s ease',
                          }}
                        >
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={() => handleToggleSubject(subj.name)}
                            style={{ accentColor: '#4F46E5' }}
                          />
                          <div style={{ flex: 1 }}>
                            <span style={{ fontSize: '0.85rem', fontWeight: 600, color: isChecked ? '#4338CA' : '#1E293B' }}>
                              {subj.name}
                            </span>
                            {subj.subject_code && (
                              <span style={{ fontSize: '0.7rem', color: '#64748B', marginLeft: '6px' }}>
                                ({subj.subject_code})
                              </span>
                            )}
                          </div>
                        </label>
                      );
                    })
                  )}
                </div>
              )}
            </div>
          </div>

          <div className="modal-footer" style={{ borderTop: '1px solid #E2E8F0', display: 'flex', justifyContent: 'flex-end', gap: '10px', padding: '16px 22px' }}>
            <button
              type="button"
              className="btn btn-secondary"
              onClick={onClose}
              style={{ background: '#FFFFFF', color: '#334155', borderColor: '#CBD5E1' }}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="btn btn-primary"
              style={{
                background: 'linear-gradient(135deg, #4F46E5 0%, #4338CA 100%)',
                borderColor: '#4F46E5',
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

// =========================================================================
// SUB-COMPONENT: SUPER ADMIN SUBJECT MODAL (Crisp Light Mode)
// =========================================================================
const SuperSubjectModal = ({ subjectToEdit = null, onClose, onSave }) => {
  const [name, setName] = useState(subjectToEdit?.name || '');
  const [subjectCode, setSubjectCode] = useState(subjectToEdit?.subject_code || '');
  const [teacherName, setTeacherName] = useState(subjectToEdit?.teacher_name || '');
  const [description, setDescription] = useState(subjectToEdit?.description || '');
  const [isActive, setIsActive] = useState(
    subjectToEdit?.is_active !== undefined ? subjectToEdit.is_active : true
  );
  const [error, setError] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!name.trim()) {
      setError('Subject Name is required.');
      return;
    }

    onSave({
      name: name.trim(),
      subject_code: subjectCode.trim() || 'FYS-GEN',
      teacher_name: teacherName.trim() || null,
      description: description.trim() || null,
      is_active: isActive,
    });
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div
        className="modal-content"
        onClick={(e) => e.stopPropagation()}
        style={{
          maxWidth: '500px',
          background: '#FFFFFF',
          color: '#0F172A',
          border: '1px solid #E2E8F0',
          borderRadius: '16px',
          boxShadow: '0 20px 40px rgba(0, 0, 0, 0.12)',
        }}
      >
        <div className="modal-header" style={{ borderBottom: '1px solid #E2E8F0', padding: '18px 22px' }}>
          <div>
            <h3 className="modal-title" style={{ color: '#0F172A', fontSize: '1.1rem', fontWeight: 800 }}>
              {subjectToEdit ? 'Edit Academic Subject' : 'Add New Academic Subject'}
            </h3>
            <p style={{ fontSize: '0.775rem', color: '#64748B', margin: '2px 0 0 0' }}>
              Configure syllabus title, subject code, and faculty instructor
            </p>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: '#64748B', cursor: 'pointer' }}>
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="modal-body" style={{ padding: '22px' }}>
            {error && (
              <div
                style={{
                  background: '#FEF2F2',
                  color: '#DC2626',
                  padding: '10px 14px',
                  borderRadius: '8px',
                  marginBottom: '16px',
                  fontSize: '0.85rem',
                  border: '1px solid #FECACA',
                }}
              >
                {error}
              </div>
            )}

            <div className="form-group" style={{ marginBottom: '14px' }}>
              <label className="form-label" style={{ color: '#334155', fontSize: '0.85rem', fontWeight: 600 }}>
                Subject Name *
              </label>
              <input
                type="text"
                className="form-control"
                placeholder="e.g. C Programming / Database Management Systems"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                style={{ background: '#FFFFFF', border: '1px solid #CBD5E1', color: '#0F172A', borderRadius: '8px' }}
              />
            </div>

            <div className="form-grid-2" style={{ marginBottom: '14px' }}>
              <div className="form-group">
                <label className="form-label" style={{ color: '#334155', fontSize: '0.85rem', fontWeight: 600 }}>
                  Subject Code
                </label>
                <input
                  type="text"
                  className="form-control"
                  placeholder="e.g. FYS101"
                  value={subjectCode}
                  onChange={(e) => setSubjectCode(e.target.value)}
                  style={{ background: '#FFFFFF', border: '1px solid #CBD5E1', color: '#0F172A', borderRadius: '8px' }}
                />
              </div>

              <div className="form-group">
                <label className="form-label" style={{ color: '#334155', fontSize: '0.85rem', fontWeight: 600 }}>
                  Faculty Instructor
                </label>
                <input
                  type="text"
                  className="form-control"
                  placeholder="e.g. Prof. Hemang"
                  value={teacherName}
                  onChange={(e) => setTeacherName(e.target.value)}
                  style={{ background: '#FFFFFF', border: '1px solid #CBD5E1', color: '#0F172A', borderRadius: '8px' }}
                />
              </div>
            </div>

            <div className="form-group" style={{ marginBottom: '16px' }}>
              <label className="form-label" style={{ color: '#334155', fontSize: '0.85rem', fontWeight: 600 }}>
                Subject Description / Scope
              </label>
              <textarea
                className="form-control"
                rows={3}
                placeholder="Brief outline of practical labs, syllabus objectives, and semester guidelines..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                style={{ background: '#FFFFFF', border: '1px solid #CBD5E1', color: '#0F172A', borderRadius: '8px' }}
              />
            </div>

            <div
              style={{
                background: '#F8FAFC',
                padding: '12px 14px',
                borderRadius: '8px',
                border: '1px solid #E2E8F0',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
              }}
            >
              <div>
                <div style={{ fontSize: '0.85rem', fontWeight: 600, color: '#0F172A' }}>Active in Curriculum</div>
                <div style={{ fontSize: '0.725rem', color: '#64748B' }}>Students and teachers can submit & create tasks for this course</div>
              </div>
              <input
                type="checkbox"
                checked={isActive}
                onChange={(e) => setIsActive(e.target.checked)}
                style={{ width: 18, height: 18, accentColor: '#4F46E5', cursor: 'pointer' }}
              />
            </div>
          </div>

          <div className="modal-footer" style={{ borderTop: '1px solid #E2E8F0', display: 'flex', justifyContent: 'flex-end', gap: '10px', padding: '16px 22px' }}>
            <button
              type="button"
              className="btn btn-secondary"
              onClick={onClose}
              style={{ background: '#FFFFFF', color: '#334155', borderColor: '#CBD5E1' }}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="btn btn-primary"
              style={{
                background: 'linear-gradient(135deg, #4F46E5 0%, #4338CA 100%)',
                borderColor: '#4F46E5',
                padding: '8px 18px',
                fontWeight: 700,
              }}
            >
              {subjectToEdit ? 'Save Changes' : 'Create Subject'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

// =========================================================================
// SUB-COMPONENT: SUPER ADMIN BROADCAST NOTIFICATION MODAL (Crisp Light Mode)
// =========================================================================
// 8. BROADCAST NOTICE MODAL (SUPER ADMIN) WITH ATTACHMENT
// =========================================================================
const SuperBroadcastModal = ({ onClose, onBroadcast }) => {
  const fileInputRef = useRef(null);
  const [title, setTitle] = useState('');
  const [message, setMessage] = useState('');
  const [priority, setPriority] = useState('High');
  const [targetAudience, setTargetAudience] = useState('All');
  const [sendPush, setSendPush] = useState(true);
  const [attachmentFile, setAttachmentFile] = useState(null);
  const [filePreview, setFilePreview] = useState(null);
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const formatFileSize = (bytes) => {
    if (!bytes) return '0 B';
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 20 * 1024 * 1024) {
      setError('File exceeds 20MB limit. Please attach a smaller file.');
      return;
    }

    setAttachmentFile(file);
    setError('');

    if (file.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onload = () => setFilePreview(reader.result);
      reader.readAsDataURL(file);
    } else {
      setFilePreview(null);
    }
  };

  const handleRemoveAttachment = () => {
    setAttachmentFile(null);
    setFilePreview(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!title.trim() || !message.trim()) {
      setError('Both Notice Title and Message content are required.');
      return;
    }

    setIsSubmitting(true);
    setError('');

    try {
      let uploadedAttachment = null;
      if (attachmentFile) {
        uploadedAttachment = await dataService.uploadAnnouncementAttachment(attachmentFile);
      }

      await onBroadcast({
        title: title.trim(),
        message: message.trim(),
        priority,
        targetAudience,
        sendPush,
        attachment: uploadedAttachment,
      });
    } catch (err) {
      setError(err.message || 'Failed to broadcast announcement.');
      setIsSubmitting(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div
        className="modal-content"
        onClick={(e) => e.stopPropagation()}
        style={{
          maxWidth: '540px',
          background: '#FFFFFF',
          color: '#0F172A',
          border: '1px solid #E2E8F0',
          borderRadius: '16px',
          boxShadow: '0 20px 40px rgba(0, 0, 0, 0.12)',
        }}
      >
        <div className="modal-header" style={{ borderBottom: '1px solid #E2E8F0', padding: '18px 22px' }}>
          <div>
            <h3 className="modal-title" style={{ color: '#0F172A', fontSize: '1.1rem', fontWeight: 800 }}>
              Broadcast Campus Notice & Alert
            </h3>
            <p style={{ fontSize: '0.775rem', color: '#64748B', margin: '2px 0 0 0' }}>
              Broadcast notices to students and faculty, with optional attachments and push notifications
            </p>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: '#64748B', cursor: 'pointer' }}>
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="modal-body" style={{ padding: '22px' }}>
            {error && (
              <div
                style={{
                  background: '#FEF2F2',
                  color: '#DC2626',
                  padding: '10px 14px',
                  borderRadius: '8px',
                  marginBottom: '16px',
                  fontSize: '0.85rem',
                  border: '1px solid #FECACA',
                }}
              >
                {error}
              </div>
            )}

            <div className="form-group" style={{ marginBottom: '14px' }}>
              <label className="form-label" style={{ color: '#334155', fontSize: '0.85rem', fontWeight: 600 }}>
                Notice Title *
              </label>
              <input
                type="text"
                className="form-control"
                placeholder="e.g. Unit Test 1 Schedule / Submission Window Closing"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                required
                style={{ background: '#FFFFFF', border: '1px solid #CBD5E1', color: '#0F172A', borderRadius: '8px' }}
              />
            </div>

            <div className="form-grid-2" style={{ marginBottom: '14px' }}>
              <div className="form-group">
                <label className="form-label" style={{ color: '#334155', fontSize: '0.85rem', fontWeight: 600 }}>
                  Priority Level
                </label>
                <select
                  className="form-control"
                  value={priority}
                  onChange={(e) => setPriority(e.target.value)}
                  style={{ background: '#FFFFFF', border: '1px solid #CBD5E1', color: '#0F172A', borderRadius: '8px' }}
                >
                  <option value="Urgent">🚨 Urgent Alert</option>
                  <option value="High">⚠️ High Priority</option>
                  <option value="Normal">📢 Normal Notice</option>
                  <option value="Info">ℹ️ Information</option>
                </select>
              </div>

              <div className="form-group">
                <label className="form-label" style={{ color: '#334155', fontSize: '0.85rem', fontWeight: 600 }}>
                  Target Audience
                </label>
                <select
                  className="form-control"
                  value={targetAudience}
                  onChange={(e) => setTargetAudience(e.target.value)}
                  style={{ background: '#FFFFFF', border: '1px solid #CBD5E1', color: '#0F172A', borderRadius: '8px' }}
                >
                  <option value="All">All Students & Faculty</option>
                  <option value="Students Only">Students Only</option>
                  <option value="Faculty Only">Faculty Admins Only</option>
                </select>
              </div>
            </div>

            <div className="form-group" style={{ marginBottom: '14px' }}>
              <label className="form-label" style={{ color: '#334155', fontSize: '0.85rem', fontWeight: 600 }}>
                Notice Message & Details *
              </label>
              <textarea
                className="form-control"
                rows={4}
                placeholder="Write the full announcement text, instructions, and practical deadlines for the class..."
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                required
                style={{ background: '#FFFFFF', border: '1px solid #CBD5E1', color: '#0F172A', borderRadius: '8px' }}
              />
            </div>

            {/* File Attachment Section */}
            <div className="form-group" style={{ marginBottom: '16px' }}>
              <label className="form-label" style={{ color: '#334155', fontSize: '0.85rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Paperclip size={14} color="#4F46E5" />
                <span>Notice Attachment (Optional)</span>
                <span style={{ fontSize: '0.725rem', color: '#64748B', fontWeight: 400 }}>
                  PDF, Document, Image, etc.
                </span>
              </label>

              <input
                ref={fileInputRef}
                type="file"
                style={{ display: 'none' }}
                onChange={handleFileChange}
              />

              {!attachmentFile ? (
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  style={{
                    width: '100%',
                    padding: '12px',
                    border: '2px dashed #CBD5E1',
                    borderRadius: '8px',
                    background: '#F8FAFC',
                    color: '#4F46E5',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '8px',
                    fontSize: '0.85rem',
                    fontWeight: 600,
                  }}
                >
                  <Paperclip size={16} />
                  <span>Attach Document, PDF, or Photo</span>
                </button>
              ) : (
                <div
                  style={{
                    padding: '10px 14px',
                    background: '#F0FDF4',
                    border: '1px solid #BBF7D0',
                    borderRadius: '8px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: '12px',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px', overflow: 'hidden' }}>
                    {filePreview ? (
                      <img
                        src={filePreview}
                        alt="Preview"
                        style={{ width: 36, height: 36, objectFit: 'cover', borderRadius: '4px' }}
                      />
                    ) : (
                      <FileText size={24} color="#166534" />
                    )}
                    <div style={{ overflow: 'hidden' }}>
                      <div
                        style={{
                          fontSize: '0.825rem',
                          fontWeight: 600,
                          color: '#166534',
                          whiteSpace: 'nowrap',
                          textOverflow: 'ellipsis',
                          overflow: 'hidden',
                          maxWidth: '300px',
                        }}
                      >
                        {attachmentFile.name}
                      </div>
                      <div style={{ fontSize: '0.7rem', color: '#15803D' }}>
                        {formatFileSize(attachmentFile.size)} • Ready to broadcast
                      </div>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={handleRemoveAttachment}
                    style={{
                      background: 'none',
                      border: 'none',
                      color: '#DC2626',
                      cursor: 'pointer',
                      padding: '4px',
                    }}
                    title="Remove attachment"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              )}
            </div>

            <div
              style={{
                background: '#F0F9FF',
                padding: '12px 14px',
                borderRadius: '8px',
                border: '1px solid #BAE6FD',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <Bell size={18} color="#0284C7" />
                <div>
                  <div style={{ fontSize: '0.85rem', fontWeight: 600, color: '#0369A1' }}>Send Desktop Push Notification</div>
                  <div style={{ fontSize: '0.725rem', color: '#64748B' }}>Triggers instant native chime & banner on student browsers</div>
                </div>
              </div>
              <input
                type="checkbox"
                checked={sendPush}
                onChange={(e) => setSendPush(e.target.checked)}
                style={{ width: 18, height: 18, accentColor: '#0284C7', cursor: 'pointer' }}
              />
            </div>
          </div>

          <div className="modal-footer" style={{ borderTop: '1px solid #E2E8F0', display: 'flex', justifyContent: 'flex-end', gap: '10px', padding: '16px 22px' }}>
            <button
              type="button"
              className="btn btn-secondary"
              onClick={onClose}
              disabled={isSubmitting}
              style={{ background: '#FFFFFF', color: '#334155', borderColor: '#CBD5E1' }}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="btn btn-primary"
              disabled={isSubmitting}
              style={{
                background: 'linear-gradient(135deg, #4F46E5 0%, #4338CA 100%)',
                borderColor: '#4F46E5',
                padding: '8px 18px',
                fontWeight: 700,
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
              }}
            >
              {isSubmitting ? <Loader2 size={16} className="spin" /> : <Send size={15} />}
              <span>Publish Broadcast</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
