/* eslint-disable @typescript-eslint/no-explicit-any */
import { UserDocumentsComponent } from './../user-documents/user-documents.component';
import { Component, inject, OnDestroy, OnInit, ViewChild } from '@angular/core';
import { FormBuilder, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatDialogModule } from '@angular/material/dialog';
import { MatTabsModule } from '@angular/material/tabs';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatRadioModule } from '@angular/material/radio';
import { CommonModule } from '@angular/common';
import { MatNativeDateModule, MatOptionModule } from '@angular/material/core';
import { MatButtonModule } from '@angular/material/button';
import { MatInputModule } from '@angular/material/input';
import { FlexLayoutModule } from '@ngbracket/ngx-layout';
import { MatToolbarModule } from '@angular/material/toolbar';
import { UsersService } from '../../../services/users.service';
import { debounce, Subject, Subscription, takeUntil, timer } from 'rxjs';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { MatSnackBar } from '@angular/material/snack-bar';
import { PersonalDetailsComponent } from "../personal-details/personal-details.component";
import { UserPositionComponent } from '../user-position/user-position.component';
import { StatuatoryInfoComponent } from '../statuatory-info/statuatory-info.component';
import { UserAccountComponent } from "../user-account/user-account.component";
import { ActivatedRoute } from '@angular/router';
import { TeamService } from '@services/team.service';
import { MatCardModule } from '@angular/material/card';
import { MatSelectModule } from '@angular/material/select';
import { MatAutocompleteModule } from '@angular/material/autocomplete';
import { User } from '../../../common/interfaces/users/user';
import { UserNomineeComponent } from "../user-nominee/user-nominee.component";
import { UserSalaryComponent } from "../user-salary/user-salary.component";
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';


import { MatTooltipModule } from '@angular/material/tooltip';
import { MatDividerModule } from '@angular/material/divider';
import { Clipboard, ClipboardModule } from '@angular/cdk/clipboard';
import { environment } from '../../../../environments/environment';


@Component({
  selector: 'app-user-dialog',
  standalone: true,
  imports: [ReactiveFormsModule, FlexLayoutModule, MatTabsModule, MatFormFieldModule, MatInputModule, MatIconModule,
    MatNativeDateModule, MatRadioModule, MatDialogModule, MatButtonModule, MatToolbarModule, MatProgressSpinnerModule,
    PersonalDetailsComponent, UserPositionComponent, StatuatoryInfoComponent, UserAccountComponent, UserDocumentsComponent, MatCardModule,
    MatOptionModule, MatSelectModule, CommonModule, MatAutocompleteModule, UserNomineeComponent, UserSalaryComponent, FormsModule,
    MatTooltipModule, MatDividerModule, ClipboardModule],
  templateUrl: './user-dialog.component.html',
  styleUrl: './user-dialog.component.scss'
})
export class UserDialogComponent implements OnInit, OnDestroy {
  s3Url = environment.s3Url || `https://${environment.AWS_BUCKET_NAME || 'aerohr-uploads'}.s3.amazonaws.com/`;
  url = this.s3Url;
  private snackBar = inject(MatSnackBar);
  private sanitizer = inject(DomSanitizer);
  private fb = inject(FormBuilder)
  private userService = inject(UsersService);
  private route = inject(ActivatedRoute);
  private teamService = inject(TeamService);
  private clipboard = inject(Clipboard);

  public passwordHide: boolean = true;
  editStatus: boolean = false;
  id: number;
  ngOnInit() {
    this.route.params.subscribe(params => {
      this.id = params['id'];
      if (this.id) {
        this.editStatus = true;
        this.getUser(this.id)
        this.updateOfficialMailIdValidators();
      }else{
        this.generateEmployeeNumber()
      }
    });
    this.setupDebounceTimer();
  }

  form = this.fb.group({
    empNo: [''],
    url: [''],
    name: [ '',  Validators.compose([Validators.required, Validators.minLength(3)]) ],
    email: [ '', Validators.compose([Validators.required, Validators.email]) ],
    phoneNumber: [ '',  Validators.compose([Validators.required, Validators.pattern(/^\+?[1-9]\d{1,14}$/)]) ],
    password: [ '', Validators.compose([Validators.required, Validators.minLength(4)]) ],
    roleName: [],
    teamId: <any>[  ],
    officialMailId: [ '', Validators.compose([Validators.required, Validators.email]) ]
  })

  // Function to update validators for officialMailId
  updateOfficialMailIdValidators() {
    const officialMailIdControl = this.form.get('officialMailId');
    if (this.editStatus) {
      // Remove required and email validators when editStatus is true
      officialMailIdControl?.clearValidators();
    } else {
      // Add required and email validators when editStatus is false
      officialMailIdControl?.setValidators([Validators.required, Validators.email]);
    }
    // Update the control's validity
    officialMailIdControl?.updateValueAndValidity();
  }

  ngOnDestroy(): void {
    this.userSub?.unsubscribe();
    this.usersSub?.unsubscribe();
    this.uploadSub?.unsubscribe();
    this.delete?.unsubscribe();
    this.destroy$.next();
    this.destroy$.complete();
  }

  userSub!: Subscription;
  userName: string;
  getUser(id: number){
    this.id = id;
    this.userSub = this.userService.getUserById(id).subscribe(user=>{
      this.userName = user.name;
      this.patchUser(user)
    });
  }

  patchUser(user: User){
    this.invNo = user.empNo
    this.dataToPass = { id: user.id || this.id, empNo: user.empNo, name: user.name, updateStatus: this.editStatus };
    if(user.url != null && user.url != '' && user.url != 'undefined'){
      this.imageUrl = user.url.startsWith('http') ? user.url : `${this.s3Url}${user.url}`;
    }
    this.form.patchValue({
      empNo: user.empNo,
      name: user.name,
      phoneNumber: user.phoneNumber,
      email: user.email,
      password: user.password,
      teamId: user.teamId
    })
    // this.patch(user.role)
  }

  uploadProgress: number | null = null;
  uploadComplete: boolean = false;
  file!: any;
  uploadSub!: Subscription;
  fileType: string = '';
  imageUrl: string = '';
  public safeUrl!: SafeResourceUrl;
  allowedFileTypes = ['jpeg', 'jpg', 'png'];
  uploadFile(event: Event) {
    const input = event.target as HTMLInputElement;
    this.file = input.files?.[0];
    this.fileType = this.file.type.split('/')[1];
    if (!this.allowedFileTypes.includes(this.fileType)) {
      alert('Invalid file type. Please select a JPEG, JPG, or PNG file.');
      return;
    }
    if (this.file) {
      this.uploadComplete = false;

      let fileName = this.file.name;
      if (fileName.length > 12) {
        const splitName = fileName.split('.');
        fileName = splitName[0].substring(0, 12) + "... ." + splitName[1];
      }
      this.uploadSub = this.userService.uploadImage(this.file).subscribe({
        next: (invoice) => {
          const fileKey = invoice.fileUrl || invoice.key;
          this.imageUrl = invoice.url || (fileKey && fileKey.startsWith('http') ? fileKey : `${this.s3Url}${fileKey}`);
          if (this.imageUrl) {
            this.safeUrl = this.sanitizer.bypassSecurityTrustResourceUrl(this.imageUrl);
          }
          this.form.get('url')?.setValue(fileKey);
          this.uploadComplete = true; // Set to true when upload is complete
        },
        error: () => {
          this.uploadComplete = true; // Ensure UI updates even on error
          
          // Show error alert
          alert('File upload failed. Please try again.'); 
          
          // Alternatively, use a UI notification library
          // this.toastr.error('File upload failed. Please try again.', 'Error');
        }
      });
    }
  }

  hidePassword: boolean = true;
  togglePasswordVisibility() {
    this.hidePassword = !this.hidePassword;
  }

  selectedTabIndex: number = 0;
  formSubmitted: boolean = true;
  isFormSubmitted: boolean = false;
  isWorkFormSubmitted: boolean = false;
  isContactsFormSubmitted: boolean = false;
  isSocialFormSubmitted: boolean = false;
  isAccountFormSubmitted: boolean = false;
  isQualFormSubmitted: boolean = false;
  isNomineeFormSubmitted: boolean = false;
  isSalaryFormSubmitted: boolean = false;
  submit!: Subscription;
  onSubmit(){
    this.isLoading = true;
    if(this.editStatus){
      this.submit = this.userService.updateUser(this.id, this.form.getRawValue()).subscribe({
        next: () => {
          this.snackBar.open("User updated successfully...", "", { duration: 3000 });
          this.isLoading = false;
        },
        error: (err) => {
          this.isLoading = false;
          const msg = err?.error?.message || err?.error || err?.message || "Failed to update user";
          this.snackBar.open(typeof msg === 'string' ? msg : "Failed to update user", "", { duration: 4000 });
        }
      });
    }else{
      this.submit = this.userService.addUser(this.form.getRawValue()).subscribe({
        next: (res) => {        
          this.isLoading = false;
          if (typeof res === 'string' && res.includes('already exists')) {
            this.snackBar.open(res, "", { duration: 4000 });
            return;
          }
          this.editStatus = true;
          this.id = res?.id;
          this.userName = res?.name;
          this.dataToPass = { id: res?.id, empNo: this.invNo, name: res?.name, updateStatus: this.editStatus };
          this.isFormSubmitted = true;
          this.formSubmitted = false;
          this.snackBar.open("User added successfully...", "", { duration: 3000 });
          this.selectedTabIndex = 1;
          this.scrollToTop();
          setTimeout(() => this.initCurrentTab(), 100);
        },
        error: (err) => {
          this.isLoading = false;
          const msg = err?.error?.message || err?.error || err?.message || "Failed to add user";
          this.snackBar.open(typeof msg === 'string' ? msg : "Failed to add user", "", { duration: 4000 });
        }
      });
    }
  }

  scrollToTop(): void {
    if (typeof document !== 'undefined' && document.activeElement instanceof HTMLElement) {
      document.activeElement.blur();
    }

    const performScroll = () => {
      try {
        window.scrollTo({ top: 0, left: 0, behavior: 'instant' as ScrollBehavior });
        document.documentElement.scrollTop = 0;
        document.body.scrollTop = 0;

        const mainSidenav = document.getElementById('main');
        if (mainSidenav) {
          mainSidenav.scrollTop = 0;
        }

        const mainContent = document.getElementById('main-content');
        if (mainContent) {
          mainContent.scrollTop = 0;
        }

        const scrollableContainers = document.querySelectorAll(
          'mat-sidenav-content, .mat-drawer-content, .sidenav-content-inner, .mat-mdc-tab-body-content, .mat-tab-body-content'
        );
        scrollableContainers.forEach((el: any) => {
          if (el && typeof el.scrollTop === 'number') {
            el.scrollTop = 0;
          }
        });
      } catch {
        // Ignore scroll errors
      }
    };

    performScroll();
    setTimeout(performScroll, 50);
    setTimeout(performScroll, 150);
    setTimeout(performScroll, 260);
  }

  personalSubmit(event: any){
    this.isWorkFormSubmitted = event.isFormSubmitted
    this.isFormSubmitted = false;
    this.selectedTabIndex = 2;
    this.scrollToTop();
    if (this.userPositionComponent && this.selectedTabIndex === 2) {
      this.userPositionComponent.triggerNew(this.dataToPass);
    }
  }

  workSubmit(event: any){
    this.isContactsFormSubmitted = event.isFormSubmitted;
    this.isWorkFormSubmitted = false;
    this.selectedTabIndex = 3;
    this.scrollToTop();
    if (this.statuatoryInfoComponent && this.selectedTabIndex === 3) {
      this.statuatoryInfoComponent.triggerNew(this.dataToPass);
    }
  }

  contactSubmit(event: any){
    this.isSocialFormSubmitted = event.isFormSubmitted
    this.isContactsFormSubmitted = false;
    this.selectedTabIndex = 4
    this.scrollToTop();
    if (this.userAccountComponent && this.selectedTabIndex === 4) {
      this.userAccountComponent.triggerNew(this.dataToPass);
    }
  }

  accountSubmit(event: any){
    this.isNomineeFormSubmitted = event.isFormSubmitted;
    this.isSocialFormSubmitted = false;
    this.selectedTabIndex = 5;
    this.scrollToTop();
    if (this.userNomineeComponent && this.selectedTabIndex === 5) {
      this.userNomineeComponent.triggerNew(this.dataToPass);
    }
  }

  nomineeSubmit(event: any){
    this.isSalaryFormSubmitted = event.isFormSubmitted;
    this.isNomineeFormSubmitted = false;
    this.selectedTabIndex = 6;
    this.scrollToTop();
    if (this.userSalaryComponent && this.selectedTabIndex === 6) {
      this.userSalaryComponent.triggerNew(this.dataToPass);
    }
  }

  salarySubmit(event: any){
    this.isAccountFormSubmitted = event.isFormSubmitted;
    this.isSalaryFormSubmitted = false;
    this.selectedTabIndex = 7;
    this.scrollToTop();
    if (this.userDocumentsComponent && this.selectedTabIndex === 7) {
      this.userDocumentsComponent.triggerNew(this.dataToPass);
    }
  }

  // qualSubmit(event: any){
  //   this.isAccountFormSubmitted = event.isFormSubmitted
  //   this.isQualFormSubmitted = false;
  //   this.selectedTabIndex = 6
  //   if (this.userDocumentsComponent && this.selectedTabIndex === 6) {
  //     this.userDocumentsComponent.trigger();
  //   }
  // }

  isEditingInvNo = false;
  originalInvNo: string = ''; // Initialize with empty string
  showError: boolean = false;
  // When starting to edit
  startEditingInvNo() {
    this.originalInvNo = this.invNo; // Save the original value
    this.isEditingInvNo = true;
  }
  
  showEmptyWarning: boolean = false;
  checkEmpty(event: any) {
    // Check if field will be empty after this backspace
    if ((!this.invNo || this.invNo.length <= 1) && event.key === 'Backspace') {
      // Temporarily show warning
      this.showEmptyWarning = true;
      setTimeout(() => this.showEmptyWarning = false, 1500);
      
      // Restore original value but keep editing
      setTimeout(() => {
        this.invNo = ' Cannot be empty';
      }, 0);
      
      event.preventDefault();
    }
  }
  
  saveInvNo() {
    if (!this.invNo || this.invNo.trim() === '') {
      this.invNo = this.originalInvNo;
      this.showEmptyWarning = true;  
      setTimeout(() => this.showEmptyWarning = false, 1500); 
    }
    this.form.get('empNo')?.setValue(this.invNo);
    this.isEditingInvNo = false;
  }

  cancelEditingInvNo() {
    this.invNo = this.originalInvNo;
    this.isEditingInvNo = false;
  }

  goBack() {
    window.history.back();
  }

  private destroy$ = new Subject<void>();
  private inputChange$ = new Subject<void>();
  debounceTime = 2000;
  setupDebounceTimer() {
    this.inputChange$.pipe(
      debounce(() => timer(this.debounceTime)),
      takeUntil(this.destroy$)
    ).subscribe(() => {
      this.saveInvNo();
    });
  }

  showOACWarn: boolean = false;
  onInputChange() {
    // Validate the input
    if (this.invNo && this.invNo.startsWith(`${this.desiredPrefix}-`)) {
      // Revert to original value
      this.showOACWarn = true;
      // this.invNo = this.originalInvNo;
      // Hide warning after 3 seconds
      setTimeout(() => this.showEmptyWarning = false, 3000);
    }
    this.inputChange$.next();
  }
  
  dataToPass: any;
  positionData: any;
  statuatoryData: any;
  accountData: any;
  invNo: string;
  usersSub!: Subscription;
  desiredPrefix: any = 'OAC';
  generateEmployeeNumber() {
    const currentYear = new Date().getFullYear();
    const defaultPrefix = (this.desiredPrefix || 'OAC').toUpperCase();

    // Set immediate default ID so user never sees "Generating..." indefinitely
    const initialFallbackId = `${defaultPrefix}-${currentYear}-001`;
    this.invNo = initialFallbackId;
    this.form.get('empNo')?.setValue(initialFallbackId);

    // Fetch users (request higher pageSize to find true latest employee number)
    this.userSub = this.userService.getUser('', 1, 1000).subscribe({
      next: (res: any) => {
        const users: User[] = Array.isArray(res) ? res : (res?.items || []);
        
        // Find all users with standard format (e.g. OAC-2026-001)
        const standardFormatUsers = users.filter(user => 
          typeof user?.empNo === 'string' && 
          user.empNo.match(/^[A-Za-z]{2,5}-\d{4}-\d{3,4}$/)
        );

        let prefix = defaultPrefix;

        if (standardFormatUsers.length > 0) {
          // Extract prefixes and find the most common one
          const prefixCounts: Record<string, number> = {};
          standardFormatUsers.forEach(user => {
            const p = user.empNo.split('-')[0].toUpperCase();
            prefixCounts[p] = (prefixCounts[p] || 0) + 1;
          });

          prefix = Object.keys(prefixCounts).reduce((a, b) => 
            prefixCounts[a] > prefixCounts[b] ? a : b
          );
        }

        this.desiredPrefix = prefix;

        // Filter users with the determined prefix
        const prefixedUsers = users.filter(user => 
          typeof user?.empNo === 'string' && 
          user.empNo.toUpperCase().startsWith(prefix)
        );

        let nextId = 1;
        if (prefixedUsers.length > 0) {
          // Find the maximum sequence number among prefixed users
          const maxId = prefixedUsers.reduce((prevMax, user) => {
            const empNoParts = user.empNo.split('-');
            if (empNoParts.length >= 2) {
              const lastPart = empNoParts[empNoParts.length - 1];
              const idNumber = parseInt(lastPart, 10);
              return !isNaN(idNumber) ? Math.max(prevMax, idNumber) : prevMax;
            }
            return prevMax;
          }, 0);
          nextId = maxId + 1;
        }

        // Generate the new employee number
        const paddedId = `${prefix}-${currentYear}-${nextId.toString().padStart(3, "0")}`;
        
        this.invNo = paddedId;
        this.form.get('empNo')?.setValue(paddedId);
      },
      error: (err) => {
        console.error('Error fetching users for employee number generation:', err);
        this.invNo = initialFallbackId;
        this.form.get('empNo')?.setValue(initialFallbackId);
      }
    });
  }

  extractLetters(input: string): string {
    const match = input.match(/^[A-Za-z]+/);

    return match ? match[0] : '';
  }

  @ViewChild(PersonalDetailsComponent) personalDetailsComponent!: PersonalDetailsComponent;
  @ViewChild(UserPositionComponent) userPositionComponent!: UserPositionComponent;
  @ViewChild(StatuatoryInfoComponent) statuatoryInfoComponent!: StatuatoryInfoComponent;
  @ViewChild(UserAccountComponent) userAccountComponent!: UserAccountComponent;
  @ViewChild(UserDocumentsComponent) userDocumentsComponent!: UserDocumentsComponent;
  @ViewChild(UserNomineeComponent) userNomineeComponent!: UserNomineeComponent;
  @ViewChild(UserSalaryComponent) userSalaryComponent!: UserSalaryComponent;
  // @ViewChild(UserQualificationComponent) userQualificationComponent!: UserQualificationComponent;

  onTabSelected(event: any) {
    this.selectedTabIndex = event.index;
    if (!this.dataToPass) {
      this.dataToPass = { updateStatus: this.editStatus, id: this.id, name: this.userName };
    }
    this.scrollToTop();
    setTimeout(() => this.initCurrentTab(), 0);
  }

  initCurrentTab() {
    if (!this.dataToPass && this.id) {
      this.dataToPass = { updateStatus: this.editStatus, id: this.id, name: this.userName, empNo: this.invNo };
    }
    if (this.selectedTabIndex === 1 && this.personalDetailsComponent) {
      this.isFormSubmitted = true;
      this.personalDetailsComponent.triggerNew(this.dataToPass);
    } else if (this.selectedTabIndex === 2 && this.userPositionComponent) {
      this.isWorkFormSubmitted = true;
      this.userPositionComponent.triggerNew(this.dataToPass);
    } else if (this.selectedTabIndex === 3 && this.statuatoryInfoComponent) {
      this.isContactsFormSubmitted = true;
      this.statuatoryInfoComponent.triggerNew(this.dataToPass);
    } else if (this.selectedTabIndex === 4 && this.userAccountComponent) {
      this.isSocialFormSubmitted = true;
      this.userAccountComponent.triggerNew(this.dataToPass);
    } else if (this.selectedTabIndex === 5 && this.userNomineeComponent) {
      this.isNomineeFormSubmitted = true;
      this.userNomineeComponent.triggerNew(this.dataToPass);
    } else if (this.selectedTabIndex === 6 && this.userSalaryComponent) {
      this.isSalaryFormSubmitted = true;
      this.userSalaryComponent.triggerNew(this.dataToPass);
    } else if (this.selectedTabIndex === 7 && this.userDocumentsComponent) {
      this.isAccountFormSubmitted = true;
      this.userDocumentsComponent.triggerNew(this.dataToPass);
    }
  }

  goToNextTab() {
    if (this.selectedTabIndex < 7) {
      if (this.dataToPass === undefined) {
        this.dataToPass = { updateStatus: this.editStatus, id: this.id, name: this.userName, empNo: this.invNo };
      }
      this.selectedTabIndex++;
      this.scrollToTop();
      setTimeout(() => this.initCurrentTab(), 0);
    }
  }

  // editStatus: boolean = false;
  triggerNew(data?: any): void {
    if(data){
      this.editStatus = true;
      this.getUser(data.id)
    }
  }

  goToPreviousTab(): void {
    if (this.selectedTabIndex > 0) {
      if (this.dataToPass === undefined) {
        this.dataToPass = { updateStatus: this.editStatus, id: this.id, name: this.userName, empNo: this.invNo };
      }
      this.selectedTabIndex--;
      this.scrollToTop();
      if (this.selectedTabIndex === 0) {
        this.triggerNew(this.dataToPass);
      } else {
        setTimeout(() => this.initCurrentTab(), 0);
      }
    }
  }

  generateRandomPassword() {
    const chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*()';
    let password = '';
    for (let i = 0; i < 10; i++) {
      password += chars.charAt(Math.floor(Math.random() * chars.length));
    }

    this.form.get('password')?.setValue(password);
    // this.form.get('confirmPassword')?.setValue(password);  // Clear confirm password
  }

  isCopied: boolean = false;
  copyEmpNoAndPassword() {
    let empNo = this.form.get('empNo')?.value || this.invNo;
    let password = this.form.get('password')?.value;

    // If password hasn't been generated or entered, generate one automatically
    if (!password) {
      this.generateRandomPassword();
      password = this.form.get('password')?.value;
    }

    // Keep form empNo in sync with invNo if needed
    if (!empNo && this.invNo) {
      empNo = this.invNo;
      this.form.get('empNo')?.setValue(this.invNo);
    }

    const officialMail = this.form.get('officialMailId')?.value;
    const personalMail = this.form.get('email')?.value;
    const email = officialMail || personalMail || '';
    const name = this.form.get('name')?.value || this.userName || '';

    const lines: string[] = [];
    if (name) lines.push(`Name: ${name}`);
    if (empNo) lines.push(`Emp ID: ${empNo}`);
    if (email) lines.push(`Email: ${email}`);
    if (password) lines.push(`Password: ${password}`);

    const textToCopy = lines.length > 0 ? lines.join('\n') : `Password: ${password}`;

    let success = false;
    try {
      success = this.clipboard.copy(textToCopy);
    } catch {
      success = false;
    }

    if (!success && typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
      navigator.clipboard.writeText(textToCopy).then(
        () => {
          this.handleCopySuccess();
        },
        () => {
          this.fallbackCopyText(textToCopy);
        }
      );
      return;
    }

    if (success) {
      this.handleCopySuccess();
    } else {
      this.fallbackCopyText(textToCopy);
    }
  }

  private handleCopySuccess() {
    this.isCopied = true;
    setTimeout(() => {
      this.isCopied = false;
    }, 2500);
    this.snackBar.open('Credentials copied to clipboard!', '', { duration: 3000 });
  }

  private fallbackCopyText(text: string) {
    try {
      const textArea = document.createElement('textarea');
      textArea.value = text;
      textArea.style.top = '0';
      textArea.style.left = '0';
      textArea.style.position = 'fixed';
      textArea.style.opacity = '0';
      document.body.appendChild(textArea);
      textArea.focus();
      textArea.select();
      const successful = document.execCommand('copy');
      document.body.removeChild(textArea);
      if (successful) {
        this.handleCopySuccess();
      } else {
        this.snackBar.open('Unable to copy automatically. Please copy manually: ' + text, '', { duration: 5000 });
      }
    } catch {
      this.snackBar.open('Unable to copy credentials. Please copy manually.', '', { duration: 3000 });
    }
  }

  delete!: Subscription;
  deleteImage() {
    if(this.id){
      this.delete = this.userService.deleteUserImage(this.id, this.imageUrl).subscribe(()=>{
        this.imageUrl = ''
        this.snackBar.open("User image is deleted successfully...","" ,{duration:3000})
        this.getUser(this.id)
      });
    }else{
      this.delete = this.userService.deleteUserImageByurl(this.imageUrl).subscribe(()=>{
        this.imageUrl = ''
        this.snackBar.open("User image is deleted successfully...","" ,{duration:3000})
      });
    }
  }

  isLoading: boolean
  updateLoadingState(isLoading: any): void {
      this.isLoading = isLoading;
  }
}
