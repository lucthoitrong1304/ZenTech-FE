export enum ToastType {
  Success = 'success',
  Error = 'error',
  Warning = 'warning',
  Info = 'info',
}

export interface Toast {
  id: string;
  type: ToastType;
  message: string;
  duration?: number;
}
