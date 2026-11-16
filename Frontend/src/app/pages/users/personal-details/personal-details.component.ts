/* eslint-disable @typescript-eslint/no-explicit-any */
import { ChangeDetectionStrategy, ChangeDetectorRef, Component, EventEmitter, inject, Input, OnDestroy, Output } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { CommonModule, DatePipe } from '@angular/common';
import { ActivatedRoute } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatOptionModule } from '@angular/material/core';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatRadioModule } from '@angular/material/radio';
import { MatSelectModule } from '@angular/material/select';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MatIconModule } from '@angular/material/icon';
import { MatAutocompleteModule } from '@angular/material/autocomplete';
import { MatTooltipModule } from '@angular/material/tooltip';
import { provideMomentDateAdapter } from '@angular/material-moment-adapter';
import { Subscription } from 'rxjs';
import { UsersService } from '@services/users.service';
import { User } from '../../../common/interfaces/users/user';

export const MY_FORMATS = {
  parse: {
    dateInput: 'DD/MM/YYYY',
  },
  display: {
    dateInput: 'DD/MM/YYYY',
    monthYearLabel: 'MMM YYYY',
    dateA11yLabel: 'DD/MM/YYYY',
    monthYearA11yLabel: 'MMMM YYYY',
  },
};

@Component({
  selector: 'app-personal-details',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatFormFieldModule,
    MatDatepickerModule,
    MatRadioModule,
    MatOptionModule,
    MatSelectModule,
    MatInputModule,
    MatSlideToggleModule,
    MatButtonModule,
    MatCardModule,
    MatIconModule,
    MatAutocompleteModule,
    MatTooltipModule
  ],
  templateUrl: './personal-details.component.html',
  styleUrl: './personal-details.component.scss',
  providers: [provideMomentDateAdapter(MY_FORMATS), DatePipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PersonalDetailsComponent implements OnDestroy {
  private fb = inject(FormBuilder);
  private userService = inject(UsersService);
  private snackBar = inject(MatSnackBar);
  private cdr = inject(ChangeDetectorRef);
  private route = inject(ActivatedRoute);

  @Input() data: any;
  @Input() loading = false;
  @Output() loadingState = new EventEmitter<boolean>();
  @Output() dataSubmitted = new EventEmitter<any>();

  editStatus: boolean = false;
  currentUserId!: number;

  triggerNew(data?: any): void {
    const targetData = data || this.data;
    const routeId = Number(this.route.snapshot.params['id']);
    const userId = targetData?.id || this.currentUserId || (routeId ? routeId : undefined);

    if (targetData) {
      this.data = targetData;
    }

    if (userId) {
      this.currentUserId = Number(userId);
      this.form.patchValue({ userId: this.currentUserId });
      this.getReportingManager(this.currentUserId);
      this.getPersonalDetailsByUser(this.currentUserId);
    } else {
      this.getReportingManager(0);
    }
    this.cdr.markForCheck();
  }

  pUSub!: Subscription;
  id!: number;
  getPersonalDetailsByUser(id: number) {
    this.pUSub = this.userService.getUserPersonalDetailsByUser(id).subscribe({
      next: (data) => {
        if (data && data.id) {
          this.id = data.id;
          this.editStatus = true;
          this.form.patchValue({
            userId: data.userId || id,
            dateOfJoining: data.dateOfJoining,
            probationPeriod: data.probationPeriod,
            maritalStatus: data.maritalStatus,
            dateOfBirth: data.dateOfBirth,
            gender: data.gender,
            isTemporary: data.isTemporary,
            parentName: data.parentName,
            spouseName: data.spouseName,
            referredBy: data.referredBy,
            reportingMangerId: data.reportingMangerId,
            emergencyContactNo: data.emergencyContactNo,
            emergencyContactName: data.emergencyContactName,
            emergencyContactRelation: data.emergencyContactRelation,
            bloodGroup: data.bloodGroup,
            spouseContactNo: data.spouseContactNo,
            parentContactNo: data.parentContactNo,
            motherName: data.motherName,
            motherContactNo: data.motherContactNo,
            temporaryAddress: data.temporaryAddress,
            permanentAddress: data.permanentAddress,
            qualification: data.qualification,
            experience: data.experience,
            reportingMangerName: data.manager?.name || (data as any)?.ReportingManager?.name
          });
        } else {
          this.editStatus = false;
          this.form.patchValue({ userId: id });
        }
        this.cdr.markForCheck();
      },
      error: (err) => {
        console.warn('Could not fetch personal details for user:', id, err);
        this.cdr.markForCheck();
      }
    });
  }

  form = this.fb.group({
    userId: <any>[null],
    dateOfJoining: <any>[null],
    probationPeriod: [''],
    maritalStatus: [''],
    dateOfBirth: <any>[null],
    gender: [''],
    isTemporary: [true],
    parentName: [''],
    spouseName: [''],
    referredBy: [''],
    reportingMangerId: <any>[null],
    emergencyContactNo: ['', Validators.compose([Validators.pattern(/^[+\d\s\-()]{7,20}$/)])],
    emergencyContactName: [''],
    emergencyContactRelation: [''],
    bloodGroup: [''],
    spouseContactNo: [''],
    parentContactNo: [''],
    motherName: [''],
    motherContactNo: [''],
    temporaryAddress: [''],
    permanentAddress: [''],
    qualification: [''],
    experience: [''],
    reportingMangerName: ['']
  });

  copyAddress(): void {
    const permanentAddress = this.form.get('permanentAddress')?.value;
    if (!permanentAddress || permanentAddress.trim() === '') {
      this.snackBar.open("Please enter permanent address first to copy", "", { duration: 2500 });
      return;
    }
    this.form.patchValue({ temporaryAddress: permanentAddress });
    this.snackBar.open("Permanent address copied to present address", "", { duration: 2500 });
    this.cdr.markForCheck();
  }

  submitSub!: Subscription;
  isNext: boolean = false;

  onSubmit() {
    const routeId = Number(this.route.snapshot.params['id']);
    const resolvedUserId = this.form.get('userId')?.value || this.currentUserId || this.data?.id || (routeId ? routeId : null);

    if (!resolvedUserId) {
      this.snackBar.open("Please save Step 1 (Credentials) first so an Employee ID is assigned.", "Close", { duration: 4000 });
      return;
    }

    this.loadingState.emit(true);
    this.isNext = true;

    const submit: any = {
      ...this.form.getRawValue(),
      userId: Number(resolvedUserId)
    };

    submit.dateOfBirth = this.formatDateOnly(this.form.get('dateOfBirth')?.value);
    submit.dateOfJoining = this.formatDateOnly(this.form.get('dateOfJoining')?.value);

    if (!submit.reportingMangerName) {
      submit.reportingMangerId = null;
    }

    if (this.editStatus && this.id) {
      this.submitSub = this.userService.updateUserPersonal(this.id, submit).subscribe({
        next: () => {
          this.loadingState.emit(false);
          this.snackBar.open("Personal Details updated successfully...", "", { duration: 3000 });
          this.dataSubmitted.emit({ isFormSubmitted: true });
          this.cdr.markForCheck();
        },
        error: (err) => {
          this.loadingState.emit(false);
          const msg = err?.error?.message || err?.error || err?.message || "Failed to update personal details";
          this.snackBar.open(typeof msg === 'string' ? msg : "Failed to update personal details", "", { duration: 4000 });
          this.cdr.markForCheck();
        }
      });
    } else {
      this.submitSub = this.userService.addUserPersonalDetails(submit).subscribe({
        next: (res) => {
          this.editStatus = true;
          this.id = res.id;
          this.loadingState.emit(false);
          this.snackBar.open("Personal Details saved successfully...", "", { duration: 3000 });
          this.dataSubmitted.emit({ isFormSubmitted: true });
          this.cdr.markForCheck();
        },
        error: (err) => {
          this.loadingState.emit(false);
          const msg = err?.error?.message || err?.error || err?.message || "Failed to save personal details";
          this.snackBar.open(typeof msg === 'string' ? msg : "Failed to save personal details", "", { duration: 4000 });
          this.cdr.markForCheck();
        }
      });
    }
  }

  relations = ['Father', 'Mother', 'Sister', 'Brother', 'Spouse', 'Friend', 'Other'];

  ngOnDestroy(): void {
    this.submitSub?.unsubscribe();
    this.pUSub?.unsubscribe();
    this.rmSub?.unsubscribe();
  }

  formatDateOnly(date: any): string | null {
    if (!date) return null;
    // Handle Moment object from MatMomentDateModule / provideMomentDateAdapter
    if (typeof date === 'object' && typeof date.format === 'function') {
      return date.isValid() ? date.format('YYYY-MM-DD') : null;
    }
    if (typeof date === 'object' && typeof date.toDate === 'function') {
      date = date.toDate();
    }
    if (typeof date === 'string') {
      const trimmed = date.trim();
      if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) return trimmed;
      if (/^\d{2}\/\d{2}\/\d{4}$/.test(trimmed)) {
        const [dd, mm, yyyy] = trimmed.split('/');
        return `${yyyy}-${mm}-${dd}`;
      }
    }
    const d = new Date(date);
    if (isNaN(d.getTime())) {
      return null;
    }
    const year = d.getFullYear();
    const month = ('0' + (d.getMonth() + 1)).slice(-2);
    const day = ('0' + d.getDate()).slice(-2);
    return `${year}-${month}-${day}`;
  }

  @Output() nextTab = new EventEmitter<void>();
  triggerNextTab() {
    this.nextTab.emit();
  }

  @Output() previousTab = new EventEmitter<void>();
  triggerPreviousTab() {
    this.previousTab.emit();
  }

  rmSub!: Subscription;
  rm: User[] = [];
  getReportingManager(id: number) {
    this.rmSub = this.userService.getUser('', 1, 1000).subscribe({
      next: (res) => {
        const users: User[] = Array.isArray(res) ? res : ((res as any)?.items || []);
        this.rm = users.filter(user => user.id != id);
        this.filteredRm = this.rm;
        this.cdr.markForCheck();
      },
      error: (err) => {
        console.warn('Could not fetch reporting managers:', err);
      }
    });
  }

  filterValue!: string;
  filteredRm: User[] = [];
  search(event: Event) {
    this.filterValue = (event.target as HTMLInputElement).value.trim().replace(/\s+/g, '').toLowerCase();
    this.filteredRm = this.rm.filter(option =>
      option.name.replace(/\s+/g, '').toLowerCase().includes(this.filterValue) ||
      option.empNo.toString().replace(/\s+/g, '').toLowerCase().includes(this.filterValue)
    );
    this.cdr.markForCheck();
  }

  patch(selectedSuggestion: User) {
    this.form.patchValue({ reportingMangerId: selectedSuggestion.id, reportingMangerName: selectedSuggestion.name });
    this.cdr.markForCheck();
  }
}
