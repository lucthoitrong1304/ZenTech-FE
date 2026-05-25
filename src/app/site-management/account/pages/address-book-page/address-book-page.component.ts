import { CommonModule } from '@angular/common';
import { Component, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { DialogModule } from 'primeng/dialog';
import {
  LucideMapPin,
  LucideMapPinPlus,
  LucidePencil,
  LucideTrash2,
} from '@lucide/angular';
import { CustomerAddressResponse } from '../../data-access/models/account.models';
import { AccountStore } from '../../data-access/store/account.store';

@Component({
  selector: 'app-address-book-page',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    DialogModule,
    LucideMapPin,
    LucideMapPinPlus,
    LucidePencil,
    LucideTrash2,
  ],
  templateUrl: './address-book-page.component.html',
})
export class AddressBookPageComponent {
  protected readonly accountStore = inject(AccountStore);

  protected isDialogVisible = false;
  protected isEditMode = false;
  protected editingAddressId: string | null = null;

  protected phoneNumber = '';
  protected street = '';
  protected ward = '';
  protected province = '';
  protected isDefault = false;

  protected openCreateDialog(): void {
    this.isEditMode = false;
    this.editingAddressId = null;
    this.phoneNumber = '';
    this.street = '';
    this.ward = '';
    this.province = '';
    this.isDefault = false;
    this.isDialogVisible = true;
  }

  protected openEditDialog(address: CustomerAddressResponse): void {
    this.isEditMode = true;
    this.editingAddressId = address.addressId;
    this.phoneNumber = address.phoneNumber;
    this.street = address.street;
    this.ward = address.ward;
    this.province = address.province;
    this.isDefault = address.isDefault;
    this.isDialogVisible = true;
  }

  protected saveAddress(): void {
    if (!this.phoneNumber.trim() || !this.street.trim() || !this.ward.trim() || !this.province.trim()) {
      return;
    }

    const payload = {
      phoneNumber: this.phoneNumber,
      street: this.street,
      ward: this.ward,
      province: this.province,
      isDefault: this.isDefault,
    };

    if (this.isEditMode && this.editingAddressId) {
      this.accountStore.updateAddress({
        addressId: this.editingAddressId,
        payload,
      });
    } else {
      this.accountStore.createAddress(payload);
    }

    this.isDialogVisible = false;
  }

  protected deleteAddress(addressId: string): void {
    this.accountStore.deleteAddress(addressId);
  }

  protected setDefault(addressId: string): void {
    this.accountStore.setDefaultAddress(addressId);
  }
}

