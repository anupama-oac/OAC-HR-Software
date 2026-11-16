/* eslint-disable @typescript-eslint/no-explicit-any */
import { Component, EventEmitter, inject, Input, OnDestroy, OnInit, Output, ChangeDetectionStrategy, ChangeDetectorRef } from '@angular/core';
import { CommonModule, DecimalPipe } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MatTooltipModule } from '@angular/material/tooltip';
import { PayrollService } from '@services/payroll.service';
import { Subscription } from 'rxjs';

@Component({
  selector: 'app-user-salary',
  standalone: true,
  imports: [
    CommonModule,
    DecimalPipe,
    ReactiveFormsModule,
    MatCardModule,
    MatFormFieldModule,
    MatInputModule,
    MatIconModule,
    MatButtonModule,
    MatTooltipModule
  ],
  templateUrl: './user-salary.component.html',
  styleUrl: './user-salary.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class UserSalaryComponent implements OnInit, OnDestroy {
  @Input() salaryData: any;
  @Input() data: any;
  @Input() loading = false;
  @Output() loadingState = new EventEmitter<boolean>();
  @Output() dataSubmitted = new EventEmitter<any>();
  @Output() nextTab = new EventEmitter<void>();
  @Output() previousTab = new EventEmitter<void>();

  private fb = inject(FormBuilder);
  private payrollService = inject(PayrollService);
  private snackBar = inject(MatSnackBar);
  private cdr = inject(ChangeDetectorRef);

  payrollForm: FormGroup = this.fb.group({
    basic: [null, [Validators.required, Validators.min(0)]],
    yearbasicPay: [{ value: 0, disabled: true }],
    hra: [null, [Validators.required, Validators.min(0)]],
    yearhra: [{ value: 0, disabled: true }],
    conveyanceAllowance: [null, [Validators.required, Validators.min(0)]],
    yearconveyanceAllowance: [{ value: 0, disabled: true }],
    lta: [0, [Validators.min(0)]],
    yearlta: [{ value: 0, disabled: true }],
    specialAllowance: [null, [Validators.required, Validators.min(0)]],
    yearspecialAllowance: [{ value: 0, disabled: true }],
    grossPay: [{ value: 0, disabled: true }],
    yeargrossPay: [{ value: 0, disabled: true }],
    pfDeduction: [0, [Validators.min(0)]],
    yearPfDeduction: [{ value: 0, disabled: true }],
    esi: [0, [Validators.min(0)]],
    yearEsi: [{ value: 0, disabled: true }],
    incentiveDeduction: [0, [Validators.min(0)]],
    yearIncentiveDeduction: [{ value: 0, disabled: true }]
  });

  editStatus = false;
  id!: number;
  userId!: number;
  oldGrossPay = 0;

  private subscriptions: Subscription[] = [];
  private fetchSub?: Subscription;
  private submitSub?: Subscription;

  ngOnInit(): void {
    this.setupCalculations();
    const target = this.salaryData || this.data;
    if (target?.id) {
      this.userId = target.id;
      this.getPayrollDetailsByUser(target.id);
    }
  }

  ngOnDestroy(): void {
    this.subscriptions.forEach(s => s.unsubscribe());
    this.fetchSub?.unsubscribe();
    this.submitSub?.unsubscribe();
  }

  triggerNew(data?: any): void {
    const target = data || this.salaryData || this.data;
    if (target?.id) {
      this.userId = target.id;
      this.getPayrollDetailsByUser(target.id);
    }
    this.cdr.markForCheck();
  }

  getPayrollDetailsByUser(userId: number): void {
    this.fetchSub?.unsubscribe();
    this.fetchSub = this.payrollService.getPayrollDetailsByUserId(userId).subscribe({
      next: (res: any) => {
        if (res && res.id) {
          this.id = res.id;
          this.editStatus = true;
          this.oldGrossPay = Number(res.grossPay) || 0;
          this.patchForm(res);
        } else {
          this.editStatus = false;
        }
        this.cdr.markForCheck();
      },
      error: (err) => {
        console.warn('Could not fetch salary details for user:', userId, err);
        this.cdr.markForCheck();
      }
    });
  }

  patchForm(value: any): void {
    this.payrollForm.patchValue({
      basic: value.basic,
      yearbasicPay: Number(value.basic || 0) * 12,
      hra: value.hra,
      yearhra: Number(value.hra || 0) * 12,
      conveyanceAllowance: value.conveyanceAllowance,
      yearconveyanceAllowance: Number(value.conveyanceAllowance || 0) * 12,
      lta: value.lta ?? 0,
      yearlta: Number(value.lta || 0) * 12,
      specialAllowance: value.specialAllowance,
      yearspecialAllowance: Number(value.specialAllowance || 0) * 12,
      grossPay: value.grossPay,
      yeargrossPay: Number(value.grossPay || 0) * 12,
      pfDeduction: value.pfDeduction ?? 0,
      yearPfDeduction: Number(value.pfDeduction || 0) * 12,
      esi: value.esi ?? 0,
      yearEsi: Number(value.esi || 0) * 12,
      incentiveDeduction: value.incentiveDeduction ?? 0,
      yearIncentiveDeduction: Number(value.incentiveDeduction || 0) * 12
    }, { emitEvent: false });
    this.calculateGrossPay();
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
        this.cdr.markForCheck();
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

  onSubmit(): void {
    if (this.payrollForm.invalid) {
      this.payrollForm.markAllAsTouched();
      return;
    }

    const targetUserId = this.userId || this.salaryData?.id || this.data?.id;
    if (!targetUserId) {
      this.snackBar.open('Please save basic employee details first.', 'Close', { duration: 3000 });
      return;
    }

    this.loadingState.emit(true);
    const formRaw = this.payrollForm.getRawValue();

    const payrollData: any = {
      userId: targetUserId,
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

    this.payrollService.updatePayrollData({
      old: this.editStatus ? this.oldGrossPay : 0,
      current: payrollData.grossPay
    });

    if (this.editStatus && this.id) {
      this.submitSub = this.payrollService.updatePayroll(this.id, payrollData).subscribe({
        next: (res: any) => {
          this.oldGrossPay = payrollData.grossPay;
          if (res?.id) this.id = res.id;
          this.snackBar.open('Salary structure updated successfully', 'Close', { duration: 3000 });
          this.loadingState.emit(false);
          this.dataSubmitted.emit({ isFormSubmitted: true });
          this.cdr.markForCheck();
        },
        error: (err) => {
          this.loadingState.emit(false);
          const msg = err?.error?.message || err?.message || 'Failed to update salary structure';
          this.snackBar.open(msg, 'Close', { duration: 3500 });
          this.cdr.markForCheck();
        }
      });
    } else {
      this.submitSub = this.payrollService.savePayroll(payrollData).subscribe({
        next: (res: any) => {
          this.editStatus = true;
          if (res?.id) this.id = res.id;
          this.oldGrossPay = payrollData.grossPay;
          this.snackBar.open('Salary structure saved successfully', 'Close', { duration: 3000 });
          this.loadingState.emit(false);
          this.dataSubmitted.emit({ isFormSubmitted: true });
          this.cdr.markForCheck();
        },
        error: (err) => {
          this.loadingState.emit(false);
          const msg = err?.error?.message || err?.message || 'Failed to save salary structure';
          this.snackBar.open(msg, 'Close', { duration: 3500 });
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

