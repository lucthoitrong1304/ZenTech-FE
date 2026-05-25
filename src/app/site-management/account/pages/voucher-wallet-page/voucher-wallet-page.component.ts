import { CommonModule } from '@angular/common';
import { Component, inject } from '@angular/core';
import { LucideCopy, LucideShare2, LucideTicket } from '@lucide/angular';
import { VoucherStatus } from '../../data-access/models/account.models';
import { AccountStore } from '../../data-access/store/account.store';

@Component({
  selector: 'app-voucher-wallet-page',
  standalone: true,
  imports: [CommonModule, LucideTicket, LucideCopy, LucideShare2],
  templateUrl: './voucher-wallet-page.component.html',
})
export class VoucherWalletPageComponent {
  protected readonly accountStore = inject(AccountStore);
  protected readonly tabs: { label: string; status: VoucherStatus }[] = [
    { label: 'Active', status: 'active' },
    { label: 'Used', status: 'used' },
    { label: 'Expired', status: 'expired' },
  ];

  protected setTab(status: VoucherStatus): void {
    this.accountStore.setVoucherTab(status);
  }

  protected voucherToneClass(tone: string): string {
    switch (tone) {
      case 'secondary':
        return 'bg-[#4b41e1] text-white';
      case 'tertiary':
        return 'bg-[#be0037] text-white';
      case 'muted':
        return 'bg-[#e5e2e1] text-[#4f4632]';
      case 'primary':
      default:
        return 'bg-[#ffc700] text-[#251a00]';
    }
  }
}
