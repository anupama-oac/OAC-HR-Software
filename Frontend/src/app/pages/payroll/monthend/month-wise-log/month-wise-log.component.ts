/* eslint-disable @typescript-eslint/no-explicit-any */
import { CommonModule } from '@angular/common';
import { Component, inject, OnDestroy, OnInit, ViewChild } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatButtonToggleModule } from '@angular/material/button-toggle';
import { MatAccordion, MatExpansionModule } from '@angular/material/expansion';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatPaginator, MatPaginatorModule, PageEvent } from '@angular/material/paginator';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatTooltipModule } from '@angular/material/tooltip';
import { Router } from '@angular/router';
import { PayrollService } from '@services/payroll.service';
import { RoleService } from '@services/role.service';
import { UsersService } from '@services/users.service';
import { Subscription } from 'rxjs';

@Component({
  selector: 'app-month-wise-log',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatButtonModule,
    MatButtonToggleModule,
    MatFormFieldModule,
    MatInputModule,
    MatAccordion,
    MatExpansionModule,
    MatPaginatorModule,
    MatIconModule,
    MatTooltipModule,
    MatProgressSpinnerModule
  ],
  templateUrl: './month-wise-log.component.html',
  styleUrl: './month-wise-log.component.scss'
})
export class MonthWiseLogComponent implements OnInit, OnDestroy {
  // Navigation & Services
  private router = inject(Router);
  private roleService = inject(RoleService);
  private usersService = inject(UsersService);
  public payrollService = inject(PayrollService);

  // Subscriptions
  private roleSub!: Subscription;
  private userSub!: Subscription;
  private monthLogSub!: Subscription;
  private employeesSub!: Subscription;

  // View Mode: 'month' | 'employee'
  viewMode: 'month' | 'employee' = 'month';

  // Search
  searchQuery: string = '';

  // Auth & Roles
  isAdmin: boolean = false;
  admin: boolean = true;
  id: number = 0;
  currentUser: any = null;
  isLoading: boolean = false;

  // Month-Wise Cache & State
  groupedMonths: string[] = [];
  monthData: { [key: string]: any[] } = {};
  loadingMonths: { [key: string]: boolean } = {};

  // Employee-Wise Cache & State
  allEmployees: any[] = [];
  employeePayslips: { [userId: number]: any[] } = {};
  loadingEmployees: { [userId: number]: boolean } = {};

  // Non-Admin (Self) Payslips
  logs: any[] = [];
  totalItems: number = 0;
  pageSize: number = 20;
  currentPage: number = 1;

  @ViewChild(MatPaginator) paginator!: MatPaginator;

  ngOnInit(): void {
    const token: any = localStorage.getItem('token');
    if (token) {
      try {
        const user = JSON.parse(token);
        this.currentUser = user;
        this.getRoleById(user.role, user.id);
      } catch (err) {
        console.error('Failed to parse user session:', err);
      }
    }
  }

  ngOnDestroy(): void {
    this.userSub?.unsubscribe();
    this.monthLogSub?.unsubscribe();
    this.roleSub?.unsubscribe();
    this.employeesSub?.unsubscribe();
  }

  // --------------------------------------------------------------------------
  // Authorization & Initial Data Fetch
  // --------------------------------------------------------------------------
  getRoleById(roleId: number, userId: number): void {
    this.roleSub = this.roleService.getRoleById(roleId).subscribe(role => {
      const rLower = (role.roleName || '').toLowerCase().trim();
      if (rLower === 'super administrator' || rLower === 'hr administrator' || rLower === 'hr & administration manager') {
        this.isAdmin = true;
        this.admin = true;
        this.getMonthlyLog();
        this.loadAllEmployees();
      } else {
        this.getUserById(userId);
      }
    });
  }

  getUserById(userId: number): void {
    this.userSub = this.usersService.getUserById(userId).subscribe(user => {
      if (
        !user.userPosition ||
        (user.userPosition && user.userPosition.designation?.designationName !== 'FINANCE MANAGER' && (user.userPosition.designation?.designationName || '').toUpperCase() !== 'HR & ADMINISTRATION MANAGER')
      ) {
        this.admin = false;
        this.id = userId;
        this.getMonthlyLogByUser(userId);
      } else {
        this.isAdmin = true;
        this.admin = true;
        this.getMonthlyLog();
        this.loadAllEmployees();
      }
    });
  }

  // --------------------------------------------------------------------------
  // Month-Wise Mode Logic
  // --------------------------------------------------------------------------
  getMonthlyLog(): void {
    this.isLoading = true;
    this.payrollService.getMonthlyPayroll(undefined, this.currentPage, this.pageSize)
      .subscribe({
        next: (months: string[]) => {
          this.groupedMonths = months || [];
          this.isLoading = false;
          // Preload data for the first month if available
          if (this.groupedMonths.length > 0 && !this.monthData[this.groupedMonths[0]]) {
            this.loadMonthData(this.groupedMonths[0]);
          }
        },
        error: (err) => {
          console.error('Error fetching monthly payroll groups:', err);
          this.isLoading = false;
        }
      });
  }

  loadMonthData(month: string): void {
    if (this.monthData[month] && this.monthData[month].length > 0) {
      return; // Already cached
    }
    this.loadingMonths[month] = true;
    this.payrollService.getMonthlyPayroll(month, 1, 100).subscribe({
      next: (data: any) => {
        const items = data.items || (Array.isArray(data) ? data : []);
        this.monthData[month] = items;
        this.loadingMonths[month] = false;
      },
      error: (err) => {
        console.error(`Error loading data for ${month}:`, err);
        this.loadingMonths[month] = false;
      }
    });
  }

  getMonthTotal(month: string): number {
    const list = this.monthData[month];
    if (!list || !list.length) return 0;
    return list.reduce((acc, curr) => acc + (Number(curr.toPay) || 0), 0);
  }

  getMonthEmployeesCount(month: string): number {
    return this.monthData[month]?.length || 0;
  }

  getFilteredMonthRows(month: string): any[] {
    const rows = this.monthData[month] || [];
    if (!this.searchQuery || !this.searchQuery.trim()) {
      return rows;
    }
    const q = this.searchQuery.trim().toLowerCase();
    return rows.filter(r =>
      (r.user?.name || '').toLowerCase().includes(q) ||
      (r.user?.empNo || '').toLowerCase().includes(q)
    );
  }

  get filteredGroupedMonths(): string[] {
    if (!this.searchQuery || !this.searchQuery.trim()) {
      return this.groupedMonths;
    }
    const q = this.searchQuery.trim().toLowerCase();
    return this.groupedMonths.filter(month => {
      // Matches the month name itself OR matches an employee inside the cached month
      if (month.toLowerCase().includes(q)) return true;
      const rows = this.monthData[month];
      if (rows && rows.length) {
        return rows.some(r =>
          (r.user?.name || '').toLowerCase().includes(q) ||
          (r.user?.empNo || '').toLowerCase().includes(q)
        );
      }
      return false;
    });
  }

  // --------------------------------------------------------------------------
  // Employee-Wise Mode Logic
  // --------------------------------------------------------------------------
  loadAllEmployees(): void {
    this.employeesSub = this.usersService.getUser('', 1, 200).subscribe({
      next: (res: any) => {
        const users = res?.items || (Array.isArray(res) ? res : []);
        this.allEmployees = users;
      },
      error: (err) => {
        console.error('Failed to load active employees for payslip directory:', err);
      }
    });
  }

  loadEmployeePayslips(userId: number): void {
    if (this.employeePayslips[userId]) {
      return; // Already cached
    }
    this.loadingEmployees[userId] = true;
    this.payrollService.getMonthlyPayrollByUser(userId, undefined, 1, 50).subscribe({
      next: (res: any) => {
        const items = res?.items || (Array.isArray(res) ? res : []);
        this.employeePayslips[userId] = items;
        this.loadingEmployees[userId] = false;
      },
      error: (err) => {
        console.error(`Failed to load payslips for employee ${userId}:`, err);
        this.loadingEmployees[userId] = false;
      }
    });
  }

  getEmployeeTotalEarned(userId: number): number {
    const list = this.employeePayslips[userId];
    if (!list || !list.length) return 0;
    return list.reduce((acc, curr) => acc + (Number(curr.toPay) || 0), 0);
  }

  get filteredEmployees(): any[] {
    if (!this.searchQuery || !this.searchQuery.trim()) {
      return this.allEmployees;
    }
    const q = this.searchQuery.trim().toLowerCase();
    return this.allEmployees.filter(emp =>
      (emp.name || '').toLowerCase().includes(q) ||
      (emp.empNo || '').toLowerCase().includes(q) ||
      (emp.email || '').toLowerCase().includes(q) ||
      (emp.userPosition?.designation?.designationName || '').toLowerCase().includes(q) ||
      (emp.userPosition?.department || '').toLowerCase().includes(q)
    );
  }

  // --------------------------------------------------------------------------
  // Non-Admin (Self) Logic
  // --------------------------------------------------------------------------
  getMonthlyLogByUser(id: number): void {
    this.isLoading = true;
    this.monthLogSub = this.payrollService.getMonthlyPayrollByUser(id, this.searchQuery, this.currentPage, this.pageSize)
      .subscribe({
        next: (data: any) => {
          this.logs = data.items || (Array.isArray(data) ? data : []);
          this.totalItems = data.count || this.logs.length;
          this.isLoading = false;
        },
        error: (err) => {
          console.error('Error fetching employee payslips:', err);
          this.isLoading = false;
        }
      });
  }

  get myTotalEarnings(): number {
    if (!this.logs || !this.logs.length) return 0;
    return this.logs.reduce((acc, curr) => acc + (Number(curr.toPay) || 0), 0);
  }

  get latestPayslip(): any {
    return this.logs && this.logs.length ? this.logs[0] : null;
  }

  // --------------------------------------------------------------------------
  // Helpers & Navigation
  // --------------------------------------------------------------------------
  openPayroll(id: number): void {
    this.router.navigateByUrl('login/payroll/payslip/open/' + id);
  }

  getInitials(name: string): string {
    if (!name) return 'EMP';
    const parts = name.trim().split(/\s+/);
    if (parts.length >= 2) {
      return (parts[0][0] + parts[1][0]).toUpperCase();
    }
    return parts[0].substring(0, 2).toUpperCase();
  }

  onPageChange(event: PageEvent): void {
    this.currentPage = event.pageIndex + 1;
    this.pageSize = event.pageSize;
    if (this.admin) {
      this.getMonthlyLog();
    } else {
      this.getMonthlyLogByUser(this.id);
    }
  }

  clearSearch(): void {
    this.searchQuery = '';
    if (!this.admin) {
      this.getMonthlyLogByUser(this.id);
    }
  }
}
