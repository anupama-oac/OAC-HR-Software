import { Component, inject } from '@angular/core';
import { FormBuilder, Validators, ReactiveFormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { MatSnackBar } from '@angular/material/snack-bar';
import { LoginService } from '@services/login.service';
import { MatDialog } from '@angular/material/dialog';
import { ResetPasswordComponent } from '../users/reset-password/reset-password.component';
import { MatIconModule } from '@angular/material/icon';
import { SettingsService } from '@services/settings.service';

@Component({
  standalone: true,
  selector: 'app-login',
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.scss'],
  imports: [
    CommonModule, MatIconModule,
    ReactiveFormsModule
  ],
  providers: [SettingsService],
})
export class LoginComponent {
  isSignUpMode = false;
  errorMessage: string | null = null;
  private fb = inject(FormBuilder);
  private router = inject(Router);
  private loginService = inject(LoginService);
  private snackBar = inject(MatSnackBar);

  loginForm = this.fb.group({
    empNo: ['', Validators.required],
    password: ['', Validators.required]
  });

  toggleSignUpMode(isSignUp: boolean = true): void {
    this.isSignUpMode = isSignUp;
  }

  onSignIn(): void {
    if (this.loginForm.invalid) {
      this.errorMessage = 'Please fill in all fields correctly. Incorrect Username/password';
      return;
    }

    this.loginService.loginUser(this.loginForm.value).subscribe({
      next: (res: boolean) => {
        if (res) {
          // Trigger celebration wish popup on fresh employee login
          sessionStorage.setItem('oac_show_login_celebration_popup', 'true');
          sessionStorage.removeItem('oac_login_celebration_popup_shown');

          const token: any = localStorage.getItem('token');
          const user = JSON.parse(token);
          if (!user.paswordReset) {
            this.resetPassword(user.id, user.empNo);
          } else {
            this.router.navigate(['/login']);
          }
        } else {
          this.errorMessage = 'Incorrect username or password';
          this.snackBar.open('Incorrect username or password', 'Close', {
            duration: 3000,
          });
        }
      },
      error: () => {
        this.errorMessage = 'Invalid username or password';
        this.snackBar.open('Invalid username or password', 'Close', {
          duration: 3000,
        });
      }
    });
  }

  dialog = inject(MatDialog);
  resetPassword(id: number, empNo: string) {
    const dialogRef = this.dialog.open(ResetPasswordComponent, {
      width: '450px',
      data: { id: id, empNo: empNo, paswordReset: true }
    });
    dialogRef.afterClosed().subscribe(() => {});
  }

  setCurrentUser(user: any): void {
    if (user && user.token) {
      localStorage.setItem('token', JSON.stringify(user.token));
    }
  }

  showPassword: boolean = false;

  togglePasswordVisibility() {
    this.showPassword = !this.showPassword;
  }
}
