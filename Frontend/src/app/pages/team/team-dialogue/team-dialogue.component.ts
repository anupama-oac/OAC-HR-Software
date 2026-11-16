import { Component, Inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { TeamService } from '@services/team.service';
import { UsersService } from '@services/users.service';
import { Team } from '../../../common/interfaces/users/team';
import { User } from '../../../common/interfaces/users/user';

@Component({
  selector: 'app-team-dialogue',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatDialogModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatIconModule,
    MatButtonModule,
    MatTooltipModule,
    MatProgressSpinnerModule
  ],
  templateUrl: './team-dialogue.component.html',
  styleUrl: './team-dialogue.component.scss'
})
export class TeamDialogueComponent implements OnInit {
  public users: User[] = [];
  public isSubmitting = false;

  teamForm = this.fb.group({
    teamName: ['', [Validators.required, Validators.minLength(2)]],
    teamLeaders: [[] as number[]],
    teamMembers: [[] as number[]]
  });

  constructor(
    private fb: FormBuilder,
    private teamService: TeamService,
    private userService: UsersService,
    private snackBar: MatSnackBar,
    public dialogRef: MatDialogRef<TeamDialogueComponent>,
    @Inject(MAT_DIALOG_DATA) public team: Team | null
  ) {}

  ngOnInit(): void {
    this.getUsers();
    if (this.team) {
      this.patchTeam(this.team);
    }
  }

  private isSystemAdminAccount(u: User): boolean {
    if (!u) return true;
    const empNo = (u.empNo || '').trim().toUpperCase();
    const email = (u.email || '').trim().toLowerCase();
    const name = (u.name || '').trim().toLowerCase();
    if (empNo === 'SA001' || empNo === 'HR001' || empNo === 'QSA001') return true;
    if (email === 'admin@onboarddummy.com' || email === 'hr@onboarddummy.com' || email === 'qualityadmin@leedsaerospace.com') return true;
    if (
      !u.director &&
      (name === 'super administrator' ||
        name === 'hr administrator' ||
        name === 'administrator' ||
        name === 'quality super administrator' ||
        name === 'super admin' ||
        name === 'hr admin' ||
        name === 'approval admin')
    ) {
      return true;
    }
    return false;
  }

  getUsers(): void {
    this.userService.getUser('', 1, 1000).subscribe({
      next: (result: any) => {
        const raw = Array.isArray(result) ? result : (result?.items || []);
        this.users = raw.filter((u: User) => !this.isSystemAdminAccount(u));
      },
      error: (err) => {
        console.error('Failed to load users:', err);
      }
    });
  }

  /**
   * Identifies whether a user is strictly a Team Leader (TL)
   */
  isTeamLeaderUser(user: User): boolean {
    if (!user) return false;
    const desigName = (user.userPosition?.designation?.designationName || '').trim().toUpperCase();
    const desigAbbr = (user.userPosition?.designation?.abbreviation || '').trim().toUpperCase();
    const roleName = (user.role?.roleName || '').trim().toUpperCase();

    return (
      desigAbbr === 'TL' ||
      desigName === 'TEAM LEAD' ||
      desigName === 'TEAM LEADER' ||
      desigName.includes('TEAM LEAD') ||
      desigName.includes('TEAM LEADER') ||
      roleName === 'TEAM LEAD' ||
      roleName === 'TEAM LEADER' ||
      roleName === 'TL'
    );
  }

  /**
   * Identifies whether a user is a Sales Associate or Senior Sales Associate
   */
  isSalesAssociateUser(user: User): boolean {
    if (!user) return false;
    const desigName = (user.userPosition?.designation?.designationName || '').trim().toUpperCase();
    const desigAbbr = (user.userPosition?.designation?.abbreviation || '').trim().toUpperCase();
    const roleName = (user.role?.roleName || '').trim().toUpperCase();

    return (
      desigName === 'SALES ASSOCIATE' ||
      desigName === 'SENIOR SALES ASSOCIATE' ||
      desigName.includes('SALES ASSOCIATE') ||
      desigName.includes('SENIOR SALES ASSOCIATE') ||
      desigAbbr === 'SA' ||
      desigAbbr === 'SSA' ||
      roleName === 'SALES ASSOCIATE' ||
      roleName === 'SENIOR SALES ASSOCIATE' ||
      roleName.includes('SALES ASSOCIATE') ||
      roleName.includes('SENIOR SALES ASSOCIATE')
    );
  }

  get teamLeaderList(): User[] {
    const matching = this.users.filter(u => this.isTeamLeaderUser(u));
    // In edit mode, also include currently selected leaders so previous assignments remain visible
    const selectedIds = (this.teamForm.get('teamLeaders')?.value as number[]) || [];
    const selectedUsers = this.users.filter(u => selectedIds.includes(u.id) && !matching.some(m => m.id === u.id));
    return [...matching, ...selectedUsers];
  }

  get salesMemberList(): User[] {
    const matching = this.users.filter(u => this.isSalesAssociateUser(u));
    // In edit mode, also include currently selected members so previous assignments remain visible
    const selectedIds = (this.teamForm.get('teamMembers')?.value as number[]) || [];
    const selectedUsers = this.users.filter(u => selectedIds.includes(u.id) && !matching.some(m => m.id === u.id));
    return [...matching, ...selectedUsers];
  }

  getUserRoleOrDesignation(user: User): string {
    return (
      user.userPosition?.designation?.designationName ||
      user.role?.roleName ||
      user.userPosition?.department ||
      'Employee'
    );
  }

  patchTeam(team: any): void {
    if (!team) return;
    this.teamForm.patchValue({
      teamName: team.teamName || '',
    });

    const leaders = team.TeamLeaders || team.team_leaders || team.teamLeaders || [];
    const leaderIds = leaders.map((lead: any) => lead.userId || lead.id || lead);

    const members = team.TeamMembers || team.team_members || team.teamMembers || [];
    const memberIds = members.map((mem: any) => mem.userId || mem.id || mem);

    this.teamForm.patchValue({
      teamLeaders: leaderIds,
      teamMembers: memberIds
    });
  }

  onSubmit(): void {
    if (this.teamForm.invalid) {
      this.teamForm.markAllAsTouched();
      return;
    }

    const val = this.teamForm.getRawValue();
    const payload = {
      teamName: val.teamName?.trim(),
      teamLeaders: (val.teamLeaders || []).map((id: any) => (typeof id === 'object' ? (id.userId || id.id) : id)),
      teamMembers: (val.teamMembers || []).map((id: any) => (typeof id === 'object' ? (id.userId || id.id) : id))
    };

    this.isSubmitting = true;
    this.teamService.addTeam(payload).subscribe({
      next: () => {
        this.isSubmitting = false;
        this.snackBar.open('Team created successfully!', 'Close', { duration: 3000 });
        this.dialogRef.close(true);
      },
      error: (err) => {
        this.isSubmitting = false;
        const msg = err?.error?.error || err?.error?.message || 'Failed to create team';
        this.snackBar.open(msg, 'Close', { duration: 4000 });
      }
    });
  }

  edit(id: any): void {
    if (this.teamForm.invalid) {
      this.teamForm.markAllAsTouched();
      return;
    }

    const val = this.teamForm.getRawValue();
    const payload = {
      teamName: val.teamName?.trim(),
      teamLeaders: (val.teamLeaders || []).map((i: any) => (typeof i === 'object' ? (i.userId || i.id) : i)),
      teamMembers: (val.teamMembers || []).map((i: any) => (typeof i === 'object' ? (i.userId || i.id) : i))
    };

    this.isSubmitting = true;
    this.teamService.updateTeam(id, payload).subscribe({
      next: () => {
        this.isSubmitting = false;
        this.snackBar.open('Team updated successfully!', 'Close', { duration: 3000 });
        this.dialogRef.close(true);
      },
      error: (err) => {
        this.isSubmitting = false;
        const msg = err?.error?.error || err?.error?.message || 'Failed to update team';
        this.snackBar.open(msg, 'Close', { duration: 4000 });
      }
    });
  }

  clear(): void {
    if (this.team) {
      this.patchTeam(this.team);
    } else {
      this.teamForm.reset({
        teamName: '',
        teamLeaders: [],
        teamMembers: []
      });
    }
  }

  onCancelClick(): void {
    this.dialogRef.close();
  }
}
