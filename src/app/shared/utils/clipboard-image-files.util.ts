const IMAGE_EXTENSION_BY_MIME: Record<string, string> = {
  'image/bmp': 'bmp',
  'image/gif': 'gif',
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
};

export function getImageFilesFromClipboard(event: ClipboardEvent): File[] {
  const clipboardData = event.clipboardData;

  if (!clipboardData) {
    return [];
  }

  const itemFiles = Array.from(clipboardData.items ?? [])
    .filter((item) => item.kind === 'file' && item.type.startsWith('image/'))
    .map((item) => item.getAsFile())
    .filter((file): file is File => file !== null);

  const sourceFiles =
    itemFiles.length > 0
      ? itemFiles
      : Array.from(clipboardData.files ?? []).filter((file) => file.type.startsWith('image/'));

  return sourceFiles.map((file, index) => ensureClipboardImageName(file, index));
}

function ensureClipboardImageName(file: File, index: number): File {
  if (file.name.trim()) {
    return file;
  }

  const extension = IMAGE_EXTENSION_BY_MIME[file.type] ?? 'png';
  const suffix = index > 0 ? `-${index + 1}` : '';
  const fileName = `pasted-image-${formatTimestamp(new Date())}${suffix}.${extension}`;

  return new File([file], fileName, {
    type: file.type || 'image/png',
    lastModified: file.lastModified || Date.now(),
  });
}

function formatTimestamp(date: Date): string {
  const yyyy = date.getFullYear();
  const mm = pad(date.getMonth() + 1);
  const dd = pad(date.getDate());
  const hh = pad(date.getHours());
  const min = pad(date.getMinutes());
  const ss = pad(date.getSeconds());

  return `${yyyy}${mm}${dd}-${hh}${min}${ss}`;
}

function pad(value: number): string {
  return value.toString().padStart(2, '0');
}
