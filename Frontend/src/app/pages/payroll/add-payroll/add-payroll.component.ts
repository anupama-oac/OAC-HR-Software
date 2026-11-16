/* eslint-disable @typescript-eslint/no-explicit-any */
import { Component, inject, OnDestroy, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { UsersService } from '@services/users.service';
import { PayrollService } from '@services/payroll.service';
import { Subscription } from 'rxjs';
import { Payroll } from '../../../common/interfaces/payRoll/payroll';
import { CommonModule, DecimalPipe } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatDividerModule } from '@angular/material/divider';
import { PayrollUpdateVerificationComponent } from './payroll-update-verification/payroll-update-verification.component';
import { MAT_DIALOG_DATA, MatDialog, MatDialogRef } from '@angular/material/dialog';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

@Component({
  selector: 'app-add-payroll',
  standalone: true,
  templateUrl: './add-payroll.component.html',
  styleUrls: ['./add-payroll.component.scss'],
  imports: [
    ReactiveFormsModule,
    CommonModule,
    DecimalPipe,
    MatButtonModule,
    MatIconModule,
    MatSnackBarModule,
    MatTooltipModule,
    MatProgressSpinnerModule,
    MatDividerModule
  ]
})
export class AddPayrollComponent implements OnInit, OnDestroy {
  dialogRef = inject(MatDialogRef<AddPayrollComponent>, { optional: true });
  payrollData = inject(MAT_DIALOG_DATA, { optional: true });

  private fb = inject(FormBuilder);
  private userService = inject(UsersService);
  private payrollService = inject(PayrollService);
  private route = inject(ActivatedRoute);
  private dialog = inject(MatDialog);
  private snackBar = inject(MatSnackBar);

  user: any;
  payroll!: Payroll;
  userName = '';
  empNo = '';
  userRole = '';
  editStaus = false;
  isSubmitting = false;
  isLoading = false;
  private id!: number;
  netPay = 0;

  private subscriptions: Subscription[] = [];

  payrollForm: FormGroup = this.fb.group({
    basic: [null, [Validators.required, Validators.min(0)]],
    yearbasicPay: [{ value: null, disabled: true }],
    hra: [null, [Validators.required, Validators.min(0)]],
    yearhra: [{ value: null, disabled: true }],
    conveyanceAllowance: [null, [Validators.required, Validators.min(0)]],
    yearconveyanceAllowance: [{ value: null, disabled: true }],
    lta: [null, [Validators.min(0)]],
    yearlta: [{ value: null, disabled: true }],
    specialAllowance: [null, [Validators.required, Validators.min(0)]],
    yearspecialAllowance: [{ value: null, disabled: true }],
    grossPay: [{ value: null, disabled: true }],
    yeargrossPay: [{ value: null, disabled: true }],
    userName: [''],
    userRole: [''],
    pfDeduction: [null, [Validators.min(0)]],
    yearPfDeduction: [{ value: null, disabled: true }],
    esi: [null, [Validators.min(0)]],
    yearEsi: [{ value: null, disabled: true }],
    incentiveDeduction: [null, [Validators.min(0)]],
    yearIncentiveDeduction: [{ value: null, disabled: true }]
  });

  ngOnInit(): void {
    this.getUserById();
    this.getPayrollDetailsByUserId();
    this.setupCalculations();
  }

  ngOnDestroy(): void {
    this.subscriptions.forEach(sub => sub.unsubscribe());
  }

  getUserById(): void {
    const id = this.route.snapshot.params['id'] ? this.route.snapshot.params['id'] : this.payrollData?.id;
    if (!id) return;

    this.isLoading = true;
    const sub = this.userService.getUserById(id).subscribe({
      next: (res) => {
        this.isLoading = false;
        this.user = res;
        this.userName = res.name || 'Employee';
        this.empNo = res.empNo || '';
        this.userRole = res.userPosition?.designation?.designationName || 'Designation Not Assigned';
        this.payrollForm.get('userName')?.setValue(this.userName);
        this.payrollForm.get('userRole')?.setValue(this.userRole);
      },
      error: (err) => {
        this.isLoading = false;
        console.error('Error fetching user:', err);
      }
    });
    this.subscriptions.push(sub);
  }

  getPayrollDetailsByUserId(): void {
    const id = this.route.snapshot.params['id'] ? this.route.snapshot.params['id'] : this.payrollData?.id;
    if (!id) return;

    const sub = this.payrollService.getPayrollDetailsByUserId(id).subscribe({
      next: (res) => {
        if (res && res.id) {
          this.editStaus = true;
          this.payroll = res;
          this.patchForm(this.payroll);
        } else {
          this.editStaus = false;
        }
      },
      error: (err) => {
        console.error('Error fetching payroll:', err);
      }
    });
    this.subscriptions.push(sub);
  }

  patchForm(value: any): void {
    this.id = value.id;
    this.netPay = Number(value.grossPay) || 0;
    this.payrollForm.patchValue({
      basic: value.basic,
      yearbasicPay: Number(value.basic || 0) * 12,
      hra: value.hra,
      yearhra: Number(value.hra || 0) * 12,
      conveyanceAllowance: value.conveyanceAllowance,
      yearconveyanceAllowance: Number(value.conveyanceAllowance || 0) * 12,
      lta: value.lta,
      yearlta: Number(value.lta || 0) * 12,
      specialAllowance: value.specialAllowance,
      yearspecialAllowance: Number(value.specialAllowance || 0) * 12,
      grossPay: value.grossPay,
      yeargrossPay: Number(value.grossPay || 0) * 12,
      pfDeduction: value.pfDeduction,
      yearPfDeduction: Number(value.pfDeduction || 0) * 12,
      esi: value.esi,
      yearEsi: Number(value.esi || 0) * 12,
      incentiveDeduction: value.incentiveDeduction,
      yearIncentiveDeduction: Number(value.incentiveDeduction || 0) * 12
    });
  }

  setupCalculations(): void {
    const controlsToSync = [
      { ctrl: 'basic', yearCtrl: 'yearbasicPay' },
      { ctrl: 'hra', yearCtrl: 'yearhra' },
      { ctrl: 'conveyanceAllowance', yearCtrl: 'yearconveyanceAllowance' },
      { ctrl: 'lta', yearCtrl: 'yearlta' },
      { ctrl: 'specialAllowance', yearCtrl: 'yearspecialAllowance' },
      { ctrl: 'pfDeduction', yearCtrl: 'yearPfDeduction' },
      { ctrl: 'esi', yearCtrl: 'yearEsi' },
      { ctrl: 'incentiveDeduction', yearCtrl: 'yearIncentiveDeduction' }
    ];

    controlsToSync.forEach(({ ctrl, yearCtrl }) => {
      const sub = this.payrollForm.get(ctrl)?.valueChanges.subscribe((val) => {
        const num = Number(val) || 0;
        this.payrollForm.patchValue({ [yearCtrl]: num * 12 }, { emitEvent: false });
        this.calculateGrossPay();
      });
      if (sub) this.subscriptions.push(sub);
    });
  }

  calculateGrossPay(): void {
    const basic = Number(this.payrollForm.get('basic')?.value) || 0;
    const hra = Number(this.payrollForm.get('hra')?.value) || 0;
    const conveyanceAllowance = Number(this.payrollForm.get('conveyanceAllowance')?.value) || 0;
    const lta = Number(this.payrollForm.get('lta')?.value) || 0;
    const specialAllowance = Number(this.payrollForm.get('specialAllowance')?.value) || 0;

    const grossPay = basic + hra + conveyanceAllowance + lta + specialAllowance;
    this.payrollForm.patchValue({
      grossPay: grossPay,
      yeargrossPay: grossPay * 12
    }, { emitEvent: false });
  }

  getTotalDeductions(): number {
    const pf = Number(this.payrollForm.get('pfDeduction')?.value) || 0;
    const esi = Number(this.payrollForm.get('esi')?.value) || 0;
    const pt = Number(this.payrollForm.get('incentiveDeduction')?.value) || 0;
    return pf + esi + pt;
  }

  getYearlyTotalDeductions(): number {
    return this.getTotalDeductions() * 12;
  }

  getNetPay(): number {
    const gross = Number(this.payrollForm.get('grossPay')?.value) || 0;
    const deductions = this.getTotalDeductions();
    return Math.max(0, gross - deductions);
  }

  getYearlyNetPay(): number {
    return this.getNetPay() * 12;
  }

  getInitials(): string {
    if (!this.userName) return 'EM';
    const parts = this.userName.trim().split(/\s+/);
    if (parts.length >= 2) {
      return (parts[0][0] + parts[1][0]).toUpperCase();
    }
    return parts[0].substring(0, 2).toUpperCase();
  }

  goBack(): void {
    if (this.dialogRef) {
      this.dialogRef.close();
    } else {
      window.history.back();
    }
  }

  savePayrollDetails(): void {
    if (this.payrollForm.invalid || this.isSubmitting) {
      this.payrollForm.markAllAsTouched();
      return;
    }

    if (this.editStaus) {
      const dialogRef = this.dialog.open(PayrollUpdateVerificationComponent, {
        panelClass: 'modern-payroll-dialog',
        autoFocus: false,
        data: {
          userName: this.user?.name || this.userName,
          currentPay: this.netPay,
          updated: this.payrollForm.get('grossPay')?.value
        }
      });

      const sub = dialogRef.afterClosed().subscribe((res) => {
        if (res) {
          this.executeSave(true);
        } else {
          this.snackBar.open('Payroll update was cancelled.', 'Close', { duration: 3000 });
          this.getPayrollDetailsByUserId();
        }
      });
      this.subscriptions.push(sub);
    } else {
      this.executeSave(false);
    }
  }

  private executeSave(isUpdate: boolean): void {
    this.isSubmitting = true;
    const formRaw = this.payrollForm.getRawValue();

    const payrollData: any = {
      basic: Number(formRaw.basic) || 0,
      hra: Number(formRaw.hra) || 0,
      conveyanceAllowance: Number(formRaw.conveyanceAllowance) || 0,
      lta: Number(formRaw.lta) || 0,
      specialAllowance: Number(formRaw.specialAllowance) || 0,
      grossPay: Number(formRaw.grossPay) || 0,
      pfDeduction: Number(formRaw.pfDeduction) || 0,
      esi: Number(formRaw.esi) || 0,
      incentiveDeduction: Number(formRaw.incentiveDeduction) || 0,
      netPay: this.getNetPay()
    };

    if (isUpdate) {
      this.payrollService.updatePayrollData({
        old: this.netPay,
        current: formRaw.grossPay
      });

      const sub = this.payrollService.updatePayroll(this.id, payrollData).subscribe({
        next: () => {
          this.isSubmitting = false;
          this.snackBar.open('🎉 Payroll details updated successfully!', 'Close', { duration: 4000 });
          if (this.dialogRef) {
            this.dialogRef.close(true);
          } else {
            window.history.back();
          }
        },
        error: (err) => {
          this.isSubmitting = false;
          console.error('Error updating payroll:', err);
          const msg = err.error?.message || err.message || 'Error saving payroll details.';
          this.snackBar.open(`Error: ${msg}`, 'Close', { duration: 4000 });
        }
      });
      this.subscriptions.push(sub);
    } else {
      const targetUserId = this.user?.id || (this.route.snapshot.params['id'] ? Number(this.route.snapshot.params['id']) : this.payrollData?.id);
      payrollData.userId = targetUserId;

      this.payrollService.updatePayrollData({
        old: 0,
        current: formRaw.grossPay
      });

      const sub = this.payrollService.savePayroll(payrollData).subscribe({
        next: () => {
          this.isSubmitting = false;
          this.snackBar.open('🎉 Payroll details saved successfully!', 'Close', { duration: 4000 });
          if (this.dialogRef) {
            this.dialogRef.close(true);
          } else {
            window.history.back();
          }
        },
        error: (err) => {
          this.isSubmitting = false;
          console.error('Error saving payroll:', err);
          const msg = err.error?.message || err.message || 'Error saving payroll details.';
          this.snackBar.open(`Error: ${msg}`, 'Close', { duration: 4000 });
        }
      });
      this.subscriptions.push(sub);
    }
  }

  downloadPDF(): void {
    const element: HTMLElement = document.querySelector('.payroll-printable-card') || document.querySelector('.payroll-container')!;
    if (!element) return;

    const excludedElements = document.querySelectorAll('.exclude-from-pdf');
    excludedElements.forEach((el) => {
      (el as HTMLElement).style.display = 'none';
    });

    html2canvas(element, { scale: 2 }).then((canvas) => {
      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF('p', 'mm', 'a4');

      const imgWidth = 190;
      const imgHeight = (canvas.height * imgWidth) / canvas.width;

      pdf.addImage(imgData, 'PNG', 10, 10, imgWidth, imgHeight);
      pdf.save(`Salary_Structure_${this.userName || 'Employee'}_${this.empNo || 'Code'}.pdf`);

      excludedElements.forEach((el) => {
        (el as HTMLElement).style.display = '';
      });
      this.snackBar.open('📄 Salary structure PDF downloaded.', 'Close', { duration: 3000 });
    });
  }
}
