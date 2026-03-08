import React, { useState, useCallback, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X, CheckCircle2, AlertCircle, Keyboard, Camera } from 'lucide-react';

interface MobileBarcodeScannerProps {
  onScan: (data: string) => void;
  onClose: () => void;
  isScanning: boolean;
  statusMessage?: string;
  error?: string | null;
}

export const MobileBarcodeScanner: React.FC<MobileBarcodeScannerProps> = ({
  onScan,
  onClose,
  isScanning,
  statusMessage,
  error
}) => {
  const [lastScanned, setLastScanned] = useState<string | null>(null);
  const [scanCooldown, setScanCooldown] = useState(false);
  const [cameraAvailable, setCameraAvailable] = useState<boolean | null>(null);
  const [cameraErrorMessage, setCameraErrorMessage] = useState<string | null>(null);
  const [manualEntry, setManualEntry] = useState('');
  const [showManualInput, setShowManualInput] = useState(false);
  const [BarcodeScanner, setBarcodeScanner] = useState<any>(null);

  useEffect(() => {
    if (!isScanning) return;

    let cancelled = false;

    const checkCamera = async () => {
      try {
        setCameraErrorMessage(null);
        if (!window.isSecureContext) {
          setCameraAvailable(false);
          setShowManualInput(true);
          setCameraErrorMessage('Camera scanning requires a secure connection (HTTPS). Open the app over HTTPS or localhost, then try again.');
          return;
        }
        if (!navigator.mediaDevices?.getUserMedia) {
          setCameraAvailable(false);
          setShowManualInput(true);
          setCameraErrorMessage('Camera access is not available on this device/browser.');
          return;
        }
        const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
        stream.getTracks().forEach(t => t.stop());
        if (!cancelled) {
          setCameraAvailable(true);
          const mod = await import('react-qr-barcode-scanner');
          if (!cancelled) setBarcodeScanner(() => mod.default);
        }
      } catch (error: any) {
        if (!cancelled) {
          setCameraAvailable(false);
          setShowManualInput(true);
          const errorName = String(error?.name || '').toLowerCase();
          if (errorName === 'notallowederror') {
            setCameraErrorMessage('Camera permission was denied. Enable camera access in Safari settings and reload.');
          } else if (errorName === 'notreadableerror') {
            setCameraErrorMessage('Camera is in use by another app. Close other camera apps and try again.');
          } else {
            setCameraErrorMessage('Unable to start camera scanning on this device. You can still enter tag numbers manually.');
          }
        }
      }
    };

    checkCamera();
    return () => { cancelled = true; };
  }, [isScanning]);

  const handleScan = useCallback((err: any, result: any) => {
    if (result && !scanCooldown) {
      const scannedText = result.getText();
      if (scannedText === lastScanned) return;

      setLastScanned(scannedText);
      setScanCooldown(true);
      onScan(scannedText);

      if (typeof navigator !== 'undefined' && navigator.vibrate) {
        navigator.vibrate(50);
      }

      setTimeout(() => setScanCooldown(false), 2000);
      setTimeout(() => setLastScanned(null), 5000);
    }
  }, [lastScanned, onScan, scanCooldown]);

  const handleManualSubmit = () => {
    const tag = manualEntry.trim();
    if (!tag) return;
    onScan(tag);
    setLastScanned(tag);
    setManualEntry('');
  };

  if (!isScanning) return null;

  return createPortal(
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        zIndex: 99999,
        display: 'flex',
        flexDirection: 'column',
        backgroundColor: '#000000',
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '16px',
          paddingTop: 'max(16px, env(safe-area-inset-top))',
          backgroundColor: 'rgba(0,0,0,0.8)',
          color: '#ffffff',
        }}
      >
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          <span style={{ fontWeight: 600, fontSize: '16px', color: '#ffffff' }}>Scanner</span>
          {statusMessage && <span style={{ fontSize: '12px', color: '#a1a1aa' }}>{statusMessage}</span>}
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button
            style={{
              width: 44, height: 44,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              borderRadius: '50%',
              backgroundColor: showManualInput ? 'rgba(2,132,199,0.6)' : 'rgba(255,255,255,0.2)',
              border: 'none', cursor: 'pointer',
            }}
            onClick={() => setShowManualInput(!showManualInput)}
          >
            {showManualInput
              ? <Camera style={{ width: 20, height: 20, color: '#ffffff' }} />
              : <Keyboard style={{ width: 20, height: 20, color: '#ffffff' }} />}
          </button>
          <button
            style={{
              width: 44, height: 44,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              borderRadius: '50%',
              backgroundColor: 'rgba(255,255,255,0.2)',
              border: 'none', cursor: 'pointer',
            }}
            onClick={(e) => { e.preventDefault(); e.stopPropagation(); onClose(); }}
          >
            <X style={{ width: 24, height: 24, color: '#ffffff' }} />
          </button>
        </div>
      </div>

      <div style={{ flex: 1, position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
        {showManualInput ? (
          <div style={{ padding: 24, width: '100%', maxWidth: 400 }}>
            <p style={{ color: '#a1a1aa', fontSize: 14, textAlign: 'center', marginBottom: 24 }}>
              {cameraErrorMessage || 'Enter a tag number manually'}
            </p>
            <div style={{ display: 'flex', gap: 8 }}>
              <input
                type="text"
                value={manualEntry}
                onChange={(e) => setManualEntry(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleManualSubmit()}
                placeholder="Tag number..."
                autoFocus
                style={{
                  flex: 1, padding: '12px 16px', fontSize: 16,
                  borderRadius: 8, border: '1px solid rgba(255,255,255,0.3)',
                  backgroundColor: 'rgba(255,255,255,0.1)', color: '#ffffff',
                  outline: 'none',
                }}
              />
              <button
                onClick={handleManualSubmit}
                style={{
                  padding: '12px 20px', fontSize: 14, fontWeight: 600,
                  borderRadius: 8, border: 'none',
                  backgroundColor: '#0284c7', color: '#ffffff',
                  cursor: 'pointer',
                }}
              >
                Submit
              </button>
            </div>
          </div>
        ) : cameraAvailable && BarcodeScanner ? (
          <>
            <BarcodeScanner
              onUpdate={handleScan}
              width="100%"
              height="100%"
              style={{ objectFit: 'cover' }}
            />
            <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', pointerEvents: 'none' }}>
              <div style={{ width: 256, height: 256, border: '2px solid rgba(255,255,255,0.4)', borderRadius: 8 }} />
            </div>
          </>
        ) : (
          <div style={{ padding: 24, textAlign: 'center' }}>
            <p style={{ color: '#a1a1aa', fontSize: 14 }}>
              {cameraAvailable === null ? 'Checking camera access...' : 'Camera not available. Tap the keyboard icon to enter tags manually.'}
            </p>
          </div>
        )}
      </div>

      <div
        style={{
          padding: '16px 24px',
          paddingBottom: 'max(16px, env(safe-area-inset-bottom))',
          backgroundColor: 'rgba(0,0,0,0.8)',
          color: '#ffffff',
        }}
      >
        {error ? (
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12, padding: 12, backgroundColor: 'rgba(127,29,29,0.4)', border: '1px solid rgba(239,68,68,0.5)', borderRadius: 8 }}>
            <AlertCircle style={{ width: 20, height: 20, flexShrink: 0, color: '#f87171' }} />
            <div style={{ fontSize: 14 }}>
              <p style={{ fontWeight: 700, color: '#fca5a5' }}>Scan Error</p>
              <p style={{ color: '#fecaca' }}>{error}</p>
            </div>
          </div>
        ) : lastScanned ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: 12, backgroundColor: 'rgba(6,78,59,0.4)', border: '1px solid rgba(16,185,129,0.5)', borderRadius: 8 }}>
            <CheckCircle2 style={{ width: 20, height: 20, flexShrink: 0, color: '#34d399' }} />
            <div style={{ fontSize: 14 }}>
              <p style={{ fontWeight: 700, color: '#6ee7b7' }}>Scanned: {lastScanned}</p>
              <p style={{ fontSize: 12, color: 'rgba(167,243,208,0.7)', fontStyle: 'italic' }}>Matching tag...</p>
            </div>
          </div>
        ) : (
          <p style={{ textAlign: 'center', color: '#a1a1aa', fontSize: 14 }}>
            {showManualInput ? 'Type a tag number and tap Submit' : 'Point camera at a barcode or QR code'}
          </p>
        )}
      </div>
    </div>,
    document.body
  );
};
