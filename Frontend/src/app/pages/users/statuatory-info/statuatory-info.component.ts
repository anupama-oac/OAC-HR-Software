/* eslint-disable @typescript-eslint/no-explicit-any */
import { Component, EventEmitter, Input, OnDestroy, OnInit, Output, inject, ChangeDetectionStrategy, ChangeDetectorRef } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { FormBuilder, ReactiveFormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MatTooltipModule } from '@angular/material/tooltip';
import { provideMomentDateAdapter } from '@angular/material-moment-adapter';
import { Subscription } from 'rxjs';
import { UsersService } from './../../../services/users.service';
import { StatutoryInfo } from '../../../common/interfaces/users/statutory-info';
import { environment } from '../../../../environments/environment';
import { MY_FORMATS } from '../personal-details/personal-details.component';

@Component({
  selector: 'app-statuatory-info',
  standalone: true,
  imports: [
    CommonModule,
    MatFormFieldModule,
    ReactiveFormsModule,
    MatInputModule,
    MatButtonModule,
    MatCardModule,
    MatDatepickerModule,
    MatIconModule,
    MatTooltipModule
  ],
  templateUrl: './statuatory-info.component.html',
  styleUrl: './statuatory-info.component.scss',
  providers: [provideMomentDateAdapter(MY_FORMATS), DatePipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class StatuatoryInfoComponent implements OnInit, OnDestroy {
  private fb = inject(FormBuilder);
  private userService = inject(UsersService);
  private snackBar = inject(MatSnackBar);
  private datePipe = inject(DatePipe);
  private cdr = inject(ChangeDetectorRef);

  @Input() statuatoryData!: StatutoryInfo;
  @Input() data: any;  
  @Input() loading = false;
  @Output() loadingState = new EventEmitter<boolean>();
  @Output() dataSubmitted = new EventEmitter<any>();
  @Output() nextTab = new EventEmitter<void>();
  @Output() previousTab = new EventEmitter<void>();

  form = this.fb.group({
    userId: <any>[],
    adharNo: [''],
    panNumber: [''],
    esiNumber: [''],
    uanNumber: [''],
    insuranceNumber: [''],
    pfNumber: [''],
    passportNumber: [''],
    passportExpiry: <any>[],
  });

  editStatus: boolean = false;
  currentCompany = environment.company || 'oac';
  placeholders: any = {};
  pUSub!: Subscription;
  private submitSub!: Subscription;
  private id!: number;
  isNext: boolean = false;

  companyPlaceholders: any = {
    oac: {
      adharNo: { label: 'Aadhar Card Number', placeholder: '1234 5678 9012' },
      panNumber: { label: 'Permanent Account Number (PAN)', placeholder: 'ABCDE1234F' },
      pfNumber: { label: 'Provident Fund (PF) Number', placeholder: 'MH/BAN/12345/678' },
      esiNumber: { label: 'Employee State Insurance (ESI)', placeholder: '12345678901234567' },
      uanNumber: { label: 'Universal Account Number (UAN)', placeholder: '100123456789' },
      insuranceNumber: { label: 'Group Medical Insurance Policy No', placeholder: 'POL-2026-98765' },
    },
    leeds: {
      adharNo: { label: 'National ID / Aadhar', placeholder: '1234 5678 9012' },
      panNumber: { label: 'Emirates ID / Tax No', placeholder: '784-1985-1234567-1' },
      pfNumber: { label: 'Work Visa Number', placeholder: 'VISA-12345678' },
      esiNumber: { label: 'Medical Card ID', placeholder: 'MED-456789' },
      uanNumber: { label: 'Labour Card / Employee Code', placeholder: 'LC-987654' },
      insuranceNumber: { label: 'Health Insurance Policy No', placeholder: 'HINS-456789' },
    },
  };

  ngOnInit(): void {
    this.loadCompanyPlaceholders();
  }

  ngOnDestroy(): void {
    this.pUSub?.unsubscribe();
    this.submitSub?.unsubscribe();
  }

  loadCompanyPlaceholders(): void {
    const defaults = {
      adharNo: { label: 'Aadhar Card Number', placeholder: '1234 5678 9012' },
      panNumber: { label: 'Permanent Account Number (PAN)', placeholder: 'ABCDE1234F' },
      pfNumber: { label: 'Provident Fund (PF) Number', placeholder: 'PF12345' },
      esiNumber: { label: 'Employee State Insurance (ESI)', placeholder: 'ESI12345' },
      uanNumber: { label: 'Universal Account Number (UAN)', placeholder: 'UAN12345' },
      insuranceNumber: { label: 'Medical Insurance Policy No', placeholder: 'INS12345' },
    };
    this.placeholders = this.companyPlaceholders[this.currentCompany] || defaults;
    this.cdr.markForCheck();
  }

  triggerNew(data?: any): void {
    this.loadCompanyPlaceholders();
    const target = data || this.statuatoryData || this.data;
    if (target) {
      this.statuatoryData = target;
      this.data = target;
      if (target.id) {
        this.form.patchValue({ userId: target.id });
        this.getStatutoryDetailsByUser(target.id);
      }
    }
    this.cdr.markForCheck();
  }

  getStatutoryDetailsByUser(id: number): void {
    this.pUSub = this.userService.getUserStatutoryuDetailsByUser(id).subscribe({
      next: (data) => {
        if (data) {
          this.id = data.id;
          this.editStatus = true;
          this.form.patchValue({
            adharNo: data.adharNo,
            panNumber: data.panNumber,
            esiNumber: data.esiNumber,
            uanNumber: data.uanNumber,
            insuranceNumber: data.insuranceNumber,
            pfNumber: data.pfNumber,
            passportNumber: data.passportNumber,
            passportExpiry: data.passportExpiry,
          });
          this.cdr.markForCheck();
        }
      },
      error: (err) => {
        console.warn('Could not fetch statutory details for user:', id, err);
      }
    });
  }

  onSubmit(): void {
    this.loadingState.emit(true);
    this.isNext = true;

    const submit = {
      ...this.form.getRawValue()
    };
    submit.userId = submit.userId ? submit.userId : (this.statuatoryData?.id || this.data?.id || this.id);

    if (this.form.get('passportExpiry')?.value) {
      let passportExpiry: any = this.form.get('passportExpiry')?.value;
      if (typeof passportExpiry === 'object' && typeof passportExpiry.format === 'function') {
        submit.passportExpiry = passportExpiry.isValid() ? passportExpiry.format('YYYY-MM-DD') : null;
      } else {
        if (typeof passportExpiry === 'object' && typeof passportExpiry.toDate === 'function') {
          passportExpiry = passportExpiry.toDate();
        }
        submit.passportExpiry = this.datePipe.transform(passportExpiry, 'yyyy-MM-dd') || null;
      }
    }

    if (this.editStatus) {
      this.submitSub = this.userService.updateUserStatutory(this.id, submit).subscribe({
        next: () => {
          this.snackBar.open("Statutory details updated successfully", "Close", { duration: 3000 });
          this.loadingState.emit(false);
          this.dataSubmitted.emit({ isFormSubmitted: true });
          this.cdr.markForCheck();
        },
        error: (err) => {
          this.loadingState.emit(false);
          const msg = err?.error?.message || err?.message || "Failed to update statutory details";
          this.snackBar.open(msg, "Close", { duration: 3500 });
          this.cdr.markForCheck();
        }
      });
    } else {
      this.submitSub = this.userService.addStautoryInfo(submit).subscribe({
        next: (res) => {
          this.editStatus = true;
          this.id = res.id;
          this.snackBar.open("Statutory details saved successfully", "Close", { duration: 3000 });
          this.loadingState.emit(false);
          this.dataSubmitted.emit({ isFormSubmitted: true });
          this.cdr.markForCheck();
        },
        error: (err) => {
          this.loadingState.emit(false);
          const msg = err?.error?.message || err?.message || "Failed to save statutory details";
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
