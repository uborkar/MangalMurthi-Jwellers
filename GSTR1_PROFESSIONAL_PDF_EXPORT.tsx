// ============================================
// UPDATED PDF EXPORT - PROFESSIONAL TABLE LAYOUT
// Matching Daily Branch Report quality
// Replace the entire exportToPDF function with this
// ============================================

const exportToPDF = async () => {
    const loadingToast = toast.loading("Generating GSTR-1 PDF report...");

    try {
        const doc = new jsPDF('landscape', 'mm', 'a4');

        // Page dimensions
        const pageWidth = doc.internal.pageSize.getWidth();
        const pageHeight = doc.internal.pageSize.getHeight();

        // Company Header
        doc.setFontSize(18);
        doc.setFont("helvetica", "bold");
        doc.text('GSTR-1 - Details of Outward Supplies', pageWidth / 2, 20, { align: 'center' });

        doc.setFontSize(14);
        doc.text('MANGALMURTHI JEWELLERS', pageWidth / 2, 28, { align: 'center' });

        doc.setFontSize(10);
        doc.setFont("helvetica", "normal");
        doc.text('GSTIN: 27XXXXX1234X1XX', pageWidth / 2, 34, { align: 'center' });
        doc.text(`Period: ${dateFrom} to ${dateTo}`, pageWidth / 2, 40, { align: 'center' });

        // Calculate all values ONCE (avoid recalculation)
        const b2bCount = b2bRecords.reduce((sum, r) => sum + r.invoices.length, 0);
        const b2bInvoiceValue = b2bRecords.reduce((sum, r) => sum + r.totalValue, 0);
        const b2bTaxableValue = b2bRecords.reduce((sum, r) => sum + r.invoices.reduce((s, i) => s + i.taxableValue, 0), 0);
        const b2bIGST = b2bRecords.reduce((sum, r) => sum + r.invoices.reduce((s, i) => s + i.igstAmount, 0), 0);
        const b2bCGST = b2bRecords.reduce((sum, r) => sum + r.invoices.reduce((s, i) => s + i.cgstAmount, 0), 0);
        const b2bSGST = b2bRecords.reduce((sum, r) => sum + r.invoices.reduce((s, i) => s + i.sgstAmount, 0), 0);

        const b2clCount = b2clRecords.reduce((sum, r) => sum + r.invoices.length, 0);
        const b2clTaxableValue = b2clRecords.reduce((sum, r) => sum + r.totalValue, 0);
        const b2clIGST = b2clRecords.reduce((sum, r) => sum + r.invoices.reduce((s, i) => s + i.igstAmount, 0), 0);

        const b2csCount = b2csRecords.length;
        const b2csTaxableValue = b2csRecords.reduce((sum, r) => sum + r.taxableValue, 0);
        const b2csCGST = b2csRecords.reduce((sum, r) => sum + r.cgst, 0);
        const b2csSGST = b2csRecords.reduce((sum, r) => sum + r.sgst, 0);
        const b2csIGST = b2csRecords.reduce((sum, r) => sum + r.igst, 0);
        const b2csInvoiceValue = b2csTaxableValue + b2csCGST + b2csSGST + b2csIGST;

        const hsnCount = hsnSummary.length;
        const hsnTaxable = hsnSummary.reduce((sum, h) => sum + h.taxableValue, 0);
        const hsnCGST = hsnSummary.reduce((sum, h) => sum + h.cgst, 0);
        const hsnSGST = hsnSummary.reduce((sum, h) => sum + h.sgst, 0);
        const hsnIGST = hsnSummary.reduce((sum, h) => sum + h.igst, 0);

        const totalRecords = allRecords.length;

        // Helper function for number formatting
        const formatNumber = (value) => {
            if (!value || value === 0) return '0.00';
            return value.toFixed(2);
        };

        // Summary Table with FIXED column widths (CRITICAL)
        autoTable(doc, {
            startY: 48,
            head: [[
                'Particulars',
                'No. of\nRecords',
                'Invoice\nValue',
                'Taxable\nValue',
                'IGST',
                'CGST',
                'SGST',
                'Cess',
                'Total'
            ]],
            body: [
                [
                    'B2B Invoices - 4A, 4B, 4C, 6B, 6C',
                    b2bCount.toString(),
                    formatNumber(b2bInvoiceValue),
                    formatNumber(b2bTaxableValue),
                    formatNumber(b2bIGST),
                    formatNumber(b2bCGST),
                    formatNumber(b2bSGST),
                    '0.00',
                    formatNumber(b2bInvoiceValue)
                ],
                [
                    'B2C Large - 5A, 5B',
                    b2clCount.toString(),
                    formatNumber(b2clTaxableValue),
                    formatNumber(b2clTaxableValue),
                    formatNumber(b2clIGST),
                    '0.00',
                    '0.00',
                    '0.00',
                    formatNumber(b2clTaxableValue + b2clIGST)
                ],
                [
                    'B2C Small - 7',
                    b2csCount.toString(),
                    formatNumber(b2csInvoiceValue),
                    formatNumber(b2csTaxableValue),
                    formatNumber(b2csIGST),
                    formatNumber(b2csCGST),
                    formatNumber(b2csSGST),
                    '0.00',
                    formatNumber(b2csInvoiceValue)
                ],
                [
                    'HSN Summary - 12',
                    hsnCount.toString(),
                    '-',
                    formatNumber(hsnTaxable),
                    formatNumber(hsnIGST),
                    formatNumber(hsnCGST),
                    formatNumber(hsnSGST),
                    '0.00',
                    formatNumber(hsnTaxable + hsnCGST + hsnSGST + hsnIGST)
                ],
                [
                    'Document Summary - 13',
                    totalRecords.toString(),
                    '-',
                    '-',
                    '-',
                    '-',
                    '-',
                    '-',
                    '-'
                ]
            ],
            theme: 'grid',
            styles: {
                fontSize: 9,
                cellPadding: 3,
                font: 'helvetica',
                lineColor: [0, 0, 0],
                lineWidth: 0.5,
                halign: 'right',
                valign: 'middle'
            },
            headStyles: {
                fillColor: [68, 114, 196],
                textColor: [255, 255, 255],
                fontStyle: 'bold',
                halign: 'center',
                fontSize: 9,
                cellPadding: 4
            },
            columnStyles: {
                0: { halign: 'left', cellWidth: 75, fontStyle: 'bold' },    // Particulars
                1: { halign: 'center', cellWidth: 22 },                      // No. of Records
                2: { halign: 'right', cellWidth: 28, font: 'courier' },      // Invoice Value
                3: { halign: 'right', cellWidth: 28, font: 'courier' },      // Taxable Value
                4: { halign: 'right', cellWidth: 24, font: 'courier' },      // IGST
                5: { halign: 'right', cellWidth: 24, font: 'courier' },      // CGST
                6: { halign: 'right', cellWidth: 24, font: 'courier' },      // SGST
                7: { halign: 'right', cellWidth: 20, font: 'courier' },      // Cess
                8: { halign: 'right', cellWidth: 28, font: 'courier' }       // Total
            },
            margin: { left: 14, right: 14 }
        });

        // B2B Details (if any records exist)
        if (b2bRecords.length > 0) {
            doc.addPage();

            doc.setFontSize(14);
            doc.setFont("helvetica", "bold");
            doc.text('B2B - Business to Business Invoices (4A, 4B, 4C)', 14, 20);

            const b2bDetailData = [];
            b2bRecords.forEach(b2b => {
                b2b.invoices.forEach(inv => {
                    b2bDetailData.push([
                        b2b.gstin,
                        b2b.customerName,
                        inv.invoiceNumber,
                        new Date(inv.date).toLocaleDateString('en-GB'),
                        formatNumber(inv.totalValue),
                        formatNumber(inv.taxableValue),
                        formatNumber(inv.cgstRate + inv.sgstRate + inv.igstRate) + '%',
                        formatNumber(inv.cgstAmount),
                        formatNumber(inv.sgstAmount),
                        formatNumber(inv.igstAmount)
                    ]);
                });
            });

            autoTable(doc, {
                startY: 28,
                head: [[
                    'GSTIN',
                    'Customer',
                    'Invoice No',
                    'Date',
                    'Invoice\nValue',
                    'Taxable\nValue',
                    'Rate',
                    'CGST',
                    'SGST',
                    'IGST'
                ]],
                body: b2bDetailData,
                theme: 'striped',
                styles: {
                    fontSize: 8,
                    cellPadding: 2.5,
                    font: 'helvetica',
                    halign: 'right'
                },
                headStyles: {
                    fillColor: [68, 114, 196],
                    textColor: [255, 255, 255],
                    fontStyle: 'bold',
                    halign: 'center',
                    fontSize: 8
                },
                columnStyles: {
                    0: { halign: 'left', cellWidth: 32 },
                    1: { halign: 'left', cellWidth: 40 },
                    2: { halign: 'left', cellWidth: 25 },
                    3: { halign: 'center', cellWidth: 22 },
                    4: { halign: 'right', font: 'courier' },
                    5: { halign: 'right', font: 'courier' },
                    6: { halign: 'center' },
                    7: { halign: 'right', font: 'courier' },
                    8: { halign: 'right', font: 'courier' },
                    9: { halign: 'right', font: 'courier' }
                },
                margin: { left: 14, right: 14 }
            });
        }

        // HSN Summary (if any records exist)
        if (hsnSummary.length > 0) {
            doc.addPage();

            doc.setFontSize(14);
            doc.setFont("helvetica", "bold");
            doc.text('HSN Summary - 12', 14, 20);

            const hsnData = hsnSummary.map(hsn => [
                hsn.hsnCode,
                hsn.description,
                hsn.uqc,
                formatNumber(hsn.totalQuantity),
                formatNumber(hsn.taxableValue),
                formatNumber(hsn.cgst),
                formatNumber(hsn.sgst),
                formatNumber(hsn.igst),
                formatNumber(hsn.cgst + hsn.sgst + hsn.igst)
            ]);

            autoTable(doc, {
                startY: 28,
                head: [[
                    'HSN\nCode',
                    'Description',
                    'UQC',
                    'Quantity',
                    'Taxable\nValue',
                    'CGST',
                    'SGST',
                    'IGST',
                    'Total\nTax'
                ]],
                body: hsnData,
                theme: 'striped',
                styles: {
                    fontSize: 9,
                    cellPadding: 3,
                    halign: 'right'
                },
                headStyles: {
                    fillColor: [68, 114, 196],
                    textColor: [255, 255, 255],
                    fontStyle: 'bold',
                    halign: 'center',
                    fontSize: 9
                },
                columnStyles: {
                    0: { halign: 'center', cellWidth: 22 },
                    1: { halign: 'left', cellWidth: 60 },
                    2: { halign: 'center', cellWidth: 18 },
                    3: { halign: 'right', font: 'courier' },
                    4: { halign: 'right', font: 'courier' },
                    5: { halign: 'right', font: 'courier' },
                    6: { halign: 'right', font: 'courier' },
                    7: { halign: 'right', font: 'courier' },
                    8: { halign: 'right', font: 'courier' }
                },
                margin: { left: 14, right: 14 }
            });
        }

        // Save PDF
        const monthYear = new Date(dateFrom).toLocaleDateString("en-GB", {
            month: "short",
            year: "numeric"
        });
        doc.save(`GSTR1_${monthYear.replace(" ", "_")}_MangalMurthi_Jewellers.pdf`);

        toast.dismiss(loadingToast);
        toast.success("✅ Professional PDF generated successfully!");

    } catch (error) {
        console.error("Error generating PDF:", error);
        toast.dismiss(loadingToast);
        toast.error("Failed to generate PDF report");
    }
};

// ============================================
// KEY IMPROVEMENTS:
// 1. Fixed column widths (no dynamic sizing)
// 2. Monospace font (Courier) for all numbers
// 3. Proper alignment (left/center/right)
// 4. Clean table borders
// 5. Professional color scheme matching Daily Branch Report
// 6. Consistent number formatting (always 2 decimals)
// 7. No currency symbols in data (cleaner for PDF)
// ============================================
