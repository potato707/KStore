'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { Camera, Flashlight, FlashlightOff, ScanLine } from 'lucide-react';
import { Modal } from '@/components/common/Modal';
import { Button } from '@/components/common/Button';
import { Input } from '@/components/common/Input';

interface CameraBarcodeScannerProps {
  isOpen: boolean;
  onClose: () => void;
  onDetected: (barcode: string) => void;
}

export function CameraBarcodeScanner({ isOpen, onClose, onDetected }: CameraBarcodeScannerProps) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const trackRef = useRef<MediaStreamTrack | null>(null);
  const detectorRef = useRef<any>(null);
  const scanTimerRef = useRef<number | null>(null);
  const lastScannedRef = useRef<string>('');
  const lastScanTimeRef = useRef<number>(0);

  const [error, setError] = useState('');
  const [manualCode, setManualCode] = useState('');
  const [isSupported, setIsSupported] = useState(true);
  const [canTorch, setCanTorch] = useState(false);
  const [torchOn, setTorchOn] = useState(false);

  const stopScanner = useCallback(() => {
    if (scanTimerRef.current) {
      window.clearTimeout(scanTimerRef.current);
      scanTimerRef.current = null;
    }

    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }

    trackRef.current = null;
    detectorRef.current = null;
    setTorchOn(false);
    setCanTorch(false);
  }, []);

  const scanLoop = useCallback(async () => {
    if (!isOpen || !videoRef.current || !detectorRef.current) return;

    try {
      if (videoRef.current.readyState >= 2) {
        const barcodes = await detectorRef.current.detect(videoRef.current);
        if (barcodes?.length) {
          const code = (barcodes[0].rawValue || '').trim();
          const now = Date.now();

          if (code && (code !== lastScannedRef.current || now - lastScanTimeRef.current > 1200)) {
            lastScannedRef.current = code;
            lastScanTimeRef.current = now;
            onDetected(code);
            stopScanner();
            onClose();
            return;
          }
        }
      }
    } catch {
      // ignore single frame errors
    }

    scanTimerRef.current = window.setTimeout(scanLoop, 220);
  }, [isOpen, onClose, onDetected, stopScanner]);

  const startScanner = useCallback(async () => {
    setError('');
    setIsSupported(true);

    try {
      if (!navigator.mediaDevices?.getUserMedia) {
        setError('الكاميرا غير مدعومة في هذا المتصفح');
        return;
      }

      const BarcodeDetectorClass = (window as any).BarcodeDetector;
      if (!BarcodeDetectorClass) {
        setIsSupported(false);
        setError('مسح الباركود بالكاميرا غير مدعوم هنا. استخدم الإدخال اليدوي أسفل النافذة.');
        return;
      }

      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: { ideal: 'environment' },
          width: { ideal: 1280 },
          height: { ideal: 720 },
        },
      });

      streamRef.current = stream;
      trackRef.current = stream.getVideoTracks()[0] || null;

      const capabilities = (trackRef.current as any)?.getCapabilities?.();
      setCanTorch(Boolean(capabilities?.torch));

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }

      try {
        detectorRef.current = new BarcodeDetectorClass({
          formats: ['ean_13', 'ean_8', 'upc_a', 'upc_e', 'code_128', 'code_39', 'itf', 'qr_code'],
        });
      } catch {
        detectorRef.current = new BarcodeDetectorClass();
      }

      scanLoop();
    } catch {
      setError('تعذر تشغيل الكاميرا. تأكد من السماح بالإذن أو جرّب الإدخال اليدوي.');
    }
  }, [scanLoop]);

  useEffect(() => {
    if (isOpen) {
      startScanner();
    } else {
      stopScanner();
      setManualCode('');
      setError('');
    }

    return () => {
      stopScanner();
    };
  }, [isOpen, startScanner, stopScanner]);

  const toggleTorch = async () => {
    try {
      if (!trackRef.current || !canTorch) return;
      const nextTorchState = !torchOn;
      await (trackRef.current as any).applyConstraints({
        advanced: [{ torch: nextTorchState }],
      });
      setTorchOn(nextTorchState);
    } catch {
      setError('الفلاش غير مدعوم على هذا الجهاز');
    }
  };

  const submitManualCode = () => {
    const code = manualCode.trim();
    if (!code) return;
    onDetected(code);
    onClose();
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="مسح الباركود بالكاميرا" size="lg">
      <div className="space-y-4">
        <div className="relative overflow-hidden rounded-xl border border-gray-200 bg-black">
          <video ref={videoRef} className="h-72 w-full object-cover md:h-96" muted playsInline autoPlay />
          <div className="pointer-events-none absolute inset-0 border-[3px] border-white/20" />
          <div className="pointer-events-none absolute left-1/2 top-1/2 h-40 w-64 -translate-x-1/2 -translate-y-1/2 rounded-xl border-2 border-green-400/80 shadow-[0_0_0_9999px_rgba(0,0,0,0.15)]" />
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Button variant="secondary" onClick={startScanner}>
            <Camera className="h-4 w-4" />
            إعادة تشغيل الكاميرا
          </Button>

          {canTorch && (
            <Button variant="ghost" onClick={toggleTorch}>
              {torchOn ? <FlashlightOff className="h-4 w-4" /> : <Flashlight className="h-4 w-4" />}
              {torchOn ? 'إطفاء الفلاش' : 'تشغيل الفلاش'}
            </Button>
          )}

          <div className="inline-flex items-center gap-2 rounded-lg bg-blue-50 px-3 py-2 text-sm text-blue-700">
            <ScanLine className="h-4 w-4" />
            وجّه الكاميرا للباركود وسيتم المسح تلقائياً
          </div>
        </div>

        {error && <p className="text-sm text-red-600">{error}</p>}

        {!isSupported && (
          <div className="rounded-lg border border-amber-200 bg-amber-50 p-3">
            <p className="mb-2 text-sm text-amber-800">الكاميرا لا تدعم قراءة الباركود في هذا المتصفح.</p>
          </div>
        )}

        <div className="grid grid-cols-1 gap-2 md:grid-cols-[1fr_auto]">
          <Input
            label="إدخال الباركود يدويًا (احتياطي)"
            value={manualCode}
            onChange={(e) => setManualCode(e.target.value)}
            placeholder="اكتب الباركود ثم نفّذ"
          />
          <Button className="md:self-end" onClick={submitManualCode}>
            تنفيذ
          </Button>
        </div>
      </div>
    </Modal>
  );
}
