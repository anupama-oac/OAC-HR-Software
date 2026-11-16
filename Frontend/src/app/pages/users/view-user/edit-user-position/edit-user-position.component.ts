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
import { MatSelectModule } from '@angular/material/select';
import { RoleService } from '@services/role.service';
import { Subscription } from 'rxjs';
import { Designation } from '../../../../common/interfaces/users/designation';
import { TeamService } from '@services/team.service';
import { Team } from '../../../../common/interfaces/users/team';
import { CommonModule, DatePipe } from '@angular/common';
import { MatDialogRef, MAT_DIALOG_DATA, MatDialogModule } from '@angular/material/dialog';
import { MatTooltipModule } from '@angular/material/tooltip';
import { provideMomentDateAdapter } from '@angular/material-moment-adapter';
import { MY_FORMATS } from '../../personal-details/personal-details.component';
import { UsersService } from '@services/users.service';
import { MatSnackBar } from '@angular/material/snack-bar';

@Component({
  selector: 'app-edit-user-position',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatCardModule,
    MatOptionModule,
    MatSelectModule,
    MatAutocompleteModule,
    MatIconModule,
    MatDatepickerModule,
    MatDialogModule,
    MatTooltipModule
  ],
  templateUrl: './edit-user-position.component.html',
  styleUrl: './edit-user-position.component.scss',
  providers: [provideMomentDateAdapter(MY_FORMATS), DatePipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class EditUserPositionComponent implements OnInit, OnDestroy {
  dialogRef = inject(MatDialogRef<EditUserPositionComponent>, { optional: true });
  positionData = inject(MAT_DIALOG_DATA, { optional: true });
  private cdr = inject(ChangeDetectorRef);

  ngOnInit(): void {
    this.getRoles();
    this.getTeam();
    if (this.positionData) {
      this.getPositionDetailsByUser(this.positionData.id);
    }
  }

  pUSub!: Subscription;
  id!: number;
  getPositionDetailsByUser(id: number) {
    this.pUSub = this.userService.getUserPositionDetailsByUser(id).subscribe(data => {
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
          salary: data.salary as any,
          probationPeriod: data.probationPeriod,
          officialMailId: data.officialMailId,
          projectMailId: data.projectMailId,
          designationId: data.designationId,
          designationName: data.designation?.designationName,
          teamId: data.teamId,
          confirmationDate: data.confirmationDate as any
        });
      }
      this.cdr.markForCheck();
    });
  }

  private fb = inject(FormBuilder);
  form = this.fb.group({
    userId: <any>[null],
    division: [''],
    costCentre: [''],
    grade: [''],
    designationName: [''],
    location: [''],
    department: <any>[],
    office: [''],
    salary: [''],
    probationPeriod: <any>[null],
    officialMailId: ['', Validators.email],
    projectMailId: ['', Validators.email],
    designationId: <any>[null, Validators.required],
    teamId: <any>[null],
    confirmationDate: <any>[null]
  });

  private designation: Designation[] = [];
  roleSub!: Subscription;
  public filteredOptions: Designation[] = [];
  private roleService = inject(RoleService);
  getRoles() {
    this.roleSub = this.roleService.getDesignation().subscribe((res) => {
      this.designation = res || [];
      this.filteredOptions = this.designation;
      this.cdr.markForCheck();
    });
  }

  filterValue!: string;
  search(event: Event) {
    this.filterValue = (event.target as HTMLInputElement).value.trim().replace(/\s+/g, '').toLowerCase();
    this.filteredOptions = this.designation.filter(option =>
      option.designationName.replace(/\s+/g, '').toLowerCase().includes(this.filterValue) ||
      option.abbreviation.replace(/\s+/g, '').toLowerCase().includes(this.filterValue)
    );
    this.cdr.markForCheck();
  }

  patch(selectedSuggestion: Designation) {
    this.form.patchValue({ designationId: selectedSuggestion.id, designationName: selectedSuggestion.designationName });
    this.cdr.markForCheck();
  }

  teams: Team[] = [];
  teamSub!: Subscription;
  private teamService = inject(TeamService);
  getTeam() {
    this.teamSub = this.teamService.getTeam().subscribe((res) => {
      this.teams = res || [];
      this.cdr.markForCheck();
    });
  }

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

  submitSub!: Subscription;
  private datePipe = inject(DatePipe);
  editStatus: boolean = false;
  private userService = inject(UsersService);
  private snackBar = inject(MatSnackBar);
  onSubmit() {
    const submit: any = {
      ...this.form.getRawValue()
    };
    submit.userId = submit.userId ? submit.userId : this.positionData?.id;
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
    if (this.editStatus && this.id) {
      this.submitSub = this.userService.updateUserPosition(this.id, submit).subscribe(() => {
        this.dialogRef?.close(true);
        this.snackBar.open("Position Details updated successfully...", "", { duration: 3000 });
      });
    } else {
      this.submitSub = this.userService.addUserPositionDetails(submit).subscribe(() => {
        this.dialogRef?.close(true);
        this.editStatus = true;
        this.snackBar.open("Position Details added successfully...", "", { duration: 3000 });
      });
    }
  }

  ngOnDestroy(): void {
    this.pUSub?.unsubscribe();
    this.submitSub?.unsubscribe();
    this.roleSub?.unsubscribe();
    this.teamSub?.unsubscribe();
  }
}
