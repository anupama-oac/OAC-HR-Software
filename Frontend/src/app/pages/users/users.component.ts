/* eslint-disable @typescript-eslint/no-explicit-any */
import { MatPaginatorModule } from '@angular/material/paginator';
import { Component, inject, OnDestroy, OnInit, ViewEncapsulation } from '@angular/core';
import { UsersService } from '../../services/users.service';
import { MatDialog } from '@angular/material/dialog';
import { FlexLayoutModule } from '@ngbracket/ngx-layout';
import { MatButtonModule } from '@angular/material/button';
import { MatButtonToggleModule } from '@angular/material/button-toggle';
import { MatIconModule } from '@angular/material/icon';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { FormsModule } from '@angular/forms';
import { MatMenuModule } from '@angular/material/menu';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { MatCardModule } from '@angular/material/card';
import { MatSnackBar } from '@angular/material/snack-bar';
import { Subscription } from 'rxjs';
import { DeleteDialogueComponent } from '../../theme/components/delete-dialogue/delete-dialogue.component';
import { ActivatedRoute, Router } from '@angular/router';
import { ResetPasswordComponent } from './reset-password/reset-password.component';
import { SeparationComponent } from './separation/separation.component';
import { User } from '../../common/interfaces/users/user';
import { UpdateDesignationComponent } from './update-designation/update-designation.component';
import { ConfirmationDialogComponent } from './confirmation-dialog/confirmation-dialog.component';
import { LoginService } from '@services/login.service';
import { InvoiceService } from '@services/invoice.service';
import { environment } from '../../../environments/environment';
import { MatTooltipModule } from '@angular/material/tooltip';

import { EmployeeExportService } from '../../services/employee-export.service';

@Component({
  selector: 'app-users',
  standalone: true,
  imports: [
    FormsModule,
    FlexLayoutModule,
    MatButtonModule,
    MatButtonToggleModule,
    MatIconModule,
    MatFormFieldModule,
    MatInputModule,
    MatProgressSpinnerModule,
    MatMenuModule,
    MatSlideToggleModule,
    MatCardModule,
    MatPaginatorModule,
    MatTooltipModule
  ],
  templateUrl: './users.component.html',
  styleUrl: './users.component.scss',
  encapsulation: ViewEncapsulation.None,
  providers: [UsersService]
})
export class UsersComponent implements OnInit, OnDestroy {
  apiUrl = environment.s3Url || `https://${environment.AWS_BUCKET_NAME || 'aerohr-uploads'}.s3.amazonaws.com/`;

  getUserImageUrl(url?: string): string {
    if (!url) return this.userImage;
    if (url.startsWith('http://') || url.startsWith('https://')) return url;
    return `${this.apiUrl}${url}`;
  }
  public users: User[] = [];
  public page: any;
  private router = inject(Router);
  private route = inject(ActivatedRoute);
  private dialog = inject(MatDialog);
  private snackbar = inject(MatSnackBar);
  private usersService = inject(UsersService);
  private employeeExportService = inject(EmployeeExportService);

  private readonly STATE_STORAGE_KEY = 'oac_users_list_state';
  public isExportingAll: boolean = false;
  public exportingEmployeeId: number | null = null;

  ngOnDestroy(): void {
    this.saveListState();
    this.userSub?.unsubscribe();
    this.updateSub?.unsubscribe();
    this.dialogSub?.unsubscribe();
    this.loginUserSub?.unsubscribe();
    this.rsignSub?.unsubscribe();
    this.confirmSub?.unsubscribe();
  }

  ngOnInit() {
    this.restoreListState();

    const token: any = localStorage.getItem('token');
    if (token) {
      try {
        const user = JSON.parse(token);
        const userId = user?.id;
        if (userId) {
          this.getUser(userId);
        }
      } catch (e) {
        console.error('Error parsing token:', e);
      }
    }
    this.getUsers();
  }

  private restoreListState(): void {
    const qp = this.route.snapshot.queryParams;
    let restoredFromQuery = false;

    if (qp['page'] || qp['pageSize'] || qp['search'] !== undefined) {
      const qPage = Number(qp['page']);
      const qSize = Number(qp['pageSize']);
      if (qPage > 0) this.currentPage = qPage;
      if (qSize > 0) this.pageSize = qSize;
      if (typeof qp['search'] === 'string') {
        this.searchText = qp['search'];
        this.searchOpen = !!this.searchText;
      }
      restoredFromQuery = true;
    }

    if (!restoredFromQuery) {
      try {
        const raw = sessionStorage.getItem(this.STATE_STORAGE_KEY);
        if (raw) {
          const saved = JSON.parse(raw);
          if (Number(saved?.currentPage) > 0) this.currentPage = Number(saved.currentPage);
          if (Number(saved?.pageSize) > 0) this.pageSize = Number(saved.pageSize);
          if (typeof saved?.searchText === 'string') {
            this.searchText = saved.searchText;
            this.searchOpen = !!saved.searchOpen || !!this.searchText;
          }
        }
      } catch {
        // Ignore storage read errors
      }
    }
  }

  private saveListState(): void {
    try {
      sessionStorage.setItem(
        this.STATE_STORAGE_KEY,
        JSON.stringify({
          currentPage: this.currentPage,
          pageSize: this.pageSize,
          searchText: this.searchText,
          searchOpen: this.searchOpen
        })
      );
    } catch {
      // Ignore storage write errors
    }
  }

  private syncQueryParams(): void {
    this.saveListState();
    this.router.navigate([], {
      relativeTo: this.route,
      queryParams: {
        page: this.currentPage > 1 ? this.currentPage : null,
        pageSize: this.pageSize !== 6 ? this.pageSize : null,
        search: this.searchText ? this.searchText : null
      },
      queryParamsHandling: 'merge',
      replaceUrl: true
    });
  }

  loginUserSub?: Subscription;
  private loginService = inject(LoginService);
  private invoiceService = inject(InvoiceService);
  role!: string;
  getUser(id: number) {
    this.loginUserSub = this.loginService.getUserById(id).subscribe({
      next: (res) => {
        const user = res;
        if (!user?.userPosition || !user.userPosition.designation) {
          this.role = user?.role?.roleName || 'Employee';
        } else {
          this.role = user.userPosition.designation.designationName;
        }
      },
      error: () => {
        this.role = 'Employee';
      }
    });
  }

  userSub!: Subscription;
  getUsers(): void {
    this.saveListState();
    this.userSub = this.usersService.getUser(this.searchText, this.currentPage, this.pageSize).subscribe((users: any) => {
      this.users = users?.items || [];
      this.totalItems = users?.count || 0;

      // If currentPage exceeds total pages (e.g. after deleting/separating the last item on a page), step back to the last valid page
      if (this.users.length === 0 && this.totalItems > 0 && this.currentPage > 1) {
        const maxPage = Math.max(1, Math.ceil(this.totalItems / this.pageSize));
        if (this.currentPage > maxPage) {
          this.currentPage = maxPage;
          this.syncQueryParams();
          this.getUsers();
        }
      }
    });
  }

  pageSize = 6;
  currentPage = 1;
  totalItems = 0;
  public onPageChanged(event: any) {
    this.currentPage = event.pageIndex + 1;
    this.pageSize = event.pageSize;
    this.syncQueryParams();
    this.getUsers();
  }

  public viewType: string = 'grid';
  public searchOpen: boolean = false;
  public searchText: string = '';
  private searchDebounceTimer?: any;

  toggleSearch(): void {
    this.searchOpen = !this.searchOpen;
    this.saveListState();
    if (!this.searchOpen && this.searchText) {
      this.clearSearch();
    }
  }

  clearSearch(): void {
    this.searchText = '';
    this.currentPage = 1;
    if (this.searchDebounceTimer) {
      clearTimeout(this.searchDebounceTimer);
    }
    this.syncQueryParams();
    this.getUsers();
  }

  search(event: Event) {
    this.searchText = (event.target as HTMLInputElement).value;
    this.currentPage = 1;
    if (this.searchDebounceTimer) {
      clearTimeout(this.searchDebounceTimer);
    }
    this.searchDebounceTimer = setTimeout(() => {
      this.syncQueryParams();
      this.getUsers();
    }, 280);
  }

  public userImage = 'img/users/default-user.jpg';

  public openUserDialog(user: any) {
    if (user) {
      this.router.navigate(['/login/users/edit/' + user.id]);
    } else {
      this.router.navigate(['/login/users/new']);
    }
  }

  dialogSub!: Subscription;
  updateDesignation(id: number, name: string, empNo: string) {
    const dialogRef = this.dialog.open(UpdateDesignationComponent, {
      width: '560px',
      maxWidth: '95vw',
      panelClass: 'modern-designation-dialog',
      autoFocus: false,
      data: { id: id, name: name, empNo: empNo }
    });

    this.dialogSub = dialogRef.afterClosed().subscribe(() => {
      this.getUsers();
    });
  }

  deleteFunction(id: number, name?: string) {
    const dialogRef = this.dialog.open(DeleteDialogueComponent, {
      width: '440px',
      maxWidth: '95vw',
      data: {
        title: 'Delete User Account',
        itemName: name,
        message: name ? `Are you sure you want to permanently delete user account ${name}?` : 'Are you sure you want to delete this user account?'
      }
    });

    this.dialogSub = dialogRef.afterClosed().subscribe((result) => {
      if (result === true) {
        this.usersService.deleteUser(id).subscribe({
          next: () => {
            this.snackbar.open('User deleted successfully...', '', { duration: 3000 });
            this.searchText = '';
            this.getUsers();
          },
          error: (error) => {
            this.snackbar.open(error?.error?.message || 'Delete failed', '', { duration: 3000 });
          }
        });
      }
    });
  }

  viewEmployee(id: number) {
    this.router.navigate(['/login/users/view/' + id]);
  }

  deleteImage(id: number, name?: string) {
    const dialogRef = this.dialog.open(DeleteDialogueComponent, {
      width: '440px',
      maxWidth: '95vw',
      data: {
        title: 'Delete Profile Image',
        message: name ? `Are you sure you want to delete the profile image for ${name}?` : 'Are you sure you want to delete this profile image?'
      }
    });

    this.dialogSub = dialogRef.afterClosed().subscribe((result) => {
      if (result === true) {
        this.usersService.deleteUserImage(id).subscribe({
          next: () => {
            this.snackbar.open('User image deleted successfully...', '', { duration: 3000 });
            this.getUsers();
          },
          error: (error) => {
            this.snackbar.open(error?.error?.message || 'Delete image failed', '', { duration: 3000 });
          }
        });
      }
    });
  }

  resetPassword(id: number, empNo: string, name?: string) {
    const dialogRef = this.dialog.open(ResetPasswordComponent, {
      width: '480px',
      maxWidth: '95vw',
      data: { id: id, empNo: empNo, name: name, paswordReset: false }
    });
    this.dialogSub = dialogRef.afterClosed().subscribe(() => {});
  }

  updateSub!: Subscription;
  updateStatus(event: any, id: number, name: string) {
    const data = { status: event.checked };
    this.updateSub = this.usersService.updateUserStatus(data, id).subscribe(() => {
      if (event.checked) {
        this.snackbar.open(`${name} is now in active state`, '', { duration: 3000 });
      } else {
        this.snackbar.open(`${name} is now in inactive state`, '', { duration: 3000 });
      }
      this.getUsers();
    });
  }

  rsignSub!: Subscription;
  resignEmployee(id: number, empNo: string, name: string) {
    const dialogRef = this.dialog.open(SeparationComponent, {
      width: '540px',
      maxWidth: '95vw',
      data: { id: id, empNo: empNo, name: name }
    });
    this.dialogSub = dialogRef.afterClosed().subscribe((res) => {
      if (res?.confirmed) {
        this.rsignSub = this.usersService.resignEmployee(id, res).subscribe(() => {
          this.snackbar.open(`${empNo} is now resigned`, '', { duration: 3000 });
          this.searchText = '';
          this.getUsers();
        });
      }
    });
  }

  openPayRoll(id: number) {
    this.router.navigateByUrl('login/users/payroll/' + id);
  }

  openPromotion(id: number) {
    this.router.navigateByUrl('login/users/promotion/' + id);
  }

  openAssets(id: number) {
    this.router.navigateByUrl('/login/users/assets/' + id);
  }

  viewSeparated() {
    this.router.navigateByUrl('/login/users/separated');
  }

  selectedEmployee: any;
  isEmployeeSelected(user: any): boolean {
    return this.selectedEmployee && this.selectedEmployee.id === user.id;
  }

  snackBar = inject(MatSnackBar);
  confirmSub!: Subscription;
  private userService = inject(UsersService);
  confirmEmployee(id: number, empNo: string, name: string, isTemporary: boolean, defaultTarget?: 'probation' | 'confirmation') {
    const dialogRef = this.dialog.open(ConfirmationDialogComponent, {
      width: '540px',
      maxWidth: '95vw',
      data: {
        id: id,
        empNo: empNo,
        name: name,
        isTemporary: isTemporary,
        defaultTarget: defaultTarget || (isTemporary ? 'confirmation' : 'probation')
      }
    });
    this.dialogSub = dialogRef.afterClosed().subscribe((res) => {
      if (res?.confirmed) {
        this.confirmSub = this.userService.confirmEmployee(id, res.note, res.targetStatus).subscribe({
          next: (x) => {
            this.snackBar.open(`${name}: ${x?.message || 'Status updated successfully'}`, 'Close', { duration: 3500 });
            this.getUsers();
          },
          error: (err) => {
            console.error('Failed to update status:', err);
            this.snackBar.open(err.error?.message || 'Failed to update employment status', 'Close', { duration: 3500 });
          }
        });
      }
    });
  }

  async exportAllEmployeesExcel() {
    if (this.isExportingAll) return;
    this.isExportingAll = true;
    try {
      this.snackbar.open('Preparing employee database Excel export...', '', { duration: 2500 });
      await this.employeeExportService.exportAllEmployeesToExcel(true);
      this.snackbar.open('Employee database exported successfully!', 'Close', { duration: 3000 });
    } catch (err: any) {
      console.error('Error exporting all employees to Excel:', err);
      this.snackbar.open(err?.message || 'Failed to export employee data', 'Close', { duration: 4000 });
    } finally {
      this.isExportingAll = false;
    }
  }

  async downloadSingleEmployeeExcel(user: any) {
    if (!user || this.exportingEmployeeId === user.id) return;
    this.exportingEmployeeId = user.id;
    try {
      this.snackbar.open(`Generating Excel profile for ${user.name || 'employee'}...`, '', { duration: 2000 });
      await this.employeeExportService.exportSingleEmployeeToExcel(user);
      this.snackbar.open(`Excel profile for ${user.name || 'employee'} downloaded!`, 'Close', { duration: 3000 });
    } catch (err: any) {
      console.error('Error exporting single employee to Excel:', err);
      this.snackbar.open(err?.message || 'Failed to export employee profile', 'Close', { duration: 4000 });
    } finally {
      this.exportingEmployeeId = null;
    }
  }
}
