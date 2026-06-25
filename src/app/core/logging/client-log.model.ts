export enum ClientLogLevel {
  INFO = 'INFO',
  WARN = 'WARN',
  ERROR = 'ERROR',
  DEBUG = 'DEBUG',
}

export enum ClientLogEventType {
  RuntimeError = 'RuntimeError',
  UnhandledPromiseRejection = 'UnhandledPromiseRejection',
  HttpRequestSucceeded = 'HttpRequestSucceeded',
  HttpRequestFailed = 'HttpRequestFailed',
  RouteNavigated = 'RouteNavigated',
  RouteGuardDenied = 'RouteGuardDenied',
  AuthLoginSucceeded = 'AuthLoginSucceeded',
  AuthLoginFailed = 'AuthLoginFailed',
  AuthLogoutSucceeded = 'AuthLogoutSucceeded',
  AuthTokenExpired = 'AuthTokenExpired',
  ProductViewed = 'ProductViewed',
  CartItemAdded = 'CartItemAdded',
  CartItemRemoved = 'CartItemRemoved',
  CheckoutSubmitted = 'CheckoutSubmitted',
  PaymentResultReceived = 'PaymentResultReceived',
}

export interface ClientLogContext {
  eventType: ClientLogEventType;
  routeUrl: string;
  traceId: string;
  method?: string;
  apiPath?: string;
  statusCode?: number;
  durationMs?: number;
  userId?: string;
  userEmail?: string;
  userRole?: string;
  productId?: string;
  orderId?: string;
  quantity?: number;
  result?: string;
  reason?: string;
}

export interface ClientLogPayload {
  traceId: string;
  level: ClientLogLevel;
  message: string;
  url: string;
  stackTrace: string;
}
