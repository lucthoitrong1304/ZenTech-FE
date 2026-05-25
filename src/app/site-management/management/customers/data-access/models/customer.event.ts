import {
  CustomerActiveFilter,
  CustomerDetail,
  CustomerListQuery,
  CustomerOrderHistory,
  CustomerOrderQuery,
  CustomerPage,
  CustomerSort,
  CustomerSummary,
} from './customer.models';

export enum CustomerEventType {
  CustomersLoadStarted = 'Customers Load Started',
  CustomersLoadSucceeded = 'Customers Load Succeeded',
  CustomersLoadFailed = 'Customers Load Failed',
  CustomerSelected = 'Customer Selected',
  CustomerDetailLoadSucceeded = 'Customer Detail Load Succeeded',
  CustomerDetailLoadFailed = 'Customer Detail Load Failed',
  OrdersLoadStarted = 'Orders Load Started',
  OrdersLoadSucceeded = 'Orders Load Succeeded',
  OrdersLoadFailed = 'Orders Load Failed',
  SearchKeywordChanged = 'Search Keyword Changed',
  ActiveFilterChanged = 'Active Filter Changed',
  SortChanged = 'Sort Changed',
  PageChanged = 'Page Changed',
  OrdersPageChanged = 'Orders Page Changed',
  SelectedCustomerClosed = 'Selected Customer Closed',
  CustomerStatusChangeSucceeded = 'Customer Status Change Succeeded',
  CustomerStatusChangeFailed = 'Customer Status Change Failed',
  MessagesCleared = 'Messages Cleared',
}

export type CustomerEvent =
  | { type: CustomerEventType.CustomersLoadStarted }
  | { type: CustomerEventType.CustomersLoadSucceeded; page: CustomerPage<CustomerSummary> }
  | { type: CustomerEventType.CustomersLoadFailed }
  | { type: CustomerEventType.CustomerSelected; customerId: string }
  | {
      type: CustomerEventType.CustomerDetailLoadSucceeded;
      detail: CustomerDetail;
      orders: CustomerPage<CustomerOrderHistory>;
    }
  | { type: CustomerEventType.CustomerDetailLoadFailed }
  | { type: CustomerEventType.OrdersLoadStarted }
  | { type: CustomerEventType.OrdersLoadSucceeded; page: CustomerPage<CustomerOrderHistory> }
  | { type: CustomerEventType.OrdersLoadFailed }
  | { type: CustomerEventType.SearchKeywordChanged; keyword: string }
  | { type: CustomerEventType.ActiveFilterChanged; activeFilter: CustomerActiveFilter }
  | { type: CustomerEventType.SortChanged; sort: CustomerSort }
  | { type: CustomerEventType.PageChanged; query: Pick<CustomerListQuery, 'page' | 'size'> }
  | { type: CustomerEventType.OrdersPageChanged; query: Pick<CustomerOrderQuery, 'page' | 'size'> }
  | { type: CustomerEventType.SelectedCustomerClosed }
  | { type: CustomerEventType.CustomerStatusChangeSucceeded; active: boolean }
  | { type: CustomerEventType.CustomerStatusChangeFailed; active: boolean }
  | { type: CustomerEventType.MessagesCleared };
