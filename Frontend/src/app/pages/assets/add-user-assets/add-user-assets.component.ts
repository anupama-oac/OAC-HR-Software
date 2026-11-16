/* eslint-disable @typescript-eslint/no-explicit-any */
import { Component, inject, OnDestroy, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatDialogRef, MAT_DIALOG_DATA, MatDialogModule } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MatButtonModule } from '@angular/material/button';
import { MatNativeDateModule } from '@angular/material/core';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatTooltipModule } from '@angular/material/tooltip';
import { provideMomentDateAdapter } from '@angular/material-moment-adapter';
import { Subscription } from 'rxjs';

import { AssetsService } from '@services/assets.service';
import { UserAssets } from '../../../common/interfaces/users/user-assets';

export const MY_FORMATS = {
  parse: {
    dateInput: 'DD/MM/YYYY',
  },
  display: {
    dateInput: 'DD/MM/YYYY',
    monthYearLabel: 'MMM YYYY',
    dateA11yLabel: 'DD/MM/YYYY',
    monthYearA11yLabel: 'MMMM YYYY',
  },
};

@Component({
  selector: 'app-add-user-assets',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatFormFieldModule,
    MatDatepickerModule,
    MatIconModule,
    MatInputModule,
    MatButtonModule,
    MatDialogModule,
    MatNativeDateModule,
    MatTooltipModule
  ],
  templateUrl: './add-user-assets.component.html',
  styleUrl: './add-user-assets.component.scss',
  providers: [provideMomentDateAdapter(MY_FORMATS)]
})
export class AddUserAssetsComponent implements OnInit, OnDestroy {
  private readonly fb = inject(FormBuilder);
  private readonly dialogRef = inject(MatDialogRef<AddUserAssetsComponent>);
  private readonly asset = inject(MAT_DIALOG_DATA);
  private readonly assetService = inject(AssetsService);
  private readonly snackBar = inject(MatSnackBar);

  editStatus: boolean = false;
  isSubmitting: boolean = false;
  private submitSub?: Subscription;

  form = this.fb.group({
    assetName: ['', [Validators.required]],
    assetNumber: [''],
    assetHandoverNumber: [''],
    description: [''],
    serialNumber: [''],
    purchasedDate: <any>null,
    purchasedFrom: [''],
    invoiceNo: [''],
    assignedStatus: [false]
  });

  ngOnInit(): void {
    if (this.asset && this.asset.id) {
      this.patchAsset(this.asset);
    } else {
      this.editStatus = false;
      if (this.asset?.initialName) {
        this.form.get('assetName')?.setValue(this.asset.initialName);
      }
    }
  }

  patchAsset(asset: UserAssets): void {
    this.editStatus = true;
    this.form.patchValue({
      assetName: asset.assetName,
      assetNumber: asset.assetNumber,
      assetHandoverNumber: asset.assetHandoverNumber,
      serialNumber: asset.serialNumber,
      purchasedDate: asset.purchasedDate,
      purchasedFrom: asset.purchasedFrom,
      invoiceNo: asset.invoiceNo,
      description: asset.description,
      assignedStatus: asset.assignedStatus || false
    });
  }

  onSubmit(): void {
    if (this.form.invalid || this.isSubmitting) return;

    this.isSubmitting = true;
    const formVal = this.form.getRawValue();

    if (this.editStatus) {
      this.submitSub = this.assetService.editUserAssets(formVal, this.asset.id).subscribe({
        next: () => {
          this.isSubmitting = false;
          this.snackBar.open('User asset updated successfully', '', { duration: 3000 });
          this.dialogRef.close(true);
        },
        error: (err) => {
          this.isSubmitting = false;
          console.error('Update user asset failed:', err);
          this.snackBar.open('Failed to update user asset', 'Close', { duration: 3000 });
        }
      });
    } else {
      this.submitSub = this.assetService.addUserAssets(formVal).subscribe({
        next: (res) => {
          this.isSubmitting = false;
          this.snackBar.open('User asset added successfully', '', { duration: 3000 });
          this.dialogRef.close(res);
        },
        error: (err) => {
          this.isSubmitting = false;
          console.error('Add user asset failed:', err);
          this.snackBar.open('Failed to add user asset', 'Close', { duration: 3000 });
        }
      });
    }
  }

  ngOnDestroy(): void {
    this.submitSub?.unsubscribe();
  }
}
