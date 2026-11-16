/* eslint-disable @typescript-eslint/no-explicit-any */
import { CommonModule } from '@angular/common';
import { Component, EventEmitter, inject, Input, OnDestroy, OnInit, Output } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatDialogModule, MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MatTooltipModule } from '@angular/material/tooltip';
import { Subscription } from 'rxjs';
import { AnnouncementsService } from '@services/announcements.service';
import { environment } from '../../../../environments/environment';

export interface AnnouncementTypeOption {
  value: string;
  label: string;
  icon: string;
  hint: string;
  colorClass: string;
}

@Component({
  selector: 'app-add-announcements',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatIconModule,
    MatSlideToggleModule,
    MatProgressSpinnerModule,
    MatTooltipModule,
    MatDialogModule
  ],
  templateUrl: './add-announcements.component.html',
  styleUrl: './add-announcements.component.scss'
})
export class AddAnnouncementsComponent implements OnInit, OnDestroy {
  @Input() message: string = '';
  @Input() type: string = 'info';
  @Input() dismissible: boolean = true;
  @Output() dismissedEvent = new EventEmitter<void>();

  fb = inject(FormBuilder);
  announcementService = inject(AnnouncementsService);
  dialogRef = inject(MatDialogRef<AddAnnouncementsComponent>, { optional: true });
  data = inject(MAT_DIALOG_DATA, { optional: true });
  snackBar = inject(MatSnackBar);

  readonly announcementTypes: AnnouncementTypeOption[] = [
    { value: 'info', label: 'Information', icon: 'info', hint: 'General company news & updates', colorClass: 'type-info' },
    { value: 'success', label: 'Success', icon: 'check_circle', hint: 'Celebrations, milestones & achievements', colorClass: 'type-success' },
    { value: 'warning', label: 'Warning', icon: 'warning', hint: 'Important reminders & scheduled maintenance', colorClass: 'type-warning' },
    { value: 'error', label: 'Urgent', icon: 'campaign', hint: 'Critical alerts requiring immediate attention', colorClass: 'type-error' }
  ];

  form = this.fb.group({
    message: ['', [Validators.required, Validators.minLength(3), Validators.maxLength(1000)]],
    type: ['info', Validators.required],
    dismissible: [true],
    fileUrl: ['']
  });

  isSubmitting = false;
  isUploading = false;
  isDeletingFile = false;
  imageUrl: string = '';
  selectedFileName: string = '';
  isDragOver = false;

  private uploadSub?: Subscription;
  private ancmntSub?: Subscription;

  ngOnInit(): void {
    if (this.data) {
      if (this.data.message) this.form.get('message')?.setValue(this.data.message);
      if (this.data.type) this.form.get('type')?.setValue(this.data.type);
      if (typeof this.data.dismissible === 'boolean') this.form.get('dismissible')?.setValue(this.data.dismissible);
      if (this.data.fileUrl) {
        this.form.get('fileUrl')?.setValue(this.data.fileUrl);
        this.imageUrl = this.formatFileUrl(this.data.fileUrl);
        this.selectedFileName = this.getFileName(this.data.fileUrl);
      }
    } else if (this.message) {
      this.form.get('message')?.setValue(this.message);
      this.form.get('type')?.setValue(this.type || 'info');
      this.form.get('dismissible')?.setValue(this.dismissible);
    }
  }

  ngOnDestroy(): void {
    this.uploadSub?.unsubscribe();
    this.ancmntSub?.unsubscribe();
  }

  selectType(typeValue: string): void {
    this.form.get('type')?.setValue(typeValue);
    this.form.get('type')?.markAsDirty();
  }

  isPdf(url?: string): boolean {
    const target = (url || this.selectedFileName || this.imageUrl || '').toLowerCase();
    return target.endsWith('.pdf');
  }

  getFileName(url?: string): string {
    if (this.selectedFileName) return this.selectedFileName;
    if (!url) return 'Attachment';
    const parts = url.split('/');
    const name = parts[parts.length - 1];
    return name.replace(/^\d+_/, '') || 'Attachment';
  }

  formatFileUrl(key?: string): string {
    if (!key) return '';
    if (key.startsWith('http://') || key.startsWith('https://')) {
      return key;
    }
    const base = environment.s3Url || 'https://approval-management-data-s3.s3.ap-south-1.amazonaws.com/';
    return `${base.replace(/\/+$/, '')}/${key.replace(/^\/+/, '')}`;
  }

  onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (file) {
      this.processFile(file);
    }
    input.value = '';
  }

  onFileDropped(event: DragEvent): void {
    event.preventDefault();
    this.isDragOver = false;
    const file = event.dataTransfer?.files?.[0];
    if (file) {
      this.processFile(file);
    }
  }

  onDragOver(event: DragEvent): void {
    event.preventDefault();
    this.isDragOver = true;
  }

  onDragLeave(event: DragEvent): void {
    event.preventDefault();
    this.isDragOver = false;
  }

  private processFile(file: File): void {
    const name = file.name || '';
    const ext = name.substring(name.lastIndexOf('.') + 1).toLowerCase();
    const allowed = ['pdf', 'jpeg', 'jpg', 'png', 'webp'];
    if (!allowed.includes(ext)) {
      this.snackBar.open('Unsupported file format. Please upload a PDF, PNG, JPG, or WEBP file.', 'Close', { duration: 3500 });
      return;
    }

    const maxSize = 15 * 1024 * 1024; // 15MB
    if (file.size > maxSize) {
      this.snackBar.open('File size exceeds the 15MB limit.', 'Close', { duration: 3500 });
      return;
    }

    this.selectedFileName = file.name;
    this.isUploading = true;

    const formData = new FormData();
    formData.append('file', file);

    this.uploadSub?.unsubscribe();
    this.uploadSub = this.announcementService.uploadAnnouncementDoc(formData).subscribe({
      next: (invoice) => {
        this.isUploading = false;
        const uploadedKey = invoice?.fileUrl || '';
        this.form.get('fileUrl')?.setValue(uploadedKey);
        this.imageUrl = this.formatFileUrl(uploadedKey);
        this.snackBar.open('Attachment uploaded successfully!', 'Close', { duration: 2500 });
      },
      error: (err) => {
        this.isUploading = false;
        this.selectedFileName = '';
        this.snackBar.open(err?.error?.message || 'Failed to upload attachment. Please try again.', 'Close', { duration: 3500 });
      }
    });
  }

  onDeleteAttachment(): void {
    const currentKey = this.form.get('fileUrl')?.value || '';
    if (!currentKey && !this.imageUrl) {
      this.resetAttachmentState();
      return;
    }

    this.isDeletingFile = true;
    this.announcementService.deleteAnouncemntUploadByurl(this.imageUrl).subscribe({
      next: () => {
        this.isDeletingFile = false;
        this.resetAttachmentState();
        this.snackBar.open('Attachment removed.', 'Close', { duration: 2500 });
      },
      error: () => {
        // Even if remote deletion returns error, clear the local form attachment
        this.isDeletingFile = false;
        this.resetAttachmentState();
      }
    });
  }

  private resetAttachmentState(): void {
    this.imageUrl = '';
    this.selectedFileName = '';
    this.form.get('fileUrl')?.setValue('');
  }

  addAnnouncement(): void {
    if (this.form.invalid || this.isSubmitting || this.isUploading) {
      this.form.markAllAsTouched();
      return;
    }

    this.isSubmitting = true;
    const payload = this.form.getRawValue();

    this.ancmntSub?.unsubscribe();
    this.ancmntSub = this.announcementService.addAnnouncement(payload).subscribe({
      next: (res) => {
        this.isSubmitting = false;
        this.announcementService.triggerSubmit(res);
        this.dialogRef?.close(true);
        this.snackBar.open('Announcement published successfully!', 'Close', { duration: 3000 });
      },
      error: (err) => {
        this.isSubmitting = false;
        this.snackBar.open(err?.error?.message || 'Failed to publish announcement. Please try again.', 'Close', { duration: 3500 });
      }
    });
  }

  close(): void {
    this.dialogRef?.close();
  }
}
