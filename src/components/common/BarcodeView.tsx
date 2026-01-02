// src/components/common/BarcodeView.tsx
import { useEffect, useRef } from "react";
import JsBarcode from "jsbarcode";

export default function BarcodeView({ value, height = 50, showValue = false }: { value: string, height?: number, showValue?: boolean }) {
  const svgRef = useRef<SVGSVGElement | null>(null);

  useEffect(() => {
    if (!svgRef.current) return;
    try {
      JsBarcode(svgRef.current, value, {
         format: "CODE128",
         displayValue: showValue,
         fontSize: 5,
         height: height,
         width: 0.7, // Minimum scannable width - saves space while maintaining readability
         margin: 0,
         background: "#ffffff",
         lineColor: "#000000",
      });
    } catch (err) {
      console.error("JsBarcode render error:", err);
    }
  }, [value, height, showValue]);

  return <svg ref={svgRef} />;
}
