/* eslint-disable @typescript-eslint/no-explicit-any */
import { CommonModule, DatePipe } from '@angular/common';
import { Component, inject, OnDestroy, OnInit } from '@angular/core';
import { FormBuilder, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { provideMomentDateAdapter } from '@angular/material-moment-adapter';
import { MatCardModule } from '@angular/material/card';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSelectModule } from '@angular/material/select';
import { MatInputModule } from '@angular/material/input';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatTabsModule } from '@angular/material/tabs';
import { MatSnackBar } from '@angular/material/snack-bar';
import { Subscription } from 'rxjs';
import * as XLSX from 'xlsx';
import { HolidayService } from '@services/holiday.service';
import { Holidays } from '../../../common/interfaces/leaves/holidays';
import { MY_FORMATS } from '../../users/personal-details/personal-details.component';

export interface TemplateHolidayRow {
  date: string;
  name: string;
  type: string;
  comments: string;
}

export interface HolidayTypeOption {
  value: string;
  label: string;
  description: string;
  icon: string;
  cssClass: string;
}

@Component({
  selector: 'app-add-holiday',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    MatCardModule,
    MatFormFieldModule,
    MatSelectModule,
    MatDatepickerModule,
    MatInputModule,
    MatButtonModule,
    MatDialogModule,
    MatTabsModule,
    MatIconModule,
    MatProgressSpinnerModule,
    MatTooltipModule
  ],
  templateUrl: './add-holiday.component.html',
  styleUrl: './add-holiday.component.scss',
  providers: [provideMomentDateAdapter(MY_FORMATS), DatePipe]
})
export class AddHolidayComponent implements OnInit, OnDestroy {
  private readonly dialogRef = inject(MatDialogRef<AddHolidayComponent>);
  private readonly data = inject(MAT_DIALOG_DATA, { optional: true }) as any;
  private readonly fb = inject(FormBuilder);
  private readonly holidayService = inject(HolidayService);
  private readonly snackBar = inject(MatSnackBar);
  private readonly datePipe = inject(DatePipe);

  public editStatus = false;
  public isSubmitting = false;
  public isUploading = false;
  public isDragOver = false;
  public selectedTabIndex = 0;

  public selectedFile: File | null = null;
  public excelData: any[][] = [];
  public previewHeaders: string[] = [];
  public previewRows: any[][] = [];
  public totalExcelRows = 0;

  private submitSub?: Subscription;

  public readonly holidayTypes: HolidayTypeOption[] = [
    {
      value: 'Public',
      label: 'Public Holiday',
      description: 'Official mandatory paid holiday for all employees',
      icon: 'event_available',
      cssClass: 'type-public'
    },
    {
      value: 'Optional',
      label: 'Optional Holiday',
      description: 'Floating elective holiday chosen per employee',
      icon: 'event_note',
      cssClass: 'type-optional'
    },
    {
      value: 'Restricted',
      label: 'Restricted Holiday',
      description: 'Subject to company quota or manager approval',
      icon: 'event_busy',
      cssClass: 'type-restricted'
    }
  ];

  public holidayForm = this.fb.group({
    name: ['', [Validators.required, Validators.minLength(2)]],
    type: ['Public', [Validators.required]],
    date: [<any>null, [Validators.required]],
    comments: ['']
  });

  ngOnInit(): void {
    if (this.data) {
      if (this.data.id) {
        this.patch(this.data);
        this.selectedTabIndex = 0;
      } else if (this.data.holiday && this.data.holiday.id) {
        this.patch(this.data.holiday);
        this.selectedTabIndex = this.data.initialTab ?? 0;
      } else if (typeof this.data.initialTab === 'number') {
        this.selectedTabIndex = this.data.initialTab;
      }
    }

    // Initialize spreadsheet with current Indian holidays immediately
    this.templateRows = this.getInitialIndianHolidays();
    this.loadCurrentSystemHolidays();
  }

  ngOnDestroy(): void {
    this.submitSub?.unsubscribe();
  }

  public patch(holiday: Holidays): void {
    this.editStatus = true;
    this.holidayForm.patchValue({
      name: holiday.name || '',
      type: holiday.type || 'Public',
      date: holiday.date || null,
      comments: holiday.comments || ''
    });
  }

  public selectType(type: string): void {
    this.holidayForm.get('type')?.setValue(type);
    this.holidayForm.get('type')?.markAsDirty();
  }

  get formattedDatePreview(): string | null {
    const raw = this.holidayForm.get('date')?.value;
    if (!raw) return null;
    try {
      const d = raw && typeof raw.toDate === 'function' ? raw.toDate() : new Date(raw);
      if (isNaN(d.getTime())) return null;
      return this.datePipe.transform(d, 'EEEE, d MMMM yyyy') || null;
    } catch {
      return null;
    }
  }

  public close(): void {
    this.dialogRef.close(false);
  }

  public onSubmit(): void {
    if (this.holidayForm.invalid) {
      this.holidayForm.markAllAsTouched();
      return;
    }

    this.isSubmitting = true;
    const formVal = this.holidayForm.getRawValue();

    let formattedDate = '';
    const dateVal: any = formVal.date;
    if (dateVal) {
      if (typeof dateVal.format === 'function') {
        formattedDate = dateVal.format('YYYY-MM-DD');
      } else if (dateVal instanceof Date) {
        const y = dateVal.getFullYear();
        const m = String(dateVal.getMonth() + 1).padStart(2, '0');
        const d = String(dateVal.getDate()).padStart(2, '0');
        formattedDate = `${y}-${m}-${d}`;
      } else {
        formattedDate = String(dateVal);
      }
    }

    const payload: any = {
      name: formVal.name?.trim(),
      type: formVal.type,
      comments: formVal.comments?.trim() || null,
      date: formattedDate
    };

    if (this.editStatus && this.data) {
      this.submitSub = this.holidayService.updateHolidays(this.data.id, payload).subscribe({
        next: () => {
          this.isSubmitting = false;
          this.snackBar.open('Holiday updated successfully.', 'Close', { duration: 3000 });
          this.dialogRef.close(true);
        },
        error: (err: any) => {
          this.isSubmitting = false;
          console.error('Update failed:', err);
          const msg = err?.error || err?.message || 'Failed to update holiday.';
          this.snackBar.open(typeof msg === 'string' ? msg : 'Update failed.', 'Close', { duration: 3500 });
        }
      });
    } else {
      this.submitSub = this.holidayService.addHolidays(payload).subscribe({
        next: () => {
          this.isSubmitting = false;
          this.snackBar.open('Holiday scheduled successfully.', 'Close', { duration: 3000 });
          this.dialogRef.close(true);
        },
        error: (err: any) => {
          this.isSubmitting = false;
          console.error('Add holiday failed:', err);
          const msg = err?.error || err?.message || 'Failed to add holiday.';
          this.snackBar.open(typeof msg === 'string' ? msg : 'Failed to add holiday.', 'Close', { duration: 3500 });
        }
      });
    }
  }

  // File Upload Handlers
  public onFileChange(event: any): void {
    const file = event.target?.files?.[0];
    if (file) {
      this.processFile(file);
    }
    event.target.value = '';
  }

  public onDragOver(event: DragEvent): void {
    event.preventDefault();
    event.stopPropagation();
    this.isDragOver = true;
  }

  public onDragLeave(event: DragEvent): void {
    event.preventDefault();
    event.stopPropagation();
    this.isDragOver = false;
  }

  public onDrop(event: DragEvent): void {
    event.preventDefault();
    event.stopPropagation();
    this.isDragOver = false;

    const file = event.dataTransfer?.files?.[0];
    if (file) {
      this.processFile(file);
    }
  }

  private processFile(file: File): void {
    if (!file.name.toLowerCase().endsWith('.xlsx')) {
      this.snackBar.open('Invalid file format. Please upload an Excel file (.xlsx).', 'Close', { duration: 3500 });
      return;
    }

    this.selectedFile = file;
    this.readExcelFile(file);
  }

  private readExcelFile(file: File): void {
    const reader = new FileReader();

    reader.onload = (e: any) => {
      try {
        const binaryData = e.target.result;
        const workbook = XLSX.read(binaryData, { type: 'binary' });
        const firstSheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[firstSheetName];
        const rawJson: any[][] = XLSX.utils.sheet_to_json(worksheet, { header: 1 });

        if (!rawJson || rawJson.length === 0) {
          this.snackBar.open('The selected Excel file is empty.', 'Close', { duration: 3000 });
          this.removeFile();
          return;
        }

        this.excelData = rawJson;
        this.previewHeaders = (rawJson[0] || []).map(h => String(h || '').trim());
        const dataRows = rawJson.slice(1).filter(row => row && row.some(cell => cell !== undefined && cell !== ''));
        this.totalExcelRows = dataRows.length;
        // Display all rows in preview table (cap at 100 for very large sheets)
        this.previewRows = dataRows.length > 100 ? dataRows.slice(0, 100) : dataRows;

        this.snackBar.open(`File loaded successfully: ${this.totalExcelRows} holiday row(s) found.`, 'Close', { duration: 3000 });
      } catch (err) {
        console.error('Error parsing Excel:', err);
        this.snackBar.open('Unable to parse the Excel file. Please ensure it is a valid .xlsx file.', 'Close', { duration: 3500 });
        this.removeFile();
      }
    };

    reader.onerror = () => {
      this.snackBar.open('Error reading file from disk.', 'Close', { duration: 3000 });
      this.removeFile();
    };

    reader.readAsBinaryString(file);
  }

  public removeFile(): void {
    this.selectedFile = null;
    this.excelData = [];
    this.previewHeaders = [];
    this.previewRows = [];
    this.totalExcelRows = 0;
  }

  public getFileSize(bytes: number): string {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  }

  // Template Customizer / Spreadsheet Builder Properties & Methods
  public showTemplateBuilder: boolean = true;
  public currentYear: number = new Date().getFullYear();
  public templateRows: TemplateHolidayRow[] = [];
  public systemHolidays: TemplateHolidayRow[] = [];
  public activePreset: 'indian' | 'system' = 'indian';
  public isLoadingSystemHolidays = false;

  get publicTemplateCount(): number {
    return this.templateRows.filter(r => r.type === 'Public').length;
  }

  get optionalTemplateCount(): number {
    return this.templateRows.filter(r => r.type === 'Optional' || r.type === 'Restricted').length;
  }

  public getInitialIndianHolidays(): TemplateHolidayRow[] {
    const y = this.currentYear;
    return [
      { date: `${y}-01-01`, name: "New Year's Day", type: 'Public', comments: 'New Year celebrations' },
      { date: `${y}-01-14`, name: 'Makar Sankranti / Pongal', type: 'Optional', comments: 'Harvest festival' },
      { date: `${y}-01-26`, name: 'Republic Day', type: 'Public', comments: 'National holiday of India' },
      { date: `${y}-02-15`, name: 'Maha Shivratri', type: 'Optional', comments: 'Hindu festival celebrating Lord Shiva' },
      { date: `${y}-03-04`, name: 'Holi', type: 'Public', comments: 'Festival of colours' },
      { date: `${y}-03-21`, name: 'Eid-ul-Fitr (Ramzan)', type: 'Public', comments: 'Islamic festival' },
      { date: `${y}-04-03`, name: 'Good Friday', type: 'Public', comments: 'Christian holy day' },
      { date: `${y}-04-14`, name: 'Dr. B.R. Ambedkar Jayanti / Vishu', type: 'Public', comments: 'Remembrance & New Year' },
      { date: `${y}-05-01`, name: 'May Day / Labour Day', type: 'Public', comments: "International Workers' Day" },
      { date: `${y}-05-27`, name: 'Bakrid / Eid-ul-Adha', type: 'Public', comments: 'Feast of the Sacrifice' },
      { date: `${y}-05-31`, name: 'Buddha Purnima', type: 'Optional', comments: 'Birth of Gautama Buddha' },
      { date: `${y}-06-26`, name: 'Muharram', type: 'Public', comments: 'Islamic New Year observance' },
      { date: `${y}-08-15`, name: 'Independence Day', type: 'Public', comments: 'National holiday of India' },
      { date: `${y}-08-26`, name: 'Milad-un-Nabi (Id-e-Milad)', type: 'Public', comments: "Prophet Muhammad's Birthday" },
      { date: `${y}-08-27`, name: 'Onam / Thiruvonam', type: 'Public', comments: 'Kerala harvest festival' },
      { date: `${y}-09-04`, name: 'Janmashtami', type: 'Optional', comments: 'Birth of Lord Krishna' },
      { date: `${y}-09-14`, name: 'Ganesh Chaturthi', type: 'Optional', comments: 'Festival honoring Lord Ganesha' },
      { date: `${y}-10-02`, name: 'Mahatma Gandhi Jayanti', type: 'Public', comments: 'National holiday of India' },
      { date: `${y}-10-19`, name: 'Mahanavami / Ayudha Pooja', type: 'Public', comments: 'Navratri festival' },
      { date: `${y}-10-20`, name: 'Dussehra / Vijayadashami', type: 'Public', comments: 'Victory of good over evil' },
      { date: `${y}-11-08`, name: 'Diwali / Deepavali', type: 'Public', comments: 'Festival of lights' },
      { date: `${y}-11-24`, name: 'Guru Nanak Jayanti', type: 'Optional', comments: 'Sikh religious celebration' },
      { date: `${y}-12-25`, name: 'Christmas Day', type: 'Public', comments: 'Christian festival' }
    ];
  }

  public loadCurrentSystemHolidays(): void {
    this.isLoadingSystemHolidays = true;
    this.holidayService.getHolidays(String(this.currentYear)).subscribe({
      next: (res: any) => {
        this.isLoadingSystemHolidays = false;
        const list = res?.value || res || [];
        if (Array.isArray(list) && list.length > 0) {
          this.systemHolidays = list.map((h: any) => ({
            date: h.date ? (typeof h.date === 'string' ? h.date.split('T')[0] : h.date) : '',
            name: h.name || '',
            type: h.type || 'Public',
            comments: h.comments || ''
          }));
        }
      },
      error: () => {
        this.isLoadingSystemHolidays = false;
      }
    });
  }

  public switchToIndianCalendar(): void {
    this.activePreset = 'indian';
    this.templateRows = this.getInitialIndianHolidays();
    this.snackBar.open(`Loaded official Indian holidays for ${this.currentYear} (${this.templateRows.length} holidays).`, 'Close', { duration: 2500 });
  }

  public switchToSystemHolidays(): void {
    this.activePreset = 'system';
    if (this.systemHolidays.length > 0) {
      this.templateRows = this.systemHolidays.map(h => ({ ...h }));
      this.snackBar.open(`Loaded ${this.templateRows.length} corporate holidays from database.`, 'Close', { duration: 2500 });
    } else {
      this.templateRows = [];
      this.snackBar.open('No holidays found in database for current year. Click "+ Add Row" to create new rows.', 'Close', { duration: 3000 });
    }
  }

  public addTemplateRow(): void {
    const y = this.currentYear;
    this.templateRows.push({
      date: `${y}-01-01`,
      name: '',
      type: 'Public',
      comments: ''
    });
    this.snackBar.open('New holiday row added to table.', 'Close', { duration: 2000 });
  }

  public removeTemplateRow(index: number): void {
    if (index >= 0 && index < this.templateRows.length) {
      const removed = this.templateRows.splice(index, 1);
      this.snackBar.open(`Removed "${removed[0]?.name || 'holiday'}" row.`, 'Close', { duration: 2000 });
    }
  }

  public clearAllTemplateRows(): void {
    this.templateRows = [];
    this.snackBar.open('Spreadsheet cleared. You can add new rows.', 'Close', { duration: 2000 });
  }

  public resetTemplateRows(): void {
    if (this.activePreset === 'system' && this.systemHolidays.length > 0) {
      this.templateRows = this.systemHolidays.map(h => ({ ...h }));
    } else {
      this.templateRows = this.getInitialIndianHolidays();
    }
    this.snackBar.open('Reset to default holidays list.', 'Close', { duration: 2000 });
  }

  public downloadCustomizedTemplate(): void {
    const validRows = this.templateRows.filter(r => (r.date && r.date.trim()) || (r.name && r.name.trim()));
    if (validRows.length === 0) {
      this.snackBar.open('Please add at least one holiday row to download.', 'Close', { duration: 3000 });
      return;
    }

    const templateData: (string | number)[][] = [
      ['Date', 'Name', 'Type', 'Comments'],
      ...validRows.map(h => [(h.date || '').trim(), (h.name || '').trim(), h.type || 'Public', (h.comments || '').trim()])
    ];

    const ws = XLSX.utils.aoa_to_sheet(templateData);
    ws['!cols'] = [{ wch: 16 }, { wch: 34 }, { wch: 16 }, { wch: 40 }];
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Holidays');
    XLSX.writeFile(wb, `Indian_Holidays_${this.currentYear}.xlsx`);
    this.snackBar.open(`Downloaded Indian_Holidays_${this.currentYear}.xlsx with ${validRows.length} holidays.`, 'Close', { duration: 3500 });
  }

  public applyTemplateToImport(): void {
    const validRows = this.templateRows.filter(r => r.date && r.name?.trim());
    if (validRows.length === 0) {
      this.snackBar.open('Please ensure holidays have both Date and Name before importing.', 'Close', { duration: 3500 });
      return;
    }

    const templateData = [
      ['Date', 'Name', 'Type', 'Comments'],
      ...validRows.map(h => [h.date.trim(), h.name.trim(), h.type || 'Public', (h.comments || '').trim()])
    ];
    const ws = XLSX.utils.aoa_to_sheet(templateData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Holidays');
    const wbout = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
    const blob = new Blob([wbout], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    const file = new File([blob], `Indian_Holidays_${this.currentYear}.xlsx`, { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });

    this.selectedFile = file;
    this.readExcelFile(file);
    this.selectedTabIndex = 2; // Jump to Upload Spreadsheet tab
    this.snackBar.open(`Staged ${validRows.length} holidays for import! Review below and click "Import Holidays".`, 'Close', { duration: 4000 });
  }

  public downloadQuickTemplate(): void {
    this.downloadCustomizedTemplate();
  }

  public downloadTemplate(): void {
    this.selectedTabIndex = 1;
  }

  public uploadFile(): void {
    if (!this.selectedFile) {
      this.snackBar.open('Please select an Excel file first.', 'Close', { duration: 3000 });
      return;
    }

    this.isUploading = true;
    const formData = new FormData();
    formData.append('file', this.selectedFile);

    this.submitSub = this.holidayService.uploadHolidays(formData).subscribe({
      next: (res: any) => {
        this.isUploading = false;
        const msg = res?.message || (typeof res === 'string' ? res : 'Holidays uploaded successfully.');
        this.snackBar.open(msg, 'Close', { duration: 4000 });
        this.dialogRef.close(true);
      },
      error: (err: any) => {
        this.isUploading = false;
        console.error('Holiday upload error:', err);
        const errMsg = err?.error?.message || err?.error || err?.message || 'Failed to upload holidays file.';
        this.snackBar.open(typeof errMsg === 'string' ? errMsg : 'Upload failed. Please check file columns.', 'Close', { duration: 4000 });
      }
    });
  }
}
