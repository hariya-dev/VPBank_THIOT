import { Component, OnInit, OnDestroy, effect, ViewChild, ElementRef, AfterViewInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TranslateModule } from '@ngx-translate/core';
import { ApiService } from '../../core/services/api.service';
import { SignalRService, TelemetryData } from '../../core/services/signalr.service';

declare var Chart: any;

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, FormsModule, TranslateModule],
  template: `
    <div class="space-y-6 animate-fade-in">
      <!-- Header -->
      <div class="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
        <div>
          <h2 class="text-2xl font-bold">{{ 'DASHBOARD.TITLE' | translate }}</h2>
          <p class="text-sm text-dashboard-muted mt-0.5">{{ 'DASHBOARD.OVERVIEW' | translate }}</p>
        </div>
        <div class="flex items-center gap-3">
          <span class="text-xs text-dashboard-muted">{{ lastUpdate }}</span>
          <button (click)="refreshAll()" class="btn-ghost text-xs px-3 py-1.5">
            <svg class="w-4 h-4 inline mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"/></svg>
            Refresh
          </button>
        </div>
      </div>

      <!-- KPI Cards -->
      <div class="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
        <!-- Total Devices -->
        <div class="card group">
          <div class="flex items-center justify-between mb-3">
            <span class="stat-label text-xs">{{ 'DASHBOARD.TOTAL_DEVICES' | translate }}</span>
            <div class="w-9 h-9 bg-vpb-green-50 rounded-lg flex items-center justify-center group-hover:bg-vpb-green-100 transition-colors">
              <svg class="w-5 h-5 text-vpb-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 3v2m6-2v2M9 19v2m6-2v2M5 9H3m2 6H3m18-6h-2m2 6h-2M7 19h10a2 2 0 002-2V7a2 2 0 00-2-2H7a2 2 0 00-2 2v10a2 2 0 002 2zM9 9h6v6H9V9z"/></svg>
            </div>
          </div>
          <p class="text-2xl font-bold text-vpb-dark-700">{{ totalDevices }}</p>
          <p class="text-xs text-dashboard-muted mt-1">{{ 'DASHBOARD.REGISTERED' | translate }}</p>
        </div>

        <!-- Online -->
        <div class="card group">
          <div class="flex items-center justify-between mb-3">
            <span class="stat-label text-xs">{{ 'DASHBOARD.ONLINE' | translate }}</span>
            <div class="w-9 h-9 bg-vpb-green-50 rounded-lg flex items-center justify-center group-hover:bg-vpb-green-100 transition-colors">
              <svg class="w-5 h-5 text-vpb-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"/></svg>
            </div>
          </div>
          <p class="text-2xl font-bold text-vpb-green-500">{{ onlineCount }}</p>
          <div class="mt-2 w-full bg-vpb-grey-200 rounded-full h-1.5">
            <div class="bg-vpb-green-500 h-1.5 rounded-full transition-all duration-700" [style.width.%]="onlinePercent"></div>
          </div>
          <p class="text-xs text-dashboard-muted mt-1">{{ onlinePercent | number:'1.0-0' }}%</p>
        </div>

        <!-- Offline -->
        <div class="card group">
          <div class="flex items-center justify-between mb-3">
            <span class="stat-label text-xs">{{ 'DASHBOARD.OFFLINE' | translate }}</span>
            <div class="w-9 h-9 bg-red-50 rounded-lg flex items-center justify-center group-hover:bg-red-100 transition-colors">
              <svg class="w-5 h-5 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/></svg>
            </div>
          </div>
          <p class="text-2xl font-bold text-red-500">{{ offlineCount }}</p>
          <p class="text-xs text-dashboard-muted mt-1">{{ totalDevices > 0 ? (offlineCount / totalDevices * 100 | number:'1.0-0') : 0 }}%</p>
        </div>

        <!-- Active Alarms -->
        <div class="card group" [class.border-red-400]="activeAlarms > 0" [class.animate-pulse]="activeAlarms > 5">
          <div class="flex items-center justify-between mb-3">
            <span class="stat-label text-xs">{{ 'DASHBOARD.ACTIVE_ALARMS' | translate }}</span>
            <div class="w-9 h-9 rounded-lg flex items-center justify-center transition-colors" [ngClass]="activeAlarms > 0 ? 'bg-red-50' : 'bg-vpb-green-50'">
              <svg class="w-5 h-5" [class.text-red-500]="activeAlarms > 0" [class.text-vpb-green-500]="activeAlarms === 0" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"/></svg>
            </div>
          </div>
          <p class="text-2xl font-bold" [class.text-red-500]="activeAlarms > 0" [class.text-vpb-green-500]="activeAlarms === 0">{{ activeAlarms }}</p>
          <p class="text-xs text-dashboard-muted mt-1">{{ activeAlarms > 0 ? ('DASHBOARD.NEEDS_ATTENTION' | translate) : ('DASHBOARD.ALL_CLEAR' | translate) }}</p>
        </div>
      </div>

      <!-- Charts Row -->
      <div class="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <!-- Temperature Chart -->
        <div class="card">
          <div class="flex items-center justify-between mb-4">
            <h3 class="font-semibold flex items-center gap-2">
              <svg class="w-5 h-5 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"/></svg>
              {{ 'DASHBOARD.TEMPERATURE' | translate }} (°C)
            </h3>
            <span class="badge-info">Real-time</span>
          </div>
          <div class="h-48 md:h-56">
            <canvas #tempChart></canvas>
          </div>
        </div>

        <!-- Humidity Chart -->
        <div class="card">
          <div class="flex items-center justify-between mb-4">
            <h3 class="font-semibold flex items-center gap-2">
              <svg class="w-5 h-5 text-sky-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 15a4 4 0 004 4h9a5 5 0 10-.1-9.999 5.002 5.002 0 10-9.78 2.096A4.001 4.001 0 003 15z"/></svg>
              {{ 'DASHBOARD.HUMIDITY' | translate }} (%)
            </h3>
            <span class="badge-info">Real-time</span>
          </div>
          <div class="h-48 md:h-56">
            <canvas #humiChart></canvas>
          </div>
        </div>
      </div>

      <!-- Live Telemetry Table -->
      <div class="card !p-0 overflow-hidden">
        <div class="px-4 md:px-5 py-4 border-b border-dashboard-border flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
          <h3 class="font-semibold flex items-center gap-2">
            <span class="pulse-dot online"></span>
            Live Telemetry
          </h3>
          <div class="flex items-center gap-3 w-full sm:w-auto">
            <input [(ngModel)]="searchTerm" (ngModelChange)="filterTelemetry()" type="text" class="input-field text-xs py-1.5 px-3 w-full sm:w-48" placeholder="Search gateway..." />
            <span class="badge-online shrink-0">{{ filteredTelemetry.length }} online</span>
          </div>
        </div>
        <div class="overflow-x-auto max-h-96">
          <table class="w-full">
            <thead class="bg-vpb-grey-50 sticky top-0">
              <tr>
                <th class="table-header">Gateway</th>
                <th class="table-header">{{ 'DASHBOARD.TEMPERATURE' | translate }}</th>
                <th class="table-header">{{ 'DASHBOARD.HUMIDITY' | translate }}</th>
                <th class="table-header">{{ 'DASHBOARD.STATUS' | translate }}</th>
                <th class="table-header">{{ 'DASHBOARD.LAST_SEEN' | translate }}</th>
              </tr>
            </thead>
            <tbody>
              @for (item of filteredTelemetry; track item.gatewayId) {
                <tr class="table-row animate-fade-in">
                  <td class="table-cell font-mono text-vpb-green-600 text-xs">{{ item.gatewayId }}</td>
                  <td class="table-cell">
                    <span class="font-semibold" [class.text-red-500]="item.temperature > 35"
                          [class.text-sky-600]="item.temperature < 10"
                          [class.text-vpb-dark-700]="item.temperature >= 10 && item.temperature <= 35">
                      {{ item.temperature !== null ? (item.temperature | number:'1.1-1') + '°C' : '--' }}
                    </span>
                  </td>
                  <td class="table-cell">
                    <span class="font-semibold" [class.text-amber-600]="item.humidity > 80 || item.humidity < 30"
                          [class.text-vpb-dark-700]="item.humidity >= 30 && item.humidity <= 80">
                      {{ item.humidity !== null ? (item.humidity | number:'1.1-1') + '%' : '--' }}
                    </span>
                  </td>
                  <td class="table-cell">
                    <span [class]="item.isOnline ? 'badge-online' : 'badge-offline'">
                      <span class="pulse-dot" [class.online]="item.isOnline" [class.offline]="!item.isOnline"></span>
                      {{ item.isOnline ? 'Online' : 'Offline' }}
                    </span>
                  </td>
                  <td class="table-cell text-dashboard-muted text-xs">{{ formatTimestamp(item.lastSeen) }}</td>
                </tr>
              } @empty {
                <tr>
                  <td colspan="5" class="table-cell text-center text-dashboard-muted py-12">
                    {{ 'DASHBOARD.NO_DATA' | translate }}
                  </td>
                </tr>
              }
            </tbody>
          </table>
        </div>
      </div>
    </div>
  `
})
export class DashboardComponent implements OnInit, OnDestroy, AfterViewInit {
  @ViewChild('tempChart') tempChartRef!: ElementRef<HTMLCanvasElement>;
  @ViewChild('humiChart') humiChartRef!: ElementRef<HTMLCanvasElement>;

  totalDevices = 0;
  onlineCount = 0;
  offlineCount = 0;
  onlinePercent = 0;
  activeAlarms = 0;
  telemetryList: any[] = [];
  filteredTelemetry: any[] = [];
  searchTerm = '';
  lastUpdate = '';
  private refreshInterval: any;
  private tempChart: any;
  private humiChart: any;
  private chartLabels: string[] = [];
  private tempData: number[] = [];
  private humiData: number[] = [];
  private maxChartPoints = 30;

  constructor(
    private api: ApiService,
    private signalR: SignalRService
  ) {
    effect(() => {
      const latest = this.signalR.latestTelemetry();
      if (latest) {
        this.updateTelemetryList(latest);
        this.updateCharts(latest);
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

  ngAfterViewInit() {
    setTimeout(() => this.initCharts(), 500);
  }

  ngOnDestroy() {
    clearInterval(this.refreshInterval);
    this.tempChart?.destroy();
    this.humiChart?.destroy();
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
    });
  }

  filterTelemetry() {
    if (!this.searchTerm) {
      this.filteredTelemetry = this.telemetryList;
    } else {
      const term = this.searchTerm.toLowerCase();
      this.filteredTelemetry = this.telemetryList.filter(t => t.gatewayId.toLowerCase().includes(term));
    }
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

  updateCharts(data: TelemetryData) {
    if (!this.tempChart || !this.humiChart) return;
    const label = new Date().toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', second: '2-digit' });

    this.chartLabels.push(label);
    this.tempData.push(data.temperature ?? 0);
    this.humiData.push(data.humidity ?? 0);

    if (this.chartLabels.length > this.maxChartPoints) {
      this.chartLabels.shift();
      this.tempData.shift();
      this.humiData.shift();
    }

    this.tempChart.data.labels = [...this.chartLabels];
    this.tempChart.data.datasets[0].data = [...this.tempData];
    this.tempChart.update('none');

    this.humiChart.data.labels = [...this.chartLabels];
    this.humiChart.data.datasets[0].data = [...this.humiData];
    this.humiChart.update('none');
  }

  private initCharts() {
    if (typeof Chart === 'undefined') return;

    const chartDefaults = {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false },
      },
      scales: {
        x: {
          grid: { color: 'rgba(0,0,0,0.06)', drawBorder: false },
          ticks: { color: '#5E6D7F', font: { size: 10 }, maxTicksLimit: 8 },
        },
        y: {
          grid: { color: 'rgba(0,0,0,0.06)', drawBorder: false },
          ticks: { color: '#5E6D7F', font: { size: 10 } },
        }
      },
      elements: { point: { radius: 2, hoverRadius: 5 }, line: { tension: 0.4 } },
      interaction: { intersect: false, mode: 'index' as const },
    };

    this.tempChart = new Chart(this.tempChartRef.nativeElement, {
      type: 'line',
      data: {
        labels: [],
        datasets: [{
          label: 'Temperature (°C)',
          data: [],
          borderColor: '#E31B23',
          backgroundColor: 'rgba(227,27,35,0.1)',
          borderWidth: 2,
          fill: true,
        }]
      },
      options: { ...chartDefaults, scales: { ...chartDefaults.scales, y: { ...chartDefaults.scales.y, suggestedMin: 15, suggestedMax: 40 } } }
    });

    this.humiChart = new Chart(this.humiChartRef.nativeElement, {
      type: 'line',
      data: {
        labels: [],
        datasets: [{
          label: 'Humidity (%)',
          data: [],
          borderColor: '#00A651',
          backgroundColor: 'rgba(0,166,81,0.1)',
          borderWidth: 2,
          fill: true,
        }]
      },
      options: { ...chartDefaults, scales: { ...chartDefaults.scales, y: { ...chartDefaults.scales.y, suggestedMin: 20, suggestedMax: 90 } } }
    });
  }

  formatTimestamp(ts: number): string {
    if (!ts) return '--';
    const diff = Math.floor(Date.now() / 1000 - ts);
    if (diff < 60) return `${diff}s ago`;
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
    return new Date(ts * 1000).toLocaleTimeString('en-GB');
  }
}
