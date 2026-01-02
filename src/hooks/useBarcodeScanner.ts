// src/hooks/useBarcodeScanner.ts - USB Barcode Scanner Hook

import { useEffect, useState, useCallback, useRef } from "react";

interface BarcodeScannerOptions {
  onScan: (barcode: string) => void;
  onError?: (error: string) => void;
  minLength?: number; // Minimum barcode length (default: 5)
  maxLength?: number; // Maximum barcode length (default: 50)
  timeout?: number; // Time between keystrokes to consider as scanner input (default: 100ms)
  preventDefault?: boolean; // Prevent default behavior (default: true)
  enabled?: boolean; // Enable/disable scanner (default: true)
}

/**
 * Hook for USB barcode scanner integration
 * 
 * Barcode scanners typically send keystrokes very quickly (< 50ms between characters)
 * followed by an Enter key. This hook detects that pattern and triggers the onScan callback.
 * 
 * @example
 * ```tsx
 * useBarcodeScanner({
 *   onScan: (barcode) => {
 *     console.log('Scanned:', barcode);
 *     // Handle barcode
 *   },
 *   onError: (error) => {
 *     console.error('Scanner error:', error);
 *   }
 * });
 * ```
 */
export function useBarcodeScanner({
  onScan,
  onError,
  minLength = 5,
  maxLength = 50,
  timeout = 100,
  preventDefault = true,
  enabled = true,
}: BarcodeScannerOptions) {
  const [buffer, setBuffer] = useState("");
  const [isScanning, setIsScanning] = useState(false);
  const lastKeystrokeTime = useRef<number>(0);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Clear buffer after timeout
  const clearBuffer = useCallback(() => {
    setBuffer("");
    setIsScanning(false);
  }, []);

  // Process scanned barcode
  const processBarcode = useCallback(
    (barcode: string) => {
      // Validate length
      if (barcode.length < minLength) {
        onError?.(`Barcode too short (min ${minLength} characters)`);
        return;
      }

      if (barcode.length > maxLength) {
        onError?.(`Barcode too long (max ${maxLength} characters)`);
        return;
      }

      // Trigger callback
      onScan(barcode.trim());
    },
    [onScan, onError, minLength, maxLength]
  );

  useEffect(() => {
    if (!enabled) return;

    const handleKeyPress = (event: KeyboardEvent) => {
      const currentTime = Date.now();
      const timeSinceLastKey = currentTime - lastKeystrokeTime.current;

      // Clear timeout if exists
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }

      // If time between keystrokes is too long, reset buffer (human typing)
      if (timeSinceLastKey > timeout && buffer.length > 0) {
        clearBuffer();
      }

      lastKeystrokeTime.current = currentTime;

      // Enter key = end of barcode scan
      if (event.key === "Enter") {
        if (buffer.length > 0) {
          if (preventDefault) {
            event.preventDefault();
            event.stopPropagation();
          }
          processBarcode(buffer);
          clearBuffer();
        }
        return;
      }

      // Ignore special keys
      if (
        event.key.length > 1 &&
        event.key !== "Enter" &&
        event.key !== "Backspace"
      ) {
        return;
      }

      // Backspace handling
      if (event.key === "Backspace") {
        setBuffer((prev) => prev.slice(0, -1));
        return;
      }

      // Accumulate characters (scanner sends keystrokes quickly)
      if (event.key.length === 1) {
        setIsScanning(true);
        setBuffer((prev) => prev + event.key);

        // Set timeout to clear buffer if no more input
        timeoutRef.current = setTimeout(() => {
          clearBuffer();
        }, timeout * 2);

        // Prevent default if scanning
        if (preventDefault && timeSinceLastKey < timeout) {
          event.preventDefault();
          event.stopPropagation();
        }
      }
    };

    // Add event listener
    window.addEventListener("keypress", handleKeyPress, true);

    // Cleanup
    return () => {
      window.removeEventListener("keypress", handleKeyPress, true);
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [
    buffer,
    enabled,
    timeout,
    preventDefault,
    clearBuffer,
    processBarcode,
  ]);

  return {
    isScanning,
    buffer,
    clearBuffer,
  };
}

/**
 * Hook for manual barcode input (keyboard or scanner)
 * Provides state management for manual input field
 */
export function useManualBarcodeInput() {
  const [value, setValue] = useState("");
  const [lastScanned, setLastScanned] = useState("");

  const handleScan = useCallback((barcode: string) => {
    setLastScanned(barcode);
    setValue("");

    // Clear last scanned after 2 seconds
    setTimeout(() => {
      setLastScanned("");
    }, 2000);
  }, []);

  const clear = useCallback(() => {
    setValue("");
    setLastScanned("");
  }, []);

  return {
    value,
    setValue,
    lastScanned,
    handleScan,
    clear,
  };
}
