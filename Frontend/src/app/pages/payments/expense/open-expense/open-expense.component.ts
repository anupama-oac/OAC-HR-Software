import { CommonModule, DatePipe, UpperCasePipe } from '@angular/common';
import { Component, inject } from '@angular/core';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatTabsModule } from '@angular/material/tabs';
import { MatButtonModule } from '@angular/material/button';
import { MatTooltipModule } from '@angular/material/tooltip';
import { SafePipe } from "../../../../common/pipes/safe.pipe";
import { ExpensesService } from '@services/expenses.service';
import { ActivatedRoute, Router } from '@angular/router';
import { Subscription } from 'rxjs';
import { MatDialog } from '@angular/material/dialog';
import { VerificationDialogueComponent } from '../../view-approval/verification-dialogue/verification-dialogue.component';
import { MatSnackBar } from '@angular/material/snack-bar';
import { BankReceiptDialogueComponent } from '../../view-approval/bank-receipt-dialogue/bank-receipt-dialogue.component';
import { RoleService } from '@services/role.service';
import { UsersService } from '@services/users.service';

@Component({
  selector: 'app-open-expense',
  standalone: true,
  imports: [
    CommonModule,
    MatCardModule,
    UpperCasePipe,
    MatIconModule,
    MatTabsModule,
    MatButtonModule,
    MatTooltipModule,
    SafePipe,
    DatePipe
  ],
  templateUrl: './open-expense.component.html',
  styleUrl: './open-expense.component.scss'
})
export class OpenExpenseComponent {
  ngOnDestroy(): void {
    this.roleSub?.unsubscribe();
    this.userSub?.unsubscribe();
    this.piSub?.unsubscribe();
    this.dialogSub?.unsubscribe();
    this.verifiedSub?.unsubscribe();
    this.excelSub?.unsubscribe();
  }

  private expenseService = inject(ExpensesService)
  private snackBar = inject(MatSnackBar)
  private router = inject(Router)
  private route=inject(ActivatedRoute)
  private dialog=inject(MatDialog)
  private roleService = inject(RoleService);
  private usersService = inject(UsersService);
  userId: number;
  userSub?: Subscription;

  isSuperAdmin = false;
  isFinanceManager = false;
  isOperationsManager = false;
  designationName: string = '';

  private evaluatePermissions(roleName?: string, designationName?: string, rawUser?: any) {
    const rLower = (roleName || '').toLowerCase().trim();
    const dLower = (designationName || '').toLowerCase().trim();
    const sysRole = (rawUser?.systemRoleName || '').toLowerCase().trim();

    this.isSuperAdmin = Boolean(
      rawUser?.isSuperAdmin ||
      rawUser?.systemRoleId === 1 ||
      rLower === 'super administrator' ||
      rLower === 'administrator' ||
      rLower === 'super admin' ||
      rLower.includes('super admin') ||
      dLower.includes('super admin') ||
      sysRole.includes('super admin')
    );

    this.isFinanceManager =
      rLower === 'finance manager' ||
      rLower.includes('finance manager') ||
      dLower === 'finance manager' ||
      dLower.includes('finance manager');

    this.isOperationsManager =
      rLower === 'operations manager' ||
      rLower === 'operation manager' ||
      rLower.includes('operations manager') ||
      rLower.includes('operation manager') ||
      dLower === 'operations manager' ||
      dLower === 'operation manager' ||
      dLower.includes('operations manager') ||
      dLower.includes('operation manager');

    this.roleName = roleName || '';
    this.designationName = designationName || '';
  }

  formatNotes(notes: string): string {
    const urlRegex = /(https?:\/\/[^\s]+)/g; // Regex to match URLs
    return notes.replace(urlRegex, (url) => 
      `<a href="${url}" target="_blank" rel="noopener noreferrer">${url}</a>`
    );
  }
  
  formatRemarks(remarks: string | null | undefined): string {
    if (!remarks) return ''; // Handle null or undefined values gracefully
  
    const urlRegex = /(https?:\/\/[^\s]+)/g; // Regex to match URLs
    return remarks.replace(urlRegex, (url) => 
      `<a href="${url}" target="_blank" rel="noopener noreferrer">${url}</a>`
    );
  }
  
  ngOnInit(): void {
    let id = this.route.snapshot.params['id'];

    const token: any = localStorage.getItem('token');
    let user: any = null;
    if (token) {
      try {
        user = JSON.parse(token);
        this.evaluatePermissions(user?.roleName, user?.designationName, user);
      } catch (e) {}
    }
    this.userId = user?.id;

    if (user?.role) {
      this.getRoleById(user.role, id);
    } else {
      this.getPiById(id);
    }
  }

  roleSub!: Subscription;
  roleName!: string;
  sp: boolean = false;
  kam: boolean = false;
  am: boolean = false;
  ma: boolean = false;
  admin: boolean = false;
  teamLead: boolean = false;
  getRoleById(id: number, piId: number){
    this.roleSub = this.roleService.getRoleById(id).subscribe({
      next: (role) => {
        const token: any = localStorage.getItem('token');
        let tokenUser: any = null;
        if (token) {
          try { tokenUser = JSON.parse(token); } catch(e) {}
        }
        this.evaluatePermissions(role?.roleName, tokenUser?.designationName, tokenUser);
        this.getPiById(piId);
      },
      error: () => {
        this.getPiById(piId);
      }
    });
  }

  encodeUrl(url: string): string {
    return encodeURIComponent(url);
  }
  

  piSub!: Subscription;
  url!: string;
  piNo!: string;
  pi!: any;
  bankSlip!: string;
  signedUrl: any[];
  getPiById(id: number){
    this.piSub = this.expenseService.getExpenseById(id).subscribe({
      next: (pi: any) => {
        this.pi = pi.pi;
        const canViewAll = this.isSuperAdmin || this.isFinanceManager || this.isOperationsManager;
        if (!canViewAll && this.pi?.userId && Number(this.pi.userId) !== Number(this.userId)) {
          this.snackBar.open('You are only authorized to view expenses added by yourself.', 'Close', { duration: 3500 });
          this.router.navigateByUrl('login/viewApproval/viewexpenses');
          return;
        }

        this.piNo = pi.pi?.expenseNumber || `EXP-${id}`;
        const rawUrls = this.pi?.url || [];
        const signedUrlsWithType = (Array.isArray(rawUrls) ? rawUrls : [rawUrls]).map((urlObj: any) => {
          let urlStr = typeof urlObj === 'object' && urlObj.url ? urlObj.url : urlObj;
          while (urlStr && typeof urlStr === 'object' && urlStr.url) {
            urlStr = urlStr.url;
          }
          const remarksStr = typeof urlObj === 'object' && urlObj.remarks ? urlObj.remarks : '';
          const cleanStr = typeof urlStr === 'string' ? urlStr.split('?')[0].toLowerCase() : '';
          const fileType = cleanStr ? (cleanStr.split('.').pop() || '') : ''; 
          return {
            url: typeof urlStr === 'string' ? urlStr : '',
            type: fileType,
            remarks: remarksStr 
          };
        }).filter((u: any) => Boolean(u.url));
        
        this.signedUrl = signedUrlsWithType;
        
        const modeLower = (this.pi?.paymentMode || '').toLowerCase().trim();
        const isCard = modeLower === 'card';
        const isPettyCash = modeLower === 'petty cash' || modeLower === 'pettycash';

        const s = (this.pi?.status || '').toLowerCase();
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

        this.pi = {
          ...this.pi,
          approveButtonStatus: canApprove
        };
        
        if(pi.pi?.bankSlip != null) this.bankSlip = pi.bankSlip;

        this.getPiStatusByPiId(id);
      },
      error: (err) => {
        this.snackBar.open(err.error?.message || 'Error fetching expense details', 'Close', { duration: 3500 });
        this.router.navigateByUrl('login/viewApproval/viewexpenses');
      }
    });
  }

  goBack(): void {
    this.router.navigateByUrl('login/viewApproval/viewexpenses');
  }

  openDocumentInNewTab(url?: string): void {
    if (url) {
      window.open(url, '_blank');
    }
  }

  isImageFile(type?: string): boolean {
    return ['jpg', 'jpeg', 'png', 'gif', 'webp'].includes((type || '').toLowerCase());
  }

  getPaymentModeIcon(mode?: string): string {
    const m = (mode || '').toLowerCase();
    if (m.includes('card')) return 'credit_card';
    if (m.includes('bank') || m.includes('transfer')) return 'account_balance';
    if (m.includes('petty')) return 'savings';
    return 'payments';
  }
  filterValue: string
  // statusSub!: Subscription;
  // status: PerformaInvoiceStatus[] = [];
  getPiStatusByPiId(id: number){
    // this.statusSub = this.invoiceService.getPIStatusByPIId(id, this.filterValue).subscribe(status => {
    //   this.status = status;
    // });
  }

  applyFilter(event: Event): void {
    this.filterValue = (event.target as HTMLInputElement).value.trim()
    this.getPiById(this.route.snapshot.params['id'])
  }

  verifiedSub: Subscription;
  dialogSub!: Subscription;
  verified(value: string, piNo: string, sp: string, id: number, stat: string){
    const modeLower = (this.pi?.paymentMode || '').toLowerCase().trim();
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
        let data = {
          status: targetStatus,
          value: value,
          expenseId: id,
          remarks: result.remarks,
          accountantId: result.accountantId
        };

        this.verifiedSub = this.expenseService.updateStatus(data).subscribe(() => {
          this.getPiById(id);
          this.snackBar.open(`Expense ${piNo}: ${this.formatStatus(targetStatus)}!`, "", { duration: 3000 });
          this.router.navigateByUrl('login/viewApproval/viewexpenses');
        });
      }
    });
  }

  getStatusClass(status: string): string {
    if (!status) return 'status-default';
    const s = status.toLowerCase();
    if (s.includes('verified') || s.includes('approved') || s.includes('transferred')) return 'status-verified';
    if (s.includes('rejected') || s.includes('revert')) return 'status-rejected';
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
    if (status === 'OM Rejected') return 'Reverted to Employee';
    if (status === 'Pending FM Approval' || status === 'Pending Finance Approval') return 'Pending Finance Approval';
    if (status === 'Pending OM Approval' || status === 'Pending Operations Approval') return 'Pending Operations Approval';
    if (status === 'Generated') return 'Pending Approval';
    return status;
  }


  addBankSlip(piNo: string, id: number, status: string){
    const dialogRef = this.dialog.open(BankReceiptDialogueComponent, {
      data: { invoiceNo: piNo, id: id, status: status }
    });

    this.dialogSub = dialogRef.afterClosed().subscribe(result => {
      if(result){
        this.getPiById(id)
        this.snackBar.open(`BankSlip is attached with Invoice ${piNo} ...`,"" ,{duration:3000})
      }
    })
  }

  fileName: string = '';
  excelSub!: Subscription;
  makeExcel() {
    let data = {
      EntryNo: this.pi.piNo,
      Purpose: this.pi.purpose,
      SupplierName: this.pi.suppliers.companyName,
      SupplierPONo: this.pi.supplierPoNo,
      SupplierSONo: this.pi.supplierSoNo,
      SupplierPrice: `${this.pi.supplierPrice} ${this.pi.supplierCurrency}`,
      CustomerPoNo: this.pi.customerPoNo,
      CustomerSoNo: this.pi.customerSoNo,
      CustomerName: this.pi.customers?.companyName || '',
      SellingPrice: `${this.pi.poValue} ${this.pi.customerCurrency}`,
      SalesPerson: this.pi.salesPerson?.name  || '',

      KAM: this.pi.kam?.name  || '',

      ManagerName: this.pi.am.name,
      AccountantName: this.pi.accountant.name,
      AddedBy: this.pi.addedBy.name,
      BankSlip: this.pi.bankSlip,
      url: this.pi.url.map((u: any) => `URL: https://approval-management-data-s3.s3.ap-south-1.amazonaws.com/${u.url}, Remarks: ${u.remarks}`).join(' | '),
      CreatedAt: this.pi.createdAt,
    };
  
    // this.excelSub = this.invoiceService.excelExport(data).subscribe({
    //   next: (result: any) => {
    //     if (result && result.message === "Excel file saved successfully.") {
    //       this.router.navigateByUrl('/login/viewexcel');
    //     } else {
    //       alert(result.message);
    //     }
    //   },
    //   error: (error) => {
    //     if (error.error) {
    //       console.error(`Error Body: ${JSON.stringify(error.error)}`);
    //     }
  
    //     alert('There was an error exporting the Excel file. Please check the logs.');
    //   }
    // });
  }
  
}
