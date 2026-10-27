import React, { useState, useRef } from 'react';
import {
  X,
  CheckCircle2,
  Loader2,
  AlertCircle,
  Paperclip,
  FileText,
  Image as ImageIcon,
  File,
  Trash2,
} from 'lucide-react';
import { dataService } from '../lib/dataService';
import { useToast } from '../context/ToastContext';

export const AnnouncementModal = ({ onClose, onSuccess }) => {
  const { addToast } = useToast();
  const fileInputRef = useRef(null);

  const [title, setTitle] = useState('');
  const [message, setMessage] = useState('');
  const [attachmentFile, setAttachmentFile] = useState(null);
  const [filePreview, setFilePreview] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

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
      setErrorMsg('File exceeds 20MB limit. Please attach a smaller file.');
      return;
    }

    setAttachmentFile(file);
    setErrorMsg('');

    // If image, create thumbnail preview
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
      setErrorMsg('Both title and message are required.');
      return;
    }

    setIsSubmitting(true);
    setErrorMsg('');

    try {
      let uploadedAttachment = null;
      if (attachmentFile) {
        uploadedAttachment = await dataService.uploadAnnouncementAttachment(attachmentFile);
      }

      await dataService.createAnnouncement({
        title: title.trim(),
        message: message.trim(),
        attachment: uploadedAttachment,
        author_name: 'Academic Faculty',
        priority: 'Normal',
        target_audience: 'All',
      });

      addToast(
        uploadedAttachment
          ? 'Notice with attachment broadcasted to all students!'
          : 'Class announcement broadcasted to all students!',
        'success'
      );
      if (onSuccess) onSuccess();
      onClose();
    } catch (err) {
      console.error('Announcement creation error:', err);
      setErrorMsg(err.message || 'Failed to post announcement.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '540px' }}>
        <div className="modal-header">
          <div>
            <h3 className="modal-title">Broadcast Class Announcement</h3>
            <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', margin: '2px 0 0 0' }}>
              Broadcast notices & attach study guides, timetables, or instructions for students
            </p>
          </div>
          <button className="photo-remove-btn" onClick={onClose} style={{ position: 'static' }}>
            <X size={16} />
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="modal-body">
            {errorMsg && (
              <div
                style={{
                  background: 'var(--danger-bg)',
                  color: 'var(--danger-text)',
                  padding: '10px 14px',
                  borderRadius: 'var(--radius-md)',
                  marginBottom: '16px',
                  fontSize: '0.85rem',
                }}
              >
                <AlertCircle size={16} style={{ display: 'inline', marginRight: 6 }} />
                {errorMsg}
              </div>
            )}

            <div className="form-group">
              <label className="form-label">Announcement Title *</label>
              <input
                type="text"
                className="form-control"
                placeholder="e.g. Unit Test 1 Schedule / Lab Journal Guidelines"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                required
              />
            </div>

            <div className="form-group">
              <label className="form-label">Notice Message & Instructions *</label>
              <textarea
                className="form-control"
                rows={4}
                placeholder="Write the full notice content, instructions, or practical deadlines for students..."
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                required
              />
            </div>

            {/* File Attachment Section */}
            <div className="form-group" style={{ marginTop: '14px' }}>
              <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Paperclip size={15} color="var(--primary-600)" />
                <span>Notice Attachment (Optional)</span>
                <span style={{ fontSize: '0.725rem', color: 'var(--text-muted)', fontWeight: 400 }}>
                  PDF, Document, Image, Spreadsheet, etc.
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
                    padding: '14px',
                    border: '2px dashed var(--border-medium)',
                    borderRadius: 'var(--radius-md)',
                    background: 'var(--bg-subtle)',
                    color: 'var(--primary-700)',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '8px',
                    fontSize: '0.875rem',
                    fontWeight: 600,
                    transition: 'all 0.15s ease',
                  }}
                  onMouseOver={(e) => (e.currentTarget.style.borderColor = 'var(--primary-500)')}
                  onMouseOut={(e) => (e.currentTarget.style.borderColor = 'var(--border-medium)')}
                >
                  <Paperclip size={18} />
                  <span>Attach Document, PDF, or Image</span>
                </button>
              ) : (
                <div
                  style={{
                    padding: '12px 14px',
                    background: '#F0FDF4',
                    border: '1px solid #BBF7D0',
                    borderRadius: 'var(--radius-md)',
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
                        style={{ width: 40, height: 40, objectFit: 'cover', borderRadius: '4px' }}
                      />
                    ) : attachmentFile.type.includes('pdf') ? (
                      <FileText size={28} color="#DC2626" />
                    ) : (
                      <File size={28} color="var(--primary-600)" />
                    )}
                    <div style={{ overflow: 'hidden' }}>
                      <div
                        style={{
                          fontSize: '0.875rem',
                          fontWeight: 600,
                          color: '#166534',
                          whiteSpace: 'nowrap',
                          textOverflow: 'ellipsis',
                          overflow: 'hidden',
                          maxWidth: '320px',
                        }}
                      >
                        {attachmentFile.name}
                      </div>
                      <div style={{ fontSize: '0.725rem', color: '#15803D' }}>
                        {formatFileSize(attachmentFile.size)} • Ready to upload
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
                      borderRadius: '4px',
                    }}
                    title="Remove attachment"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              )}
            </div>
          </div>

          <div className="modal-footer">
            <button
              type="button"
              className="btn btn-secondary"
              onClick={onClose}
              disabled={isSubmitting}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="btn btn-primary"
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <>
                  <Loader2 size={16} className="spin" />
                  <span>Publishing Notice...</span>
                </>
              ) : (
                <>
                  <CheckCircle2 size={16} />
                  <span>Post Announcement</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
