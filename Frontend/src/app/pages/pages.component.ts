/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-unused-expressions */
import { Component, ElementRef, HostListener, inject, OnDestroy, OnInit, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { NavigationEnd, Router, RouterOutlet } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { Settings, SettingsService } from '../services/settings.service';
import { MenuService } from '../services/menu.service';
import { MatSidenavModule } from '@angular/material/sidenav';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { MatRadioModule } from '@angular/material/radio';
import { MatTooltipModule } from '@angular/material/tooltip';
import { FlexLayoutModule } from '@ngbracket/ngx-layout';
import { NgScrollbarModule } from 'ngx-scrollbar';
// import { SidenavComponent } from '../theme/components/sidenav/sidenav.component';
import { FullScreenComponent } from '../theme/components/fullscreen/fullscreen.component';
import { ApplicationsComponent } from '../theme/components/applications/applications.component';
import { UserMenuComponent } from '../theme/components/user-menu/user-menu.component';
import { HorizontalMenuComponent } from '../theme/components/menu/horizontal-menu/horizontal-menu.component';
import { BreadcrumbComponent } from '../theme/components/breadcrumb/breadcrumb.component';
import { ReactiveFormsModule } from '@angular/forms';
import { AnnouncementsComponent } from "./announcements/announcements.component";
import { AnnouncementsService } from '@services/announcements.service';
import { MessagesComponent } from '../theme/messages/messages.component';
import { ContactUsComponent } from "../theme/components/contact-us/contact-us.component";
import { Subscription } from 'rxjs';
import { RoleService } from '@services/role.service';
import { UsersService } from '@services/users.service';
import { SidenavComponent } from "../theme/components/sidenav/sidenav.component";
import { Announcement } from '../common/interfaces/announcement';

@Component({
  selector: 'app-pages',
  standalone: true,
  imports: [
    CommonModule,
    RouterOutlet,
    FormsModule,
    ReactiveFormsModule,
    MatSidenavModule,
    MatToolbarModule,
    MatIconModule,
    MatButtonModule,
    MatSlideToggleModule,
    MatRadioModule,
    MatTooltipModule,
    FlexLayoutModule,
    NgScrollbarModule,
    FullScreenComponent,
    ApplicationsComponent,
    UserMenuComponent,
    HorizontalMenuComponent,
    BreadcrumbComponent,
    AnnouncementsComponent,
    MessagesComponent,
    ContactUsComponent,
    SidenavComponent
],
  templateUrl: './pages.component.html',
  styleUrl: './pages.component.scss'
})
export class PagesComponent implements OnInit, OnDestroy {
  @ViewChild('sidenav') sidenav:any;
  @ViewChild('backToTop') backToTop:any;
  @ViewChild('mainSidenavContent') mainSidenavContent: any;
  @ViewChild('mainContent') mainContent: ElementRef;

  public settings: Settings;
  public menus = ['vertical', 'horizontal'];
  public menuOption:string;
  public menuTypes = ['default', 'compact', 'mini'];
  public menuTypeOption:string;
  public lastScrollTop: number = 0;
  public showBackToTop: boolean = false;
  public toggleSearchBar: boolean = false;
  private defaultMenu: string; //declared for return default menu when window resized
  public showSidenav: boolean = false;

  constructor(public settingsService: SettingsService, public router: Router, private menuService: MenuService){
    this.settings = this.settingsService.settings;
  }
  announcementService = inject(AnnouncementsService)
  ngOnInit() {
    if(window.innerWidth <= 768){
      this.settings.menu = 'vertical';
      this.settings.sidenavIsOpened = false;
      this.settings.sidenavIsPinned = false;
    }
    this.menuOption = this.settings.menu;
    this.menuTypeOption = this.settings.menuType;
    this.defaultMenu = this.settings.menu;

    this.loadLatestAnnouncement();
    this.announcementSubmitSub = this.announcementService.callSubmit$.subscribe((data) => {
      if (this.announcementService.isAnnouncementActiveToday(data)) {
        this.getAnnouncement(data);
      }
    });
    this.dismissedChangeSub = this.announcementService.dismissedChanged$.subscribe(() => {
      this.loadLatestAnnouncement();
    });

    const token: any = localStorage.getItem('token')
    const user = JSON.parse(token);
    const roleId = user.role
    this.getRoleById(roleId)
    this.getUserById(user.id)
  }

  ngOnDestroy(): void {
    this.announcementSub?.unsubscribe();
    this.announcementSubmitSub?.unsubscribe();
    this.dismissedChangeSub?.unsubscribe();
    this.userSub?.unsubscribe();
    this.roleSub?.unsubscribe();
  }

  userSub!: Subscription;
  private userService = inject(UsersService);
  getUserById(id: number){
    this.userSub = this.userService.getUserById(id).subscribe(res=>{
      if(res.userPosition?.designation?.designationName === 'HR & Admin Assistant') this.admin = true;
    })
  } 

  roleSub!: Subscription;
  admin: boolean = false;
  private roleService = inject(RoleService);
  getRoleById(id: number){
    this.roleSub = this.roleService.getRoleById(id).subscribe(role => {
      const roleName = role.roleName; 
      console.log(roleName);
      
      if(roleName === 'HR ADMIN' || roleName ==='SUPER ADMIN') {
        this.admin = true;
      }
    })
  }
  

  ngAfterViewInit(){
    setTimeout(() => { this.settings.loadingSpinner = false }, 300);
    this.backToTop.nativeElement.style.display = 'none';
    this.router.events.subscribe(event => {
      if (event instanceof NavigationEnd) {
        if(!this.settings.sidenavIsPinned){
          this.sidenav.close();
        }
        if(window.innerWidth <= 768){
          this.sidenav.close();
        }
      }
    });
    if(this.settings.menu == "vertical") {
      this.menuService.expandActiveSubMenu(this.menuService.getVerticalMenuItems());
    }
  }

  public chooseMenu(){
    this.settings.menu = this.menuOption;
    this.defaultMenu = this.menuOption;
    this.router.navigate(['/']);
  }

  public chooseMenuType(){
    this.settings.menuType = this.menuTypeOption;
  }

  public changeTheme(theme: string){
    this.settings.theme = theme;
  }

  public toggleSidenav(){
    this.sidenav.toggle();
  }

  public onPageScroll(event: any){
    (event.target.scrollTop > 300) ? this.backToTop.nativeElement.style.display = 'flex' : this.backToTop.nativeElement.style.display = 'none';
    if(this.settings.menu == 'horizontal'){
      if(this.settings.fixedHeader){
        const currentScrollTop = (event.target.scrollTop > 56) ? event.target.scrollTop : 0;
        if(currentScrollTop > this.lastScrollTop){
          document.querySelector('#horizontal-menu')!.classList.add('sticky');
          event.target.classList.add('horizontal-menu-hidden');
        }
        else{
          document.querySelector('#horizontal-menu')!.classList.remove('sticky');
          event.target.classList.remove('horizontal-menu-hidden');
        }
        this.lastScrollTop = currentScrollTop;
      }
      else{
        if(event.target.scrollTop > 56){
          document.querySelector('#horizontal-menu')!.classList.add('sticky');
          event.target.classList.add('horizontal-menu-hidden');
        }
        else{
          document.querySelector('#horizontal-menu')!.classList.remove('sticky');
          event.target.classList.remove('horizontal-menu-hidden');
        }
      }
    }
  }

  public scrollToTop() {
    this.mainSidenavContent.scrollTo({
      top: 0
    });
    this.mainContent.nativeElement.scrollTo({
      duration: 100,
      top: 0
    });
  }


  @HostListener('window:resize')
  public onWindowResize():void {
    if(window.innerWidth <= 768){
      this.settings.sidenavIsOpened = false;
      this.settings.sidenavIsPinned = false;
      this.settings.menu = 'vertical'
    }
    else{
      (this.defaultMenu == 'horizontal') ? this.settings.menu = 'horizontal' : this.settings.menu = 'vertical'
      this.settings.sidenavIsOpened = true;
      this.settings.sidenavIsPinned = true;
    }
  }

  public closeSubMenus(){
    const menu = document.querySelector(".sidenav-menu-outer");
    if(menu){
      for (let i = 0; i < menu.children[0].children.length; i++) {
        const child = menu.children[0].children[i];
        if(child){
          if(child.children[0].classList.contains('expanded')){
              child.children[0].classList.remove('expanded');
              child.children[1].classList.remove('show');
          }
        }
      }
    }
  }

  openAnnouncement(){
    this.router.navigateByUrl('/login/announcements')
  }

  announcementSub?: Subscription;
  announcementSubmitSub?: Subscription;
  dismissedChangeSub?: Subscription;
  latestAnnouncement?: Announcement;
  announcement: boolean = false;
  message: string = '';
  type: string = 'info';

  loadLatestAnnouncement(): void {
    this.announcementSub?.unsubscribe();
    this.announcementSub = this.announcementService.getAnnouncement('', true).subscribe({
      next: (res: Announcement[]) => {
        if (res && res.length > 0) {
          const active = res.find(a => !this.announcementService.isDismissed(a.id) && this.announcementService.isAnnouncementActiveToday(a));
          if (active) {
            this.getAnnouncement(active);
          } else {
            this.announcement = false;
            this.latestAnnouncement = undefined;
            this.message = '';
          }
        } else {
          this.announcement = false;
          this.latestAnnouncement = undefined;
          this.message = '';
        }
      },
      error: (err) => {
        console.error('Failed to load header announcement:', err);
      }
    });
  }

  getAnnouncement(ancmnt: any){
    if (!ancmnt) return;
    this.latestAnnouncement = ancmnt;
    this.announcement = true;
    this.message = ancmnt.message || '';
    this.type = ancmnt.type || 'info';
  }

  dismissHeaderAnnouncement(event: Event): void {
    event.stopPropagation();
    this.announcement = false;
    if (this.latestAnnouncement?.id) {
      this.announcementService.dismissAnnouncement(this.latestAnnouncement.id);
    }
  }

  getHeaderIcon(type?: string): string {
    switch ((type || '').toLowerCase()) {
      case 'success': return 'check_circle';
      case 'warning': return 'warning';
      case 'error': return 'campaign';
      default: return 'campaign';
    }
  }

  getHeaderTypeLabel(type?: string): string {
    switch ((type || '').toLowerCase()) {
      case 'success': return 'Milestone';
      case 'warning': return 'Notice';
      case 'error': return 'Urgent';
      default: return 'Announcement';
    }
  }

  openCalender(){
    this.router.navigate(['/login/leave/events']);
  }

  openTree(){
    this.router.navigateByUrl('/login/tree')
  }

}
