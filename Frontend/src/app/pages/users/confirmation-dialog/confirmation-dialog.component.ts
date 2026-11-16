/* eslint-disable @typescript-eslint/no-explicit-any */
import { CommonModule } from '@angular/common';
import { Component, inject, OnInit } from '@angular/core';
import { FormBuilder, ReactiveFormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatTooltipModule } from '@angular/material/tooltip';

export interface ConfirmationDialogData {
  id: number;
  empNo: string;
  name: string;
  isTemporary: boolean;
  defaultTarget?: 'probation' | 'confirmation';
}

@Component({
  selector: 'app-confirmation-dialog',
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatIconModule,
    MatDialogModule,
    MatTooltipModule
  ],
  templateUrl: './confirmation-dialog.component.html',
  styleUrl: './confirmation-dialog.component.scss',
  standalone: true
})
export class ConfirmationDialogComponent implements OnInit {
  private fb = inject(FormBuilder);
  private dialogRef = inject(MatDialogRef<ConfirmationDialogComponent>);
  public data: ConfirmationDialogData = inject(MAT_DIALOG_DATA);

  targetStatus: 'probation' | 'confirmation' = 'probation';

  statusForm = this.fb.group({
    note: ['']
  });

  ngOnInit(): void {
    if (this.data?.defaultTarget) {
      this.targetStatus = this.data.defaultTarget;
    } else if (this.data?.isTemporary !== undefined) {
      // If employee is in probation status, enable with confirmation radio button;
      // if confirmed status, enable the other button (probation).
      this.targetStatus = this.data.isTemporary ? 'confirmation' : 'probation';
    } else {
      this.targetStatus = 'confirmation';
    }
  }

  setTargetStatus(status: 'probation' | 'confirmation'): void {
    this.targetStatus = status;
  }

  onCancel(): void {
    this.dialogRef.close({ confirmed: false });
  }

  onConfirm(): void {
    if (this.statusForm.valid) {
      this.dialogRef.close({
        confirmed: true,
        note: this.statusForm.value.note || '',
        targetStatus: this.targetStatus,
        isTemporary: this.targetStatus === 'probation'
      });
    }
  }
}
