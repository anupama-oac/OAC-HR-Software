import { Component, inject, OnInit, OnDestroy } from '@angular/core';
import { CommonModule, DatePipe, DecimalPipe } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSelectModule } from '@angular/material/select';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MatButtonModule } from '@angular/material/button';
import { MatDividerModule } from '@angular/material/divider';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import { ActivatedRoute, Router } from '@angular/router';
import { Subscription } from 'rxjs';
import { provideMomentDateAdapter } from '@angular/material-moment-adapter';
import { environment } from '../../../../environments/environment';
import { User } from '../../../common/interfaces/users/user';
import { UsersService } from '@services/users.service';
import { PromotionService } from '@services/promotion.service';
import { Promotion } from '../../../common/interfaces/users/promotion';
import { RoleService } from '@services/role.service';
import { Designation } from '../../../common/interfaces/users/designation';
import { PayrollService } from '@services/payroll.service';

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
  selector: 'app-promotion',
  imports: [
    CommonModule,
    MatCardModule,
    ReactiveFormsModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatDatepickerModule,
    MatProgressSpinnerModule,
    DatePipe,
    DecimalPipe,
    MatButtonModule,
    MatDividerModule,
    MatIconModule,
    MatTooltipModule
  ],
  templateUrl: './promotion.component.html',
  styleUrl: './promotion.component.scss',
  standalone: true,
  providers: [provideMomentDateAdapter(MY_FORMATS)]
})
export class PromotionComponent implements OnInit, OnDestroy {
  promotionForm: FormGroup;
  isLoading = false;
  isSubmitting = false;
  promotionsHistory: Promotion[] = [];
  designations: Designation[] = [];
  userId!: number;
  user: User | null = null;
  currentSalary: number = 0;
  readonly s3Url = environment.s3Url || `https://${environment.AWS_BUCKET_NAME || 'aerohr-uploads'}.s3.amazonaws.com/`;

  private subscriptions: Subscription[] = [];
  private readonly payrollService = inject(PayrollService);
  private readonly roleService = inject(RoleService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);

  constructor(
    private fb: FormBuilder,
    private employeeService: UsersService,
    private promotionService: PromotionService,
    private snackBar: MatSnackBar
  ) {
    this.promotionForm = this.fb.group({
      userId: ['', Validators.required],
      designationId: ['', Validators.required],
      newSalary: ['', [Validators.required, Validators.min(0)]],
      effectiveDate: ['', Validators.required],
      promotionReason: ['', Validators.maxLength(500)],
      previousSalary: [0]
    });
  }

  ngOnInit(): void {
    this.getDesignations();
    this.getEmployeeIdFromRoute();

    this.subscriptions.push(
      this.payrollService.currentPayrollData.subscribe(data => {
        if (data) {
          if (data.current !== undefined && data.current !== null) {
            this.promotionForm.get('newSalary')?.setValue(data.current);
          }
          if (data.old !== undefined && data.old !== null) {
            this.promotionForm.get('previousSalary')?.setValue(data.old);
            this.currentSalary = data.old;
          }
          // Clear so direct visits don't replay transient payroll builder data
          this.payrollService.updatePayrollData(null);
        }
      })
    );

    this.subscriptions.push(
      this.promotionService.currentDesigData.subscribe(data => {
        if (data) {
          this.promotionForm.get('designationId')?.setValue(data);
        }
      })
    );
  }

  ngOnDestroy(): void {
    this.subscriptions.forEach(sub => sub.unsubscribe());
  }

  getDesignations(): void {
    this.roleService.getDesignation().subscribe({
      next: (res) => {
        this.designations = res || [];
      },
      error: (err) => console.error('Failed to load designations:', err)
    });
  }

  getEmployeeIdFromRoute(): void {
    const idParam = this.route.snapshot.params['id'];
    this.userId = Number(idParam);
    this.promotionForm.get('userId')?.setValue(this.userId);
    if (this.userId) {
      this.loadEmployee(this.userId);
      this.loadPromotionsHistory();
    }
  }

  loadEmployee(employeeId: number): void {
    this.isLoading = true;
    this.employeeService.getUserById(employeeId).subscribe({
      next: (employee) => {
        this.user = employee;
        this.isLoading = false;

        // Auto-fetch current payroll
        this.payrollService.getPayrollDetailsByUserId(employeeId).subscribe({
          next: (payroll) => {
            if (payroll) {
              const currentSal = Number(payroll.grossPay) || Number(payroll.netPay) || 0;
              if (currentSal > 0) {
                if (!this.currentSalary || this.currentSalary === 0 || currentSal > this.currentSalary) {
                  this.currentSalary = currentSal;
                  if (!this.promotionForm.get('previousSalary')?.value || this.promotionForm.get('previousSalary')?.value === 0) {
                    this.promotionForm.get('previousSalary')?.setValue(currentSal);
                  }
                }
              }
            }
          },
          error: () => {
            // Optional payroll fetch error - non blocking
          }
        });
      },
      error: (error) => {
        console.error('Error loading employee:', error);
        this.isLoading = false;
        this.snackBar.open('Failed to load employee details', 'Close', { duration: 3000 });
      }
    });
  }

  loadPromotionsHistory(): void {
    if (!this.userId) return;
    this.promotionService.getPromotionById(this.userId).subscribe({
      next: (promotions) => {
        this.promotionsHistory = promotions || [];
        if (this.promotionsHistory.length > 0) {
          const sorted = [...this.promotionsHistory].sort((a, b) => {
            const dateA = new Date(a.effectiveDate || a.createdAt || 0).getTime();
            const dateB = new Date(b.effectiveDate || b.createdAt || 0).getTime();
            if (dateB !== dateA) return dateB - dateA;
            return (b.id || 0) - (a.id || 0);
          });
          const latestPromotion = sorted[0];
          const latestSalary = Number(latestPromotion.newSalary) || 0;
          if (latestSalary > 0) {
            this.currentSalary = latestSalary;
            this.promotionForm.get('previousSalary')?.setValue(latestSalary);
          }
        }
      },
      error: (error) => {
        console.error('Error loading promotion history:', error);
        this.promotionsHistory = [];
      }
    });
  }

  get userImageUrl(): string | null {
    if (!this.user?.url) return null;
    return this.user.url.startsWith('http') ? this.user.url : `${this.s3Url}${this.user.url}`;
  }

  getInitials(): string {
    if (!this.user?.name) return 'EM';
    const parts = this.user.name.trim().split(/\s+/);
    if (parts.length >= 2) {
      return (parts[0][0] + parts[1][0]).toUpperCase();
    }
    return parts[0].substring(0, 2).toUpperCase();
  }

  getCurrentDesignationName(): string {
    return this.user?.userPosition?.designation?.designationName || 'No designation assigned';
  }

  getSelectedDesignation(): Designation | undefined {
    const selectedId = this.promotionForm.get('designationId')?.value;
    return this.designations.find(d => d.id === selectedId);
  }

  getSelectedDesignationName(): string {
    return this.getSelectedDesignation()?.designationName || '';
  }

  getSalaryIncrement(): number {
    const prev = Number(this.promotionForm.get('previousSalary')?.value) || this.currentSalary || 0;
    const next = Number(this.promotionForm.get('newSalary')?.value) || 0;
    if (!next) return 0;
    return next - prev;
  }

  getIncrementPercentage(): number {
    const prev = Number(this.promotionForm.get('previousSalary')?.value) || this.currentSalary || 0;
    const diff = this.getSalaryIncrement();
    if (!prev || !diff) return 0;
    return (diff / prev) * 100;
  }

  openPayRoll(): void {
    this.promotionService.updateDesigData(this.promotionForm.get('designationId')?.value);
    if (this.user?.id) {
      this.router.navigateByUrl('login/users/payroll/' + this.user.id);
    }
  }

  goBack(): void {
    if (window.history.length > 1) {
      window.history.back();
    } else {
      this.router.navigate(['/login/users']);
    }
  }

  resetForm(): void {
    this.promotionForm.patchValue({
      designationId: '',
      newSalary: '',
      effectiveDate: '',
      promotionReason: '',
      previousSalary: this.currentSalary
    });
    this.promotionForm.markAsPristine();
    this.promotionForm.markAsUntouched();
  }

  onSubmit(): void {
    if (this.promotionForm.invalid || this.isSubmitting) {
      this.promotionForm.markAllAsTouched();
      return;
    }

    this.isSubmitting = true;
    const val = this.promotionForm.value;
    const momentDate: any = val.effectiveDate;
    const formattedEffectiveDate = momentDate && typeof momentDate.format === 'function'
      ? momentDate.format('YYYY-MM-DD')
      : (momentDate ? new Date(momentDate).toISOString().split('T')[0] : new Date().toISOString().split('T')[0]);

    const prevSal = Number(val.previousSalary) || this.currentSalary || 0;

    const promotionData: any = {
      userId: this.userId,
      designationId: val.designationId,
      previousSalary: prevSal,
      newSalary: val.newSalary !== undefined && val.newSalary !== '' ? Number(val.newSalary) : 0,
      effectiveDate: formattedEffectiveDate,
      promotionReason: val.promotionReason || '',
      promotionDate: new Date()
    };

    this.promotionService.applyPromotion(promotionData).subscribe({
      next: () => {
        this.isSubmitting = false;
        this.snackBar.open('🎉 Promotion applied successfully!', 'Close', { duration: 4000 });
        this.loadEmployee(this.userId);
        this.loadPromotionsHistory();
        this.resetForm();
      },
      error: (error) => {
        this.isSubmitting = false;
        console.error('Error applying promotion:', error);
        const msg = error.error?.message || error.message || 'Failed to apply promotion';
        this.snackBar.open(`Error: ${msg}`, 'Close', { duration: 4000 });
      }
    });
  }
}