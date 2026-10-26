import React, { useState, useEffect } from 'react';
import { Smartphone, Download, X, Share, PlusSquare } from 'lucide-react';

export const PWAInstallPrompt = () => {
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [isVisible, setIsVisible] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [showIOSInstructions, setShowIOSInstructions] = useState(false);

  useEffect(() => {
    // Check if already in standalone (installed) mode
    const isStandalone =
      window.matchMedia('(display-mode: standalone)').matches ||
      window.navigator.standalone === true;

    if (isStandalone) return;

    // Check if user dismissed it recently in this session
    if (sessionStorage.getItem('fy_pwa_dismissed') === 'true') return;

    // Detect iOS
    const userAgent = window.navigator.userAgent.toLowerCase();
    const isIosDevice = /iphone|ipad|ipod/.test(userAgent);
    setIsIOS(isIosDevice);

    if (isIosDevice) {
      // On iOS Safari, we can prompt after a short delay
      const timer = setTimeout(() => {
        setIsVisible(true);
      }, 3000);
      return () => clearTimeout(timer);
    }

    // Android / Chrome / Edge install prompt listener
    const handleBeforeInstall = (e) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setIsVisible(true);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstall);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstall);
    };
  }, []);

  const handleInstallClick = async () => {
    if (isIOS) {
      setShowIOSInstructions(true);
      return;
    }

    if (!deferredPrompt) return;

    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') {
      setIsVisible(false);
    }
    setDeferredPrompt(null);
  };

  const handleDismiss = () => {
    setIsVisible(false);
    sessionStorage.setItem('fy_pwa_dismissed', 'true');
  };

  if (!isVisible) return null;

  return (
    <div
      style={{
        position: 'fixed',
        bottom: 24,
        right: 24,
        zIndex: 9999,
        maxWidth: 360,
        width: 'calc(100vw - 48px)',
        background: '#FFFFFF',
        borderRadius: 'var(--radius-lg)',
        boxShadow: '0 12px 32px rgba(79, 70, 229, 0.25), 0 4px 12px rgba(0, 0, 0, 0.1)',
        border: '1px solid #C7D2FE',
        padding: '16px 18px',
        animation: 'slideUp 0.3s cubic-bezier(0.16, 1, 0.3, 1)',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '12px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div
            style={{
              width: 44,
              height: 44,
              borderRadius: 'var(--radius-md)',
              background: 'linear-gradient(135deg, #4F46E5, #0D9488)',
              color: '#FFFFFF',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
              boxShadow: '0 4px 10px rgba(79, 70, 229, 0.3)',
            }}
          >
            <Smartphone size={22} />
          </div>

          <div>
            <div style={{ fontWeight: 700, fontSize: '0.925rem', color: 'var(--text-main)' }}>
              Install FY IT Portal App
            </div>
            <div style={{ fontSize: '0.775rem', color: 'var(--text-muted)', marginTop: '2px', lineHeight: 1.3 }}>
              Fast 1-tap home screen access & offline daily to-do checklists
            </div>
          </div>
        </div>

        <button
          type="button"
          onClick={handleDismiss}
          style={{
            background: 'none',
            border: 'none',
            color: 'var(--text-subtle)',
            cursor: 'pointer',
            padding: 4,
          }}
          title="Dismiss"
        >
          <X size={16} />
        </button>
      </div>

      {showIOSInstructions ? (
        <div
          style={{
            marginTop: '12px',
            padding: '10px 12px',
            background: '#F0FDFA',
            border: '1px solid #99F6E4',
            borderRadius: 'var(--radius-md)',
            fontSize: '0.775rem',
            color: '#0F766E',
            display: 'flex',
            flexDirection: 'column',
            gap: '6px',
          }}
        >
          <div style={{ fontWeight: 700, display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span>To install on iPhone / iPad:</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            1. Tap Safari Share <Share size={13} />
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            2. Choose "Add to Home Screen" <PlusSquare size={13} />
          </div>
        </div>
      ) : (
        <div style={{ display: 'flex', gap: '8px', marginTop: '14px' }}>
          <button
            type="button"
            className="btn btn-primary btn-sm"
            onClick={handleInstallClick}
            style={{ flex: 1, justifyContent: 'center' }}
          >
            <Download size={14} />
            <span>Install App</span>
          </button>

          <button
            type="button"
            className="btn btn-secondary btn-sm"
            onClick={handleDismiss}
            style={{ fontSize: '0.8rem' }}
          >
            Later
          </button>
        </div>
      )}
    </div>
  );
};
