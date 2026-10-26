import React, { useState, useRef, useEffect } from 'react';
import {
  Camera,
  RotateCw,
  Sliders,
  Check,
  X,
  RefreshCw,
  Sparkles,
  Sun,
  Contrast,
  Zap,
  FlipHorizontal,
  PlusCircle,
  FileText,
  AlertCircle,
} from 'lucide-react';

export const CameraDocumentScanner = ({ onCapture, onClose }) => {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const streamRef = useRef(null);

  // Stream & Camera state
  const [cameras, setCameras] = useState([]);
  const [facingMode, setFacingMode] = useState('environment'); // 'environment' (back) or 'user' (front)
  const [cameraError, setCameraError] = useState('');
  const [torchOn, setTorchOn] = useState(false);
  const [hasTorch, setHasTorch] = useState(false);

  // Captured state
  const [capturedImage, setCapturedImage] = useState(null); // Data URL of raw capture
  const [rotation, setRotation] = useState(0); // 0, 90, 180, 270
  const [activeFilter, setActiveFilter] = useState('magic'); // 'original' | 'magic' | 'bw' | 'vivid'
  const [brightness, setBrightness] = useState(110); // percentage
  const [contrastVal, setContrastVal] = useState(135); // percentage
  const [batchCount, setBatchCount] = useState(0);

  // Start Camera
  const startCamera = async (mode = facingMode) => {
    setCameraError('');
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
    }

    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error('Camera access is not supported by this browser.');
      }

      const constraints = {
        video: {
          facingMode: { ideal: mode },
          width: { ideal: 1920 },
          height: { ideal: 1080 },
        },
        audio: false,
      };

      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      streamRef.current = stream;

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play().catch(() => {});
      }

      // Check if torch/flashlight is supported
      const track = stream.getVideoTracks()[0];
      const capabilities = track.getCapabilities ? track.getCapabilities() : {};
      if (capabilities.torch) {
        setHasTorch(true);
      } else {
        setHasTorch(false);
      }
    } catch (err) {
      console.error('Camera stream error:', err);
      setCameraError(
        err.name === 'NotAllowedError'
          ? 'Camera permission denied. Please allow camera access in browser settings.'
          : 'Unable to start camera. Please ensure no other application is using it.'
      );
    }
  };

  useEffect(() => {
    startCamera(facingMode);

    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((t) => t.stop());
      }
    };
  }, [facingMode]);

  // Toggle Torch/Flashlight
  const toggleTorch = async () => {
    if (!streamRef.current || !hasTorch) return;
    try {
      const track = streamRef.current.getVideoTracks()[0];
      await track.applyConstraints({
        advanced: [{ torch: !torchOn }],
      });
      setTorchOn(!torchOn);
    } catch (e) {
      console.warn('Torch toggle failed:', e);
    }
  };

  // Flip Camera
  const toggleFacingMode = () => {
    const nextMode = facingMode === 'environment' ? 'user' : 'environment';
    setFacingMode(nextMode);
  };

  // Capture Snapshot
  const capturePhoto = () => {
    if (!videoRef.current) return;
    const video = videoRef.current;
    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth || 1280;
    canvas.height = video.videoHeight || 720;
    const ctx = canvas.getContext('2d');
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

    const dataUrl = canvas.toDataURL('image/jpeg', 0.95);
    setCapturedImage(dataUrl);
    setRotation(0);
    setActiveFilter('magic');
    setBrightness(110);
    setContrastVal(135);

    // Stop live stream during edit
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
    }
  };

  // Retake
  const handleRetake = () => {
    setCapturedImage(null);
    startCamera(facingMode);
  };

  // Apply Document Filters & Rotations to Canvas
  useEffect(() => {
    if (!capturedImage || !canvasRef.current) return;

    const img = new Image();
    img.src = capturedImage;
    img.onload = () => {
      const canvas = canvasRef.current;
      const ctx = canvas.getContext('2d');

      const isRotatedSideways = rotation === 90 || rotation === 270;
      canvas.width = isRotatedSideways ? img.height : img.width;
      canvas.height = isRotatedSideways ? img.width : img.height;

      ctx.save();
      ctx.translate(canvas.width / 2, canvas.height / 2);
      ctx.rotate((rotation * Math.PI) / 180);

      // CSS-style Canvas Filter String
      let filterString = `brightness(${brightness}%) contrast(${contrastVal}%)`;
      if (activeFilter === 'bw') {
        filterString += ' grayscale(100%)';
      } else if (activeFilter === 'magic') {
        filterString += ' saturate(120%)';
      } else if (activeFilter === 'vivid') {
        filterString += ' saturate(175%)';
      } else if (activeFilter === 'original') {
        filterString = 'none';
      }

      ctx.filter = filterString;
      ctx.drawImage(img, -img.width / 2, -img.height / 2);
      ctx.restore();

      // For Magic Scan / Clean Paper enhancement:
      if (activeFilter === 'magic' || activeFilter === 'bw') {
        try {
          const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
          const data = imgData.data;
          // Simple paper whitening: boost near-white gray pixels to clean crisp white
          for (let i = 0; i < data.length; i += 4) {
            const r = data[i];
            const g = data[i + 1];
            const b = data[i + 2];
            const avg = (r + g + b) / 3;

            if (activeFilter === 'bw') {
              // Binary document thresholding
              const threshold = 145;
              const val = avg > threshold ? 255 : Math.max(0, avg * 0.6);
              data[i] = val;
              data[i + 1] = val;
              data[i + 2] = val;
            } else if (avg > 185) {
              // Whiten notebook paper background
              data[i] = Math.min(255, r * 1.08);
              data[i + 1] = Math.min(255, g * 1.08);
              data[i + 2] = Math.min(255, b * 1.08);
            }
          }
          ctx.putImageData(imgData, 0, 0);
        } catch (e) {
          // Ignore security error on local file url if any
        }
      }
    };
  }, [capturedImage, rotation, activeFilter, brightness, contrastVal]);

  // Convert canvas to real File and export
  const exportScannedFile = (andScanAnother = false) => {
    if (!canvasRef.current) return;
    const canvas = canvasRef.current;

    canvas.toBlob(
      (blob) => {
        if (!blob) return;
        const fileName = `Scanned_Practical_Page_${Date.now()}_${batchCount + 1}.jpg`;
        const scannedFile = new File([blob], fileName, { type: 'image/jpeg' });

        onCapture(scannedFile);
        setBatchCount((prev) => prev + 1);

        if (andScanAnother) {
          handleRetake();
        } else {
          onClose();
        }
      },
      'image/jpeg',
      0.92
    );
  };

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 10000,
        background: '#0F172A',
        color: '#FFFFFF',
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      {/* Top Header Bar */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '14px 20px',
          background: 'rgba(15, 23, 42, 0.95)',
          borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
          backdropFilter: 'blur(8px)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div
            style={{
              width: 34,
              height: 34,
              borderRadius: 'var(--radius-md)',
              background: 'linear-gradient(135deg, #4F46E5, #0D9488)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Camera size={18} color="#FFFFFF" />
          </div>
          <div>
            <h3 style={{ fontSize: '1rem', fontWeight: 700, margin: 0 }}>
              Document Scanner
            </h3>
            <span style={{ fontSize: '0.725rem', color: '#94A3B8' }}>
              {capturedImage ? 'Review & Enhance Scan' : 'Align notebook or practical page'}
            </span>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          {batchCount > 0 && (
            <span
              style={{
                background: 'rgba(13, 148, 136, 0.3)',
                color: '#2DD4BF',
                fontSize: '0.75rem',
                fontWeight: 700,
                padding: '4px 10px',
                borderRadius: 999,
                border: '1px solid #0D9488',
              }}
            >
              ✓ {batchCount} Page{batchCount > 1 ? 's' : ''} Scanned
            </span>
          )}

          <button
            type="button"
            onClick={onClose}
            style={{
              background: 'rgba(255, 255, 255, 0.1)',
              border: 'none',
              color: '#FFFFFF',
              borderRadius: '50%',
              width: 36,
              height: 36,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
            }}
            title="Close Scanner"
          >
            <X size={18} />
          </button>
        </div>
      </div>

      {/* Main View Area */}
      <div
        style={{
          flex: 1,
          position: 'relative',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          overflow: 'hidden',
          background: '#020617',
        }}
      >
        {cameraError ? (
          <div
            style={{
              maxWidth: 380,
              padding: 24,
              textAlign: 'center',
              background: 'rgba(239, 68, 68, 0.15)',
              border: '1px solid rgba(239, 68, 68, 0.4)',
              borderRadius: 'var(--radius-lg)',
              color: '#FCA5A5',
            }}
          >
            <AlertCircle size={40} style={{ margin: '0 auto 12px' }} />
            <h4 style={{ fontSize: '1.05rem', fontWeight: 700, marginBottom: 6 }}>Camera Access Issue</h4>
            <p style={{ fontSize: '0.85rem', lineHeight: 1.4, color: '#FEE2E2' }}>{cameraError}</p>
            <button
              type="button"
              className="btn btn-primary btn-sm"
              onClick={() => startCamera(facingMode)}
              style={{ marginTop: 16 }}
            >
              <RefreshCw size={14} />
              <span>Retry Permission</span>
            </button>
          </div>
        ) : !capturedImage ? (
          /* Live Camera Stream View */
          <div style={{ position: 'relative', width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              style={{
                width: '100%',
                height: '100%',
                objectFit: 'contain',
              }}
            />

            {/* Document Frame Guide Overlay */}
            <div
              style={{
                position: 'absolute',
                top: '50%',
                left: '50%',
                transform: 'translate(-50%, -50%)',
                width: 'min(82%, 480px)',
                height: 'min(78%, 680px)',
                border: '2px dashed rgba(79, 70, 229, 0.65)',
                borderRadius: 16,
                boxShadow: '0 0 0 9999px rgba(0, 0, 0, 0.45)',
                pointerEvents: 'none',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
                padding: 16,
              }}
            >
              {/* 4 Corner High-Tech Brackets */}
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <div style={{ width: 28, height: 28, borderTop: '4px solid #6366F1', borderLeft: '4px solid #6366F1', borderTopLeftRadius: 8 }} />
                <div style={{ width: 28, height: 28, borderTop: '4px solid #6366F1', borderRight: '4px solid #6366F1', borderTopRightRadius: 8 }} />
              </div>

              {/* Center Sweep Laser Line */}
              <div
                style={{
                  textAlign: 'center',
                  background: 'rgba(15, 23, 42, 0.75)',
                  padding: '6px 14px',
                  borderRadius: 20,
                  fontSize: '0.75rem',
                  fontWeight: 600,
                  color: '#A5B4FC',
                  border: '1px solid rgba(99, 102, 241, 0.4)',
                  alignSelf: 'center',
                }}
              >
                📄 Position Handwritten Page Within Frame
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <div style={{ width: 28, height: 28, borderBottom: '4px solid #6366F1', borderLeft: '4px solid #6366F1', borderBottomLeftRadius: 8 }} />
                <div style={{ width: 28, height: 28, borderBottom: '4px solid #6366F1', borderRight: '4px solid #6366F1', borderBottomRightRadius: 8 }} />
              </div>
            </div>
          </div>
        ) : (
          /* Captured & Filter Canvas View */
          <div
            style={{
              width: '100%',
              height: '100%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: 16,
            }}
          >
            <canvas
              ref={canvasRef}
              style={{
                maxWidth: '100%',
                maxHeight: '100%',
                objectFit: 'contain',
                borderRadius: 8,
                boxShadow: '0 8px 30px rgba(0, 0, 0, 0.5)',
              }}
            />
          </div>
        )}
      </div>

      {/* Bottom Controls Bar */}
      <div
        style={{
          background: 'rgba(15, 23, 42, 0.98)',
          borderTop: '1px solid rgba(255, 255, 255, 0.1)',
          padding: '16px 20px',
        }}
      >
        {!capturedImage ? (
          /* Live Camera Controls */
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-around',
              maxWidth: 420,
              margin: '0 auto',
            }}
          >
            {/* Flip Camera */}
            <button
              type="button"
              onClick={toggleFacingMode}
              style={{
                background: 'rgba(255, 255, 255, 0.12)',
                border: 'none',
                color: '#FFFFFF',
                borderRadius: '50%',
                width: 48,
                height: 48,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
              }}
              title="Switch Front/Back Camera"
            >
              <FlipHorizontal size={22} />
            </button>

            {/* Shutter Capture Button */}
            <button
              type="button"
              onClick={capturePhoto}
              style={{
                width: 72,
                height: 72,
                borderRadius: '50%',
                background: '#FFFFFF',
                border: '4px solid #4F46E5',
                boxShadow: '0 0 20px rgba(79, 70, 229, 0.6)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                transition: 'transform 0.1s',
              }}
              title="Capture Scan"
            >
              <div
                style={{
                  width: 56,
                  height: 56,
                  borderRadius: '50%',
                  background: '#4F46E5',
                }}
              />
            </button>

            {/* Flashlight Torch Toggle */}
            <button
              type="button"
              onClick={toggleTorch}
              disabled={!hasTorch}
              style={{
                background: torchOn ? '#FEF08A' : 'rgba(255, 255, 255, 0.12)',
                border: 'none',
                color: torchOn ? '#854D0E' : hasTorch ? '#FFFFFF' : '#64748B',
                borderRadius: '50%',
                width: 48,
                height: 48,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: hasTorch ? 'pointer' : 'not-allowed',
              }}
              title={hasTorch ? 'Toggle Flashlight' : 'Torch not available'}
            >
              <Zap size={22} />
            </button>
          </div>
        ) : (
          /* Post-Capture Review & Document Filters Controls */
          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', maxWidth: 640, margin: '0 auto' }}>
            {/* Filter Pills */}
            <div style={{ display: 'flex', justifyContent: 'center', gap: '8px', flexWrap: 'wrap' }}>
              {[
                { id: 'magic', label: 'Magic Clean ✨', desc: 'Whitens notebook paper & sharpens ink' },
                { id: 'bw', label: 'B&W Contrast 📄', desc: 'Binary clean black ink' },
                { id: 'vivid', label: 'Color Diagram 🎨', desc: 'Vibrant colors for flowcharts' },
                { id: 'original', label: 'Original 📷', desc: 'Raw camera photo' },
              ].map((f) => (
                <button
                  key={f.id}
                  type="button"
                  onClick={() => setActiveFilter(f.id)}
                  style={{
                    padding: '6px 12px',
                    borderRadius: 999,
                    fontSize: '0.75rem',
                    fontWeight: 600,
                    cursor: 'pointer',
                    background: activeFilter === f.id ? '#4F46E5' : 'rgba(255, 255, 255, 0.1)',
                    color: activeFilter === f.id ? '#FFFFFF' : '#CBD5E1',
                    border: `1px solid ${activeFilter === f.id ? '#6366F1' : 'transparent'}`,
                  }}
                >
                  {f.label}
                </button>
              ))}
            </div>

            {/* Rotation & Adjustments Bar */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '16px' }}>
              <button
                type="button"
                onClick={() => setRotation((prev) => (prev + 90) % 360)}
                style={{
                  background: 'rgba(255, 255, 255, 0.1)',
                  border: 'none',
                  color: '#FFFFFF',
                  borderRadius: 'var(--radius-md)',
                  padding: '6px 12px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  fontSize: '0.8rem',
                  cursor: 'pointer',
                }}
              >
                <RotateCw size={15} />
                <span>Rotate 90°</span>
              </button>

              <button
                type="button"
                onClick={handleRetake}
                style={{
                  background: 'rgba(255, 255, 255, 0.1)',
                  border: 'none',
                  color: '#FFFFFF',
                  borderRadius: 'var(--radius-md)',
                  padding: '6px 12px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  fontSize: '0.8rem',
                  cursor: 'pointer',
                }}
              >
                <RefreshCw size={15} />
                <span>Retake</span>
              </button>
            </div>

            {/* Action Buttons: Add Page & Done */}
            <div style={{ display: 'flex', gap: '10px' }}>
              <button
                type="button"
                onClick={() => exportScannedFile(true)}
                className="btn btn-secondary"
                style={{ flex: 1, justifyContent: 'center', fontSize: '0.875rem' }}
              >
                <PlusCircle size={16} />
                <span>Save & Scan Next Page</span>
              </button>

              <button
                type="button"
                onClick={() => exportScannedFile(false)}
                className="btn btn-primary"
                style={{ flex: 1, justifyContent: 'center', fontSize: '0.875rem', background: 'var(--success-main)' }}
              >
                <Check size={16} />
                <span>Add to Submission</span>
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
