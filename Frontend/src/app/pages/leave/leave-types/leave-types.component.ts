/* eslint-disable @typescript-eslint/no-explicit-any */
import { Component, inject, OnDestroy, OnInit, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatTableModule } from '@angular/material/table';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatDialog } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { Router } from '@angular/router';
import { MatPaginator, MatPaginatorModule, PageEvent } from '@angular/material/paginator';
import { Subscription } from 'rxjs';
import { DeleteDialogueComponent } from '../../../theme/components/delete-dialogue/delete-dialogue.component';
import { AddLeaveTypeDialogueComponent } from './add-leave-type-dialogue/add-leave-type-dialogue.component';
import { NewLeaveService } from '@services/new-leave.service';
import { LeaveType } from '../../../common/interfaces/leaves/leaveType';

@Component({
  selector: 'app-leave-types',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatTableModule,
    MatInputModule,
    MatButtonModule,
    MatIconModule,
    MatFormFieldModule,
    MatProgressSpinnerModule,
    MatTooltipModule,
    MatPaginatorModule
  ],
  templateUrl: './leave-types.component.html',
  styleUrl: './leave-types.component.scss'
})
export class LeaveTypesComponent implements OnInit, OnDestroy {
  private readonly dialog = inject(MatDialog);
  private readonly leaveService = inject(NewLeaveService);
  private readonly snackBar = inject(MatSnackBar);
  private readonly router = inject(Router);

  @ViewChild(MatPaginator) paginator!: MatPaginator;

  public leaveTypes: LeaveType[] = [];
  public isLoading: boolean = true;
  public searchText: string = '';

  public pageSize: number = 10;
  public currentPage: number = 1;
  public totalItems: number = 0;

  private dataSub?: Subscription;
  private actionSub?: Subscription;

  public readonly coreLeaveTypes: string[] = ['Casual Leave', 'Sick Leave', 'Comp Off', 'LOP', 'Maternity Leave'];

  ngOnInit(): void {
    this.getLeaveTypes();
  }

  ngOnDestroy(): void {
    this.dataSub?.unsubscribe();
    this.actionSub?.unsubscribe();
  }

  public getLeaveTypes(): void {
    this.isLoading = true;
    const query = this.searchText ? this.searchText.trim() : undefined;

    this.dataSub = this.leaveService.getLeaveType(query, this.currentPage, this.pageSize).subscribe({
      next: (res: any) => {
        if (res && Array.isArray(res.items)) {
          this.leaveTypes = res.items;
          this.totalItems = res.count || 0;
        } else if (Array.isArray(res)) {
          this.leaveTypes = res;
          this.totalItems = res.length;
        } else {
          this.leaveTypes = [];
          this.totalItems = 0;
        }
        this.isLoading = false;
      },
      error: (err: any) => {
        console.error('Error fetching leave types:', err);
        this.isLoading = false;
        this.snackBar.open('Failed to load leave types', 'Close', { duration: 3000 });
      }
    });
  }

  public onSearch(event: Event): void {
    this.searchText = (event.target as HTMLInputElement).value;
    this.currentPage = 1;
    this.getLeaveTypes();
  }

  public clearSearch(): void {
    this.searchText = '';
    this.currentPage = 1;
    this.getLeaveTypes();
  }

  public isCoreType(name?: string): boolean {
    if (!name) return false;
    return this.coreLeaveTypes.includes(name.trim());
  }

  public getLeaveTypeIcon(name?: string): string {
    switch (name?.trim()) {
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
        return 'category';
    }
  }

  public getBadgeClass(name?: string): string {
    switch (name?.trim()) {
      case 'Casual Leave':
        return 'badge-casual';
      case 'Sick Leave':
        return 'badge-sick';
      case 'Comp Off':
        return 'badge-compoff';
      case 'Maternity Leave':
        return 'badge-maternity';
      case 'LOP':
        return 'badge-lop';
      default:
        return 'badge-custom';
    }
  }

  public getCategoryLabel(name?: string): string {
    if (this.isCoreType(name)) {
      return 'Core Policy';
    }
    return 'Custom Type';
  }

  public openLeaveTypeDialog(leaveType: LeaveType | null = null): void {
    const dialogRef = this.dialog.open(AddLeaveTypeDialogueComponent, {
      data: leaveType,
      width: '520px',
      maxWidth: '95vw',
      panelClass: 'modern-leave-dialog'
    });

    dialogRef.afterClosed().subscribe((saved: boolean) => {
      if (saved) {
        this.getLeaveTypes();
      }
    });
  }

  public openGrantLeaveDialog(): void {
    this.router.navigate(['/login/leave/leave-types/grant']);
  }

  public deleteLeaveType(leaveType: LeaveType): void {
    if (this.isCoreType(leaveType.leaveTypeName)) {
      this.snackBar.open(
        `'${leaveType.leaveTypeName}' is a core system leave type and cannot be deleted.`,
        'Understood',
        { duration: 4000 }
      );
      return;
    }

    const dialogRef = this.dialog.open(DeleteDialogueComponent, {
      data: {
        title: 'Delete Leave Type',
        message: `Are you sure you want to delete leave type '${leaveType.leaveTypeName}'? This action cannot be undone.`
      }
    });

    dialogRef.afterClosed().subscribe((confirmed: boolean) => {
      if (confirmed) {
        this.actionSub = this.leaveService.deleteLeaveType(leaveType.id).subscribe({
          next: () => {
            this.snackBar.open(`Leave type '${leaveType.leaveTypeName}' deleted successfully.`, 'Close', { duration: 3000 });
            this.getLeaveTypes();
          },
          error: (err: any) => {
            console.error('Delete leave type error:', err);
            this.snackBar.open(err?.error?.message || 'Failed to delete leave type.', 'Close', { duration: 4000 });
          }
        });
      }
    });
  }

  public onPageChange(event: PageEvent): void {
    this.currentPage = event.pageIndex + 1;
    this.pageSize = event.pageSize;
    this.getLeaveTypes();
  }
}
