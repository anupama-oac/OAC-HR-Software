/* eslint-disable @typescript-eslint/no-explicit-any */
import { CommonModule } from '@angular/common';
import { Component, inject, OnDestroy, OnInit } from '@angular/core';
import { FormArray, FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { SafePipe } from '../../../../common/pipes/safe.pipe';
import { forkJoin, Observable, of, Subscription } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { MatSnackBar } from '@angular/material/snack-bar';
import { UsersService } from '@services/users.service';
import { UserDocument } from '../../../../common/interfaces/users/user-document';
import { MatDialogRef, MAT_DIALOG_DATA, MatDialogModule } from '@angular/material/dialog';
import { MatTooltipModule } from '@angular/material/tooltip';
import { environment } from '../../../../../environments/environment';

@Component({
  selector: 'app-edit-user-document',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatFormFieldModule, 
    MatProgressBarModule, 
    MatIconModule, 
    MatInputModule, 
    MatButtonModule, 
    MatCardModule, 
    MatDialogModule,
    MatTooltipModule,
    SafePipe
  ],
  templateUrl: './edit-user-document.component.html',
  styleUrl: './edit-user-document.component.scss'
})
export class EditUserDocumentComponent implements OnInit, OnDestroy {
  s3Url = environment.s3Url || `https://${environment.AWS_BUCKET_NAME || 'aerohr-uploads'}.s3.amazonaws.com/`;
  dialogRef = inject(MatDialogRef<EditUserDocumentComponent>, { optional: true });
  docData = inject(MAT_DIALOG_DATA, { optional: true });
  private fb = inject(FormBuilder);
  private snackBar = inject(MatSnackBar);
  private userService = inject(UsersService);

  mainForm = this.fb.group({
    uploadForms: this.fb.array([])
  });

  index!: number;
  clickedForms: boolean[] = [];
  editStatus: boolean[] = [];
  id: number[] = [];
  files: File[] = [];
  uploadProgress: number[] = [];
  uploadSuccess: boolean[] = [];
  fileType!: string;
  imageUrl: any[] = [];
  allowedFileTypes = ['pdf', 'jpeg', 'jpg', 'png'];

  docSub!: Subscription;
  deleteSub!: Subscription;
  uploadSub!: Subscription;
  submit!: Subscription;
  deleteImageSub!: Subscription;

  ngOnInit(): void {
    if (this.docData?.id) {
      this.getDocumentDetailsByUser(this.docData.id);
    }
  }

  getDocumentDetailsByUser(id: number): void {
    this.docSub = this.userService.getUserDocumentsByUser(id).subscribe({
      next: (res) => {
        const docs = Array.isArray(res) ? res : [];
        this.doc().clear();
        this.id = [];
        this.editStatus = [];
        this.imageUrl = [];
        this.clickedForms = [];

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
      },
      error: () => {
        if (this.doc().length === 0) {
          this.addDoc();
        }
      }
    });
  }

  addDoc(data?: any): void {
    this.doc().push(this.newDoc(data));
    this.clickedForms.push(false);
  }

  removeData(index: number): void {
    const formGroup = this.doc().at(index).value;
    if (formGroup.docUrl && this.id[index] !== undefined) {
      this.deleteSub = this.userService.deleteUserDocComplete(this.id[index]).subscribe(() => {
        this.imageUrl.splice(index, 1);
        this.id.splice(index, 1);
        this.editStatus.splice(index, 1);
        this.doc().removeAt(index);
        this.snackBar.open('Document deleted successfully', 'Close', { duration: 2500 });
      });
    } else {
      this.imageUrl.splice(index, 1);
      this.doc().removeAt(index);
    }
  }

  doc(): FormArray {
    return this.mainForm.get('uploadForms') as FormArray;
  }

  newDoc(initialValue?: UserDocument): FormGroup {
    return this.fb.group({
      userId: [initialValue ? initialValue.userId : this.docData?.id],
      docName: [initialValue ? initialValue.docName : '', Validators.required],
      docUrl: [initialValue ? initialValue.docUrl : '', Validators.required]
    });
  }

  onFileSelected(event: Event, i: number): void {
    const input = event.target as HTMLInputElement;
    const file: any = input.files?.[0];
    if (!file) return;

    const mimeSubtype = (file.type?.split('/')[1] || '').toLowerCase();
    const ext = (file.name?.split('.').pop() || '').toLowerCase();
    if (!this.allowedFileTypes.includes(mimeSubtype) && !this.allowedFileTypes.includes(ext)) {
      this.snackBar.open('Invalid file type. Please select a PDF, JPEG, JPG, or PNG file.', 'Close', { duration: 3000 });
      return;
    }

    const docFormGroup = this.doc().at(i) as FormGroup;
    let docName = (docFormGroup.get('docName')?.value || '').trim();
    if (!docName && file.name) {
      docName = file.name.replace(/\.[^/.]+$/, '').replace(/[_-]+/g, ' ').trim() || `Document ${i + 1}`;
      docFormGroup.get('docName')?.setValue(docName);
    }

    const userName = (this.docData?.name || 'user').replace(/\s+/g, '_');
    const name = `${userName}_${docName.replace(/\s+/g, '_')}`;

    const formData = new FormData();
    formData.append('file', file);
    formData.append('name', name);

    this.uploadSub = this.userService.uploadUserDoc(formData).subscribe({
      next: (invoice) => {
        const fileKey = invoice.fileUrl || invoice.key;
        docFormGroup.get('docUrl')?.setValue(fileKey);
        if (this.docData?.id) {
          docFormGroup.get('userId')?.setValue(this.docData.id);
        }
        docFormGroup.markAsDirty();
        this.imageUrl[i] = invoice.url || (fileKey && fileKey.startsWith('http') ? fileKey : `${this.s3Url}${fileKey}`);

        if (this.docData?.id && docFormGroup.get('docName')?.value && fileKey) {
          this.onSubmit(i, true);
        }
      },
      error: () => {
        this.snackBar.open('File upload failed. Please try again.', 'Close', { duration: 3000 });
      }
    });
  }

  isAnyFormClicked(): boolean {
    for (let i = 0; i < this.clickedForms.length; i++) {
      if (!this.clickedForms[i]) {
        return false;
      }
    }
    return true;
  }

  isAllFormsValidAndSaved(): boolean {
    return this.doc().controls.every((form: any) => form.valid && form.pristine);
  }

  onSubmit(i: number, isAutoSave = false): void {
    const form = this.doc().at(i) as FormGroup;
    if (!form) return;

    if (!form.get('docName')?.value && form.get('docUrl')?.value) {
      form.get('docName')?.setValue(`Document ${i + 1}`);
    }

    const payload = {
      ...form.value,
      userId: Number(form.value.userId || this.docData?.id)
    };

    if (!payload.userId || !payload.docUrl) {
      if (!isAutoSave) {
        this.snackBar.open('Please enter a document name and upload a file first.', 'Close', { duration: 3000 });
      }
      return;
    }

    this.clickedForms[i] = true;
    form.markAsPristine();

    if (this.editStatus[i] && this.id[i]) {
      this.submit = this.userService.updateUserDocumentDetails(this.id[i], payload).subscribe(res => {
        this.id[i] = res.id;
        this.snackBar.open(`${res.docName} updated in employee records`, '', { duration: 3000 });
        if (!isAutoSave) {
          this.dialogRef?.close(true);
        }
      });
    } else {
      this.submit = this.userService.addUserDocumentDetails(payload).subscribe(res => {
        this.editStatus[i] = true;
        this.id[i] = res.id;
        this.snackBar.open(`${res.docName} saved to employee records`, '', { duration: 3000 });
        if (!isAutoSave) {
          this.dialogRef?.close(true);
        }
      });
    }
  }

  completeForm(): void {
    const userId = Number(this.docData?.id);
    const pendingSaves: Observable<any>[] = [];

    if (userId) {
      this.doc().controls.forEach((ctrl, i) => {
        const form = ctrl as FormGroup;
        const docUrl = form.get('docUrl')?.value;
        let docName = (form.get('docName')?.value || '').trim();

        if (docUrl && (!this.editStatus[i] || form.dirty)) {
          if (!docName) {
            docName = `Document ${i + 1}`;
            form.get('docName')?.setValue(docName);
          }
          const payload = { userId, docName, docUrl };
          if (this.editStatus[i] && this.id[i]) {
            pendingSaves.push(
              this.userService.updateUserDocumentDetails(this.id[i], payload).pipe(catchError(() => of(null)))
            );
          } else {
            pendingSaves.push(
              this.userService.addUserDocumentDetails(payload).pipe(catchError(() => of(null)))
            );
          }
        }
      });
    }

    if (pendingSaves.length > 0) {
      forkJoin(pendingSaves).subscribe(() => {
        this.dialogRef?.close(true);
        this.snackBar.open('Documents saved successfully!', '', { duration: 3000 });
      });
    } else {
      this.dialogRef?.close(true);
      this.snackBar.open('Upload completed successfully...', '', { duration: 3000 });
    }
  }

  onDeleteImage(i: number): void {
    if (this.id[i]) {
      this.deleteImageSub = this.userService.deleteUserDoc(this.id[i], this.imageUrl[i]).subscribe(() => {
        this.imageUrl[i] = '';
        this.doc().at(i).get('docUrl')?.setValue('');
        this.snackBar.open('Document attachment removed', '', { duration: 3000 });
      });
    } else {
      this.deleteImageSub = this.userService.deleteUserDocByurl(this.imageUrl[i]).subscribe(() => {
        this.imageUrl[i] = '';
        this.doc().at(i).get('docUrl')?.setValue('');
        this.snackBar.open('Document attachment removed', '', { duration: 3000 });
      });
    }
  }

  ngOnDestroy(): void {
    this.docSub?.unsubscribe();
    this.uploadSub?.unsubscribe();
    this.submit?.unsubscribe();
    this.deleteSub?.unsubscribe();
    this.deleteImageSub?.unsubscribe();
  }
}
