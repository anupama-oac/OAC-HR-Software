/* eslint-disable @typescript-eslint/no-explicit-any */
import { CommonModule, DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, inject, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { provideMomentDateAdapter } from '@angular/material-moment-adapter';
import { MatButtonModule } from '@angular/material/button';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatDialogRef, MAT_DIALOG_DATA, MatDialogModule } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatDividerModule } from '@angular/material/divider';

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

export interface AssetReturnDialogData {
  assetName?: string;
  serialNumber?: string;
  assignedDate?: string;
  userName?: string;
  empNo?: string;
}

@Component({
  selector: 'app-asset-return',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatFormFieldModule,
    MatInputModule,
    MatDatepickerModule,
    MatIconModule,
    MatButtonModule,
    MatSelectModule,
    MatTooltipModule,
    MatDividerModule,
    MatDialogModule,
    DatePipe
  ],
  templateUrl: './asset-return.component.html',
  styleUrl: './asset-return.component.scss',
  providers: [provideMomentDateAdapter(MY_FORMATS), DatePipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AssetReturnComponent implements OnInit {
  private fb = inject(FormBuilder);
  private dialogRef = inject(MatDialogRef<AssetReturnComponent>);
  dialogData = inject<AssetReturnDialogData>(MAT_DIALOG_DATA, { optional: true });

  readonly reasonPresets = [
    'Hardware Upgrade',
    'Employee Resignation / Exit',
    'Department / Role Transfer',
    'Faulty / Repair Required',
    'Project Completion',
    'Routine Audit Handover'
  ];

  readonly conditionOptions = [
    { label: 'Good Working Condition', color: '#16a34a' },
    { label: 'Normal Wear & Tear', color: '#2563eb' },
    { label: 'Damaged / Needs Repair', color: '#ea580c' },
    { label: 'Faulty / Inoperative', color: '#dc2626' },
    { label: 'End of Life / Scrapped', color: '#64748b' }
  ];

  assetReturnForm: FormGroup = this.fb.group({
    returnDate: [new Date(), Validators.required],
    condition: ['Good Working Condition', Validators.required],
    reasonPreset: [''],
    note: ['', [Validators.required, Validators.maxLength(500)]]
  });

  ngOnInit(): void {
    // Default form initialized with today's date and clean defaults
  }

  selectPreset(preset: string): void {
    this.assetReturnForm.patchValue({ reasonPreset: preset });
    const currentNote = this.assetReturnForm.get('note')?.value || '';
    if (!currentNote || this.reasonPresets.includes(currentNote)) {
      this.assetReturnForm.patchValue({ note: preset });
    }
  }

  onCancel(): void {
    this.dialogRef.close({ confirmed: false });
  }

  onConfirm(): void {
    if (this.assetReturnForm.invalid) {
      this.assetReturnForm.markAllAsTouched();
      return;
    }

    const val = this.assetReturnForm.value;
    const momentDate: any = val.returnDate;
    const formattedDate = momentDate && typeof momentDate.format === 'function'
      ? momentDate.format('YYYY-MM-DD')
      : (momentDate ? new Date(momentDate).toISOString().split('T')[0] : new Date().toISOString().split('T')[0]);

    const combinedNote = val.condition
      ? `[${val.condition}] ${val.note || ''}`.trim()
      : (val.note || '').trim();

    this.dialogRef.close({
      confirmed: true,
      data: {
        note: combinedNote,
        returnDate: formattedDate,
        condition: val.condition
      }
    });
  }
}
