import { useEffect, useState, useCallback, useRef } from 'react';

interface BarcodeScannerOptions {
  enabled?: boolean;
  onScan: (barcode: string) => void;
  onError?: (error: string) => void;
  scanDelay?: number; // Delay between keystrokes to detect scanner (default: 50ms)
  minCodeLength?: number; // Minimum barcode length (default: 3)
  disabledWhenModalOpen?: boolean; // Disable scanner when modal is open
}

export function useBarcodeScanner({
  enabled = true,
  onScan,
  onError,
  scanDelay = 50,
  minCodeLength = 3,
  disabledWhenModalOpen = false,
}: BarcodeScannerOptions) {
  const [isScanning, setIsScanning] = useState(false);
  const [lastBarcode, setLastBarcode] = useState<string | null>(null);
  const keysRef = useRef<string[]>([]);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  const handleKeyDown = useCallback(
    (event: KeyboardEvent) => {
      // Ignore if scanner is disabled
      if (!enabled || disabledWhenModalOpen) return;

      // Ignore modifier keys
      if (event.ctrlKey || event.altKey || event.metaKey) return;

      // Check if user is typing in an input field
      const target = event.target as HTMLElement;
      const isInputFocused =
        target.tagName === 'INPUT' ||
        target.tagName === 'TEXTAREA' ||
        target.tagName === 'SELECT' ||
        target.contentEditable === 'true' ||
        target.closest('[role="dialog"]') !== null; // Check if inside modal

      // Don't interfere when user is typing in any input or modal
      if (isInputFocused) {
        return;
      }

      // This is a barcode scan - prevent default and handle it
      event.preventDefault();

      // Clear existing timeout
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }

      // Append the key to the buffer
      if (event.key === 'Enter') {
        // Enter key - process the barcode
        const barcode = keysRef.current.join('');

        if (barcode.length >= minCodeLength) {
          setIsScanning(true);
          setLastBarcode(barcode);

          onScan(barcode);

          // Clear the buffer
          keysRef.current = [];

          // Reset scanning state
          setTimeout(() => setIsScanning(false), 100);
        } else {
          // Clear the buffer if code is too short
          keysRef.current = [];
        }
      } else if (event.key.length === 1) {
        // Regular character key
        keysRef.current.push(event.key);

        // Set timeout to clear the buffer if no more keys are pressed
        timeoutRef.current = setTimeout(() => {
          keysRef.current = [];
        }, scanDelay);
      }
    },
    [enabled, onScan, onError, scanDelay, minCodeLength, disabledWhenModalOpen]
  );

  useEffect(() => {
    if (enabled) {
      window.addEventListener('keydown', handleKeyDown);

      return () => {
        window.removeEventListener('keydown', handleKeyDown);
        if (timeoutRef.current) {
          clearTimeout(timeoutRef.current);
        }
      };
    }
  }, [enabled, handleKeyDown]);

  return {
    isScanning,
    lastBarcode,
    clearLastBarcode: () => setLastBarcode(null),
  };
}
