/* eslint-disable @typescript-eslint/no-explicit-any */
import { CommonModule, DatePipe } from '@angular/common';
import { Component, inject, OnDestroy, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { provideMomentDateAdapter } from '@angular/material-moment-adapter';
import { MatNativeDateModule } from '@angular/material/core';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MAT_DIALOG_DATA, MatDialog, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatAutocompleteModule, MatAutocompleteSelectedEvent } from '@angular/material/autocomplete';
import { MatDividerModule } from '@angular/material/divider';
import { ActivatedRoute, Router } from '@angular/router';
import { Subscription } from 'rxjs';

import { UsersService } from '@services/users.service';
import { AssetsService } from '@services/assets.service';
import { Assets } from '../../../common/interfaces/assets/assets';
import { User } from '../../../common/interfaces/users/user';
import { AddUserAssetsComponent } from '../../assets/add-user-assets/add-user-assets.component';
import { AssetReturnComponent } from './asset-return/asset-return.component';
import { environment } from '../../../../environments/environment';

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

export interface AllocatedAssetRow {
  id?: number;
  assetId: number | null;
  assetName: string;
  serialNumber?: string;
  assignedDate: string;
  status: boolean;
  returnDate?: string | null;
  note?: string;
}

@Component({
  selector: 'app-user-assets',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatIconModule,
    MatFormFieldModule,
    MatInputModule,
    MatDatepickerModule,
    MatNativeDateModule,
    MatAutocompleteModule,
    MatButtonModule,
    MatTooltipModule,
    MatProgressSpinnerModule,
    MatDividerModule,
    DatePipe
  ],
  templateUrl: './user-assets.component.html',
  styleUrl: './user-assets.component.scss',
  providers: [provideMomentDateAdapter(MY_FORMATS)]
})
export class UserAssetsComponent implements OnInit, OnDestroy {
  dialogRef = inject(MatDialogRef<UserAssetsComponent>, { optional: true });
  dialogData = inject(MAT_DIALOG_DATA, { optional: true });

  private fb = inject(FormBuilder);
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private dialog = inject(MatDialog);
  private snackbar = inject(MatSnackBar);
  private userService = inject(UsersService);
  private assetService = inject(AssetsService);

  readonly s3Url = environment.s3Url || `https://${environment.AWS_BUCKET_NAME || 'aerohr-uploads'}.s3.amazonaws.com/`;

  userId!: number;
  user: User | null = null;
  userName: string = '';
  empNo: string = '';
  userRole: string = '';

  isLoading: boolean = false;
  isSubmitting: boolean = false;
  updateStatus: boolean = false;

  assets: Assets[] = [];
  filteredOptions: Assets[] = [];
  filterValue: string = '';
  showAddOption: boolean = false;

  rows: AllocatedAssetRow[] = [];

  form: FormGroup = this.fb.group({
    newRow: this.fb.group({
      assetId: [null as number | null, Validators.required],
      assetName: ['', Validators.required],
      serialNumber: [''],
      assignedDate: [new Date(), Validators.required],
      status: [true]
    })
  });

  private subscriptions: Subscription[] = [];

  get isDialog(): boolean {
    return !!this.dialogRef;
  }

  get userImageUrl(): string | null {
    if (!this.user?.url) return null;
    return this.user.url.startsWith('http') ? this.user.url : `${this.s3Url}${this.user.url}`;
  }

  getInitials(): string {
    if (!this.userName) return 'EM';
    const parts = this.userName.trim().split(/\s+/);
    if (parts.length >= 2) {
      return (parts[0][0] + parts[1][0]).toUpperCase();
    }
    return parts[0].substring(0, 2).toUpperCase();
  }

  ngOnInit(): void {
    let id = this.route.snapshot.params['id'];
    if (!id && this.dialogData?.id) {
      id = this.dialogData.id;
    }
    this.userId = Number(id);

    if (this.userId) {
      this.getUserById(this.userId);
      this.getAssets();
    }
  }

  ngOnDestroy(): void {
    this.subscriptions.forEach(sub => sub.unsubscribe());
  }

  getUserById(id: number): void {
    this.isLoading = true;

    // Load user basic profile
    const userSub = this.userService.getUserById(id).subscribe({
      next: (user) => {
        this.user = user;
        this.userName = user.name || 'Employee';
        this.empNo = user.empNo || '';
        this.userRole = user.userPosition?.designation?.designationName || user.role?.roleName || 'Employee';
      },
      error: (err) => console.error('Failed to load user info:', err)
    });
    this.subscriptions.push(userSub);

    // Load currently assigned assets
    const assetSub = this.assetService.getUserAssetsByUser(id).subscribe({
      next: (data) => {
        this.isLoading = false;
        this.rows = [];
        if (Array.isArray(data) && data.length > 0) {
          this.updateStatus = true;
          data.forEach(item => this.addRow(item));
        } else {
          this.updateStatus = false;
        }
        this.updateFilteredOptions();
      },
      error: (err) => {
        this.isLoading = false;
        console.error('Failed to load user assets:', err);
      }
    });
    this.subscriptions.push(assetSub);
  }

  getAssets(): void {
    const sub = this.assetService.getUserAssets('', 1, 500).subscribe({
      next: (res) => {
        const list = Array.isArray(res) ? res : (res?.items || res?.data || []);
        this.assets = list;
        this.updateFilteredOptions();
      },
      error: (err) => console.error('Failed to load assets inventory:', err)
    });
    this.subscriptions.push(sub);
  }

  getAvailableAssets(): Assets[] {
    const activeAllocatedIds = new Set(
      this.rows
        .filter(r => r.status !== false)
        .map(r => Number(r.assetId))
    );

    return this.assets.filter(a => {
      const assetId = Number(a.id);
      // Exclude if already in this employee's active allocation list
      if (activeAllocatedIds.has(assetId)) {
        return false;
      }
      // Available only if not actively assigned
      return !a.assignedStatus;
    });
  }

  updateFilteredOptions(): void {
    const available = this.getAvailableAssets();

    if (!this.filterValue) {
      this.filteredOptions = [...available];
      this.showAddOption = false;
      return;
    }

    const term = this.filterValue.replace(/\s+/g, '');
    this.filteredOptions = available.filter(option => {
      const name = (option.assetName || '').replace(/\s+/g, '').toLowerCase();
      const serial = (option.serialNumber || '').replace(/\s+/g, '').toLowerCase();
      const num = (option.assetNumber || '').replace(/\s+/g, '').toLowerCase();
      return name.includes(term) || serial.includes(term) || num.includes(term);
    });

    // Check if typed name exactly matches an available option
    const exactMatch = available.some(
      a => (a.assetName || '').trim().toLowerCase() === this.filterValue
    );
    this.showAddOption = !exactMatch;
  }

  search(event: Event): void {
    const rawVal = (event.target as HTMLInputElement).value || '';
    this.filterValue = rawVal.trim().toLowerCase();
    this.updateFilteredOptions();
  }

  onOptionSelected(event: MatAutocompleteSelectedEvent): void {
    const selected: Assets = event.option.value;
    if (selected) {
      this.patchAssetSelection(selected);
    }
  }

  patchAssetSelection(asset: Assets): void {
    this.form.get('newRow')?.patchValue({
      assetId: Number(asset.id),
      assetName: asset.assetName,
      serialNumber: asset.serialNumber || ''
    });
  }

  displayAssetFn(asset: any): string {
    if (!asset) return '';
    return typeof asset === 'string' ? asset : (asset.assetName || '');
  }

  addNewIfNoMatch(): void {
    const dialogRef = this.dialog.open(AddUserAssetsComponent, {
      width: '640px',
      data: { initialName: this.filterValue || this.form.get(['newRow', 'assetName'])?.value }
    });

    const sub = dialogRef.afterClosed().subscribe((result) => {
      if (result && typeof result === 'object') {
        const newAsset = result.data || result;
        if (newAsset && (newAsset.id || newAsset.assetName)) {
          this.form.get('newRow')?.patchValue({
            assetId: newAsset.id || null,
            assetName: newAsset.assetName,
            serialNumber: newAsset.serialNumber || ''
          });
          this.getAssets();
          this.snackbar.open(`✨ Registered asset "${newAsset.assetName}" selected!`, 'Close', { duration: 3500 });
        }
      }
    });
    this.subscriptions.push(sub);
  }

  addRow(data?: any): void {
    if (data) {
      const isReturned = data.status === 'Returned' || !!data.returnDate;
      const newRow: AllocatedAssetRow = {
        id: data.id,
        assetId: Number(data.userAssetId || data.userAsset?.id || 0),
        assetName: data.userAsset?.assetName || data.assetName || 'Hardware Asset',
        serialNumber: data.userAsset?.serialNumber || data.serialNumber || 'N/A',
        assignedDate: data.assignedDate,
        status: !isReturned,
        returnDate: data.returnDate || null,
        note: data.note || ''
      };
      this.rows.push(newRow);
      return;
    }

    const newRowControl = this.form.get('newRow');
    if (!newRowControl?.valid) {
      newRowControl?.markAllAsTouched();
      this.snackbar.open('Please select an asset and valid assignment date.', 'Close', { duration: 3000 });
      return;
    }

    const val = newRowControl.value;
    let assetId = val.assetId ? Number(val.assetId) : null;
    let serialNumber = val.serialNumber;

    // Check if typed name matches an existing asset in list if not selected via click
    if (!assetId && val.assetName) {
      const match = this.assets.find(
        a => (a.assetName || '').trim().toLowerCase() === val.assetName.trim().toLowerCase()
      );
      if (match) {
        assetId = Number(match.id);
        serialNumber = match.serialNumber || serialNumber;
      }
    }

    // Check if asset is already assigned to this employee in active state
    if (assetId && this.rows.some(r => Number(r.assetId) === Number(assetId) && r.status !== false)) {
      this.snackbar.open('⚠️ This asset is already actively allocated to this employee.', 'Close', { duration: 3500 });
      return;
    }

    const assignedDateVal = val.assignedDate;
    const formattedDate = assignedDateVal && typeof assignedDateVal.format === 'function'
      ? assignedDateVal.format('YYYY-MM-DD')
      : (assignedDateVal ? new Date(assignedDateVal).toISOString().split('T')[0] : new Date().toISOString().split('T')[0]);

    const newRow: AllocatedAssetRow = {
      assetId: assetId,
      assetName: typeof val.assetName === 'string' ? val.assetName : (val.assetName?.assetName || 'Asset'),
      serialNumber: serialNumber || 'N/A',
      assignedDate: formattedDate,
      status: true,
      returnDate: null,
      note: ''
    };

    this.rows.push(newRow);

    // Reset row builder with today's date
    newRowControl.reset({
      assetId: null,
      assetName: '',
      serialNumber: '',
      assignedDate: new Date(),
      status: true
    });
    this.updateFilteredOptions();
    this.showAddOption = false;
  }

  editRow(row: AllocatedAssetRow, index: number): void {
    if (!row.status) return; // Cannot edit returned rows

    this.form.get('newRow')?.patchValue({
      assetId: row.assetId,
      assetName: row.assetName,
      serialNumber: row.serialNumber,
      assignedDate: row.assignedDate,
      status: row.status
    });
    this.rows.splice(index, 1);
    this.updateFilteredOptions();
  }

  removeRow(index: number): void {
    this.rows.splice(index, 1);
    this.updateFilteredOptions();
  }

  returnAsset(index: number): void {
    const row = this.rows[index];
    const dialogRef = this.dialog.open(AssetReturnComponent, {
      width: '580px',
      panelClass: 'modern-return-dialog',
      autoFocus: false,
      data: {
        assetName: row.assetName,
        serialNumber: row.serialNumber,
        assignedDate: row.assignedDate,
        userName: this.userName,
        empNo: this.empNo
      }
    });

    const sub = dialogRef.afterClosed().subscribe((res) => {
      if (res?.confirmed && res.data) {
        const payload = {
          returnDate: res.data.returnDate,
          note: res.data.note
        };

        if (row.id) {
          this.assetService.returnUserAssets(payload, row.id).subscribe({
            next: () => {
              this.snackbar.open('Equipment return recorded successfully.', 'Close', { duration: 3000 });
              this.getUserById(this.userId);
              this.getAssets();
            },
            error: (err) => {
              console.error('Error recording return:', err);
              this.snackbar.open('Failed to record asset return.', 'Close', { duration: 3000 });
            }
          });
        } else {
          // Unsaved row locally marked returned
          row.status = false;
          row.returnDate = res.data.returnDate;
          row.note = res.data.note;
          this.updateFilteredOptions();
          this.snackbar.open('Marked as returned in roster.', 'Close', { duration: 2500 });
        }
      }
    });
    this.subscriptions.push(sub);
  }

  saveAssets(): void {
    if (this.isSubmitting) return;

    this.isSubmitting = true;
    const payload = {
      userId: this.userId,
      assets: this.rows
    };

    const request$ = this.updateStatus
      ? this.assetService.updateUserAssets(payload, this.userId)
      : this.assetService.addAssetDetails(payload);

    const sub = request$.subscribe({
      next: () => {
        this.isSubmitting = false;
        this.snackbar.open('🎉 Asset allocations saved successfully!', 'Close', { duration: 4000 });
        this.getAssets();
        this.updateStatus = true;
        if (this.dialogRef) {
          this.dialogRef.close(true);
        } else {
          this.getUserById(this.userId);
        }
      },
      error: (err) => {
        this.isSubmitting = false;
        console.error('Failed to save assets:', err);
        const msg = err.error?.message || err.message || 'Failed to save assets';
        this.snackbar.open(`Error: ${msg}`, 'Close', { duration: 4000 });
      }
    });
    this.subscriptions.push(sub);
  }

  getActiveCount(): number {
    return this.rows.filter(r => r.status !== false).length;
  }

  getReturnedCount(): number {
    return this.rows.filter(r => r.status === false).length;
  }

  goBack(): void {
    if (window.history.length > 1) {
      window.history.back();
    } else {
      this.router.navigate(['/login/users']);
    }
  }
}
