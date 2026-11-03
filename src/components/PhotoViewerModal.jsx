import React, { useState, useEffect } from 'react';
import {
  X,
  ChevronLeft,
  ChevronRight,
  ZoomIn,
  ZoomOut,
  RotateCw,
  Download,
  Loader2,
  FileText,
  ExternalLink,
} from 'lucide-react';

export const DEFAULT_PROOF_PLACEHOLDER =
  'https://images.unsplash.com/photo-1455390582262-044cdead277a?auto=format&fit=crop&w=1200&q=80';

export const resolveSubmissionPhotoUrl = (file) => {
  if (!file) return DEFAULT_PROOF_PLACEHOLDER;
  if (typeof file === 'string') {
    if (file.startsWith('data:') || file.startsWith('http')) return file;
    if (file.startsWith('blob:')) return file;
    return `https://cgwlllymkzbltuhsqepg.supabase.co/storage/v1/object/public/task-submissions/${file}`;
  }
  // Check persistent data_url / base64 first
  if (file.data_url && file.data_url.startsWith('data:')) return file.data_url;
  if (file.base64 && file.base64.startsWith('data:')) return file.base64;
  if (file.url && file.url.startsWith('http')) return file.url;
  if (file.signed_url && (file.signed_url.startsWith('http') || file.signed_url.startsWith('data:'))) {
    return file.signed_url;
  }
  if (file.signed_url && file.signed_url.startsWith('blob:')) {
    return file.signed_url;
  }
  if (file.storage_path) {
    if (file.storage_path.startsWith('http') || file.storage_path.startsWith('data:')) {
      return file.storage_path;
    }
    return `https://cgwlllymkzbltuhsqepg.supabase.co/storage/v1/object/public/task-submissions/${file.storage_path}`;
  }
  return DEFAULT_PROOF_PLACEHOLDER;
};

export const PhotoViewerModal = ({ photos = [], initialIndex = 0, onClose }) => {
  const [currentIndex, setCurrentIndex] = useState(initialIndex);
  const [zoom, setZoom] = useState(1);
  const [rotation, setRotation] = useState(0);
  const [isImgLoading, setIsImgLoading] = useState(true);
  const [imgLoadFailed, setImgLoadFailed] = useState(false);

  useEffect(() => {
    setCurrentIndex(initialIndex);
  }, [initialIndex]);

  useEffect(() => {
    setZoom(1);
    setRotation(0);
    setIsImgLoading(true);
    setImgLoadFailed(false);
  }, [currentIndex]);

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        onClose();
      } else if (e.key === 'ArrowLeft') {
        setCurrentIndex((prev) => (prev > 0 ? prev - 1 : photos.length - 1));
      } else if (e.key === 'ArrowRight') {
        setCurrentIndex((prev) => (prev < photos.length - 1 ? prev + 1 : 0));
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [photos.length, onClose]);

  if (!photos || photos.length === 0) return null;

  const currentPhoto = photos[currentIndex];
  const photoUrl = resolveSubmissionPhotoUrl(currentPhoto);

  const handlePrev = (e) => {
    e.stopPropagation();
    setCurrentIndex((prev) => (prev > 0 ? prev - 1 : photos.length - 1));
  };

  const handleNext = (e) => {
    e.stopPropagation();
    setCurrentIndex((prev) => (prev < photos.length - 1 ? prev + 1 : 0));
  };

  const handleRotate = (e) => {
    e.stopPropagation();
    setRotation((r) => (r + 90) % 360);
  };

  return (
    <div
      className="modal-overlay"
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 99999, // Super-high z-index to always render on top of ReviewModal (z:1000)
        backgroundColor: 'rgba(10, 15, 30, 0.94)',
        backdropFilter: 'blur(8px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '16px',
      }}
      onClick={onClose}
    >
      <div
        style={{
          position: 'relative',
          width: '100%',
          maxWidth: '92vw',
          maxHeight: '92vh',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Top Floating Control Bar */}
        <div
          style={{
            width: '100%',
            maxWidth: '850px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '10px 16px',
            color: '#FFFFFF',
            background: 'rgba(255, 255, 255, 0.1)',
            borderRadius: '12px',
            backdropFilter: 'blur(10px)',
            border: '1px solid rgba(255, 255, 255, 0.15)',
            marginBottom: '12px',
            boxShadow: '0 8px 24px rgba(0, 0, 0, 0.3)',
          }}
        >
          <div>
            <div style={{ fontSize: '0.9rem', fontWeight: 700, color: '#FFFFFF' }}>
              {currentPhoto?.original_file_name || `Page / Sheet ${currentIndex + 1}`}
            </div>
            <div style={{ fontSize: '0.75rem', color: '#CBD5E1', marginTop: '1px' }}>
              Photo {currentIndex + 1} of {photos.length} • Zoom: {Math.round(zoom * 100)}% • Rotation: {rotation}°
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <button
              type="button"
              onClick={() => setZoom((z) => Math.min(z + 0.25, 3.5))}
              style={{
                color: '#fff',
                padding: '6px 10px',
                borderRadius: '6px',
                background: 'rgba(255,255,255,0.15)',
                border: 'none',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
                fontSize: '0.8rem',
              }}
              title="Zoom In"
            >
              <ZoomIn size={16} />
              <span>Zoom</span>
            </button>

            <button
              type="button"
              onClick={() => setZoom((z) => Math.max(z - 0.25, 0.5))}
              style={{
                color: '#fff',
                padding: '6px 10px',
                borderRadius: '6px',
                background: 'rgba(255,255,255,0.15)',
                border: 'none',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
                fontSize: '0.8rem',
              }}
              title="Zoom Out"
            >
              <ZoomOut size={16} />
            </button>

            <button
              type="button"
              onClick={handleRotate}
              style={{
                color: '#fff',
                padding: '6px 10px',
                borderRadius: '6px',
                background: 'rgba(255,255,255,0.15)',
                border: 'none',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
                fontSize: '0.8rem',
              }}
              title="Rotate 90° Clockwise"
            >
              <RotateCw size={16} />
              <span>Rotate</span>
            </button>

            {photoUrl && (
              <a
                href={photoUrl}
                target="_blank"
                rel="noreferrer"
                download={currentPhoto?.original_file_name || `submission_page_${currentIndex + 1}.jpg`}
                style={{
                  color: '#fff',
                  padding: '6px 10px',
                  borderRadius: '6px',
                  background: '#2563EB',
                  textDecoration: 'none',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                  fontSize: '0.8rem',
                  fontWeight: 600,
                }}
                title="Open original high-res image in new tab / download"
              >
                <Download size={15} />
                <span>Open / Download</span>
              </a>
            )}

            <button
              type="button"
              onClick={onClose}
              style={{
                color: '#fff',
                padding: '7px',
                borderRadius: '50%',
                background: 'rgba(239, 68, 68, 0.8)',
                border: 'none',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                marginLeft: '6px',
              }}
              title="Close Fullscreen Viewer (Esc)"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Main Image Display Box */}
        <div
          style={{
            position: 'relative',
            maxHeight: '80vh',
            maxWidth: '88vw',
            width: '100%',
            overflow: 'auto',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            borderRadius: '12px',
            background: 'rgba(0, 0, 0, 0.4)',
            padding: '16px',
          }}
        >
          {isImgLoading && !imgLoadFailed && (
            <div
              style={{
                position: 'absolute',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: '10px',
                color: '#93C5FD',
              }}
            >
              <Loader2 size={36} className="animate-spin" />
              <span style={{ fontSize: '0.85rem', fontWeight: 600 }}>Loading proof image...</span>
            </div>
          )}

          {imgLoadFailed ? (
            <div
              style={{
                padding: '40px 24px',
                textAlign: 'center',
                color: '#F87171',
                background: 'rgba(239, 68, 68, 0.1)',
                borderRadius: '8px',
                border: '1px solid rgba(239, 68, 68, 0.3)',
                maxWidth: '450px',
              }}
            >
              <FileText size={48} style={{ margin: '0 auto 12px', opacity: 0.8 }} />
              <h4 style={{ color: '#fff', margin: '0 0 8px 0', fontSize: '1rem' }}>
                Preview Unavailable
              </h4>
              <p style={{ fontSize: '0.825rem', color: '#CBD5E1', margin: '0 0 16px 0', lineHeight: 1.5 }}>
                The uploaded file cannot be rendered inline. You can open or download the original file directly.
              </p>
              {photoUrl && (
                <a
                  href={photoUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="btn btn-primary btn-sm"
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '6px',
                    padding: '8px 16px',
                    textDecoration: 'none',
                    fontWeight: 600,
                  }}
                >
                  <ExternalLink size={14} />
                  <span>Open Attachment</span>
                </a>
              )}
            </div>
          ) : (
            <img
              src={photoUrl}
              alt={currentPhoto?.original_file_name || `Submission photo ${currentIndex + 1}`}
              onLoad={() => setIsImgLoading(false)}
              onError={(e) => {
                if (e.currentTarget.src !== DEFAULT_PROOF_PLACEHOLDER) {
                  e.currentTarget.src = DEFAULT_PROOF_PLACEHOLDER;
                  setIsImgLoading(false);
                } else {
                  setIsImgLoading(false);
                  setImgLoadFailed(true);
                }
              }}
              style={{
                maxHeight: '75vh',
                maxWidth: '82vw',
                objectFit: 'contain',
                transform: `scale(${zoom}) rotate(${rotation}deg)`,
                transformOrigin: 'center center',
                transition: 'transform 0.15s ease',
                borderRadius: '8px',
                boxShadow: '0 12px 40px rgba(0, 0, 0, 0.7)',
                display: isImgLoading ? 'none' : 'block',
              }}
            />
          )}

          {/* Navigation Arrows for Multi-Photo Submissions */}
          {photos.length > 1 && (
            <>
              <button
                type="button"
                onClick={handlePrev}
                style={{
                  position: 'fixed',
                  left: '24px',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  background: 'rgba(15, 23, 42, 0.8)',
                  color: '#FFFFFF',
                  borderRadius: '50%',
                  width: '46px',
                  height: '46px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  boxShadow: '0 4px 14px rgba(0,0,0,0.5)',
                  border: '1px solid rgba(255, 255, 255, 0.2)',
                  cursor: 'pointer',
                  transition: 'background 0.2s',
                  zIndex: 100000,
                }}
                title="Previous Photo (Left Arrow)"
              >
                <ChevronLeft size={28} />
              </button>

              <button
                type="button"
                onClick={handleNext}
                style={{
                  position: 'fixed',
                  right: '24px',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  background: 'rgba(15, 23, 42, 0.8)',
                  color: '#FFFFFF',
                  borderRadius: '50%',
                  width: '46px',
                  height: '46px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  boxShadow: '0 4px 14px rgba(0,0,0,0.5)',
                  border: '1px solid rgba(255, 255, 255, 0.2)',
                  cursor: 'pointer',
                  transition: 'background 0.2s',
                  zIndex: 100000,
                }}
                title="Next Photo (Right Arrow)"
              >
                <ChevronRight size={28} />
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
};
