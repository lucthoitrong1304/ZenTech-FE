export interface PayPeriod {
  id: string;
  name: string;
  startDate: string;
  endDate: string;
  locked: boolean;
  lockedBy?: { fullName: string } | null;
  lockedAt?: string | null;
}

export interface CreatePayPeriodPayload {
  name: string;
  startDate: string;
  endDate: string;
}

export interface PayPeriodResponse<T> {
  success: boolean;
  data: T;
  message?: string | null;
}
