import { OrderFilter, VoucherStatus } from './account.models';

export enum AccountEventType {
  VoucherTabChanged = 'Voucher Tab Changed',
  OrderFilterChanged = 'Order Filter Changed',
  OrderSearchChanged = 'Order Search Changed',
  AddressCreateClicked = 'Address Create Clicked',
  AddressEditClicked = 'Address Edit Clicked',
  AddressDeleteClicked = 'Address Delete Clicked',
  AddressDefaultChanged = 'Address Default Changed',
  ActionMessageCleared = 'Action Message Cleared',
}

export type AccountEvent =
  | { type: AccountEventType.VoucherTabChanged; status: VoucherStatus }
  | { type: AccountEventType.OrderFilterChanged; filter: OrderFilter }
  | { type: AccountEventType.OrderSearchChanged; keyword: string }
  | { type: AccountEventType.AddressCreateClicked }
  | { type: AccountEventType.AddressEditClicked; addressId: string }
  | { type: AccountEventType.AddressDeleteClicked; addressId: string }
  | { type: AccountEventType.AddressDefaultChanged; addressId: string }
  | { type: AccountEventType.ActionMessageCleared };
