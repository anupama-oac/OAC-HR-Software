/* eslint-disable @typescript-eslint/no-explicit-any */
import { Component, inject, OnDestroy, OnInit, ViewChild } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { Subscription } from 'rxjs';
import { MatDialog } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MatPaginator, MatPaginatorModule, PageEvent } from '@angular/material/paginator';
import { MatTabsModule } from '@angular/material/tabs';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatProgressBarModule } from '@angular/material/progress-bar';

import { Assets } from '../../common/interfaces/assets/assets';
import { UserAssets } from '../../common/interfaces/users/user-assets';
import { AssetsService } from '@services/assets.service';
import { DeleteDialogueComponent } from '../../theme/components/delete-dialogue/delete-dialogue.component';
import { AddAssetsComponent } from './add-assets/add-assets.component';
import { AddUserAssetsComponent } from './add-user-assets/add-user-assets.component';

@Component({
  selector: 'app-assets',
  standalone: true,
  imports: [
    CommonModule,
    DatePipe,
    MatTabsModule,
    MatIconModule,
    MatButtonModule,
    MatFormFieldModule,
    MatInputModule,
    MatPaginatorModule,
    MatTooltipModule,
    MatProgressBarModule
  ],
  templateUrl: './assets.component.html',
  styleUrl: './assets.component.scss'
})
export class AssetsComponent implements OnInit, OnDestroy {
  private readonly assetService = inject(AssetsService);
  private readonly dialog = inject(MatDialog);
  private readonly snackBar = inject(MatSnackBar);

  // Subscriptions
  private companyAssetSub?: Subscription;
  private userAssetSub?: Subscription;
  private deleteSub?: Subscription;

  // Active Tab Index: 0 = Company Assets, 1 = User Assets
  selectedTabIndex = 0;

  // Loading States
  isLoadingCompany = false;
  isLoadingUser = false;

  // Company Assets State
  companySearchText = '';
  assets: Assets[] = [];
  currentPage = 1;
  pageSize = 10;
  totalItems = 0;
  @ViewChild('companyPaginator') companyPaginator!: MatPaginator;

  // User Assets State
  userSearchText = '';
  userAssets: UserAssets[] = [];
  userAssetsCurrentPage = 1;
  userAssetsPageSize = 10;
  userAssetsTotalItems = 0;
  @ViewChild('userPaginator') userPaginator!: MatPaginator;

  ngOnInit(): void {
    this.getAssets();
    this.getUserAssets();
  }

  // ================= COMPANY ASSETS METHODS =================
  getAssets(): void {
    this.isLoadingCompany = true;
    this.companyAssetSub?.unsubscribe();
    this.companyAssetSub = this.assetService.getAssets(this.companySearchText, this.currentPage, this.pageSize)
      .subscribe({
        next: (res: any) => {
          this.assets = res?.items || [];
          this.totalItems = res?.count || 0;
          this.isLoadingCompany = false;
        },
        error: (err) => {
          console.error('Failed to load company assets:', err);
          this.isLoadingCompany = false;
          this.snackBar.open('Failed to load company assets', 'Close', { duration: 3000 });
        }
      });
  }

  onCompanySearch(event: Event): void {
    this.companySearchText = (event.target as HTMLInputElement).value.trim();
    this.currentPage = 1;
    this.getAssets();
  }

  clearCompanySearch(): void {
    this.companySearchText = '';
    this.currentPage = 1;
    this.getAssets();
  }

  onPageChange(event: PageEvent): void {
    this.currentPage = event.pageIndex + 1;
    this.pageSize = event.pageSize;
    this.getAssets();
  }

  openCompanyDialog(asset: Assets | null = null): void {
    const dialogRef = this.dialog.open(AddAssetsComponent, {
      data: asset,
      width: '640px',
      maxWidth: '95vw',
      panelClass: 'modern-asset-dialog'
    });
    dialogRef.afterClosed().subscribe(() => {
      this.getAssets();
    });
  }

  // Alias for legacy calls
  openDialog(asset: Assets | null): void {
    this.openCompanyDialog(asset);
  }

  deleteCompanyAsset(id: number): void {
    const dialogRef = this.dialog.open(DeleteDialogueComponent, {});
    dialogRef.afterClosed().subscribe((confirmed) => {
      if (confirmed) {
        this.deleteSub?.unsubscribe();
        this.deleteSub = this.assetService.deleteAssets(id).subscribe({
          next: () => {
            this.snackBar.open('Company asset deleted successfully', '', { duration: 3000 });
            this.getAssets();
          },
          error: (err) => {
            console.error('Delete company asset failed:', err);
            this.snackBar.open('Failed to delete company asset', 'Close', { duration: 3000 });
          }
        });
      }
    });
  }

  // Alias for legacy calls
  delete(id: number): void {
    this.deleteCompanyAsset(id);
  }

  // ================= USER ASSETS METHODS =================
  getUserAssets(): void {
    this.isLoadingUser = true;
    this.userAssetSub?.unsubscribe();
    this.userAssetSub = this.assetService.getUserAssets(this.userSearchText, this.userAssetsCurrentPage, this.userAssetsPageSize)
      .subscribe({
        next: (res: any) => {
          this.userAssets = res?.items || [];
          this.userAssetsTotalItems = res?.count || 0;
          this.isLoadingUser = false;
        },
        error: (err) => {
          console.error('Failed to load user assets:', err);
          this.isLoadingUser = false;
          this.snackBar.open('Failed to load user assets', 'Close', { duration: 3000 });
        }
      });
  }

  onUserSearch(event: Event): void {
    this.userSearchText = (event.target as HTMLInputElement).value.trim();
    this.userAssetsCurrentPage = 1;
    this.getUserAssets();
  }

  clearUserSearch(): void {
    this.userSearchText = '';
    this.userAssetsCurrentPage = 1;
    this.getUserAssets();
  }

  onUserAssetsPageChange(event: PageEvent): void {
    this.userAssetsCurrentPage = event.pageIndex + 1;
    this.userAssetsPageSize = event.pageSize;
    this.getUserAssets();
  }

  openUserDialog(asset: UserAssets | null = null): void {
    const dialogRef = this.dialog.open(AddUserAssetsComponent, {
      data: asset,
      width: '680px',
      maxWidth: '95vw',
      panelClass: 'modern-asset-dialog'
    });
    dialogRef.afterClosed().subscribe(() => {
      this.getUserAssets();
    });
  }

  deleteUserAsset(id: number): void {
    const dialogRef = this.dialog.open(DeleteDialogueComponent, {});
    dialogRef.afterClosed().subscribe((confirmed) => {
      if (confirmed) {
        this.deleteSub?.unsubscribe();
        this.deleteSub = this.assetService.deleteUserAssets(id).subscribe({
          next: () => {
            this.snackBar.open('User asset deleted successfully', '', { duration: 3000 });
            this.getUserAssets();
          },
          error: (err) => {
            console.error('Delete user asset failed:', err);
            this.snackBar.open('Failed to delete user asset', 'Close', { duration: 3000 });
          }
        });
      }
    });
  }

  // Alias for legacy calls
  removeUserAsset(id: number): void {
    this.deleteUserAsset(id);
  }

  // ================= GENERAL / LIFECYCLE =================
  onTabChange(index: number): void {
    this.selectedTabIndex = index;
    if (index === 0) {
      this.getAssets();
    } else {
      this.getUserAssets();
    }
  }

  ngOnDestroy(): void {
    this.companyAssetSub?.unsubscribe();
    this.userAssetSub?.unsubscribe();
    this.deleteSub?.unsubscribe();
  }
}
