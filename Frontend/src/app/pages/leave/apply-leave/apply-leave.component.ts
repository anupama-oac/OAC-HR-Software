import { Component, inject, OnDestroy, OnInit } from '@angular/core';
import { FormArray, FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatChipsModule } from '@angular/material/chips';
import { MatOptionModule } from '@angular/material/core';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { UserLeave } from '../../../common/interfaces/leaves/userLeave';
import { Observable, Subscription } from 'rxjs';
import { UsersService } from '@services/users.service';
import { User } from '../../../common/interfaces/users/user';
import { MatSelectModule } from '@angular/material/select';
import { CommonModule, DatePipe, formatDate } from '@angular/common';
import { SafePipe } from "../../../common/pipes/safe.pipe";
import { MatSnackBar } from '@angular/material/snack-bar';
import { Leave } from '../../../common/interfaces/leaves/leave';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { NewLeaveService } from '@services/new-leave.service';
import { provideMomentDateAdapter } from '@angular/material-moment-adapter';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatTooltipModule } from '@angular/material/tooltip';
import { RoleService } from '@services/role.service';
import { Role } from '../../../common/interfaces/users/role';
import { MatDialog } from '@angular/material/dialog';
import { LeaveInfoDialogComponent } from './leave-info-dialog/leave-info-dialog.component';
import { MatAutocompleteModule } from '@angular/material/autocomplete';
import moment from 'moment';
import { LeaveType } from '../../../common/interfaces/leaves/leaveType';

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
  selector: 'app-apply-leave',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    ReactiveFormsModule,
    MatCardModule,
    MatChipsModule,
    MatIconModule,
    MatFormFieldModule,
    MatOptionModule,
    MatDatepickerModule,
    MatCheckboxModule,
    MatProgressSpinnerModule,
    MatSelectModule,
    SafePipe,
    DatePipe,
    MatInputModule,
    MatButtonModule,
    MatTooltipModule,
    MatAutocompleteModule
  ],
  templateUrl: './apply-leave.component.html',
  styleUrl: './apply-leave.component.scss',
  providers: [provideMomentDateAdapter(MY_FORMATS), DatePipe]
})
export class ApplyLeaveComponent implements OnInit, OnDestroy {
  private readonly leaveService = inject(NewLeaveService);
  private readonly fb = inject(FormBuilder);
  private readonly roleService = inject(RoleService);
  private readonly userService = inject(UsersService);
  private readonly snackBar = inject(MatSnackBar);
  private readonly dialog = inject(MatDialog);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly datePipe = inject(DatePipe);

  leaveRequestForm = this.fb.group({
    userId: <any>[, Validators.required],
    leaveTypeId: <any>['', Validators.required],
    startDate: <any>['', Validators.required],
    endDate: <any>['', Validators.required],
    notes: ['', Validators.required],
    fileUrl: [''],
    leaveDates: this.fb.array([]),
    status: [''],
    fromEmail: [''],
    appPassword: [''],
    userName: ['']
  });

  filteredOptions: User[] = [];
  filterValue: string = '';
  maxDate!: Date;
  maxEndDate!: Date;
  isEditMode: boolean = false;
  originalLeaveTypes: LeaveType[] = [];
  roleName: string = '';
  employeeStat: boolean = true;
  loggedInUserId: number | null = null;
  loggedInUserName: string = '';
  userLeaves: UserLeave[] = [];
  users: User[] = [];
  leaveTypes: any[] = [];
  slId: number = 0;
  minEndDate: Date | null = null;
  isLoading: boolean = false;
  uploadProgress: number | null = null;
  file!: File;
  imageUrl: string = '';
  fileName: string = '';
  isFileSelected: boolean = false;
  isSick: boolean = false;
  isCertificateRequired: boolean = false;
  allowedFileTypes = ['pdf', 'jpeg', 'jpg', 'png'];

  private roleSub?: Subscription;
  private leaveSub?: Subscription;
  private ulSub?: Subscription;
  private userSub?: Subscription;
  private employeeSub?: Subscription;
  private leaveTypeSub?: Subscription;
  private submitSub?: Subscription;
  private leave: any;

  patch(selectedSuggestion: User): void {
    this.leaveRequestForm.patchValue({ userId: selectedSuggestion.id, userName: selectedSuggestion.name });
    this.checkProbationStatus(selectedSuggestion.id);
  }

  search(event: Event): void {
    this.filterValue = (event.target as HTMLInputElement).value.trim().replace(/\s+/g, '').toLowerCase();
    const userList: User[] = Array.isArray(this.users) ? this.users : [];
    this.filteredOptions = userList.filter(option =>
      (option.name || '').replace(/\s+/g, '').toLowerCase().includes(this.filterValue) ||
      (option.empNo ? option.empNo.toString() : '').replace(/\s+/g, '').toLowerCase().includes(this.filterValue)
    );
  }

  ngOnInit(): void {
    const token: any = localStorage.getItem('token');
    if (token) {
      try {
        const user = JSON.parse(token);
        this.loggedInUserId = user.id;
        this.loggedInUserName = user.name || '';

        const rLower = (user.roleName || user.systemRoleName || user.designationName || '').toLowerCase().trim();
        const isAdmin = Boolean(
          user.isSuperAdmin ||
          rLower === 'super admin' ||
          rLower === 'super administrator' ||
          rLower === 'hr admin' ||
          rLower === 'hr administrator' ||
          rLower.includes('hr & administration manager') ||
          rLower.includes('hr & admin manager')
        );

        if (!isAdmin) {
          // Regular employee applying for leave: automatically select logged-in employee
          this.employeeStat = true;
          this.roleName = 'Employee';
          this.leaveRequestForm.patchValue({
            userId: user.id,
            userName: user.name
          });
          this.leaveRequestForm.get('status')?.setValue('Requested');
          this.checkProbationStatus(user.id);
        } else {
          // Admin / HR
          this.employeeStat = false;
          this.roleName = 'Super Admin';
          this.leaveRequestForm.get('status')?.setValue('AdminApproved');
          this.getUsers();
        }
      } catch (e) {
        console.error('Error parsing token', e);
        this.employeeStat = true;
      }
    } else {
      this.employeeStat = true;
    }

    const leaveId = this.route.snapshot.params['id'];
    this.getLeaveType().subscribe(() => {
      if (leaveId) {
        this.isEditMode = true;
        this.getLeaveDetails(+leaveId);
      }
    });

    this.maxDate = new Date();
    this.maxDate.setDate(this.maxDate.getDate() + 7);

    this.maxEndDate = new Date(this.maxDate);
    this.maxEndDate.setDate(this.maxDate.getDate() + 2);
  }

  getRoleById(id: number, userId: number): void {
    const token: any = localStorage.getItem('token');
    let isSuperAdminDesignation = false;
    if (token) {
      try {
        const u = JSON.parse(token);
        const d = (u.designationName || u.roleName || u.systemRoleName || '').toLowerCase().trim();
        if (u.isSuperAdmin || d.includes('hr & administration manager') || d.includes('hr & admin manager') || d.includes('super admin') || d.includes('hr admin')) {
          isSuperAdminDesignation = true;
        }
      } catch (e) {}
    }

    if (isSuperAdminDesignation) {
      this.roleName = 'Super Admin';
      this.employeeStat = false;
      this.getUsers();
      this.leaveRequestForm.get('status')?.setValue('AdminApproved');
      return;
    }

    this.userSub?.unsubscribe();
    this.userSub = this.userService.getUserById(userId).subscribe({
      next: (userRes: any) => {
        const desig = (userRes?.userPosition?.designation?.designationName || '').toLowerCase().trim();
        if (desig.includes('hr & administration manager') || desig.includes('hr & admin manager') || desig.includes('super admin') || desig.includes('hr admin')) {
          this.roleName = 'Super Admin';
          this.employeeStat = false;
          this.getUsers();
          this.leaveRequestForm.get('status')?.setValue('AdminApproved');
        } else {
          this.fetchRole(id, userId);
        }
      },
      error: () => {
        this.fetchRole(id, userId);
      }
    });
  }

  private fetchRole(id: number, userId: number): void {
    this.roleSub?.unsubscribe();
    this.roleSub = this.roleService.getRoleById(id).subscribe({
      next: (res: Role) => {
        const rName = (res.roleName || res.abbreviation || '').toLowerCase().trim();
        const isAdmin = rName.includes('super admin') || rName.includes('hr admin') || rName.includes('administrator') || rName.includes('hr & admin');
        if (!isAdmin) {
          this.employeeStat = true;
          this.checkProbationStatus(userId);
          this.leaveRequestForm.get('userId')?.setValue(userId);
          if (this.loggedInUserName) {
            this.leaveRequestForm.get('userName')?.setValue(this.loggedInUserName);
          }
          this.leaveRequestForm.get('status')?.setValue('Requested');
        } else {
          this.getUsers();
          this.employeeStat = false;
          this.leaveRequestForm.get('status')?.setValue('AdminApproved');
        }
      },
      error: () => {
        // Fallback to employee mode
        this.employeeStat = true;
        this.checkProbationStatus(userId);
        this.leaveRequestForm.get('userId')?.setValue(userId);
        if (this.loggedInUserName) {
          this.leaveRequestForm.get('userName')?.setValue(this.loggedInUserName);
        }
        this.leaveRequestForm.get('status')?.setValue('Requested');
      }
    });
  }

  getLeaveDetails(id: number): void {
    this.leaveSub = this.leaveService.getLeaveById(id).subscribe((leave) => {
      this.checkProbationStatus(leave.userId);
      if (leave.fileUrl) {
        this.imageUrl = leave.fileUrl;
      }
      this.minEndDate = new Date(leave.startDate);
      this.leave = leave;

      this.leaveRequestForm.patchValue({
        userName: this.leave.user?.name,
        userId: this.leave.userId,
        leaveTypeId: this.leave.leaveTypeId,
        startDate: this.leave.startDate,
        endDate: this.leave.endDate,
        notes: this.leave.notes
      });

      const leaveDatesArray = this.leaveRequestForm.get('leaveDates') as FormArray;
      leaveDatesArray.clear();
      this.leave.leaveDates?.forEach((leaveDate: any) => {
        leaveDatesArray.push(this.fb.group({
          date: [leaveDate.date],
          session1: [leaveDate.session1],
          session2: [leaveDate.session2]
        }, { validators: sessionSelectionValidator }));
      });

      this.checkLeaveValidityAndRequirements();
    });
  }

  getUserLeaves(id: number): void {
    this.ulSub = this.leaveService.getUserLeaveByUser(id).subscribe((response: any) => {
      this.userLeaves = response || [];
    });
  }

  getUsers(): void {
    this.userSub = this.userService.getUser('', 1, 1000).subscribe({
      next: (res: any) => {
        const userList: User[] = Array.isArray(res) ? res : (res?.items || []);
        this.users = userList;
        this.filteredOptions = userList;
      },
      error: () => {
        this.users = [];
        this.filteredOptions = [];
      }
    });
  }

  checkProbationStatus(id: number): void {
    this.getLeaveType().subscribe(() => {
      this.getUserLeaves(id);
      this.employeeSub = this.userService.getProbationEmployees().subscribe({
        next: (employees: any) => {
          const empList: any[] = Array.isArray(employees) ? employees : (employees?.items || []);
          const isProbationEmployee = empList.some((emp: any) => emp.id === id);
          if (isProbationEmployee) {
            const lopType = this.originalLeaveTypes.find(type => type.leaveTypeName === 'LOP');
            if (lopType) {
              this.leaveTypes = [lopType];
              this.leaveRequestForm.get('leaveTypeId')?.setValue(lopType.id);
              this.checkLeaveValidityAndRequirements();
            }
          } else {
            this.leaveTypes = [...this.originalLeaveTypes];
          }
        },
        error: () => {
          this.leaveTypes = [...this.originalLeaveTypes];
        }
      });
    });
  }

  getLeaveType(): Observable<void> {
    return new Observable(observer => {
      this.leaveTypeSub = this.leaveService.getLeaveType().subscribe({
        next: (response: any) => {
          let list: any[] = [];
          if (response && Array.isArray(response.items)) {
            list = response.items;
          } else if (Array.isArray(response)) {
            list = response;
          }
          this.leaveTypes = list;
          this.originalLeaveTypes = [...list];
          this.slId = this.leaveTypes.find(type => type.leaveTypeName === 'Sick Leave')?.id || 0;
          observer.next();
          observer.complete();
        },
        error: (error) => {
          console.error('Error fetching leave types:', error);
          this.leaveTypes = [];
          this.originalLeaveTypes = [];
          observer.error(error);
        }
      });
    });
  }

  onDateChange(): void {
    const startDate: any = this.leaveRequestForm.get('startDate')!.value;
    const leaveDatesArray = this.leaveRequestForm.get('leaveDates') as FormArray;
    leaveDatesArray.clear();
    this.leaveRequestForm.get('endDate')?.reset();
    if (startDate) {
      this.minEndDate = new Date(startDate);
    }
    this.checkLeaveValidityAndRequirements();
  }

  onEndDateChange(): void {
    const startDate: any = this.leaveRequestForm.get('startDate')!.value;
    const endDate: any = this.leaveRequestForm.get('endDate')!.value;
    if (startDate && endDate && new Date(endDate) >= new Date(startDate)) {
      this.updateLeaveDates(new Date(startDate), new Date(endDate));
    } else {
      const leaveDatesArray = this.leaveRequestForm.get('leaveDates') as FormArray;
      leaveDatesArray.clear();
    }
    this.checkLeaveValidityAndRequirements();
  }

  onLeaveTypeChange(): void {
    this.checkLeaveValidityAndRequirements();
  }

  selectLeaveType(typeId: number): void {
    this.leaveRequestForm.get('leaveTypeId')?.setValue(typeId);
    this.leaveRequestForm.get('leaveTypeId')?.markAsDirty();
    this.onLeaveTypeChange();
  }

  endDateFilter = (date: Date | null): boolean => {
    if (!date || !this.minEndDate) {
      return false;
    }
    return date >= this.minEndDate;
  };

  updateLeaveDates(start: Date, end: Date): void {
    const leaveDatesArray = this.leaveRequestForm.get('leaveDates') as FormArray;
    leaveDatesArray.clear();

    const startDate = new Date(start);
    startDate.setHours(0, 0, 0, 0);
    const endDate = new Date(end);
    endDate.setHours(0, 0, 0, 0);

    for (let dt = new Date(startDate); dt <= endDate; dt.setDate(dt.getDate() + 1)) {
      const leaveDateGroup = this.fb.group({
        date: [formatDate(dt, 'yyyy-MM-dd', 'en-US')],
        session1: [true],
        session2: [true]
      }, { validators: sessionSelectionValidator });

      leaveDatesArray.push(leaveDateGroup);
    }
    this.leaveRequestForm.markAsDirty();
  }

  setAllSessions(fullDay: boolean): void {
    this.leaveDates.controls.forEach(ctrl => {
      ctrl.get('session1')?.setValue(fullDay);
      ctrl.get('session2')?.setValue(fullDay);
      ctrl.get('session1')?.markAsDirty();
      ctrl.get('session2')?.markAsDirty();
      ctrl.updateValueAndValidity();
    });
    this.leaveRequestForm.markAsDirty();
  }

  toggleDayFull(index: number): void {
    const group = this.leaveDates.at(index) as FormGroup;
    const s1 = group.get('session1')?.value;
    const s2 = group.get('session2')?.value;
    const makeFull = !(s1 && s2);
    group.get('session1')?.setValue(makeFull);
    group.get('session2')?.setValue(makeFull);
    group.get('session1')?.markAsDirty();
    group.get('session2')?.markAsDirty();
    group.updateValueAndValidity();
    this.leaveRequestForm.markAsDirty();
  }

  prefixEmergency(): void {
    const notesControl = this.leaveRequestForm.get('notes');
    const emergencyPrefix = 'Emergency: ';
    if (notesControl && !notesControl.value?.startsWith(emergencyPrefix)) {
      notesControl.setValue(emergencyPrefix + notesControl.value);
    }
  }

  uploadFile(event: Event): void {
    this.isLoading = true;
    const input = event.target as HTMLInputElement;
    const selectedFile = input.files?.[0];
    const fileType: any = selectedFile?.type.split('/')[1]?.toLowerCase();
    if (!this.allowedFileTypes.includes(fileType)) {
      this.isLoading = false;
      this.snackBar.open('Invalid file type. Please select a PDF, JPEG, JPG, or PNG file.', 'Close', { duration: 3000 });
      return;
    }

    if (selectedFile) {
      this.file = selectedFile;
      this.fileName = this.file.name;
      this.leaveService.uploadImage(this.file).subscribe({
        next: (res) => {
          this.isLoading = false;
          this.imageUrl = `https://approval-management-data-s3.s3.ap-south-1.amazonaws.com/${res.fileUrl}`;
          this.leaveRequestForm.get('fileUrl')?.setValue(this.imageUrl);
          this.leaveRequestForm.get('fileUrl')?.markAsDirty();
          this.checkLeaveValidityAndRequirements();
          this.snackBar.open('Document uploaded successfully!', 'Close', { duration: 2500 });
        },
        error: () => {
          this.isLoading = false;
          this.snackBar.open('Upload failed. Please try again.', 'Close', { duration: 3000 });
        }
      });
    } else {
      this.isLoading = false;
      this.fileName = '';
      this.checkLeaveValidityAndRequirements();
    }
  }

  onDeleteImage(): void {
    this.isLoading = true;
    this.leaveService.deleteUploadByurl(this.imageUrl).subscribe({
      next: () => {
        this.isLoading = false;
        this.imageUrl = '';
        this.fileName = '';
        this.leaveRequestForm.get('fileUrl')?.setValue('');
        this.leaveRequestForm.get('fileUrl')?.markAsDirty();
        this.checkLeaveValidityAndRequirements();
        this.snackBar.open('File deleted successfully.', '', { duration: 3000 });
      },
      error: () => {
        this.isLoading = false;
        this.imageUrl = '';
        this.fileName = '';
        this.leaveRequestForm.get('fileUrl')?.setValue('');
        this.checkLeaveValidityAndRequirements();
      }
    });
  }

  get leaveDates(): FormArray {
    return this.leaveRequestForm.get('leaveDates') as FormArray;
  }

  onSessionChange(index: number, session: string): void {
    const leaveDateGroup = this.leaveDates.at(index) as FormGroup;
    const sessionControl = leaveDateGroup.get(session);
    if (sessionControl) {
      sessionControl.setValue(!sessionControl.value);
      sessionControl.markAsDirty();
      sessionControl.updateValueAndValidity();
      leaveDateGroup.updateValueAndValidity();
    }
    this.leaveRequestForm.markAsDirty();
  }

  get totalCalculatedDays(): number {
    const dates = this.leaveDates?.controls || [];
    let total = 0;
    for (const ctrl of dates) {
      const s1 = ctrl.get('session1')?.value;
      const s2 = ctrl.get('session2')?.value;
      if (s1 && s2) total += 1;
      else if (s1 || s2) total += 0.5;
    }
    return total;
  }

  get selectedLeaveTypeName(): string {
    const id = this.leaveRequestForm.get('leaveTypeId')?.value;
    const found = this.leaveTypes.find(t => t.id === id);
    return found ? found.leaveTypeName : '';
  }

  getLeaveTypeIcon(typeName?: string): string {
    const name = typeName?.toLowerCase() || '';
    if (name.includes('casual')) return 'beach_access';
    if (name.includes('sick')) return 'local_hospital';
    if (name.includes('comp')) return 'more_time';
    if (name.includes('lop') || name.includes('loss')) return 'money_off';
    if (name.includes('maternity') || name.includes('paternity')) return 'child_friendly';
    return 'event_available';
  }

  getLeaveTypeClass(typeName?: string): string {
    const name = typeName?.toLowerCase() || '';
    if (name.includes('casual')) return 'type-casual';
    if (name.includes('sick')) return 'type-sick';
    if (name.includes('comp')) return 'type-compoff';
    if (name.includes('lop') || name.includes('loss')) return 'type-lop';
    return 'type-default';
  }

  isCriticalDay(dateStr: string): boolean {
    const m = moment(dateStr);
    const day = m.day();
    return day === 1 || day === 5 || day === 6; // Mon (1), Fri (5), Sat (6)
  }

  checkLeaveValidityAndRequirements(): void {
    const leaveTypeId = this.leaveRequestForm.get('leaveTypeId')?.value;
    const selectedType = this.leaveTypes.find(t => t.id === leaveTypeId);
    const typeName = (selectedType?.leaveTypeName || '').toLowerCase();
    this.isSick = (leaveTypeId === this.slId) || typeName.includes('sick');

    // Certificate is mandatory for all sick leaves
    if (this.isSick) {
      this.isCertificateRequired = true;
      this.isFileSelected = !this.imageUrl;
    } else {
      this.isCertificateRequired = false;
      this.isFileSelected = false;
    }
  }

  isLeaveDurationInvalid(): boolean {
    const startDateValue = this.leaveRequestForm.get('startDate')?.value;
    const endDateValue = this.leaveRequestForm.get('endDate')?.value;
    const leaveTypeId = this.leaveRequestForm.get('leaveTypeId')?.value;

    if (!startDateValue || !endDateValue || !leaveTypeId) {
      return false;
    }

    const startDate = moment(startDateValue).startOf('day');
    const endDate = moment(endDateValue).startOf('day');
    const diffInDays = endDate.diff(startDate, 'days') + 1;

    const selectedType = this.leaveTypes.find(t => t.id === leaveTypeId);
    const typeName = (selectedType?.leaveTypeName || '').toLowerCase();
    // For Sick Leave and Maternity Leave, diffInDays > 3 does not apply
    if (leaveTypeId === this.slId || typeName.includes('sick') || typeName.includes('maternity')) {
      return false;
    }
    return diffInDays > 3;
  }

  get isSubmitDisabled(): boolean {
    if (this.leaveRequestForm.pristine && !this.isEditMode) return true;
    if (!this.leaveRequestForm.valid) return true;
    if (this.isLeaveDurationInvalid()) return true;
    if (this.isCertificateRequired && !this.imageUrl) return true;
    if (this.totalCalculatedDays <= 0) return true;
    return false;
  }

  onSubmit(): void {
    const leaveDates = this.leaveRequestForm.get('leaveDates')!.value as { date: string | number | Date }[];

    const leaveRequest = {
      ...this.leaveRequestForm.value,
      leaveDates: leaveDates.map(item => ({
        ...item,
        date: this.datePipe.transform(item.date, 'yyyy-MM-dd')
      }))
    };

    if (this.leaveRequestForm.get('startDate')?.value) {
      const sd = this.leaveRequestForm.get('startDate')?.value as string | number | Date;
      leaveRequest.startDate = this.datePipe.transform(sd, 'yyyy-MM-dd');
    }
    if (this.leaveRequestForm.get('endDate')?.value) {
      const ed = this.leaveRequestForm.get('endDate')?.value as string | number | Date;
      leaveRequest.endDate = this.datePipe.transform(ed, 'yyyy-MM-dd');
    }

    if (!this.employeeStat) {
      this.isLoading = true;
      if (this.isEditMode) {
        this.submitSub = this.leaveService.updatemergencyLeave(leaveRequest, this.leave.id).subscribe({
          next: (res: any) => this.openDialog(res, res?.not),
          error: (err) => {
            this.isLoading = false;
            this.router.navigateByUrl('/login/leave');
            this.snackBar.open(err, '', { duration: 3000 });
          }
        });
      } else {
        this.submitSub = this.leaveService.addEmergencyLeave(leaveRequest).subscribe({
          next: (res: any) => this.openDialog(res, res?.not),
          error: (err) => {
            this.isLoading = false;
            this.router.navigateByUrl('/login/leave');
            this.snackBar.open(err, '', { duration: 3000 });
          }
        });
      }
    } else {
      this.submitLeaveRequest(leaveRequest);
    }
  }

  submitLeaveRequest(leaveRequest: any): void {
    this.isLoading = true;
    const request$ = this.isEditMode
      ? this.leaveService.updateLeave(this.leave.id, leaveRequest)
      : this.leaveService.addLeave(leaveRequest);
    request$.subscribe({
      next: (res: any) => this.openDialog(res, res?.not),
      error: (err) => {
        this.isLoading = false;
        this.router.navigateByUrl('/login/leave');
        this.snackBar.open(err, '', { duration: 3000 });
      }
    });
  }

  openDialog(message: any, not: any): void {
    const dialogRef = this.dialog.open(LeaveInfoDialogComponent, {
      data: { message: message }
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result?.action === 'proceed') {
        this.handleDialogResult(result, not);
      } else {
        this.isLoading = false;
        this.router.navigateByUrl('/login/leave');
        this.snackBar.open('Leave request cancelled!', 'Close', { duration: 3000 });
      }
    });
  }

  handleDialogResult(result: any, not: any): void {
    this.isLoading = false;
    if (not && not.length > 0) {
      alert('• ' + not.join('\n• '));
    }
    this.router.navigateByUrl('/login/leave');
    this.snackBar.open('Leave added successfully...', '', { duration: 3000 });
  }

  convertToLowercase(): void {
    let value = this.leaveRequestForm.controls['notes'].value;
    if (value) {
      value = value
        .toLowerCase()
        .replace(/(^\s*\w|[\.\!\?]\s*\w)/g, (char) => char.toUpperCase());
      this.leaveRequestForm.controls['notes'].setValue(value, { emitEvent: false });
    }
  }

  ngOnDestroy(): void {
    this.roleSub?.unsubscribe();
    this.leaveSub?.unsubscribe();
    this.ulSub?.unsubscribe();
    this.userSub?.unsubscribe();
    this.employeeSub?.unsubscribe();
    this.leaveTypeSub?.unsubscribe();
    this.submitSub?.unsubscribe();
  }
}

function sessionSelectionValidator(group: FormGroup) {
  const session1 = group.get('session1')?.value;
  const session2 = group.get('session2')?.value;
  return (session1 || session2) ? null : { sessionRequired: true };
}
