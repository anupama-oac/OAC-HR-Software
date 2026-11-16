/* eslint-disable @typescript-eslint/no-explicit-any */
import { Component, inject, OnDestroy, OnInit } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatDividerModule } from '@angular/material/divider';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSelectModule } from '@angular/material/select';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MatTooltipModule } from '@angular/material/tooltip';
import { Router } from '@angular/router';
import { Subscription } from 'rxjs';
import { provideMomentDateAdapter } from '@angular/material-moment-adapter';
import { HolidayService } from '@services/holiday.service';
import { Holidays } from '../../common/interfaces/leaves/holidays';
import { AddHolidayComponent } from './add-holiday/add-holiday.component';
import { DeleteConfirmationComponent } from './delete-confirmation/delete-confirmation.component';
import { DeleteDialogueComponent } from '../../theme/components/delete-dialogue/delete-dialogue.component';
import { MY_FORMATS } from '../users/personal-details/personal-details.component';

@Component({
  selector: 'app-holiday',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatButtonModule,
    MatCardModule,
    MatDatepickerModule,
    MatDialogModule,
    MatDividerModule,
    MatFormFieldModule,
    MatIconModule,
    MatInputModule,
    MatProgressSpinnerModule,
    MatSelectModule,
    MatTooltipModule
  ],
  templateUrl: './holiday.component.html',
  styleUrl: './holiday.component.scss',
  providers: [provideMomentDateAdapter(MY_FORMATS), DatePipe]
})
export class HolidayComponent implements OnInit, OnDestroy {
  public yearList: number[] = [];
  public currentYear: number | null = new Date().getFullYear();
  public selectedDate: Date | null = null;
  public searchValue: string = '';
  public selectedTypeFilter: string = 'all';
  public sortOrder: 'asc' | 'desc' = 'asc';
  public isLoading: boolean = false;
  public holidays: Holidays[] = [];

  private readonly holidayService = inject(HolidayService);
  private readonly dialog = inject(MatDialog);
  private readonly snackBar = inject(MatSnackBar);
  private readonly router = inject(Router);
  private readonly datePipe = inject(DatePipe);

  private holidaySub?: Subscription;
  private deleteSub?: Subscription;
  private dialogSub?: Subscription;

  ngOnInit(): void {
    const startYear = new Date().getFullYear() + 2;
    for (let year = startYear; year >= 2020; year--) {
      this.yearList.push(year);
    }
    this.loadHolidays();
  }

  ngOnDestroy(): void {
    this.holidaySub?.unsubscribe();
    this.deleteSub?.unsubscribe();
    this.dialogSub?.unsubscribe();
  }

  public loadHolidays(): void {
    this.isLoading = true;
    this.holidaySub?.unsubscribe();

    if (this.currentYear !== null) {
      this.holidaySub = this.holidayService.getHolidayByYear(this.currentYear).subscribe({
        next: (res: any) => {
          this.holidays = Array.isArray(res) ? res : [];
          this.isLoading = false;
        },
        error: (err) => {
          console.error('Error fetching holidays by year:', err);
          this.holidays = [];
          this.isLoading = false;
          this.snackBar.open('Could not load holidays for the selected year', 'Close', { duration: 3000 });
        }
      });
    } else {
      this.holidaySub = this.holidayService.getAllHolidays().subscribe({
        next: (res: any) => {
          this.holidays = Array.isArray(res) ? res : [];
          this.isLoading = false;
        },
        error: (err) => {
          console.error('Error fetching all holidays:', err);
          this.holidays = [];
          this.isLoading = false;
          this.snackBar.open('Could not load holidays list', 'Close', { duration: 3000 });
        }
      });
    }
  }

  // Filtered holidays computed property
  get filteredHolidays(): Holidays[] {
    if (!this.holidays) return [];
    let list = [...this.holidays];

    // Filter by Holiday Type
    if (this.selectedTypeFilter && this.selectedTypeFilter !== 'all') {
      const typeLower = this.selectedTypeFilter.toLowerCase();
      list = list.filter(h => (h.type || '').toLowerCase() === typeLower);
    }

    // Filter by Date
    if (this.selectedDate) {
      const targetStr = this.datePipe.transform(this.selectedDate, 'yyyy-MM-dd');
      list = list.filter(h => {
        const itemStr = this.datePipe.transform(h.date, 'yyyy-MM-dd');
        return itemStr === targetStr;
      });
    }

    // Filter by Search Query
    if (this.searchValue && this.searchValue.trim()) {
      const q = this.searchValue.trim().toLowerCase();
      list = list.filter(h => {
        const nameMatch = h.name && h.name.toLowerCase().includes(q);
        const typeMatch = h.type && h.type.toLowerCase().includes(q);
        const commentsMatch = h.comments && h.comments.toLowerCase().includes(q);
        const dateFormatted = h.date ? this.datePipe.transform(h.date, 'dd/MM/yyyy') : '';
        const dateMatch = dateFormatted && dateFormatted.includes(q);
        return nameMatch || typeMatch || commentsMatch || dateMatch;
      });
    }

    // Sort chronologically
    list.sort((a, b) => {
      const timeA = new Date(a.date).getTime() || 0;
      const timeB = new Date(b.date).getTime() || 0;
      return this.sortOrder === 'asc' ? timeA - timeB : timeB - timeA;
    });

    return list;
  }

  get totalHolidays(): number {
    return this.holidays ? this.holidays.length : 0;
  }

  get upcomingHolidaysCount(): number {
    if (!this.holidays) return 0;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return this.holidays.filter(h => {
      const d = new Date(h.date);
      d.setHours(0, 0, 0, 0);
      return d.getTime() >= today.getTime();
    }).length;
  }

  get compOffCount(): number {
    if (!this.holidays) return 0;
    return this.holidays.filter(h => !!h.comboAdded).length;
  }

  get publicHolidaysCount(): number {
    if (!this.holidays) return 0;
    return this.holidays.filter(h => (h.type || '').toLowerCase() === 'public').length;
  }

  get optionalHolidaysCount(): number {
    if (!this.holidays) return 0;
    return this.holidays.filter(h => {
      const t = (h.type || '').toLowerCase();
      return t === 'optional' || t === 'restricted';
    }).length;
  }

  // Filtering & Sorting Handlers
  public onYearChange(year: number | null): void {
    this.currentYear = year;
    this.selectedDate = null;
    this.loadHolidays();
  }

  public onDateChange(date: Date | null): void {
    this.selectedDate = date;
  }

  public clearDateFilter(): void {
    this.selectedDate = null;
  }

  public clearSearch(): void {
    this.searchValue = '';
  }

  public setTypeFilter(type: string): void {
    this.selectedTypeFilter = type;
  }

  public toggleSort(): void {
    this.sortOrder = this.sortOrder === 'asc' ? 'desc' : 'asc';
  }

  public resetAllFilters(): void {
    this.searchValue = '';
    this.selectedDate = null;
    this.selectedTypeFilter = 'all';
    this.currentYear = new Date().getFullYear();
    this.sortOrder = 'asc';
    this.loadHolidays();
  }

  // Date Presentation Helpers
  public isToday(date: any): boolean {
    if (!date) return false;
    const d = new Date(date);
    const now = new Date();
    return d.getDate() === now.getDate() &&
      d.getMonth() === now.getMonth() &&
      d.getFullYear() === now.getFullYear();
  }

  public isUpcoming(date: any): boolean {
    if (!date) return false;
    const d = new Date(date);
    d.setHours(0, 0, 0, 0);
    const now = new Date();
    now.setHours(0, 0, 0, 0);
    return d.getTime() > now.getTime();
  }

  public isPast(date: any): boolean {
    if (!date) return false;
    const d = new Date(date);
    d.setHours(0, 0, 0, 0);
    const now = new Date();
    now.setHours(0, 0, 0, 0);
    return d.getTime() < now.getTime();
  }

  public getDayNumber(date: any): string {
    return this.datePipe.transform(date, 'dd') || '--';
  }

  public getMonthName(date: any): string {
    return this.datePipe.transform(date, 'MMM') || '';
  }

  public getDayName(date: any): string {
    return this.datePipe.transform(date, 'EEEE') || '';
  }

  public getYear(date: any): string {
    return this.datePipe.transform(date, 'yyyy') || '';
  }

  public getTypeBadgeClass(type: string | undefined): string {
    const t = (type || '').toLowerCase();
    if (t === 'public') return 'type-public';
    if (t === 'optional') return 'type-optional';
    if (t === 'restricted') return 'type-restricted';
    return 'type-default';
  }

  // Dialog Operations
  public openDialog(holiday: Holidays | null = null, initialTab: number = 0): void {
    const dialogRef = this.dialog.open(AddHolidayComponent, {
      data: { holiday, initialTab },
      width: '95vw',
      maxWidth: '96vw',
      maxHeight: '90vh',
      panelClass: 'modern-holiday-dialog'
    });

    this.dialogSub = dialogRef.afterClosed().subscribe((result) => {
      if (result) {
        this.loadHolidays();
      }
    });
  }

  public openTemplateDialog(): void {
    this.openDialog(null, 1);
  }

  public delete(id: number): void {
    const dialogRef = this.dialog.open(DeleteDialogueComponent, {
      width: '420px',
      maxWidth: '92vw'
    });

    this.dialogSub = dialogRef.afterClosed().subscribe((confirmed) => {
      if (confirmed) {
        this.deleteSub = this.holidayService.deleteHolidays(id).subscribe({
          next: () => {
            this.snackBar.open('Holiday removed successfully', 'Close', { duration: 3000 });
            this.loadHolidays();
          },
          error: (err) => {
            console.error('Delete failed:', err);
            this.snackBar.open('Failed to delete holiday', 'Close', { duration: 3000 });
          }
        });
      }
    });
  }

  public deleteAll(): void {
    if (!this.filteredHolidays.length) {
      this.snackBar.open('No holidays to clear in current filter', 'Close', { duration: 3000 });
      return;
    }

    const ids = this.filteredHolidays.map(h => h.id);
    const dialogRef = this.dialog.open(DeleteConfirmationComponent, {
      data: {
        holidays: this.filteredHolidays
      },
      width: '540px',
      maxWidth: '94vw',
      panelClass: 'modern-delete-dialog'
    });

    this.dialogSub = dialogRef.afterClosed().subscribe((confirmed) => {
      if (confirmed) {
        this.deleteSub = this.holidayService.deleteHolidaysByYear(ids).subscribe({
          next: () => {
            this.snackBar.open('Selected holidays removed successfully', 'Close', { duration: 3000 });
            this.loadHolidays();
          },
          error: (err) => {
            console.error('Batch delete failed:', err);
            this.snackBar.open('Failed to clear holidays', 'Close', { duration: 3000 });
          }
        });
      }
    });
  }

  public openCompoOff(holidayOrId: Holidays | number): void {
    const id = typeof holidayOrId === 'number' ? holidayOrId : holidayOrId.id;
    const holiday = typeof holidayOrId === 'object' ? holidayOrId : this.holidays.find(h => h.id === id);
    this.router.navigate(['/login/holiday/compo-off', id], { state: { holiday } });
  }
}
