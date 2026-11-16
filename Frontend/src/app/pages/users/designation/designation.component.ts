import { Component, inject, OnDestroy, OnInit, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatDialog } from '@angular/material/dialog';
import { MatPaginator, MatPaginatorModule, PageEvent } from '@angular/material/paginator';
import { MatSnackBar } from '@angular/material/snack-bar';
import { RoleService } from '@services/role.service';
import { Subscription } from 'rxjs';
import { DeleteDialogueComponent } from '../../../theme/components/delete-dialogue/delete-dialogue.component';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatCardModule } from '@angular/material/card';
import { Designation } from '../../../common/interfaces/users/designation';
import { AddDesignationComponent } from './add-designation/add-designation.component';

@Component({
  selector: 'app-designation',
  standalone: true,
  imports: [
    CommonModule,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatFormFieldModule,
    MatInputModule,
    MatPaginatorModule,
    MatTooltipModule,
    MatProgressBarModule
  ],
  templateUrl: './designation.component.html',
  styleUrl: './designation.component.scss'
})
export class DesignationComponent implements OnInit, OnDestroy {
  private snackBar = inject(MatSnackBar);
  private roleService = inject(RoleService);
  private dialog = inject(MatDialog);

  roles: Designation[] = [];
  roleSub!: Subscription;
  deleteSub!: Subscription;
  dialogSub!: Subscription;

  searchText: string = '';
  isLoading: boolean = false;
  pageSize: number = 10;
  currentPage: number = 1;
  totalItems: number = 0;

  @ViewChild(MatPaginator) paginator!: MatPaginator;

  ngOnInit(): void {
    this.getRoles();
  }

  getRoles(): void {
    this.isLoading = true;
    this.roleSub?.unsubscribe();
    this.roleSub = this.roleService.getDesignation(this.searchText, this.currentPage, this.pageSize).subscribe({
      next: (res: any) => {
        this.roles = res?.items || [];
        this.totalItems = res?.count || 0;
        this.isLoading = false;
      },
      error: () => {
        this.isLoading = false;
        this.snackBar.open('Failed to load designations', 'Close', { duration: 3000 });
      }
    });
  }

  onSearchInput(event: Event): void {
    this.searchText = (event.target as HTMLInputElement).value;
    this.currentPage = 1;
    this.getRoles();
  }

  clearSearch(): void {
    this.searchText = '';
    this.currentPage = 1;
    this.getRoles();
  }

  deleteRole(id: number): void {
    const dialogRef = this.dialog.open(DeleteDialogueComponent, {
      width: '400px'
    });
    this.dialogSub = dialogRef.afterClosed().subscribe((confirmed: boolean) => {
      if (confirmed) {
        this.deleteSub = this.roleService.deleteDesignation(id).subscribe({
          next: () => {
            this.snackBar.open('Designation deleted successfully', '', { duration: 3000 });
            this.getRoles();
          },
          error: (err) => {
            this.snackBar.open(err?.error?.message || 'Failed to delete designation', 'Close', { duration: 3000 });
          }
        });
      }
    });
  }

  openRoleDialog(role: Designation | null): void {
    const dialogRef = this.dialog.open(AddDesignationComponent, {
      data: role,
      width: '480px',
      autoFocus: false
    });
    this.dialogSub = dialogRef.afterClosed().subscribe(() => {
      this.getRoles();
    });
  }

  onPageChange(event: PageEvent): void {
    this.currentPage = event.pageIndex + 1;
    this.pageSize = event.pageSize;
    this.getRoles();
  }

  ngOnDestroy(): void {
    this.roleSub?.unsubscribe();
    this.deleteSub?.unsubscribe();
    this.dialogSub?.unsubscribe();
  }
}
