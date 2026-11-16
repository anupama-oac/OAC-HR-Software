/* eslint-disable @typescript-eslint/no-explicit-any */
import { Component, EventEmitter, inject, Input, OnDestroy, OnInit, Output, ChangeDetectionStrategy, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatOptionModule } from '@angular/material/core';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MatTooltipModule } from '@angular/material/tooltip';
import { UsersService } from '@services/users.service';
import { Subscription } from 'rxjs';

@Component({
  selector: 'app-user-account',
  standalone: true,
  imports: [
    CommonModule,
    MatFormFieldModule,
    ReactiveFormsModule,
    MatOptionModule,
    MatSelectModule,
    MatInputModule,
    MatButtonModule,
    MatCardModule,
    MatIconModule,
    MatTooltipModule
  ],
  templateUrl: './user-account.component.html',
  styleUrl: './user-account.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class UserAccountComponent implements OnInit, OnDestroy {
  private fb = inject(FormBuilder);
  private userService = inject(UsersService);
  private snackBar = inject(MatSnackBar);
  private cdr = inject(ChangeDetectorRef);

  @Input() accountData: any;
  @Input() data: any;  
  @Input() loading = false;
  @Output() loadingState = new EventEmitter<boolean>();
  @Output() dataSubmitted = new EventEmitter<any>();
  @Output() nextTab = new EventEmitter<void>();
  @Output() previousTab = new EventEmitter<void>();

  form = this.fb.group({
    userId: [''],
    accountNo: [''],
    ifseCode: ['UTIB0000827'],
    paymentFrequency: ['Monthly'],
    modeOfPayment: ['BankTransfer'],
    branchName: ['Vyttila'],
    bankName: ['Axis Bank']
  });

  editStatus: boolean = false;
  id!: number;
  private pUSub!: Subscription;
  private submitSub!: Subscription;
  isNext: boolean = false;

  ngOnInit(): void {
    if (!this.form.get('paymentFrequency')?.value) {
      this.form.get('paymentFrequency')?.setValue('Monthly');
    }
    if (!this.form.get('modeOfPayment')?.value) {
      this.form.get('modeOfPayment')?.setValue('BankTransfer');
    }
  }

  ngOnDestroy(): void {
    this.pUSub?.unsubscribe();
    this.submitSub?.unsubscribe();
  }

  triggerNew(data?: any): void {
    const target = data || this.accountData || this.data;
    if (target) {
      this.accountData = target;
      this.data = target;
      if (target.id) {
        this.form.patchValue({ userId: target.id });
        this.getPositionDetailsByUser(target.id);
      }
    }
    this.cdr.markForCheck();
  }

  getPositionDetailsByUser(id: number): void {
    this.pUSub = this.userService.getUserAcoountDetailsByUser(id).subscribe({
      next: (data) => {
        if (data) {
          this.id = data.id;
          this.editStatus = true;
          this.form.patchValue({
            accountNo: data.accountNo,
            ifseCode: data.ifseCode,
            paymentFrequency: data.paymentFrequency || 'Monthly',
            modeOfPayment: data.modeOfPayment || 'BankTransfer',
            branchName: data.branchName,
            bankName: data.bankName
          });
          this.cdr.markForCheck();
        }
      },
      error: (err) => {
        console.warn('Could not fetch account details for user:', id, err);
      }
    });
  }

  onSubmit(): void {
    this.loadingState.emit(true);
    this.isNext = true;

    const submit = {
      ...this.form.getRawValue()
    };
    submit.userId = submit.userId ? submit.userId : (this.accountData?.id || this.data?.id || this.id);

    if (this.editStatus) {
      this.submitSub = this.userService.updateUserAccount(this.id, submit).subscribe({
        next: () => {
          this.snackBar.open("Bank account details updated successfully", "Close", { duration: 3000 });
          this.loadingState.emit(false);
          this.dataSubmitted.emit({ isFormSubmitted: true });
          this.cdr.markForCheck();
        },
        error: (err) => {
          this.loadingState.emit(false);
          const msg = err?.error?.message || err?.message || "Failed to update bank account details";
          this.snackBar.open(msg, "Close", { duration: 3500 });
          this.cdr.markForCheck();
        }
      });
    } else {
      this.submitSub = this.userService.addUserAccountDetails(submit).subscribe({
        next: (res) => {
          this.editStatus = true;
          this.id = res.id;
          this.snackBar.open("Bank account details saved successfully", "Close", { duration: 3000 });
          this.loadingState.emit(false);
          this.dataSubmitted.emit({ isFormSubmitted: true });
          this.cdr.markForCheck();
        },
        error: (err) => {
          this.loadingState.emit(false);
          const msg = err?.error?.message || err?.message || "Failed to save bank account details";
          this.snackBar.open(msg, "Close", { duration: 3500 });
          this.cdr.markForCheck();
        }
      });
    }
  }

  triggerNextTab(): void {
    this.nextTab.emit();
  }

  triggerPreviousTab(): void {
    this.previousTab.emit();
  }
}
