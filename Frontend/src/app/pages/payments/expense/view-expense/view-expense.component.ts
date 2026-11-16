/* eslint-disable @typescript-eslint/no-explicit-any */
import { Component, inject, OnDestroy, OnInit, ViewChild } from '@angular/core';
import { MatCardModule } from '@angular/material/card';
import { MatPaginator, MatPaginatorModule, PageEvent } from '@angular/material/paginator';
import { MatToolbarModule } from '@angular/material/toolbar';
import { ExpensesService } from '@services/expenses.service';
import { Subscription } from 'rxjs';
import { Router, RouterModule } from '@angular/router';
import { VerificationDialogueComponent } from '../../view-approval/verification-dialogue/verification-dialogue.component';
import { MatDialog } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { CommonModule } from '@angular/common';
import { DeleteDialogueComponent } from '../../../../theme/components/delete-dialogue/delete-dialogue.component';
import { InvoiceService } from '@services/invoice.service';
import { UsersService } from '@services/users.service';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { ExpenseReceiptDialogComponent } from '../expense-receipt-dialog/expense-receipt-dialog.component';

@Component({
  selector: 'app-view-expense',
  standalone: true,
  imports: [MatCardModule, MatToolbarModule, MatPaginatorModule, RouterModule, CommonModule, MatIconModule, MatButtonModule, ExpenseReceiptDialogComponent],
  templateUrl: './view-expense.component.html',
  styleUrl: './view-expense.component.scss'
})
export class ViewExpenseComponent implements OnInit, OnDestroy{
  private invoiceService = inject(InvoiceService)
  userId: number;
  ngOnInit(): void {
    const token: any = localStorage.getItem('token')
    const user = JSON.parse(token)
    this.userId =  user.id

    this.getRoleById(user.role)
  }

  private usersService = inject(UsersService);
  roleSub!: Subscription;
  userSub?: Subscription;
  roleName: string = '';
  canViewAllExpenses: boolean = false;
  canManageExpense: boolean = false;
  isSuperAdmin: boolean = false;
  isFinanceManager: boolean = false;
  isOperationsManager: boolean = false;

  getRoleById(id: number){
    const token: any = localStorage.getItem('token');
    let tokenUser: any = null;
    if (token) {
      try {
        tokenUser = JSON.parse(token);
        // this.evaluatePermissions(tokenUser?.designationName, tokenUser);
      } catch (e) {}
    }

    this.roleSub = this.invoiceService.getRoleById(id).subscribe({
      next: (role) => {
        this.evaluatePermissions(role?.roleName, tokenUser);
        this.checkUserPosition(this.userId);
      },
      error: () => {
        this.checkUserPosition(this.userId);
      }
    });
  }

  private checkUserPosition(userId: number) {
    this.userSub?.unsubscribe();
    this.userSub = this.usersService.getUserById(userId).subscribe({
      next: (userObj: any) => {
        const desig = userObj?.userPosition?.designation?.designationName;
        this.evaluatePermissions(desig, userObj);
      },
      error: () => {
        this.getExpenses(this.userId);
      }
    });
  }

  private evaluatePermissions(roleName?: string, rawUser?: any) {
    console.log(roleName);
    
    const rLower = (roleName || '').toLowerCase().trim();
    const sysRole = (rawUser?.systemRoleName || '').toLowerCase().trim();
    console.log(rawUser);
    
    const isSuperOrAdmin =
      rawUser?.isSuperAdmin ||
      rawUser?.systemRoleId === 1 ||
      rLower === 'super administrator' ||
      rLower === 'administrator' ||
      rLower === 'super admin' ||
      rLower.includes('super admin') ||
      sysRole.includes('super admin');

    const isFinance =
      rLower === 'finance manager' ||
      rLower.includes('finance manager');

    const isOperations =
      rLower === 'operations manager' ||
      rLower === 'operation manager' ||
      rLower.includes('operations manager') ||
      rLower.includes('operation manager');

    this.isSuperAdmin = Boolean(isSuperOrAdmin);
    this.isFinanceManager = Boolean(isFinance);
    this.isOperationsManager = Boolean(isOperations);
    console.log(this.isSuperAdmin, this.isFinanceManager, this.isOperationsManager);
    
    if (isSuperOrAdmin) {
      this.roleName = 'Super Administrator';
      this.canViewAllExpenses = true;
      this.canManageExpense = true;
    } else if (isFinance) {
      this.roleName = 'FINANCE MANAGER';
      this.canViewAllExpenses = true;
      this.canManageExpense = true;
    } else if (isOperations) {
      this.roleName = 'OPERATIONS MANAGER';
      this.canViewAllExpenses = true;
      this.canManageExpense = false;
    } else {
      this.roleName = roleName || '';
      this.canViewAllExpenses = false;
      this.canManageExpense = false;
    }

    this.getExpenses(this.userId);
  }

  private expenseService = inject(ExpensesService);
  filterValue: string = '';
  allExpenses: any[] = [];
  expenses: any[] = [];
  expenseSub!: Subscription;

  applyFilter(event: Event): void {
    this.filterValue = (event.target as HTMLInputElement).value.trim();
    this.filterClientSide();
  }

  filterClientSide(): void {
    if (!this.filterValue) {
      this.expenses = [...this.allExpenses];
    } else {
      const q = this.filterValue.toLowerCase();
      this.expenses = this.allExpenses.filter(inv =>
        (inv.expenseNumber && inv.expenseNumber.toLowerCase().includes(q)) ||
        (inv.user?.name && inv.user.name.toLowerCase().includes(q)) ||
        (inv.paymentMode && inv.paymentMode.toLowerCase().includes(q)) ||
        (inv.description && inv.description.toLowerCase().includes(q)) ||
        (inv.notes && inv.notes.toLowerCase().includes(q)) ||
        (inv.status && inv.status.toLowerCase().includes(q)) ||
        (inv.amount && inv.amount.toString().includes(q))
      );
    }
    this.totalItems = this.expenses.length;
  }

  getStatusClass(status: string): string {
    if (!status) return 'status-default';
    const s = status.toLowerCase();
    if (s.includes('transferred') || s.includes('verified') || s.includes('approved')) return 'status-verified';
    if (s.includes('revert') || s.includes('rejected')) return 'status-rejected';
    if (s.includes('completed')) return 'status-completed';
    if (s.includes('generated') || s.includes('pending')) return 'status-generated';
    return 'status-default';
  }

  formatStatus(status: string): string {
    if (!status) return 'Pending';
    if (status === 'PaymentCompleted') return 'Payment Completed';
    if (status === 'FM Approved' || status === 'Amount Transferred') return 'Amount Transferred';
    if (status === 'FM Rejected' || status === 'Reverted to Employee') return 'Reverted to Employee';
    if (status === 'OM Approved') return 'Operations Approved (Transferred)';
    if (status === 'OM Rejected') return 'Operations Reverted';
    if (status === 'Pending FM Approval' || status === 'Pending Finance Approval') return 'Pending Finance Approval';
    if (status === 'Pending OM Approval' || status === 'Pending Operations Approval') return 'Pending Operations Approval';
    return status;
  }

  @ViewChild(MatPaginator) paginator!: MatPaginator;
  pageSize = 10;
  currentPage = 1;
  totalItems = 0;
  onPageChange(event: PageEvent): void {
    this.currentPage = event.pageIndex + 1;
    this.pageSize = event.pageSize;
    this.getExpenses(this.userId);
  }

  data: any;
  isFlow: boolean = false;
  loadData(data: any, tabIndex: number) {
    this.isFlow = true;
    if (!data) {
      alert("No data available for this tab.");
      return;
    }
    this.invoiceService.setState('tabIndex', {
      tabIndex: tabIndex
    });
    this.data = data;
    this.getExpenses(this.userId);
  }

  getExpenses(userId: number){
    console.log(this.canViewAllExpenses);
    
    const fetchObservable = this.canViewAllExpenses 
      ? this.expenseService.getExpense() 
      : this.expenseService.getExpenseByUser(this.filterValue, this.currentPage, this.pageSize, this.isFlow);

    this.roleSub?.unsubscribe();
    this.userSub?.unsubscribe();
    this.expenseSub?.unsubscribe();
    this.expenseSub = fetchObservable.subscribe({
      next: (expenses: any) => {
        let dataList: any[] = expenses?.data || (Array.isArray(expenses) ? expenses : []);
        
        // Safety guard: For all other users, ensure only their own expenses are displayed
        if (!this.canViewAllExpenses && this.userId) {
          dataList = dataList.filter((e: any) => Number(e.userId) === Number(this.userId));
        }

        this.allExpenses = [...dataList];
        this.totalItems = expenses.count || dataList.length;

        if (this.filterValue) {
          this.filterClientSide();
        } else {
          this.expenses = [...this.allExpenses];
        }

      if (this.expenses) {
        this.expenses = [...this.expenses];
        for (let i = 0; i < this.expenses.length; i++) {
          const exp = this.expenses[i];
          const invoiceUser = exp?.userId;
          const invoiceAM = exp?.amId;
          const invoiceMA = exp?.accountantId;

          const modeLower = (exp.paymentMode || '').toLowerCase().trim();
          const isCard = modeLower === 'card';
          const isPettyCash = modeLower === 'petty cash' || modeLower === 'pettycash';

          const s = (exp.status || '').toLowerCase();
          const isPending = s.includes('pending') || s === 'generated';

          let canApprove = false;
          if (isPending) {
            if (this.isSuperAdmin) {
              canApprove = true;
            } else if (isCard && this.isOperationsManager) {
              canApprove = true;
            } else if (!isCard && !isPettyCash && this.isFinanceManager) {
              canApprove = true;
            }
          }

          if (this.canManageExpense) {
            this.expenses[i] = {
              ...this.expenses[i],
              canApprove,
              editButtonStatus: true
            };
          } else if (userId === invoiceUser || userId === invoiceAM || userId === invoiceMA) {
            this.expenses[i] = {
              ...this.expenses[i],
              canApprove,
              userStatus: true
            };
          } else {
            this.expenses[i] = {
              ...this.expenses[i],
              canApprove
            };
          }

          if (this.expenses[i].userId === userId) {
            const userRoleName = this.expenses[i]?.user?.role?.roleName;
            if (this.canManageExpense) {
              this.expenses[i] = {
                ...this.expenses[i],
                editButtonStatus: true
              };
            } else if (userRoleName != 'Manager' &&
              (this.expenses[i].status === 'Generated' || this.expenses[i].status === 'AM Rejected')) {
                this.expenses[i] = {
                  ...this.expenses[i],
                  editButtonStatus: true
                };
            } else if (userRoleName === 'Manager' &&
              (this.expenses[i].status === 'AM Verified')) {
                this.expenses[i] = {
                  ...this.expenses[i],
                  editButtonStatus: true
                };
            } else if (!this.canManageExpense) {
              this.expenses[i] = {
                ...this.expenses[i],
                editButtonStatus: false
              };
            }
          }
        }
      }
    },
    error: (err) => {
      console.warn('Could not load expenses:', err);
    }
  });
  }

  verifiedSub: Subscription;
  dialogSub!: Subscription;
  private dialog = inject(MatDialog);
  private snackBar = inject(MatSnackBar);
  private router = inject(Router);
  verified(value: string, piNo: string, sp: string, id: number, stat: string, invoice?: any){
    const modeLower = (invoice?.paymentMode || '').toLowerCase().trim();
    const isCard = modeLower === 'card';

    let targetStatus = stat;
    if (value === 'approved') {
      targetStatus = isCard ? 'OM Approved' : 'FM Approved';
    } else if (value === 'rejected') {
      targetStatus = isCard ? 'OM Rejected' : 'FM Rejected';
    }

    const dialogRef = this.dialog.open(VerificationDialogueComponent, {
      data: { invoiceNo: piNo, status: targetStatus, sp: sp }
    });

    this.dialogSub = dialogRef.afterClosed().subscribe(result => {
      if(result){
        const data = {
          status: targetStatus,
          value: value,
          expenseId: id,
          remarks: result.remarks,
          accountantId: result.accountantId
        };

        this.verifiedSub = this.expenseService.updateStatus(data).subscribe(() => {
          this.getExpenses(this.userId);
          this.snackBar.open(`Expense ${piNo}: ${this.formatStatus(targetStatus)}!`, "", { duration: 3000 });
        });
      }
    });
  }

  addBankSlip(piNo: string, id: number, status: string){
    const dialogRef = this.dialog.open(ExpenseReceiptDialogComponent, {
      data: { invoiceNo: piNo, id: id, status: status }
    });

    this.dialogSub = dialogRef.afterClosed().subscribe(result => {
      if(result){
        this.getExpenses(this.userId);
        this.snackBar.open(`BankSlip is attached with Invoice ${piNo} ...`,"" ,{duration:3000})
      }
    })
  }

  ngOnDestroy(): void {
    this.expenseSub?.unsubscribe();
    this.deleteSub?.unsubscribe();
    this.dialogSub?.unsubscribe();
  }

  deleteSub!: Subscription;
  deleteFunction(id: number){
    const dialogRef = this.dialog.open(DeleteDialogueComponent, {
      width: '320px',
      data: {}
    });

    this.dialogSub = dialogRef.afterClosed().subscribe((result) => {
      if (result === true) {
        this.deleteSub = this.expenseService.deleteExpense(id).subscribe(()=>{
          this.snackBar.open("Expense deleted successfully...","" ,{duration:3000})
          this.getExpenses(this.userId)
        },(error=>{

          this.snackBar.open(error.error.message,"" ,{duration:3000})
        }))
      }
    });
  }
}
