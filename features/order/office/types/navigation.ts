export type PeriodKey = string;

export type Period = { id: PeriodKey; label: string; from: string; to: string };

export type CommMode = 'email' | 'chat' | 'sms';
export type CommTab = 'customer' | 'supplier';
export const COMM_MODES: CommMode[] = ['email', 'chat', 'sms'];
export const COMM_TABS: CommTab[] = ['customer', 'supplier'];
