import { Component, inject } from '@angular/core';
import { CommonModule, DecimalPipe } from '@angular/common';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';

export interface PayrollVerificationData {
  userName: string;
  currentPay: number | string;
  updated: number | string;
}

@Component({
  selector: 'app-payroll-update-verification',
  standalone: true,
  imports: [
    CommonModule,
    DecimalPipe,
    MatButtonModule,
    MatIconModule,
    MatTooltipModule
  ],
  templateUrl: './payroll-update-verification.component.html',
  styleUrl: './payroll-update-verification.component.scss'
})
export class PayrollUpdateVerificationComponent {
  dialogRef = inject(MatDialogRef<PayrollUpdateVerificationComponent>);
  dialogData: PayrollVerificationData = inject(MAT_DIALOG_DATA);

  getSalaryDifference(): number {
    const current = Number(this.dialogData?.currentPay) || 0;
    const updated = Number(this.dialogData?.updated) || 0;
    return updated - current;
  }

  getPercentageChange(): number {
    const current = Number(this.dialogData?.currentPay) || 0;
    const diff = this.getSalaryDifference();
    if (!current || !diff) return 0;
    return (diff / current) * 100;
  }

  getInitials(): string {
    const name = this.dialogData?.userName || '';
    if (!name) return 'EM';
    const parts = name.trim().split(/\s+/);
    if (parts.length >= 2) {
      return (parts[0][0] + parts[1][0]).toUpperCase();
    }
    return parts[0].substring(0, 2).toUpperCase();
  }

  onOkClick(): void {
    this.dialogRef.close(true);
  }

  onCancelClick(): void {
    this.dialogRef.close(false);
  }
}
