import { Component, inject, OnDestroy, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { UsersService } from '@services/users.service';
import { Subscription } from 'rxjs';
import { MatIconModule } from '@angular/material/icon';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { FormsModule } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatButtonModule } from '@angular/material/button';
import { MatInputModule } from '@angular/material/input';
import { MatTooltipModule } from '@angular/material/tooltip';
import { Router } from '@angular/router';
import { User } from '../../../common/interfaces/users/user';
import { SearchFilterPipe } from '../../../common/pipes/search-filter.pipe';
import { UserLeaveComponent } from '../../leave/user-leave/user-leave.component';
import { ConfirmationDialogComponent } from '../confirmation-dialog/confirmation-dialog.component';
import { environment } from '../../../../environments/environment';

@Component({
  selector: 'app-confirmation',
  standalone: true,
  imports: [
    CommonModule,
    MatIconModule,
    FormsModule,
    MatFormFieldModule,
    MatButtonModule,
    MatInputModule,
    MatTooltipModule,
    MatDialogModule,
    SearchFilterPipe
  ],
  templateUrl: './confirmation.component.html',
  styleUrl: './confirmation.component.scss'
})
export class ConfirmationComponent implements OnInit, OnDestroy {
  selectedEmployeeId: number | null = null;
  note: string = '';

  probationSearch: string = '';
  permanentSearch: string = '';

  probEmp: User[] = [];
  permanentEmp: User[] = [];

  private router = inject(Router);
  private userService = inject(UsersService);
  private snackBar = inject(MatSnackBar);
  private dialog = inject(MatDialog);

  private probStaffSub?: Subscription;
  private permanentStaffSub?: Subscription;
  private confirmSub?: Subscription;
  private dialogSub?: Subscription;

  private probLoaded = false;
  private permLoaded = false;

  ngOnInit(): void {
    this.refreshData();
  }

  refreshData(): void {
    this.probLoaded = false;
    this.permLoaded = false;
    this.getProbationEmployees();
    this.getPermanentEmployees();
  }

  private isSystemAdminAccount(emp: any): boolean {
    if (!emp) return true;
    const empNo = (emp.empNo || '').trim().toUpperCase();
    const email = (emp.email || '').trim().toLowerCase();
    const name = (emp.name || '').trim().toLowerCase();
    if (empNo === 'SA001' || empNo === 'HR001' || empNo === 'QSA001') return true;
    if (email === 'admin@onboarddummy.com' || email === 'hr@onboarddummy.com' || email === 'qualityadmin@leedsaerospace.com') return true;
    if (
      !emp.director &&
      (name === 'super administrator' ||
        name === 'hr administrator' ||
        name === 'administrator' ||
        name === 'quality super administrator' ||
        name === 'super admin' ||
        name === 'hr admin')
    ) {
      return true;
    }
    return false;
  }

  getEmployeeRoleLabel(emp: any): string {
    const desig = emp?.userPosition?.designation?.designationName;
    if (desig) return desig;
    const roleName = emp?.role?.roleName;
    if (
      roleName &&
      roleName !== 'Super Administrator' &&
      roleName !== 'HR Administrator' &&
      roleName !== 'Administrator' &&
      roleName !== 'Quality Super Administrator'
    ) {
      return roleName;
    }
    if (emp?.director) return 'Director';
    if (emp?.userPosition?.department) return emp.userPosition.department;
    return 'Employee';
  }

  getProbationEmployees(): void {
    this.probStaffSub?.unsubscribe();
    this.probStaffSub = this.userService.getProbationEmployees().subscribe({
      next: (data: any) => {
        const list = Array.isArray(data) ? data : (data?.items || []);
        this.probEmp = list.filter((emp: User) => !this.isSystemAdminAccount(emp));
        this.probLoaded = true;
        this.checkFallbackFromAllUsers();
      },
      error: (err) => {
        console.error('Error fetching probation employees:', err);
        this.probLoaded = true;
        this.checkFallbackFromAllUsers();
      }
    });
  }

  getPermanentEmployees(): void {
    this.permanentStaffSub?.unsubscribe();
    this.permanentStaffSub = this.userService.getConfirmedEmployees().subscribe({
      next: (data: any) => {
        const list = Array.isArray(data) ? data : (data?.items || []);
        this.permanentEmp = list.filter((emp: User) => !this.isSystemAdminAccount(emp));
        this.permLoaded = true;
        this.checkFallbackFromAllUsers();
      },
      error: (err) => {
        console.error('Error fetching permanent employees:', err);
        this.permLoaded = true;
        this.checkFallbackFromAllUsers();
      }
    });
  }

  private checkFallbackFromAllUsers(): void {
    if (!this.probLoaded || !this.permLoaded) return;
    if (this.probEmp.length > 0 || this.permanentEmp.length > 0) return;

    this.userService.getUser('', 1, 1000).subscribe({
      next: (res: any) => {
        const allUsers: User[] = Array.isArray(res) ? res : (res?.items || []);
        const valid = allUsers.filter(u => !u.separated && u.status !== false && !this.isSystemAdminAccount(u));
        if (valid.length > 0) {
          this.probEmp = valid.filter(u => Boolean(u.isTemporary));
          this.permanentEmp = valid.filter(u => !u.isTemporary);
        }
      },
      error: () => {}
    });
  }

  get filteredProbEmp(): User[] {
    if (!this.probationSearch.trim()) return this.probEmp;
    const q = this.probationSearch.trim().toLowerCase();
    return this.probEmp.filter(u =>
      (u.name && u.name.toLowerCase().includes(q)) ||
      (u.empNo && u.empNo.toLowerCase().includes(q)) ||
      (u.email && u.email.toLowerCase().includes(q)) ||
      this.getEmployeeRoleLabel(u).toLowerCase().includes(q)
    );
  }

  get filteredPermanentEmp(): User[] {
    if (!this.permanentSearch.trim()) return this.permanentEmp;
    const q = this.permanentSearch.trim().toLowerCase();
    return this.permanentEmp.filter(u =>
      (u.name && u.name.toLowerCase().includes(q)) ||
      (u.empNo && u.empNo.toLowerCase().includes(q)) ||
      (u.email && u.email.toLowerCase().includes(q)) ||
      this.getEmployeeRoleLabel(u).toLowerCase().includes(q)
    );
  }

  onConfirmClick(id: number): void {
    this.selectedEmployeeId = id;
    this.note = '';
  }

  cancelNote(): void {
    this.selectedEmployeeId = null;
    this.note = '';
  }

  confirmEmployee(id: number, name: string, note: string): void {
    this.confirmSub?.unsubscribe();
    this.confirmSub = this.userService.confirmEmployee(id, note, 'confirmation').subscribe({
      next: (res) => {
        this.snackBar.open(`${name}: ${res?.message || 'Employee confirmed successfully'}`, 'Close', { duration: 3200 });
        this.cancelNote();
        this.refreshData();
      },
      error: (err) => {
        this.snackBar.open(err.error?.message || 'Confirmation failed', 'Close', { duration: 3200 });
      }
    });
  }

  openConfirmationDialog(emp: User, defaultTarget: 'probation' | 'confirmation'): void {
    const dialogRef = this.dialog.open(ConfirmationDialogComponent, {
      width: '540px',
      maxWidth: '95vw',
      data: {
        id: emp.id,
        empNo: emp.empNo,
        name: emp.name,
        isTemporary: emp.isTemporary,
        defaultTarget: defaultTarget
      }
    });

    this.dialogSub?.unsubscribe();
    this.dialogSub = dialogRef.afterClosed().subscribe((res) => {
      if (res?.confirmed) {
        this.userService.confirmEmployee(emp.id, res.note, res.targetStatus).subscribe({
          next: (x) => {
            this.snackBar.open(`${emp.name}: ${x?.message || 'Status updated successfully'}`, 'Close', { duration: 3500 });
            this.cancelNote();
            this.refreshData();
          },
          error: (err) => {
            console.error('Failed to update status:', err);
            this.snackBar.open(err.error?.message || 'Failed to update employment status', 'Close', { duration: 3500 });
          }
        });
      }
    });
  }

  updateUserLeave(id: number, name: string): void {
    const dialogRef = this.dialog.open(UserLeaveComponent, {
      width: '520px',
      maxWidth: '95vw',
      data: { id: id, name: name }
    });
    this.dialogSub?.unsubscribe();
    this.dialogSub = dialogRef.afterClosed().subscribe(() => {});
  }

  viewEmployee(id: number): void {
    this.router.navigate(['/login/users/view/' + id]);
  }

  getUserImageUrl(url?: string): string {
    if (!url) return 'img/users/default-user.jpg';
    if (url.startsWith('http://') || url.startsWith('https://')) return url;
    return `${environment.s3Url || 'https://aerohr-uploads.s3.amazonaws.com/'}${url}`;
  }

  getInitials(name: string): string {
    if (!name) return 'EM';
    const parts = name.trim().split(/\s+/);
    if (parts.length >= 2) {
      return (parts[0][0] + parts[1][0]).toUpperCase();
    }
    return parts[0].substring(0, 2).toUpperCase();
  }

  ngOnDestroy(): void {
    this.confirmSub?.unsubscribe();
    this.permanentStaffSub?.unsubscribe();
    this.probStaffSub?.unsubscribe();
    this.dialogSub?.unsubscribe();
  }
}
