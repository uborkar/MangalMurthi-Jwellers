// src/services/reportGenerator.ts - Professional ERP-Grade Report Generator
import ExcelJS from "exceljs";
import { WarehouseItem, ItemStatus } from "../firebase/warehouseItems";

// ═══════════════════════════════════════════════════════════════════════
// REPORT CONFIGURATION
// ═══════════════════════════════════════════════════════════════════════

export interface ReportConfig {
  title: string;
  subtitle?: string;
  companyName?: string;
  location?: string;
  reportType: "all" | "stock" | "distribution" | "balance" | "custom";
  groupBy: "category" | "location" | "status" | "none";
  showSummary: boolean;
  showCategoryTotals: boolean;
  showGrandTotal: boolean;
  includeColumns: string[];
  dateRange?: {
    from: string;
    to: string;
  };
}

export const DEFAULT_CONFIG: ReportConfig = {
  title: "Warehouse Report",
  companyName: "MangalMurti Jewellers",
  reportType: "all",
  groupBy: "category",
  showSummary: true,
  showCategoryTotals: true,
  showGrandTotal: true,
  includeColumns: [
    "serial",
    "barcode",
    "itemName",
    "design",
    "location",
    "weight",
    "costPrice",
    "cpType",
    "status",
    "taggedAt",
  ],
};

// ═══════════════════════════════════════════════════════════════════════
// REPORT DATA STRUCTURE
// ═══════════════════════════════════════════════════════════════════════

interface ReportSummary {
  totalItems: number;
  totalCategories: number;
  totalWeight: number;
  totalValue: number;
  byStatus: Record<ItemStatus, number>;
  byCategory: Record<string, number>;
}

interface CategoryGroup {
  name: string;
  items: WarehouseItem[];
  totalItems: number;
  totalWeight: number;
  totalValue: number;
  byStatus: Record<string, number>;
}

interface ReportData {
  meta: {
    generatedAt: string;
    generatedBy?: string;
    location?: string;
    dateRange?: string;
  };
  summary: ReportSummary;
  groups: CategoryGroup[];
}

// ═══════════════════════════════════════════════════════════════════════
// REPORT GENERATOR CLASS
// ═══════════════════════════════════════════════════════════════════════

export class WarehouseReportGenerator {
  private workbook: ExcelJS.Workbook;
  private config: ReportConfig;
  private items: WarehouseItem[];

  constructor(items: WarehouseItem[], config: Partial<ReportConfig> = {}) {
    this.workbook = new ExcelJS.Workbook();
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.items = items;
  }

  // ═══════════════════════════════════════════════════════════════════════
  // MAIN GENERATION METHOD
  // ═══════════════════════════════════════════════════════════════════════

  async generate(): Promise<ExcelJS.Workbook> {
    // Prepare report data
    const reportData = this.prepareReportData();

    // Create main report sheet
    const sheet = this.workbook.addWorksheet("Warehouse Report", {
      pageSetup: {
        paperSize: 9, // A4
        orientation: "landscape",
        fitToPage: true,
      },
    });

    let currentRow = 1;

    // 1. Report Header
    currentRow = this.addReportHeader(sheet, currentRow);

    // 2. Summary Section
    if (this.config.showSummary) {
      currentRow = this.addSummarySection(sheet, currentRow, reportData.summary);
    }

    // 3. Grouped Data Sections
    currentRow = this.addGroupedDataSections(sheet, currentRow, reportData.groups);

    // 4. Grand Total
    if (this.config.showGrandTotal) {
      currentRow = this.addGrandTotal(sheet, currentRow, reportData.summary);
    }

    // Apply column widths
    this.setColumnWidths(sheet);

    return this.workbook;
  }

  // ═══════════════════════════════════════════════════════════════════════
  // DATA PREPARATION
  // ═══════════════════════════════════════════════════════════════════════

  private prepareReportData(): ReportData {
    // Calculate summary
    const summary: ReportSummary = {
      totalItems: this.items.length,
      totalCategories: new Set(this.items.map((i) => i.category)).size,
      totalWeight: this.items.reduce((sum, item) => sum + (parseFloat(item.weight) || 0), 0),
      totalValue: this.items.reduce((sum, item) => sum + (item.costPrice || 0), 0),
      byStatus: this.items.reduce((acc, item) => {
        acc[item.status] = (acc[item.status] || 0) + 1;
        return acc;
      }, {} as Record<ItemStatus, number>),
      byCategory: this.items.reduce((acc, item) => {
        acc[item.category] = (acc[item.category] || 0) + 1;
        return acc;
      }, {} as Record<string, number>),
    };

    // Group items
    const groups = this.groupItems();

    return {
      meta: {
        generatedAt: new Date().toLocaleString(),
        location: this.config.location,
        dateRange: this.config.dateRange
          ? `${this.config.dateRange.from} to ${this.config.dateRange.to}`
          : undefined,
      },
      summary,
      groups,
    };
  }

  private groupItems(): CategoryGroup[] {
    const groupKey = this.config.groupBy;

    if (groupKey === "none") {
      return [
        {
          name: "All Items",
          items: this.items,
          totalItems: this.items.length,
          totalWeight: this.items.reduce((sum, item) => sum + (parseFloat(item.weight) || 0), 0),
          totalValue: this.items.reduce((sum, item) => sum + (item.costPrice || 0), 0),
          byStatus: {},
        },
      ];
    }

    const grouped: Record<string, WarehouseItem[]> = {};

    this.items.forEach((item) => {
      const key =
        groupKey === "category"
          ? item.category
          : groupKey === "location"
          ? item.location
          : groupKey === "status"
          ? item.status
          : "All";

      if (!grouped[key]) grouped[key] = [];
      grouped[key].push(item);
    });

    return Object.entries(grouped)
      .sort(([, a], [, b]) => b.length - a.length)
      .map(([name, items]) => ({
        name,
        items,
        totalItems: items.length,
        totalWeight: items.reduce((sum, item) => sum + (parseFloat(item.weight) || 0), 0),
        totalValue: items.reduce((sum, item) => sum + (item.costPrice || 0), 0),
        byStatus: items.reduce((acc, item) => {
          acc[item.status] = (acc[item.status] || 0) + 1;
          return acc;
        }, {} as Record<string, number>),
      }));
  }

  // ═══════════════════════════════════════════════════════════════════════
  // REPORT SECTIONS
  // ═══════════════════════════════════════════════════════════════════════

  private addReportHeader(sheet: ExcelJS.Worksheet, startRow: number): number {
    let row = startRow;

    // Company Name
    const companyRow = sheet.getRow(row++);
    companyRow.getCell(1).value = this.config.companyName || "MangalMurti Jewellers";
    companyRow.getCell(1).font = { size: 18, bold: true, color: { argb: "FF1F2937" } };
    companyRow.getCell(1).alignment = { horizontal: "center" };
    sheet.mergeCells(row - 1, 1, row - 1, 10);

    // Report Title
    const titleRow = sheet.getRow(row++);
    titleRow.getCell(1).value = this.config.title;
    titleRow.getCell(1).font = { size: 14, bold: true, color: { argb: "FF4B5563" } };
    titleRow.getCell(1).alignment = { horizontal: "center" };
    sheet.mergeCells(row - 1, 1, row - 1, 10);

    // Subtitle
    if (this.config.subtitle) {
      const subtitleRow = sheet.getRow(row++);
      subtitleRow.getCell(1).value = this.config.subtitle;
      subtitleRow.getCell(1).font = { size: 11, italic: true, color: { argb: "FF6B7280" } };
      subtitleRow.getCell(1).alignment = { horizontal: "center" };
      sheet.mergeCells(row - 1, 1, row - 1, 10);
    }

    // Meta Information
    const metaRow = sheet.getRow(row++);
    metaRow.getCell(1).value = `Generated On: ${new Date().toLocaleString()}`;
    metaRow.getCell(1).font = { size: 10, color: { argb: "FF6B7280" } };
    metaRow.getCell(1).alignment = { horizontal: "center" };
    sheet.mergeCells(row - 1, 1, row - 1, 10);

    if (this.config.location) {
      const locRow = sheet.getRow(row++);
      locRow.getCell(1).value = `Location: ${this.config.location}`;
      locRow.getCell(1).font = { size: 10, color: { argb: "FF6B7280" } };
      locRow.getCell(1).alignment = { horizontal: "center" };
      sheet.mergeCells(row - 1, 1, row - 1, 10);
    }

    // Empty row
    row++;

    return row;
  }

  private addSummarySection(
    sheet: ExcelJS.Worksheet,
    startRow: number,
    summary: ReportSummary
  ): number {
    let row = startRow;

    // Summary Header
    const headerRow = sheet.getRow(row++);
    headerRow.getCell(1).value = "📊 SUMMARY";
    headerRow.getCell(1).font = { size: 12, bold: true, color: { argb: "FFFFFFFF" } };
    headerRow.getCell(1).fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: "FF3B82F6" },
    };
    headerRow.getCell(1).alignment = { horizontal: "center", vertical: "middle" };
    sheet.mergeCells(row - 1, 1, row - 1, 10);
    headerRow.height = 25;

    // Summary Data
    const summaryData = [
      ["Total Items", summary.totalItems],
      ["Total Categories", summary.totalCategories],
      ["Total Weight", `${summary.totalWeight.toFixed(2)} g`],
      ["Total Value", `₹${summary.totalValue.toLocaleString()}`],
    ];

    summaryData.forEach(([label, value]) => {
      const dataRow = sheet.getRow(row++);
      dataRow.getCell(1).value = label;
      dataRow.getCell(1).font = { bold: true, size: 10 };
      dataRow.getCell(1).fill = {
        type: "pattern",
        pattern: "solid",
        fgColor: { argb: "FFF3F4F6" },
      };

      dataRow.getCell(2).value = value;
      dataRow.getCell(2).font = { size: 10 };
      dataRow.getCell(2).alignment = { horizontal: "right" };

      sheet.mergeCells(row - 1, 2, row - 1, 4);
    });

    // Status Breakdown
    row++;
    const statusHeaderRow = sheet.getRow(row++);
    statusHeaderRow.getCell(1).value = "Status Breakdown";
    statusHeaderRow.getCell(1).font = { bold: true, size: 10 };
    statusHeaderRow.getCell(1).fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: "FFE5E7EB" },
    };
    sheet.mergeCells(row - 1, 1, row - 1, 4);

    Object.entries(summary.byStatus).forEach(([status, count]) => {
      const statusRow = sheet.getRow(row++);
      statusRow.getCell(1).value = `  ${status.charAt(0).toUpperCase() + status.slice(1)}`;
      statusRow.getCell(2).value = count;
      statusRow.getCell(2).alignment = { horizontal: "right" };
      sheet.mergeCells(row - 1, 2, row - 1, 4);
    });

    // Empty rows
    row += 2;

    return row;
  }

  private addGroupedDataSections(
    sheet: ExcelJS.Worksheet,
    startRow: number,
    groups: CategoryGroup[]
  ): number {
    let row = startRow;

    groups.forEach((group, groupIndex) => {
      // Group Header
      const groupHeaderRow = sheet.getRow(row++);
      groupHeaderRow.getCell(1).value = `▶ ${group.name.toUpperCase()}`;
      groupHeaderRow.getCell(1).font = { size: 11, bold: true, color: { argb: "FFFFFFFF" } };
      groupHeaderRow.getCell(1).fill = {
        type: "pattern",
        pattern: "solid",
        fgColor: { argb: "FF6366F1" },
      };
      groupHeaderRow.getCell(1).alignment = { vertical: "middle" };
      sheet.mergeCells(row - 1, 1, row - 1, 10);
      groupHeaderRow.height = 22;

      // Group Statistics
      const statsRow = sheet.getRow(row++);
      statsRow.getCell(1).value = `Items: ${group.totalItems} | Weight: ${group.totalWeight.toFixed(
        2
      )}g | Value: ₹${group.totalValue.toLocaleString()}`;
      statsRow.getCell(1).font = { size: 9, italic: true, color: { argb: "FF6B7280" } };
      statsRow.getCell(1).fill = {
        type: "pattern",
        pattern: "solid",
        fgColor: { argb: "FFEFF6FF" },
      };
      sheet.mergeCells(row - 1, 1, row - 1, 10);

      // Column Headers
      row = this.addColumnHeaders(sheet, row);

      // Items
      group.items.forEach((item, itemIndex) => {
        row = this.addItemRow(sheet, row, item, itemIndex);
      });

      // Category Total
      if (this.config.showCategoryTotals) {
        row = this.addCategoryTotal(sheet, row, group);
      }

      // Empty row between groups
      if (groupIndex < groups.length - 1) {
        row += 2;
      }
    });

    return row;
  }

  private addColumnHeaders(sheet: ExcelJS.Worksheet, startRow: number): number {
    const headerRow = sheet.getRow(startRow);

    const headers = [
      { key: "serial", label: "Sr", width: 8 },
      { key: "barcode", label: "Barcode", width: 20 },
      { key: "itemName", label: "Item Name", width: 25 },
      { key: "design", label: "Design", width: 15 },
      { key: "location", label: "Location", width: 15 },
      { key: "weight", label: "Weight (g)", width: 12 },
      { key: "costPrice", label: "Cost Price", width: 12 },
      { key: "cpType", label: "CP Type", width: 10 },
      { key: "status", label: "Status", width: 12 },
      { key: "taggedAt", label: "Tagged At", width: 15 },
    ];

    headers.forEach((header, index) => {
      if (this.config.includeColumns.includes(header.key)) {
        const cell = headerRow.getCell(index + 1);
        cell.value = header.label;
        cell.font = { bold: true, size: 10, color: { argb: "FFFFFFFF" } };
        cell.fill = {
          type: "pattern",
          pattern: "solid",
          fgColor: { argb: "FF1F2937" },
        };
        cell.alignment = { horizontal: "center", vertical: "middle" };
        cell.border = {
          top: { style: "thin" },
          bottom: { style: "thin" },
          left: { style: "thin" },
          right: { style: "thin" },
        };
      }
    });

    headerRow.height = 20;

    return startRow + 1;
  }

  private addItemRow(
    sheet: ExcelJS.Worksheet,
    startRow: number,
    item: WarehouseItem,
    index: number
  ): number {
    const row = sheet.getRow(startRow);

    const fillColor = index % 2 === 0 ? "FFFFFFFF" : "FFF9FAFB";

    const columns = [
      { key: "serial", value: item.serial },
      { key: "barcode", value: item.barcode },
      { key: "itemName", value: item.remark || "-" },
      { key: "design", value: item.subcategory || "-" },
      { key: "location", value: item.location },
      { key: "weight", value: item.weight || "-" },
      { key: "costPrice", value: item.costPrice ? `₹${item.costPrice.toLocaleString()}` : "-" },
      { key: "cpType", value: item.costPriceType },
      { key: "status", value: item.status },
      { key: "taggedAt", value: new Date(item.taggedAt).toLocaleDateString() },
    ];

    columns.forEach((col, colIndex) => {
      if (this.config.includeColumns.includes(col.key)) {
        const cell = row.getCell(colIndex + 1);
        cell.value = col.value;
        cell.font = { size: 9 };
        cell.fill = {
          type: "pattern",
          pattern: "solid",
          fgColor: { argb: fillColor },
        };
        cell.border = {
          top: { style: "thin", color: { argb: "FFE5E7EB" } },
          bottom: { style: "thin", color: { argb: "FFE5E7EB" } },
          left: { style: "thin", color: { argb: "FFE5E7EB" } },
          right: { style: "thin", color: { argb: "FFE5E7EB" } },
        };

        if (col.key === "costPrice" || col.key === "weight") {
          cell.alignment = { horizontal: "right" };
        }
      }
    });

    return startRow + 1;
  }

  private addCategoryTotal(
    sheet: ExcelJS.Worksheet,
    startRow: number,
    group: CategoryGroup
  ): number {
    const row = sheet.getRow(startRow);

    row.getCell(1).value = "Category Total";
    row.getCell(1).font = { bold: true, size: 10 };
    row.getCell(1).fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: "FFFEF3C7" },
    };
    sheet.mergeCells(startRow, 1, startRow, 5);

    row.getCell(6).value = `${group.totalWeight.toFixed(2)}g`;
    row.getCell(6).font = { bold: true, size: 10 };
    row.getCell(6).alignment = { horizontal: "right" };
    row.getCell(6).fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: "FFFEF3C7" },
    };

    row.getCell(7).value = `₹${group.totalValue.toLocaleString()}`;
    row.getCell(7).font = { bold: true, size: 10 };
    row.getCell(7).alignment = { horizontal: "right" };
    row.getCell(7).fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: "FFFEF3C7" },
    };

    return startRow + 1;
  }

  private addGrandTotal(
    sheet: ExcelJS.Worksheet,
    startRow: number,
    summary: ReportSummary
  ): number {
    startRow += 1;

    const row = sheet.getRow(startRow);

    row.getCell(1).value = "GRAND TOTAL";
    row.getCell(1).font = { bold: true, size: 11, color: { argb: "FFFFFFFF" } };
    row.getCell(1).fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: "FF059669" },
    };
    row.getCell(1).alignment = { horizontal: "center", vertical: "middle" };
    sheet.mergeCells(startRow, 1, startRow, 5);

    row.getCell(6).value = `${summary.totalWeight.toFixed(2)}g`;
    row.getCell(6).font = { bold: true, size: 11, color: { argb: "FFFFFFFF" } };
    row.getCell(6).alignment = { horizontal: "right", vertical: "middle" };
    row.getCell(6).fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: "FF059669" },
    };

    row.getCell(7).value = `₹${summary.totalValue.toLocaleString()}`;
    row.getCell(7).font = { bold: true, size: 11, color: { argb: "FFFFFFFF" } };
    row.getCell(7).alignment = { horizontal: "right", vertical: "middle" };
    row.getCell(7).fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: "FF059669" },
    };

    row.height = 25;

    return startRow + 1;
  }

  private setColumnWidths(sheet: ExcelJS.Worksheet) {
    const widths = [8, 20, 25, 15, 15, 12, 12, 10, 12, 15];
    widths.forEach((width, index) => {
      sheet.getColumn(index + 1).width = width;
    });
  }

  // ═══════════════════════════════════════════════════════════════════════
  // EXPORT METHODS
  // ═══════════════════════════════════════════════════════════════════════

  async downloadAsExcel(filename: string) {
    await this.generate();
    const buffer = await this.workbook.xlsx.writeBuffer();
    const blob = new Blob([buffer], {
      type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = filename;
    link.click();
    window.URL.revokeObjectURL(url);
  }
}

// ═══════════════════════════════════════════════════════════════════════
// HELPER FUNCTIONS
// ═══════════════════════════════════════════════════════════════════════

export async function generateWarehouseReport(
  items: WarehouseItem[],
  config: Partial<ReportConfig> = {}
): Promise<void> {
  const generator = new WarehouseReportGenerator(items, config);
  const filename = `${config.title || "Warehouse_Report"}_${
    new Date().toISOString().split("T")[0]
  }.xlsx`;
  await generator.downloadAsExcel(filename);
}
