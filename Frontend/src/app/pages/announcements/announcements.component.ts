/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable @typescript-eslint/no-explicit-any */
import { CommonModule } from '@angular/common';
import { Component, inject, OnDestroy, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatMenuModule } from '@angular/material/menu';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { Subscription } from 'rxjs';
import { AddAnnouncementsComponent } from './add-announcements/add-announcements.component';
import { AnnouncementsService } from '@services/announcements.service';
import { Announcement } from '../../common/interfaces/announcement';
import { RoleService } from '@services/role.service';
import { DeleteDialogueComponent } from '../../theme/components/delete-dialogue/delete-dialogue.component';
import { Role } from '../../common/interfaces/users/role';
import { environment } from '../../../environments/environment';

@Component({
  selector: 'app-announcements',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatButtonModule,
    MatCardModule,
    MatIconModule,
    MatFormFieldModule,
    MatInputModule,
    MatProgressSpinnerModule,
    MatMenuModule,
    MatTooltipModule,
    MatDialogModule
  ],
  templateUrl: './announcements.component.html',
  styleUrl: './announcements.component.scss'
})
export class AnnouncementsComponent implements OnInit, OnDestroy {
  apiUrl = environment.s3Url || 'https://approval-management-data-s3.s3.ap-south-1.amazonaws.com/';

  private dialog = inject(MatDialog);
  private announcementService = inject(AnnouncementsService);
  private roleService = inject(RoleService);
  private snackBar = inject(MatSnackBar);

  announcements: Announcement[] = [];
  roleName: string = '';
  searchText: string = '';
  selectedTypeFilter: string = 'all';
  isVisible: boolean = false;
  previewImageUrl: string | null = null;
  showDismissed: boolean = false;
  dismissedIds: Set<number> = new Set<number>();

  private roleSub?: Subscription;
  private announceSub?: Subscription;
  private deleteSub?: Subscription;
  private dismissedSub?: Subscription;
  private searchDebounceTimer?: any;

  ngOnInit(): void {
    this.dismissedIds = new Set(this.announcementService.getDismissedIds());
    this.dismissedSub = this.announcementService.dismissedChanged$.subscribe(ids => {
      this.dismissedIds = new Set(ids);
    });

    this.getAnnouncement();

    const token = localStorage.getItem('token');
    if (token) {
      try {
        const user = JSON.parse(token);
        const roleId = user?.role;
        if (roleId) {
          this.getRoleById(roleId);
        }
      } catch (e) {
        console.error('Error parsing token:', e);
      }
    }
  }

  get canManage(): boolean {
    const r = (this.roleName || '').toLowerCase();
    return r.includes('admin') || r.includes('hr');
  }

  getRoleById(id: number): void {
    this.roleSub?.unsubscribe();
    this.roleSub = this.roleService.getRoleById(id).subscribe({
      next: (res: Role) => {
        this.roleName = res?.abbreviation || res?.roleName || '';
      },
      error: (err) => {
        console.error('Error fetching role:', err);
      }
    });
  }

  getAnnouncement(): void {
    this.isVisible = true;
    this.announceSub?.unsubscribe();
    this.announceSub = this.announcementService.getAnnouncement(this.searchText || '').subscribe({
      next: (res) => {
        this.announcements = res || [];
        this.isVisible = false;
      },
      error: (err) => {
        console.error('Error fetching announcements:', err);
        this.isVisible = false;
      }
    });
  }

  get filteredAnnouncements(): Announcement[] {
    let list = this.announcements || [];
    if (this.showDismissed) {
      list = list.filter(a => this.dismissedIds.has(a.id));
    } else {
      list = list.filter(a => !this.dismissedIds.has(a.id));
    }
    if (this.selectedTypeFilter !== 'all') {
      list = list.filter(a => (a.type || '').toLowerCase() === this.selectedTypeFilter.toLowerCase());
    }
    if (this.searchText?.trim()) {
      const q = this.searchText.trim().toLowerCase();
      list = list.filter(a =>
        (a.message && a.message.toLowerCase().includes(q)) ||
        (a.type && a.type.toLowerCase().includes(q)) ||
        (a.fileUrl && a.fileUrl.toLowerCase().includes(q))
      );
    }
    return list;
  }

  get activeCount(): number {
    if (!this.announcements) return 0;
    return this.announcements.filter(a => !this.dismissedIds.has(a.id)).length;
  }

  get dismissedCount(): number {
    if (!this.announcements) return 0;
    return this.announcements.filter(a => this.dismissedIds.has(a.id)).length;
  }

  setTypeFilter(type: string): void {
    this.selectedTypeFilter = type;
  }

  getTypeCount(type: string): number {
    if (!this.announcements) return 0;
    const baseList = this.showDismissed
      ? this.announcements.filter(a => this.dismissedIds.has(a.id))
      : this.announcements.filter(a => !this.dismissedIds.has(a.id));
    if (type === 'all') return baseList.length;
    return baseList.filter(a => (a.type || '').toLowerCase() === type.toLowerCase()).length;
  }

  isDismissed(id: number): boolean {
    return this.dismissedIds.has(Number(id));
  }

  dismissAnnouncement(item: Announcement, event?: Event): void {
    if (event) {
      event.stopPropagation();
    }
    this.announcementService.dismissAnnouncement(item.id);
    this.dismissedIds.add(item.id);

    const snackRef = this.snackBar.open('Announcement dismissed from feed', 'Undo', {
      duration: 5000,
      horizontalPosition: 'end',
      verticalPosition: 'bottom'
    });

    snackRef.onAction().subscribe(() => {
      this.restoreAnnouncement(item);
    });
  }

  restoreAnnouncement(item: Announcement, event?: Event): void {
    if (event) {
      event.stopPropagation();
    }
    this.announcementService.restoreAnnouncement(item.id);
    this.dismissedIds.delete(item.id);
    this.snackBar.open('Announcement restored to your feed', 'Close', {
      duration: 3000,
      horizontalPosition: 'end',
      verticalPosition: 'bottom'
    });
  }

  restoreAllDismissed(): void {
    this.announcementService.restoreAllDismissed();
    this.dismissedIds.clear();
    this.showDismissed = false;
    this.snackBar.open('All dismissed announcements restored to feed', 'Close', {
      duration: 3000,
      horizontalPosition: 'end',
      verticalPosition: 'bottom'
    });
  }

  toggleDismissedView(show?: boolean): void {
    this.showDismissed = show !== undefined ? show : !this.showDismissed;
  }

  onSearchInput(event: Event): void {
    if (this.searchDebounceTimer) {
      clearTimeout(this.searchDebounceTimer);
    }
    this.searchDebounceTimer = setTimeout(() => {
      this.getAnnouncement();
    }, 280);
  }

  clearSearch(): void {
    this.searchText = '';
    if (this.searchDebounceTimer) {
      clearTimeout(this.searchDebounceTimer);
    }
    this.getAnnouncement();
  }

  resetFilters(): void {
    this.searchText = '';
    this.selectedTypeFilter = 'all';
    this.getAnnouncement();
  }

  openDialog(data: any): void {
    const dialogRef = this.dialog.open(AddAnnouncementsComponent, {
      width: '640px',
      maxWidth: '96vw',
      panelClass: 'modern-announcement-dialog',
      autoFocus: false,
      data: data
    });
    dialogRef.afterClosed().subscribe(() => {
      this.getAnnouncement();
    });
  }

  deleteAnnouncement(id: number, message?: string): void {
    const dialogRef = this.dialog.open(DeleteDialogueComponent, {
      width: '440px',
      maxWidth: '95vw',
      data: {
        title: 'Delete Announcement',
        message: 'Are you sure you want to delete this announcement? This action cannot be undone.'
      }
    });

    dialogRef.afterClosed().subscribe(res => {
      if (res) {
        this.isVisible = true;
        this.deleteSub?.unsubscribe();
        this.deleteSub = this.announcementService.deleteAnnouncement(id).subscribe({
          next: () => {
            this.isVisible = false;
            this.snackBar.open('Announcement deleted successfully.', 'Close', { duration: 3000 });
            this.getAnnouncement();
          },
          error: (err) => {
            this.isVisible = false;
            this.snackBar.open(err?.error?.message || 'Failed to delete announcement', 'Close', { duration: 3000 });
          }
        });
      }
    });
  }

  isPdf(url?: string): boolean {
    if (!url) return false;
    return url.toLowerCase().endsWith('.pdf');
  }

  isImage(url?: string): boolean {
    if (!url) return false;
    const lower = url.toLowerCase();
    return lower.endsWith('.jpg') || lower.endsWith('.jpeg') || lower.endsWith('.png') || lower.endsWith('.webp') || lower.endsWith('.gif');
  }

  getFileName(url?: string): string {
    if (!url) return 'Attachment.pdf';
    const parts = url.split('/');
    const name = parts[parts.length - 1];
    return name.replace(/^\d+_/, '') || 'Attachment.pdf';
  }

  getFileUrl(url?: string): string {
    if (!url) return '';
    if (url.startsWith('http://') || url.startsWith('https://')) return url;
    return `${this.apiUrl}${url}`;
  }

  openImagePreview(url: string): void {
    this.previewImageUrl = this.getFileUrl(url);
  }

  closeImagePreview(): void {
    this.previewImageUrl = null;
  }

  getTypeIcon(type: string): string {
    switch ((type || '').toLowerCase()) {
      case 'info':
        return 'info';
      case 'warning':
        return 'warning';
      case 'success':
        return 'check_circle';
      case 'error':
        return 'error';
      default:
        return 'campaign';
    }
  }

  getTypeLabel(type: string): string {
    switch ((type || '').toLowerCase()) {
      case 'info':
        return 'Information';
      case 'warning':
        return 'Warning Notice';
      case 'success':
        return 'Success / Update';
      case 'error':
        return 'Urgent Alert';
      default:
        return type ? type.toUpperCase() : 'Announcement';
    }
  }

  getAnnouncementClass(type: string): string {
    switch ((type || '').toLowerCase()) {
      case 'info':
        return 'announcement-info';
      case 'warning':
        return 'announcement-warning';
      case 'success':
        return 'announcement-success';
      case 'error':
        return 'announcement-error';
      default:
        return 'announcement-info';
    }
  }

  ngOnDestroy(): void {
    this.roleSub?.unsubscribe();
    this.announceSub?.unsubscribe();
    this.deleteSub?.unsubscribe();
    this.dismissedSub?.unsubscribe();
    if (this.searchDebounceTimer) {
      clearTimeout(this.searchDebounceTimer);
    }
  }
}
