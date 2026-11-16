/* eslint-disable @typescript-eslint/no-explicit-any */
import { CommonModule } from '@angular/common';
import { Component, inject, OnDestroy, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatDividerModule } from '@angular/material/divider';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MatTooltipModule } from '@angular/material/tooltip';
import { Subscription } from 'rxjs';
import { TeamService } from '@services/team.service';
import { TeamDialogueComponent } from './team-dialogue/team-dialogue.component';
import { DeleteDialogueComponent } from '../../theme/components/delete-dialogue/delete-dialogue.component';
import { Team } from '../../common/interfaces/users/team';

@Component({
  selector: 'app-team',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatButtonModule,
    MatCardModule,
    MatIconModule,
    MatFormFieldModule,
    MatInputModule,
    MatProgressSpinnerModule,
    MatTooltipModule,
    MatDialogModule,
    MatDividerModule
  ],
  templateUrl: './team.component.html',
  styleUrl: './team.component.scss'
})
export class TeamComponent implements OnInit, OnDestroy {
  public teams: Team[] | null = null;
  public searchText: string = '';
  public isLoading: boolean = false;

  private teamService = inject(TeamService);
  private dialog = inject(MatDialog);
  private snackBar = inject(MatSnackBar);

  private teamSub?: Subscription;
  private deleteSub?: Subscription;

  ngOnInit(): void {
    this.getTeams();
  }

  ngOnDestroy(): void {
    this.teamSub?.unsubscribe();
    this.deleteSub?.unsubscribe();
  }

  public getTeams(): void {
    this.isLoading = true;
    this.teamSub?.unsubscribe();
    this.teamSub = this.teamService.getTeam().subscribe({
      next: (res: any) => {
        this.teams = res || [];
        this.isLoading = false;
      },
      error: (err) => {
        console.error('Error fetching teams:', err);
        this.teams = [];
        this.isLoading = false;
        this.snackBar.open('Failed to load teams list', 'Close', { duration: 3000 });
      }
    });
  }

  get filteredTeams(): Team[] {
    if (!this.teams) return [];
    if (!this.searchText?.trim()) return this.teams;
    const q = this.searchText.trim().toLowerCase();
    return this.teams.filter(t => {
      const matchName = t.teamName && t.teamName.toLowerCase().includes(q);
      const matchLeader = (t.team_leaders || []).some(l => l.user?.name && l.user.name.toLowerCase().includes(q));
      const matchMember = (t.team_members || []).some(m => m.user?.name && m.user.name.toLowerCase().includes(q));
      return matchName || matchLeader || matchMember;
    });
  }

  get totalTeams(): number {
    return this.teams ? this.teams.length : 0;
  }

  get totalLeaders(): number {
    if (!this.teams) return 0;
    const leaderSet = new Set<number>();
    this.teams.forEach(t => {
      (t.team_leaders || []).forEach(l => {
        if (l.userId) leaderSet.add(l.userId);
      });
    });
    return leaderSet.size;
  }

  get totalMembers(): number {
    if (!this.teams) return 0;
    const memberSet = new Set<number>();
    this.teams.forEach(t => {
      (t.team_members || []).forEach(m => {
        if (m.userId) memberSet.add(m.userId);
      });
    });
    return memberSet.size;
  }

  clearSearch(): void {
    this.searchText = '';
  }

  public openTeamDialog(team?: Team | null): void {
    const dialogRef = this.dialog.open(TeamDialogueComponent, {
      width: '640px',
      maxWidth: '96vw',
      panelClass: 'modern-team-dialog',
      autoFocus: false,
      data: team || null
    });
    dialogRef.afterClosed().subscribe((res) => {
      this.getTeams();
    });
  }

  // Alias for backward compatibility
  public openRoleDialog(team?: Team | null): void {
    this.openTeamDialog(team);
  }

  public deleteTeam(team: Team): void {
    const dialogRef = this.dialog.open(DeleteDialogueComponent, {
      width: '440px',
      maxWidth: '95vw',
      data: {
        title: 'Delete Team',
        message: `Are you sure you want to delete "${team.teamName}"? This action cannot be undone.`,
        itemName: team.teamName,
        confirmText: 'Delete'
      }
    });

    dialogRef.afterClosed().subscribe(res => {
      if (res) {
        this.isLoading = true;
        this.deleteSub?.unsubscribe();
        this.deleteSub = this.teamService.deleteTeam(team.id).subscribe({
          next: () => {
            this.isLoading = false;
            this.snackBar.open(`Team "${team.teamName}" deleted successfully.`, 'Close', { duration: 3000 });
            this.getTeams();
          },
          error: (err) => {
            this.isLoading = false;
            this.snackBar.open(err?.error?.message || 'Failed to delete team', 'Close', { duration: 3000 });
          }
        });
      }
    });
  }

  getInitials(name?: string): string {
    if (!name) return 'TM';
    const parts = name.trim().split(/\s+/);
    if (parts.length === 1) return parts[0].substring(0, 2).toUpperCase();
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  }

  getAvatarColor(name?: string): string {
    if (!name) return '#3b82f6';
    const colors = ['#2563eb', '#7c3aed', '#059669', '#d97706', '#db2777', '#0891b2', '#4f46e5'];
    let hash = 0;
    for (let i = 0; i < name.length; i++) {
      hash = name.charCodeAt(i) + ((hash << 5) - hash);
    }
    const index = Math.abs(hash) % colors.length;
    return colors[index];
  }
}
