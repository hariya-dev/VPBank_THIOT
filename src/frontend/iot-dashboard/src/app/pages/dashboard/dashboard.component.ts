import { Component, OnInit, OnDestroy, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TranslateModule } from '@ngx-translate/core';
import { RouterLink } from '@angular/router';
import { ApiService } from '../../core/services/api.service';
import { SignalRService, TelemetryData } from '../../core/services/signalr.service';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, FormsModule, TranslateModule, RouterLink],
  template: `
    <div class="space-y-5 animate-fade-in">
      <!-- Header -->
      <div class="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div>
          <h2 class="text-xl md:text-2xl font-bold text-vpb-dark-700">{{ 'DASHBOARD.TITLE' | translate }}</h2>
          <p class="text-sm text-vpb-grey-500 mt-0.5">{{ 'DASHBOARD.OVERVIEW' | translate }}</p>
        </div>
        <div class="flex items-center gap-3">
          <div class="flex items-center gap-2 text-xs text-vpb-grey-500">
            <svg class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
            {{ lastUpdate || '--:--:--' }}
          </div>
          <button (click)="refreshAll()" class="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-vpb-green-600 bg-vpb-green-50 hover:bg-vpb-green-100 rounded-lg transition-all duration-200 active:scale-95">
            <svg class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"/></svg>
            Refresh
          </button>
        </div>
      </div>

      <!-- KPI Cards — Clickable filters -->
      <div class="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">

        <!-- Total Devices -->
        <button (click)="setFilter('all')" class="kpi-card group text-left" [class.kpi-active]="activeFilter === 'all'">
          <div class="kpi-icon-wrap bg-gradient-to-br from-blue-500 to-indigo-600">
            <svg class="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 3v2m6-2v2M9 19v2m6-2v2M5 9H3m2 6H3m18-6h-2m2 6h-2M7 19h10a2 2 0 002-2V7a2 2 0 00-2-2H7a2 2 0 00-2 2v10a2 2 0 002 2zM9 9h6v6H9V9z"/></svg>
          </div>
          <div class="mt-3">
            <p class="text-2xl md:text-3xl font-extrabold text-vpb-dark-700">{{ totalDevices }}</p>
            <p class="text-xs text-vpb-grey-500 mt-0.5 font-medium">{{ 'DASHBOARD.TOTAL_DEVICES' | translate }}</p>
          </div>
          <div class="kpi-bar mt-3">
            <div class="kpi-bar-fill bg-gradient-to-r from-blue-400 to-indigo-500" style="width: 100%"></div>
          </div>
        </button>

        <!-- Online -->
        <button (click)="setFilter('online')" class="kpi-card group text-left" [class.kpi-active]="activeFilter === 'online'">
          <div class="kpi-icon-wrap bg-gradient-to-br from-emerald-400 to-green-600">
            <svg class="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
          </div>
          <div class="mt-3">
            <p class="text-2xl md:text-3xl font-extrabold text-emerald-600">{{ onlineCount }}</p>
            <p class="text-xs text-vpb-grey-500 mt-0.5 font-medium">{{ 'DASHBOARD.ONLINE' | translate }}</p>
          </div>
          <div class="kpi-bar mt-3">
            <div class="kpi-bar-fill bg-gradient-to-r from-emerald-400 to-green-500 transition-all duration-700" [style.width.%]="onlinePercent"></div>
          </div>
          <span class="kpi-badge bg-emerald-50 text-emerald-700">{{ onlinePercent | number:'1.0-0' }}%</span>
        </button>

        <!-- Offline -->
        <button (click)="setFilter('offline')" class="kpi-card group text-left" [class.kpi-active]="activeFilter === 'offline'">
          <div class="kpi-icon-wrap bg-gradient-to-br from-rose-400 to-red-600">
            <svg class="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
          </div>
          <div class="mt-3">
            <p class="text-2xl md:text-3xl font-extrabold text-rose-600">{{ offlineCount }}</p>
            <p class="text-xs text-vpb-grey-500 mt-0.5 font-medium">{{ 'DASHBOARD.OFFLINE' | translate }}</p>
          </div>
          <div class="kpi-bar mt-3">
            <div class="kpi-bar-fill bg-gradient-to-r from-rose-400 to-red-500 transition-all duration-700" [style.width.%]="totalDevices > 0 ? (offlineCount / totalDevices * 100) : 0"></div>
          </div>
          <span class="kpi-badge bg-rose-50 text-rose-700">{{ totalDevices > 0 ? (offlineCount / totalDevices * 100 | number:'1.0-0') : 0 }}%</span>
        </button>

        <!-- Active Alarms -->
        <button (click)="setFilter('alarm')" class="kpi-card group text-left" [class.kpi-active]="activeFilter === 'alarm'"
                [class.kpi-alert]="activeAlarms > 0">
          <div class="kpi-icon-wrap" [ngClass]="activeAlarms > 0 ? 'bg-gradient-to-br from-amber-400 to-orange-600 animate-pulse' : 'bg-gradient-to-br from-slate-400 to-slate-600'">
            <svg class="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"/></svg>
          </div>
          <div class="mt-3">
            <p class="text-2xl md:text-3xl font-extrabold" [class.text-amber-600]="activeAlarms > 0" [class.text-slate-400]="activeAlarms === 0">{{ activeAlarms }}</p>
            <p class="text-xs text-vpb-grey-500 mt-0.5 font-medium">{{ 'DASHBOARD.ACTIVE_ALARMS' | translate }}</p>
          </div>
          <span class="kpi-badge" [ngClass]="activeAlarms > 0 ? 'bg-amber-50 text-amber-700' : 'bg-slate-50 text-slate-500'">
            {{ activeAlarms > 0 ? ('DASHBOARD.NEEDS_ATTENTION' | translate) : ('DASHBOARD.ALL_CLEAR' | translate) }}
          </span>
        </button>
      </div>

      <!-- Live Telemetry Table -->
      <div class="bg-white rounded-xl border border-vpb-grey-200 shadow-sm overflow-hidden">
        <!-- Table Header -->
        <div class="px-4 md:px-5 py-3.5 border-b border-vpb-grey-100 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 bg-gradient-to-r from-white to-vpb-grey-50">
          <div class="flex items-center gap-3">
            <h3 class="font-semibold text-vpb-dark-700 flex items-center gap-2 text-sm">
              <span class="pulse-dot online"></span>
              Live Telemetry
            </h3>
            <!-- Active Filter Badge -->
            @if (activeFilter !== 'all') {
              <button (click)="setFilter('all')" class="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-vpb-green-50 text-vpb-green-700 hover:bg-vpb-green-100 transition-colors">
                {{ activeFilter === 'online' ? 'Online' : activeFilter === 'offline' ? 'Offline' : 'Có cảnh báo' }}
                <svg class="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/></svg>
              </button>
            }
          </div>
          <div class="flex items-center gap-2 w-full sm:w-auto">
            <div class="relative flex-1 sm:flex-initial">
              <svg class="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-vpb-grey-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/></svg>
              <input [(ngModel)]="searchTerm" (ngModelChange)="filterTelemetry()" type="text"
                     class="w-full sm:w-48 pl-8 pr-3 py-1.5 text-xs rounded-lg border border-vpb-grey-200 bg-white focus:ring-2 focus:ring-vpb-green-500/20 focus:border-vpb-green-400 outline-none transition-all"
                     placeholder="Tìm gateway..." />
            </div>
            <span class="shrink-0 text-[11px] font-semibold px-2.5 py-1 rounded-full"
                  [ngClass]="activeFilter === 'offline' ? 'bg-rose-50 text-rose-600' : 'bg-emerald-50 text-emerald-600'">
              {{ filteredTelemetry.length }} {{ activeFilter === 'offline' ? 'offline' : activeFilter === 'online' ? 'online' : 'thiết bị' }}
            </span>
          </div>
        </div>

        <!-- Table Body -->
        <div class="overflow-x-auto" style="max-height: 520px">
          <table class="w-full">
            <thead class="bg-vpb-grey-50/80 sticky top-0 z-10">
              <tr>
                <th class="px-4 py-2.5 text-left text-[11px] font-semibold text-vpb-grey-500 uppercase tracking-wider">Gateway</th>
                <th class="px-4 py-2.5 text-left text-[11px] font-semibold text-vpb-grey-500 uppercase tracking-wider">🌡️ {{ 'DASHBOARD.TEMPERATURE' | translate }}</th>
                <th class="px-4 py-2.5 text-left text-[11px] font-semibold text-vpb-grey-500 uppercase tracking-wider">💧 {{ 'DASHBOARD.HUMIDITY' | translate }}</th>
                <th class="px-4 py-2.5 text-left text-[11px] font-semibold text-vpb-grey-500 uppercase tracking-wider">{{ 'DASHBOARD.STATUS' | translate }}</th>
                <th class="px-4 py-2.5 text-left text-[11px] font-semibold text-vpb-grey-500 uppercase tracking-wider">{{ 'DASHBOARD.LAST_SEEN' | translate }}</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-vpb-grey-100">
              @for (item of filteredTelemetry; track item.gatewayId) {
                <tr class="hover:bg-vpb-green-50/40 transition-colors duration-150">
                  <td class="px-4 py-2.5">
                    <span class="font-mono text-xs font-semibold text-vpb-dark-700">{{ item.gatewayId }}</span>
                  </td>
                  <td class="px-4 py-2.5">
                    <div class="flex items-center gap-1.5" [class.alarm-blink]="item.temperature > 35 || item.temperature < 10">
                      <div class="w-1.5 h-1.5 rounded-full shrink-0" [ngClass]="item.temperature > 35 ? 'bg-red-500' : item.temperature < 10 ? 'bg-sky-500' : 'bg-emerald-500'"></div>
                      <span class="text-sm font-semibold tabular-nums" [ngClass]="item.temperature > 35 ? 'text-red-600' : item.temperature < 10 ? 'text-sky-600' : 'text-vpb-dark-700'">
                        {{ item.temperature !== null ? (item.temperature | number:'1.1-1') : '--' }}
                      </span>
                      <span class="text-[10px] text-vpb-grey-400">°C</span>
                    </div>
                  </td>
                  <td class="px-4 py-2.5">
                    <div class="flex items-center gap-1.5" [class.alarm-blink]="item.humidity > 80 || item.humidity < 30">
                      <div class="w-1.5 h-1.5 rounded-full shrink-0" [ngClass]="(item.humidity > 80 || item.humidity < 30) ? 'bg-amber-500' : 'bg-emerald-500'"></div>
                      <span class="text-sm font-semibold tabular-nums" [ngClass]="(item.humidity > 80 || item.humidity < 30) ? 'text-amber-600' : 'text-vpb-dark-700'">
                        {{ item.humidity !== null ? (item.humidity | number:'1.1-1') : '--' }}
                      </span>
                      <span class="text-[10px] text-vpb-grey-400">%</span>
                    </div>
                  </td>
                  <td class="px-4 py-2.5">
                    <span class="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold"
                          [ngClass]="item.isOnline ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-600'">
                      <span class="w-1.5 h-1.5 rounded-full" [ngClass]="item.isOnline ? 'bg-emerald-500 animate-pulse' : 'bg-rose-400'"></span>
                      {{ item.isOnline ? 'Online' : 'Offline' }}
                    </span>
                  </td>
                  <td class="px-4 py-2.5 text-xs text-vpb-grey-500 tabular-nums">{{ formatTimestamp(item.lastSeen) }}</td>
                </tr>
              } @empty {
                <tr>
                  <td colspan="5" class="px-4 py-16 text-center">
                    <div class="flex flex-col items-center gap-2">
                      <svg class="w-10 h-10 text-vpb-grey-300" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
                      <p class="text-sm text-vpb-grey-400 font-medium">{{ 'DASHBOARD.NO_DATA' | translate }}</p>
                    </div>
                  </td>
                </tr>
              }
            </tbody>
          </table>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .kpi-card {
      position: relative;
      display: block;
      padding: 1rem 1.25rem;
      background: white;
      border: 1.5px solid #e8ecf0;
      border-radius: 1rem;
      transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1);
      cursor: pointer;
      overflow: hidden;
    }
    .kpi-card::before {
      content: '';
      position: absolute;
      inset: 0;
      background: linear-gradient(135deg, transparent 60%, rgba(0,166,81,0.03));
      pointer-events: none;
    }
    .kpi-card:hover {
      border-color: #00A651;
      box-shadow: 0 4px 20px rgba(0,166,81,0.08), 0 1px 3px rgba(0,0,0,0.06);
      transform: translateY(-2px);
    }
    .kpi-card:active { transform: translateY(0); }
    .kpi-active {
      border-color: #00A651 !important;
      box-shadow: 0 0 0 3px rgba(0,166,81,0.12), 0 4px 20px rgba(0,166,81,0.1) !important;
      background: linear-gradient(135deg, #f0fdf4, #ffffff) !important;
    }
    .kpi-alert {
      border-color: #f59e0b !important;
    }
    .kpi-alert.kpi-active {
      border-color: #f59e0b !important;
      box-shadow: 0 0 0 3px rgba(245,158,11,0.15), 0 4px 20px rgba(245,158,11,0.1) !important;
      background: linear-gradient(135deg, #fffbeb, #ffffff) !important;
    }
    .kpi-icon-wrap {
      width: 2.5rem;
      height: 2.5rem;
      border-radius: 0.75rem;
      display: flex;
      align-items: center;
      justify-content: center;
      box-shadow: 0 2px 8px rgba(0,0,0,0.15);
    }
    .kpi-bar {
      height: 4px;
      background: #f1f3f5;
      border-radius: 2px;
      overflow: hidden;
    }
    .kpi-bar-fill {
      height: 100%;
      border-radius: 2px;
      transition: width 0.7s ease;
    }
    .kpi-badge {
      position: absolute;
      top: 0.75rem;
      right: 0.75rem;
      font-size: 10px;
      font-weight: 700;
      padding: 2px 8px;
      border-radius: 999px;
    }
    :host ::ng-deep .alarm-blink {
      animation: alarmBlink 1s ease-in-out infinite;
    }
    @keyframes alarmBlink {
      0%, 100% { opacity: 1; }
      50% { opacity: 0.3; background-color: rgba(239, 68, 68, 0.1); border-radius: 4px; }
    }
  `]
})
export class DashboardComponent implements OnInit, OnDestroy {
  totalDevices = 0;
  onlineCount = 0;
  offlineCount = 0;
  onlinePercent = 0;
  activeAlarms = 0;
  alarmGatewayIds: Set<string> = new Set();
  telemetryList: any[] = [];
  filteredTelemetry: any[] = [];
  searchTerm = '';
  lastUpdate = '';
  activeFilter: 'all' | 'online' | 'offline' | 'alarm' = 'all';
  private refreshInterval: any;

  constructor(
    private api: ApiService,
    private signalR: SignalRService
  ) {
    effect(() => {
      const latest = this.signalR.latestTelemetry();
      if (latest) {
        this.updateTelemetryList(latest);
        this.lastUpdate = new Date().toLocaleTimeString('en-GB');
      }
    });
  }

  ngOnInit() {
    this.refreshAll();
    this.refreshInterval = setInterval(() => {
      this.loadDashboard();
      this.loadActiveAlarms();
    }, 30000);
  }

  ngOnDestroy() {
    clearInterval(this.refreshInterval);
  }

  setFilter(filter: 'all' | 'online' | 'offline' | 'alarm') {
    this.activeFilter = this.activeFilter === filter ? 'all' : filter;
    this.filterTelemetry();
  }

  refreshAll() {
    this.loadDashboard();
    this.loadLiveTelemetry();
    this.loadActiveAlarms();
  }

  loadDashboard() {
    this.api.getDashboard().subscribe(data => {
      this.totalDevices = data.totalDevices;
      this.onlineCount = data.onlineCount;
      this.offlineCount = data.offlineCount;
      this.onlinePercent = this.totalDevices > 0 ? (this.onlineCount / this.totalDevices * 100) : 0;
    });
  }

  loadLiveTelemetry() {
    this.api.getLiveTelemetry().subscribe(data => {
      this.telemetryList = data;
      this.filterTelemetry();
      this.lastUpdate = new Date().toLocaleTimeString('en-GB');
    });
  }

  loadActiveAlarms() {
    this.api.getActiveAlarms().subscribe(data => {
      this.activeAlarms = data.length;
      this.alarmGatewayIds = new Set(data.map((a: any) => a.device?.gatewayIdentify || a.gatewayId || '').filter((id: string) => id));
      // If alarm filter is active, re-filter
      if (this.activeFilter === 'alarm') this.filterTelemetry();
    });
  }

  filterTelemetry() {
    let list = this.telemetryList;

    // Apply status filter
    if (this.activeFilter === 'online') {
      list = list.filter(t => t.isOnline);
    } else if (this.activeFilter === 'offline') {
      list = list.filter(t => !t.isOnline);
    } else if (this.activeFilter === 'alarm') {
      list = list.filter(t => this.alarmGatewayIds.has(t.gatewayId));
    }

    // Apply search
    if (this.searchTerm) {
      const term = this.searchTerm.toLowerCase();
      list = list.filter(t => t.gatewayId.toLowerCase().includes(term));
    }

    this.filteredTelemetry = list;
  }

  updateTelemetryList(latest: TelemetryData) {
    const idx = this.telemetryList.findIndex(t => t.gatewayId === latest.gatewayId);
    const entry = {
      gatewayId: latest.gatewayId,
      temperature: latest.temperature,
      humidity: latest.humidity,
      lastSeen: latest.timestamp,
      isOnline: true
    };
    if (idx >= 0) {
      this.telemetryList[idx] = entry;
    } else {
      this.telemetryList = [entry, ...this.telemetryList];
    }
    this.filterTelemetry();
  }

  formatTimestamp(ts: number): string {
    if (!ts) return '--';
    const diff = Math.floor(Date.now() / 1000 - ts);
    if (diff < 60) return `${diff}s trước`;
    if (diff < 3600) return `${Math.floor(diff / 60)}m trước`;
    return new Date(ts * 1000).toLocaleTimeString('en-GB');
  }
}
