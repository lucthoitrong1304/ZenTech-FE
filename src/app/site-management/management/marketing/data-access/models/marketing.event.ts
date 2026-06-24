import {
  ManagementCoupon,
  ManagementCouponPage,
  CustomerVoucherDetail,
  CustomerVoucherPage,
  MarketingStats,
  CustomerSummary,
  CouponFormValue,
  ManagementCouponQuery,
  CustomerVoucherQuery,
} from './marketing.models';

export enum MarketingEventType {
  CouponsLoadStarted = 'COUPONS_LOAD_STARTED',
  CouponsLoadSucceeded = 'COUPONS_LOAD_SUCCEEDED',
  CouponsLoadFailed = 'COUPONS_LOAD_FAILED',
  VouchersLoadStarted = 'VOUCHERS_LOAD_STARTED',
  VouchersLoadSucceeded = 'VOUCHERS_LOAD_SUCCEEDED',
  VouchersLoadFailed = 'VOUCHERS_LOAD_FAILED',
  StatsLoadSucceeded = 'STATS_LOAD_SUCCEEDED',
  CustomersLoadSucceeded = 'CUSTOMERS_LOAD_SUCCEEDED',
  
  SearchKeywordChanged = 'SEARCH_KEYWORD_CHANGED',
  TypeFilterChanged = 'TYPE_FILTER_CHANGED',
  ActiveFilterChanged = 'ACTIVE_FILTER_CHANGED',
  SortChanged = 'SORT_CHANGED',
  FiltersApplied = 'FILTERS_APPLIED',
  FiltersReset = 'FILTERS_RESET',
  PageChanged = 'PAGE_CHANGED',

  VoucherKeywordChanged = 'VOUCHER_KEYWORD_CHANGED',
  VoucherCouponCodeChanged = 'VOUCHER_COUPON_CODE_CHANGED',
  VoucherStatusChanged = 'VOUCHER_STATUS_CHANGED',
  VoucherFiltersApplied = 'VOUCHER_FILTERS_APPLIED',
  VoucherFiltersReset = 'VOUCHER_FILTERS_RESET',
  VoucherPageChanged = 'VOUCHER_PAGE_CHANGED',

  TabChanged = 'TAB_CHANGED',
  MessagesCleared = 'MESSAGES_CLEARED',
  
  CreateClicked = 'CREATE_CLICKED',
  EditClicked = 'EDIT_CLICKED',
  DetailLoadStarted = 'DETAIL_LOAD_STARTED',
  DetailLoadSucceeded = 'DETAIL_LOAD_SUCCEEDED',
  DetailLoadFailed = 'DETAIL_LOAD_FAILED',
  DialogClosed = 'DIALOG_CLOSED',
  FormValueChanged = 'FORM_VALUE_CHANGED',
  SubmitClicked = 'SUBMIT_CLICKED',
  CreateSucceeded = 'CREATE_SUCCEEDED',
  UpdateSucceeded = 'UPDATE_SUCCEEDED',
  SaveFailed = 'SAVE_FAILED',
  
  CouponDeleted = 'COUPON_DELETED',
  CouponDeleteFailed = 'COUPON_DELETE_FAILED',
  ToggleActiveSucceeded = 'TOGGLE_ACTIVE_SUCCEEDED',
  ToggleActiveFailed = 'TOGGLE_ACTIVE_FAILED',

  IssueVoucherClicked = 'ISSUE_VOUCHER_CLICKED',
  IssueVoucherDialogClosed = 'ISSUE_VOUCHER_DIALOG_CLOSED',
  IssueVoucherSubmitClicked = 'ISSUE_VOUCHER_SUBMIT_CLICKED',
  IssueVoucherSucceeded = 'ISSUE_VOUCHER_SUCCEEDED',
  IssueVoucherFailed = 'ISSUE_VOUCHER_FAILED',
  IssueFormValueChanged = 'ISSUE_FORM_VALUE_CHANGED',
  VoucherRevoked = 'VOUCHER_REVOKED',
  VoucherRevokeFailed = 'VOUCHER_REVOKE_FAILED',
}

export type MarketingEvent =
  | { type: MarketingEventType.CouponsLoadStarted }
  | { type: MarketingEventType.CouponsLoadSucceeded; page: ManagementCouponPage }
  | { type: MarketingEventType.CouponsLoadFailed }
  | { type: MarketingEventType.VouchersLoadStarted }
  | { type: MarketingEventType.VouchersLoadSucceeded; page: CustomerVoucherPage }
  | { type: MarketingEventType.VouchersLoadFailed }
  | { type: MarketingEventType.StatsLoadSucceeded; stats: MarketingStats }
  | { type: MarketingEventType.CustomersLoadSucceeded; customers: CustomerSummary[] }
  
  | { type: MarketingEventType.SearchKeywordChanged; keyword: string }
  | { type: MarketingEventType.TypeFilterChanged; couponType: ManagementCouponQuery['type'] }
  | { type: MarketingEventType.ActiveFilterChanged; activeStatus: ManagementCouponQuery['active'] }
  | { type: MarketingEventType.SortChanged; sort: ManagementCouponQuery['sort'] }
  | { type: MarketingEventType.FiltersApplied }
  | { type: MarketingEventType.FiltersReset; query: ManagementCouponQuery }
  | { type: MarketingEventType.PageChanged; page: number }

  | { type: MarketingEventType.VoucherKeywordChanged; keyword: string }
  | { type: MarketingEventType.VoucherCouponCodeChanged; couponCode: string }
  | { type: MarketingEventType.VoucherStatusChanged; status: CustomerVoucherQuery['status'] }
  | { type: MarketingEventType.VoucherFiltersApplied }
  | { type: MarketingEventType.VoucherFiltersReset; query: CustomerVoucherQuery }
  | { type: MarketingEventType.VoucherPageChanged; page: number }

  | { type: MarketingEventType.TabChanged; tabIndex: number }
  | { type: MarketingEventType.MessagesCleared }
  
  | { type: MarketingEventType.CreateClicked }
  | { type: MarketingEventType.EditClicked; couponId: string }
  | { type: MarketingEventType.DetailLoadStarted }
  | { type: MarketingEventType.DetailLoadSucceeded; detail: ManagementCoupon }
  | { type: MarketingEventType.DetailLoadFailed }
  | { type: MarketingEventType.DialogClosed }
  | { type: MarketingEventType.FormValueChanged; patch: Partial<CouponFormValue> }
  | { type: MarketingEventType.SubmitClicked }
  | { type: MarketingEventType.CreateSucceeded; detail: ManagementCoupon }
  | { type: MarketingEventType.UpdateSucceeded; detail: ManagementCoupon }
  | { type: MarketingEventType.SaveFailed; error: string }
  
  | { type: MarketingEventType.CouponDeleted; couponId: string }
  | { type: MarketingEventType.CouponDeleteFailed }
  | { type: MarketingEventType.ToggleActiveSucceeded; detail: ManagementCoupon }
  | { type: MarketingEventType.ToggleActiveFailed }

  | { type: MarketingEventType.IssueVoucherClicked; couponId?: string }
  | { type: MarketingEventType.IssueVoucherDialogClosed }
  | { type: MarketingEventType.IssueVoucherSubmitClicked }
  | { type: MarketingEventType.IssueVoucherSucceeded }
  | { type: MarketingEventType.IssueVoucherFailed; error: string }
  | { type: MarketingEventType.IssueFormValueChanged; patch: { couponId?: string; customerId?: string | null; customerIds?: string[] } }
  | { type: MarketingEventType.VoucherRevoked; customerVoucherId: string }
  | { type: MarketingEventType.VoucherRevokeFailed; error: string };
