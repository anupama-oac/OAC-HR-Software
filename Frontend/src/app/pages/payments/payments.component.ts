import { Component, inject, OnInit, OnDestroy, QueryList, ViewChildren } from '@angular/core';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatTabsModule } from '@angular/material/tabs';
import { ViewApprovalComponent } from './view-approval/view-approval.component';
import { ViewExpenseComponent } from './expense/view-expense/view-expense.component';
import { InvoiceService } from '@services/invoice.service';
import { interval, Subscription } from 'rxjs';
import { CommonModule } from '@angular/common';
import { ActivatedRoute } from '@angular/router';

@Component({
  selector: 'app-payments',
  standalone: true,
  imports: [MatCardModule, MatTabsModule, MatIconModule, ViewApprovalComponent, ViewExpenseComponent, CommonModule],
  templateUrl: './payments.component.html',
  styleUrl: './payments.component.scss'
})
export class PaymentsComponent implements OnInit, OnDestroy {
  currentTabIndex: number = 0;
  currentPage: number = 1;
  private readonly route = inject(ActivatedRoute);
  private refreshSub!: Subscription;

  ngOnDestroy(): void {
    this.refreshSub?.unsubscribe();
    this.roleSub?.unsubscribe();
  }

  ngOnInit(): void {
    const token: any = localStorage.getItem('token');
    const user = token ? JSON.parse(token) : null;
    const roleId = user?.role;
    if (roleId) {
      this.getRoleById(roleId);
    }
  }

  @ViewChildren('viewApproval') viewApprovalComponents!: QueryList<ViewApprovalComponent>;
  @ViewChildren('viewExpense') viewExpenseComponent!: QueryList<ViewExpenseComponent>;
  data: any;
  private invoiceService = inject(InvoiceService);
  isSubmitted!: true;
  status: string = '';
  header: string = '';
  pageStatus: boolean = true;
  dataToPass: any;

  roleSub!: Subscription;
  roleName!: string;
  sp: boolean = false;
  kam: boolean = false;
  am: boolean = false;
  ma: boolean = false;
  admin: boolean = false;
  teamLead: boolean = false;
  pendingHeader : string = '';
  getRoleById(id: number){
    const token: any = localStorage.getItem('token');
    let isSuperAdminFromToken = false;
    if (token) {
      try {
        const u = JSON.parse(token);
        const d = (u.designationName || u.roleName || '').toLowerCase().trim();
        if (u.isSuperAdmin || d.includes('hr & administration manager') || d.includes('hr & admin manager') || d.includes('super admin')) {
          isSuperAdminFromToken = true;
        }
      } catch (e) {}
    }

    this.roleSub = this.invoiceService.getRoleById(id).subscribe(role => {
      const rLower = (role.roleName || '').toLowerCase().trim();
      if (isSuperAdminFromToken || rLower === 'hr & administration manager' || rLower === 'hr & admin manager') {
        this.roleName = 'Super Administrator';
      } else {
        this.roleName = role.roleName;
      }  
      if(!this.isSubmitted){
        if(this.roleName === 'Sales Executive' || this.roleName === 'Team Lead') { 
          this.status = 'GENERATED'; this.sp = true; this.header = 'REJECTED'; this.pendingHeader='GENERATED'
         }
        if(this.roleName === 'Key Account Manager') { 
          this.status = 'GENERATED'; this.kam = true; this.header = 'AM REJECTED'; this.pendingHeader='GENERATED'
        }
        if(this.roleName === 'Manager') { 
          this.status = 'KAM VERIFIED'; this.am = true; this.header = 'REJECTED'; this.pendingHeader='VERIFIED'
        }
        if(this.roleName === 'Accountant') { 
          this.status = 'AM VERIFIED'; this.ma = true; this.pendingHeader='VERIFIED'
        }
        if(this.roleName === 'Administrator' || this.roleName === 'Super Administrator' || (this.roleName || '').toLowerCase().trim() === 'hr & administration manager') { this.admin = true, this.status = '' }
        if(this.roleName === 'Team Lead') { this.teamLead = true }
      }else{
        this.status = '';
        this.pageStatus = false;
        if(this.roleName === 'Sales Executive') { 
          this.sp = true; this.header = 'REJECTED'; this.pendingHeader='GENERATED'
         }
        if(this.roleName === 'Key Account Manager') { 
          this.kam = true; this.header = 'AM REJECTED'; this.pendingHeader='GENERATED'
        }
        if(this.roleName === 'Manager') { 
          this.am = true; this.header = 'REJECTED'; this.pendingHeader='VERIFIED'
        }
        if(this.roleName === 'Accountant') { 
          this.ma = true; this.pendingHeader='VERIFIED'
        }
      }
      this.data = {
        status: this.status,
        roleName: this.roleName,
        sp: this.sp,
        kam: this.kam,
        am: this.am,
        ma: this.ma,
        admin: this.admin,
        teamLead: this.teamLead,
        pageStatus: this.pageStatus
      }
      const tabIndex = this.invoiceService.getState('tabIndex');
      if (tabIndex !== undefined && tabIndex !== null) {
        this.selectedTabIndex = tabIndex.tabIndex;
        this.onTabChange(this.selectedTabIndex)
      }else{
        this.onTabChange(0)
      }
    })
  }
  
  selectedTabIndex: number = 0;
  onTabChange(event: number) {
    this.selectedTabIndex = event;
    this.invoiceService.setState('tabIndex', { tabIndex: event });
    switch (this.roleName) {
      case 'Sales Executive':
        switch (event) {
          case 0:
            this.data.status = 'GENERATED';
            this.data.pageStatus = true;
            break;
          case 1:
            this.data.status = 'BANK SLIP ISSUED';
            this.data.pageStatus = false;
            break;
          case 2:
            this.data.status = 'REJECTED';
            this.data.pageStatus = false;
            break;
          case 3:
            this.data.status = '';
            this.data.pageStatus = false;
            break;
          default:
            this.data.status = 'GENERATED';
            this.data.pageStatus = false;
            break;
        };
        break;
      case 'Key Account Manager':
        switch (event) {
          case 0:
            this.data.status = 'GENERATED';
            this.data.pageStatus = true;
            break;
          case 1:
            this.data.status = ['KAM VERIFIED', 'KAM REJECTED'];
            this.data.pageStatus = true;
            break;
          case 2:
            this.data.status = 'BANK SLIP ISSUED';
            this.data.pageStatus = false;
            break;
          case 3:
            this.data.status = 'AM REJECTED';
            this.data.pageStatus = false;
            break;
          case 4:
            this.data.status = '';
            this.data.pageStatus = false;
            break;
          default:
            this.data.status = 'GENERATED';
            this.data.pageStatus = false;
            break;
        }
        break;
      case 'Manager':
        switch (event) {
          case 0:
            this.data.status = 'KAM VERIFIED';
            this.data.pageStatus = true;
            break;
          case 1:
            this.data.status = ['AM VERIFIED', 'AM REJECTED'];
            this.data.pageStatus = true;
            break;
          case 2:
              this.data.status = 'GENERATED';
              this.data.pageStatus = false;
              break;
          case 3:
            this.data.status = 'BANK SLIP ISSUED';
            this.data.pageStatus = false;
            break;
          case 4:
            this.data.status = 'REJECTED';
            this.data.pageStatus = false;
            break;
          case 5:
            this.data.status = '';
            this.data.pageStatus = false;
            break;
          case 6:
            this.data.status = '';
            this.data.pageStatus = false;
            break;
          default:
            this.data.status = 'KAM VERIFIED';
            this.data.pageStatus = false;
            break;
        } 
        break;
      case 'Accountant':
        switch (event) {
          case 0:
            this.data.status = 'AM VERIFIED';
            this.data.pageStatus = false;
            break;
          case 1:
            this.data.status = 'BANK SLIP ISSUED';
            this.data.pageStatus = false;
            break;
          case 2:
            this.data.status = '';
            this.data.pageStatus = false;
            break;
          case 3:
            this.data.status = '';
            this.data.pageStatus = false;
            break;
          default:
            this.data.status = 'AM VERIFIED';
            break;
        } 
        break;

        case 'Administrator':
          case 'Super Administrator':
            switch (event) {
              case 0:
                this.data.status = '';
                this.data.pageStatus = true;
                break;
              case 1:
                this.data.status = '';
                this.data.pageStatus = false;
                break;
              default:
                this.data.status = '';
                this.data.pageStatus = false;
                break;
            }
            break;
        default:
          switch (event) {
            case 0:
              this.data.status = 'GENERATED';
              break;
            case 1:
              this.data.status = 'BANK SLIP ISSUED';
              break;
            case 2:
              this.data.status = 'AM REJECTED';
              break;
            case 3:
              this.data.status = '';
              break;
            default:
              this.data.status = 'GENERATED';
              break;
          }
          break;
    }
    if (this.roleName === 'Manager' && event === 6 && this.viewExpenseComponent.length > 0) {
      const activeComponent = this.viewExpenseComponent.toArray()[0]; // or correct index if it's not 0
      if (activeComponent) {
        activeComponent.loadData(this.data, event);
      } 
    }else if (event === 5 && this.viewExpenseComponent.length > 0 && this.roleName === 'Key Account Manager') {
      const activeComponent = this.viewExpenseComponent.toArray()[0]; // or correct index if it's not 0
      if (activeComponent) {
        activeComponent.loadData(this.data, event);
      } 
    }else if (event === 3 && this.viewExpenseComponent.length > 0 && this.roleName === 'Accountant') {
      const activeComponent = this.viewExpenseComponent.toArray()[0]; // or correct index if it's not 0
      if (activeComponent) {
        activeComponent.loadData(this.data, event);
      } 
    } else if (event === 0 && this.viewApprovalComponents.length > 0 && (this.roleName === 'Administrator' || this.roleName === 'Super Administrator' || (this.roleName || '').toLowerCase().trim() === 'hr & administration manager')) {
      const activeComponent = this.viewApprovalComponents.toArray()[0]; 
      if (activeComponent) {
        activeComponent.loadData(this.data, event);
      } 
    }  else if (event === 1 && this.viewExpenseComponent.length > 0 && (this.roleName === 'Administrator' || this.roleName === 'Super Administrator' || (this.roleName || '').toLowerCase().trim() === 'hr & administration manager')) {
      const activeComponent = this.viewExpenseComponent.toArray()[0]; 
      if (activeComponent) {
        activeComponent.loadData(this.data, event);
      } 
    } else if (this.viewApprovalComponents.length > 0) {
      const activeComponent = this.viewApprovalComponents.toArray()[event];
      if (activeComponent) {
        activeComponent.loadData(this.data, event);
      } 
    }

  }
  
}
