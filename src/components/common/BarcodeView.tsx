// src/components/common/BarcodeView.tsx
import React, { useEffect, useRef } from "react";
import JsBarcode from "jsbarcode";

export default function BarcodeView({ value, height = 50, showValue = true }: { value: string, height?: number, showValue?: boolean }) {
  const svgRef = useRef<SVGSVGElement | null>(null);

  useEffect(() => {
    if (!svgRef.current) return;
    try {
      JsBarcode(svgRef.current, value, {
         format: "CODE128",
         displayValue: true,
         fontSize: 10,
         height: 35,
         width: 0.9,     // controls bar thickness → LOWER = less wide
         margin: 4,
      });
    } catch (err) {
      // swallow render errors but log
      console.error("JsBarcode render error:", err);
    }
  }, [value, height, showValue]);

  return <svg ref={svgRef} />;
}
