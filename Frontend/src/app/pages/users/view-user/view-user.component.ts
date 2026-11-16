/* eslint-disable @typescript-eslint/no-explicit-any */
import { Component, inject, OnDestroy, OnInit, viewChild } from '@angular/core';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { UsersService } from '@services/users.service';
import { Subscription } from 'rxjs';
import { MatCardModule } from '@angular/material/card';
import { MatDividerModule } from '@angular/material/divider';
import { MatIconModule } from '@angular/material/icon';
import { CommonModule, CurrencyPipe, DatePipe, DecimalPipe, UpperCasePipe } from '@angular/common';
import { MatAccordion, MatExpansionModule } from '@angular/material/expansion';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { StatutoryInfo } from '../../../common/interfaces/users/statutory-info';
import { UserAccount } from '../../../common/interfaces/users/user-account';
import { UserDocument } from '../../../common/interfaces/users/user-document';
import { UserPersonal } from '../../../common/interfaces/users/user-personal';
import { UserPosition } from '../../../common/interfaces/users/user-position';
import { User } from '../../../common/interfaces/users/user';
import { PayrollService } from '@services/payroll.service';
import { Payroll } from '../../../common/interfaces/payRoll/payroll';
import { PayrollLog } from '../../../common/interfaces/payRoll/payroll-log';
import { MonthlyPayroll } from '../../../common/interfaces/payRoll/monthlyPayroll';
import { AdvanceSalary } from '../../../common/interfaces/payRoll/advanceSalary';
import { SafePipe } from "../../../common/pipes/safe.pipe";
import { UserQualification } from '../../../common/interfaces/users/user-qualification';
import { Nominee } from '../../../common/interfaces/users/nominee';
import { Promotion } from '../../../common/interfaces/users/promotion';
import { PromotionService } from '@services/promotion.service';
import { NewLeaveService } from '@services/new-leave.service';
import { UserLeave } from '../../../common/interfaces/leaves/userLeave';
import { Leave } from '../../../common/interfaces/leaves/leave';
import { MatDialog } from '@angular/material/dialog';
import { EditUserPersonalComponent } from './edit-user-personal/edit-user-personal.component';
import { EditUserPositionComponent } from './edit-user-position/edit-user-position.component';
import { EditUserStatutoryComponent } from './edit-user-statutory/edit-user-statutory.component';
import { EditUserAccountComponent } from './edit-user-account/edit-user-account.component';
import { EditUserNomineeComponent } from './edit-user-nominee/edit-user-nominee.component';
import { EditUserDocumentComponent } from './edit-user-document/edit-user-document.component';
import { UserAssetsComponent } from '../user-assets/user-assets.component';
import { AddPayrollComponent } from '../../payroll/add-payroll/add-payroll.component';
import { SafeResourceUrl, DomSanitizer } from '@angular/platform-browser';
import { AssetsService } from '@services/assets.service';
import { UserAssetDetail } from '../../../common/interfaces/users/user-asset-details';
import { environment } from '../../../../environments/environment';
import { MatTabsModule } from '@angular/material/tabs';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBar } from '@angular/material/snack-bar';
import { EmployeeExportService } from '@services/employee-export.service';

export interface LifecycleEvent {
  id: string;
  date: Date;
  category: 'career' | 'salary' | 'leave';
  type: 'joined' | 'confirmed' | 'promotion' | 'salary_revision' | 'payslip' | 'advance_salary' | 'leave' | 'compoff' | 'separated';
  title: string;
  subtitle: string;
  badgeText?: string;
  badgeTone?: 'blue' | 'green' | 'amber' | 'purple' | 'rose' | 'teal' | 'slate';
  amountText?: string;
  details?: string;
  icon: string;
}

@Component({
  selector: 'app-view-user',
  standalone: true,
  imports: [
    CommonModule,
    DatePipe,
    DecimalPipe,
    CurrencyPipe,
    UpperCasePipe,
    RouterModule,
    MatCardModule,
    MatDividerModule,
    MatIconModule,
    MatButtonModule,
    MatExpansionModule,
    MatFormFieldModule,
    MatInputModule,
    MatTabsModule,
    MatTooltipModule,
    MatProgressSpinnerModule,
    SafePipe
  ],
  templateUrl: './view-user.component.html',
  styleUrl: './view-user.component.scss',
})
export class ViewUserComponent implements OnInit, OnDestroy {
  apiUrl = environment.s3Url || `https://${environment.AWS_BUCKET_NAME || 'aerohr-uploads'}.s3.amazonaws.com/`;
  public userImage = 'img/users/default-user.jpg';

  getUserImageUrl(url?: string): string {
    if (this.imageUrl) return this.imageUrl;
    if (!url) return this.userImage;
    if (url.startsWith('http://') || url.startsWith('https://')) return url;
    return `${this.apiUrl}${url}`;
  }

  currentCompany = environment.company;
  companyPlaceholders: any = {
    oac: {
      adharNo: { label: 'Aadhar ID', placeholder: 'Aadhar - 1234 5678 9012' },
      panNumber: { label: 'PAN', placeholder: 'PAN - ABCDE1234F' },
      pfNumber: { label: 'PF Number', placeholder: 'PF - PF12345' },
      esiNumber: { label: 'ESI Number', placeholder: 'ESI - ESI12345' },
      uanNumber: { label: 'UAN Number', placeholder: 'UAN - UAN12345' },
      insuranceNumber: { label: 'Insurance Number', placeholder: 'Insurance - INS12345' },
    },
    leeds: {
      adharNo: { label: 'Aadhar ID', placeholder: 'SSN - 123-45-6789' },
      panNumber: { label: 'Emirates ID', placeholder: 'Tax ID - 123456789' },
      pfNumber: { label: 'Visa Number', placeholder: 'Retirement ID - 789456' },
    },
  };

  labels: any = {};
  accordion = viewChild(MatAccordion);

  userSub!: Subscription;
  userService = inject(UsersService);
  employeeExportService = inject(EmployeeExportService);
  private payrollService = inject(PayrollService);
  private promotionService = inject(PromotionService);
  private leaveService = inject(NewLeaveService);
  private assetService = inject(AssetsService);
  private router = inject(Router);
  private dialog = inject(MatDialog);
  private sanitizer = inject(DomSanitizer);
  snackBar = inject(MatSnackBar);
  route = inject(ActivatedRoute);

  user!: User;
  isExportingExcel = false;

  puSub!: Subscription;
  userPersonal!: UserPersonal;

  suSub!: Subscription;
  userStat!: StatutoryInfo;

  auSub!: Subscription;
  accounts!: UserAccount;

  nomineeSub!: Subscription;
  nominee!: Nominee;

  posuSub!: Subscription;
  positions!: UserPosition;

  qualSub!: Subscription;
  qualifications!: UserQualification;

  docSub!: Subscription;
  documents: UserDocument[] = [];

  assetSub!: Subscription;
  assets: UserAssetDetail[] = [];

  payrollSub!: Subscription;
  currentPayroll: Payroll | null = null;

  payLogSUb!: Subscription;
  payrollLog: PayrollLog[] = [];

  monthSalarySub!: Subscription;
  monthlySalary: MonthlyPayroll[] = [];

  advanceSalarySub!: Subscription;
  advanceSalaries: AdvanceSalary[] = [];

  promotionSub!: Subscription;
  promotions: Promotion[] = [];

  userLeaveSub!: Subscription;
  userLeaves: UserLeave[] = [];

  activeLeaveSub!: Subscription;
  lockedLeaveSub!: Subscription;
  activeLeaves: Leave[] = [];
  lockedLeaves: Leave[] = [];
  leaveHistory: any[] = [];

  lifecycleFilter: 'all' | 'career' | 'salary' | 'leave' = 'all';
  leaveFilter: 'all' | 'compoff' | 'approved' | 'pending' | 'rejected' = 'all';

  ngOnInit(): void {
    this.getUser();
    this.labels = this.companyPlaceholders[this.currentCompany] || this.companyPlaceholders.oac;
  }

  getUser(): void {
    const id = Number(this.route.snapshot.params['id']);
    if (!id) return;
    this.userSub = this.userService.getUserById(id).subscribe(x => {
      this.user = x;
      this.getPersonsalData(x.id);
      this.getAccountData(x.id);
      this.getStatutoryData(x.id);
      this.getPositionData(x.id);
      this.getDocuments(x.id);
      this.getAssets(x.id);
      this.getCurrentPayroll(x.id);
      this.getPayrollLog(x.id);
      this.getMonthlySalary(x.id);
      this.getAdvanceSalaries(x.id);
      this.getPromotions(x.id);
      this.getLeaveBalances(x.id);
      this.getLeaveHistory(x.id);
      this.getQualData(x.id);
      this.getNomineeData(x.id);
    });
  }

  getPersonsalData(id: number): void {
    this.puSub = this.userService.getUserPersonalDetailsByUser(id).subscribe(x => {
      this.userPersonal = x;
    });
  }

  getStatutoryData(id: number): void {
    this.suSub = this.userService.getUserStatutoryuDetailsByUser(id).subscribe(x => {
      this.userStat = x;
    });
  }

  getAccountData(id: number): void {
    this.auSub = this.userService.getUserAcoountDetailsByUser(id).subscribe(x => {
      this.accounts = x;
    });
  }

  getNomineeData(id: number): void {
    this.nomineeSub = this.userService.getUserNomineeDetailsByUser(id).subscribe(x => {
      this.nominee = x;
    });
  }

  getPositionData(id: number): void {
    this.posuSub = this.userService.getUserPositionDetailsByUser(id).subscribe(x => {
      this.positions = x;
    });
  }

  getQualData(id: number): void {
    this.qualSub = this.userService.getUserQualDetailsByUser(id).subscribe(x => {
      this.qualifications = x;
    });
  }

  getDocuments(id: number): void {
    this.docSub = this.userService.getUserDocumentsByUser(id).subscribe(x => {
      this.documents = Array.isArray(x) ? x : [];
    });
  }

  getAssets(id: number): void {
    this.assetSub = this.assetService.getUserAssetsByUser(id).subscribe(x => {
      this.assets = Array.isArray(x) ? x : [];
    });
  }

  getCurrentPayroll(id: number): void {
    this.payrollSub = this.payrollService.getPayrollDetailsByUserId(id).subscribe({
      next: (x) => {
        this.currentPayroll = x && x.id ? x : null;
      },
      error: () => {
        this.currentPayroll = null;
      }
    });
  }

  getPayrollLog(id: number): void {
    this.payLogSUb = this.payrollService.getPayrollLogByUser(id).subscribe({
      next: (x) => {
        this.payrollLog = Array.isArray(x) ? x : [];
      },
      error: () => {
        this.payrollLog = [];
      }
    });
  }

  getMonthlySalary(id: number): void {
    this.monthSalarySub = this.payrollService.getMonthlyPayrollByUser(id).subscribe({
      next: (x: any) => {
        this.monthlySalary = Array.isArray(x) ? x : (Array.isArray(x?.items) ? x.items : []);
      },
      error: () => {
        this.monthlySalary = [];
      }
    });
  }

  getAdvanceSalaries(id: number): void {
    this.advanceSalarySub = this.payrollService.getAllAdvanceSalaryByUserId(id).subscribe({
      next: (x: any) => {
        this.advanceSalaries = Array.isArray(x) ? x : (Array.isArray(x?.items) ? x.items : []);
      },
      error: () => {
        this.advanceSalaries = [];
      }
    });
  }

  getPromotions(id: number): void {
    this.promotionSub = this.promotionService.getPromotionById(id).subscribe({
      next: (x) => {
        this.promotions = Array.isArray(x) ? x : [];
      },
      error: () => {
        this.promotions = [];
      }
    });
  }

  getLeaveBalances(id: number): void {
    this.userLeaveSub = this.leaveService.getUserLeaveByUser(id).subscribe({
      next: (x) => {
        this.userLeaves = Array.isArray(x) ? x : [];
      },
      error: () => {
        this.userLeaves = [];
      }
    });
  }

  getLeaveHistory(id: number): void {
    this.activeLeaveSub = this.leaveService.getLeavesByUser('Not', id).subscribe({
      next: (res: any) => {
        this.activeLeaves = Array.isArray(res) ? res : (Array.isArray(res?.items) ? res.items : []);
        this.mergeLeaveHistory();
      },
      error: () => {
        this.activeLeaves = [];
        this.mergeLeaveHistory();
      }
    });

    this.lockedLeaveSub = this.leaveService.getLeavesByUser('Locked', id).subscribe({
      next: (res: any) => {
        this.lockedLeaves = Array.isArray(res) ? res : (Array.isArray(res?.items) ? res.items : []);
        this.mergeLeaveHistory();
      },
      error: () => {
        this.lockedLeaves = [];
        this.mergeLeaveHistory();
      }
    });
  }

  private mergeLeaveHistory(): void {
    const combined = [...(this.activeLeaves || []), ...(this.lockedLeaves || [])];
    const uniqueMap = new Map<any, any>();
    combined.forEach(item => {
      if (item && typeof item === 'object') {
        const key = item.id ?? `${item.startDate}_${item.endDate}_${item.leaveTypeId}`;
        uniqueMap.set(key, item);
      }
    });
    this.leaveHistory = Array.from(uniqueMap.values()).sort((a, b) => {
      const dA = new Date(a.startDate || a.createdAt || 0).getTime();
      const dB = new Date(b.startDate || b.createdAt || 0).getTime();
      return dB - dA;
    });
  }

  // -------------------------------------------------------------------------
  // Computed Lifecycle & Summary Helpers
  // -------------------------------------------------------------------------
  getJoiningDate(): Date | null {
    const raw = this.userPersonal?.dateOfJoining || this.user?.dateOfJoining || this.user?.createdAt;
    if (!raw) return null;
    const d = new Date(raw);
    return isNaN(d.getTime()) ? null : d;
  }

  getTenureString(): string {
    const joinDate = this.getJoiningDate();
    if (!joinDate) return '—';
    const endDate = (this.user?.separated && (this.user as any)?.separationDate)
      ? new Date((this.user as any).separationDate)
      : new Date();

    let months = (endDate.getFullYear() - joinDate.getFullYear()) * 12 + (endDate.getMonth() - joinDate.getMonth());
    if (months < 0) months = 0;
    const years = Math.floor(months / 12);
    const remMonths = months % 12;

    if (years > 0 && remMonths > 0) return `${years} yr${years > 1 ? 's' : ''} ${remMonths} mo${remMonths > 1 ? 's' : ''}`;
    if (years > 0) return `${years} yr${years > 1 ? 's' : ''}`;
    if (remMonths > 0) return `${remMonths} mo${remMonths > 1 ? 's' : ''}`;
    return 'Newly Joined';
  }

  getCurrentGrossSalary(): number {
    if (this.currentPayroll?.grossPay) return Number(this.currentPayroll.grossPay) || 0;
    if (this.positions?.salary) return Number(this.positions.salary) || 0;
    return 0;
  }

  getCurrentNetSalary(): number {
    if (this.currentPayroll?.netPay) return Number(this.currentPayroll.netPay) || 0;
    const gross = Number(this.currentPayroll?.grossPay) || 0;
    const ded = this.getCurrentTotalDeductions();
    return Math.max(0, gross - ded);
  }

  getCurrentTotalDeductions(): number {
    if (!this.currentPayroll) return 0;
    return (Number(this.currentPayroll.pfDeduction) || 0) +
           (Number(this.currentPayroll.esi) || 0) +
           (Number((this.currentPayroll as any).incentiveDeduction) || 0);
  }

  getCompOffBalanceRecord(): UserLeave | undefined {
    return this.userLeaves.find(ul =>
      ul.leaveType?.leaveTypeName?.toLowerCase().includes('comp')
    );
  }

  getCompOffLeaveRequests(): any[] {
    return this.leaveHistory.filter(l =>
      l.leaveType?.leaveTypeName?.toLowerCase().includes('comp')
    );
  }

  getTotalAvailableLeaveBalance(): number {
    return this.userLeaves
      .filter(ul => ul.leaveType?.leaveTypeName?.toUpperCase() !== 'LOP')
      .reduce((sum, ul) => sum + (Number(ul.leaveBalance) || 0), 0);
  }

  getTotalLeavesTaken(): number {
    const fromBalances = this.userLeaves
      .filter(ul => ul.leaveType?.leaveTypeName?.toUpperCase() !== 'LOP')
      .reduce((sum, ul) => sum + (Number(ul.takenLeaves) || 0), 0);
    if (fromBalances > 0) return fromBalances;
    return this.leaveHistory
      .filter(l => ['approved', 'adminapproved', 'locked'].includes((l.status || '').toLowerCase()))
      .reduce((sum, l) => sum + (Number(l.noOfDays) || 0), 0);
  }

  getFilteredLeaves(): any[] {
    if (this.leaveFilter === 'all') return this.leaveHistory;
    if (this.leaveFilter === 'compoff') {
      return this.leaveHistory.filter(l => l.leaveType?.leaveTypeName?.toLowerCase().includes('comp'));
    }
    if (this.leaveFilter === 'approved') {
      return this.leaveHistory.filter(l => ['approved', 'adminapproved', 'locked'].includes((l.status || '').toLowerCase()));
    }
    if (this.leaveFilter === 'pending') {
      return this.leaveHistory.filter(l => (l.status || '').toLowerCase() === 'requested');
    }
    if (this.leaveFilter === 'rejected') {
      return this.leaveHistory.filter(l => (l.status || '').toLowerCase() === 'rejected');
    }
    return this.leaveHistory;
  }

  isCompOffLeave(item: any): boolean {
    return !!item?.leaveType?.leaveTypeName?.toLowerCase().includes('comp');
  }

  getPromotionIncrementPct(promo: Promotion): number {
    const prev = Number(promo.previousSalary) || 0;
    const next = Number(promo.newSalary) || 0;
    if (!prev || next <= prev) return 0;
    return ((next - prev) / prev) * 100;
  }

  getLifecycleEvents(): LifecycleEvent[] {
    const events: LifecycleEvent[] = [];

    // 1. Joined / Onboarding
    const joinDate = this.getJoiningDate();
    if (joinDate) {
      events.push({
        id: 'joined',
        date: joinDate,
        category: 'career',
        type: 'joined',
        title: 'Joined the Organization',
        subtitle: `${this.positions?.designation?.designationName || this.user?.role?.roleName || 'Employee'} • ${this.positions?.department || 'General Department'}`,
        badgeText: 'Onboarding',
        badgeTone: 'blue',
        details: this.userPersonal?.referredBy ? `Referred by ${this.userPersonal.referredBy}` : `Employee ID #${this.user?.empNo}`,
        icon: 'person_add'
      });
    }

    // 2. Confirmation
    const confDateRaw = this.positions?.confirmationDate || (this.userPersonal as any)?.confirmationDate;
    if (confDateRaw && !this.user?.isTemporary) {
      const confDate = new Date(confDateRaw);
      if (!isNaN(confDate.getTime())) {
        events.push({
          id: 'confirmed',
          date: confDate,
          category: 'career',
          type: 'confirmed',
          title: 'Confirmed as Permanent Employee',
          subtitle: this.positions?.probationPeriod ? `Completed ${this.positions.probationPeriod} months probation` : 'Employment confirmation completed',
          badgeText: 'Confirmed',
          badgeTone: 'green',
          details: this.positions?.probationNote || undefined,
          icon: 'verified'
        });
      }
    }

    // 3. Promotions
    (this.promotions || []).forEach((promo, idx) => {
      const d = new Date(promo.effectiveDate || promo.promotionDate || promo.createdAt || Date.now());
      const oldDesig = promo.oldDesignation?.designationName || 'Previous Role';
      const newDesig = promo.Designation?.designationName || 'New Designation';
      const prevSal = Number(promo.previousSalary) || 0;
      const newSal = Number(promo.newSalary) || 0;
      events.push({
        id: `promo_${promo.id || idx}`,
        date: isNaN(d.getTime()) ? new Date() : d,
        category: 'career',
        type: 'promotion',
        title: `Promoted to ${newDesig}`,
        subtitle: `${oldDesig} → ${newDesig}`,
        badgeText: 'Promotion',
        badgeTone: 'purple',
        amountText: newSal > 0 ? `₹${prevSal.toLocaleString('en-IN')} → ₹${newSal.toLocaleString('en-IN')}` : undefined,
        details: promo.promotionReason || undefined,
        icon: 'trending_up'
      });
    });

    // 4. Salary Revisions (PayrollLog)
    (this.payrollLog || []).forEach((log, idx) => {
      const d = new Date(log.updatedDate || Date.now());
      const oldInc = Number(log.oldIncome) || 0;
      const newInc = Number(log.newIncome) || 0;
      events.push({
        id: `sal_log_${idx}`,
        date: isNaN(d.getTime()) ? new Date() : d,
        category: 'salary',
        type: 'salary_revision',
        title: 'Salary Structure Revised',
        subtitle: `Compensation updated from ₹${oldInc.toLocaleString('en-IN')} to ₹${newInc.toLocaleString('en-IN')}`,
        badgeText: 'Salary Revision',
        badgeTone: 'teal',
        amountText: `₹${newInc.toLocaleString('en-IN')} / mo`,
        icon: 'price_change'
      });
    });

    // 5. Advance Salaries
    (this.advanceSalaries || []).forEach((adv: any, idx) => {
      const d = new Date(adv.createdAt || adv.updatedAt || Date.now());
      const amt = Number(adv.amount || adv.advanceAmount) || 0;
      events.push({
        id: `adv_${adv.id || idx}`,
        date: isNaN(d.getTime()) ? new Date() : d,
        category: 'salary',
        type: 'advance_salary',
        title: `Salary Advance (${adv.scheme || 'Advance'})`,
        subtitle: adv.reason || `Monthly deduction: ₹${Number(adv.monthlyPay || 0).toLocaleString('en-IN')}`,
        badgeText: adv.completed ? 'Closed Advance' : 'Active Advance',
        badgeTone: adv.completed ? 'slate' : 'amber',
        amountText: amt > 0 ? `₹${amt.toLocaleString('en-IN')}` : undefined,
        icon: 'request_quote'
      });
    });

    // 6. Monthly Payslips
    (this.monthlySalary || []).forEach((slip, idx) => {
      const d = new Date(slip.payedAt || slip.payedFor || Date.now());
      const paid = Number(slip.toPay) || 0;
      events.push({
        id: `slip_${slip.id || idx}`,
        date: isNaN(d.getTime()) ? new Date() : d,
        category: 'salary',
        type: 'payslip',
        title: `Payslip Disbursed — ${slip.payedFor}`,
        subtitle: `Monthly salary credited (${(slip as any).status || 'Locked'})`,
        badgeText: 'Payslip',
        badgeTone: 'green',
        amountText: `₹${paid.toLocaleString('en-IN')}`,
        icon: 'receipt_long'
      });
    });

    // 7. Leaves & Comp-Offs
    (this.leaveHistory || []).forEach((lv, idx) => {
      const d = new Date(lv.startDate || lv.createdAt || Date.now());
      const typeName = lv.leaveType?.leaveTypeName || 'Leave';
      const isCompOff = typeName.toLowerCase().includes('comp');
      const days = Number(lv.noOfDays) || 0;
      events.push({
        id: `leave_${lv.id || idx}`,
        date: isNaN(d.getTime()) ? new Date() : d,
        category: 'leave',
        type: isCompOff ? 'compoff' : 'leave',
        title: `${typeName} (${days} Day${days === 1 ? '' : 's'})`,
        subtitle: `${new Date(lv.startDate).toLocaleDateString('en-GB')} – ${new Date(lv.endDate).toLocaleDateString('en-GB')}`,
        badgeText: `${lv.status || 'Requested'}`,
        badgeTone: isCompOff ? 'purple' : ((lv.status || '').toLowerCase().includes('approve') || lv.status === 'Locked' ? 'green' : ((lv.status || '').toLowerCase() === 'rejected' ? 'rose' : 'amber')),
        details: lv.notes || undefined,
        icon: isCompOff ? 'stars' : 'event_note'
      });
    });

    // 8. Separation
    if (this.user?.separated) {
      const sepDateRaw = (this.user as any)?.separationDate || this.user?.updatedAt;
      const sepDate = sepDateRaw ? new Date(sepDateRaw) : new Date();
      events.push({
        id: 'separated',
        date: isNaN(sepDate.getTime()) ? new Date() : sepDate,
        category: 'career',
        type: 'separated',
        title: 'Employee Separated / Resigned',
        subtitle: 'Marked as separated from active service',
        badgeText: 'Separated',
        badgeTone: 'rose',
        details: (this.user as any)?.separationNote || undefined,
        icon: 'person_off'
      });
    }

    const sorted = events.sort((a, b) => b.date.getTime() - a.date.getTime());
    if (this.lifecycleFilter === 'all') return sorted;
    return sorted.filter(e => e.category === this.lifecycleFilter);
  }

  ngOnDestroy(): void {
    this.userSub?.unsubscribe();
    this.puSub?.unsubscribe();
    this.suSub?.unsubscribe();
    this.auSub?.unsubscribe();
    this.posuSub?.unsubscribe();
    this.qualSub?.unsubscribe();
    this.payrollSub?.unsubscribe();
    this.monthSalarySub?.unsubscribe();
    this.payLogSUb?.unsubscribe();
    this.advanceSalarySub?.unsubscribe();
    this.promotionSub?.unsubscribe();
    this.userLeaveSub?.unsubscribe();
    this.activeLeaveSub?.unsubscribe();
    this.lockedLeaveSub?.unsubscribe();
    this.assetSub?.unsubscribe();
    this.docSub?.unsubscribe();
    this.nomineeSub?.unsubscribe();
    this.dialogSub?.unsubscribe();
    this.uploadSub?.unsubscribe();
  }

  openPayroll(id: number): void {
    this.router.navigateByUrl('login/payroll/payslip/open/' + id);
  }

  openPromotionPage(): void {
    if (this.user?.id) {
      this.router.navigateByUrl('login/users/promotion/' + this.user.id);
    }
  }

  dialogSub!: Subscription;
  onEditClick(): void {
    this.router.navigate(['/login/users/edit/' + this.user.id]);
  }

  editPersonal(event: MouseEvent): void {
    event.stopPropagation();
    const dialogRef = this.dialog.open(EditUserPersonalComponent, {
      width: '90%',
      maxWidth: '850px',
      maxHeight: '90vh',
      data: { id: this.user.id },
    });

    this.dialogSub = dialogRef.afterClosed().subscribe(() => {
      this.getPersonsalData(this.user.id);
    });
  }

  editPosition(event: MouseEvent): void {
    event.stopPropagation();
    const dialogRef = this.dialog.open(EditUserPositionComponent, {
      width: '90%',
      maxWidth: '850px',
      maxHeight: '90vh',
      data: { id: this.user.id },
    });

    this.dialogSub = dialogRef.afterClosed().subscribe(() => {
      this.getPositionData(this.user.id);
    });
  }

  editStatutory(event: MouseEvent): void {
    event.stopPropagation();
    const dialogRef = this.dialog.open(EditUserStatutoryComponent, {
      width: '90%',
      maxWidth: '750px',
      maxHeight: '90vh',
      data: { id: this.user.id },
    });

    this.dialogSub = dialogRef.afterClosed().subscribe(() => {
      this.getStatutoryData(this.user.id);
    });
  }

  editAccount(event: MouseEvent): void {
    event.stopPropagation();
    const dialogRef = this.dialog.open(EditUserAccountComponent, {
      width: '90%',
      maxWidth: '720px',
      maxHeight: '90vh',
      data: { id: this.user.id },
    });

    this.dialogSub = dialogRef.afterClosed().subscribe(() => {
      this.getAccountData(this.user.id);
    });
  }

  editNominee(event: MouseEvent): void {
    event.stopPropagation();
    const dialogRef = this.dialog.open(EditUserNomineeComponent, {
      width: '90%',
      maxWidth: '720px',
      maxHeight: '90vh',
      data: { id: this.user.id },
    });

    this.dialogSub = dialogRef.afterClosed().subscribe(() => {
      this.getNomineeData(this.user.id);
    });
  }

  editDocument(event: MouseEvent): void {
    event.stopPropagation();
    const dialogRef = this.dialog.open(EditUserDocumentComponent, {
      width: '90%',
      maxWidth: '850px',
      maxHeight: '90vh',
      data: { id: this.user.id, name: this.user.name },
    });

    this.dialogSub = dialogRef.afterClosed().subscribe(() => {
      this.getDocuments(this.user.id);
    });
  }

  editAssets(event: MouseEvent): void {
    event.stopPropagation();
    const dialogRef = this.dialog.open(UserAssetsComponent, {
      width: '90%',
      maxHeight: '90vh',
      data: { id: this.user.id },
    });

    this.dialogSub = dialogRef.afterClosed().subscribe(() => {
      this.getAssets(this.user.id);
    });
  }

  editPayroll(event: MouseEvent): void {
    event.stopPropagation();
    const dialogRef = this.dialog.open(AddPayrollComponent, {
      width: '90%',
      maxHeight: '90vh',
      data: { id: this.user.id },
    });

    this.dialogSub = dialogRef.afterClosed().subscribe(() => {
      this.getCurrentPayroll(this.user.id);
      this.getPayrollLog(this.user.id);
      this.getMonthlySalary(this.user.id);
    });
  }

  goBack(): void {
    if (window.history.length > 1) {
      window.history.back();
    } else {
      this.router.navigate(['/login/users']);
    }
  }

  activeDocPreviewId: number | null = null;
  toggleDocPreview(id: number): void {
    this.activeDocPreviewId = this.activeDocPreviewId === id ? null : id;
  }

  openDocument(docUrl: string): void {
    if (!docUrl) return;
    const fullUrl = docUrl.startsWith('http://') || docUrl.startsWith('https://')
      ? docUrl
      : `${this.apiUrl}${docUrl}`;
    window.open(fullUrl, '_blank');
  }

  onAvatarError(event: Event): void {
    (event.target as HTMLImageElement).src = this.userImage;
  }

  isUploading: boolean = false;
  uploadProgress: number | null = null;
  uploadComplete: boolean = false;
  file!: any;
  uploadSub!: Subscription;
  fileType: string = '';
  imageUrl: string = '';
  public safeUrl!: SafeResourceUrl;

  uploadFile(event: Event): void {
    const input = event.target as HTMLInputElement;
    this.file = input.files?.[0];
    if (this.file) {
      this.fileType = this.file.type.split('/')[1];
      this.uploadComplete = false;
      this.isUploading = true;

      this.uploadSub = this.userService.uploadImage(this.file).subscribe({
        next: (invoice) => {
          const fileKey = invoice.fileUrl || invoice.key;
          const data = { url: fileKey };
          this.userService.updateUserImage(this.user.id, data).subscribe({
            next: () => {
              this.imageUrl = invoice.url || (fileKey && fileKey.startsWith('http') ? fileKey : `${this.apiUrl}${fileKey}`);
              if (this.imageUrl) {
                this.safeUrl = this.sanitizer.bypassSecurityTrustResourceUrl(this.imageUrl);
              }
              this.uploadComplete = true;
              this.isUploading = false;
            },
            error: () => {
              this.uploadComplete = true;
              this.isUploading = false;
            }
          });
        },
        error: () => {
          this.uploadComplete = true;
          this.isUploading = false;
        }
      });
    }
  }

  async exportToExcel(): Promise<void> {
    if (!this.user || this.isExportingExcel) return;
    this.isExportingExcel = true;
    try {
      this.snackBar.open(`Generating Excel profile for ${this.user.name}...`, '', { duration: 2000 });
      await this.employeeExportService.exportSingleEmployeeToExcel(this.user.id);
      this.snackBar.open(`Excel profile for ${this.user.name} downloaded successfully!`, 'Close', { duration: 3000 });
    } catch (err: any) {
      console.error('Error downloading employee Excel:', err);
      this.snackBar.open(err?.message || 'Failed to download employee Excel file', 'Close', { duration: 4000 });
    } finally {
      this.isExportingExcel = false;
    }
  }
}
