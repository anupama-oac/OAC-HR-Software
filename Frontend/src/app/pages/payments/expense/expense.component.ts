/* eslint-disable @typescript-eslint/no-explicit-any */
import { ChangeDetectorRef, Component, inject, OnDestroy, OnInit } from '@angular/core';
import { FormArray, FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { Subscription } from 'rxjs';
import { ExpensesService } from '@services/expenses.service';
import { Expense } from '../../../common/interfaces/payments/expense';
import { MatSnackBar } from '@angular/material/snack-bar';
import { LoginService } from '@services/login.service';
import { MatOptionModule } from '@angular/material/core';
import { MatSelectModule } from '@angular/material/select';
import { ActivatedRoute, Router } from '@angular/router';
import { RoleService } from '@services/role.service';
import { SafePipe } from '../../../common/pipes/safe.pipe';
import { CommonModule } from '@angular/common';
import { User } from '../../../common/interfaces/users/user';
import { PettyCashService } from '@services/petty-cash.service';
import { UsersService } from '@services/users.service';
import { environment } from '../../../../environments/environment';

@Component({
  selector: 'app-expense',
  standalone: true,
  imports: [ReactiveFormsModule, MatFormFieldModule, MatInputModule, MatCardModule, MatButtonModule, MatIconModule, SafePipe,
    MatOptionModule, MatSelectModule, CommonModule
  ],
  templateUrl: './expense.component.html',
  styleUrl: './expense.component.scss'
})
export class ExpenseComponent implements OnInit, OnDestroy {
  id: number;
  private route = inject(ActivatedRoute);
  private roleService = inject(RoleService);

  ngOnInit(): void {
    this.id = this.route.snapshot.params['id'];
    if(this.id){
      this.patchdata(this.id);
    }else{
      this.addDoc();
      this.generateInvoiceNumber();
    }
    const token: any = localStorage.getItem('token');
    const user = token ? JSON.parse(token) : null;

    if (user) {
      this.loggedInUserId = user.id;
      this.expenseForm.patchValue({ userId: user.id });
      this.getRoleById(user.role);
    }

    this.userIdSub = this.expenseForm.get('userId')?.valueChanges.subscribe(userId => {
      if (userId) {
        this.getPettyCashByUserId(userId);
      }
    });
  }

  goBack(): void {
    this.router.navigateByUrl('login/viewApproval/viewexpenses');
  }

  pettyCashBalance: number = 0;
  pettyCashSub!: Subscription;
  private pettyCashService = inject(PettyCashService);
  private usersService = inject(UsersService);

  isSuperAdmin = false;
  isFinanceManager = false;
  isOperationsManager = false;
  canAssignEmployee = false;
  usersList: User[] = [];
  loggedInUserId!: number;
  userSub?: Subscription;
  userIdSub?: Subscription;

  getPettyCashByUserId(userId: number) {
    this.pettyCashSub?.unsubscribe();
    this.pettyCashSub = this.pettyCashService.getByUserId(userId).subscribe(res => {
      if (res && res.success) {
        this.pettyCashBalance = res.data.balance;
      }
    });
  }

  roleSub!: Subscription;
  roleName: string = '';

  private evaluatePermissions(roleName?: string, designationName?: string, rawUser?: any) {
    const rLower = (roleName || '').toLowerCase().trim();
    const dLower = (designationName || '').toLowerCase().trim();
    const sysRole = (rawUser?.systemRoleName || '').toLowerCase().trim();

    const isSuperOrAdmin =
      Boolean(rawUser?.isSuperAdmin) ||
      rawUser?.systemRoleId === 1 ||
      rLower === 'super administrator' ||
      rLower === 'administrator' ||
      rLower === 'super admin' ||
      rLower.includes('super admin') ||
      dLower.includes('super admin') ||
      sysRole.includes('super admin');

    const isFinance =
      rLower === 'finance manager' ||
      rLower.includes('finance manager') ||
      dLower === 'finance manager' ||
      dLower.includes('finance manager');

    const isOperations =
      rLower === 'operations manager' ||
      rLower === 'operation manager' ||
      rLower.includes('operations manager') ||
      rLower.includes('operation manager') ||
      dLower === 'operations manager' ||
      dLower === 'operation manager' ||
      dLower.includes('operations manager') ||
      dLower.includes('operation manager');

    this.isSuperAdmin = isSuperOrAdmin;
    this.isFinanceManager = isFinance;
    this.isOperationsManager = isOperations;
    this.canAssignEmployee = isSuperOrAdmin || isFinance || isOperations;

    if (this.canAssignEmployee) {
      if (this.usersList.length === 0) {
        this.usersService.getUser('', 1, 1000).subscribe((res: any) => {
          this.usersList = res?.items ? res.items : (Array.isArray(res) ? res : []);
          const currentVal = this.expenseForm.get('userId')?.value;
          if (!currentVal && this.loggedInUserId) {
            this.expenseForm.patchValue({ userId: this.loggedInUserId });
            this.getPettyCashByUserId(this.loggedInUserId);
          }
        });
      }
      this.expenseForm.get('userId')?.setValidators(Validators.required);
      this.expenseForm.get('userId')?.updateValueAndValidity();

      const currentVal = this.expenseForm.get('userId')?.value;
      if (!currentVal && this.loggedInUserId) {
        this.expenseForm.patchValue({ userId: this.loggedInUserId });
      }
      const targetUserId = this.expenseForm.get('userId')?.value || this.loggedInUserId;
      if (targetUserId) {
        this.getPettyCashByUserId(targetUserId);
      }
    } else {
      this.expenseForm.get('userId')?.clearValidators();
      this.expenseForm.get('userId')?.updateValueAndValidity();
      if (this.loggedInUserId) {
        this.expenseForm.patchValue({ userId: this.loggedInUserId });
        this.getPettyCashByUserId(this.loggedInUserId);
      }
    }
  }

  private checkUserPosition(userId: number) {
    if (!userId) return;
    this.userSub?.unsubscribe();
    this.userSub = this.usersService.getUserById(userId).subscribe({
      next: (userObj: any) => {
        const desig = userObj?.userPosition?.designation?.designationName;
        const roleName = userObj?.role?.roleName || this.roleName;
        this.evaluatePermissions(roleName, desig, userObj);
      },
      error: () => {}
    });
  }

  getRoleById(id: number){
    const token: any = localStorage.getItem('token');
    let tokenUser: any = null;
    if (token) {
      try {
        tokenUser = JSON.parse(token);
        this.evaluatePermissions(tokenUser?.roleName, tokenUser?.designationName, tokenUser);
      } catch (e) {}
    }

    if (id) {
      this.roleSub = this.roleService.getRoleById(id).subscribe({
        next: (role) => {
          this.roleName = role?.roleName || '';
          this.evaluatePermissions(role?.roleName, tokenUser?.designationName, tokenUser);
          this.checkUserPosition(this.loggedInUserId);
        },
        error: () => {
          this.checkUserPosition(this.loggedInUserId);
        }
      });
    } else {
      this.checkUserPosition(this.loggedInUserId);
    }
    this.getAM();
  }

  private fb = inject(FormBuilder)
  private expenseService = inject(ExpensesService);
  private snackBar = inject(MatSnackBar);
  private loginService = inject(LoginService);

  expenseForm = this.fb.group({
    exNo: ['', Validators.required],
    notes: [''],
    url: this.fb.array([]),
    status: [{ value: 'Generated', disabled: true }],
    paymentMode: [''],
    currency: <any>['INR'],
    totalAmount: [0],
    userId: [null as any]
  });

  piSub!: Subscription;
  editStatus: boolean = false;
  fileName!: string;
  piNo: string;
  savedImageUrl: any[] = [];
  patchdata(id: number) {
    console.log(id);
    this.editStatus = true;
    this.piSub = this.expenseService.getExpenseById(id).subscribe((pi: any) => {
      console.log(pi);
      
      const inv: Expense = pi.pi;
      this.piNo = inv.expenseNumber
      this.expenseForm.patchValue({
        userId: inv.userId,
        exNo: inv.expenseNumber,
        status: inv.status,
        paymentMode: inv.paymentMode,
        notes: (inv as any).description || inv.notes, 
        totalAmount: inv.amount,
        currency: inv.currency
      });

      if (this.canAssignEmployee && (inv as any).userId) {
        this.expenseForm.patchValue({ userId: (inv as any).userId });
      } else if (this.loggedInUserId) {
        this.expenseForm.patchValue({ userId: this.loggedInUserId });
      }

      for (let index = 0; index < pi.signedUrl.length; index++) {
        this.addDoc(pi.pi.url[index])
      }

      if (inv.url) {
        this.savedImageUrl = (pi.signedUrl || []).map((u: any) => {
           let urlStr = u;
           while(urlStr && typeof urlStr === 'object' && urlStr.url) {
             urlStr = urlStr.url;
           }
           return urlStr;
        });
      }
    });
  }

  fileType: any[] = [];
  uploadSub!: Subscription;
  imageUrl: any[] = [];
  allowedFileTypes = ['pdf', 'jpeg', 'jpg', 'png', 'plain'];
  onFileSelected(event: Event, i: number): void {
    const input = event.target as HTMLInputElement;
    const file: any = input.files?.[0];
    this.fileType[i] = file.type.split('/')[1]
    if (!this.allowedFileTypes.includes(this.fileType[i])) {
      alert('Invalid file type. Please select a PDF, JPEG, JPG, TXT or PNG file.');
      return;
    }
    if (file) {
        const inv = this.ivNum;
        const name = `${inv}_${i}`;
        const formData = new FormData();
        formData.append('file', file);
        formData.append('name', name);

        this.uploadSub = this.expenseService.uploadExpense(formData).subscribe({
            next: (invoice) => {
                this.doc().at(i).get('url')?.setValue(invoice.fileUrl);
                this.imageUrl[i] = invoice.fileUrl;
            }
        });
    }
  }

  doc(): FormArray {
    return this.expenseForm.get("url") as FormArray;
  }

  onDeleteImage(i: number){
    this.expenseService.deleteUploadByurl(this.imageUrl[i]).subscribe(()=>{
      this.imageUrl[i] = ''
      this.savedImageUrl[i] = ''
      this.doc().at(i).get('url')?.setValue('');
      this.snackBar.open("Document is deleted successfully...","" ,{duration:3000})
    });
  }

  deleteSub!: Subscription;
  onDeleteUploadedImage(i: number){
    this.deleteSub = this.expenseService.deleteUploaded(this.route.snapshot.params['id'], i).subscribe(()=>{
      this.savedImageUrl[i] = '';
      this.imageUrl[i] = '';
      this.snackBar.open("Document is deleted successfully...","" ,{duration:3000})
      this.isImageUploaded()
    });
  }

  isImageUploaded(): boolean {
    const controls = this.expenseForm.get('url')as FormArray;
    if( controls.length === 0) {return true}
    const i = controls.length - 1;
    if (this.savedImageUrl[i] || this.imageUrl[i]) {
      return true;
    }else return false;
  }

  isImage(url: any): boolean {
    if (!url) return false;
    let urlStr = url;
    // Unwrap if the url is deeply nested due to backend object mapping
    while (urlStr && typeof urlStr === 'object' && urlStr.url) {
      urlStr = urlStr.url;
    }
    if (typeof urlStr !== 'string') return false;
    
    // Remove query parameters like ?X-Amz-Algorithm... before checking the extension
    const cleanUrl = urlStr.split('?')[0].toLowerCase();
    return cleanUrl.endsWith('.jpg') || cleanUrl.endsWith('.jpeg') || cleanUrl.endsWith('.png') || cleanUrl.endsWith('.gif') || cleanUrl.endsWith('.webp');
  }


  index!: number;
  clickedForms: boolean[] = [];
  addDoc(data?:any){
    this.doc().push(this.newDoc(data));
    this.clickedForms.push(false);
    // this.cdr.detectChanges();
  }

  newDoc(initialValue?: any): FormGroup {
    return this.fb.group({
      url: [initialValue ? initialValue.url : ''],
      remarks: [initialValue ? initialValue.remarks : ''],
    });
  }

  deleteUploadSub!: Subscription;
  private cdr = inject(ChangeDetectorRef)
  removeData(index: number) {
    if (index >= 0 && index < this.doc().length) {
        this.doc().removeAt(index);
        this.imageUrl.splice(index, 1);
        this.savedImageUrl.splice(index, 1);
    } else {
       alert(`Index ${index} is out of bounds for removal`);
    }
  }

  invSub!: Subscription;
  prefix: string = '';
  ivNum: string = '';
  generateInvoiceNumber() {
    this.invSub = this.expenseService.getExpense().subscribe({
      next: (res: any) => {
        const items = res?.data || (Array.isArray(res) ? res : []);
        if (items.length > 0) {
          const maxId = items.reduce((prevMax: number, inv: any) => {
            if (!inv.expenseNumber) return prevMax;
            const idNumber = parseInt(inv.expenseNumber.replace(/\D/g, ''), 10);
            return !isNaN(idNumber) && idNumber > prevMax ? idNumber : prevMax;
          }, 0);

          const nextId = maxId + 1;
          const paddedId = `EXP-${nextId.toString().padStart(3, '0')}`;
          this.ivNum = paddedId;
        } else {
          const nextId = 1;
          const prefix = 'EXP-';
          const paddedId = `${prefix}${nextId.toString().padStart(3, '0')}`;
          this.ivNum = paddedId;
        }

        this.expenseForm.get('exNo')?.setValue(this.ivNum);
      },
      error: () => {
        if (!this.expenseForm.get('exNo')?.value) {
          this.expenseForm.get('exNo')?.setValue(`EXP-001`);
        }
      }
    });
  }

  extractLetters(input: string): string {
    const extractedChars = input.match(/[A-Za-z-]/g);
    const result = extractedChars ? extractedChars.join('') : '';

    return result;
  }

  submit!: Subscription;
  private router = inject(Router);
  onSubmit(){
    // If userId not selected by admin/manager, default to logged in user
    if (this.canAssignEmployee && !this.expenseForm.get('userId')?.value && this.loggedInUserId) {
      this.expenseForm.patchValue({ userId: this.loggedInUserId });
    }

    const formValue = this.expenseForm.getRawValue();
    const modeLower = (formValue.paymentMode || '').toLowerCase().trim();
    let currentStatus = formValue.status;

    if (!this.editStatus) {
      if (modeLower === 'card') {
        currentStatus = 'Pending Operations Approval';
      } else if (modeLower === 'petty cash' || modeLower === 'pettycash') {
        currentStatus = 'Completed';
      } else {
        currentStatus = 'Pending Finance Approval';
      }
    }

    const rawUrls = formValue.url || [];
    const validUrls = Array.isArray(rawUrls)
      ? rawUrls.filter((d: any) => d && (d.url || (typeof d === 'string' && d.trim().length > 0)))
      : [];

    const payload: any = {
      ...formValue,
      status: currentStatus,
      amount: formValue.totalAmount !== null && formValue.totalAmount !== undefined ? Number(formValue.totalAmount) : 0,
      description: formValue.notes || '',
      url: validUrls
    };
    if (!this.canAssignEmployee || !payload.userId) {
      payload.userId = this.loggedInUserId;
    }

    if(this.editStatus){
      this.submit = this.expenseService.updateExpense(payload, this.id).subscribe({
        next: (res) => {
          this.snackBar.open("Expense updated succesfully...","" ,{duration:3000})
          if(this.roleName === 'Super Administrator' || this.roleName === 'Administrator'){
            this.router.navigateByUrl('login/viewApproval/viewexpenses');
          }else{
            this.router.navigateByUrl('login/viewApproval/viewexpenses');
          }
        },
        error: (err) => {
          alert(err.error?.message || "Error updating expense");
        }
      });
    }else{
      this.submit = this.expenseService.addExpense(payload).subscribe({
        next: () => {
          this.snackBar.open("Expense added succesfully...","" ,{duration:3000})
          this.router.navigateByUrl('login/viewApproval/viewexpenses');
        },
        error: (err) => {
          alert(err.error?.message || "Error adding expense");
        }
      });
    }

  }

  amSub!: Subscription;
  AMList: User[] = [];
  getAM(){
    let role;
    if(this.roleName === 'Manager'){
      role = 'Accountant'
    }else{
      role = 'Manager'
    }
    this.amSub = this.loginService.getUserByRoleName(role).subscribe(user =>{
      this.AMList = user;
    });
  }

  ngOnDestroy(): void {
    this.roleSub?.unsubscribe();
    this.userSub?.unsubscribe();
    this.pettyCashSub?.unsubscribe();
    this.piSub?.unsubscribe();
    this.uploadSub?.unsubscribe();
    this.invSub?.unsubscribe();
    this.submit?.unsubscribe();
    this.amSub?.unsubscribe();
    this.userIdSub?.unsubscribe();
    this.deleteUploadSub?.unsubscribe();
  }
}
