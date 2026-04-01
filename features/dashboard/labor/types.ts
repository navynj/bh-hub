/** Single leaf row from QuickBooks P&L (Expense D / Payroll Expenses). */
export type LaborLineDetail = {
  name: string;
  amount: number;
};

export type LaborCategoryItem = {
  id: string;
  name: string;
  amount: number;
  percent?: number;
  /** Leaf account rows rolled into this bucket (QuickBooks line names). */
  lines?: LaborLineDetail[];
};

export type LaborDashboardData = {
  totalLabor: number;
  /** Target = rate × (reference income ÷ ref months); labor rate/ref when set, else cost budget. */
  targetLabor: number;
  displayRate: number;
  displayPeriod: number;
  referenceIncomeTotal: number | null;
  categories: LaborCategoryItem[];
};
