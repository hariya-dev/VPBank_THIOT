import { Component, OnInit, OnDestroy } from '@angular/core';
import { RouterOutlet, RouterLink, RouterLinkActive, Router, NavigationEnd } from '@angular/router';
import { CommonModule } from '@angular/common';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { AuthService } from '../core/services/auth.service';
import { SignalRService } from '../core/services/signalr.service';
import { filter } from 'rxjs';

@Component({
  selector: 'app-layout',
  standalone: true,
  imports: [CommonModule, RouterOutlet, RouterLink, RouterLinkActive, TranslateModule],
  template: `
    <div class="min-h-screen bg-vpb-grey-100">
      <!-- Mobile Overlay -->
      @if (sidebarOpen) {
        <div class="fixed inset-0 bg-black/30 backdrop-blur-sm z-40 md:hidden animate-fade-in"
             (click)="sidebarOpen = false"></div>
      }

      <!-- Sidebar — ALWAYS fixed, never scrolls with content -->
      <aside class="fixed inset-y-0 left-0 z-50 w-64 bg-white border-r border-vpb-grey-200 flex flex-col transition-transform duration-300 md:translate-x-0 shadow-sm"
             [class.-translate-x-full]="!sidebarOpen"
             [class.translate-x-0]="sidebarOpen">
        <!-- Logo -->
        <div class="p-5 border-b border-vpb-grey-200 shrink-0">
          <div class="flex items-center gap-3">
            <div class="w-10 h-10 bg-vpb-green-500 rounded-xl flex items-center justify-center shadow-sm">
              <svg class="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 3v2m6-2v2M9 19v2m6-2v2M5 9H3m2 6H3m18-6h-2m2 6h-2M7 19h10a2 2 0 002-2V7a2 2 0 00-2-2H7a2 2 0 00-2 2v10a2 2 0 002 2zM9 9h6v6H9V9z"/>
              </svg>
            </div>
            <div>
              <h1 class="font-bold text-vpb-dark-700 text-lg leading-tight">VPBank IoT</h1>
              <p class="text-xs text-vpb-green-600 font-medium">Monitoring System</p>
            </div>
          </div>
        </div>

        <!-- Navigation -->
        <nav class="flex-1 p-3 space-y-1 overflow-y-auto">
          <a routerLink="/dashboard" routerLinkActive="active" class="sidebar-link" (click)="closeMobile()">
            <svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zm10 0a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zm10 0a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z"/></svg>
            <span>{{ 'NAV.DASHBOARD' | translate }}</span>
          </a>
          <a routerLink="/devices" routerLinkActive="active" class="sidebar-link" (click)="closeMobile()">
            <svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 3v2m6-2v2M9 19v2m6-2v2M5 9H3m2 6H3m18-6h-2m2 6h-2M7 19h10a2 2 0 002-2V7a2 2 0 00-2-2H7a2 2 0 00-2 2v10a2 2 0 002 2zM9 9h6v6H9V9z"/></svg>
            <span>{{ 'NAV.DEVICES' | translate }}</span>
          </a>
          <a routerLink="/alarms" routerLinkActive="active" class="sidebar-link" (click)="closeMobile()">
            <svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"/></svg>
            <span>{{ 'NAV.ALARMS' | translate }}</span>
            @if (activeAlarmCount > 0) {
              <span class="ml-auto bg-red-500 text-white text-xs px-2 py-0.5 rounded-full animate-pulse">{{ activeAlarmCount }}</span>
            }
          </a>
          <a routerLink="/reports" routerLinkActive="active" class="sidebar-link" (click)="closeMobile()">
            <svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/></svg>
            <span>{{ 'NAV.REPORTS' | translate }}</span>
          </a>
          @if (auth.isAdmin()) {
            <a routerLink="/users" routerLinkActive="active" class="sidebar-link" (click)="closeMobile()">
              <svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z"/></svg>
              <span>Người dùng</span>
            </a>
          }
        </nav>

        <!-- User section -->
        <div class="p-3 border-t border-vpb-grey-200 shrink-0">
          <div class="flex items-center gap-3 px-3 py-2">
            <div class="w-8 h-8 bg-vpb-green-500 rounded-full flex items-center justify-center text-white font-medium text-sm">
              {{ auth.currentUser()?.fullName?.charAt(0) || 'U' }}
            </div>
            <div class="flex-1 min-w-0">
              <p class="text-sm font-medium text-vpb-dark-700 truncate">{{ auth.currentUser()?.fullName }}</p>
              <p class="text-xs text-vpb-grey-600">{{ auth.currentUser()?.role }}</p>
            </div>
            <button (click)="auth.logout()" class="text-vpb-grey-500 hover:text-red-500 transition-colors" [title]="'NAV.LOGOUT' | translate">
              <svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"/></svg>
            </button>
          </div>
        </div>
      </aside>

      <!-- Main Content (offset by sidebar width on desktop) -->
      <div class="md:ml-64 min-h-screen flex flex-col">
        <!-- Top Bar — sticky so it stays on top when scrolling -->
        <header class="sticky top-0 z-30 h-14 bg-white border-b border-vpb-grey-200 flex items-center justify-between px-4 md:px-6 shrink-0 shadow-sm">
          <div class="flex items-center gap-3">
            <!-- Hamburger (mobile) -->
            <button (click)="sidebarOpen = !sidebarOpen" class="md:hidden text-vpb-grey-600 hover:text-vpb-dark-700 p-1">
              <svg class="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 12h16M4 18h16"/>
              </svg>
            </button>
            <span class="pulse-dot" [class.online]="signalR.isConnected()" [class.offline]="!signalR.isConnected()"></span>
            <span class="text-sm hidden sm:inline font-medium"
              [class.text-vpb-green-600]="signalR.isConnected()"
              [class.text-red-500]="!signalR.isConnected()">
              {{ signalR.isConnected() ? ('COMMON.CONNECTED' | translate) : ('COMMON.DISCONNECTED' | translate) }}
            </span>
          </div>

          <div class="flex items-center gap-2 sm:gap-4">
            <!-- Language Toggle -->
            <div class="flex bg-vpb-grey-100 rounded-lg p-0.5">
              <button (click)="switchLang('en')" class="tab-btn text-xs"
                [class.active]="currentLang === 'en'">EN</button>
              <button (click)="switchLang('vi')" class="tab-btn text-xs"
                [class.active]="currentLang === 'vi'">VI</button>
            </div>

            <!-- Time -->
            <span class="text-sm text-vpb-grey-600 font-mono hidden sm:inline">{{ currentTime }}</span>
          </div>
        </header>

        <!-- Page Content — scrollable area -->
        <main class="flex-1 p-4 md:p-6">
          <router-outlet />
        </main>
      </div>
    </div>
  `
})
export class LayoutComponent implements OnInit, OnDestroy {
  sidebarOpen = false;
  currentLang = 'vi';
  currentTime = '';
  activeAlarmCount = 0;
  private timer: any;
  private routeSub: any;

  constructor(
    public auth: AuthService,
    public signalR: SignalRService,
    private translate: TranslateService,
    private router: Router
  ) {
    this.translate.setDefaultLang('vi');
    this.translate.use(localStorage.getItem('lang') || 'vi');
    this.currentLang = this.translate.currentLang;
  }

  async ngOnInit() {
    await this.signalR.start();
    this.updateTime();
    this.timer = setInterval(() => this.updateTime(), 1000);

    // Close sidebar on route change (mobile)
    this.routeSub = this.router.events
      .pipe(filter(e => e instanceof NavigationEnd))
      .subscribe(() => this.sidebarOpen = false);
  }

  ngOnDestroy() {
    clearInterval(this.timer);
    this.signalR.stop();
    this.routeSub?.unsubscribe();
  }

  switchLang(lang: string) {
    this.currentLang = lang;
    this.translate.use(lang);
    localStorage.setItem('lang', lang);
  }

  closeMobile() {
    if (window.innerWidth < 768) this.sidebarOpen = false;
  }

  private updateTime() {
    this.currentTime = new Date().toLocaleTimeString('en-GB');
  }
}
