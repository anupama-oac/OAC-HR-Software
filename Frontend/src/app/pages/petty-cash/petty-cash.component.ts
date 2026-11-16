import { Component, OnInit, ViewChild, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatTableModule } from '@angular/material/table';
import { MatIconModule } from '@angular/material/icon';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatNativeDateModule } from '@angular/material/core';
import { MatPaginator, MatPaginatorModule, PageEvent } from '@angular/material/paginator';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatChipsModule } from '@angular/material/chips';
import { MatDividerModule } from '@angular/material/divider';
import { PettyCashService, PettyCashTransaction } from '../../services/petty-cash.service';
import { RoleService } from '../../services/role.service';
import { UsersService } from '../../services/users.service';
import { User } from '../../common/interfaces/users/user';

@Component({
  selector: 'app-petty-cash',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    MatCardModule,
    MatButtonModule,
    MatTableModule,
    MatIconModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatDatepickerModule,
    MatNativeDateModule,
    MatPaginatorModule,
    MatTooltipModule,
    MatSnackBarModule,
    MatChipsModule,
    MatDividerModule
  ],
  templateUrl: './petty-cash.component.html',
  styleUrls: ['./petty-cash.component.scss']
})
export class PettyCashComponent implements OnInit {
  private pettyCashService = inject(PettyCashService);
  private fb = inject(FormBuilder);
  private roleService = inject(RoleService);
  private usersService = inject(UsersService);
  private snackBar = inject(MatSnackBar);

  isSuperAdmin = false;
  usersList: User[] = [];
  userMap = new Map<number, User>();
  loggedInUserId!: number;

  // Master data
  allTransactions: PettyCashTransaction[] = [];
  filteredTransactions: PettyCashTransaction[] = [];
  pagedTransactions: PettyCashTransaction[] = [];

  // Metrics
  balance: number = 0;
  totalCredited: number = 0;
  totalDebited: number = 0;

  // Dynamically displayed metrics (adapts when employee filter is selected)
  displayedBalance: number = 0;
  displayedCredited: number = 0;
  displayedDebited: number = 0;
  displayedCount: number = 0;

  get selectedEmployeeName(): string {
    if (this.selectedEmployeeFilter === 'ALL') {
      return 'All Employees';
    }
    const user = this.userMap.get(this.selectedEmployeeFilter as number);
    return user ? user.name : `Employee #${this.selectedEmployeeFilter}`;
  }

  // Filtering & Pagination
  searchTerm: string = '';
  selectedEmployeeFilter: number | 'ALL' = 'ALL';
  selectedTypeFilter: 'ALL' | 'CREDIT' | 'DEBIT' = 'ALL';

  pageSize = 10;
  currentPage = 1;
  totalItems = 0;

  displayedColumns: string[] = ['transactionDate', 'user', 'type', 'amount', 'description', 'actions'];

  currentView: 'dashboard' | 'add' = 'dashboard';
  transactionForm!: FormGroup;
  editingTransactionId: number | null = null;
  isSubmitting = false;

  // Employee-specific balance for live debit warning
  selectedEmployeeBalance: number = 0;

  ngOnInit() {
    this.initForm();
    this.checkUserRole();
  }

  checkUserRole() {
    const token: any = localStorage.getItem('token');
    if (token) {
      const user = JSON.parse(token);
      this.loggedInUserId = user.id;
      this.roleService.getRoleById(user.role).subscribe(role => {
        const rLower = (role?.roleName || '').toLowerCase().trim();
        const dLower = (user?.designationName || '').toLowerCase().trim();
        const isSuper = rLower === 'super administrator' || rLower === 'administrator' || rLower === 'hr & administration manager' || dLower === 'hr & administration manager' || dLower === 'hr & admin manager';
        if (isSuper) {
          this.isSuperAdmin = true;
          this.loadUsersAndData();
          this.transactionForm.addControl('userId', this.fb.control(null, Validators.required));
        } else {
          this.isSuperAdmin = false;
          this.loadData();
        }
      });
    }
  }

  loadUsersAndData() {
    this.usersService.getUser('', 1, 1000).subscribe((res: any) => {
      this.usersList = res.items ? res.items : res;
      this.usersList.forEach(u => this.userMap.set(u.id, u));
      this.loadData();
    });
  }

  initForm() {
    this.transactionForm = this.fb.group({
      transactionType: ['CREDIT', Validators.required],
      amount: [null, [Validators.required, Validators.min(0.01)]],
      description: ['', Validators.required],
      transactionDate: [new Date(), Validators.required]
    });

    // Listen to userId and type changes to compute selected employee's balance
    this.transactionForm.valueChanges.subscribe(() => {
      this.checkSelectedEmployeeBalance();
    });
  }

  checkSelectedEmployeeBalance() {
    const targetUserId = this.isSuperAdmin 
      ? this.transactionForm.get('userId')?.value 
      : this.loggedInUserId;

    if (!targetUserId) {
      this.selectedEmployeeBalance = 0;
      return;
    }

    const userTxs = this.allTransactions.filter(t => t.userId === targetUserId);
    const credits = userTxs.filter(t => t.transactionType === 'CREDIT').reduce((s, t) => s + (t.amount || 0), 0);
    const debits = userTxs.filter(t => t.transactionType === 'DEBIT').reduce((s, t) => s + (t.amount || 0), 0);
    this.selectedEmployeeBalance = credits - debits;
  }

  loadData() {
    // If not superadmin, load specifically for the logged in user
    if (!this.isSuperAdmin && this.loggedInUserId) {
      this.pettyCashService.getByUserId(this.loggedInUserId).subscribe(res => {
        if (res.success) {
          this.allTransactions = res.data.transactions || [];
          this.balance = res.data.balance || 0;
          this.enrichTransactions();
          this.applyFilters();
        }
      });
    } else {
      this.pettyCashService.getTransactions().subscribe(res => {
        if (res.success) {
          this.allTransactions = res.data || [];
          this.enrichTransactions();
          this.calculateMetrics();
          this.applyFilters();
        }
      });
    }
  }

  enrichTransactions() {
    this.allTransactions.forEach(t => {
      const uId = t.userId || t.recordedBy;
      if (uId && this.userMap.has(uId)) {
        t.user = this.userMap.get(uId);
      } else if (uId && !t.user) {
        this.usersService.getUserById(uId).subscribe({
          next: user => {
            t.user = user;
            if (user?.id) this.userMap.set(user.id, user);
          },
          error: () => {
            t.user = { name: `User #${uId}`, empNo: '-' };
          }
        });
      }
    });
  }

  calculateMetrics() {
    let targetTransactions = this.allTransactions;

    if (this.selectedEmployeeFilter !== 'ALL') {
      targetTransactions = this.allTransactions.filter(t => t.userId === this.selectedEmployeeFilter);
    }

    let cred = 0;
    let deb = 0;
    targetTransactions.forEach(t => {
      if (t.transactionType === 'CREDIT') {
        cred += Number(t.amount) || 0;
      } else if (t.transactionType === 'DEBIT') {
        deb += Number(t.amount) || 0;
      }
    });

    this.displayedCredited = cred;
    this.displayedDebited = deb;
    this.displayedBalance = cred - deb;
    this.displayedCount = targetTransactions.length;

    // Calculate company-wide totals
    let totalCred = 0;
    let totalDeb = 0;
    this.allTransactions.forEach(t => {
      if (t.transactionType === 'CREDIT') {
        totalCred += Number(t.amount) || 0;
      } else if (t.transactionType === 'DEBIT') {
        totalDeb += Number(t.amount) || 0;
      }
    });
    this.totalCredited = totalCred;
    this.totalDebited = totalDeb;
    this.balance = totalCred - totalDeb;
  }

  applyFilters() {
    let list = [...this.allTransactions];

    // Filter by employee
    if (this.selectedEmployeeFilter !== 'ALL') {
      list = list.filter(t => t.userId === this.selectedEmployeeFilter);
    }

    // Filter by transaction type
    if (this.selectedTypeFilter !== 'ALL') {
      list = list.filter(t => t.transactionType === this.selectedTypeFilter);
    }

    // Filter by search term
    if (this.searchTerm && this.searchTerm.trim() !== '') {
      const q = this.searchTerm.trim().toLowerCase();
      list = list.filter(t => {
        const desc = (t.description || '').toLowerCase();
        const amt = (t.amount || '').toString();
        const uName = (t.user?.name || '').toLowerCase();
        const uEmp = (t.user?.empNo || '').toLowerCase();
        const date = (t.transactionDate || '').toLowerCase();
        return desc.includes(q) || amt.includes(q) || uName.includes(q) || uEmp.includes(q) || date.includes(q);
      });
    }

    this.filteredTransactions = list;
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

  onTypeFilterChange(type: 'ALL' | 'CREDIT' | 'DEBIT') {
    this.selectedTypeFilter = type;
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
    this.pagedTransactions = this.filteredTransactions.slice(startIndex, endIndex);
  }

  setView(view: 'dashboard' | 'add') {
    this.currentView = view;
    if (view === 'add') {
      this.editingTransactionId = null;
      this.transactionForm.reset({
        transactionType: 'CREDIT',
        transactionDate: new Date(),
        amount: null,
        description: '',
        userId: this.isSuperAdmin ? null : this.loggedInUserId
      });
      this.checkSelectedEmployeeBalance();
    }
  }

  setFormType(type: 'CREDIT' | 'DEBIT') {
    this.transactionForm.patchValue({ transactionType: type });
  }

  onSubmit() {
    if (this.transactionForm.invalid) return;

    this.isSubmitting = true;
    const formValue = this.transactionForm.value;
    const payload = {
      ...formValue,
      transactionDate: new Date(formValue.transactionDate).toISOString().split('T')[0]
    };

    if (!this.isSuperAdmin) {
      payload.userId = this.loggedInUserId;
    }

    if (this.editingTransactionId) {
      this.pettyCashService.updateTransaction(this.editingTransactionId, payload).subscribe({
        next: (res) => {
          this.isSubmitting = false;
          if (res.success) {
            this.snackBar.open('Transaction updated successfully', 'Close', { duration: 3000 });
            this.loadData();
            this.setView('dashboard');
          }
        },
        error: (err) => {
          this.isSubmitting = false;
          this.snackBar.open(err.error?.message || 'Failed to update transaction', 'Close', { duration: 3500 });
        }
      });
    } else {
      this.pettyCashService.addTransaction(payload).subscribe({
        next: (res) => {
          this.isSubmitting = false;
          if (res.success) {
            this.snackBar.open('Transaction recorded successfully', 'Close', { duration: 3000 });
            this.loadData();
            this.setView('dashboard');
          }
        },
        error: (err) => {
          this.isSubmitting = false;
          this.snackBar.open(err.error?.message || 'Failed to record transaction', 'Close', { duration: 3500 });
        }
      });
    }
  }

  editTransaction(transaction: PettyCashTransaction) {
    this.editingTransactionId = transaction.id || null;
    this.transactionForm.patchValue({
      transactionType: transaction.transactionType,
      amount: transaction.amount,
      description: transaction.description,
      transactionDate: new Date(transaction.transactionDate),
      userId: transaction.userId
    });
    this.currentView = 'add';
    this.checkSelectedEmployeeBalance();
  }

  deleteTransaction(id?: number) {
    if (!id) return;
    if (confirm('Are you sure you want to delete this petty cash transaction?')) {
      this.pettyCashService.deleteTransaction(id).subscribe({
        next: (res) => {
          if (res.success) {
            this.snackBar.open('Transaction deleted successfully', 'Close', { duration: 3000 });
            this.loadData();
          }
        },
        error: (err) => {
          this.snackBar.open(err.error?.message || 'Failed to delete transaction', 'Close', { duration: 3500 });
        }
      });
    }
  }

  getUserInitials(name?: string): string {
    if (!name) return 'U';
    const parts = name.trim().split(' ');
    if (parts.length >= 2) {
      return (parts[0][0] + parts[1][0]).toUpperCase();
    }
    return name.substring(0, 2).toUpperCase();
  }
}
