/* eslint-disable @typescript-eslint/no-explicit-any */
import { CommonModule, DatePipe } from '@angular/common';
import { Component, inject, OnDestroy, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatChipsModule } from '@angular/material/chips';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MatTabsModule } from '@angular/material/tabs';
import { MatTooltipModule } from '@angular/material/tooltip';
import { Router, RouterModule } from '@angular/router';
import { Subscription } from 'rxjs';

import { AnnouncementsService } from '@services/announcements.service';
import { HolidayService } from '@services/holiday.service';
import { InvoiceService } from '@services/invoice.service';
import { MessagesService } from '@services/messages.service';
import { NewLeaveService } from '@services/new-leave.service';
import { RoleService } from '@services/role.service';
import { UsersService } from '@services/users.service';
import { environment } from '../../../environments/environment';
import { MatrixTableComponent } from './matrix-table/matrix-table.component';
import {
  CelebrationPopupItem,
  CelebrationWishDialogComponent
} from './celebration-wish-dialog/celebration-wish-dialog.component';
import { Announcement } from '../../common/interfaces/announcement';
import { Role } from '../../common/interfaces/users/role';
import { ExpensesService } from '@services/expenses.service';
import { VerificationDialogueComponent } from '../payments/view-approval/verification-dialogue/verification-dialogue.component';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    FormsModule,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatTooltipModule,
    MatChipsModule,
    MatProgressSpinnerModule,
    MatTabsModule,
    MatDialogModule,
    MatrixTableComponent
  ],
  providers: [DatePipe],
  templateUrl: './dashboard.component.html',
  styleUrl: './dashboard.component.scss'
})
export class DashboardComponent implements OnInit, OnDestroy {
  s3Url = environment.s3Url || 'https://approval-management-data-s3.s3.ap-south-1.amazonaws.com/';

  private usersService = inject(UsersService);
  private roleService = inject(RoleService);
  private leaveService = inject(NewLeaveService);
  private holidayService = inject(HolidayService);
  private announcementsService = inject(AnnouncementsService);
  private invoiceService = inject(InvoiceService);
  private messagesService = inject(MessagesService);
  private expensesService = inject(ExpensesService);
  private router = inject(Router);
  private snackBar = inject(MatSnackBar);
  private dialog = inject(MatDialog);
  private datePipe = inject(DatePipe);

  // User & Role State
  userId: number = 0;
  userName: string = 'Colleague';
  userEmail: string = '';
  roleName: string = '';
  greeting: string = 'Welcome back';
  currentDate: Date = new Date();
  currentYear: number = new Date().getFullYear();
  isReportingManager: boolean = false;
  canAccessDraft: boolean = false;

  // Finance Manager Expense Approvals State
  pendingExpensesForFinance: any[] = [];
  pendingFinanceExpensesCount: number = 0;
  totalExpensesCount: number = 0;
  isProcessingExpense: boolean = false;
  private expenseSub?: Subscription;

  // View switch for Super Admin
  currentTab: 'overview' | 'matrix' = 'overview';
  celebrationTab: 'birthdays' | 'anniversaries' = 'birthdays';

  // Loading indicator
  isLoading: boolean = true;

  // Metrics & Stats
  totalEmployeesCount: number = 0;
  confirmedEmployeesCount: number = 0;
  probationEmployeesCount: number = 0;
  totalPendingLeavesCount: number = 0;
  totalUpcomingHolidays: number = 0;

  // Lists
  pendingLeaves: any[] = [];
  upcomingHolidays: any[] = [];
  birthdaysThisMonth: any[] = [];
  joiningsThisMonth: any[] = [];
  publishedCelebrationWishes: CelebrationPopupItem[] = [];
  probationDues: any[] = [];
  announcements: Announcement[] = [];

  // Employee-Specific Leave Balances & Granted Leaves Today
  userLeaves: any[] = [];
  userCasualLeave?: any;
  userSickLeave?: any;
  userCompOff?: any;
  userLop?: any;
  leavesGrantedToday: { type: string; days: number; balance: number; date: Date }[] = [];
  todayGrantNotificationMessage: string = '';

  // Celebration auto-popup tracking
  private birthdaysLoaded = false;
  private joiningsLoaded = false;
  private hasAutoOpenedCelebrationPopup = false;

  // Subscriptions
  private roleSub?: Subscription;
  private userSub?: Subscription;
  private reportingManagerSub?: Subscription;
  private leaveSub?: Subscription;
  private holidaySub?: Subscription;
  private birthdaySub?: Subscription;
  private joiningSub?: Subscription;
  private probationSub?: Subscription;
  private announcementSub?: Subscription;
  private dismissedSub?: Subscription;
  private userLeaveSub?: Subscription;
  private notifSub?: Subscription;

  ngOnInit(): void {
    this.initGreeting();
    this.loadUserData();
    this.loadDashboardData();

    // Listen for announcement dismissal changes
    this.dismissedSub = this.announcementsService.dismissedChanged$.subscribe(() => {
      this.loadAnnouncements();
    });
  }

  get isSuperAdmin(): boolean {
    const r = (this.roleName || '').toLowerCase().trim();
    if (r === 'super administrator' || r === 'super admin' || r.includes('super admin')) {
      return true;
    }
    return false;
  }

  get designationCategory(): 'super-admin' | 'hr' | 'finance' | 'operations' | 'sales' | 'team-lead' | 'employee' {
    const r = (this.roleName || '').toLowerCase().trim();
    const token = localStorage.getItem('token');
    let dLower = '';
    if (token) {
      try {
        const u = JSON.parse(token);
        dLower = (u?.designationName || u?.roleName || '').toLowerCase().trim();
      } catch (_) {}
    }

    if (this.isSuperAdmin) return 'super-admin';
    if (
      r.includes('hr administrator') ||
      r.includes('hr admin') ||
      r.includes('hr executive') ||
      r.includes('hr & admin') ||
      r === 'executive' ||
      dLower.includes('hr administrator') ||
      dLower.includes('hr admin') ||
      dLower.includes('hr executive') ||
      dLower.includes('hr & admin') ||
      dLower === 'executive'
    ) {
      return 'hr';
    }
    if (r.includes('finance manager') || r.includes('accountant') || dLower.includes('finance manager') || dLower.includes('accountant')) return 'finance';
    if (r.includes('operations manager') || r.includes('operation manager') || dLower.includes('operations manager') || dLower.includes('operation manager')) return 'operations';
    if (r.includes('sales') || r.includes('key account') || r.includes('kam') || dLower.includes('sales') || dLower.includes('key account') || dLower.includes('kam')) return 'sales';
    if (r.includes('team lead') || r.includes('team leader') || dLower.includes('team lead') || dLower.includes('team leader') || this.isReportingManager) return 'team-lead';
    return 'employee';
  }

  get isHrAdminOrExecutive(): boolean {
    return this.designationCategory === 'super-admin' || this.designationCategory === 'hr';
  }

  get isHrOrSuperAdmin(): boolean {
    return this.roleName === 'Super Administrator' || this.roleName === 'HR & ADMINISTRATION MANAGER';
  }

  get isFinanceRole(): boolean {
    return this.roleName.toLowerCase() === 'finance manager';
  }

  get isOperationsRole(): boolean {
    return this.roleName.toLowerCase() === 'operations manager';
  }

  get canApproveExpenses(): boolean {
    return this.isFinanceRole || this.isOperationsRole || this.isSuperAdmin;
  }

  get pendingExpensesPanelTitle(): string {
    if (this.isOperationsRole) return 'Card Expenses Awaiting Operations Approval';
    if (this.isFinanceRole) return 'Expenses Awaiting Finance Approval';
    return 'Expenses Awaiting Approval & Disbursement';
  }

  get pendingExpensesPanelSubtitle(): string {
    if (this.isOperationsRole) return 'Company card expense claims requiring Operations review and sign-off';
    if (this.isFinanceRole) return 'Company expense claims requiring your review and disbursement sign-off';
    return 'Company expense claims requiring review and disbursement sign-off';
  }

  get isSalesRole(): boolean {
    return this.designationCategory === 'sales';
  }

  get isTeamLeadRole(): boolean {
    return this.designationCategory === 'team-lead';
  }

  get heroSubtitle(): string {
    console.log(this.designationCategory);
    
    switch (this.designationCategory) {
      case 'super-admin':
      case 'hr':
        return 'Welcome to your HR & Executive workspace. Here is a real-time summary of your workforce, pending requests, and upcoming company events.';
      case 'finance':
        return 'Welcome to your Financial workspace. Monitor expenses, petty cash disbursements, salary advances, and month-end payroll.';
      case 'operations':
        return 'Welcome to your Operations workspace. Track organizational disbursements, approvals, team leaves, and operational notices.';
      case 'sales':
        return 'Welcome to your Sales workspace. Create and monitor proforma invoices, submit expenses, and track your leave balances.';
      case 'team-lead':
        return 'Welcome to your Team workspace. Review team leave submissions, manage personal entitlements, and keep track of milestones.';
      default:
        return 'Welcome to your personal workspace. Track your leave balances, upcoming holidays, and company notices.';
    }
  }

  get isRegularEmployee(): boolean {
    return !this.isHrOrSuperAdmin;
  }

  get todaysBirthdays(): any[] {
    return (this.birthdaysThisMonth || []).filter((emp) => this.isTodayBirthday(emp.dateOfBirth));
  }

  get todaysAnniversaries(): any[] {
    return (this.joiningsThisMonth || []).filter((emp) => this.isTodayAnniversary(emp.dateOfJoining));
  }

  initGreeting(): void {
    const hour = new Date().getHours();
    if (hour < 12) {
      this.greeting = 'Good morning';
    } else if (hour < 17) {
      this.greeting = 'Good afternoon';
    } else {
      this.greeting = 'Good evening';
    }
  }

  loadUserData(): void {
    const token = localStorage.getItem('token');
    if (token) {
      try {
        const user = JSON.parse(token);
        this.userId = user?.id || 0;
        this.userName = user?.name || user?.username || 'Colleague';
        this.userEmail = user?.email || '';
        // Synchronously resolve initial roleName from cached token to avoid initial null/empty render cycles
        const dLower = (user?.designationName || '').toLowerCase().trim();
        if (user?.designationName) {
          this.roleName = user.designationName;
        } else if (user?.roleName) {
          this.roleName = user.roleName;
        } else if (user?.role === 1 || user?.roleId === 1 || user?.designationId === 1) {
          this.roleName = 'Super Administrator';
        } else if (user?.role === 2 || user?.roleId === 2 || user?.designationId === 2) {
          this.roleName = 'HR Administrator';
        }
        
        this.canAccessDraft = this.isSuperAdmin || this.isHrAdminOrExecutive || ['Super Administrator', 'HR Administrator', 'Super Admin', 'HR & ADMINISTRATION MANAGER'].includes(this.roleName);

        const designationOrRoleId = user?.designationId || user?.roleId || user?.role;
        if (this.userId) {
          this.userSub?.unsubscribe();
          this.userSub = this.usersService.getUserById(this.userId).subscribe({
            next: (u: any) => {
              const desig = u?.userPosition?.designation?.designationName;
              const dl = (desig || '').toLowerCase().trim();
              if (desig) {
                this.roleName = desig;
              } else if (designationOrRoleId) {
                this.getRoleById(designationOrRoleId);
                return;
              }
              this.canAccessDraft = this.isSuperAdmin || this.isHrAdminOrExecutive || ['Super Administrator', 'HR Administrator', 'Super Admin', 'HR & ADMINISTRATION MANAGER'].includes(this.roleName);
              this.loadPendingLeaves();
            },
            error: () => {
              if (designationOrRoleId) {
                this.getRoleById(designationOrRoleId);
              } else {
                this.loadPendingLeaves();
              }
            }
          });
        } else if (designationOrRoleId) {
          this.getRoleById(designationOrRoleId);
        }
      } catch (e) {
        console.error('Error parsing token:', e);
      }
    }
  }

  getRoleById(id: number): void {
    this.roleSub?.unsubscribe();
    this.roleSub = this.roleService.getRoleById(id).subscribe({
      next: (role: Role) => {
        this.roleName = role?.roleName || role?.abbreviation || '';
        this.canAccessDraft = this.isSuperAdmin || this.isHrAdminOrExecutive || ['Super Administrator', 'HR Administrator', 'Super Admin', 'HR & ADMINISTRATION MANAGER'].includes(this.roleName);
        this.loadPendingLeaves();
      },
      error: (err) => {
        console.error('Error loading role:', err);
        this.loadPendingLeaves();
      }
    });
  }

  loadDashboardData(): void {
    this.isLoading = true;
    this.birthdaysLoaded = false;
    this.joiningsLoaded = false;
    this.checkReportingManager();
    this.loadEmployeeCounts();
    this.loadHolidays();
    this.loadBirthdays();
    this.loadJoinings();
    this.loadProbationDues();
    this.loadAnnouncements();
    this.loadUserLeaves();
    this.loadFinanceExpenses();
  }

  loadUserLeaves(): void {
    if (!this.userId) return;
    this.userLeaveSub?.unsubscribe();
    this.userLeaveSub = this.leaveService.getUserLeaveByUser(this.userId).subscribe({
      next: (res: any[]) => {
        this.userLeaves = res || [];
        this.userCasualLeave = this.userLeaves.find(ul => ul.leaveType?.leaveTypeName === 'Casual Leave');
        this.userSickLeave = this.userLeaves.find(ul => ul.leaveType?.leaveTypeName === 'Sick Leave');
        this.userCompOff = this.userLeaves.find(ul => ul.leaveType?.leaveTypeName === 'Comp Off');
        this.userLop = this.userLeaves.find(ul => ul.leaveType?.leaveTypeName === 'LOP');

        this.checkLeavesGrantedToday();
      },
      error: (err) => console.warn('Could not load user leaves:', err)
    });
  }

  checkLeavesGrantedToday(): void {
    const today = new Date();
    const isSameDate = (d1: any) => {
      if (!d1) return false;
      const dt = new Date(d1);
      return (
        dt.getDate() === today.getDate() &&
        dt.getMonth() === today.getMonth() &&
        dt.getFullYear() === today.getFullYear()
      );
    };

    const granted: { type: string; days: number; balance: number; date: Date }[] = [];

    // 1. Check user leaves updated or created today
    this.userLeaves.forEach((ul) => {
      const typeName = ul.leaveType?.leaveTypeName || '';
      if ((isSameDate(ul.updatedAt) || isSameDate(ul.createdAt)) && ['Casual Leave', 'Sick Leave', 'Comp Off'].includes(typeName)) {
        granted.push({
          type: typeName,
          days: 1,
          balance: Number(ul.leaveBalance) || 0,
          date: new Date(ul.updatedAt || ul.createdAt || today)
        });
      }
    });

    this.leavesGrantedToday = granted;

    // 2. Also check notifications from today for leave grants
    this.notifSub?.unsubscribe();
    this.notifSub = this.messagesService.getUserNotifications(this.userId).subscribe({
      next: (res: any) => {
        const raw = res as any;
        const list: any[] = Array.isArray(raw) ? raw : (raw?.notifications || raw?.items || []);
        const todayNotifs = list.filter((n: any) => n?.createdAt && isSameDate(n.createdAt));
        const grantNotif = todayNotifs.find((n: any) => {
          const msg = (n?.message || '').toLowerCase();
          return msg.includes('granted') || msg.includes('sick leave') || msg.includes('casual leave') || msg.includes('comp-off') || msg.includes('compo off');
        });

        if (grantNotif) {
          this.todayGrantNotificationMessage = grantNotif.message;
          const msgLower = grantNotif.message.toLowerCase();
          const hasType = (t: string) => this.leavesGrantedToday.some((g) => g.type.toLowerCase() === t.toLowerCase());

          if (!hasType('Sick Leave') && (msgLower.includes('sick') || msgLower.includes('granted'))) {
            this.leavesGrantedToday.push({
              type: 'Sick Leave',
              days: 1,
              balance: Number(this.userSickLeave?.leaveBalance || 1),
              date: new Date(grantNotif.createdAt)
            });
          }

          if (!hasType('Casual Leave') && (msgLower.includes('casual') || msgLower.includes('granted'))) {
            this.leavesGrantedToday.push({
              type: 'Casual Leave',
              days: 1,
              balance: Number(this.userCasualLeave?.leaveBalance || 1),
              date: new Date(grantNotif.createdAt)
            });
          }

          if (!hasType('Comp Off') && (msgLower.includes('comp-off') || msgLower.includes('compo off'))) {
            this.leavesGrantedToday.push({
              type: 'Comp Off',
              days: 1,
              balance: Number(this.userCompOff?.leaveBalance || 1),
              date: new Date(grantNotif.createdAt)
            });
          }
        }
      },
      error: () => {}
    });
  }

  checkReportingManager(): void {
    this.reportingManagerSub?.unsubscribe();
    this.reportingManagerSub = this.usersService.getUserPersonalDetails().subscribe({
      next: (users) => {
        const rmUsers = (users || []).filter((u: any) => u.reportingMangerId === this.userId);
        this.isReportingManager = rmUsers.length > 0;
        this.loadPendingLeaves();
      },
      error: () => {}
    });
  }

  loadEmployeeCounts(): void {
    // Confirmed count
    this.usersService.getConfirmedEmployees().subscribe({
      next: (res) => {
        this.confirmedEmployeesCount = Array.isArray(res) ? res.length : 0;
        this.calculateTotalEmployees();
      },
      error: () => {}
    });

    // Probation count
    this.usersService.getProbationEmployees().subscribe({
      next: (res) => {
        this.probationEmployeesCount = Array.isArray(res) ? res.length : 0;
        this.calculateTotalEmployees();
      },
      error: () => {}
    });

    // Active headcount
    this.usersService.getUser('', 1, 1).subscribe({
      next: (res: any) => {
        if (res && res.count !== undefined) {
          this.totalEmployeesCount = res.count;
        }
      },
      error: () => {}
    });
  }

  calculateTotalEmployees(): void {
    const sum = this.confirmedEmployeesCount + this.probationEmployeesCount;
    if (sum > this.totalEmployeesCount) {
      this.totalEmployeesCount = sum;
    }
  }

  loadPendingLeaves(): void {
    this.leaveSub?.unsubscribe();
    if (this.isHrAdminOrExecutive) {
      // Super Admin and HR (SA, HR Admin, HR Executive): show all company-wide pending leaves
      this.leaveSub = this.leaveService.getRequestedLeaves(1, 6).subscribe({
        next: (res: any) => {
          this.pendingLeaves = res?.items || [];
          this.totalPendingLeavesCount = res?.count || this.pendingLeaves.length;
          this.isLoading = false;
        },
        error: (err) => {
          console.warn('Error fetching requested leaves:', err);
          this.isLoading = false;
        }
      });
    } else if (this.userId) {
      // All other employees: count and list filtered strictly by the logged-in user
      this.leaveSub = this.leaveService.getLeavesByUser('Not', this.userId, '', 1, 50).subscribe({
        next: (res: any) => {
          const list: any[] = Array.isArray(res) ? res : (res?.items || []);
          // Count ONLY this user's pending leave requests
          const userPending = list.filter((l: any) => {
            const st = (l.status || '').toLowerCase().trim();
            return st === 'requested' || st === 'pending' || st === 'in review';
          });
          this.pendingLeaves = list.slice(0, 6);
          this.totalPendingLeavesCount = userPending.length;
          this.isLoading = false;
        },
        error: (err) => {
          console.warn('Error fetching user leaves:', err);
          this.isLoading = false;
        }
      });
    } else {
      this.isLoading = false;
    }
  }

  loadHolidays(): void {
    this.holidaySub?.unsubscribe();
    this.holidaySub = this.holidayService.getHolidays('', 1, 20).subscribe({
      next: (res: any) => {
        const items = res?.items || res || [];
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        this.upcomingHolidays = items
          .filter((h: any) => h?.date && new Date(h.date) >= today)
          .sort((a: any, b: any) => new Date(a.date).getTime() - new Date(b.date).getTime())
          .slice(0, 5);

        this.totalUpcomingHolidays = res?.count || this.upcomingHolidays.length;
      },
      error: (err) => {
        console.warn('Error loading holidays:', err);
      }
    });
  }

  loadBirthdays(): void {
    this.birthdaySub?.unsubscribe();
    this.birthdaySub = this.usersService.getBirthdays().subscribe({
      next: (res: any) => {
        const currentMonth = new Date().getMonth();
        this.birthdaysThisMonth = (res || [])
          .filter((item: any) => {
            if (!item?.dateOfBirth) return false;
            const d = new Date(item.dateOfBirth);
            return d.getMonth() === currentMonth;
          })
          .sort((a: any, b: any) => {
            const dayA = new Date(a.dateOfBirth).getDate();
            const dayB = new Date(b.dateOfBirth).getDate();
            return dayA - dayB;
          });
        this.birthdaysLoaded = true;
        this.refreshPublishedCelebrationWishes();
        this.checkAndAutoOpenCelebrationPopup();
      },
      error: (err) => {
        console.warn('Error loading birthdays:', err);
        this.birthdaysLoaded = true;
        this.refreshPublishedCelebrationWishes();
        this.checkAndAutoOpenCelebrationPopup();
      }
    });
  }

  loadJoinings(): void {
    this.joiningSub?.unsubscribe();
    this.joiningSub = this.usersService.getJoining().subscribe({
      next: (res: any) => {
        const currentMonth = new Date().getMonth();
        this.joiningsThisMonth = (res || [])
          .filter((item: any) => {
            if (!item?.dateOfJoining) return false;
            const d = new Date(item.dateOfJoining);
            return d.getMonth() === currentMonth;
          })
          .sort((a: any, b: any) => {
            const dayA = new Date(a.dateOfJoining).getDate();
            const dayB = new Date(b.dateOfJoining).getDate();
            return dayA - dayB;
          });

        if (this.birthdaysThisMonth.length === 0 && this.joiningsThisMonth.length > 0) {
          this.celebrationTab = 'anniversaries';
        }
        this.joiningsLoaded = true;
        this.refreshPublishedCelebrationWishes();
        this.checkAndAutoOpenCelebrationPopup();
      },
      error: (err) => {
        console.warn('Error loading joinings:', err);
        this.joiningsLoaded = true;
        this.refreshPublishedCelebrationWishes();
        this.checkAndAutoOpenCelebrationPopup();
      }
    });
  }

  mapEmpToPopupItem(emp: any, type: 'birthday' | 'anniversary'): CelebrationPopupItem {
    const wish = this.getCelebrationWish(emp);
    const name = emp.user?.name || 'Colleague';
    const years = type === 'anniversary' ? this.getAnniversaryYears(emp.dateOfJoining) : undefined;
    const defaultTitle =
      type === 'anniversary'
        ? `Happy ${years && years > 0 ? `${years} Year${years > 1 ? 's' : ''} ` : ''}Work Anniversary, ${name}! 🏆`
        : `Happy Birthday, ${name}! 🎂`;
    const defaultMessage =
      type === 'anniversary'
        ? `Congratulations on ${
            years && years > 0 ? `completing ${years} wonderful year${years > 1 ? 's' : ''}` : 'your journey'
          } with Onboard Aero Consultant! 🌟 Your dedication, hard work, and positive spirit make a lasting difference every day.`
        : `Wishing you a very Happy Birthday filled with joy, good health, and great achievements! 🎉 Thank you for being such a valued part of our team at Onboard Aero Consultant. Have a fantastic celebration!`;

    return {
      userId: emp.userId || emp.user?.id,
      name,
      empNo: emp.user?.empNo || '',
      email: emp.user?.email || '',
      avatarUrl: emp.user?.userImage || emp.user?.url || '',
      type,
      date: type === 'anniversary' ? emp.dateOfJoining : emp.dateOfBirth,
      years,
      isToday:
        type === 'anniversary'
          ? this.isTodayAnniversary(emp.dateOfJoining)
          : this.isTodayBirthday(emp.dateOfBirth),
      wishId: wish?.id,
      title: wish?.title || defaultTitle,
      message: wish?.message || defaultMessage,
      imageUrl: wish?.imageUrl || '',
      createdBy: wish?.createdBy || 'Team Onboard Aero Consultant'
    };
  }

  refreshPublishedCelebrationWishes(): void {
    const bdays = (this.birthdaysThisMonth || [])
      .filter((emp: any) => this.isTodayBirthday(emp.dateOfBirth))
      .map((emp: any) => this.mapEmpToPopupItem(emp, 'birthday'));

    const annivs = (this.joiningsThisMonth || [])
      .filter((emp: any) => this.isTodayAnniversary(emp.dateOfJoining))
      .map((emp: any) => this.mapEmpToPopupItem(emp, 'anniversary'));

    this.publishedCelebrationWishes = [...bdays, ...annivs].sort((a, b) => {
      if (a.imageUrl && !b.imageUrl) return -1;
      if (!a.imageUrl && b.imageUrl) return 1;
      return new Date(a.date).getDate() - new Date(b.date).getDate();
    });
  }

  private checkAndAutoOpenCelebrationPopup(): void {
    if (!this.birthdaysLoaded || !this.joiningsLoaded || this.hasAutoOpenedCelebrationPopup) {
      return;
    }

    const sessionKey = `oac_login_celebration_popup_shown_${this.userId || 'guest'}`;
    const explicitLoginTrigger = sessionStorage.getItem('oac_show_login_celebration_popup') === 'true';
    const alreadyShownInSession = sessionStorage.getItem(sessionKey) === 'true';

    if (!explicitLoginTrigger && alreadyShownInSession) {
      return;
    }

    if (this.publishedCelebrationWishes.length > 0) {
      this.hasAutoOpenedCelebrationPopup = true;
      sessionStorage.removeItem('oac_show_login_celebration_popup');
      sessionStorage.setItem(sessionKey, 'true');
      setTimeout(() => {
        this.openLoginWishViewPopup(0);
      }, 300);
    }
  }

  /**
   * Opens the View-Only popup shown when an employee logs in (or clicks a wish card on the dashboard).
   * Does NOT show image upload or text edit inputs.
   */
  openLoginWishViewPopup(initialIndex = 0): void {
    if (this.publishedCelebrationWishes.length === 0) {
      return;
    }

    this.dialog.open(CelebrationWishDialogComponent, {
      width: '660px',
      maxWidth: '95vw',
      panelClass: 'celebration-wish-modal-panel',
      autoFocus: false,
      data: {
        items: this.publishedCelebrationWishes,
        initialIndex,
        allowUploadAndEdit: false,
        canEdit: false,
        currentUserName: this.userName,
        currentUserDesignation: this.roleName,
        startInEditMode: false
      }
    });
  }

  /**
   * Opens the Upload Image & Edit Wish Text popup ONLY when clicking on a specific
   * birthday or anniversary row in the Team Celebrations list.
   */
  openRowWishEditor(emp: any, type: 'birthday' | 'anniversary'): void {
    if (!emp) return;
    const singleItem = this.mapEmpToPopupItem(emp, type);

    const dialogRef = this.dialog.open(CelebrationWishDialogComponent, {
      width: '660px',
      maxWidth: '95vw',
      panelClass: 'celebration-wish-modal-panel',
      autoFocus: false,
      data: {
        items: [singleItem],
        initialIndex: 0,
        allowUploadAndEdit: true,
        canEdit: true,
        currentUserName: this.userName,
        currentUserDesignation: this.roleName,
        startInEditMode: true
      }
    });

    dialogRef.afterClosed().subscribe((result) => {
      if (result?.updated) {
        this.loadBirthdays();
        this.loadJoinings();
        this.loadAnnouncements();
      }
    });
  }

  getCelebrationWish(emp: any): any {
    const wishes = emp?.user?.celebrationWishes;
    if (Array.isArray(wishes) && wishes.length > 0) {
      return wishes[0];
    }
    return null;
  }

  loadProbationDues(): void {
    this.probationSub?.unsubscribe();
    this.probationSub = this.usersService.getProbationDues().subscribe({
      next: (res: any) => {
        this.probationDues = (res || [])
          .sort((a: any, b: any) => {
            const dateA = a.probationEndDate || a.userPersonal?.probationEndDate || '';
            const dateB = b.probationEndDate || b.userPersonal?.probationEndDate || '';
            return new Date(dateA).getTime() - new Date(dateB).getTime();
          })
          .slice(0, 6);
      },
      error: (err) => {
        console.warn('Error loading probation dues:', err);
      }
    });
  }

  loadAnnouncements(): void {
    this.announcementSub?.unsubscribe();
    this.announcementSub = this.announcementsService.getAnnouncement('', true).subscribe({
      next: (res: Announcement[]) => {
        this.announcements = (res || [])
          .filter((item) => !this.announcementsService.isDismissed(item.id) && this.announcementsService.isAnnouncementActiveToday(item))
          .slice(0, 4);
      },
      error: (err) => {
        console.warn('Error loading announcements:', err);
      }
    });
  }

  dismissAnnouncement(item: Announcement, event: Event): void {
    event.stopPropagation();
    this.announcementsService.dismissAnnouncement(item.id);
    this.announcements = this.announcements.filter((a) => a.id !== item.id);

    const snackRef = this.snackBar.open('Announcement dismissed', 'Undo', {
      duration: 5000,
      horizontalPosition: 'end',
      verticalPosition: 'bottom'
    });

    snackRef.onAction().subscribe(() => {
      this.announcementsService.restoreAnnouncement(item.id);
      this.loadAnnouncements();
    });
  }

  refreshDashboard(): void {
    this.loadDashboardData();
    this.snackBar.open('Dashboard refreshed', 'Close', { duration: 2500 });
  }

  setCelebrationTab(tab: 'birthdays' | 'anniversaries'): void {
    this.celebrationTab = tab;
  }

  setDashboardTab(tab: 'overview' | 'matrix'): void {
    this.currentTab = tab;
  }

  // Formatting & UI Helpers
  getInitials(name?: string): string {
    if (!name) return 'U';
    const parts = name.trim().split(/\s+/);
    if (parts.length === 1) return parts[0].substring(0, 2).toUpperCase();
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  }

  isTodayBirthday(dateOfBirth: string | Date): boolean {
    if (!dateOfBirth) return false;
    const dob = new Date(dateOfBirth);
    const today = new Date();
    return dob.getDate() === today.getDate() && dob.getMonth() === today.getMonth();
  }

  isTodayAnniversary(dateOfJoining: string | Date): boolean {
    if (!dateOfJoining) return false;
    const doj = new Date(dateOfJoining);
    const today = new Date();
    return doj.getDate() === today.getDate() && doj.getMonth() === today.getMonth();
  }

  getAnniversaryYears(dateOfJoining: string | Date): number {
    if (!dateOfJoining) return 0;
    const d = new Date(dateOfJoining);
    const today = new Date();
    const years = today.getFullYear() - d.getFullYear();
    return Math.max(0, years);
  }

  getAnniversaryLabel(dateOfJoining: string | Date): string {
    const years = this.getAnniversaryYears(dateOfJoining);
    if (years <= 0) return 'New Joiner';
    if (years === 1) return '1 Year';
    return `${years} Years`;
  }

  getLeaveTypeIcon(typeName?: string): string {
    switch (typeName?.trim()) {
      case 'Casual Leave':
        return 'beach_access';
      case 'Sick Leave':
        return 'medical_services';
      case 'Comp Off':
        return 'event_repeat';
      case 'Maternity Leave':
        return 'child_friendly';
      case 'LOP':
        return 'do_not_disturb_on';
      default:
        return 'event_available';
    }
  }

  getLeaveTypeTileClass(typeName?: string): string {
    switch (typeName?.trim()) {
      case 'Casual Leave':
        return 'tile-casual';
      case 'Sick Leave':
        return 'tile-sick';
      case 'Comp Off':
        return 'tile-compoff';
      case 'Maternity Leave':
        return 'tile-maternity';
      case 'LOP':
        return 'tile-lop';
      default:
        return 'tile-default';
    }
  }

  getHolidayMonth(dateStr: string | Date): string {
    if (!dateStr) return '';
    return new Date(dateStr).toLocaleString('en-US', { month: 'short' }).toUpperCase();
  }

  getHolidayDay(dateStr: string | Date): string {
    if (!dateStr) return '';
    return new Date(dateStr).getDate().toString();
  }

  getHolidayWeekday(dateStr: string | Date): string {
    if (!dateStr) return '';
    return new Date(dateStr).toLocaleString('en-US', { weekday: 'short' });
  }

  getProbationDate(emp: any): any {
    return emp?.probationEndDate || emp?.userPersonal?.probationEndDate || null;
  }

  getDaysRemaining(dateStr: string | Date): number {
    if (!dateStr) return 0;
    const target = new Date(dateStr).getTime();
    const now = new Date().setHours(0, 0, 0, 0);
    return Math.ceil((target - now) / (1000 * 60 * 60 * 24));
  }

  getProbationBadgeClass(days: number): string {
    if (days < 0) return 'status-overdue';
    if (days <= 7) return 'status-urgent';
    if (days <= 30) return 'status-warning';
    return 'status-normal';
  }

  getProbationText(days: number): string {
    if (days < 0) return `${Math.abs(days)}d Overdue`;
    if (days === 0) return 'Due Today';
    if (days === 1) return 'Due Tomorrow';
    return `In ${days} days`;
  }

  getLeaveDuration(startDate: string, endDate: string): number {
    if (!startDate || !endDate) return 1;
    const s = new Date(startDate);
    const e = new Date(endDate);
    const diff = Math.ceil(Math.abs(e.getTime() - s.getTime()) / (1000 * 60 * 60 * 24)) + 1;
    return diff || 1;
  }

  getLeaveStatusClass(status?: string): string {
    switch ((status || '').toLowerCase()) {
      case 'approved': return 'leave-status-approved';
      case 'rejected': return 'leave-status-rejected';
      case 'cancelled': return 'leave-status-cancelled';
      default: return 'leave-status-pending';
    }
  }

  getAnnouncementTypeIcon(type?: string): string {
    switch ((type || '').toLowerCase()) {
      case 'success': return 'check_circle';
      case 'warning': return 'warning';
      case 'error': return 'campaign';
      default: return 'info';
    }
  }

  getAnnouncementTypeClass(type?: string): string {
    switch ((type || '').toLowerCase()) {
      case 'success': return 'badge-success';
      case 'warning': return 'badge-warning';
      case 'error': return 'badge-error';
      default: return 'badge-info';
    }
  }

  getFileUrl(url?: string): string {
    if (!url) return '';
    if (url.startsWith('data:') || url.startsWith('http://') || url.startsWith('https://')) return url;
    return `${this.s3Url}${url}`;
  }

  openDraft(userId: number): void {
    if (userId) {
      this.router.navigate(['login/mail/birthday-draft', userId]);
    }
  }

  openLeaveDetail(id: number): void {
    if (id) {
      this.router.navigate(['/login/leave/open', id]);
    }
  }

  loadFinanceExpenses(): void {
    if (!this.canApproveExpenses) {
      this.pendingExpensesForFinance = [];
      this.pendingFinanceExpensesCount = 0;
      return;
    }
    this.expenseSub?.unsubscribe();
    this.expenseSub = this.expensesService.getExpense().subscribe({
      next: (res: any) => {
        const list: any[] = res?.data || (Array.isArray(res) ? res : []);
        this.totalExpensesCount = list.length;

        // Filter expenses requiring this user's approval:
        this.pendingExpensesForFinance = list.filter((exp: any) => {
          const modeLower = (exp.paymentMode || '').toLowerCase().trim();
          const isCard = modeLower === 'card';
          const isPettyCash = modeLower === 'petty cash' || modeLower === 'pettycash';
          const s = (exp.status || '').toLowerCase().trim();
          const isPending = s.includes('pending') || s === 'generated';

          if (!isPending) return false;

          if (this.isSuperAdmin) {
            return !isPettyCash; // Super admin can approve both card and non-card
          } else if (this.isOperationsRole) {
            return isCard; // Operations Manager approves card
          } else if (this.isFinanceRole) {
            return !isCard && !isPettyCash; // Finance Manager approves non-card & non-pettyCash
          }
          return false;
        });
        this.pendingFinanceExpensesCount = this.pendingExpensesForFinance.length;
      },
      error: (err) => console.warn('Could not load finance expenses for dashboard:', err)
    });
  }

  openExpenseDetail(id: number): void {
    if (!id) return;
    this.router.navigateByUrl(`/login/viewApproval/openexpenses/${id}`);
  }

  approveExpenseDirectly(expense: any, event?: Event): void {
    if (event) event.stopPropagation();
    const dialogRef = this.dialog.open(VerificationDialogueComponent, {
      data: {
        invoiceNo: expense.expenseNumber || `EXP-${expense.id}`,
        status: 'FM Approved'
      }
    });

    dialogRef.afterClosed().subscribe((result: any) => {
      if (result) {
        this.isProcessingExpense = true;
        const data = {
          status: 'FM Approved',
          value: 'approved',
          expenseId: expense.id,
          remarks: result.remarks || ''
        };
        this.expensesService.updateStatus(data).subscribe({
          next: () => {
            this.snackBar.open(`Expense ${expense.expenseNumber || ('EXP-' + expense.id)}: Amount Transferred successfully!`, 'Close', { duration: 3000 });
            this.loadFinanceExpenses();
            this.isProcessingExpense = false;
          },
          error: (err) => {
            this.snackBar.open(err.error?.message || 'Error updating expense status', 'Close', { duration: 3000 });
            this.isProcessingExpense = false;
          }
        });
      }
    });
  }

  rejectExpenseDirectly(expense: any, event?: Event): void {
    if (event) event.stopPropagation();
    const dialogRef = this.dialog.open(VerificationDialogueComponent, {
      data: {
        invoiceNo: expense.expenseNumber || `EXP-${expense.id}`,
        status: 'FM Rejected'
      }
    });

    dialogRef.afterClosed().subscribe((result: any) => {
      if (result) {
        this.isProcessingExpense = true;
        const data = {
          status: 'FM Rejected',
          value: 'rejected',
          expenseId: expense.id,
          remarks: result.remarks || ''
        };
        this.expensesService.updateStatus(data).subscribe({
          next: () => {
            this.snackBar.open(`Expense ${expense.expenseNumber || ('EXP-' + expense.id)} reverted to employee.`, 'Close', { duration: 3000 });
            this.loadFinanceExpenses();
            this.isProcessingExpense = false;
          },
          error: (err) => {
            this.snackBar.open(err.error?.message || 'Error rejecting expense', 'Close', { duration: 3000 });
            this.isProcessingExpense = false;
          }
        });
      }
    });
  }

  navigateTo(path: string): void {
    this.router.navigateByUrl(path);
  }

  ngOnDestroy(): void {
    this.roleSub?.unsubscribe();
    this.userSub?.unsubscribe();
    this.reportingManagerSub?.unsubscribe();
    this.leaveSub?.unsubscribe();
    this.holidaySub?.unsubscribe();
    this.birthdaySub?.unsubscribe();
    this.joiningSub?.unsubscribe();
    this.probationSub?.unsubscribe();
    this.announcementSub?.unsubscribe();
    this.dismissedSub?.unsubscribe();
    this.userLeaveSub?.unsubscribe();
    this.notifSub?.unsubscribe();
    this.expenseSub?.unsubscribe();
  }
}
