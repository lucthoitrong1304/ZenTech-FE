export type MediaPreviewType = 'IMAGE' | 'VIDEO';

export interface MediaPreviewItem {
  type: MediaPreviewType;
  title: string;
  url: string;
}
