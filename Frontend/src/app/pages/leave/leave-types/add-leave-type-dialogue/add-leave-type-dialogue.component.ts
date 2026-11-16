/* eslint-disable @typescript-eslint/no-explicit-any */
import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MatTooltipModule } from '@angular/material/tooltip';
import { LeaveType } from '../../../../common/interfaces/leaves/leaveType';
import { NewLeaveService } from '@services/new-leave.service';

export interface LeavePreset {
  name: string;
  category: string;
  icon: string;
  description: string;
}

@Component({
  selector: 'app-add-leave-type-dialogue',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatFormFieldModule,
    MatInputModule,
    MatIconModule,
    MatButtonModule,
    MatProgressSpinnerModule,
    MatDialogModule,
    MatTooltipModule
  ],
  templateUrl: './add-leave-type-dialogue.component.html',
  styleUrl: './add-leave-type-dialogue.component.scss'
})
export class AddLeaveTypeDialogueComponent implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly leaveService = inject(NewLeaveService);
  private readonly snackBar = inject(MatSnackBar);
  public readonly dialogRef = inject(MatDialogRef<AddLeaveTypeDialogueComponent>);
  public readonly leaveType: LeaveType | null = inject(MAT_DIALOG_DATA, { optional: true });

  public isEdit: boolean = false;
  public isSubmitting: boolean = false;

  public readonly presets: LeavePreset[] = [
    { name: 'Maternity Leave', category: 'Parental', icon: 'child_friendly', description: 'Paid maternity leave for new mothers' },
    { name: 'Paternity Leave', category: 'Parental', icon: 'family_restroom', description: 'Statutory leave for new fathers' },
    { name: 'Bereavement Leave', category: 'Compassionate', icon: 'favorite_border', description: 'Compassionate leave for family loss' },
    { name: 'Marriage Leave', category: 'Personal', icon: 'celebration', description: 'Special entitlement for employee wedding' },
    { name: 'Study Leave', category: 'Education', icon: 'school', description: 'Academic exam & certification leave' },
    { name: 'Sabbatical Leave', category: 'Career', icon: 'flight_takeoff', description: 'Extended career or personal sabbatical' },
    { name: 'Annual Leave', category: 'Vacation', icon: 'beach_access', description: 'Earned paid annual holiday' },
    { name: 'Work From Home', category: 'Remote', icon: 'home_work', description: 'Authorized remote work allocation' }
  ];

  public leaveTypeForm = this.fb.group({
    leaveTypeName: ['', [Validators.required, Validators.minLength(2), Validators.maxLength(50)]]
  });

  ngOnInit(): void {
    if (this.leaveType && this.leaveType.id) {
      this.isEdit = true;
      this.leaveTypeForm.patchValue({
        leaveTypeName: this.leaveType.leaveTypeName
      });
    }
  }

  public get currentName(): string {
    return this.leaveTypeForm.value.leaveTypeName || '';
  }

  public get currentLength(): number {
    return this.currentName.length;
  }

  public get isCoreType(): boolean {
    if (!this.leaveType) return false;
    const core = ['Casual Leave', 'Sick Leave', 'Comp Off', 'LOP', 'Maternity Leave'];
    return core.includes(this.leaveType.leaveTypeName);
  }

  public get isUnchanged(): boolean {
    if (!this.isEdit || !this.leaveType) return false;
    return this.currentName.trim() === (this.leaveType.leaveTypeName || '').trim();
  }

  public isPresetSelected(presetName: string): boolean {
    return this.currentName.trim().toLowerCase() === presetName.trim().toLowerCase();
  }

  public selectPreset(preset: LeavePreset): void {
    this.leaveTypeForm.patchValue({ leaveTypeName: preset.name });
    this.leaveTypeForm.markAsDirty();
  }

  public clearName(): void {
    this.leaveTypeForm.patchValue({ leaveTypeName: '' });
    this.leaveTypeForm.markAsDirty();
  }

  public getDetectedCategory(name?: string): string {
    const lower = (name || '').toLowerCase();
    if (lower.includes('materni') || lower.includes('paterni') || lower.includes('parental') || lower.includes('adopt')) {
      return 'Parental & Family';
    }
    if (lower.includes('sick') || lower.includes('medic') || lower.includes('health') || lower.includes('menstru')) {
      return 'Health & Medical';
    }
    if (lower.includes('casual') || lower.includes('marri') || lower.includes('birth') || lower.includes('festiv')) {
      return 'Personal & Celebration';
    }
    if (lower.includes('study') || lower.includes('exam') || lower.includes('train') || lower.includes('sabbat')) {
      return 'Academic & Career';
    }
    if (lower.includes('bereave') || lower.includes('compassion') || lower.includes('mourn')) {
      return 'Compassionate Care';
    }
    if (lower.includes('comp') || lower.includes('lop') || lower.includes('loss')) {
      return 'Statutory & Payroll';
    }
    return 'Corporate Policy';
  }

  public getDetectedIcon(name?: string): string {
    const lower = (name || '').toLowerCase();
    if (lower.includes('materni')) return 'child_friendly';
    if (lower.includes('paterni') || lower.includes('parent')) return 'family_restroom';
    if (lower.includes('sick') || lower.includes('medic') || lower.includes('health')) return 'medical_services';
    if (lower.includes('casual') || lower.includes('privilege') || lower.includes('annual') || lower.includes('vacation')) return 'beach_access';
    if (lower.includes('marri') || lower.includes('wed')) return 'celebration';
    if (lower.includes('bereave') || lower.includes('mourn') || lower.includes('compassion')) return 'favorite_border';
    if (lower.includes('study') || lower.includes('exam')) return 'school';
    if (lower.includes('sabbat')) return 'flight_takeoff';
    if (lower.includes('work from home') || lower.includes('wfh') || lower.includes('remote')) return 'home_work';
    if (lower.includes('comp')) return 'event_repeat';
    if (lower.includes('lop')) return 'do_not_disturb_on';
    return 'category';
  }

  public getAbbreviation(name?: string): string {
    if (!name || !name.trim()) return 'LT';
    const clean = name.trim().replace(/[^a-zA-Z0-9\s]/g, '');
    const words = clean.split(/\s+/).filter(w => !['and', '&', 'of', 'for', 'the'].includes(w.toLowerCase()));
    if (words.length === 1) {
      return words[0].slice(0, 3).toUpperCase();
    }
    return words.slice(0, 3).map(w => w[0].toUpperCase()).join('');
  }

  public getPreviewBadgeClass(name?: string): string {
    const lower = (name || '').toLowerCase();
    if (lower.includes('casual')) return 'badge-casual';
    if (lower.includes('sick') || lower.includes('medic')) return 'badge-sick';
    if (lower.includes('comp')) return 'badge-compoff';
    if (lower.includes('lop')) return 'badge-lop';
    if (lower.includes('materni') || lower.includes('paterni')) return 'badge-parental';
    if (lower.includes('marri') || lower.includes('celebrat')) return 'badge-celebration';
    if (lower.includes('study') || lower.includes('exam')) return 'badge-study';
    if (lower.includes('bereave')) return 'badge-bereave';
    return 'badge-custom';
  }

  public onSubmit(): void {
    if (this.leaveTypeForm.invalid || this.isSubmitting || this.isUnchanged) {
      this.leaveTypeForm.markAllAsTouched();
      return;
    }

    const rawName = this.leaveTypeForm.value.leaveTypeName?.trim();
    if (!rawName) return;

    this.isSubmitting = true;
    const payload = { leaveTypeName: rawName };

    if (this.isEdit && this.leaveType) {
      this.leaveService.updateLeaveType(this.leaveType.id, payload).subscribe({
        next: (res: any) => {
          this.isSubmitting = false;
          this.snackBar.open(res?.message || 'Leave Type updated successfully!', 'Close', { duration: 3000 });
          this.dialogRef.close(true);
        },
        error: (err: any) => {
          this.isSubmitting = false;
          console.error('Update leave type failed:', err);
          this.snackBar.open(err?.error?.message || err?.message || 'Failed to update leave type', 'Close', { duration: 4000 });
        }
      });
    } else {
      this.leaveService.addLeaveType(payload).subscribe({
        next: (res: any) => {
          this.isSubmitting = false;
          this.snackBar.open(res?.message || 'Leave Type created successfully!', 'Close', { duration: 3000 });
          this.dialogRef.close(true);
        },
        error: (err: any) => {
          this.isSubmitting = false;
          console.error('Add leave type failed:', err);
          this.snackBar.open(err?.error?.message || err?.message || 'Failed to create leave type', 'Close', { duration: 4000 });
        }
      });
    }
  }

  public close(): void {
    this.dialogRef.close(false);
  }
}
