/* eslint-disable @typescript-eslint/no-explicit-any */
import { Component, inject, OnDestroy, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatSnackBar } from '@angular/material/snack-bar';
import { Subscription } from 'rxjs';

import { Assets } from '../../../common/interfaces/assets/assets';
import { AssetsService } from '@services/assets.service';

@Component({
  selector: 'app-add-assets',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatFormFieldModule,
    MatIconModule,
    MatInputModule,
    MatButtonModule,
    MatDialogModule,
    MatTooltipModule
  ],
  templateUrl: './add-assets.component.html',
  styleUrl: './add-assets.component.scss'
})
export class AddAssetsComponent implements OnInit, OnDestroy {
  private readonly fb = inject(FormBuilder);
  private readonly dialogRef = inject(MatDialogRef<AddAssetsComponent>);
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
    noOfItems: [1, [Validators.min(1)]]
  });

  ngOnInit(): void {
    if (this.asset) {
      this.patchAsset(this.asset);
    }
  }

  patchAsset(asset: Assets): void {
    this.editStatus = true;
    this.form.patchValue({
      assetName: asset.assetName,
      description: asset.description,
      assetNumber: asset.assetNumber,
      assetHandoverNumber: asset.assetHandoverNumber,
      serialNumber: asset.serialNumber,
      noOfItems: asset.noOfItems || 1
    });
  }

  onSubmit(): void {
    if (this.form.invalid || this.isSubmitting) return;

    this.isSubmitting = true;
    const formVal = this.form.getRawValue();

    if (this.editStatus) {
      this.submitSub = this.assetService.updateAssets(this.asset.id, formVal).subscribe({
        next: () => {
          this.isSubmitting = false;
          this.snackBar.open('Company asset updated successfully', '', { duration: 3000 });
          this.dialogRef.close(true);
        },
        error: (err) => {
          this.isSubmitting = false;
          console.error('Update company asset failed:', err);
          this.snackBar.open('Failed to update company asset', 'Close', { duration: 3000 });
        }
      });
    } else {
      this.submitSub = this.assetService.addAssets(formVal).subscribe({
        next: () => {
          this.isSubmitting = false;
          this.snackBar.open('Company asset added successfully', '', { duration: 3000 });
          this.dialogRef.close(true);
        },
        error: (err) => {
          this.isSubmitting = false;
          console.error('Add company asset failed:', err);
          this.snackBar.open('Failed to add company asset', 'Close', { duration: 3000 });
        }
      });
    }
  }

  ngOnDestroy(): void {
    this.submitSub?.unsubscribe();
  }
}
