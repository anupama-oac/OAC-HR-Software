/* eslint-disable @typescript-eslint/no-explicit-any */
import { Component, ElementRef, inject, OnDestroy, OnInit, ViewChild, ViewEncapsulation } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { Subscription } from 'rxjs';

import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatInputModule } from '@angular/material/input';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBar } from '@angular/material/snack-bar';

import { UsersService } from '@services/users.service';

export interface OrgNode {
  id: number;
  name: string;
  empNo?: string;
  email?: string;
  phoneNumber?: string;
  role?: string;
  designation?: string;
  department?: string;
  avatarUrl?: string;
  initials?: string;
  director?: boolean;
  level: number;
  parentId?: number | null;
  parentName?: string;
  children: OrgNode[];
  expanded: boolean;
  directReportsCount: number;
  totalSubordinatesCount: number;
  highlighted?: boolean;
  departmentClass?: string;
}

@Component({
  selector: 'app-hierarchy-tree',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatTooltipModule,
    MatInputModule,
    MatFormFieldModule,
    MatProgressSpinnerModule
  ],
  templateUrl: './hierarchy-tree.component.html',
  styleUrl: './hierarchy-tree.component.scss',
  encapsulation: ViewEncapsulation.None
})
export class HierarchyTreeComponent implements OnInit, OnDestroy {
  private readonly userService = inject(UsersService);
  private readonly router = inject(Router);
  private readonly snackBar = inject(MatSnackBar);

  @ViewChild('chartCanvas', { static: false }) chartCanvasRef!: ElementRef<HTMLDivElement>;
  @ViewChild('chartContainer', { static: false }) chartContainerRef!: ElementRef<HTMLDivElement>;

  public readonly s3 = 'https://approval-management-data-s3.s3.ap-south-1.amazonaws.com/';
  public readonly defaultAvatar = 'img/users/avatar.png';

  // Tree State
  public rootNodes: OrgNode[] = [];
  public allNodesMap = new Map<number, OrgNode>();
  public isLoading: boolean = true;
  public viewMode: 'tree' | 'directory' = 'tree';
  public focusedRootId: number | null = null;

  // Search & Filter
  public searchText: string = '';
  public searchMatchCount: number = 0;
  public selectedDepartment: string = 'ALL';
  public departments: string[] = ['ALL'];

  // Viewport & Zoom Controls
  public zoomLevel: number = 1.0;
  public panX: number = 0;
  public panY: number = 0;
  public isPanning: boolean = false;
  private startX: number = 0;
  private startY: number = 0;
  public isFullscreen: boolean = false;

  // Selected Employee Details Drawer
  public selectedEmployee: OrgNode | null = null;

  // Metrics
  public totalHeadcount: number = 0;
  public directorsCount: number = 0;
  public departmentsCount: number = 0;
  public maxDepth: number = 1;

  private userSub?: Subscription;

  ngOnInit(): void {
    this.loadOrganizationTree();
  }

  ngOnDestroy(): void {
    this.userSub?.unsubscribe();
  }

  get displayedRootNodes(): OrgNode[] {
    if (this.focusedRootId !== null) {
      return this.rootNodes.filter((r) => r.id === this.focusedRootId);
    }
    return this.rootNodes;
  }

  public setViewMode(mode: 'tree' | 'directory'): void {
    this.viewMode = mode;
    if (mode === 'tree') {
      setTimeout(() => this.fitToScreen(), 80);
    }
  }

  public filterByRootDirector(rootId: number | null): void {
    this.focusedRootId = rootId;
    if (this.viewMode === 'tree') {
      setTimeout(() => this.fitToScreen(), 80);
    }
  }

  /**
   * Loads the organization tree with Directors at the top level
   * and their multi-tier reporting hierarchy underneath.
   */
  public loadOrganizationTree(): void {
    this.isLoading = true;
    this.allNodesMap.clear();

    this.userSub = this.userService.getUser('', 1, 1000).subscribe({
      next: (res: any) => {
        let usersList: any[] = [];
        if (res && Array.isArray(res.items)) {
          usersList = res.items;
        } else if (Array.isArray(res)) {
          usersList = res;
        }

        if (usersList.length > 0) {
          this.buildTreeFromUsers(usersList);
        } else {
          this.fallbackLoadDirectors();
        }
      },
      error: (err: any) => {
        console.warn('Failed loading users list for org chart, trying directors fallback:', err);
        this.fallbackLoadDirectors();
      }
    });
  }

  private fallbackLoadDirectors(): void {
    this.userService.getDirectors().subscribe({
      next: (directors: any[]) => {
        if (directors && directors.length > 0) {
          this.buildTreeFromUsers(directors);
        } else {
          this.rootNodes = [];
          this.isLoading = false;
        }
      },
      error: (err: any) => {
        console.error('Error fetching directors:', err);
        this.isLoading = false;
        this.snackBar.open('Failed to load organization hierarchy', 'Close', { duration: 3000 });
      }
    });
  }

  private isSystemAdminAccount(u: any): boolean {
    const empNo = (u.empNo || '').trim().toUpperCase();
    const email = (u.email || '').trim().toLowerCase();
    const name = (u.name || '').trim().toLowerCase();
    if (empNo === 'SA001' || empNo === 'HR001') return true;
    if (email === 'admin@onboarddummy.com' || email === 'hr@onboarddummy.com') return true;
    if (!u.director && (name === 'super administrator' || name === 'hr administrator')) return true;
    return false;
  }

  /**
   * Transforms raw user models into a linked OrgNode graph rooted strictly at Directors.
   */
  private buildTreeFromUsers(users: any[]): void {
    const candidateMap = new Map<number, OrgNode>();

    // Phase 1: Create candidate OrgNodes (excluding separated & dummy system accounts)
    for (const u of users) {
      if (u.separated || u.status === false) continue;
      if (this.isSystemAdminAccount(u)) continue;

      const isDir = Boolean(u.director);
      const desig =
        u.userPosition?.designation?.designationName ||
        (isDir ? 'Director' : u.role?.roleName || 'Employee');
      const dept =
        u.userPosition?.department ||
        u.role?.department ||
        (isDir ? 'Executive Leadership' : 'General');

      // Extract reporting manager ID
      let parentId: number | null = null;
      if (u.userPersonal && u.userPersonal.reportingMangerId) {
        parentId = Number(u.userPersonal.reportingMangerId);
      } else if (
        u.userpersonal &&
        Array.isArray(u.userpersonal) &&
        u.userpersonal[0]?.reportingMangerId
      ) {
        parentId = Number(u.userpersonal[0].reportingMangerId);
      }

      const node: OrgNode = {
        id: u.id,
        name: u.name || 'Unnamed Employee',
        empNo: u.empNo || `EMP-${u.id}`,
        email: u.userPosition?.officialMailId || u.email || '',
        phoneNumber: u.phoneNumber || '',
        role: u.role?.roleName || 'Staff',
        designation: desig,
        department: dept,
        avatarUrl: u.url ? this.s3 + u.url : u.userImage ? this.s3 + u.userImage : '',
        initials: this.computeInitials(u.name),
        director: isDir,
        level: 1,
        parentId: parentId,
        children: [],
        expanded: true,
        directReportsCount: 0,
        totalSubordinatesCount: 0,
        departmentClass: isDir ? 'dept-executive' : this.computeDepartmentClass(dept)
      };

      candidateMap.set(u.id, node);
    }

    // Phase 2: Wire up child-parent relationships across all valid candidates
    candidateMap.forEach((node) => {
      if (node.parentId && candidateMap.has(node.parentId) && node.parentId !== node.id) {
        const parent = candidateMap.get(node.parentId)!;
        parent.children.push(node);
        node.parentName = parent.name;
      }
    });

    // Phase 3: Select ONLY Directors as top-level root nodes
    const roots: OrgNode[] = [];
    candidateMap.forEach((node) => {
      const hasValidParent =
        node.parentId && candidateMap.has(node.parentId) && node.parentId !== node.id;
      if (node.director && !hasValidParent) {
        roots.push(node);
      }
    });

    if (roots.length === 0) {
      candidateMap.forEach((node) => {
        if (node.director) {
          roots.push(node);
        }
      });
    }
    if (roots.length === 0) {
      candidateMap.forEach((node) => {
        const hasValidParent =
          node.parentId && candidateMap.has(node.parentId) && node.parentId !== node.id;
        if (!hasValidParent && node.children.length > 0) {
          roots.push(node);
        }
      });
    }

    // Sort roots and children cleanly (managers with teams first, then alphabetically)
    const sortNodes = (list: OrgNode[]) => {
      list.sort((a, b) => {
        if (a.director && !b.director) return -1;
        if (!a.director && b.director) return 1;
        if (a.children.length !== b.children.length) {
          return b.children.length - a.children.length;
        }
        return a.name.localeCompare(b.name);
      });
    };
    sortNodes(roots);

    // Phase 4: Traverse strictly from the Directors' root nodes to collect only connected hierarchy nodes
    const activeTreeMap = new Map<number, OrgNode>();
    const deptSet = new Set<string>();
    let directorsCount = 0;
    let maxDepth = 1;

    const calculateMetrics = (node: OrgNode, currentLevel: number, visited = new Set<number>()): number => {
      if (visited.has(node.id)) return 0;
      visited.add(node.id);

      activeTreeMap.set(node.id, node);
      if (node.director) directorsCount++;
      if (node.department && node.department !== 'General') {
        deptSet.add(node.department);
      }

      node.level = currentLevel;
      node.expanded = currentLevel === 1;
      if (currentLevel > maxDepth) maxDepth = currentLevel;

      sortNodes(node.children);
      node.directReportsCount = node.children.length;

      let subCount = 0;
      for (const child of node.children) {
        subCount += 1 + calculateMetrics(child, currentLevel + 1, visited);
      }
      node.totalSubordinatesCount = subCount;
      return subCount;
    };

    const visitedNodes = new Set<number>();
    for (const root of roots) {
      calculateMetrics(root, 1, visitedNodes);
    }

    // Store state strictly for the active organization chart hierarchy
    this.rootNodes = roots;
    this.allNodesMap = activeTreeMap;
    this.totalHeadcount = activeTreeMap.size;
    this.directorsCount = directorsCount;
    this.departmentsCount = deptSet.size;
    this.maxDepth = maxDepth;
    this.departments = ['ALL', ...Array.from(deptSet).sort()];
    this.isLoading = false;

    setTimeout(() => this.fitToScreen(), 150);
  }

  /**
   * Returns true when a node has > 3 children so they render in a compact
   * 3-column team pod instead of an overly wide horizontal row.
   */
  public useGridForChildren(node: OrgNode): boolean {
    return Boolean(node?.children && node.children.length > 3);
  }

  // --- Tree Interaction Methods ---

  public toggleNode(node: OrgNode, event?: MouseEvent): void {
    if (event) {
      event.stopPropagation();
    }
    node.expanded = !node.expanded;
  }

  public expandAll(expanded: boolean): void {
    const applyExpanded = (node: OrgNode) => {
      node.expanded = expanded;
      node.children.forEach((c) => applyExpanded(c));
    };
    this.rootNodes.forEach((r) => applyExpanded(r));
    setTimeout(() => this.fitToScreen(), 100);
  }

  // --- Search & Department Filtering ---

  public onSearchChange(): void {
    const query = this.searchText.trim().toLowerCase();
    this.searchMatchCount = 0;

    const traverse = (node: OrgNode): boolean => {
      let isMatch = false;
      if (query) {
        const matchName = node.name.toLowerCase().includes(query);
        const matchDesig = (node.designation || '').toLowerCase().includes(query);
        const matchDept = (node.department || '').toLowerCase().includes(query);
        const matchEmp = (node.empNo || '').toLowerCase().includes(query);
        isMatch = matchName || matchDesig || matchDept || matchEmp;
      }

      node.highlighted = isMatch;
      if (isMatch) this.searchMatchCount++;

      let childMatched = false;
      for (const child of node.children) {
        if (traverse(child)) {
          childMatched = true;
        }
      }

      if (childMatched || isMatch) {
        node.expanded = true;
      }

      return isMatch || childMatched;
    };

    this.rootNodes.forEach(traverse);

    if (query && this.searchMatchCount > 0) {
      setTimeout(() => {
        const firstMatchEl = document.querySelector('.org-card.highlighted');
        if (firstMatchEl) {
          firstMatchEl.scrollIntoView({ behavior: 'smooth', block: 'center', inline: 'center' });
        }
      }, 100);
    }
  }

  public clearSearch(): void {
    this.searchText = '';
    this.onSearchChange();
  }

  public filterByDepartment(dept: string): void {
    this.selectedDepartment = dept;
    if (dept === 'ALL') {
      this.allNodesMap.forEach((n) => (n.highlighted = false));
      return;
    }

    const query = dept.toLowerCase();
    this.allNodesMap.forEach((n) => {
      n.highlighted = (n.department || '').toLowerCase().includes(query);
      if (n.highlighted) {
        let pId = n.parentId;
        while (pId && this.allNodesMap.has(pId)) {
          this.allNodesMap.get(pId)!.expanded = true;
          pId = this.allNodesMap.get(pId)!.parentId;
        }
      }
    });
  }

  // --- Zoom, Pan & Viewport Controls ---

  public zoomIn(): void {
    if (this.zoomLevel < 1.8) {
      this.zoomLevel = Math.min(1.8, +(this.zoomLevel + 0.15).toFixed(2));
    }
  }

  public zoomOut(): void {
    if (this.zoomLevel > 0.4) {
      this.zoomLevel = Math.max(0.4, +(this.zoomLevel - 0.15).toFixed(2));
    }
  }

  public resetZoom(): void {
    this.zoomLevel = 1.0;
    this.panX = 0;
    this.panY = 0;
  }

  public fitToScreen(): void {
    this.panX = 0;
    this.panY = 0;
    this.zoomLevel = 1.0;

    setTimeout(() => {
      const container = this.chartContainerRef?.nativeElement;
      const canvas = this.chartCanvasRef?.nativeElement;
      if (!container || !canvas) return;

      const contentWidth = canvas.scrollWidth;
      const viewportWidth = container.clientWidth;

      if (contentWidth > viewportWidth && viewportWidth > 0) {
        const fittedZoom = Math.max(0.65, Math.min(1.0, +((viewportWidth - 40) / contentWidth).toFixed(2)));
        this.zoomLevel = fittedZoom;
      } else {
        this.zoomLevel = 1.0;
      }

      setTimeout(() => {
        const scrollLeft = Math.max(0, (container.scrollWidth - container.clientWidth) / 2);
        container.scrollTo({
          left: scrollLeft,
          top: 0,
          behavior: 'smooth'
        });
      }, 50);
    }, 50);
  }

  public toggleFullscreen(): void {
    const el = this.chartContainerRef?.nativeElement;
    if (!el) return;

    try {
      if (!document.fullscreenElement) {
        if (el.requestFullscreen) {
          el.requestFullscreen();
          this.isFullscreen = true;
        }
      } else {
        if (document.exitFullscreen) {
          document.exitFullscreen();
          this.isFullscreen = false;
        }
      }
    } catch (err: any) {
      console.warn('Fullscreen toggle error:', err);
    }
  }

  public printChart(): void {
    window.print();
  }

  // --- Pan Drag Handlers ---

  public onMouseDown(event: MouseEvent): void {
    const target = event.target as HTMLElement;
    if (target.closest('.org-card') || target.closest('button')) {
      return;
    }
    this.isPanning = true;
    this.startX = event.clientX - this.panX;
    this.startY = event.clientY - this.panY;
  }

  public onMouseMove(event: MouseEvent): void {
    if (!this.isPanning) return;
    this.panX = event.clientX - this.startX;
    this.panY = event.clientY - this.startY;
  }

  public onMouseUp(): void {
    this.isPanning = false;
  }

  // --- Employee Quick Drawer ---

  public selectEmployee(node: OrgNode, event?: MouseEvent): void {
    if (event) event.stopPropagation();
    this.selectedEmployee = node;
  }

  public closeEmployeeDrawer(): void {
    this.selectedEmployee = null;
  }

  public openManagerProfile(parentId: number): void {
    const manager = this.allNodesMap.get(parentId);
    if (manager) {
      this.selectedEmployee = manager;
      setTimeout(() => {
        const el = document.getElementById(`node-card-${parentId}`);
        if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center', inline: 'center' });
      }, 50);
    }
  }

  public navigateToUser(id: number): void {
    this.router.navigateByUrl(`/login/users/view/${id}`);
  }

  // --- Helper Methods ---

  public computeInitials(name?: string): string {
    if (!name) return 'EMP';
    const parts = name.trim().split(/\s+/);
    if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  }

  public computeDepartmentClass(department?: string): string {
    const lower = (department || '').toLowerCase();
    if (lower.includes('exec') || lower.includes('director') || lower.includes('leader')) return 'dept-executive';
    if (lower.includes('eng') || lower.includes('tech') || lower.includes('dev') || lower.includes('it')) return 'dept-tech';
    if (lower.includes('hr') || lower.includes('human') || lower.includes('people')) return 'dept-hr';
    if (lower.includes('prod') || lower.includes('design') || lower.includes('ui')) return 'dept-product';
    if (lower.includes('fin') || lower.includes('account') || lower.includes('payroll')) return 'dept-finance';
    if (lower.includes('sale') || lower.includes('market') || lower.includes('growth')) return 'dept-sales';
    return 'dept-general';
  }

  public getDepartmentIcon(department?: string): string {
    const lower = (department || '').toLowerCase();
    if (lower.includes('exec') || lower.includes('director')) return 'workspace_premium';
    if (lower.includes('eng') || lower.includes('tech')) return 'terminal';
    if (lower.includes('hr') || lower.includes('people')) return 'diversity_3';
    if (lower.includes('prod')) return 'auto_awesome_motion';
    if (lower.includes('fin')) return 'account_balance';
    if (lower.includes('sale')) return 'trending_up';
    return 'business';
  }
}
