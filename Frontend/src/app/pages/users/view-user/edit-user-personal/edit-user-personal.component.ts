/* eslint-disable @typescript-eslint/no-explicit-any */
import { ChangeDetectionStrategy, ChangeDetectorRef, Component, inject, OnDestroy, OnInit } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatAutocompleteModule } from '@angular/material/autocomplete';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatOptionModule } from '@angular/material/core';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatRadioModule } from '@angular/material/radio';
import { MatSelectModule } from '@angular/material/select';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { UsersService } from '@services/users.service';
import { Subscription } from 'rxjs';
import { User } from '../../../../common/interfaces/users/user';
import { MatDialogRef, MAT_DIALOG_DATA, MatDialogModule } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { CommonModule, DatePipe } from '@angular/common';
import { provideMomentDateAdapter } from '@angular/material-moment-adapter';
import { MY_FORMATS } from '../../personal-details/personal-details.component';
import { MatTooltipModule } from '@angular/material/tooltip';

@Component({
  selector: 'app-edit-user-personal',
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
    MatDialogModule,
    MatTooltipModule
  ],
  templateUrl: './edit-user-personal.component.html',
  styleUrl: './edit-user-personal.component.scss',
  providers: [provideMomentDateAdapter(MY_FORMATS), DatePipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class EditUserPersonalComponent implements OnInit, OnDestroy {
  dialogRef = inject(MatDialogRef<EditUserPersonalComponent>, { optional: true });
  dialogData = inject(MAT_DIALOG_DATA, { optional: true });
  private cdr = inject(ChangeDetectorRef);

  ngOnInit(): void {
    if (this.dialogData?.id) {
      this.getReportingManager(this.dialogData.id);
      this.getPersonalDetailsByUser(this.dialogData.id);
    }
  }

  pUSub!: Subscription;
  id!: number;
  editStatus: boolean = false;
  getPersonalDetailsByUser(id: number) {
    this.pUSub = this.userService.getUserPersonalDetailsByUser(id).subscribe(data => {
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
      }
      this.cdr.markForCheck();
    });
  }

  private fb = inject(FormBuilder);
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

  relations = ['Father', 'Mother', 'Sister', 'Brother', 'Spouse', 'Friend', 'Other'];

  rmSub!: Subscription;
  rm: User[] = [];
  private userService = inject(UsersService);
  getReportingManager(id: number) {
    this.rmSub = this.userService.getUser('', 1, 1000).subscribe(res => {
      const users: User[] = Array.isArray(res) ? res : ((res as any)?.items || []);
      this.rm = users.filter(user => user.id != id);
      this.filteredRm = this.rm;
      this.cdr.markForCheck();
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

  copyAddress(): void {
    const permanentAddress = this.form.get('permanentAddress')?.value;
    this.form.patchValue({ temporaryAddress: permanentAddress });
    this.cdr.markForCheck();
  }

  formatDateOnly(date: any): string | null {
    if (!date) return null;
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
    if (isNaN(d.getTime())) return null;
    const year = d.getFullYear();
    const month = ('0' + (d.getMonth() + 1)).slice(-2);
    const day = ('0' + d.getDate()).slice(-2);
    return `${year}-${month}-${day}`;
  }

  submitSub!: Subscription;
  private snackBar = inject(MatSnackBar);
  onSubmit() {
    const submit: any = {
      ...this.form.getRawValue()
    };
    submit.userId = submit.userId ? submit.userId : this.dialogData?.id;
    submit.dateOfBirth = this.formatDateOnly(this.form.get('dateOfBirth')?.value);
    submit.dateOfJoining = this.formatDateOnly(this.form.get('dateOfJoining')?.value);

    if (this.editStatus && this.id) {
      this.submitSub = this.userService.updateUserPersonal(this.id, submit).subscribe({
        next: () => {
          this.dialogRef?.close(true);
          this.snackBar.open("Personal Details updated successfully...", "", { duration: 3000 });
        },
        error: (err) => {
          const msg = err?.error?.message || err?.message || "Failed to update personal details";
          this.snackBar.open(msg, "Close", { duration: 3500 });
        }
      });
    } else {
      this.submitSub = this.userService.addUserPersonalDetails(submit).subscribe({
        next: (res) => {
          this.editStatus = true;
          this.id = res.id;
          this.dialogRef?.close(true);
          this.snackBar.open("Personal Details added successfully...", "", { duration: 3000 });
        },
        error: (err) => {
          const msg = err?.error?.message || err?.message || "Failed to add personal details";
          this.snackBar.open(msg, "Close", { duration: 3500 });
        }
      });
    }
  }

  ngOnDestroy(): void {
    this.pUSub?.unsubscribe();
    this.rmSub?.unsubscribe();
    this.submitSub?.unsubscribe();
  }
}
