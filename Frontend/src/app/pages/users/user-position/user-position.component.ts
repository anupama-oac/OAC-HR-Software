/* eslint-disable @typescript-eslint/no-explicit-any */
import { Component, EventEmitter, Input, Output, inject, OnDestroy, ChangeDetectionStrategy, ChangeDetectorRef } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { CommonModule, DatePipe } from '@angular/common';
import { MatAutocompleteModule } from '@angular/material/autocomplete';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatOptionModule } from '@angular/material/core';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { provideMomentDateAdapter } from '@angular/material-moment-adapter';
import { UsersService } from '@services/users.service';
import { Subscription } from 'rxjs';
import { Designation } from '../../../common/interfaces/users/designation';
import { RoleService } from '@services/role.service';
import { MatDialog } from '@angular/material/dialog';
import { Team } from '../../../common/interfaces/users/team';
import { TeamService } from '@services/team.service';
import { MY_FORMATS } from '../personal-details/personal-details.component';

@Component({
  selector: 'app-user-position',
  standalone: true,
  imports: [
    CommonModule,
    MatFormFieldModule,
    ReactiveFormsModule,
    MatInputModule,
    MatButtonModule,
    MatCardModule,
    MatOptionModule,
    MatSelectModule,
    MatAutocompleteModule,
    MatIconModule,
    MatDatepickerModule,
    MatTooltipModule
  ],
  templateUrl: './user-position.component.html',
  styleUrl: './user-position.component.scss',
  providers: [provideMomentDateAdapter(MY_FORMATS), DatePipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class UserPositionComponent implements OnDestroy {
  private roleService = inject(RoleService);
  private dialog = inject(MatDialog);
  private fb = inject(FormBuilder);
  private userService = inject(UsersService);
  private snackBar = inject(MatSnackBar);
  private teamService = inject(TeamService);
  private datePipe = inject(DatePipe);
  private cdr = inject(ChangeDetectorRef);

  @Input() positionData: any;
  @Input() loading = false;
  @Output() loadingState = new EventEmitter<boolean>();
  @Output() dataSubmitted = new EventEmitter<any>();
  @Output() nextTab = new EventEmitter<void>();
  @Output() previousTab = new EventEmitter<void>();

  designation: Designation[] = [];
  roleSub!: Subscription;
  public filteredOptions: Designation[] = [];
  filterValue: string = '';

  editStatus: boolean = false;
  id!: number;
  pUSub!: Subscription;
  submitSub!: Subscription;
  teamSub!: Subscription;
  isNext: boolean = false;
  teams: Team[] = [];

  departments = [
    { name: 'Operation', abbreviation: 'OP' },
    { name: 'Sales', abbreviation: 'SL' },
    { name: 'Finance', abbreviation: 'FN' },
    { name: 'Designing', abbreviation: 'DS' },
    { name: 'Logistics', abbreviation: 'LG' },
    { name: 'HR', abbreviation: 'HR' },
    { name: 'Marketing', abbreviation: 'MK' },
    { name: 'IT', abbreviation: 'IT' },
  ];

  form = this.fb.group({
    userId: <any>[],
    division: [''],
    costCentre: [''],
    grade: [''],
    designationName: [''],
    location: [''],
    department: <any>[],
    office: [''],
    salary: <any>[''],
    probationPeriod: <any>[],
    officialMailId: ['', Validators.email],
    projectMailId: ['', Validators.email],
    designationId: <any>[null, Validators.required],
    teamId: <any>[null],
    confirmationDate: <any>[null]
  });

  ngOnDestroy(): void {
    this.pUSub?.unsubscribe();
    this.submitSub?.unsubscribe();
    this.roleSub?.unsubscribe();
    this.teamSub?.unsubscribe();
  }

  getRoles(): void {
    this.roleSub = this.roleService.getDesignation().subscribe({
      next: (res) => {
        this.designation = res || [];
        this.filteredOptions = this.designation;
        this.cdr.markForCheck();
      },
      error: (err) => {
        console.warn('Could not fetch designations:', err);
      }
    });
  }

  search(event: Event): void {
    this.filterValue = (event.target as HTMLInputElement).value.trim().replace(/\s+/g, '').toLowerCase();
    this.filteredOptions = this.designation.filter(option =>
      (option.designationName || '').replace(/\s+/g, '').toLowerCase().includes(this.filterValue) ||
      (option.abbreviation || '').replace(/\s+/g, '').toLowerCase().includes(this.filterValue)
    );
    this.cdr.markForCheck();
  }

  patch(selectedSuggestion: Designation): void {
    this.form.patchValue({
      designationId: selectedSuggestion.id,
      designationName: selectedSuggestion.designationName
    });
    this.cdr.markForCheck();
  }

  add(): void {
    // Optional hook for adding new designation
  }

  triggerNew(data?: any): void {
    this.getRoles();
    this.getTeam();

    const targetData = data || this.positionData;
    if (targetData) {
      this.positionData = targetData;
      if (targetData.id) {
        this.form.patchValue({ userId: targetData.id });
      }
    }
    const designationNameControl = this.form.get('designationName');
    
    if (designationNameControl && targetData) {
      if (targetData.name === 'Super Admin' || targetData.name === 'Approval Admin' || targetData.name === 'HR Admin') {
        designationNameControl.disable();
      } else {
        designationNameControl.enable();
      }
    }

    if (targetData && targetData.id) {
      this.getPositionDetailsByUser(targetData.id, targetData.name);
    }
    this.cdr.markForCheck();
  }

  getPositionDetailsByUser(id: number, role?: string): void {
    this.pUSub = this.userService.getUserPositionDetailsByUser(id).subscribe({
      next: (data) => {
        if (data) {
          this.id = data.id;
          this.editStatus = true;
          this.form.patchValue({
            division: data.division,
            costCentre: data.costCentre,
            grade: data.grade,
            location: data.location,
            department: data.department,
            office: data.office,
            salary: data.salary,
            probationPeriod: data.probationPeriod,
            officialMailId: data.officialMailId,
            projectMailId: data.projectMailId,
            designationId: data.designationId,
            designationName: data.designation?.designationName,
            teamId: data.teamId,
            confirmationDate: data.confirmationDate
          });
          this.cdr.markForCheck();
        }
      },
      error: (err) => {
        console.warn('Could not fetch position details for user:', id, err);
      }
    });
  }

  getTeam(): void {
    this.teamSub = this.teamService.getTeam().subscribe({
      next: (res) => {
        this.teams = res || [];
        this.cdr.markForCheck();
      },
      error: (err) => {
        console.warn('Could not fetch teams:', err);
      }
    });
  }

  onSubmit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      this.snackBar.open("Please select a valid Designation to proceed", "Close", { duration: 3000 });
      return;
    }

    this.loadingState.emit(true);
    this.isNext = true;

    const submit = {
      ...this.form.getRawValue()
    };
    submit.userId = submit.userId ? submit.userId : (this.positionData?.id || this.id);

    if (this.form.get('confirmationDate')?.value) {
      let confirmationDate: any = this.form.get('confirmationDate')?.value;
      if (typeof confirmationDate === 'object' && typeof confirmationDate.format === 'function') {
        submit.confirmationDate = confirmationDate.isValid() ? confirmationDate.format('YYYY-MM-DD') : null;
      } else {
        if (typeof confirmationDate === 'object' && typeof confirmationDate.toDate === 'function') {
          confirmationDate = confirmationDate.toDate();
        }
        submit.confirmationDate = this.datePipe.transform(confirmationDate, 'yyyy-MM-dd') || null;
      }
    }

    if (this.editStatus) {
      this.submitSub = this.userService.updateUserPosition(this.id, submit).subscribe({
        next: (x) => {
          this.snackBar.open("Employment details updated successfully", "Close", { duration: 3000 });
          this.loadingState.emit(false);
          this.dataSubmitted.emit({ isFormSubmitted: true });
          this.cdr.markForCheck();
        },
        error: (err) => {
          this.loadingState.emit(false);
          const msg = err?.error?.message || err?.message || "Failed to update employment details";
          this.snackBar.open(msg, "Close", { duration: 3500 });
          this.cdr.markForCheck();
        }
      });
    } else {
      this.submitSub = this.userService.addUserPositionDetails(submit).subscribe({
        next: (res) => {
          this.editStatus = true;
          this.id = res.id;
          this.snackBar.open("Employment details saved successfully", "Close", { duration: 3000 });
          this.loadingState.emit(false);
          this.dataSubmitted.emit({ isFormSubmitted: true });
          this.cdr.markForCheck();
        },
        error: (err) => {
          this.loadingState.emit(false);
          const msg = err?.error?.message || err?.message || "Failed to save employment details";
          this.snackBar.open(msg, "Close", { duration: 3500 });
          this.cdr.markForCheck();
        }
      });
    }
  }

  triggerNextTab(): void {
    this.nextTab.emit();
  }

  triggerPreviousTab(): void {
    this.previousTab.emit();
  }
}
