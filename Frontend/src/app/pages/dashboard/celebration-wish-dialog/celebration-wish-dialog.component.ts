/* eslint-disable @typescript-eslint/no-explicit-any */
import { CommonModule, DatePipe } from '@angular/common';
import { AfterViewInit, Component, ElementRef, Inject, OnInit, ViewChild, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MatTooltipModule } from '@angular/material/tooltip';
import { AnnouncementsService } from '@services/announcements.service';
import { UsersService } from '@services/users.service';
import { environment } from '../../../../environments/environment';

export interface CelebrationPopupItem {
  userId: number;
  name: string;
  empNo?: string;
  email?: string;
  avatarUrl?: string;
  type: 'birthday' | 'anniversary';
  date: string | Date;
  years?: number;
  isToday?: boolean;
  wishId?: number;
  title?: string;
  message?: string;
  imageUrl?: string;
  createdBy?: string;
}

export interface CelebrationWishDialogData {
  items: CelebrationPopupItem[];
  initialIndex?: number;
  canEdit?: boolean;
  allowUploadAndEdit?: boolean;
  currentUserName?: string;
  currentUserDesignation?: string;
  startInEditMode?: boolean;
}

@Component({
  selector: 'app-celebration-wish-dialog',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatDialogModule,
    MatButtonModule,
    MatIconModule,
    MatFormFieldModule,
    MatInputModule,
    MatTooltipModule,
    MatProgressSpinnerModule,
    DatePipe
  ],
  templateUrl: './celebration-wish-dialog.component.html',
  styleUrl: './celebration-wish-dialog.component.scss'
})
export class CelebrationWishDialogComponent implements OnInit, AfterViewInit {
  @ViewChild('scrollBody') scrollBody?: ElementRef<HTMLDivElement>;

  s3Url = environment.s3Url || `https://${environment.AWS_BUCKET_NAME || 'aerohr-uploads'}.s3.amazonaws.com/`;
  private usersService = inject(UsersService);
  private announcementsService = inject(AnnouncementsService);
  private snackBar = inject(MatSnackBar);

  items: CelebrationPopupItem[] = [];
  currentIndex = 0;
  allowUploadAndEdit = false;
  isEditing = false;
  isSaving = false;
  isUploadingImage = false;
  postToAnnouncements = false;
  hasChangesSaved = false;

  // Editable form state for current item
  editTitle = '';
  editMessage = '';
  editImageUrl = '';

  get isGraphicDesigner(): boolean {
    const checkString = (str?: string): boolean => {
      if (!str) return false;
      const s = str.toLowerCase().trim();
      return (
        s === 'graphic designer' ||
        s === 'graphic desihner' ||
        s.includes('graphic designer') ||
        s.includes('graphic desihner')
      );
    };

    if (checkString(this.data?.currentUserDesignation)) {
      return true;
    }

    try {
      const token = localStorage.getItem('token');
      if (token) {
        const u = JSON.parse(token);
        if (
          checkString(u?.designationName) ||
          checkString(u?.roleName) ||
          checkString(u?.designation) ||
          checkString(u?.userPosition?.designation?.designationName) ||
          checkString(u?.designation?.designationName)
        ) {
          return true;
        }
      }
    } catch (_) {}

    return false;
  }

  constructor(
    public dialogRef: MatDialogRef<CelebrationWishDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: CelebrationWishDialogData
  ) {}

  ngOnInit(): void {
    this.allowUploadAndEdit = !!this.data?.allowUploadAndEdit;

    this.items = (this.data?.items || []).map(item => ({
      ...item,
      title: item.title || this.getDefaultTitle(item),
      message: item.message || this.getDefaultMessage(item)
    }));

    this.currentIndex = Math.min(
      Math.max(0, this.data?.initialIndex || 0),
      Math.max(0, this.items.length - 1)
    );

    this.loadCurrentIntoEditor();

    if (this.allowUploadAndEdit && this.data?.startInEditMode !== false) {
      this.isEditing = true;
    }
  }

  ngAfterViewInit(): void {
    setTimeout(() => {
      if (this.scrollBody?.nativeElement) {
        this.scrollBody.nativeElement.scrollTop = 0;
      }
    }, 50);
  }

  get currentItem(): CelebrationPopupItem | undefined {
    return this.items[this.currentIndex];
  }

  selectItem(index: number): void {
    if (index < 0 || index >= this.items.length) return;
    this.currentIndex = index;
    this.loadCurrentIntoEditor();
  }

  prevItem(): void {
    if (this.currentIndex > 0) {
      this.selectItem(this.currentIndex - 1);
    }
  }

  nextItem(): void {
    if (this.currentIndex < this.items.length - 1) {
      this.selectItem(this.currentIndex + 1);
    }
  }

  loadCurrentIntoEditor(): void {
    const item = this.currentItem;
    if (!item) return;
    this.editTitle = item.title || this.getDefaultTitle(item);
    this.editMessage = item.message || this.getDefaultMessage(item);
    this.editImageUrl = item.imageUrl || '';
  }

  toggleEditMode(): void {
    if (!this.allowUploadAndEdit) return;
    this.isEditing = !this.isEditing;
    if (this.isEditing) {
      this.loadCurrentIntoEditor();
    }
  }

  getDefaultTitle(item: CelebrationPopupItem): string {
    if (item.type === 'anniversary') {
      const yrs = item.years && item.years > 0 ? `${item.years} Year${item.years > 1 ? 's' : ''} ` : '';
      return `Happy ${yrs}Work Anniversary, ${item.name}! 🏆`;
    }
    return `Happy Birthday, ${item.name}! 🎂`;
  }

  getDefaultMessage(item: CelebrationPopupItem): string {
    if (item.type === 'anniversary') {
      const yrsText = item.years && item.years > 0
        ? `completing ${item.years} wonderful year${item.years > 1 ? 's' : ''}`
        : 'your journey';
      return `Congratulations on ${yrsText} with Onboard Aero Consultant! 🌟 Your dedication, hard work, and positive spirit make a lasting difference every day. Wishing you continued growth and many more milestones ahead!`;
    }
    return `Wishing you a very Happy Birthday filled with joy, good health, and great achievements! 🎉 Thank you for being such a valued part of our team at Onboard Aero Consultant. Have a fantastic celebration!`;
  }

  getInitials(name?: string): string {
    if (!name) return 'U';
    const parts = name.trim().split(/\s+/);
    if (parts.length === 1) return parts[0].substring(0, 2).toUpperCase();
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  }

  resolveImageUrl(url?: string): string {
    if (!url) return '';
    if (url.startsWith('data:') || url.startsWith('http://') || url.startsWith('https://')) {
      return url;
    }
    return `${this.s3Url}${url}`;
  }

  onImageFileSelected(event: Event): void {
    if (!this.allowUploadAndEdit) return;
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      this.snackBar.open('Please select a valid image file (PNG, JPG, JPEG, WEBP, GIF)', 'Close', { duration: 3000 });
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      this.snackBar.open('Image size must be under 10MB', 'Close', { duration: 3000 });
      return;
    }

    this.isUploadingImage = true;
    this.compressAndReadImage(file)
      .then((dataUrl) => {
        this.editImageUrl = dataUrl;
        if (this.currentItem) {
          this.currentItem.imageUrl = dataUrl;
        }
        this.isUploadingImage = false;
        this.isEditing = true;
        setTimeout(() => {
          if (this.scrollBody?.nativeElement) {
            this.scrollBody.nativeElement.scrollTop = 0;
          }
        }, 50);
        this.snackBar.open(
          this.isGraphicDesigner
            ? 'Celebration poster attached! Click "Save Poster" to save.'
            : 'Celebration image attached! Click "Save & Publish Wish" to save.',
          'Close',
          { duration: 2500 }
        );
      })
      .catch(() => {
        this.isUploadingImage = false;
        this.snackBar.open('Could not read the selected image file.', 'Close', { duration: 3000 });
      });

    input.value = '';
  }

  removeUploadedImage(): void {
    if (!this.allowUploadAndEdit) return;
    this.editImageUrl = '';
    if (this.currentItem) {
      this.currentItem.imageUrl = '';
    }
  }

  private compressAndReadImage(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e: any) => {
        const rawDataUrl = e.target?.result as string;
        if (!rawDataUrl) {
          reject(new Error('Empty image'));
          return;
        }
        const img = new Image();
        img.onload = () => {
          try {
            const maxDim = 760;
            let width = img.width;
            let height = img.height;
            if (width > maxDim || height > maxDim) {
              if (width > height) {
                height = Math.round((height * maxDim) / width);
                width = maxDim;
              } else {
                width = Math.round((width * maxDim) / height);
                height = maxDim;
              }
            }
            const canvas = document.createElement('canvas');
            canvas.width = width;
            canvas.height = height;
            const ctx = canvas.getContext('2d');
            if (!ctx) {
              resolve(rawDataUrl);
              return;
            }
            ctx.drawImage(img, 0, 0, width, height);
            let compressed = canvas.toDataURL('image/jpeg', 0.78);
            if (compressed.length > 85000) {
              compressed = canvas.toDataURL('image/jpeg', 0.62);
            }
            resolve(compressed);
          } catch {
            resolve(rawDataUrl);
          }
        };
        img.onerror = () => resolve(rawDataUrl);
        img.src = rawDataUrl;
      };
      reader.onerror = (err) => reject(err);
      reader.readAsDataURL(file);
    });
  }

  saveCurrentWish(): void {
    const item = this.currentItem;
    if (!item) return;

    const title = this.isGraphicDesigner
      ? (item.title || this.getDefaultTitle(item))
      : ((this.editTitle || '').trim() || this.getDefaultTitle(item));

    const message = this.isGraphicDesigner
      ? (item.message || this.getDefaultMessage(item))
      : ((this.editMessage || '').trim() || this.getDefaultMessage(item));

    this.isSaving = true;
    const payload = {
      userId: item.userId,
      type: item.type,
      title,
      message,
      imageUrl: this.editImageUrl || null,
      year: new Date().getFullYear(),
      createdBy: this.data?.currentUserName || 'Team OAC'
    };

    this.usersService.saveCelebrationWish(payload).subscribe({
      next: (saved) => {
        item.wishId = saved?.id;
        item.title = title;
        item.message = message;
        item.imageUrl = this.editImageUrl || '';
        item.createdBy = saved?.createdBy || payload.createdBy;
        this.hasChangesSaved = true;

        if (this.postToAnnouncements && !this.isGraphicDesigner) {
          let eventDateStr: string | null = null;
          if (item.date) {
            const d = new Date(item.date);
            if (!isNaN(d.getTime())) {
              const currentYear = new Date().getFullYear();
              const m = String(d.getMonth() + 1).padStart(2, '0');
              const day = String(d.getDate()).padStart(2, '0');
              eventDateStr = `${currentYear}-${m}-${day}`;
            }
          }

          this.announcementsService.addAnnouncement({
            message: `${title} — ${message}`,
            type: 'success',
            dismissible: true,
            startDate: eventDateStr,
            endDate: eventDateStr
          }).subscribe({
            next: () => {},
            error: () => {}
          });
        }

        this.isSaving = false;
        this.snackBar.open(
          `${item.type === 'anniversary' ? 'Work Anniversary' : 'Birthday'} wish saved & published!`,
          'Close',
          { duration: 3000 }
        );
        this.dialogRef.close({ updated: true, savedItem: item });
      },
      error: (err) => {
        this.isSaving = false;
        const msg = err?.error?.message || 'Failed to save celebration wish';
        this.snackBar.open(msg, 'Close', { duration: 3500 });
      }
    });
  }

  closeDialog(): void {
    this.dialogRef.close({ updated: this.hasChangesSaved });
  }
}
