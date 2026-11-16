import { Component, inject, OnDestroy, OnInit } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MatTabsModule } from '@angular/material/tabs';
import { FlexLayoutModule } from '@ngbracket/ngx-layout';
import { RoleService } from '@services/role.service';
import { AddRoleDialogComponent } from '../../../role/add-role-dialog/add-role-dialog.component';
import { Designation } from '../../../../common/interfaces/users/designation';
import { Subscription } from 'rxjs';

@Component({
  selector: 'app-add-designation',
  standalone: true,
  imports: [ReactiveFormsModule, FlexLayoutModule, MatTabsModule, MatFormFieldModule, MatInputModule, MatIconModule, MatDialogModule,
    MatButtonModule],
  templateUrl: './add-designation.component.html',
  styleUrl: './add-designation.component.scss'
})
export class AddDesignationComponent implements OnInit, OnDestroy{
  ngOnDestroy(): void {
    this.submit?.unsubscribe();
  }
  private snackBar = inject(MatSnackBar);
  private dialogRef = inject(MatDialogRef<AddRoleDialogComponent>);
  private role = inject(MAT_DIALOG_DATA);
  private fb = inject(FormBuilder);
  private roleService = inject(RoleService);

  form = this.fb.group({
    designationName: ['', Validators.required],
    abbreviation: ['', Validators.required],
    status: [true]
  });

  ngOnInit() {
    if (this.role) {
      if(this.role.type === 'add'){
        this.form.patchValue({designationName: this.role.name});
      } else {
        this.patchRole(this.role);
      }
    }
  }

  editStatus: boolean = false;
  patchRole(role: Designation){
    this.editStatus = true;
    this.form.patchValue({
      designationName: role.designationName,
      abbreviation: role.abbreviation
    });
  }

  close(): void {
    this.dialogRef.close();
  }
  submit!: Subscription;
  onSubmit(){
    const data = {
      ...this.form.value
    };
    if(this.editStatus){
      this.submit = this.roleService.updateDesignation(this.role.id, data).subscribe(() => {
        this.dialogRef.close();
        this.snackBar.open("Designation updated succesfully...","" ,{duration:3000});
      });
    }else{
      this.submit = this.roleService.addDesignation(data).subscribe(() => {
        this.dialogRef.close();
        this.snackBar.open("Designation added succesfully...","" ,{duration:3000});
      });
    }
  }
}
