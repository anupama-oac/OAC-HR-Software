/* eslint-disable @typescript-eslint/no-explicit-any */
import { CommonModule, DatePipe } from '@angular/common';
import { Component, inject, OnDestroy, OnInit } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatOptionModule } from '@angular/material/core';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatSnackBar } from '@angular/material/snack-bar';
import { Router } from '@angular/router';
import { Subscription } from 'rxjs';
import { PayrollService } from '@services/payroll.service';
import { UsersService } from '@services/users.service';
import { AdvanceSalary } from '../../../../common/interfaces/payRoll/advanceSalary';
import { MatAutocompleteModule } from '@angular/material/autocomplete';
import { MatSelectModule } from '@angular/material/select';
import { MatTooltipModule } from '@angular/material/tooltip';
import { User } from '../../../../common/interfaces/users/user';

@Component({
  selector: 'app-add-advance-salary',
  standalone: true,
  imports: [
    MatAutocompleteModule,
    CommonModule,
    ReactiveFormsModule,
    MatDatepickerModule,
    MatFormFieldModule,
    MatIconModule,
    MatButtonModule,
    MatOptionModule,
    MatInputModule,
    MatSelectModule,
    MatTooltipModule
  ],
  providers: [DatePipe],
  templateUrl: './add-advance-salary.component.html',
  styleUrl: './add-advance-salary.component.scss'
})
export class AddAdvanceSalaryComponent implements OnInit, OnDestroy {
  private formBuilder = inject(FormBuilder);
  private payrollService = inject(PayrollService);
  private snackBar = inject(MatSnackBar);
  private router = inject(Router);
  private userService = inject(UsersService);
  public dialogRef = inject(MatDialogRef<AddAdvanceSalaryComponent>, { optional: true });
  public dialogData = inject(MAT_DIALOG_DATA, { optional: true });

  months = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12];
  editStatus: boolean = false;
  isSubmitting: boolean = false;
  users: User[] = [];
  filteredUsers: User[] = [];
  filterValue = '';

  advanceSalaryForm = this.formBuilder.group({
    userId: <any>['', Validators.required],
    userName: ['', Validators.required],
    scheme: ['OneTime', Validators.required],
    amount: <any>['', [Validators.required, Validators.min(1)]],
    duration: <any>[1, [Validators.required, Validators.min(1)]],
    monthlyPay: <any>[0],
    reason: ['', Validators.required]
  });

  private submitSub?: Subscription;
  private usersSub?: Subscription;
  private formChangeSub?: Subscription;

  ngOnInit() {
    this.getUsers();
    if (this.dialogData?.salary) {
      this.patchdata(this.dialogData.salary);
    }
    this.formChangeSub = this.advanceSalaryForm.valueChanges.subscribe(() => {
      this.findAmount();
    });
  }

  findAmount() {
    const scheme = this.advanceSalaryForm.get('scheme')?.value;
    if (scheme === 'OneTime') {
      this.advanceSalaryForm.get('duration')?.setValue(1, { emitEvent: false });
    }
    const duration = Number(this.advanceSalaryForm.get('duration')?.value) || 1;
    const amount = Number(this.advanceSalaryForm.get('amount')?.value) || 0;
    if (duration > 0 && amount > 0) {
      const monthPay = Math.round((amount / duration) * 100) / 100;
      this.advanceSalaryForm.get('monthlyPay')?.setValue(monthPay, { emitEvent: false });
    } else {
      this.advanceSalaryForm.get('monthlyPay')?.setValue(0, { emitEvent: false });
    }
  }

  get calculatedMonthlyPay(): number {
    return Number(this.advanceSalaryForm.get('monthlyPay')?.value) || 0;
  }

  get totalAmount(): number {
    return Number(this.advanceSalaryForm.get('amount')?.value) || 0;
  }

  get selectedScheme(): string {
    return this.advanceSalaryForm.get('scheme')?.value || 'OneTime';
  }

  get selectedDuration(): number {
    return Number(this.advanceSalaryForm.get('duration')?.value) || 1;
  }

  getUsers() {
    this.usersSub = this.userService.getUser('', 1, 1000).subscribe({
      next: (result: any) => {
        const list = result.items ? result.items : (Array.isArray(result) ? result : []);
        this.users = list;
        this.filteredUsers = list;
      },
      error: (err) => {
        console.error('Failed to load users', err);
      }
    });
  }

  search(event: Event) {
    this.filterValue = (event.target as HTMLInputElement).value.trim().replace(/\s+/g, '').toLowerCase();
    this.filteredUsers = this.users.filter(option =>
      (option.name && option.name.replace(/\s+/g, '').toLowerCase().includes(this.filterValue)) ||
      (option.empNo && option.empNo.toString().replace(/\s+/g, '').toLowerCase().includes(this.filterValue))
    );
  }

  patch(selectedSuggestion: User) {
    this.advanceSalaryForm.patchValue({
      userId: selectedSuggestion.id,
      userName: `${selectedSuggestion.name} (${selectedSuggestion.empNo || 'ID: ' + selectedSuggestion.id})`
    });
  }

  getUserInitials(name?: string): string {
    if (!name) return 'EM';
    const parts = name.trim().split(' ').filter(p => p.length > 0);
    if (parts.length >= 2) {
      return (parts[0][0] + parts[1][0]).toUpperCase();
    }
    return name.substring(0, 2).toUpperCase();
  }

  patchdata(data: AdvanceSalary) {
    this.editStatus = true;
    const displayName = data.user?.name
      ? `${data.user.name} (${data.user.empNo || 'ID: ' + data.userId})`
      : `User #${data.userId}`;

    this.advanceSalaryForm.patchValue({
      userId: data.userId,
      userName: displayName,
      scheme: data.scheme || 'OneTime',
      amount: data.amount,
      reason: data.reason,
      duration: data.duration || 1,
      monthlyPay: data.monthlyPay
    });
  }

  onSubmit() {
    if (this.advanceSalaryForm.invalid) {
      this.advanceSalaryForm.markAllAsTouched();
      return;
    }

    this.isSubmitting = true;
    const formValue = this.advanceSalaryForm.getRawValue();
    const duration = formValue.scheme === 'OneTime' ? 1 : (Number(formValue.duration) || 1);
    const amount = Number(formValue.amount) || 0;
    const monthlyPay = formValue.scheme === 'OneTime' ? amount : (Number(formValue.monthlyPay) || Math.round((amount / duration) * 100) / 100);

    const payload = {
      userId: Number(formValue.userId),
      scheme: formValue.scheme,
      amount: amount,
      reason: formValue.reason,
      duration: duration,
      monthlyPay: monthlyPay
    };

    if (this.dialogData?.salary) {
      this.submitSub = this.payrollService.updateAdvanceSalary(this.dialogData.salary.id, payload).subscribe({
        next: () => {
          this.isSubmitting = false;
          if (this.dialogRef) this.dialogRef.close(true);
          this.snackBar.open("Advance salary updated successfully", "Close", { duration: 3000 });
        },
        error: (err) => {
          this.isSubmitting = false;
          this.snackBar.open(err.error?.message || "Failed to update advance salary", "Close", { duration: 3500 });
        }
      });
    } else {
      this.submitSub = this.payrollService.addAdvanceSalary(payload).subscribe({
        next: () => {
          this.isSubmitting = false;
          if (this.dialogRef) this.dialogRef.close(true);
          else this.router.navigateByUrl('/login/payroll/advance-salary');
          this.snackBar.open("Advance salary recorded successfully", "Close", { duration: 3000 });
        },
        error: (err) => {
          this.isSubmitting = false;
          this.snackBar.open(err.error?.message || "Failed to record advance salary", "Close", { duration: 3500 });
        }
      });
    }
  }

  close() {
    this.dialogRef?.close(false);
  }

  ngOnDestroy(): void {
    this.submitSub?.unsubscribe();
    this.usersSub?.unsubscribe();
    this.formChangeSub?.unsubscribe();
  }
}
