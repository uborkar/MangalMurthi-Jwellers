// src/utils/validation.ts - Validation utilities for warehouse items

import { WarehouseItem, ItemStatus } from "../firebase/warehouseItems";

// ═══════════════════════════════════════════════════════════════════════
// CUSTOM ERROR CLASS
// ═══════════════════════════════════════════════════════════════════════

export class ValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ValidationError";
  }
}

// ═══════════════════════════════════════════════════════════════════════
// VALIDATION RULES
// ═══════════════════════════════════════════════════════════════════════

export const validators = {
  /**
   * Validate barcode format: MG-RNG-MAL-25-000001
   */
  barcode: (value: string): boolean => {
    const pattern = /^MG-[A-Z]{3}-[A-Z]{3}-\d{2}-\d{6}$/;
    if (!pattern.test(value)) {
      throw new ValidationError(
        "Invalid barcode format. Expected: MG-XXX-XXX-YY-NNNNNN"
      );
    }
    return true;
  },

  /**
   * Validate weight (must be positive, reasonable range)
   */
  weight: (value: string | number): boolean => {
    const weightNum = typeof value === "string" ? parseFloat(value) : value;

    if (isNaN(weightNum)) {
      throw new ValidationError("Weight must be a valid number");
    }

    if (weightNum <= 0) {
      throw new ValidationError("Weight must be greater than 0");
    }

    if (weightNum > 1000) {
      throw new ValidationError("Weight seems too high (max 1000g)");
    }

    return true;
  },

  /**
   * Validate price (must be non-negative, reasonable range)
   */
  price: (value: number): boolean => {
    if (value < 0) {
      throw new ValidationError("Price cannot be negative");
    }

    if (value > 10000000) {
      throw new ValidationError("Price seems too high (max ₹1 crore)");
    }

    return true;
  },

  /**
   * Validate serial number (must be positive integer)
   */
  serial: (value: number): boolean => {
    if (!Number.isInteger(value) || value <= 0) {
      throw new ValidationError("Serial must be a positive integer");
    }

    return true;
  },

  /**
   * Validate category (must be in valid list)
   */
  category: (value: string, validCategories: string[]): boolean => {
    if (!value || value.trim() === "") {
      throw new ValidationError("Category is required");
    }

    if (!validCategories.includes(value)) {
      throw new ValidationError(
        `Invalid category: ${value}. Must be one of: ${validCategories.join(", ")}`
      );
    }

    return true;
  },

  /**
   * Validate status transition
   */
  statusTransition: (from: ItemStatus, to: ItemStatus): boolean => {
    const validTransitions: Record<ItemStatus, ItemStatus[]> = {
      tagged: ["printed"],
      printed: ["stocked"],
      stocked: ["distributed", "returned"],
      distributed: ["sold", "returned"],
      sold: ["returned"],
      returned: ["stocked"],
    };

    if (!validTransitions[from]?.includes(to)) {
      throw new ValidationError(
        `Invalid status transition: ${from} → ${to}. Valid transitions from ${from}: ${validTransitions[from]?.join(", ") || "none"}`
      );
    }

    return true;
  },

  /**
   * Validate required field
   */
  required: (value: any, fieldName: string): boolean => {
    if (value === undefined || value === null || value === "") {
      throw new ValidationError(`${fieldName} is required`);
    }
    return true;
  },

  /**
   * Validate string length
   */
  stringLength: (
    value: string,
    min: number,
    max: number,
    fieldName: string
  ): boolean => {
    if (value.length < min) {
      throw new ValidationError(
        `${fieldName} must be at least ${min} characters`
      );
    }

    if (value.length > max) {
      throw new ValidationError(
        `${fieldName} must be at most ${max} characters`
      );
    }

    return true;
  },

  /**
   * Validate location
   */
  location: (value: string, validLocations: string[]): boolean => {
    if (!validLocations.includes(value)) {
      throw new ValidationError(
        `Invalid location: ${value}. Must be one of: ${validLocations.join(", ")}`
      );
    }

    return true;
  },
};

// ═══════════════════════════════════════════════════════════════════════
// COMPOSITE VALIDATORS
// ═══════════════════════════════════════════════════════════════════════

/**
 * Validate complete warehouse item before saving
 */
export function validateWarehouseItem(
  item: Partial<WarehouseItem>,
  validCategories: string[] = [],
  validLocations: string[] = []
): void {
  // Required fields
  validators.required(item.barcode, "Barcode");
  validators.required(item.category, "Category");
  validators.required(item.location, "Location");
  validators.required(item.serial, "Serial");

  // Barcode format
  validators.barcode(item.barcode!);

  // Serial number
  validators.serial(item.serial!);

  // Category
  if (validCategories.length > 0) {
    validators.category(item.category!, validCategories);
  }

  // Location
  if (validLocations.length > 0) {
    validators.location(item.location!, validLocations);
  }

  // Weight (if provided)
  if (item.weight) {
    validators.weight(item.weight);
  }

  // Price (if provided)
  if (item.costPrice !== undefined) {
    validators.price(item.costPrice);
  }

  // Remark length
  if (item.remark) {
    validators.stringLength(item.remark, 1, 200, "Remark");
  }
}

/**
 * Validate item before status transition
 */
export function validateStatusTransition(
  item: WarehouseItem,
  newStatus: ItemStatus
): void {
  // Check if transition is valid
  validators.statusTransition(item.status, newStatus);

  // Additional checks based on target status
  switch (newStatus) {
    case "printed":
      // Must have barcode
      validators.required(item.barcode, "Barcode");
      break;

    case "stocked":
      // Must be printed first
      if (!item.printedAt) {
        throw new ValidationError(
          "Item must be printed before stocking in. Print labels first."
        );
      }
      break;

    case "distributed":
      // Must be stocked first
      if (!item.stockedAt) {
        throw new ValidationError(
          "Item must be stocked before distribution"
        );
      }
      break;

    case "sold":
      // Must be distributed first
      if (!item.distributedAt) {
        throw new ValidationError(
          "Item must be distributed to shop before selling"
        );
      }
      break;

    case "returned":
      // Can return from distributed or sold
      if (!item.distributedAt && !item.soldAt) {
        throw new ValidationError(
          "Item must be distributed or sold before returning"
        );
      }
      break;
  }
}

/**
 * Validate batch operation
 */
export function validateBatchOperation(
  items: WarehouseItem[],
  operation: string
): void {
  if (!items || items.length === 0) {
    throw new ValidationError(`No items selected for ${operation}`);
  }

  // Check if all items have same status (for batch operations)
  const statuses = new Set(items.map((i) => i.status));
  if (statuses.size > 1) {
    throw new ValidationError(
      `Cannot ${operation} items with different statuses. All items must have the same status.`
    );
  }
}

/**
 * Validate print operation
 */
export function validatePrintOperation(items: WarehouseItem[]): void {
  validateBatchOperation(items, "print");

  // All items must be in "tagged" status
  const invalidItems = items.filter((i) => i.status !== "tagged");
  if (invalidItems.length > 0) {
    throw new ValidationError(
      `Cannot print items that are not in "tagged" status. Found ${invalidItems.length} items with different status.`
    );
  }

  // Check if any items are already printed
  const alreadyPrinted = items.filter((i) => i.printedAt);
  if (alreadyPrinted.length > 0) {
    throw new ValidationError(
      `${alreadyPrinted.length} items are already printed. Cannot print again.`
    );
  }
}

/**
 * Validate stock-in operation
 */
export function validateStockInOperation(items: WarehouseItem[]): void {
  validateBatchOperation(items, "stock-in");

  // Items must be in "printed" or "tagged" status
  const invalidItems = items.filter((i) => i.status !== "printed" && i.status !== "tagged");
  if (invalidItems.length > 0) {
    throw new ValidationError(
      `Cannot stock-in items with status: ${invalidItems[0].status}. Items must be "printed" or "tagged".`
    );
  }
}

/**
 * Validate distribution operation
 */
export function validateDistributionOperation(
  items: WarehouseItem[],
  shopName: string
): void {
  validateBatchOperation(items, "distribute");

  // Shop name is required
  if (!shopName || shopName.trim() === "") {
    throw new ValidationError("Shop name is required for distribution");
  }

  // All items must be in "stocked" status
  const invalidItems = items.filter((i) => i.status !== "stocked");
  if (invalidItems.length > 0) {
    throw new ValidationError(
      `Cannot distribute items that are not in stock. Found ${invalidItems.length} items with status: ${invalidItems[0].status}`
    );
  }

  // Check if all items have been stocked
  const notStocked = items.filter((i) => !i.stockedAt);
  if (notStocked.length > 0) {
    throw new ValidationError(
      `${notStocked.length} items have not been stocked yet. Stock them first.`
    );
  }
}

// ═══════════════════════════════════════════════════════════════════════
// HELPER FUNCTIONS
// ═══════════════════════════════════════════════════════════════════════

/**
 * Safe validation wrapper - returns error message instead of throwing
 */
export function safeValidate(
  validationFn: () => void
): { valid: boolean; error?: string } {
  try {
    validationFn();
    return { valid: true };
  } catch (error) {
    if (error instanceof ValidationError) {
      return { valid: false, error: error.message };
    }
    return { valid: false, error: "Unknown validation error" };
  }
}

/**
 * Validate and return errors for multiple items
 */
export function validateMultipleItems(
  items: Partial<WarehouseItem>[],
  validCategories: string[] = [],
  validLocations: string[] = []
): { valid: boolean; errors: Record<string, string> } {
  const errors: Record<string, string> = {};

  items.forEach((item, index) => {
    const result = safeValidate(() =>
      validateWarehouseItem(item, validCategories, validLocations)
    );

    if (!result.valid) {
      errors[`item_${index}`] = result.error || "Validation failed";
    }
  });

  return {
    valid: Object.keys(errors).length === 0,
    errors,
  };
}
