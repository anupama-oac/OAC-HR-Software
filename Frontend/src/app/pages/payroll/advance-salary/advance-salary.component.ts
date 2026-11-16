/* eslint-disable @typescript-eslint/no-explicit-any */
import { CommonModule } from '@angular/common';
import { Component, inject, OnDestroy, OnInit, ViewEncapsulation } from '@angular/core';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatPaginatorModule, PageEvent } from '@angular/material/paginator';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatChipsModule } from '@angular/material/chips';
import { MatDividerModule } from '@angular/material/divider';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { Router } from '@angular/router';
import { Subscription } from 'rxjs';

import { UsersService } from '@services/users.service';
import { RoleService } from '@services/role.service';
import { PayrollService } from '@services/payroll.service';
import { AdvanceSalary } from '../../../common/interfaces/payRoll/advanceSalary';
import { User } from '../../../common/interfaces/users/user';
import { AddAdvanceSalaryComponent } from './add-advance-salary/add-advance-salary.component';
import { CloseAdvanceComponent } from './close-advance/close-advance.component';
import { DeleteDialogueComponent } from '../../../theme/components/delete-dialogue/delete-dialogue.component';

@Component({
  selector: 'app-advance-salary',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatSlideToggleModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatPaginatorModule,
    MatTooltipModule,
    MatSnackBarModule,
    MatChipsModule,
    MatDividerModule,
    MatProgressBarModule,
    MatDialogModule
  ],
  templateUrl: './advance-salary.component.html',
  styleUrl: './advance-salary.component.scss',
  encapsulation: ViewEncapsulation.None,
  providers: [UsersService]
})
export class AdvanceSalaryComponent implements OnInit, OnDestroy {
  private roleService = inject(RoleService);
  private usersService = inject(UsersService);
  private payrollService = inject(PayrollService);
  private dialog = inject(MatDialog);
  private router = inject(Router);
  private snackBar = inject(MatSnackBar);

  // Authentication & Role
  admin: boolean = true;
  get isAdmin(): boolean {
    return this.admin;
  }
  loggedInUserId: number = 0;

  // Master Data & Users
  usersList: User[] = [];
  userMap = new Map<number, User>();
  allAdvanceSalaries: AdvanceSalary[] = [];
  filteredSalaries: AdvanceSalary[] = [];
  pagedSalaries: AdvanceSalary[] = [];

  // Summary KPI Metrics
  totalActiveAmount: number = 0;
  totalRecoveredAmount: number = 0;
  totalOutstandingBalance: number = 0;
  totalActiveCount: number = 0;

  displayedActiveAmount: number = 0;
  displayedRecoveredAmount: number = 0;
  displayedOutstandingBalance: number = 0;
  displayedActiveCount: number = 0;
  displayedTotalCount: number = 0;

  // Search & Filtering
  searchTerm: string = '';
  selectedEmployeeFilter: number | 'ALL' = 'ALL';
  selectedStatusFilter: 'ACTIVE' | 'CLOSED' | 'ALL' = 'ACTIVE';
  selectedSchemeFilter: 'ALL' | 'OneTime' | 'Monthly' = 'ALL';

  // Pagination
  pageSize: number = 10;
  currentPage: number = 1;
  totalItems: number = 0;

  // Subscriptions
  private roleSub?: Subscription;
  private userSub?: Subscription;
  private usersListSub?: Subscription;
  private salarySub?: Subscription;
  private salaryUserSub?: Subscription;
  private dialogSub?: Subscription;
  private deleteSub?: Subscription;

  get selectedEmployeeName(): string {
    if (this.selectedEmployeeFilter === 'ALL') {
      return 'All Employees';
    }
    const user = this.userMap.get(this.selectedEmployeeFilter as number);
    return user ? `${user.name} (${user.empNo || 'ID: ' + user.id})` : `Employee #${this.selectedEmployeeFilter}`;
  }

  ngOnInit() {
    const token: any = localStorage.getItem('token');
    if (token) {
      try {
        const user = JSON.parse(token);
        this.loggedInUserId = user.id;
        this.getRoleById(user.role, user.id);
      } catch (e) {
        console.error('Failed to parse auth token', e);
      }
    }
  }

  getRoleById(roleId: number, userId: number) {
    this.roleSub = this.roleService.getRoleById(roleId).subscribe({
      next: (role) => {
        const rLower = (role.roleName || '').toLowerCase().trim();
        if (rLower === 'super administrator' || rLower === 'administrator' || rLower === 'hr administrator' || rLower === 'hr & administration manager') {
          this.admin = true;
          this.loadUsersAndData();
        } else {
          this.checkFinanceManagerOrUser(userId);
        }
      },
      error: () => {
        this.checkFinanceManagerOrUser(userId);
      }
    });
  }

  checkFinanceManagerOrUser(userId: number) {
    this.userSub = this.usersService.getUserById(userId).subscribe({
      next: (user) => {
        const desig = (user.userPosition?.designation?.designationName || '').toUpperCase().trim();
        if (desig === 'FINANCE MANAGER' || desig === 'HR & ADMINISTRATION MANAGER' || desig.includes('HR & ADMINISTRATION MANAGER')) {
          this.admin = true;
          this.loadUsersAndData();
        } else {
          this.admin = false;
          this.loadUserData(userId);
        }
      },
      error: () => {
        this.admin = false;
        this.loadUserData(userId);
      }
    });
  }

  loadUsersAndData() {
    this.usersListSub = this.usersService.getUser('', 1, 1000).subscribe({
      next: (res: any) => {
        this.usersList = res.items ? res.items : (Array.isArray(res) ? res : []);
        this.usersList.forEach(u => {
          if (u.id) this.userMap.set(u.id, u);
        });
        this.loadAllData();
      },
      error: () => {
        this.loadAllData();
      }
    });
  }

  loadAllData() {
    this.salarySub = this.payrollService.getAdvanceSalary().subscribe({
      next: (data: AdvanceSalary[]) => {
        this.allAdvanceSalaries = Array.isArray(data) ? data : [];
        this.enrichData();
        this.calculateMetrics();
        this.applyFilters();
      },
      error: (err) => {
        console.error('Failed to fetch advance salaries', err);
        this.snackBar.open('Failed to load advance salary records', 'Close', { duration: 3000 });
      }
    });
  }

  loadUserData(userId: number) {
    this.salaryUserSub = this.payrollService.getAllAdvanceSalaryByUserId(userId).subscribe({
      next: (res: any) => {
        const items = res?.items ? res.items : (Array.isArray(res) ? res : []);
        this.allAdvanceSalaries = items;
        this.enrichData();
        this.calculateMetrics();
        this.applyFilters();
      },
      error: (err) => {
        console.error('Failed to fetch user advance salary', err);
        this.snackBar.open('Failed to load advance salary records', 'Close', { duration: 3000 });
      }
    });
  }

  enrichData() {
    this.allAdvanceSalaries.forEach(item => {
      const uId = item.userId;
      if (uId && this.userMap.has(uId)) {
        item.user = this.userMap.get(uId)!;
      } else if (uId && !item.user) {
        this.usersService.getUserById(uId).subscribe({
          next: user => {
            item.user = user;
            if (user?.id) this.userMap.set(user.id, user);
          },
          error: () => {
            item.user = { name: `User #${uId}`, empNo: '-' } as any;
          }
        });
      }
    });
  }

  calculateMetrics() {
    let target = this.allAdvanceSalaries;
    if (this.selectedEmployeeFilter !== 'ALL') {
      target = this.allAdvanceSalaries.filter(a => a.userId === this.selectedEmployeeFilter);
    }

    let activeAmt = 0;
    let recoveredAmt = 0;
    let outstandingBal = 0;
    let activeCnt = 0;

    target.forEach(item => {
      const amt = Number(item.amount) || 0;
      const monthly = Number(item.monthlyPay) || 0;
      const completed = Number(item.completed) || 0;

      if (item.status !== false) {
        // Active Advance
        activeCnt++;
        activeAmt += amt;
        const recovered = monthly * completed;
        recoveredAmt += recovered;
        const balance = Math.max(0, amt - recovered);
        outstandingBal += balance;
      } else {
        // Settled Advance
        recoveredAmt += amt;
      }
    });

    this.displayedActiveAmount = activeAmt;
    this.displayedRecoveredAmount = recoveredAmt;
    this.displayedOutstandingBalance = outstandingBal;
    this.displayedActiveCount = activeCnt;
    this.displayedTotalCount = target.length;

    // Company wide totals
    let allActiveAmt = 0;
    let allRecoveredAmt = 0;
    let allOutstandingBal = 0;
    let allActiveCnt = 0;

    this.allAdvanceSalaries.forEach(item => {
      const amt = Number(item.amount) || 0;
      const monthly = Number(item.monthlyPay) || 0;
      const completed = Number(item.completed) || 0;

      if (item.status !== false) {
        allActiveCnt++;
        allActiveAmt += amt;
        const recovered = monthly * completed;
        allRecoveredAmt += recovered;
        allOutstandingBal += Math.max(0, amt - recovered);
      } else {
        allRecoveredAmt += amt;
      }
    });

    this.totalActiveAmount = allActiveAmt;
    this.totalRecoveredAmount = allRecoveredAmt;
    this.totalOutstandingBalance = allOutstandingBal;
    this.totalActiveCount = allActiveCnt;
  }

  applyFilters() {
    let list = [...this.allAdvanceSalaries];

    // Status filter
    if (this.selectedStatusFilter === 'ACTIVE') {
      list = list.filter(item => item.status !== false);
    } else if (this.selectedStatusFilter === 'CLOSED') {
      list = list.filter(item => item.status === false);
    }

    // Employee filter
    if (this.selectedEmployeeFilter !== 'ALL') {
      list = list.filter(item => item.userId === this.selectedEmployeeFilter);
    }

    // Scheme filter
    if (this.selectedSchemeFilter !== 'ALL') {
      list = list.filter(item => item.scheme === this.selectedSchemeFilter);
    }

    // Search query
    if (this.searchTerm && this.searchTerm.trim() !== '') {
      const q = this.searchTerm.trim().toLowerCase();
      list = list.filter(item => {
        const userName = (item.user?.name || '').toLowerCase();
        const userEmp = (item.user?.empNo || '').toString().toLowerCase();
        const scheme = (item.scheme || '').toLowerCase();
        const amt = (item.amount || '').toString();
        const reason = (item.reason || '').toLowerCase();
        const closeNote = (item.closeNote || '').toLowerCase();
        const date = item.createdAt ? new Date(item.createdAt).toLocaleDateString().toLowerCase() : '';
        return userName.includes(q) || userEmp.includes(q) || scheme.includes(q) ||
               amt.includes(q) || reason.includes(q) || closeNote.includes(q) || date.includes(q);
      });
    }

    this.filteredSalaries = list;
    this.totalItems = list.length;
    this.updatePagedData();
  }

  onSearch(event: Event) {
    this.searchTerm = (event.target as HTMLInputElement).value;
    this.currentPage = 1;
    this.applyFilters();
  }

  clearSearch() {
    this.searchTerm = '';
    this.currentPage = 1;
    this.applyFilters();
  }

  onEmployeeFilterChange(value: number | 'ALL') {
    this.selectedEmployeeFilter = value;
    this.currentPage = 1;
    this.calculateMetrics();
    this.applyFilters();
  }

  onStatusFilterChange(status: 'ACTIVE' | 'CLOSED' | 'ALL') {
    this.selectedStatusFilter = status;
    this.currentPage = 1;
    this.applyFilters();
  }

  onSchemeFilterChange(scheme: 'ALL' | 'OneTime' | 'Monthly') {
    this.selectedSchemeFilter = scheme;
    this.currentPage = 1;
    this.applyFilters();
  }

  onPageChange(event: PageEvent) {
    this.currentPage = event.pageIndex + 1;
    this.pageSize = event.pageSize;
    this.updatePagedData();
  }

  updatePagedData() {
    const startIndex = (this.currentPage - 1) * this.pageSize;
    const endIndex = startIndex + this.pageSize;
    this.pagedSalaries = this.filteredSalaries.slice(startIndex, endIndex);
  }

  // Calculations & Formatters
  getBalance(item: AdvanceSalary): number {
    if (item.status === false) {
      return 0;
    }
    const amt = Number(item.amount) || 0;
    const monthly = Number(item.monthlyPay) || 0;
    const completed = Number(item.completed) || 0;
    return Math.max(0, amt - (monthly * completed));
  }

  getRecovered(item: AdvanceSalary): number {
    if (item.status === false) {
      return Number(item.amount) || 0;
    }
    const monthly = Number(item.monthlyPay) || 0;
    const completed = Number(item.completed) || 0;
    return monthly * completed;
  }

  getProgressPercent(item: AdvanceSalary): number {
    if (item.status === false) {
      return 100;
    }
    const duration = Number(item.duration) || 1;
    const completed = Number(item.completed) || 0;
    if (duration <= 0) return 0;
    const pct = Math.round((completed / duration) * 100);
    return Math.min(100, Math.max(0, pct));
  }

  getUserName(item: AdvanceSalary): string {
    if (item.user && item.user.name) return item.user.name;
    if (item.userId && this.userMap.has(item.userId)) {
      return this.userMap.get(item.userId)!.name;
    }
    return `Employee #${item.userId || 'N/A'}`;
  }

  getUserEmpNo(item: AdvanceSalary): string {
    if (item.user && item.user.empNo) return item.user.empNo;
    if (item.userId && this.userMap.has(item.userId)) {
      return this.userMap.get(item.userId)!.empNo || '-';
    }
    return '-';
  }

  getUserInitials(name?: string): string {
    if (!name) return 'EM';
    const parts = name.trim().split(' ').filter(p => p.length > 0);
    if (parts.length >= 2) {
      return (parts[0][0] + parts[1][0]).toUpperCase();
    }
    return name.substring(0, 2).toUpperCase();
  }

  getActiveCount(): number {
    return this.allAdvanceSalaries.filter(a => a.status !== false).length;
  }

  getClosedCount(): number {
    return this.allAdvanceSalaries.filter(a => a.status === false).length;
  }

  // Dialogs & Actions
  openAdvanceDialog(salary?: AdvanceSalary) {
    const dialogRef = this.dialog.open(AddAdvanceSalaryComponent, {
      data: { salary: salary },
      width: '600px',
      maxWidth: '95vw',
      panelClass: 'advance-salary-modal-dialog'
    });
    this.dialogSub = dialogRef.afterClosed().subscribe((result) => {
      if (result !== false) {
        if (this.admin) {
          this.loadAllData();
        } else {
          this.loadUserData(this.loggedInUserId);
        }
      }
    });
  }

  onCloseAdvance(id: number) {
    const dialogRef = this.dialog.open(CloseAdvanceComponent, {
      data: { id: id },
      width: '520px',
      maxWidth: '95vw',
      panelClass: 'advance-salary-modal-dialog'
    });
    this.dialogSub = dialogRef.afterClosed().subscribe((res) => {
      if (res !== false) {
        if (this.admin) {
          this.loadAllData();
        } else {
          this.loadUserData(this.loggedInUserId);
        }
      }
    });
  }

  onToggleChange(event: any, id: number) {
    this.onCloseAdvance(id);
  }

  deleteAdvanceSalary(id: number) {
    const dialogRef = this.dialog.open(DeleteDialogueComponent, {
      width: '400px'
    });
    this.dialogSub = dialogRef.afterClosed().subscribe(res => {
      if (res) {
        this.deleteSub = this.payrollService.deleteAdvanceSalary(id).subscribe({
          next: () => {
            this.snackBar.open('Advance Salary record deleted successfully', 'Close', { duration: 3000 });
            if (this.admin) {
              this.loadAllData();
            } else {
              this.loadUserData(this.loggedInUserId);
            }
          },
          error: (err) => {
            this.snackBar.open(err.error?.message || 'Failed to delete record', 'Close', { duration: 3500 });
          }
        });
      }
    });
  }

  deleteTeam(id: number) {
    this.deleteAdvanceSalary(id);
  }

  openAdvanceLog() {
    this.router.navigateByUrl('/login/payroll/advance-salary/viewlogs');
  }

  // Export filtered advances as CSV
  exportToCsv() {
    if (!this.filteredSalaries || this.filteredSalaries.length === 0) {
      this.snackBar.open('No records to export', 'Close', { duration: 2500 });
      return;
    }

    const headers = ['Employee Name', 'Emp No', 'Scheme', 'Amount', 'Duration (Months)', 'Completed (Months)', 'Balance Remaining', 'Status', 'Created Date', 'Reason', 'Close Note'];
    const rows = this.filteredSalaries.map(item => [
      `"${this.getUserName(item)}"`,
      `"${this.getUserEmpNo(item)}"`,
      `"${item.scheme}"`,
      item.amount,
      item.duration,
      item.completed,
      this.getBalance(item),
      item.status !== false ? 'Active' : 'Closed',
      item.createdAt ? new Date(item.createdAt).toLocaleDateString() : '',
      `"${(item.reason || '').replace(/"/g, '""')}"`,
      `"${(item.closeNote || '').replace(/"/g, '""')}"`
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `Advance_Salary_Export_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    this.snackBar.open('Export downloaded successfully', 'Close', { duration: 2500 });
  }

  // Legacy method for search compatibility
  public searchText!: string;
  search(event: Event) {
    this.onSearch(event);
  }

  public onPageChanged(event: any) {
    this.onPageChange(event);
  }

  public getAdvanceSalary(): void {
    this.loadAllData();
  }

  public getAdvanceSalaryByUserId(id: number): void {
    this.loadUserData(id);
  }

  ngOnDestroy(): void {
    this.roleSub?.unsubscribe();
    this.userSub?.unsubscribe();
    this.usersListSub?.unsubscribe();
    this.salarySub?.unsubscribe();
    this.salaryUserSub?.unsubscribe();
    this.dialogSub?.unsubscribe();
    this.deleteSub?.unsubscribe();
  }
}
