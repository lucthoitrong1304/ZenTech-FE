export enum ConfirmSize {
  SMALL = 'SMALL',
  MEDIUM = 'MEDIUM',
  LARGE = 'LARGE'
}

export interface ConfirmDialogData {
  title: string;
  content: string;
  size?: ConfirmSize;
}
