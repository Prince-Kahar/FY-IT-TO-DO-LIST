import React, { useState } from 'react';
import {
  Paperclip,
  Eye,
  Download,
  X,
  FileText,
  Image as ImageIcon,
  File,
  ExternalLink,
} from 'lucide-react';

export const AttachmentActions = ({ attachment, theme = 'default' }) => {
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);

  if (!attachment || !attachment.url) return null;

  const fileName = attachment.name || 'Attachment';
  const fileUrl = attachment.url;
  const isImage =
    attachment.type?.startsWith('image/') ||
    /\.(jpg|jpeg|png|webp|gif|svg)$/i.test(fileName) ||
    fileUrl.startsWith('data:image/');
  const isPdf =
    attachment.type?.includes('pdf') ||
    /\.pdf$/i.test(fileName) ||
    fileUrl.startsWith('data:application/pdf');

  const formatSize = (bytes) => {
    if (!bytes) return '';
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(0) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

  const handleDownload = (e) => {
    // If it's a data url or blob, standard anchor download works
    const a = document.createElement('a');
    a.href = fileUrl;
    a.download = fileName;
    a.target = '_blank';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  return (
    <>
      <div
        style={{
          marginTop: '10px',
          padding: '10px 14px',
          background: theme === 'superadmin' ? '#F8FAFC' : '#F0F9FF',
          border: `1px solid ${theme === 'superadmin' ? '#CBD5E1' : '#BAE6FD'}`,
          borderRadius: '10px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '10px',
        }}
      >
        {/* File Info */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', minWidth: '180px', flex: 1 }}>
          {isImage ? (
            <ImageIcon size={18} color="#0284C7" style={{ flexShrink: 0 }} />
          ) : isPdf ? (
            <FileText size={18} color="#DC2626" style={{ flexShrink: 0 }} />
          ) : (
            <Paperclip size={18} color="#4F46E5" style={{ flexShrink: 0 }} />
          )}
          <div style={{ overflow: 'hidden' }}>
            <div
              style={{
                fontSize: '0.825rem',
                fontWeight: 700,
                color: '#0F172A',
                whiteSpace: 'nowrap',
                textOverflow: 'ellipsis',
                overflow: 'hidden',
                maxWidth: '280px',
              }}
              title={fileName}
            >
              {fileName}
            </div>
            {attachment.size ? (
              <div style={{ fontSize: '0.7rem', color: '#64748B' }}>
                {formatSize(attachment.size)}
              </div>
            ) : null}
          </div>
        </div>

        {/* Action Buttons: View + Download */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
          {/* VIEW BUTTON */}
          <button
            type="button"
            onClick={() => setIsPreviewOpen(true)}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '5px',
              background: '#FFFFFF',
              border: '1px solid #CBD5E1',
              color: '#334155',
              padding: '5px 11px',
              borderRadius: '6px',
              fontSize: '0.775rem',
              fontWeight: 600,
              cursor: 'pointer',
              transition: 'all 0.15s ease',
              boxShadow: '0 1px 2px rgba(0, 0, 0, 0.05)',
            }}
            onMouseOver={(e) => {
              e.currentTarget.style.borderColor = '#4F46E5';
              e.currentTarget.style.color = '#4F46E5';
            }}
            onMouseOut={(e) => {
              e.currentTarget.style.borderColor = '#CBD5E1';
              e.currentTarget.style.color = '#334155';
            }}
            title="Preview Attachment"
          >
            <Eye size={13} />
            <span>View</span>
          </button>

          {/* DOWNLOAD BUTTON */}
          <button
            type="button"
            onClick={handleDownload}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '5px',
              background: 'linear-gradient(135deg, #0284C7 0%, #0369A1 100%)',
              border: 'none',
              color: '#FFFFFF',
              padding: '5px 12px',
              borderRadius: '6px',
              fontSize: '0.775rem',
              fontWeight: 700,
              cursor: 'pointer',
              boxShadow: '0 2px 4px rgba(2, 132, 199, 0.25)',
              transition: 'all 0.15s ease',
            }}
            title="Download Attachment"
          >
            <Download size={13} />
            <span>Download</span>
          </button>
        </div>
      </div>

      {/* FULL PREVIEW MODAL */}
      {isPreviewOpen && (
        <div
          className="modal-overlay"
          onClick={() => setIsPreviewOpen(false)}
          style={{ zIndex: 9999, background: 'rgba(15, 23, 42, 0.75)', backdropFilter: 'blur(4px)' }}
        >
          <div
            className="modal-content"
            onClick={(e) => e.stopPropagation()}
            style={{
              maxWidth: isImage ? '800px' : '900px',
              width: '95%',
              maxHeight: '90vh',
              background: '#FFFFFF',
              borderRadius: '16px',
              overflow: 'hidden',
              display: 'flex',
              flexDirection: 'column',
              boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
            }}
          >
            {/* Header */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '14px 20px',
                borderBottom: '1px solid #E2E8F0',
                background: '#F8FAFC',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', overflow: 'hidden' }}>
                <Paperclip size={16} color="#4F46E5" />
                <span
                  style={{
                    fontSize: '0.925rem',
                    fontWeight: 700,
                    color: '#0F172A',
                    whiteSpace: 'nowrap',
                    textOverflow: 'ellipsis',
                    overflow: 'hidden',
                    maxWidth: '450px',
                  }}
                >
                  {fileName}
                </span>
                {attachment.size && (
                  <span style={{ fontSize: '0.75rem', color: '#64748B' }}>
                    ({formatSize(attachment.size)})
                  </span>
                )}
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <a
                  href={fileUrl}
                  target="_blank"
                  rel="noreferrer"
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '4px',
                    fontSize: '0.75rem',
                    color: '#4F46E5',
                    fontWeight: 600,
                    textDecoration: 'none',
                    marginRight: '6px',
                  }}
                  title="Open in new window"
                >
                  <ExternalLink size={13} />
                  <span>New Window</span>
                </a>

                <button
                  type="button"
                  onClick={handleDownload}
                  style={{
                    background: '#0284C7',
                    color: '#FFFFFF',
                    border: 'none',
                    padding: '4px 10px',
                    borderRadius: '6px',
                    fontSize: '0.75rem',
                    fontWeight: 600,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px',
                  }}
                >
                  <Download size={12} />
                  <span>Download</span>
                </button>

                <button
                  type="button"
                  onClick={() => setIsPreviewOpen(false)}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: '#64748B',
                    cursor: 'pointer',
                    padding: '4px',
                    display: 'flex',
                  }}
                  title="Close Preview"
                >
                  <X size={20} />
                </button>
              </div>
            </div>

            {/* Content Preview */}
            <div
              style={{
                padding: '16px',
                overflow: 'auto',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                minHeight: '280px',
                maxHeight: '75vh',
                background: '#0F172A',
              }}
            >
              {isImage ? (
                <img
                  src={fileUrl}
                  alt={fileName}
                  style={{
                    maxWidth: '100%',
                    maxHeight: '70vh',
                    objectFit: 'contain',
                    borderRadius: '8px',
                    boxShadow: '0 10px 25px rgba(0,0,0,0.5)',
                  }}
                />
              ) : isPdf ? (
                <iframe
                  src={fileUrl}
                  title={fileName}
                  style={{
                    width: '100%',
                    height: '70vh',
                    border: 'none',
                    borderRadius: '8px',
                    background: '#FFFFFF',
                  }}
                />
              ) : (
                <div
                  style={{
                    textAlign: 'center',
                    padding: '40px 20px',
                    color: '#FFFFFF',
                  }}
                >
                  <File size={56} color="#94A3B8" style={{ margin: '0 auto 16px auto', display: 'block' }} />
                  <h4 style={{ fontSize: '1.1rem', fontWeight: 700, margin: '0 0 8px 0' }}>{fileName}</h4>
                  <p style={{ fontSize: '0.85rem', color: '#94A3B8', maxWidth: '380px', margin: '0 auto 20px auto' }}>
                    This document format can be opened in an external viewer or downloaded to your device.
                  </p>
                  <div style={{ display: 'flex', justifyContent: 'center', gap: '10px' }}>
                    <a
                      href={fileUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="btn btn-secondary btn-sm"
                      style={{ background: '#FFFFFF', color: '#0F172A' }}
                    >
                      <ExternalLink size={14} />
                      <span>Open File in Browser</span>
                    </a>
                    <button
                      type="button"
                      onClick={handleDownload}
                      className="btn btn-primary btn-sm"
                    >
                      <Download size={14} />
                      <span>Download File</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
};
