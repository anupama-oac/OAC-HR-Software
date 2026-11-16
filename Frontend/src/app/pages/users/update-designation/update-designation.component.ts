import { Component, inject, OnDestroy, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { RoleService } from '@services/role.service';
import { UsersService } from '@services/users.service';
import { Designation } from '../../../common/interfaces/users/designation';
import { MAT_DIALOG_DATA, MatDialog, MatDialogRef } from '@angular/material/dialog';
import { AddDesignationComponent } from '../designation/add-designation/add-designation.component';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatAutocompleteModule } from '@angular/material/autocomplete';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBar } from '@angular/material/snack-bar';
import { Subscription } from 'rxjs';

@Component({
  selector: 'app-update-designation',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    MatFormFieldModule,
    MatAutocompleteModule,
    MatIconModule,
    MatInputModule,
    MatButtonModule,
    MatTooltipModule,
    MatProgressSpinnerModule
  ],
  templateUrl: './update-designation.component.html',
  styleUrl: './update-designation.component.scss'
})
export class UpdateDesignationComponent implements OnInit, OnDestroy {
  private dialogData = inject(MAT_DIALOG_DATA, { optional: true });
  private fb = inject(FormBuilder);
  private roleService = inject(RoleService);
  private userService = inject(UsersService);
  private dialog = inject(MatDialog);
  private snackBar = inject(MatSnackBar);
  public dialogRef = inject(MatDialogRef<UpdateDesignationComponent>);

  name: string = '';
  empNo: string = '';
  currentDesignationName: string = '';
  isLoading: boolean = false;
  isSubmitting: boolean = false;

  form = this.fb.group({
    designationName: ['', Validators.required],
    designationId: [<any>null, Validators.required]
  });

  desigSub!: Subscription;
  userPosSub!: Subscription;
  submit!: Subscription;

  designation: Designation[] = [];
  filteredOptions: Designation[] = [];
  filterValue: string = '';

  ngOnInit(): void {
    this.name = this.dialogData?.name || '';
    this.empNo = this.dialogData?.empNo || '';
    this.getDesignation();
    this.getUsrPos();
  }

  getInitials(): string {
    if (!this.name) return 'U';
    const parts = this.name.trim().split(/\s+/);
    if (parts.length >= 2) {
      return (parts[0][0] + parts[1][0]).toUpperCase();
    }
    return this.name.substring(0, 2).toUpperCase();
  }

  getUsrPos(): void {
    if (!this.dialogData?.id) return;
    this.isLoading = true;
    this.userPosSub = this.userService.getUserPositionDetailsByUser(this.dialogData.id).subscribe({
      next: (user) => {
        this.isLoading = false;
        const currentName = user?.designation?.designationName || '';
        this.currentDesignationName = currentName;
        this.form.patchValue({
          designationName: currentName,
          designationId: user?.designationId || null
        });
      },
      error: (err) => {
        this.isLoading = false;
        console.warn('Could not load user position details:', err);
      }
    });
  }

  getDesignation(): void {
    this.desigSub = this.roleService.getDesignation().subscribe({
      next: (designation) => {
        this.designation = designation || [];
        this.applyFilter();
      },
      error: (err) => {
        console.warn('Could not load designations:', err);
      }
    });
  }

  search(event: Event): void {
    const input = (event.target as HTMLInputElement).value || '';
    this.filterValue = input.trim();
    this.applyFilter();
  }

  applyFilter(): void {
    const query = (this.filterValue || '').replace(/\s+/g, '').toLowerCase();
    if (!query) {
      this.filteredOptions = [...this.designation];
    } else {
      this.filteredOptions = this.designation.filter(option =>
        (option.designationName && option.designationName.replace(/\s+/g, '').toLowerCase().includes(query)) ||
        (option.abbreviation && option.abbreviation.replace(/\s+/g, '').toLowerCase().includes(query))
      );
    }

    // Auto-sync designationId if typed text matches an existing designation exactly
    const exactMatch = this.designation.find(d => 
      d.designationName.trim().toLowerCase() === (this.filterValue || '').toLowerCase()
    );
    if (exactMatch) {
      this.form.get('designationId')?.setValue(exactMatch.id);
    } else if (this.filterValue !== this.currentDesignationName) {
      this.form.get('designationId')?.setValue(null);
    }
  }

  patch(selectedSuggestion: Designation): void {
    if (selectedSuggestion && typeof selectedSuggestion === 'object') {
      this.form.patchValue({
        designationName: selectedSuggestion.designationName,
        designationId: selectedSuggestion.id
      });
      this.form.markAsDirty();
    }
  }

  clearField(event: MouseEvent): void {
    event.stopPropagation();
    this.form.patchValue({
      designationName: '',
      designationId: null
    });
    this.filterValue = '';
    this.filteredOptions = [...this.designation];
  }

  add(): void {
    const nameToPreFill = this.filterValue || '';
    const addRef = this.dialog.open(AddDesignationComponent, {
      width: '500px',
      data: { type: 'add', name: nameToPreFill }
    });

    addRef.afterClosed().subscribe(() => {
      this.getDesignation();
    });
  }

  onSubmit(): void {
    if (this.form.invalid || this.isSubmitting) return;

    this.isSubmitting = true;
    this.submit = this.userService.updateDesignation(this.dialogData.id, this.form.getRawValue()).subscribe({
      next: () => {
        this.isSubmitting = false;
        this.snackBar.open(`Designation updated successfully for ${this.name}`, 'OK', { duration: 3000 });
        this.dialogRef.close(true);
      },
      error: (err) => {
        this.isSubmitting = false;
        const msg = err?.error?.message || err?.message || 'Failed to update designation';
        this.snackBar.open(msg, 'Close', { duration: 4000 });
      }
    });
  }

  close(): void {
    this.dialogRef.close(false);
  }

  ngOnDestroy(): void {
    this.desigSub?.unsubscribe();
    this.userPosSub?.unsubscribe();
    this.submit?.unsubscribe();
  }
}
