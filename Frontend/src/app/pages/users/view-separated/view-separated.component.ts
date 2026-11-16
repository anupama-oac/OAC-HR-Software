import { Component, inject, OnDestroy, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { Subscription } from 'rxjs';
import { MatButtonModule } from '@angular/material/button';
import { MatButtonToggleModule } from '@angular/material/button-toggle';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatIconModule } from '@angular/material/icon';
import { MatPaginatorModule, PageEvent } from '@angular/material/paginator';
import { MatSelectModule } from '@angular/material/select';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatCardModule } from '@angular/material/card';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { UsersService } from '@services/users.service';
import { SeparationComponent } from '../separation/separation.component';
import { User } from '../../../common/interfaces/users/user';

export interface SeparationReasonBadge {
  reason: string;
  text: string;
  badgeClass: string;
}

@Component({
  selector: 'app-view-separated',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatButtonModule,
    MatButtonToggleModule,
    MatFormFieldModule,
    MatInputModule,
    MatIconModule,
    MatPaginatorModule,
    MatSelectModule,
    MatTooltipModule,
    MatCardModule,
    MatDialogModule
  ],
  templateUrl: './view-separated.component.html',
  styleUrl: './view-separated.component.scss'
})
export class ViewSeparatedComponent implements OnInit, OnDestroy {
  private userService = inject(UsersService);
  private snackbar = inject(MatSnackBar);
  private dialog = inject(MatDialog);
  private router = inject(Router);

  userSub!: Subscription;
  resignSub!: Subscription;
  dialogSub!: Subscription;
  noteSub!: Subscription;

  users: User[] = [];
  filteredUsers: User[] = [];
  paginatedUsers: User[] = [];
  isLoading: boolean = true;

  // Filter & Search Controls
  searchQuery: string = '';
  selectedReasonFilter: string = 'all';
  sortBy: 'date-desc' | 'date-asc' | 'name-asc' = 'date-desc';
  viewMode: 'table' | 'grid' = 'table';

  // Pagination
  pageSize: number = 10;
  currentPage: number = 1;
  pageSizeOptions: number[] = [5, 10, 20, 50];

  ngOnInit(): void {
    this.getSeparatedUsers();
  }

  ngOnDestroy(): void {
    this.userSub?.unsubscribe();
    this.resignSub?.unsubscribe();
    this.dialogSub?.unsubscribe();
    this.noteSub?.unsubscribe();
  }

  getSeparatedUsers(): void {
    this.isLoading = true;
    this.userSub = this.userService.getSeparated().subscribe({
      next: (users) => {
        this.users = users || [];
        console.log(users);
        
        this.isLoading = false;
        this.applyFilters();
      },
      error: (err) => {
        console.error('Failed to load separated users:', err);
        this.isLoading = false;
        this.snackbar.open('Failed to load separated employees', 'Close', { duration: 3500 });
      }
    });
  }

  goBack(): void {
    this.router.navigate(['/login/users']);
  }

  applyFilters(): void {
    let list = [...this.users];

    // Search query filter
    if (this.searchQuery?.trim()) {
      const q = this.searchQuery.trim().toLowerCase();
      list = list.filter((u) =>
        (u.name && u.name.toLowerCase().includes(q)) ||
        (u.empNo && u.empNo.toLowerCase().includes(q)) ||
        (u.userPosition?.designation?.designationName && u.userPosition.designation.designationName.toLowerCase().includes(q)) ||
        (u.role?.roleName && u.role.roleName.toLowerCase().includes(q)) ||
        (u.separationNote && u.separationNote.toLowerCase().includes(q))
      );
    }

    // Reason category filter
    if (this.selectedReasonFilter !== 'all') {
      list = list.filter((u) => {
        const info = this.getReasonInfo(u.separationNote);
        return info.reason.toLowerCase().includes(this.selectedReasonFilter.toLowerCase());
      });
    }

    // Sort order
    if (this.sortBy === 'date-desc') {
      list.sort((a, b) => new Date(b.separationDate || 0).getTime() - new Date(a.separationDate || 0).getTime());
    } else if (this.sortBy === 'date-asc') {
      list.sort((a, b) => new Date(a.separationDate || 0).getTime() - new Date(b.separationDate || 0).getTime());
    } else if (this.sortBy === 'name-asc') {
      list.sort((a, b) => (a.name || '').localeCompare(b.name || ''));
    }

    this.filteredUsers = list;
    this.currentPage = 1;
    this.updatePagination();
  }

  clearSearch(): void {
    this.searchQuery = '';
    this.applyFilters();
  }

  updatePagination(): void {
    const startIndex = (this.currentPage - 1) * this.pageSize;
    this.paginatedUsers = this.filteredUsers.slice(startIndex, startIndex + this.pageSize);
  }

  onPageChange(event: PageEvent): void {
    this.pageSize = event.pageSize;
    this.currentPage = event.pageIndex + 1;
    this.updatePagination();
  }

  // Reason metadata & badge helpers
  getReasonInfo(note: string): SeparationReasonBadge {
    if (!note) {
      return { reason: 'Separated', text: 'No notes recorded', badgeClass: 'badge-other' };
    }

    const bracketMatch = note.match(/^\[(.*?)\]\s*(.*)$/);
    if (bracketMatch) {
      const reason = bracketMatch[1];
      const text = bracketMatch[2] || reason;
      return { reason, text, badgeClass: this.getBadgeClass(reason) };
    }

    const colonMatch = note.match(/^([A-Za-z\s/]+):\s*(.*)$/);
    if (colonMatch) {
      const reason = colonMatch[1].trim();
      const text = colonMatch[2] || reason;
      return { reason, text, badgeClass: this.getBadgeClass(reason) };
    }

    return { reason: 'Separated', text: note, badgeClass: 'badge-other' };
  }

  getBadgeClass(reason: string): string {
    const r = (reason || '').toLowerCase();
    if (r.includes('resignation')) return 'badge-resignation';
    if (r.includes('retirement')) return 'badge-retirement';
    if (r.includes('contract')) return 'badge-contract';
    if (r.includes('termination')) return 'badge-termination';
    if (r.includes('mutual')) return 'badge-mutual';
    if (r.includes('career') || r.includes('studies')) return 'badge-study';
    if (r.includes('health')) return 'badge-health';
    return 'badge-other';
  }

  getInitials(name: string): string {
    if (!name) return 'U';
    const parts = name.trim().split(/\s+/);
    if (parts.length >= 2) {
      return (parts[0][0] + parts[1][0]).toUpperCase();
    }
    return parts[0].substring(0, 2).toUpperCase();
  }

  getTimeAgo(dateStr: any): string {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) return '';
    const now = new Date();
    // Normalize to date comparison
    const diffMs = now.getTime() - date.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    if (diffDays < 0) return 'Scheduled in future';
    if (diffDays === 0) return 'Today';
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 30) return `${diffDays} days ago`;
    const months = Math.floor(diffDays / 30);
    if (months === 1) return '1 month ago';
    if (months < 12) return `${months} months ago`;
    const years = Math.floor(months / 12);
    return years === 1 ? '1 year ago' : `${years} years ago`;
  }

  // Metrics
  get totalSeparatedCount(): number {
    return this.users.length;
  }

  get recentSeparatedCount(): number {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    return this.users.filter((u) => u.separationDate && new Date(u.separationDate) >= thirtyDaysAgo).length;
  }

  get mostCommonReason(): string {
    if (!this.users.length) return 'None';
    const counts: { [key: string]: number } = {};
    for (const u of this.users) {
      const info = this.getReasonInfo(u.separationNote);
      counts[info.reason] = (counts[info.reason] || 0) + 1;
    }
    let topReason = 'Resignation';
    let maxCount = 0;
    for (const [r, c] of Object.entries(counts)) {
      if (c > maxCount) {
        maxCount = c;
        topReason = r;
      }
    }
    return topReason;
  }

  // Employee Actions
  viewEmployee(id: number): void {
    this.router.navigate(['/login/users/view/' + id]);
  }

  employeeBack(user: User): void {
    const confirmed = confirm(
      `Rejoin ${user.name} (${user.empNo})?\n\nThis will reactivate their employee profile, restore their access, and remove them from the separated employees registry.`
    );
    if (confirmed) {
      const data = {
        confirmed: false,
        separationNote: ''
      };
      this.resignSub = this.userService.resignEmployee(user.id, data).subscribe({
        next: () => {
          this.getSeparatedUsers();
          this.snackbar.open(`${user.name} has been successfully rejoined`, 'Close', { duration: 3500 });
        },
        error: (err) => {
          this.snackbar.open(err?.error?.message || 'Failed to rejoin employee', 'Close', { duration: 3500 });
        }
      });
    }
  }

  editNote(id: number, empNo: string, name: string): void {
    const dialogRef = this.dialog.open(SeparationComponent, {
      width: '540px',
      maxWidth: '95vw',
      data: { id: id, empNo: empNo, name: name, type: 'update' }
    });
    this.dialogSub = dialogRef.afterClosed().subscribe((res) => {
      if (res?.confirmed) {
        this.noteSub = this.userService.updateSeparationNote(id, res).subscribe({
          next: () => {
            this.snackbar.open(`Separation details updated for ${name}`, 'Close', { duration: 3500 });
            this.getSeparatedUsers();
          },
          error: (err) => {
            this.snackbar.open(err?.error?.message || 'Failed to update details', 'Close', { duration: 3500 });
          }
        });
      }
    });
  }
}

