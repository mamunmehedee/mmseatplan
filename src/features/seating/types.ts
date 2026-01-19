export type GuestRole = "Regular" | "Chief Guest" | "Custom";
export type SpousePosition = "N/A" | "Before" | "After";
export type BeforeAfter = "Before" | "After";

export type Guest = {
  id: string;
  name: string;
  bdNo: string;
  gradationNo?: number;
  dateCommission?: string; // yyyy-mm-dd
  role: GuestRole;
  referenceId?: string;
  beforeAfter?: BeforeAfter;
  spousePosition: SpousePosition;
};
