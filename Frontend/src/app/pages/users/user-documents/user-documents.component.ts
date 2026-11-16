/* eslint-disable @typescript-eslint/no-explicit-any */
import { Component, EventEmitter, inject, Input, OnDestroy, Output, ChangeDetectionStrategy, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormArray, FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatDialog } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatAutocompleteModule } from '@angular/material/autocomplete';
import { Router } from '@angular/router';
import { forkJoin, Observable, of, Subscription } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { UsersService } from '@services/users.service';
import { UserDocument } from '../../../common/interfaces/users/user-document';
import { SafePipe } from "../../../common/pipes/safe.pipe";
import { environment } from '../../../../environments/environment';

@Component({
  selector: 'app-user-documents',
  standalone: true,
  imports: [
    CommonModule,
    MatFormFieldModule,
    ReactiveFormsModule,
    MatProgressBarModule,
    MatIconModule,
    MatInputModule,
    MatButtonModule,
    MatCardModule,
    MatTooltipModule,
    MatAutocompleteModule,
    SafePipe
  ],
  templateUrl: './user-documents.component.html',
  styleUrl: './user-documents.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class UserDocumentsComponent implements OnDestroy {
  s3Url = environment.s3Url || `https://${environment.AWS_BUCKET_NAME || 'aerohr-uploads'}.s3.amazonaws.com/`;
  @Input() data: any;
  @Input() loading = false;
  @Output() loadingState = new EventEmitter<boolean>();
  @Output() nextTab = new EventEmitter<void>();
  @Output() previousTab = new EventEmitter<void>();

  private fb = inject(FormBuilder);
  private userSevice = inject(UsersService);
  private snackBar = inject(MatSnackBar);
  private router = inject(Router);
  private dialog = inject(MatDialog);
  private cdr = inject(ChangeDetectorRef);

  userId!: number;

  documentSuggestions = [
    'Aadhaar Card',
    'PAN Card',
    'Passport Copy',
    'Resume / Curriculum Vitae',
    'Appointment / Offer Letter',
    'Highest Degree Certificate',
    'Previous Company Relieving Letter',
    'Experience Certificate',
    'Recent Pay Slips (Last 3 Months)',
    'Medical Fitness Certificate',
    'Driving License',
    'Other Document'
  ];

  mainForm = this.fb.group({
    uploadForms: this.fb.array([])
  });

  editStatus: boolean[] = [];
  id: number[] = [];
  imageUrl: any[] = [];
  uploading: boolean[] = [];
  allowedFileTypes = ['pdf', 'jpeg', 'jpg', 'png'];

  private docSub!: Subscription;
  private uploadSub!: Subscription;
  private deleteSub!: Subscription;
  private deleteImageSub!: Subscription;
  private submit!: Subscription;

  ngOnDestroy(): void {
    this.docSub?.unsubscribe();
    this.uploadSub?.unsubscribe();
    this.submit?.unsubscribe();
    this.deleteSub?.unsubscribe();
    this.deleteImageSub?.unsubscribe();
  }

  private resolveUserId(): number {
    return Number(this.userId || this.data?.id || 0);
  }

  trigger(): void {
    if (this.doc().length === 0) {
      this.addDoc();
    }
  }

  triggerNew(data?: any): void {
    const target = data || this.data;
    if (target) {
      this.data = target;
      if (target.id) {
        this.userId = Number(target.id);
      }
    }
    const uid = this.resolveUserId();
    if (uid) {
      this.doc().controls.forEach(ctrl => {
        if (!ctrl.get('userId')?.value) {
          ctrl.get('userId')?.setValue(uid, { emitEvent: false });
        }
      });
      this.getDocumentDetailsByUser(uid);
    } else {
      if (this.doc().length === 0) {
        this.addDoc();
      }
    }
    this.cdr.markForCheck();
  }

  getDocumentDetailsByUser(id: number): void {
    this.userId = Number(id);
    this.docSub = this.userSevice.getUserDocumentsByUser(id).subscribe({
      next: (res) => {
        const docs = Array.isArray(res) ? res : [];
        this.doc().clear();
        this.id = [];
        this.editStatus = [];
        this.imageUrl = [];

        if (docs.length > 0) {
          for (let i = 0; i < docs.length; i++) {
            this.id[i] = docs[i].id;
            this.editStatus[i] = true;
            this.addDoc(docs[i]);
            if (docs[i].docUrl) {
              this.imageUrl[i] = docs[i].docUrl.startsWith('http') ? docs[i].docUrl : `${this.s3Url}${docs[i].docUrl}`;
            }
          }
        } else {
          this.addDoc();
        }
        this.cdr.markForCheck();
      },
      error: (err) => {
        console.warn('Could not fetch user documents:', id, err);
        if (this.doc().length === 0) {
          this.addDoc();
        }
        this.cdr.markForCheck();
      }
    });
  }

  doc(): FormArray {
    return this.mainForm.get('uploadForms') as FormArray;
  }

  newDoc(initialValue?: UserDocument): FormGroup {
    return this.fb.group({
      userId: [initialValue ? initialValue.userId : (this.resolveUserId() || '')],
      docName: [initialValue ? initialValue.docName : '', Validators.required],
      docUrl: [initialValue ? initialValue.docUrl : '', Validators.required]
    });
  }

  addDoc(data?: any): void {
    this.doc().push(this.newDoc(data));
    this.uploading.push(false);
    this.cdr.markForCheck();
  }

  removeData(index: number): void {
    const formGroup = this.doc().at(index).value;
    if (formGroup.docUrl && this.id[index] !== undefined) {
      this.deleteSub = this.userSevice.deleteUserDocComplete(this.id[index]).subscribe({
        next: () => {
          this.imageUrl.splice(index, 1);
          this.id.splice(index, 1);
          this.editStatus.splice(index, 1);
          this.doc().removeAt(index);
          this.snackBar.open("Document removed successfully", "Close", { duration: 2500 });
          this.cdr.markForCheck();
        },
        error: () => {
          this.snackBar.open("Failed to delete document", "Close", { duration: 2500 });
        }
      });
    } else {
      this.imageUrl.splice(index, 1);
      this.doc().removeAt(index);
      this.cdr.markForCheck();
    }
  }

  onFileSelected(event: Event, i: number): void {
    const input = event.target as HTMLInputElement;
    const file: any = input.files?.[0];
    if (!file) return;

    const mimeSubtype = (file.type?.split('/')[1] || '').toLowerCase();
    const ext = (file.name?.split('.').pop() || '').toLowerCase();
    if (!this.allowedFileTypes.includes(mimeSubtype) && !this.allowedFileTypes.includes(ext)) {
      this.snackBar.open('Invalid file type. Please upload a PDF, JPEG, JPG, or PNG document.', 'Close', { duration: 3500 });
      return;
    }

    const docFormGroup = this.doc().at(i) as FormGroup;
    let currentDocName = (docFormGroup.get('docName')?.value || '').trim();
    if (!currentDocName && file.name) {
      currentDocName = file.name.replace(/\.[^/.]+$/, '').replace(/[_-]+/g, ' ').trim() || `Document ${i + 1}`;
      docFormGroup.get('docName')?.setValue(currentDocName);
    }

    const userName = (this.data?.name || 'user').replace(/\s+/g, '_');
    const safeDocName = (currentDocName || 'document').replace(/\s+/g, '_');
    const fileName = `${userName}_${safeDocName}_${Date.now()}`;

    const formData = new FormData();
    formData.append('file', file);
    formData.append('name', fileName);

    this.uploading[i] = true;
    this.cdr.markForCheck();

    this.uploadSub = this.userSevice.uploadUserDoc(formData).subscribe({
      next: (invoice) => {
        this.uploading[i] = false;
        const fileKey = invoice.fileUrl || invoice.key;
        docFormGroup.get('docUrl')?.setValue(fileKey);
        const uid = this.resolveUserId();
        if (uid) {
          docFormGroup.get('userId')?.setValue(uid);
        }
        docFormGroup.markAsDirty();
        this.imageUrl[i] = invoice.url || (fileKey && fileKey.startsWith('http') ? fileKey : `${this.s3Url}${fileKey}`);
        this.cdr.markForCheck();

        // Automatically persist the uploaded document record into the database table
        if (uid && docFormGroup.get('docName')?.value && fileKey) {
          this.onSubmit(i, true);
        } else {
          this.snackBar.open('File uploaded. Click Save to store document.', 'Close', { duration: 2500 });
        }
      },
      error: () => {
        this.uploading[i] = false;
        this.snackBar.open('File upload failed. Please try again.', 'Close', { duration: 3000 });
        this.cdr.markForCheck();
      }
    });
  }

  onDeleteImage(i: number): void {
    if (this.id[i]) {
      this.deleteImageSub = this.userSevice.deleteUserDoc(this.id[i], this.imageUrl[i]).subscribe({
        next: () => {
          this.imageUrl[i] = '';
          this.doc().at(i).get('docUrl')?.setValue('');
          this.snackBar.open("File attachment removed", "Close", { duration: 2500 });
          this.cdr.markForCheck();
        }
      });
    } else {
      this.imageUrl[i] = '';
      this.doc().at(i).get('docUrl')?.setValue('');
      this.snackBar.open("File attachment removed", "Close", { duration: 2500 });
      this.cdr.markForCheck();
    }
  }

  onSubmit(i: number, isAutoSave = false): void {
    const form = this.doc().at(i) as FormGroup;
    if (!form) return;

    if (!form.get('docName')?.value && form.get('docUrl')?.value) {
      form.get('docName')?.setValue(`Document ${i + 1}`);
    }

    if (form.invalid) {
      if (!isAutoSave) {
        this.snackBar.open("Please enter a document title and attach a file first", "Close", { duration: 3000 });
      }
      return;
    }

    const resolvedUserId = Number(form.value.userId || this.resolveUserId());
    if (!resolvedUserId) {
      this.snackBar.open("Employee ID is missing. Please save Basic Info first.", "Close", { duration: 3000 });
      return;
    }

    if (!isAutoSave) {
      this.loadingState.emit(true);
    }
    form.markAsPristine();

    const payload = {
      ...form.value,
      userId: resolvedUserId
    };

    if (this.editStatus[i] && this.id[i]) {
      this.submit = this.userSevice.updateUserDocumentDetails(this.id[i], payload).subscribe({
        next: (res) => {
          this.id[i] = res.id;
          this.snackBar.open(`${res.docName || 'Document'} saved to employee records`, "Close", { duration: 3000 });
          this.loadingState.emit(false);
          this.cdr.markForCheck();
        },
        error: () => {
          this.loadingState.emit(false);
          this.snackBar.open("Failed to update document in database", "Close", { duration: 3000 });
          this.cdr.markForCheck();
        }
      });
    } else {
      this.submit = this.userSevice.addUserDocumentDetails(payload).subscribe({
        next: (res) => {
          this.editStatus[i] = true;
          this.id[i] = res.id;
          this.snackBar.open(`${res.docName || 'Document'} uploaded & saved successfully`, "Close", { duration: 3000 });
          this.loadingState.emit(false);
          this.cdr.markForCheck();
        },
        error: () => {
          this.loadingState.emit(false);
          this.snackBar.open("Failed to save document in database", "Close", { duration: 3000 });
          this.cdr.markForCheck();
        }
      });
    }
  }

  completeForm(): void {
    const resolvedUserId = this.resolveUserId();
    const pendingSaves: Observable<any>[] = [];

    if (resolvedUserId) {
      this.doc().controls.forEach((ctrl, i) => {
        const form = ctrl as FormGroup;
        const docUrl = form.get('docUrl')?.value;
        let docName = (form.get('docName')?.value || '').trim();

        if (docUrl && (!this.editStatus[i] || form.dirty)) {
          if (!docName) {
            docName = `Document ${i + 1}`;
            form.get('docName')?.setValue(docName);
          }
          const payload = {
            userId: resolvedUserId,
            docName,
            docUrl
          };
          if (this.editStatus[i] && this.id[i]) {
            pendingSaves.push(
              this.userSevice.updateUserDocumentDetails(this.id[i], payload).pipe(catchError(() => of(null)))
            );
          } else {
            pendingSaves.push(
              this.userSevice.addUserDocumentDetails(payload).pipe(catchError(() => of(null)))
            );
          }
        }
      });
    }

    if (pendingSaves.length > 0) {
      this.loadingState.emit(true);
      forkJoin(pendingSaves).subscribe({
        next: () => {
          this.loadingState.emit(false);
          this.snackBar.open(`Employee onboarding & documents saved successfully!`, "Close", { duration: 3500 });
          this.dialog.closeAll();
          this.router.navigateByUrl('/login/users');
        },
        error: () => {
          this.loadingState.emit(false);
          this.dialog.closeAll();
          this.router.navigateByUrl('/login/users');
        }
      });
    } else {
      this.snackBar.open(`Employee onboarding completed successfully!`, "Close", { duration: 3500 });
      this.dialog.closeAll();
      this.router.navigateByUrl('/login/users');
    }
  }

  triggerPreviousTab(): void {
    this.previousTab.emit();
  }

  isPdf(url: string): boolean {
    return !!url && url.toLowerCase().includes('.pdf');
  }
}
