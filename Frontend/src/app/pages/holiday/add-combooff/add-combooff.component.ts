/* eslint-disable @typescript-eslint/no-explicit-any */
import { Component, inject, OnDestroy, OnInit } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSelectModule } from '@angular/material/select';
import { MatSnackBar } from '@angular/material/snack-bar';
import { Subscription, forkJoin, of } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { UsersService } from '@services/users.service';
import { HolidayService } from '@services/holiday.service';
import { Holidays } from '../../../common/interfaces/leaves/holidays';
import { CompoOff } from '../../../common/interfaces/leaves/compo-off';
import { User } from '../../../common/interfaces/users/user';

export type FilterTab = 'all' | 'selected' | 'unselected' | 'added' | 'removed';

@Component({
  selector: 'app-add-combooff',
  standalone: true,
  imports: [
    CommonModule,
    DatePipe,
    FormsModule,
    MatFormFieldModule,
    MatInputModule,
    MatIconModule,
    MatButtonModule,
    MatCheckboxModule,
    MatTooltipModule,
    MatProgressSpinnerModule,
    MatSelectModule
  ],
  templateUrl: './add-combooff.component.html',
  styleUrl: './add-combooff.component.scss'
})
export class AddCombooffComponent implements OnInit, OnDestroy {
  private readonly fb_route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly userService = inject(UsersService);
  private readonly holidayService = inject(HolidayService);
  private readonly snackBar = inject(MatSnackBar);

  public holidayId: number = 0;
  public holiday: Holidays | null = null;
  public employees: User[] = [];
  public co: CompoOff | null = null;

  public initialSelectedIds: Set<number> = new Set<number>();
  public selectedIds: Set<number> = new Set<number>();

  public editStatus: boolean = false;
  public isLoading: boolean = true;
  public isSaving: boolean = false;

  // Search and filter state
  public searchQuery: string = '';
  public activeFilterTab: FilterTab = 'all';
  public selectedDepartment: string = 'all';

  private dataSub?: Subscription;

  ngOnInit(): void {
    this.holidayId = Number(this.fb_route.snapshot.params['id']);

    // Check if holiday was passed in router state
    const navigationState = history.state;
    if (navigationState && navigationState.holiday) {
      this.holiday = navigationState.holiday;
    }

    // If not found in state, fetch it
    if (!this.holiday && this.holidayId) {
      this.fetchHolidayDetails();
    }

    this.loadData();
  }

  ngOnDestroy(): void {
    this.dataSub?.unsubscribe();
  }

  private fetchHolidayDetails(): void {
    this.holidayService.getHolidayById(this.holidayId).pipe(
      catchError(() => {
        // Fallback to all holidays list
        return this.holidayService.getAllHolidays();
      })
    ).subscribe({
      next: (res: any) => {
        if (Array.isArray(res)) {
          this.holiday = res.find((h: Holidays) => h.id === this.holidayId) || null;
        } else if (res && res.id) {
          this.holiday = res;
        }
      },
      error: (err) => console.warn('Could not fetch holiday details:', err)
    });
  }

  public loadData(): void {
    this.isLoading = true;

    this.dataSub = forkJoin({
      employees: this.userService.getConfirmedEmployees().pipe(
        catchError((err) => {
          console.error('Failed to load employees:', err);
          return of([]);
        })
      ),
      comboOff: this.holidayService.getCompoOff(this.holidayId).pipe(
        catchError(() => of(null))
      )
    }).subscribe({
      next: ({ employees, comboOff }) => {
        this.employees = (employees || []).sort((a: any, b: any) =>
          (a.name || '').localeCompare(b.name || '')
        );

        this.co = comboOff;

        if (this.co && Array.isArray(this.co.userId) && this.co.userId.length > 0) {
          this.editStatus = true;
          this.initialSelectedIds = new Set(this.co.userId);
          this.selectedIds = new Set(this.co.userId);
        } else {
          this.editStatus = false;
          this.initialSelectedIds = new Set();
          this.selectedIds = new Set();
        }

        this.isLoading = false;
      },
      error: (err) => {
        console.error('Initialization error:', err);
        this.isLoading = false;
        this.snackBar.open('Failed to load employee list', 'Close', { duration: 3000 });
      }
    });
  }

  // Departments list for dropdown
  public get departments(): string[] {
    const deptSet = new Set<string>();
    for (const emp of this.employees) {
      const dept = (emp as any).team?.teamName || (emp as any).role?.roleName;
      if (dept) {
        deptSet.add(dept);
      }
    }
    return Array.from(deptSet).sort();
  }

  // Filtered employees list based on search, department, and active filter tab
  public get filteredEmployees(): User[] {
    const query = this.searchQuery.trim().toLowerCase();

    return this.employees.filter((emp) => {
      // 1. Search Query Filter
      if (query) {
        const nameMatch = (emp.name || '').toLowerCase().includes(query);
        const empNoMatch = (emp.empNo || '').toLowerCase().includes(query);
        const emailMatch = (emp.email || (emp as any).userPosition?.officialMailId || '').toLowerCase().includes(query);
        const roleMatch = ((emp as any).role?.roleName || '').toLowerCase().includes(query);
        const teamMatch = ((emp as any).team?.teamName || '').toLowerCase().includes(query);

        if (!nameMatch && !empNoMatch && !emailMatch && !roleMatch && !teamMatch) {
          return false;
        }
      }

      // 2. Department / Role Filter
      if (this.selectedDepartment !== 'all') {
        const empDept = (emp as any).team?.teamName || (emp as any).role?.roleName;
        if (empDept !== this.selectedDepartment) {
          return false;
        }
      }

      // 3. Tab Filter
      const isSelected = this.selectedIds.has(emp.id);
      const wasInitiallySelected = this.initialSelectedIds.has(emp.id);

      switch (this.activeFilterTab) {
        case 'selected':
          return isSelected;
        case 'unselected':
          return !isSelected;
        case 'added':
          return isSelected && !wasInitiallySelected;
        case 'removed':
          return !isSelected && wasInitiallySelected;
        case 'all':
        default:
          return true;
      }
    });
  }

  // Metric counts
  public get totalEmployeesCount(): number {
    return this.employees.length;
  }

  public get selectedCount(): number {
    return this.selectedIds.size;
  }

  public get unselectedCount(): number {
    return Math.max(0, this.employees.length - this.selectedIds.size);
  }

  public get newlyAddedCount(): number {
    let count = 0;
    this.selectedIds.forEach((id) => {
      if (!this.initialSelectedIds.has(id)) count++;
    });
    return count;
  }

  public get deselectedCount(): number {
    let count = 0;
    this.initialSelectedIds.forEach((id) => {
      if (!this.selectedIds.has(id)) count++;
    });
    return count;
  }

  public get deselectedEmployeesList(): User[] {
    return this.employees.filter((emp) => this.initialSelectedIds.has(emp.id) && !this.selectedIds.has(emp.id));
  }

  public get hasChanges(): boolean {
    if (!this.editStatus) {
      return this.selectedIds.size > 0;
    }
    return this.newlyAddedCount > 0 || this.deselectedCount > 0;
  }

  // Master checkbox status for visible items
  public get isAllFilteredSelected(): boolean {
    const list = this.filteredEmployees;
    if (list.length === 0) return false;
    return list.every((emp) => this.selectedIds.has(emp.id));
  }

  public get isSomeFilteredSelected(): boolean {
    const list = this.filteredEmployees;
    if (list.length === 0) return false;
    const selectedInList = list.filter((emp) => this.selectedIds.has(emp.id)).length;
    return selectedInList > 0 && selectedInList < list.length;
  }

  // Selection actions
  public toggleEmployee(empId: number): void {
    if (this.selectedIds.has(empId)) {
      this.selectedIds.delete(empId);
    } else {
      this.selectedIds.add(empId);
    }
  }

  public isEmployeeSelected(empId: number): boolean {
    return this.selectedIds.has(empId);
  }

  public getEmployeeStatus(empId: number): 'active' | 'added' | 'removed' | 'unassigned' {
    const isSelected = this.selectedIds.has(empId);
    const wasInitial = this.initialSelectedIds.has(empId);

    if (isSelected && wasInitial) return 'active';
    if (isSelected && !wasInitial) return 'added';
    if (!isSelected && wasInitial) return 'removed';
    return 'unassigned';
  }

  public toggleMasterCheckbox(): void {
    if (this.isAllFilteredSelected) {
      this.deselectAllFiltered();
    } else {
      this.selectAllFiltered();
    }
  }

  public selectAllFiltered(): void {
    for (const emp of this.filteredEmployees) {
      this.selectedIds.add(emp.id);
    }
  }

  public deselectAllFiltered(): void {
    for (const emp of this.filteredEmployees) {
      this.selectedIds.delete(emp.id);
    }
  }

  public resetToInitial(): void {
    this.selectedIds = new Set(this.initialSelectedIds);
    this.snackBar.open('Selection reset to saved state', 'Dismiss', { duration: 2500 });
  }

  public reIncludeEmployee(empId: number): void {
    this.selectedIds.add(empId);
  }

  public clearSearch(): void {
    this.searchQuery = '';
  }

  public setFilterTab(tab: FilterTab): void {
    this.activeFilterTab = tab;
  }

  // Navigation
  public goBack(): void {
    this.router.navigate(['/login/holiday']);
  }

  // Submission
  public onSubmit(): void {
    if (this.isSaving) return;

    if (!this.editStatus && this.selectedIds.size === 0) {
      this.snackBar.open('Please select at least one employee before saving.', 'Close', { duration: 3000 });
      return;
    }

    if (this.editStatus && !this.hasChanges) {
      this.snackBar.open('No changes detected in employee allocations.', 'Close', { duration: 2500 });
      return;
    }

    this.isSaving = true;

    if (this.editStatus) {
      const selectedEmployeeIds = Array.from(this.selectedIds).filter(
        (id) => !this.initialSelectedIds.has(id)
      );
      const deselectedEmployeeIds = Array.from(this.initialSelectedIds).filter(
        (id) => !this.selectedIds.has(id)
      );

      const payload = {
        selectedEmployeeIds,
        deselectedEmployeeIds
      };

      this.holidayService.updateUpdatedCompoOff(this.holidayId, payload).subscribe({
        next: (res: any) => {
          this.isSaving = false;
          this.snackBar.open(
            res?.message || 'Comp-Off allocations updated successfully!',
            'Close',
            { duration: 3500 }
          );
          this.goBack();
        },
        error: (err: any) => {
          this.isSaving = false;
          console.error('Update comp-off error:', err);
          this.snackBar.open(
            err?.error?.message || 'Failed to update comp-off allocations',
            'Close',
            { duration: 4000 }
          );
        }
      });
    } else {
      const selectedList = Array.from(this.selectedIds);
      this.holidayService.updateCompoOff(this.holidayId, selectedList).subscribe({
        next: (res: any) => {
          this.isSaving = false;
          this.snackBar.open(
            res?.message || 'Comp-Off allocated successfully!',
            'Close',
            { duration: 3500 }
          );
          this.goBack();
        },
        error: (err: any) => {
          this.isSaving = false;
          console.error('Add comp-off error:', err);
          this.snackBar.open(
            err?.error?.message || 'Failed to allocate comp-off',
            'Close',
            { duration: 4000 }
          );
        }
      });
    }
  }

  // Visual avatar helpers
  public getInitials(name?: string): string {
    if (!name) return '??';
    const clean = name.trim();
    if (!clean) return '??';
    const parts = clean.split(/\s+/);
    if (parts.length === 1) return parts[0].substring(0, 2).toUpperCase();
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  }

  public getAvatarGradient(name?: string): string {
    const gradients = [
      'linear-gradient(135deg, #6366f1 0%, #4338ca 100%)',
      'linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%)',
      'linear-gradient(135deg, #0ea5e9 0%, #0369a1 100%)',
      'linear-gradient(135deg, #10b981 0%, #047857 100%)',
      'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
      'linear-gradient(135deg, #ec4899 0%, #be185d 100%)',
      'linear-gradient(135deg, #8b5cf6 0%, #6d28d9 100%)',
      'linear-gradient(135deg, #14b8a6 0%, #0f766e 100%)',
      'linear-gradient(135deg, #f97316 0%, #c2410c 100%)'
    ];
    if (!name) return gradients[0];
    let hash = 0;
    for (let i = 0; i < name.length; i++) {
      hash = name.charCodeAt(i) + ((hash << 5) - hash);
    }
    const index = Math.abs(hash) % gradients.length;
    return gradients[index];
  }
}
