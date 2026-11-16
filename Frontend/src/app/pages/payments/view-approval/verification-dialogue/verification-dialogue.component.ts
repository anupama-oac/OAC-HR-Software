/* eslint-disable @typescript-eslint/no-explicit-any */
import { Component, inject, OnInit, OnDestroy } from '@angular/core';
import { FormBuilder, ReactiveFormsModule } from '@angular/forms';
import { MatDialogRef, MAT_DIALOG_DATA, MatDialogModule } from '@angular/material/dialog';
import { LoginService } from '@services/login.service';
import { Subscription } from 'rxjs';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatOptionModule } from '@angular/material/core';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { CommonModule } from '@angular/common';
import { User } from '../../../../common/interfaces/users/user';

@Component({
  selector: 'app-verification-dialogue',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatDialogModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatOptionModule,
    MatButtonModule,
    MatIconModule
  ],
  templateUrl: './verification-dialogue.component.html',
  styleUrl: './verification-dialogue.component.scss'
})
export class VerificationDialogueComponent implements OnInit, OnDestroy {
  loginService = inject(LoginService);
  fb = inject(FormBuilder);
  dialogRef = inject(MatDialogRef<VerificationDialogueComponent>);
  dialogData = inject(MAT_DIALOG_DATA);

  form = this.fb.group({
    remarks: [''],
    kamId: [],
    amId: [],
    accountantId: [],
    spId: [''],
  });

  invoiceNo!: string;
  status!: string;
  isSelectionMade: boolean = true;
  userSub?: Subscription;
  kamSub?: Subscription;
  am: User[] = [];
  kam: User[] = [];

  ngOnInit(): void {
    this.invoiceNo = this.dialogData?.invoiceNo || '';
    this.status = this.dialogData?.status || '';

    this.form.get('spId')?.setValue(this.dialogData?.sp);

    const s = this.status;
    if (s === 'KAM VERIFIED') {
      this.getAm();
      this.isSelectionMade = false;
    } else if (s === 'AM VERIFIED' || s === 'AM Verified') {
      this.getMa();
      this.isSelectionMade = false;
    } else if (s === 'AM APPROVED') {
      this.getKam();
      this.isSelectionMade = false;
    } else {
      // FM Approved, FM Rejected, OM Approved, OM Rejected, AM REJECTED, etc.
      // Do not require dropdown selection, so button is enabled immediately!
      this.isSelectionMade = true;
    }
  }

  ngOnDestroy(): void {
    this.userSub?.unsubscribe();
    this.kamSub?.unsubscribe();
  }

  onSelectionChange(): void {
    if (this.status === 'KAM VERIFIED') {
      this.isSelectionMade = Boolean(this.form.get('amId')?.value);
    } else if (this.status === 'AM VERIFIED' || this.status === 'AM Verified') {
      this.isSelectionMade = Boolean(this.form.get('accountantId')?.value);
    } else if (this.status === 'AM APPROVED') {
      this.isSelectionMade = Boolean(this.form.get('kamId')?.value);
    } else {
      this.isSelectionMade = true;
    }
  }

  get isApproveAction(): boolean {
    const s = (this.status || '').toLowerCase();
    return s.includes('approved') || s.includes('verified') || s.includes('transferred');
  }

  get isRejectAction(): boolean {
    const s = (this.status || '').toLowerCase();
    return s.includes('rejected') || s.includes('declined') || s.includes('revert');
  }

  get actionTitle(): string {
    if (this.isApproveAction) return 'Confirm Amount Transferred';
    if (this.isRejectAction) return 'Revert to Employee';
    return 'Change Status';
  }

  get formattedTargetStatus(): string {
    if (this.status === 'FM Approved' || this.status === 'Amount Transferred') return 'Amount Transferred';
    if (this.status === 'FM Rejected' || this.status === 'Reverted to Employee') return 'Reverted to Employee';
    if (this.status === 'OM Approved') return 'Operations Approved (Transferred)';
    if (this.status === 'OM Rejected') return 'Reverted to Employee';
    return this.status;
  }

  onCancelClick(): void {
    this.dialogRef.close();
  }

  onConfirmClick(): void {
    const data = {
      value: true,
      remarks: this.form.get('remarks')?.value || '',
      kamId: this.form.get('kamId')?.value,
      amId: this.form.get('amId')?.value,
      accountantId: this.form.get('accountantId')?.value
    };
    this.dialogRef.close(data);
  }

  getAm(): void {
    this.userSub = this.loginService.getUserByRoleName('Manager').subscribe(data => {
      this.am = data;
    });
  }

  getKam(): void {
    this.kamSub = this.loginService.getUserByRoleName('Key Account Manager').subscribe(data => {
      this.kam = data;
    });
  }

  getMa(): void {
    this.userSub = this.loginService.getUserByRoleName('Accountant').subscribe(data => {
      this.am = data;
    });
  }
}
