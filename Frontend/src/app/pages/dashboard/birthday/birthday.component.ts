import { CommonModule, DatePipe } from '@angular/common';
import { Component, inject, OnDestroy, OnInit } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import { Router } from '@angular/router';
import { RoleService } from '@services/role.service';
import { UsersService } from '@services/users.service';
import { Subscription } from 'rxjs';
import { UserPersonal } from '../../../common/interfaces/users/user-personal';
import {
  CelebrationPopupItem,
  CelebrationWishDialogComponent
} from '../celebration-wish-dialog/celebration-wish-dialog.component';

@Component({
  selector: 'app-birthday',
  standalone: true,
  imports: [
    DatePipe,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatTooltipModule,
    MatDialogModule,
    CommonModule
  ],
  templateUrl: './birthday.component.html',
  styleUrl: './birthday.component.scss'
})
export class BirthdayComponent implements OnInit, OnDestroy {
  userService = inject(UsersService);
  roleService = inject(RoleService);
  private dialog = inject(MatDialog);
  router = inject(Router);

  canAccessDraft = false;
  roleName = '';
  currentUserName = 'Team OAC';
  private roleSub!: Subscription;
  isLoading = true;
  birthSub!: Subscription;
  birthdaysThisMonth: UserPersonal[] = [];

  ngOnInit(): void {
    this.checkUserRole();
    this.getBirthdays();
  }

  checkUserRole(): void {
    try {
      const tokenData = localStorage.getItem('token');
      if (!tokenData) {
        this.isLoading = false;
        return;
      }

      const authData = JSON.parse(tokenData);
      this.currentUserName = authData?.name || authData?.username || 'Team OAC';
      const roleId = authData.role || authData.token?.roleId;

      if (!roleId) {
        this.isLoading = false;
        return;
      }

      this.getRoleById(roleId);
    } catch (error) {
      console.error('Error parsing token:', error);
      this.isLoading = false;
    }
  }

  getRoleById(id: number): void {
    this.roleSub = this.roleService.getRoleById(id).subscribe({
      next: (role) => {
        this.roleName = role.roleName;
        this.canAccessDraft = ['Super Administrator', 'HR Administrator', 'Super Admin'].includes(
          this.roleName
        );
        this.isLoading = false;
      },
      error: (err) => {
        console.error('Error fetching role:', err);
        const tokenData = JSON.parse(localStorage.getItem('token') || '{}');
        if (tokenData.name && ['Super Admin', 'HR Admin'].includes(tokenData.name)) {
          this.canAccessDraft = true;
        }
        this.isLoading = false;
      }
    });
  }

  getBirthdays(): void {
    this.birthSub = this.userService.getBirthdays().subscribe((res) => {
      this.birthdaysThisMonth = res || [];
    });
  }

  openWishPopup(employee: any): void {
    if (!employee) return;
    const wish = employee?.user?.celebrationWishes?.[0];
    const item: CelebrationPopupItem = {
      userId: employee.userId || employee.user?.id,
      name: employee.user?.name || 'Colleague',
      empNo: employee.user?.empNo || '',
      email: employee.user?.email || '',
      avatarUrl: employee.user?.userImage || employee.user?.url || '',
      type: 'birthday',
      date: employee.dateOfBirth,
      isToday: this.isTodayBirthday(employee.dateOfBirth),
      wishId: wish?.id,
      title: wish?.title || '',
      message: wish?.message || '',
      imageUrl: wish?.imageUrl || '',
      createdBy: wish?.createdBy || ''
    };

    const dialogRef = this.dialog.open(CelebrationWishDialogComponent, {
      width: '660px',
      maxWidth: '95vw',
      panelClass: 'celebration-wish-modal-panel',
      autoFocus: false,
      data: {
        items: [item],
        initialIndex: 0,
        allowUploadAndEdit: true,
        canEdit: true,
        currentUserName: this.currentUserName,
        currentUserDesignation: this.roleName,
        startInEditMode: true
      }
    });

    dialogRef.afterClosed().subscribe((res) => {
      if (res?.updated) {
        this.getBirthdays();
      }
    });
  }

  openDraft(id: number): void {
    this.router.navigate(['login/mail/birthday-draft', id]);
  }

  isTodayBirthday(dateOfBirth: string | Date): boolean {
    const dob = new Date(dateOfBirth);
    const today = new Date();
    return dob.getDate() === today.getDate() && dob.getMonth() === today.getMonth();
  }

  ngOnDestroy(): void {
    this.birthSub?.unsubscribe();
    this.roleSub?.unsubscribe();
  }
}
