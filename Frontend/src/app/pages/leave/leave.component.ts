/* eslint-disable @typescript-eslint/no-explicit-any */
import { Component, inject, OnDestroy, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { Subscription } from 'rxjs';

import { MatButtonToggleModule } from '@angular/material/button-toggle';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatPaginatorModule, PageEvent } from '@angular/material/paginator';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatTabsModule } from '@angular/material/tabs';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatDialog } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';

import { SafePipe } from '../../common/pipes/safe.pipe';
import { Leave } from '../../common/interfaces/leaves/leave';
import { NoteDialogComponent } from './note-dialog/note-dialog.component';
import { UplaodDialogComponent } from './uplaod-dialog/uplaod-dialog.component';
import { DeleteDialogueComponent } from '../../theme/components/delete-dialogue/delete-dialogue.component';
import { NewLeaveService } from '@services/new-leave.service';
import { RoleService } from '@services/role.service';
import { UsersService } from '@services/users.service';
import { Role } from '../../common/interfaces/users/role';

@Component({
  selector: 'app-leave',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    RouterModule,
    MatButtonToggleModule,
    MatFormFieldModule,
    MatIconModule,
    MatPaginatorModule,
    MatInputModule,
    MatButtonModule,
    MatProgressSpinnerModule,
    MatTabsModule,
    MatTooltipModule,
    SafePipe
  ],
  templateUrl: './leave.component.html',
  styleUrl: './leave.component.scss'
})
export class LeaveComponent implements OnInit, OnDestroy {
  private readonly leaveService = inject(NewLeaveService);
  private readonly roleService = inject(RoleService);
  private readonly userService = inject(UsersService);
  private readonly snackbar = inject(MatSnackBar);
  private readonly dialog = inject(MatDialog);
  private readonly router = inject(Router);

  private roleId!: number;
  private id!: number;

  public value: string = 'Not';
  public roleName: string = '';
  public employeeStat: boolean = false;
  public userId: number = 0;

  // Pagination & Search
  public pageSize: number = 10;
  public currentPage: number = 1;
  public totalItems: number = 0;
  public searchText: string = '';

  // Data
  public leaves: Leave[] = [];
  public filteredLeaves: Leave[] = [];
  public isLoading: boolean = false;
  public isButtonVisible: boolean = false;
  public selectedStatusFilter: string = 'ALL';

  // Subscriptions
  private roleSub?: Subscription;
  private leaveSub?: Subscription;
  private leaveBalSub?: Subscription;
  private deleteSub?: Subscription;
  private deleteFileSub?: Subscription;
  private dialogSub?: Subscription;
  private fileSub?: Subscription;
  private approveSub?: Subscription;
  private rejectSub?: Subscription;

  ngOnInit(): void {
    const token: any = localStorage.getItem('token');
    if (token) {
      try {
        const user = JSON.parse(token);
        this.id = user.id;
        this.roleId = user.role;
      } catch (e) {
        console.error('Failed to parse user token', e);
      }
    }

    this.value = 'Not';
    this.getRoleById(this.roleId, this.id);
  }

  ngOnDestroy(): void {
    this.roleSub?.unsubscribe();
    this.leaveSub?.unsubscribe();
    this.leaveBalSub?.unsubscribe();
    this.deleteSub?.unsubscribe();
    this.deleteFileSub?.unsubscribe();
    this.dialogSub?.unsubscribe();
    this.fileSub?.unsubscribe();
    this.approveSub?.unsubscribe();
    this.rejectSub?.unsubscribe();
  }

  public onTabChange(i: number): void {
    this.currentPage = 1;
    this.selectedStatusFilter = 'ALL';
    if (i === 1) {
      this.value = 'Locked';
    } else {
      this.value = 'Not';
    }
    this.getRoleById(this.roleId, this.id);
  }

  public getRoleById(id: number, userId: number): void {
    this.isLoading = true;
    this.userService.getUserById(userId).subscribe({
      next: (res) => {
        const desig = (res.userPosition?.designation?.designationName || '').toLowerCase().trim();
        const isSuperAdminOrHr = desig === 'hr & admin assistant' ||
                                 desig === 'hr & administration manager' ||
                                 desig === 'hr & admin manager' ||
                                 desig.includes('super admin');

        if (isSuperAdminOrHr) {
          this.employeeStat = false;
          this.getLeaves();
        } else {
          this.roleSub = this.roleService.getRoleById(id).subscribe({
            next: (roleRes: Role) => {
              this.roleName = roleRes.abbreviation;
              if (this.roleName !== 'HR Admin' && this.roleName !== 'Super Admin' && !isSuperAdminOrHr) {
                this.employeeStat = true;
                this.userId = userId;
                this.getLeaveByUser(userId);
                this.getUserLeaves(userId);
              } else {
                this.employeeStat = false;
                this.getLeaves();
              }
            },
            error: () => {
              this.isLoading = false;
            }
          });
        }
      },
      error: () => {
        this.isLoading = false;
      }
    });
  }

  public getUserLeaves(id: number): void {
    this.leaveService.getUserLeaveByUser(id).subscribe();
  }

  public getLeaves(): void {
    this.isLoading = true;
    this.leaveSub = this.leaveService
      .getLeavesPaginated(this.value, this.searchText, this.currentPage, this.pageSize)
      .subscribe({
        next: (res: any) => {
          this.leaves = res.items || [];
          this.applyStatusFilter();
          this.totalItems = res.count || 0;
          this.isLoading = false;
        },
        error: (err: any) => {
          console.error(err);
          this.isLoading = false;
          this.snackbar.open('Failed to load leave records', 'Close', { duration: 3000 });
        }
      });
  }

  private getLeaveByUser(id: number): void {
    if (!id) {
      this.isLoading = false;
      return;
    }
    this.isLoading = true;
    this.leaveSub = this.leaveService
      .getLeavesByUser(this.value, id, this.searchText, this.currentPage, this.pageSize)
      .subscribe({
        next: (res: any) => {
          this.leaves = res.items || [];
          this.applyStatusFilter();
          this.totalItems = res.count || 0;

          const totalSickLeave = this.leaves
            .filter((leave) => leave.leaveType?.leaveTypeName === 'Sick Leave')
            .reduce((total, leave) => total + (leave.noOfDays || 0), 0);

          this.isButtonVisible = totalSickLeave >= 3;
          this.isLoading = false;
        },
        error: () => {
          this.isLoading = false;
          this.snackbar.open('Failed to load leave data', 'Close', { duration: 3000 });
        }
      });
  }

  // --- Filtering & Search ---

  public search(event: Event): void {
    this.searchText = (event.target as HTMLInputElement).value.trim();
    this.currentPage = 1;
    if (this.roleName === 'HR Admin' || this.roleName === 'Super Admin' || !this.employeeStat) {
      this.getLeaves();
    } else {
      this.getLeaveByUser(this.userId);
    }
  }

  public clearSearch(): void {
    this.searchText = '';
    this.currentPage = 1;
    if (this.roleName === 'HR Admin' || this.roleName === 'Super Admin' || !this.employeeStat) {
      this.getLeaves();
    } else {
      this.getLeaveByUser(this.userId);
    }
  }

  public setStatusFilter(status: string): void {
    this.selectedStatusFilter = status;
    this.applyStatusFilter();
  }

  private applyStatusFilter(): void {
    if (this.selectedStatusFilter === 'ALL') {
      this.filteredLeaves = [...this.leaves];
      return;
    }

    if (this.selectedStatusFilter === 'APPROVED') {
      this.filteredLeaves = this.leaves.filter(
        (l) =>
          (l.status === 'Approved' || l.status === 'AdminApproved') &&
          !(l.notes && l.notes.includes('Penalty') && !l.notes.includes('Waived'))
      );
    } else if (this.selectedStatusFilter === 'PENDING') {
      this.filteredLeaves = this.leaves.filter(
        (l) => l.status === 'Requested' || l.status === 'Pending'
      );
    } else if (this.selectedStatusFilter === 'REJECTED') {
      this.filteredLeaves = this.leaves.filter((l) => l.status === 'Rejected');
    } else if (this.selectedStatusFilter === 'PENALTY') {
      this.filteredLeaves = this.leaves.filter(
        (l) =>
          (l.penaltyLOP && l.penaltyLOP > 0 && !l.notes?.includes('Waived')) ||
          (l.notes && l.notes.includes('Penalty') && !l.notes.includes('Waived'))
      );
    }
  }

  // --- Computed Stats ---

  public get totalApproved(): number {
    return this.leaves.filter(
      (l) =>
        (l.status === 'Approved' || l.status === 'AdminApproved') &&
        !(l.notes && l.notes.includes('Penalty') && !l.notes.includes('Waived'))
    ).length;
  }

  public get totalPending(): number {
    return this.leaves.filter((l) => l.status === 'Requested' || l.status === 'Pending').length;
  }

  public get totalRejected(): number {
    return this.leaves.filter((l) => l.status === 'Rejected').length;
  }

  public get totalPenalty(): number {
    return this.leaves.filter(
      (l) =>
        (l.penaltyLOP && l.penaltyLOP > 0 && !l.notes?.includes('Waived')) ||
        (l.notes && l.notes.includes('Penalty') && !l.notes.includes('Waived'))
    ).length;
  }

  // --- Style & Badge Helpers ---

  public getStatusBadgeClass(item: Leave): string {
    if (item.notes && item.notes.includes('Penalty') && !item.notes.includes('Waived')) {
      return 'badge-status-penalty';
    }
    const status = (item.status || '').toLowerCase();
    if (status === 'approved' || status === 'adminapproved') {
      return 'badge-status-approved';
    }
    if (status === 'rejected') {
      return 'badge-status-rejected';
    }
    if (status === 'locked') {
      return 'badge-status-locked';
    }
    if (status === 'unapproved') {
      return 'badge-status-unapproved';
    }
    return 'badge-status-pending';
  }

  public getStatusLabel(item: Leave): string {
    if (item.notes && item.notes.includes('Penalty') && !item.notes.includes('Waived')) {
      return 'LOP (Penalty)';
    }
    if (item.status === 'AdminApproved') return 'Admin Approved';
    return item.status || 'Pending';
  }

  public getStatusIcon(item: Leave): string {
    if (item.notes && item.notes.includes('Penalty') && !item.notes.includes('Waived')) {
      return 'warning';
    }
    const status = (item.status || '').toLowerCase();
    if (status === 'approved' || status === 'adminapproved') {
      return 'check_circle';
    }
    if (status === 'rejected') {
      return 'cancel';
    }
    if (status === 'locked') {
      return 'lock';
    }
    if (status === 'unapproved') {
      return 'person_off';
    }
    return 'hourglass_top';
  }

  public getLeaveTypeBadgeClass(name?: string): string {
    const lower = (name || '').toLowerCase();
    if (lower.includes('casual')) return 'badge-type-casual';
    if (lower.includes('sick')) return 'badge-type-sick';
    if (lower.includes('comp')) return 'badge-type-compoff';
    if (lower.includes('lop')) return 'badge-type-lop';
    if (lower.includes('materni') || lower.includes('paterni')) return 'badge-type-parental';
    return 'badge-type-custom';
  }

  public getLeaveTypeIcon(name?: string): string {
    const lower = (name || '').toLowerCase();
    if (lower.includes('casual')) return 'beach_access';
    if (lower.includes('sick')) return 'medical_services';
    if (lower.includes('comp')) return 'event_repeat';
    if (lower.includes('lop')) return 'do_not_disturb_on';
    if (lower.includes('materni')) return 'child_friendly';
    return 'category';
  }

  public getUserInitials(name?: string): string {
    if (!name) return 'EMP';
    const parts = name.trim().split(/\s+/);
    if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  }

  // --- Penalty Management Actions ---

  public removePenalty(item: any): void {
    const confirmAction = confirm('Are you sure you want to remove the penalty? This will reset the LOP penalty to 0.');
    if (confirmAction) {
      this.leaveService.removePenalty(item.id).subscribe({
        next: () => {
          this.snackbar.open('Penalty removed successfully', 'Close', { duration: 3000 });
          this.getLeaves();
        },
        error: (err: any) => {
          console.error(err);
          this.snackbar.open('Error removing penalty: ' + (err.error?.message || err.message), 'Close', { duration: 3000 });
        }
      });
    }
  }

  public waiveApprovedPenalty(item: any): void {
    const confirmAction = confirm(`This will decrease the user's LOP count by ${item.penaltyLOP} day(s). Proceed?`);
    if (confirmAction) {
      this.leaveService.removeApprovedPenalty(item.id).subscribe({
        next: () => {
          this.snackbar.open('LOP balance adjusted successfully', 'Close', { duration: 3000 });
          this.getLeaves();
        },
        error: (err: any) => {
          this.snackbar.open('Error: ' + (err.error?.message || err.message), 'Close', { duration: 3000 });
        }
      });
    }
  }

  // --- Approval Dialogs ---

  public openDialog(action: string, leaveId: number): void {
    if (action === 'reject' || action === 'unapproved') {
      this.openNoteDialog(action, leaveId);
    } else if (action === 'approve') {
      this.leaveBalSub = this.leaveService.getLeaveBalance(leaveId).subscribe({
        next: (res: any) => {
          if (res.leaveType === 'LOP' || res.isSufficient) {
            this.openNoteDialog(action, leaveId);
          } else {
            this.snackbar.open('Insufficient leave balance. Cannot approve.', 'Close', { duration: 3000 });
          }
        },
        error: () => {
          this.snackbar.open('Error checking leave balance.', 'Close', { duration: 3000 });
        }
      });
    }
  }

  private openNoteDialog(action: string, leaveId: number): void {
    let dialogHeading = 'Note';
    if (action === 'approve') dialogHeading = 'Approve Note';
    else if (action === 'unapproved') dialogHeading = 'Unapproved (LOP) Note';
    else if (action === 'reject') dialogHeading = 'Reject Note';

    const dialogRef = this.dialog.open(NoteDialogComponent, {
      data: {
        action,
        leaveId,
        heading: dialogHeading
      }
    });

    this.dialogSub = dialogRef.afterClosed().subscribe((note) => {
      if (note !== false) {
        if (action === 'approve') {
          this.approveLeave(leaveId, note);
        } else if (action === 'unapproved') {
          this.processUnapprovedLeave(leaveId, note);
        } else {
          this.rejectLeave(leaveId, note);
        }
      } else {
        this.isLoading = false;
      }
    });
  }

  private processUnapprovedLeave(leaveId: number, note: any): void {
    const payload = {
      adminNotes: note,
      status: 'Unapproved'
    };

    this.leaveService.updateLeaveStatus(leaveId, payload).subscribe({
      next: () => {
        this.snackbar.open('Leave approved with Penalty (LOP)', 'Close', { duration: 3000 });
        if (this.roleName !== 'HR Admin' && this.roleName !== 'Super Admin' && this.employeeStat) {
          this.getLeaveByUser(this.userId);
        } else {
          this.getLeaves();
        }
      },
      error: () => {
        this.snackbar.open('Error processing request', 'Close', { duration: 3000 });
      }
    });
  }

  public approveLeave(leaveId: any, note: string): void {
    this.isLoading = true;
    const approvalData = { leaveId: leaveId, adminNotes: note };
    this.approveSub = this.leaveService.updateApproveLeaveStatus(approvalData).subscribe({
      next: () => {
        this.isLoading = false;
        this.snackbar.open('Leave approved successfully', 'Close', { duration: 3000 });
        if (this.roleName !== 'HR Admin' && this.roleName !== 'Super Admin' && this.employeeStat) {
          this.getLeaveByUser(this.userId);
        } else {
          this.getLeaves();
        }
      },
      error: () => {
        this.isLoading = false;
        this.snackbar.open('Failed to approve leave', 'Close', { duration: 3000 });
      }
    });
  }

  public rejectLeave(leaveId: any, note: string): void {
    this.isLoading = true;
    const rejectionData = { leaveId: leaveId, adminNotes: note };
    this.rejectSub = this.leaveService.updateRejectLeaveStatus(rejectionData).subscribe({
      next: () => {
        this.isLoading = false;
        this.snackbar.open('Leave rejected successfully', 'Close', { duration: 3000 });
        if (this.roleName !== 'HR Admin' && this.roleName !== 'Super Admin' && this.employeeStat) {
          this.getLeaveByUser(this.userId);
        } else {
          this.getLeaves();
        }
      },
      error: () => {
        this.isLoading = false;
        this.snackbar.open('Failed to reject leave', 'Close', { duration: 3000 });
      }
    });
  }

  // --- Document Upload ---

  public upload(action: string, leaveId: number): void {
    const dialogRef = this.dialog.open(UplaodDialogComponent, {
      data: { leaveId },
      width: '400px'
    });

    this.dialogSub = dialogRef.afterClosed().subscribe((result) => {
      if (result && result.fileUrl) {
        this.updateLeaveFileUrl(leaveId, result.fileUrl);
      }
    });
  }

  public updateLeaveFileUrl(leaveId: number, fileUrl: string): void {
    this.fileSub = this.leaveService.updateLeaveFileUrl(leaveId, fileUrl).subscribe({
      next: () => {
        if (this.roleName !== 'HR Admin' && this.roleName !== 'Super Admin' && this.employeeStat) {
          this.getLeaveByUser(this.userId);
        } else {
          this.getLeaves();
        }
      }
    });
  }

  // --- Edit & Delete ---

  public onEditLeave(leaveId: number): void {
    this.router.navigate([`/login/leave/edit/${leaveId}`]);
  }

  public onDeleteLeave(leaveId: number): void {
    const dialogRef = this.dialog.open(DeleteDialogueComponent, {
      data: { leaveId: leaveId }
    });

    this.dialogSub = dialogRef.afterClosed().subscribe((result) => {
      if (result === true) {
        this.isLoading = true;
        this.deleteSub = this.leaveService.deleteUntakenLeave(leaveId).subscribe({
          next: () => {
            this.isLoading = false;
            this.snackbar.open('Leave deleted successfully', 'Close', { duration: 3000 });
            if (this.roleName !== 'HR Admin' && this.roleName !== 'Super Admin' && this.employeeStat) {
              this.getLeaveByUser(this.userId);
            } else {
              this.getLeaves();
            }
          },
          error: (err: any) => {
            this.isLoading = false;
            this.snackbar.open(err.error?.message || 'Failed to delete leave', 'Close', { duration: 3000 });
          }
        });
      }
    });
  }

  public onPageChange(event: PageEvent): void {
    this.currentPage = event.pageIndex + 1;
    this.pageSize = event.pageSize;
    if (this.roleName !== 'HR Admin' && this.roleName !== 'Super Admin' && this.employeeStat) {
      this.getLeaveByUser(this.userId);
    } else {
      this.getLeaves();
    }
  }

  public openCalendar(): void {
    this.router.navigate([`/login/leave/add`]);
  }

  public openLeaveCalendar(): void {
    this.router.navigate([`/login/leave/leave-calendar`]);
  }
}
