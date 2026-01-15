// Centralized Salesperson Data
// Simple name-based tracking with automatic duplicate handling

export interface Salesperson {
  name: string;        // Full name (will be unique identifier)
  primaryBranch: string; // Main branch assignment
  active: boolean;     // Whether currently active
}

export const SALESPERSONS: Salesperson[] = [
  // Sangli Branch
  { name: "Rajesh Kumar", primaryBranch: "Sangli", active: true },
  { name: "Priya Sharma", primaryBranch: "Sangli", active: true },
  { name: "Amit Patil", primaryBranch: "Sangli", active: true },
  
  // Miraj Branch
  { name: "Suresh Desai", primaryBranch: "Miraj", active: true },
  { name: "Sneha Joshi", primaryBranch: "Miraj", active: true },
  { name: "Vikram More", primaryBranch: "Miraj", active: true },
  
  // Kolhapur Branch
  { name: "Ganesh Kulkarni", primaryBranch: "Kolhapur", active: true },
  { name: "Pooja Rane", primaryBranch: "Kolhapur", active: true },
  { name: "Rahul Pawar", primaryBranch: "Kolhapur", active: true },
  
  // Mumbai Branch
  { name: "Kiran Shah", primaryBranch: "Mumbai", active: true },
  { name: "Neha Gupta", primaryBranch: "Mumbai", active: true },
  { name: "Anil Mehta", primaryBranch: "Mumbai", active: true },
  
  // Pune Branch
  { name: "Sachin Bhosale", primaryBranch: "Pune", active: true },
  { name: "Kavita Deshpande", primaryBranch: "Pune", active: true },
  { name: "Manoj Shinde", primaryBranch: "Pune", active: true },
];

// Helper functions
export const getSalespersonByName = (name: string): Salesperson | undefined => {
  return SALESPERSONS.find(sp => sp.name === name && sp.active);
};

export const getSalespersonsByBranch = (branch: string): Salesperson[] => {
  return SALESPERSONS.filter(sp => sp.primaryBranch === branch && sp.active);
};

export const getAllActiveSalespersons = (): Salesperson[] => {
  return SALESPERSONS.filter(sp => sp.active);
};

// Handle duplicate names by adding last name initial
export const getUniqueName = (name: string): string => {
  const duplicates = SALESPERSONS.filter(sp => sp.name === name && sp.active);
  if (duplicates.length > 1) {
    // Add first letter of last name in parentheses
    const parts = name.split(' ');
    if (parts.length > 1) {
      const lastName = parts[parts.length - 1];
      return `${name} (${lastName.charAt(0)})`;
    }
  }
  return name;
};

export const formatSalespersonForDropdown = (sp: Salesperson): string => {
  return sp.name;
};
