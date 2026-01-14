// src/components/common/PrintableDocument.tsx - Safe React-based Print Component
import React, { useRef } from "react";
import { useReactToPrint } from "react-to-print";
import { Printer } from "lucide-react";

interface PrintableDocumentProps {
  children: React.ReactNode;
  documentTitle?: string;
  buttonText?: string;
  buttonClassName?: string;
  onBeforePrint?: () => Promise<void>;
  onAfterPrint?: () => Promise<void>;
}

/**
 * Safe React-based Print Component
 * Uses react-to-print (Trusted Types compliant)
 * No eval(), no new Function(), no unsafe HTML injection
 */
export default function PrintableDocument({
  children,
  documentTitle = "Print Document",
  buttonText = "Print",
  buttonClassName = "px-4 py-2 bg-primary hover:bg-primary/90 text-white rounded-lg flex items-center gap-2 font-medium transition-colors",
  onBeforePrint,
  onAfterPrint,
}: PrintableDocumentProps) {
  const contentRef = useRef<HTMLDivElement>(null);

  const handlePrint = useReactToPrint({
    contentRef,
    documentTitle,
    onBeforePrint,
    onAfterPrint,
  });
     
  return (
    <>
      <button onClick={handlePrint} className={buttonClassName}>
        <Printer size={18} />
        {buttonText}
      </button>

      {/* Hidden printable content */}
      <div style={{ display: "none" }}>
        <div ref={contentRef}>{children}</div>
      </div>
    </>
  );
}

/**
 * Hook version for programmatic printing
 */
export function usePrintDocument() {
  const contentRef = useRef<HTMLDivElement>(null);

  const print = useReactToPrint({
    contentRef,
  });

  return { contentRef, print };
}
