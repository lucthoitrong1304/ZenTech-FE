import { environment } from '../../../environments/environment';

export function buildWebSocketUrl(): string {
  const apiBaseUrl = environment.apiBaseUrl.replace(/\/+$/, '');

  if (apiBaseUrl.startsWith('http://') || apiBaseUrl.startsWith('https://')) {
    const url = new URL(apiBaseUrl);
    url.protocol = url.protocol === 'https:' ? 'wss:' : 'ws:';
    url.pathname = url.pathname.replace(/\/api$/, '/ws');
    url.search = '';
    url.hash = '';
    return url.toString();
  }

  const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
  const wsPath = apiBaseUrl.replace(/\/api$/, '/ws') || '/ws';
  return `${protocol}//${window.location.host}${wsPath}`;
}
