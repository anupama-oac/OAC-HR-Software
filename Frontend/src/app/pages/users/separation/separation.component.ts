/* eslint-disable @typescript-eslint/no-explicit-any */
import { CommonModule, DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, ChangeDetectorRef, Component, inject, OnDestroy, OnInit } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { provideMomentDateAdapter } from '@angular/material-moment-adapter';
import { MatButtonModule } from '@angular/material/button';
import { MatNativeDateModule } from '@angular/material/core';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatTooltipModule } from '@angular/material/tooltip';
import { UsersService } from '@services/users.service';
import { Subscription } from 'rxjs';

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

export interface SeparationReasonItem {
  value: string;
  label: string;
  icon: string;
}

@Component({
  selector: 'app-separation',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatNativeDateModule,
    MatDatepickerModule,
    MatIconModule,
    MatSelectModule,
    MatDialogModule,
    MatTooltipModule
  ],
  templateUrl: './separation.component.html',
  styleUrl: './separation.component.scss',
  providers: [provideMomentDateAdapter(MY_FORMATS), DatePipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SeparationComponent implements OnInit, OnDestroy {
  private fb = inject(FormBuilder);
  private userService = inject(UsersService);
  private dialogRef = inject(MatDialogRef<SeparationComponent>);
  private datePipe = inject(DatePipe);
  private cdr = inject(ChangeDetectorRef);
  public data = inject(MAT_DIALOG_DATA);

  empSub!: Subscription;

  separationReasons: SeparationReasonItem[] = [
    { value: 'Resignation', label: 'Voluntary Resignation', icon: 'logout' },
    { value: 'Retirement', label: 'Retirement', icon: 'celebration' },
    { value: 'Contract End', label: 'End of Contract / Term', icon: 'assignment_turned_in' },
    { value: 'Mutual Separation', label: 'Mutual Agreement', icon: 'handshake' },
    { value: 'Career Break', label: 'Career Break / Higher Studies', icon: 'school' },
    { value: 'Termination', label: 'Involuntary Termination', icon: 'cancel' },
    { value: 'Health Reasons', label: 'Health / Medical Reasons', icon: 'health_and_safety' },
    { value: 'Other', label: 'Other / Custom Reason', icon: 'more_horiz' }
  ];

  separationForm = this.fb.group({
    reason: ['Resignation', Validators.required],
    separationDate: [<any>new Date(), Validators.required],
    note: ['']
  });

  ngOnInit(): void {
    if (this.data.type === 'update') {
      this.getEmployee();
    } else {
      this.separationForm.patchValue({
        separationDate: new Date()
      });
    }
  }

  ngOnDestroy(): void {
    this.empSub?.unsubscribe();
  }

  getEmployee(): void {
    this.empSub = this.userService.getUserById(this.data.id).subscribe((res) => {
      let rawNote = res?.separationNote || '';
      let matchedReason = 'Resignation';
      let extractedNote = rawNote;

      const bracketMatch = rawNote.match(/^\[(.*?)\]\s*(.*)$/);
      if (bracketMatch) {
        matchedReason = bracketMatch[1];
        extractedNote = bracketMatch[2];
      } else {
        const colonMatch = rawNote.match(/^([A-Za-z\s/]+):\s*(.*)$/);
        if (colonMatch && this.separationReasons.some(r => r.value.toLowerCase() === colonMatch[1].trim().toLowerCase())) {
          matchedReason = colonMatch[1].trim();
          extractedNote = colonMatch[2];
        }
      }

      this.separationForm.patchValue({
        reason: matchedReason,
        separationDate: res.separationDate ? new Date(res.separationDate) : new Date(),
        note: extractedNote
      });
      this.cdr.markForCheck();
    });
  }

  setToday(): void {
    this.separationForm.patchValue({ separationDate: new Date() });
    this.separationForm.get('separationDate')?.markAsDirty();
  }

  setEndOfMonth(): void {
    const now = new Date();
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    this.separationForm.patchValue({ separationDate: endOfMonth });
    this.separationForm.get('separationDate')?.markAsDirty();
  }

  onCancel(): void {
    this.dialogRef.close({ confirmed: false });
  }

  onConfirm(): void {
    if (this.separationForm.valid) {
      const formVal = this.separationForm.value;
      const dateVal = formVal.separationDate;
      const formattedDate = dateVal
        ? this.datePipe.transform(dateVal, 'yyyy-MM-dd')
        : this.datePipe.transform(new Date(), 'yyyy-MM-dd');

      const reason = formVal.reason || 'Resignation';
      const noteText = formVal.note?.trim() || '';
      const fullNote = noteText ? `[${reason}] ${noteText}` : reason;

      this.dialogRef.close({
        confirmed: true,
        note: fullNote,
        date: formattedDate
      });
    }
  }
}
