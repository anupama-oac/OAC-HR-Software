import { CommonModule } from '@angular/common';
import { Component, inject, OnDestroy, OnInit } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MatTooltipModule } from '@angular/material/tooltip';
import { UsersService } from '@services/users.service';
import { Subscription } from 'rxjs';

export interface ResetPasswordDialogData {
  id: number;
  empNo: string;
  name?: string;
  paswordReset?: boolean;
}

@Component({
  selector: 'app-reset-password',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatFormFieldModule,
    MatInputModule,
    MatIconModule,
    MatButtonModule,
    MatDialogModule,
    MatTooltipModule,
    MatSlideToggleModule,
    MatProgressSpinnerModule
  ],
  templateUrl: './reset-password.component.html',
  styleUrl: './reset-password.component.scss'
})
export class ResetPasswordComponent implements OnInit, OnDestroy {
  private dialogRef = inject(MatDialogRef<ResetPasswordComponent>);
  public data: ResetPasswordDialogData = inject(MAT_DIALOG_DATA);
  private fb = inject(FormBuilder);
  private userService = inject(UsersService);
  private snackBar = inject(MatSnackBar);

  private subscriptions: Subscription = new Subscription();
  resetSub!: Subscription;

  isLoading: boolean = false;
  showPassword: boolean = false;
  showConfirmedPassword: boolean = false;
  passwordMismatch: boolean = false;

  form = this.fb.group({
    empNo: [{ value: this.data?.empNo || '', disabled: false }, Validators.required],
    paswordReset: [this.data?.paswordReset ?? false],
    password: ['', [Validators.required, Validators.minLength(6)]],
    confirmPassword: ['', Validators.required]
  });

  ngOnInit(): void {
    this.subscriptions.add(
      this.form.get('confirmPassword')?.valueChanges.subscribe(() => {
        this.checkPasswords();
      })
    );

    this.subscriptions.add(
      this.form.get('password')?.valueChanges.subscribe(() => {
        this.checkPasswords();
      })
    );
  }

  ngOnDestroy(): void {
    this.subscriptions.unsubscribe();
    this.resetSub?.unsubscribe();
  }

  checkPasswords(): void {
    const password = this.form.get('password')?.value;
    const confirmPassword = this.form.get('confirmPassword')?.value;
    this.passwordMismatch = !!(password && confirmPassword && password !== confirmPassword);
  }

  get passwordVal(): string {
    return this.form.get('password')?.value || '';
  }

  get confirmPasswordVal(): string {
    return this.form.get('confirmPassword')?.value || '';
  }

  get hasMinLength(): boolean {
    return this.passwordVal.length >= 6;
  }

  get doPasswordsMatch(): boolean {
    return this.hasMinLength && !this.passwordMismatch && !!this.confirmPasswordVal;
  }

  generateRandomPassword(): void {
    const upper = 'ABCDEFGHJKLMNPQRSTUVWXYZ';
    const lower = 'abcdefghijkmnpqrstuvwxyz';
    const numbers = '23456789';
    const symbols = '!@#$%&*';
    const all = upper + lower + numbers + symbols;

    let pwd = '';
    pwd += upper[Math.floor(Math.random() * upper.length)];
    pwd += lower[Math.floor(Math.random() * lower.length)];
    pwd += numbers[Math.floor(Math.random() * numbers.length)];
    pwd += symbols[Math.floor(Math.random() * symbols.length)];

    for (let i = 4; i < 10; i++) {
      pwd += all.charAt(Math.floor(Math.random() * all.length));
    }

    pwd = pwd.split('').sort(() => 0.5 - Math.random()).join('');

    this.form.get('password')?.setValue(pwd);
    this.form.get('confirmPassword')?.setValue(pwd);
    this.form.get('password')?.markAsDirty();
    this.form.get('confirmPassword')?.markAsDirty();
    this.showPassword = true;
    this.showConfirmedPassword = true;
    this.checkPasswords();
    this.snackBar.open('Generated a secure random password', 'Close', { duration: 2500 });
  }

  copyCredentials(): void {
    const empNo = this.form.get('empNo')?.value || this.data.empNo;
    const password = this.form.get('password')?.value;

    if (!password) {
      this.snackBar.open('Please enter or generate a password first', 'Close', { duration: 2500 });
      return;
    }

    const textToCopy = `Username: ${empNo}\nPassword: ${password}`;
    navigator.clipboard.writeText(textToCopy).then(
      () => {
        this.snackBar.open('Username & password copied to clipboard!', 'Close', { duration: 3000 });
      },
      (err) => {
        console.error('Could not copy text: ', err);
        this.snackBar.open('Failed to copy to clipboard', 'Close', { duration: 2500 });
      }
    );
  }

  copyUsername(): void {
    const empNo = this.form.get('empNo')?.value || this.data.empNo;
    if (empNo) {
      navigator.clipboard.writeText(empNo).then(() => {
        this.snackBar.open(`Copied ${empNo} to clipboard`, 'Close', { duration: 2000 });
      });
    }
  }

  togglePasswordVisibility(): void {
    this.showPassword = !this.showPassword;
  }

  toggleConfirmedPasswordVisibility(): void {
    this.showConfirmedPassword = !this.showConfirmedPassword;
  }

  onCancelClick(): void {
    this.dialogRef.close({ confirmed: false });
  }

  onSubmit(): void {
    if (this.form.invalid || this.passwordMismatch) {
      return;
    }

    this.isLoading = true;
    const rawVal = this.form.getRawValue();

    this.resetSub = this.userService.resetPassword(this.data.id, rawVal).subscribe({
      next: () => {
        this.isLoading = false;
        this.dialogRef.close({ confirmed: true });
        this.snackBar.open(`Password for ${this.data.empNo} reset successfully!`, 'Close', { duration: 3500 });
      },
      error: (err) => {
        this.isLoading = false;
        console.error('Password reset failed:', err);
        this.snackBar.open(err?.error?.message || 'Failed to reset password', 'Close', { duration: 3500 });
      }
    });
  }
}

