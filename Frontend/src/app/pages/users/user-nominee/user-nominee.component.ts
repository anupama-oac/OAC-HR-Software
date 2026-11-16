/* eslint-disable @typescript-eslint/no-explicit-any */
import { Component, EventEmitter, inject, Input, OnDestroy, Output, ChangeDetectionStrategy, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatOptionModule } from '@angular/material/core';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MatTooltipModule } from '@angular/material/tooltip';
import { UsersService } from '@services/users.service';
import { Subscription } from 'rxjs';

@Component({
  selector: 'app-user-nominee',
  standalone: true,
  imports: [
    CommonModule,
    MatCardModule,
    MatFormFieldModule,
    MatInputModule,
    ReactiveFormsModule,
    MatIconModule,
    MatButtonModule,
    MatOptionModule,
    MatSelectModule,
    MatTooltipModule
  ],
  templateUrl: './user-nominee.component.html',
  styleUrl: './user-nominee.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class UserNomineeComponent implements OnDestroy {
  relations = [
    'Father',
    'Mother',
    'Spouse',
    'Son',
    'Daughter',
    'Brother',
    'Sister',
    'Guardian',
    'Friend',
    'Other'
  ];

  @Input() nomineeData: any;
  @Input() data: any;
  @Input() loading = false;
  @Output() loadingState = new EventEmitter<boolean>();
  @Output() dataSubmitted = new EventEmitter<any>();
  @Output() nextTab = new EventEmitter<void>();
  @Output() previousTab = new EventEmitter<void>();

  private fb = inject(FormBuilder);
  private userService = inject(UsersService);
  private snackBar = inject(MatSnackBar);
  private cdr = inject(ChangeDetectorRef);

  form = this.fb.group({
    userId: [''],
    nomineeName: [''],
    nomineeContactNumber: [''],
    nomineeRelation: [''],
    aadhaarNumber: ['']
  });

  editStatus: boolean = false;
  id!: number;
  private pUSub!: Subscription;
  private submitSub!: Subscription;
  isNext: boolean = false;

  ngOnDestroy(): void {
    this.pUSub?.unsubscribe();
    this.submitSub?.unsubscribe();
  }

  triggerNew(data?: any): void {
    const target = data || this.nomineeData || this.data;
    if (target) {
      this.nomineeData = target;
      this.data = target;
      if (target.id) {
        this.form.patchValue({ userId: target.id });
        this.getPositionDetailsByUser(target.id);
      }
    }
    this.cdr.markForCheck();
  }

  getPositionDetailsByUser(id: number): void {
    this.pUSub = this.userService.getUserNomineeDetailsByUser(id).subscribe({
      next: (data) => {
        if (data) {
          this.id = data.id;
          this.editStatus = true;
          this.form.patchValue({
            nomineeName: data.nomineeName,
            nomineeContactNumber: data.nomineeContactNumber,
            nomineeRelation: data.nomineeRelation,
            aadhaarNumber: data.aadhaarNumber
          });
          this.cdr.markForCheck();
        }
      },
      error: (err) => {
        console.warn('Could not fetch nominee details for user:', id, err);
      }
    });
  }

  onSubmit(): void {
    this.loadingState.emit(true);
    this.isNext = true;

    const submit = {
      ...this.form.getRawValue()
    };
    submit.userId = submit.userId ? submit.userId : (this.nomineeData?.id || this.data?.id || this.id);

    if (this.editStatus) {
      this.submitSub = this.userService.updateUserNominee(this.id, submit).subscribe({
        next: () => {
          this.snackBar.open("Nominee details updated successfully", "Close", { duration: 3000 });
          this.loadingState.emit(false);
          this.dataSubmitted.emit({ isFormSubmitted: true });
          this.cdr.markForCheck();
        },
        error: (err) => {
          this.loadingState.emit(false);
          const msg = err?.error?.message || err?.message || "Failed to update nominee details";
          this.snackBar.open(msg, "Close", { duration: 3500 });
          this.cdr.markForCheck();
        }
      });
    } else {
      this.submitSub = this.userService.addUserNomineeDetails(submit).subscribe({
        next: (res) => {
          this.editStatus = true;
          this.id = res.id;
          this.snackBar.open("Nominee details saved successfully", "Close", { duration: 3000 });
          this.loadingState.emit(false);
          this.dataSubmitted.emit({ isFormSubmitted: true });
          this.cdr.markForCheck();
        },
        error: (err) => {
          this.loadingState.emit(false);
          const msg = err?.error?.message || err?.message || "Failed to save nominee details";
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
