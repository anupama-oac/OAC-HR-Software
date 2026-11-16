/* eslint-disable @typescript-eslint/no-explicit-any */
import { Component, inject, OnDestroy, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSelectModule } from '@angular/material/select';
import { MatSnackBar } from '@angular/material/snack-bar';
import { Subscription } from 'rxjs';
import { UsersService } from '@services/users.service';
import { NewLeaveService } from '@services/new-leave.service';

export type FilterTab = 'all' | 'selected' | 'unselected';

export interface GrantLeaveEmployee {
  id: number;
  name: string;
  empNo?: string;
  email?: string;
  userImage?: string;
  url?: string;
  role?: any;
  team?: any;
  userPosition?: any;
  director?: boolean;
}

export interface GrantLeaveResult {
  employees: GrantLeaveEmployee[];
  year: number;
  notificationFailures: number;
}

@Component({
  selector: 'app-grant-leave-dialog',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatFormFieldModule,
    MatInputModule,
    MatIconModule,
    MatButtonModule,
    MatCheckboxModule,
    MatTooltipModule,
    MatProgressSpinnerModule,
    MatSelectModule
  ],
  templateUrl: './grant-leave-dialog.component.html',
  styleUrl: './grant-leave-dialog.component.scss'
})
export class GrantLeaveDialogComponent implements OnInit, OnDestroy {
  private readonly usersService = inject(UsersService);
  private readonly leaveService = inject(NewLeaveService);
  private readonly snackBar = inject(MatSnackBar);
  private readonly router = inject(Router);

  public employees: GrantLeaveEmployee[] = [];
  public selectedIds: Set<number> = new Set<number>();
  public grantResult: GrantLeaveResult | null = null;

  public searchQuery: string = '';
  public activeFilterTab: FilterTab = 'all';
  public selectedDepartment: string = 'all';

  public readonly currentYear: number = new Date().getFullYear();
  public isLoading: boolean = true;
  public isSubmitting: boolean = false;
  public loadError: string = '';

  private employeeSub?: Subscription;
  private grantSub?: Subscription;
  private readonly grantedEmployeeIds = new Set<number>();

  ngOnInit(): void {
    this.loadEmployees();
  }

  ngOnDestroy(): void {
    this.employeeSub?.unsubscribe();
    this.grantSub?.unsubscribe();
  }

  private isSystemAdminAccount(u: any): boolean {
    if (!u) return true;
    const empNo = (u.empNo || '').trim().toUpperCase();
    const email = (u.email || '').trim().toLowerCase();
    const name = (u.name || '').trim().toLowerCase();
    if (empNo === 'SA001' || empNo === 'HR001' || empNo === 'QSA001') return true;
    if (email === 'admin@onboarddummy.com' || email === 'hr@onboarddummy.com' || email === 'qualityadmin@leedsaerospace.com') return true;
    if (
      !u.director &&
      (name === 'super administrator' ||
        name === 'hr administrator' ||
        name === 'administrator' ||
        name === 'quality super administrator' ||
        name === 'super admin' ||
        name === 'hr admin' ||
        name === 'approval admin')
    ) {
      return true;
    }
    return false;
  }

  public loadEmployees(): void {
    this.isLoading = true;
    this.loadError = '';

    this.employeeSub = this.usersService.getConfirmedEmployees().subscribe({
      next: (data: any) => {
        const raw = Array.isArray(data) ? data : (data?.items || []);
        const filtered = raw
          .filter((emp: any) => !this.isSystemAdminAccount(emp))
          .sort((a: any, b: any) => (a.name || '').localeCompare(b.name || ''));

        if (filtered.length > 0) {
          this.employees = filtered;
          this.isLoading = false;
        } else {
          // Fallback to all active non-separated users if confirmed endpoint returns empty
          this.usersService.getUser('', 1, 1000).subscribe({
            next: (res: any) => {
              const allUsers = Array.isArray(res) ? res : (res?.items || []);
              this.employees = allUsers
                .filter((emp: any) => !emp.separated && emp.status !== false && !this.isSystemAdminAccount(emp))
                .sort((a: any, b: any) => (a.name || '').localeCompare(b.name || ''));
              this.isLoading = false;
            },
            error: () => {
              this.employees = [];
              this.isLoading = false;
            }
          });
        }
      },
      error: (error) => {
        console.warn('Could not load confirmed employees, falling back to all active staff:', error);
        this.usersService.getUser('', 1, 1000).subscribe({
          next: (res: any) => {
            const allUsers = Array.isArray(res) ? res : (res?.items || []);
            this.employees = allUsers
              .filter((emp: any) => !emp.separated && emp.status !== false && !this.isSystemAdminAccount(emp))
              .sort((a: any, b: any) => (a.name || '').localeCompare(b.name || ''));
            this.isLoading = false;
          },
          error: (err2) => {
            console.error('Failed to load employees for leave grant:', err2);
            this.loadError = 'Could not load employees. Please try again.';
            this.isLoading = false;
          }
        });
      }
    });
  }

  public get departments(): string[] {
    const set = new Set<string>();
    this.employees.forEach((emp) => {
      const d = this.getEmployeeDept(emp);
      if (d) set.add(d);
    });
    return Array.from(set).sort();
  }

  public getEmployeeDept(emp: any): string {
    return (
      emp.team?.teamName ||
      emp.userPosition?.department ||
      emp.role?.department ||
      'General'
    );
  }

  public getEmployeeRole(emp: any): string {
    return (
      emp.userPosition?.designation?.designationName ||
      emp.role?.roleName ||
      (emp.director ? 'Director' : 'Employee')
    );
  }

  public get totalEmployeesCount(): number {
    return this.employees.length;
  }

  public get selectedCount(): number {
    return this.selectedIds.size;
  }

  public get unselectedCount(): number {
    return Math.max(0, this.employees.length - this.selectedCount);
  }

  public get filteredEmployees(): GrantLeaveEmployee[] {
    let list = this.employees;

    // 1. Department filter
    if (this.selectedDepartment && this.selectedDepartment !== 'all') {
      list = list.filter((emp) => this.getEmployeeDept(emp) === this.selectedDepartment);
    }

    // 2. Active filter tab
    if (this.activeFilterTab === 'selected') {
      list = list.filter((emp) => this.selectedIds.has(emp.id));
    } else if (this.activeFilterTab === 'unselected') {
      list = list.filter((emp) => !this.selectedIds.has(emp.id));
    }

    // 3. Search query
    const q = this.searchQuery.trim().toLowerCase();
    if (q) {
      list = list.filter((emp) => {
        const name = (emp.name || '').toLowerCase();
        const empNo = (emp.empNo || '').toLowerCase();
        const email = (emp.email || emp.userPosition?.officialMailId || '').toLowerCase();
        const role = this.getEmployeeRole(emp).toLowerCase();
        const dept = this.getEmployeeDept(emp).toLowerCase();
        return (
          name.includes(q) ||
          empNo.includes(q) ||
          email.includes(q) ||
          role.includes(q) ||
          dept.includes(q)
        );
      });
    }

    return list;
  }

  public isEmployeeSelected(userId: number): boolean {
    return this.selectedIds.has(userId);
  }

  public toggleEmployee(userId: number): void {
    if (this.selectedIds.has(userId)) {
      this.selectedIds.delete(userId);
    } else {
      this.selectedIds.add(userId);
    }
  }

  public selectAllFiltered(): void {
    this.filteredEmployees.forEach((emp) => this.selectedIds.add(emp.id));
  }

  public deselectAllFiltered(): void {
    this.filteredEmployees.forEach((emp) => this.selectedIds.delete(emp.id));
  }

  public get isAllFilteredSelected(): boolean {
    const list = this.filteredEmployees;
    return list.length > 0 && list.every((emp) => this.selectedIds.has(emp.id));
  }

  public clearSearch(): void {
    this.searchQuery = '';
  }

  public setFilterTab(tab: FilterTab): void {
    this.activeFilterTab = tab;
  }

  public backToLeaveTypes(): void {
    this.router.navigate(['/login/leave/leave-types']);
  }

  public grantMoreLeave(): void {
    this.grantResult = null;
    this.employees = this.employees.filter((emp) => !this.grantedEmployeeIds.has(emp.id));
    this.selectedIds.clear();
    this.searchQuery = '';
    this.activeFilterTab = 'all';
    this.selectedDepartment = 'all';
  }

  public grantLeave(): void {
    if (this.selectedCount === 0 || this.isSubmitting) {
      return;
    }

    const idsToGrant = Array.from(this.selectedIds);
    this.isSubmitting = true;

    const grantedEmployees = this.employees.filter((emp) => this.selectedIds.has(emp.id));

    this.grantSub = this.leaveService.grantLeaveToSelectedEmployees(idsToGrant).subscribe({
      next: (result) => {
        idsToGrant.forEach((id) => this.grantedEmployeeIds.add(id));
        this.grantResult = {
          employees: grantedEmployees,
          year: result?.year || this.currentYear,
          notificationFailures: result?.notificationFailures || 0
        };
        this.isSubmitting = false;
        this.snackBar.open(
          `Successfully granted 1 Sick Leave and 1 Casual Leave to ${idsToGrant.length} employee(s).`,
          'Close',
          { duration: 4500 }
        );
      },
      error: (error) => {
        console.error('Failed to grant leave to selected employees:', error);
        this.snackBar.open(
          error?.error?.message || 'Failed to grant leave to selected employees.',
          'Close',
          { duration: 4000 }
        );
        this.isSubmitting = false;
      }
    });
  }

  public getAvatarGradient(name?: string): string {
    const gradients = [
      'linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%)',
      'linear-gradient(135deg, #10b981 0%, #047857 100%)',
      'linear-gradient(135deg, #8b5cf6 0%, #6d28d9 100%)',
      'linear-gradient(135deg, #f59e0b 0%, #b45309 100%)',
      'linear-gradient(135deg, #ec4899 0%, #be185d 100%)',
      'linear-gradient(135deg, #06b6d4 0%, #0e7490 100%)'
    ];
    let hash = 0;
    const str = name || '';
    for (let i = 0; i < str.length; i++) {
      hash = str.charCodeAt(i) + ((hash << 5) - hash);
    }
    return gradients[Math.abs(hash) % gradients.length];
  }

  public getInitials(name?: string): string {
    if (!name) return 'EM';
    const parts = name.trim().split(/\s+/);
    if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
    return parts[0].substring(0, 2).toUpperCase();
  }
}
