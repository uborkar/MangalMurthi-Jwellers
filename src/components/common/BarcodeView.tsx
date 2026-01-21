// src/components/common/BarcodeView.tsx
import { useEffect, useRef } from "react";
import JsBarcode from "jsbarcode";

interface BarcodeViewProps {
  value: string;
  height?: number;
  width?: number;
  displayValue?: boolean;
  fontSize?: number;
  margin?: number;
  showValue?: boolean; // Legacy prop for backwards compatibility
}

export default function BarcodeView({
  value,
  height = 50,
  width = 0.7,
  displayValue,
  fontSize = 5,
  margin = 0,
  showValue = false
}: BarcodeViewProps) {
  const svgRef = useRef<SVGSVGElement | null>(null);

  // Use displayValue if provided, otherwise fall back to showValue
  const shouldDisplayValue = displayValue !== undefined ? displayValue : showValue;

  useEffect(() => {
    if (!svgRef.current) return;
    try {
      JsBarcode(svgRef.current, value, {
        format: "CODE128",
        displayValue: shouldDisplayValue,
        fontSize: fontSize,
        height: height,
        width: width,
        margin: margin,
        background: "#ffffff",
        lineColor: "#000000",
      });
    } catch (err) {
      console.error("JsBarcode render error:", err);
    }
  }, [value, height, width, shouldDisplayValue, fontSize, margin]);

  return <svg ref={svgRef} />;
}
