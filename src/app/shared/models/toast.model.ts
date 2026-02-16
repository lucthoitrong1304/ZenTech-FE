export enum ToastType {
  Success = 'success',
  Error = 'error',
  Warning = 'warning'
}

export interface Toast {
  id: string;
  type: ToastType;
  message: string;
  duration?: number;
}
