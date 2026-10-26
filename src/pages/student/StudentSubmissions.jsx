import React, { useState, useEffect } from 'react';
import { FileCheck, Calendar, Clock, Eye, RotateCcw, AlertTriangle, CheckCircle2 } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { dataService } from '../../lib/dataService';
import { StatusBadge } from '../../components/StatusBadge';
import { PhotoViewerModal } from '../../components/PhotoViewerModal';
import { SubmitWorkModal } from '../../components/SubmitWorkModal';

export const StudentSubmissions = () => {
  const { user } = useAuth();
  const [assignments, setAssignments] = useState([]);
  const [loading, setLoading] = useState(true);

  // Modals
  const [lightboxPhotos, setLightboxPhotos] = useState(null);
  const [resubmitModalData, setResubmitModalData] = useState(null);

  const loadSubmissions = async () => {
    if (!user) return;
    setLoading(true);
    try {
      const data = await dataService.getStudentAssignments(user.id);
      // Filter assignments that have at least one submission
      const withSubmissions = data.filter((a) => a.submissions && a.submissions.length > 0);
      setAssignments(withSubmissions);
    } catch (err) {
      console.error('Error loading submissions:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSubmissions();
  }, [user]);

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Submission History & Feedback</h1>
          <p className="page-description">
            Track all uploaded handwritten work, review timestamps, teacher remarks, and resubmit corrected assignments.
          </p>
        </div>
      </div>

      {assignments.length === 0 ? (
        <div className="card empty-state">
          <div className="empty-state-icon">
            <FileCheck size={28} />
          </div>
          <h3 className="empty-state-title">No submissions yet</h3>
          <p className="empty-state-desc">
            You haven't submitted any tasks yet. Head over to My Tasks to submit your handwritten notes or practicals.
          </p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
          {assignments.map((asg) => {
            const task = asg.tasks;
            const submissions = asg.submissions || [];

            return (
              <div key={asg.id} className="card">
                {/* Header */}
                <div
                  style={{
                    display: 'flex',
                    flexWrap: 'wrap',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: '12px',
                    marginBottom: '16px',
                    borderBottom: '1px solid var(--border-light)',
                    paddingBottom: '12px',
                  }}
                >
                  <div>
                    <span
                      style={{
                        background: 'var(--primary-50)',
                        color: 'var(--primary-700)',
                        fontSize: '0.75rem',
                        fontWeight: 700,
                        padding: '2px 8px',
                        borderRadius: 4,
                      }}
                    >
                      {task?.subjects?.subject_code || 'IT'} • {task?.subjects?.name}
                    </span>
                    <h3 style={{ fontSize: '1.15rem', fontWeight: 700, marginTop: '4px' }}>
                      {task?.title}
                    </h3>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <StatusBadge status={asg.status} />

                    {asg.status === 'Needs Correction' && (
                      <button
                        type="button"
                        className="btn btn-warning btn-sm"
                        style={{ background: '#EA580C', color: '#fff' }}
                        onClick={() => setResubmitModalData({ assignment: asg, task })}
                      >
                        <RotateCcw size={14} />
                        <span>Resubmit Work</span>
                      </button>
                    )}
                  </div>
                </div>

                {/* Submissions list (newest first) */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                  {submissions.map((sub, idx) => {
                    const files = sub.submission_files || sub.files || [];

                    return (
                      <div
                        key={sub.id || idx}
                        style={{
                          background: 'var(--bg-subtle)',
                          borderRadius: 'var(--radius-md)',
                          padding: '16px',
                          border: '1px solid var(--border-light)',
                        }}
                      >
                        <div
                          style={{
                            display: 'flex',
                            flexWrap: 'wrap',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            gap: '8px',
                            marginBottom: '10px',
                          }}
                        >
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <span
                              style={{
                                background: '#FFFFFF',
                                border: '1px solid var(--border-light)',
                                fontSize: '0.75rem',
                                fontWeight: 700,
                                padding: '2px 8px',
                                borderRadius: 4,
                              }}
                            >
                              Attempt #{sub.attempt_number || idx + 1}
                            </span>

                            <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                              Submitted on {new Date(sub.submitted_at).toLocaleString()}
                            </span>
                          </div>

                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            {sub.marks_awarded !== null && sub.marks_awarded !== undefined && (
                              <span
                                style={{
                                  background: 'var(--primary-100)',
                                  color: 'var(--primary-800)',
                                  fontSize: '0.8rem',
                                  fontWeight: 700,
                                  padding: '2px 8px',
                                  borderRadius: 4,
                                }}
                              >
                                Marks: {sub.marks_awarded} {task?.max_marks ? `/ ${task.max_marks}` : ''}
                              </span>
                            )}
                            <StatusBadge status={sub.status} />
                          </div>
                        </div>

                        {/* Student Comment */}
                        {sub.comment && (
                          <div style={{ fontSize: '0.85rem', color: 'var(--text-main)', marginBottom: '12px' }}>
                            <strong>My Note:</strong> "{sub.comment}"
                          </div>
                        )}

                        {/* Teacher Feedback (if reviewed) */}
                        {sub.feedback && (
                          <div
                            style={{
                              background: '#FFFFFF',
                              borderLeft: '3px solid var(--primary-600)',
                              padding: '10px 14px',
                              borderRadius: 'var(--radius-sm)',
                              marginBottom: '12px',
                              fontSize: '0.85rem',
                            }}
                          >
                            <div style={{ fontWeight: 600, color: 'var(--primary-700)' }}>
                              Teacher Feedback:
                            </div>
                            <div style={{ color: 'var(--text-main)', marginTop: '2px' }}>
                              "{sub.feedback}"
                            </div>
                            {sub.reviewed_at && (
                              <div style={{ fontSize: '0.7rem', color: 'var(--text-subtle)', marginTop: '4px' }}>
                                Reviewed on {new Date(sub.reviewed_at).toLocaleString()}
                              </div>
                            )}
                          </div>
                        )}

                        {/* Uploaded Photos Grid */}
                        {files.length > 0 && (
                          <div>
                            <div style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '6px' }}>
                              Attached Work Photos ({files.length}):
                            </div>
                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px' }}>
                              {files.map((file, fIdx) => {
                                const imgUrl = file.signed_url || file.storage_path;
                                return (
                                  <div
                                    key={file.id || fIdx}
                                    style={{
                                      width: 90,
                                      height: 90,
                                      borderRadius: 'var(--radius-sm)',
                                      overflow: 'hidden',
                                      border: '1px solid var(--border-light)',
                                      cursor: 'pointer',
                                      position: 'relative',
                                    }}
                                    onClick={() => setLightboxPhotos(files)}
                                  >
                                    <img
                                      src={imgUrl}
                                      alt={file.original_file_name}
                                      style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                                    />
                                    <div
                                      style={{
                                        position: 'absolute',
                                        inset: 0,
                                        background: 'rgba(0,0,0,0.3)',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        color: '#fff',
                                      }}
                                    >
                                      <Eye size={16} />
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Lightbox Modal */}
      {lightboxPhotos && (
        <PhotoViewerModal
          photos={lightboxPhotos}
          onClose={() => setLightboxPhotos(null)}
        />
      )}

      {/* Resubmit Work Modal */}
      {resubmitModalData && (
        <SubmitWorkModal
          assignment={resubmitModalData.assignment}
          task={resubmitModalData.task}
          onClose={() => setResubmitModalData(null)}
          onSuccess={loadSubmissions}
        />
      )}
    </div>
  );
};
