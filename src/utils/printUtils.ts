// src/utils/printUtils.ts - Universal Print Utility

/**
 * Universal print function that creates a clean print preview using iframe
 * This method works reliably across all browsers and ensures proper formatting
 * 
 * @param htmlContent - Complete HTML content to print (including <html>, <head>, <body>)
 * @param autoClosePrintWindow - Whether to auto-close the print window after printing (default: true)
 */
export function printDocument(htmlContent: string, autoClosePrintWindow: boolean = true): void {
  // Create a hidden iframe
  const iframe = document.createElement('iframe');
  iframe.style.position = 'absolute';
  iframe.style.width = '0';
  iframe.style.height = '0';
  iframe.style.border = 'none';
  iframe.style.visibility = 'hidden';
  
  document.body.appendChild(iframe);
  
  // Write content to iframe
  const iframeDoc = iframe.contentWindow?.document;
  if (!iframeDoc) {
    console.error('Failed to access iframe document');
    document.body.removeChild(iframe);
    return;
  }
  
  iframeDoc.open();
  iframeDoc.write(htmlContent);
  iframeDoc.close();
  
  // Wait for content to load, then print
  iframe.onload = () => {
    setTimeout(() => {
      iframe.contentWindow?.focus();
      iframe.contentWindow?.print();
      
      // Clean up after print
      if (autoClosePrintWindow) {
        setTimeout(() => {
          document.body.removeChild(iframe);
        }, 1000);
      }
    }, 500);
  };
}

/**
 * Alternative method: Use srcdoc attribute (more modern approach)
 */
export function printDocumentSrcDoc(htmlContent: string): void {
  const iframe = document.createElement('iframe');
  iframe.style.position = 'absolute';
  iframe.style.width = '0';
  iframe.style.height = '0';
  iframe.style.border = 'none';
  iframe.style.visibility = 'hidden';
  
  iframe.srcdoc = htmlContent;
  document.body.appendChild(iframe);
  
  iframe.onload = () => {
    setTimeout(() => {
      iframe.contentWindow?.print();
      setTimeout(() => {
        document.body.removeChild(iframe);
      }, 1000);
    }, 500);
  };
}

/**
 * Helper to create a complete HTML document for printing
 */
export function createPrintHTML(params: {
  title: string;
  styles?: string;
  bodyContent: string;
}): string {
  const { title, styles = '', bodyContent } = params;
  
  return `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="UTF-8">
        <title>${title}</title>
        <style>
          /* Base print styles */
          @page {
            size: A4;
            margin: 10mm;
          }
          
          body {
            margin: 0;
            padding: 20px;
            font-family: Arial, sans-serif;
            font-size: 12px;
            line-height: 1.4;
            color: #000;
            background: #fff;
          }
          
          * {
            box-sizing: border-box;
          }
          
          table {
            width: 100%;
            border-collapse: collapse;
            margin: 10px 0;
          }
          
          th, td {
            border: 1px solid #333;
            padding: 6px 8px;
            text-align: left;
          }
          
          th {
            background-color: #f0f0f0;
            font-weight: bold;
          }
          
          .text-right {
            text-align: right;
          }
          
          .text-center {
            text-align: center;
          }
          
          .font-bold {
            font-weight: bold;
          }
          
          .no-print {
            display: none !important;
          }
          
          /* Custom styles */
          ${styles}
        </style>
      </head>
      <body>
        ${bodyContent}
        
        <script>
          // Auto-print on load
          window.onload = function() {
            setTimeout(function() {
              window.print();
            }, 300);
          };
        </script>
      </body>
    </html>
  `;
}
