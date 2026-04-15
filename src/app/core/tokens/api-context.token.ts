import { HttpContextToken } from '@angular/common/http';

export const SKIP_AUTH_TOKEN = new HttpContextToken<boolean>(() => false);
export const SKIP_GLOBAL_ERROR = new HttpContextToken<boolean>(() => false);
