import { CommonModule, DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, ChangeDetectorRef, Component, inject, OnDestroy, OnInit } from '@angular/core';
import { FormBuilder, ReactiveFormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatDialogRef, MAT_DIALOG_DATA, MatDialogModule } from '@angular/material/dialog';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MY_FORMATS } from '../../personal-details/personal-details.component';
import { provideMomentDateAdapter } from '@angular/material-moment-adapter';
import { UsersService } from '@services/users.service';
import { Subscription } from 'rxjs';
import { MatSnackBar } from '@angular/material/snack-bar';
import { environment } from '../../../../../environments/environment';

@Component({
  selector: 'app-edit-user-statutory',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatCardModule,
    MatDatepickerModule,
    MatIconModule,
    MatDialogModule,
    MatTooltipModule
  ],
  templateUrl: './edit-user-statutory.component.html',
  styleUrl: './edit-user-statutory.component.scss',
  providers: [provideMomentDateAdapter(MY_FORMATS), DatePipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class EditUserStatutoryComponent implements OnInit, OnDestroy {
  dialogRef = inject(MatDialogRef<EditUserStatutoryComponent>, { optional: true });
  statuatoryData = inject(MAT_DIALOG_DATA, { optional: true });
  private cdr = inject(ChangeDetectorRef);

  currentCompany = environment.company;
  companyPlaceholders: any = {
    oac: {
      adharNo: 'Aadhar ID',
      panNumber: 'PAN Number',
      pfNumber: 'PF Number',
      esiNumber: 'ESI Number',
      uanNumber: 'UAN Number',
      insuranceNumber: 'Insurance Number'
    },
    leeds: {
      adharNo: 'SSN / Aadhar',
      panNumber: 'Emirates ID / Tax ID',
      pfNumber: 'Visa / Retirement ID',
      esiNumber: 'ESI Number',
      uanNumber: 'UAN Number',
      insuranceNumber: 'Insurance Number'
    }
  };
  labels: any = this.companyPlaceholders[this.currentCompany] || this.companyPlaceholders['oac'];

  ngOnInit(): void {
    if (this.statuatoryData) {
      this.getStatutoryDetailsByUser(this.statuatoryData.id);
    }
  }

  pUSub!: Subscription;
  private id!: number;
  getStatutoryDetailsByUser(id: number) {
    this.pUSub = this.userService.getUserStatutoryuDetailsByUser(id).subscribe(data => {
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
      }
      this.cdr.markForCheck();
    });
  }

  private fb = inject(FormBuilder);
  form = this.fb.group({
    userId: <any>[null],
    adharNo: [''],
    panNumber: [''],
    esiNumber: [''],
    uanNumber: [''],
    insuranceNumber: [''],
    pfNumber: [''],
    passportNumber: [''],
    passportExpiry: <any>[null],
  });

  private submitSub!: Subscription;
  isNext: boolean = false;
  private datePipe = inject(DatePipe);
  editStatus: boolean = false;
  private userService = inject(UsersService);
  private snackBar = inject(MatSnackBar);
  onSubmit() {
    this.isNext = true;
    const submit: any = {
      ...this.form.getRawValue()
    };
    submit.userId = submit.userId ? submit.userId : this.statuatoryData?.id;
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
    if (this.editStatus && this.id) {
      this.submitSub = this.userService.updateUserStatutory(this.id, submit).subscribe(() => {
        this.snackBar.open("Statutory Details updated successfully...", "", { duration: 3000 });
        this.dialogRef?.close(true);
      });
    } else {
      this.submitSub = this.userService.addStautoryInfo(submit).subscribe((res) => {
        this.editStatus = true;
        this.id = res.id;
        this.snackBar.open("Statutory Details added successfully...", "", { duration: 3000 });
        this.dialogRef?.close(true);
      });
    }
  }

  ngOnDestroy(): void {
    this.pUSub?.unsubscribe();
    this.submitSub?.unsubscribe();
  }
}
