import React, { useState } from 'react';
import { X, ChevronLeft, ChevronRight, ZoomIn, ZoomOut, Download } from 'lucide-react';

export const PhotoViewerModal = ({ photos = [], initialIndex = 0, onClose }) => {
  const [currentIndex, setCurrentIndex] = useState(initialIndex);
  const [zoom, setZoom] = useState(1);

  if (!photos || photos.length === 0) return null;

  const currentPhoto = photos[currentIndex];
  const photoUrl = currentPhoto?.signed_url || currentPhoto?.url || currentPhoto?.storage_path;

  const handlePrev = (e) => {
    e.stopPropagation();
    setZoom(1);
    setCurrentIndex((prev) => (prev > 0 ? prev - 1 : photos.length - 1));
  };

  const handleNext = (e) => {
    e.stopPropagation();
    setZoom(1);
    setCurrentIndex((prev) => (prev < photos.length - 1 ? prev + 1 : 0));
  };

  return (
    <div
      className="modal-overlay"
      style={{ zIndex: 70, backgroundColor: 'rgba(15, 23, 42, 0.88)' }}
      onClick={onClose}
    >
      <div
        style={{
          position: 'relative',
          maxWidth: '90vw',
          maxHeight: '90vh',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Top Controls */}
        <div
          style={{
            width: '100%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '8px 12px',
            color: '#FFFFFF',
            marginBottom: '8px',
          }}
        >
          <div style={{ fontSize: '0.875rem', fontWeight: 500 }}>
            {currentPhoto?.original_file_name || `Photo ${currentIndex + 1}`} ({currentIndex + 1} of {photos.length})
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <button
              onClick={() => setZoom((z) => Math.min(z + 0.25, 2.5))}
              style={{ color: '#fff', padding: 6, borderRadius: 4, background: 'rgba(255,255,255,0.1)' }}
              title="Zoom In"
            >
              <ZoomIn size={18} />
            </button>
            <button
              onClick={() => setZoom((z) => Math.max(z - 0.25, 0.75))}
              style={{ color: '#fff', padding: 6, borderRadius: 4, background: 'rgba(255,255,255,0.1)' }}
              title="Zoom Out"
            >
              <ZoomOut size={18} />
            </button>
            {photoUrl && (
              <a
                href={photoUrl}
                target="_blank"
                rel="noreferrer"
                download
                style={{ color: '#fff', padding: 6, borderRadius: 4, background: 'rgba(255,255,255,0.1)', display: 'flex' }}
                title="Open / Download"
              >
                <Download size={18} />
              </a>
            )}
            <button
              onClick={onClose}
              style={{ color: '#fff', padding: 6, borderRadius: '50%', background: 'rgba(255,255,255,0.2)' }}
              title="Close"
            >
              <X size={20} />
            </button>
          </div>
        </div>

        {/* Main Image Container */}
        <div
          style={{
            position: 'relative',
            maxHeight: '80vh',
            maxWidth: '85vw',
            overflow: 'auto',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            borderRadius: '8px',
          }}
        >
          <img
            src={photoUrl}
            alt={currentPhoto?.original_file_name || 'Submission photo'}
            style={{
              maxHeight: '75vh',
              maxWidth: '80vw',
              objectFit: 'contain',
              transform: `scale(${zoom})`,
              transition: 'transform 0.15s ease',
              borderRadius: '6px',
              boxShadow: '0 8px 30px rgba(0,0,0,0.5)',
            }}
          />

          {photos.length > 1 && (
            <>
              <button
                onClick={handlePrev}
                style={{
                  position: 'absolute',
                  left: '12px',
                  background: 'rgba(15, 23, 42, 0.65)',
                  color: '#fff',
                  borderRadius: '50%',
                  width: '40px',
                  height: '40px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  boxShadow: '0 2px 8px rgba(0,0,0,0.3)',
                }}
              >
                <ChevronLeft size={24} />
              </button>
              <button
                onClick={handleNext}
                style={{
                  position: 'absolute',
                  right: '12px',
                  background: 'rgba(15, 23, 42, 0.65)',
                  color: '#fff',
                  borderRadius: '50%',
                  width: '40px',
                  height: '40px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  boxShadow: '0 2px 8px rgba(0,0,0,0.3)',
                }}
              >
                <ChevronRight size={24} />
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
};
