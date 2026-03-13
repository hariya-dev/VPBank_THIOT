import { Component, OnInit, OnDestroy, ViewChild, ElementRef, AfterViewInit, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { TranslateModule } from '@ngx-translate/core';
import { ApiService } from '../../core/services/api.service';
import { AuthService } from '../../core/services/auth.service';
import { SignalRService } from '../../core/services/signalr.service';

declare var Chart: any;

@Component({
  selector: 'app-device-detail',
  standalone: true,
  imports: [CommonModule, FormsModule, TranslateModule, RouterLink],
  template: `
    <div class="space-y-6 animate-fade-in" *ngIf="device">
      <!-- Breadcrumb -->
      <div class="flex items-center gap-2 text-sm">
        <a routerLink="/devices" class="text-dashboard-muted hover:text-primary-400 transition-colors">{{ 'DEVICES.TITLE' | translate }}</a>
        <svg class="w-4 h-4 text-dashboard-muted" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"/></svg>
        <span class="text-white font-medium">{{ device.name }}</span>
      </div>

      <!-- Header -->
      <div class="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div class="flex items-center gap-4">
          <div class="w-12 h-12 bg-gradient-to-br from-primary-500 to-primary-700 rounded-xl flex items-center justify-center shadow-lg shadow-primary-500/20">
            <svg class="w-7 h-7 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 3v2m6-2v2M9 19v2m6-2v2M5 9H3m2 6H3m18-6h-2m2 6h-2M7 19h10a2 2 0 002-2V7a2 2 0 00-2-2H7a2 2 0 00-2 2v10a2 2 0 002 2zM9 9h6v6H9V9z"/></svg>
          </div>
          <div>
            <h2 class="text-2xl font-bold text-white">{{ device.name }}</h2>
            <p class="text-sm text-primary-400 font-mono">{{ device.gatewayIdentify }}</p>
          </div>
        </div>
        <div class="flex items-center gap-3">
          <span [class]="device.status === 'Online' ? 'badge-online' : 'badge-offline'">
            <span class="pulse-dot" [class.online]="device.status === 'Online'" [class.offline]="device.status !== 'Online'"></span>
            {{ device.status }}
          </span>
          @if (auth.hasAnyRole('Admin', 'Operator')) {
            <button (click)="showEditModal = true" class="btn-secondary text-sm">{{ 'DEVICES.EDIT' | translate }}</button>
          }
          <a routerLink="/devices" class="btn-ghost text-sm">← {{ 'COMMON.BACK' | translate }}</a>
        </div>
      </div>

      <!-- Live Values Row -->
      <div class="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div class="card text-center">
          <p class="text-xs text-dashboard-muted mb-1 uppercase tracking-wider">{{ 'DASHBOARD.TEMPERATURE' | translate }}</p>
          <p class="text-3xl font-bold" [ngClass]="(liveTemp ?? 0) > 35 ? 'text-accent-400' : 'text-primary-400'">
            {{ liveTemp !== null ? (liveTemp | number:'1.1-1') + '°C' : '--' }}
          </p>
        </div>
        <div class="card text-center">
          <p class="text-xs text-dashboard-muted mb-1 uppercase tracking-wider">{{ 'DASHBOARD.HUMIDITY' | translate }}</p>
          <p class="text-3xl font-bold" [ngClass]="(liveHumi ?? 0) > 80 ? 'text-amber-400' : 'text-primary-400'">
            {{ liveHumi !== null ? (liveHumi | number:'1.1-1') + '%' : '--' }}
          </p>
        </div>
        <div class="card text-center">
          <p class="text-xs text-dashboard-muted mb-1 uppercase tracking-wider">{{ 'DEVICES.PROVINCE' | translate }}</p>
          <p class="text-lg font-semibold text-white">{{ device.province?.name || '--' }}</p>
        </div>
        <div class="card text-center">
          <p class="text-xs text-dashboard-muted mb-1 uppercase tracking-wider">MQTT Topic</p>
          <p class="text-xs font-mono text-primary-400 truncate">{{ device.mqttTopic }}</p>
        </div>
      </div>

      <!-- Tabs -->
      <div class="flex gap-1 bg-navy-700 rounded-lg p-0.5 w-fit">
        <button (click)="activeTab = 'chart'" class="tab-btn text-sm" [class.active]="activeTab === 'chart'">
          <svg class="w-4 h-4 inline mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"/></svg>
          Biểu đồ
        </button>
        <button (click)="activeTab = 'info'" class="tab-btn text-sm" [class.active]="activeTab === 'info'">
          <svg class="w-4 h-4 inline mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
          Thông tin
        </button>
        <button (click)="activeTab = 'settings'" class="tab-btn text-sm" [class.active]="activeTab === 'settings'">
          <svg class="w-4 h-4 inline mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.066 2.573c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.573 1.066c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.066-2.573c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"/><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/></svg>
          Cài đặt
        </button>
        <button (click)="activeTab = 'alarms'; loadAlarms()" class="tab-btn text-sm" [class.active]="activeTab === 'alarms'">
          <svg class="w-4 h-4 inline mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"/></svg>
          Cảnh báo
          @if (alarmCount > 0) {
            <span class="ml-1 bg-accent-500 text-white text-[10px] px-1.5 py-0.5 rounded-full">{{ alarmCount }}</span>
          }
        </button>
      </div>

      <!-- Chart Tab -->
      @if (activeTab === 'chart') {
        <div class="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <div class="card">
            <h3 class="font-semibold mb-3 flex items-center gap-2">
              <svg class="w-5 h-5 text-accent-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6"/></svg>
              {{ 'DASHBOARD.TEMPERATURE' | translate }} (°C)
              <span class="badge-info text-[10px] ml-auto">Real-time</span>
            </h3>
            <div class="h-56 md:h-64">
              <canvas #tempChart></canvas>
            </div>
          </div>
          <div class="card">
            <h3 class="font-semibold mb-3 flex items-center gap-2">
              <svg class="w-5 h-5 text-sky-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 15a4 4 0 004 4h9a5 5 0 10-.1-9.999 5.002 5.002 0 10-9.78 2.096A4.001 4.001 0 003 15z"/></svg>
              {{ 'DASHBOARD.HUMIDITY' | translate }} (%)
              <span class="badge-info text-[10px] ml-auto">Real-time</span>
            </h3>
            <div class="h-56 md:h-64">
              <canvas #humiChart></canvas>
            </div>
          </div>
        </div>
        <p class="text-xs text-dashboard-muted text-center">Dữ liệu real-time cập nhật tự động qua SignalR (tối đa {{ maxPoints }} điểm)</p>
      }

      <!-- Info Tab -->
      @if (activeTab === 'info') {
        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div class="card">
            <h3 class="font-semibold mb-4 text-sm uppercase tracking-wider text-dashboard-muted">Thông tin thiết bị</h3>
            <div class="space-y-3 text-sm">
              <div class="flex justify-between py-1 border-b border-dashboard-border/30"><span class="text-dashboard-muted">Tên</span><span class="font-medium">{{ device.name }}</span></div>
              <div class="flex justify-between py-1 border-b border-dashboard-border/30"><span class="text-dashboard-muted">Gateway ID</span><span class="font-mono text-primary-400">{{ device.gatewayIdentify }}</span></div>
              <div class="flex justify-between py-1 border-b border-dashboard-border/30"><span class="text-dashboard-muted">{{ 'DEVICES.PROVINCE' | translate }}</span><span>{{ device.province?.name || '--' }}</span></div>
              <div class="flex justify-between py-1 border-b border-dashboard-border/30"><span class="text-dashboard-muted">MQTT Topic</span><span class="font-mono text-xs text-primary-400">{{ device.mqttTopic }}</span></div>
              <div class="flex justify-between py-1 border-b border-dashboard-border/30"><span class="text-dashboard-muted">Latitude</span><span>{{ device.latitude | number:'1.6-6' }}</span></div>
              <div class="flex justify-between py-1"><span class="text-dashboard-muted">Longitude</span><span>{{ device.longitude | number:'1.6-6' }}</span></div>
            </div>
          </div>
          <div class="card">
            <h3 class="font-semibold mb-4 text-sm uppercase tracking-wider text-dashboard-muted">Xuất dữ liệu</h3>
            <p class="text-sm text-dashboard-muted mb-4">Xuất dữ liệu cảm biến của thiết bị trong khoảng thời gian.</p>
            <div class="grid grid-cols-2 gap-3 mb-4">
              <div>
                <label class="text-xs text-dashboard-muted mb-1 block">Từ ngày</label>
                <input [(ngModel)]="exportFrom" type="datetime-local" class="input-field text-sm" />
              </div>
              <div>
                <label class="text-xs text-dashboard-muted mb-1 block">Đến ngày</label>
                <input [(ngModel)]="exportTo" type="datetime-local" class="input-field text-sm" />
              </div>
            </div>
            <button (click)="exportCSV()" class="btn-primary w-full text-sm flex items-center justify-center gap-2">
              <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"/></svg>
              Xuất báo cáo CSV
            </button>
          </div>
        </div>
      }

      <!-- Settings Tab -->
      @if (activeTab === 'settings') {
        <div class="card max-w-2xl">
          <h3 class="font-semibold mb-4 text-sm uppercase tracking-wider text-dashboard-muted">Cấu hình ngưỡng cảnh báo</h3>
          <form (ngSubmit)="saveSettings()" class="space-y-5">
            <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label class="block text-xs text-dashboard-muted mb-1.5">{{ 'DEVICES.TEMP_HIGH' | translate }} (°C)</label>
                <input [(ngModel)]="settingsForm.tempHigh" name="th" type="number" step="0.1" class="input-field" />
              </div>
              <div>
                <label class="block text-xs text-dashboard-muted mb-1.5">{{ 'DEVICES.TEMP_LOW' | translate }} (°C)</label>
                <input [(ngModel)]="settingsForm.tempLow" name="tl" type="number" step="0.1" class="input-field" />
              </div>
              <div>
                <label class="block text-xs text-dashboard-muted mb-1.5">{{ 'DEVICES.HUMI_HIGH' | translate }} (%)</label>
                <input [(ngModel)]="settingsForm.humiHigh" name="hh" type="number" step="0.1" class="input-field" />
              </div>
              <div>
                <label class="block text-xs text-dashboard-muted mb-1.5">{{ 'DEVICES.HUMI_LOW' | translate }} (%)</label>
                <input [(ngModel)]="settingsForm.humiLow" name="hl" type="number" step="0.1" class="input-field" />
              </div>
              <div>
                <label class="block text-xs text-dashboard-muted mb-1.5">{{ 'DEVICES.LOG_CYCLE' | translate }}</label>
                <input [(ngModel)]="settingsForm.logCycleSeconds" name="lc" type="number" class="input-field" />
              </div>
              <div>
                <label class="block text-xs text-dashboard-muted mb-1.5">{{ 'DEVICES.OFFLINE_TIMEOUT' | translate }}</label>
                <input [(ngModel)]="settingsForm.offlineTimeout" name="ot" type="number" class="input-field" />
              </div>
            </div>
            @if (settingsSaved) {
              <div class="bg-primary-500/10 border border-primary-500/30 text-primary-400 px-4 py-2 rounded-lg text-sm animate-fade-in">
                ✓ Đã lưu cài đặt thành công
              </div>
            }
            <button type="submit" class="btn-primary text-sm px-8">{{ 'COMMON.SAVE' | translate }}</button>
          </form>
        </div>
      }

      <!-- Alarms Tab -->
      @if (activeTab === 'alarms') {
        <div class="card !p-0 overflow-hidden">
          <div class="px-4 py-3 border-b border-dashboard-border flex items-center justify-between">
            <h3 class="font-semibold text-sm">Lịch sử cảnh báo</h3>
            <span class="text-xs text-dashboard-muted">{{ alarms.length }} cảnh báo</span>
          </div>
          @if (alarms.length === 0) {
            <div class="text-center py-16">
              <svg class="w-12 h-12 text-primary-400/30 mx-auto mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
              <p class="text-dashboard-muted text-sm">Không có cảnh báo</p>
            </div>
          } @else {
            <div class="overflow-x-auto">
              <table class="w-full">
                <thead class="bg-navy-700/50">
                  <tr>
                    <th class="table-header">Loại</th>
                    <th class="table-header">Mức độ</th>
                    <th class="table-header">Giá trị</th>
                    <th class="table-header">Thời gian</th>
                    <th class="table-header">Trạng thái</th>
                    <th class="table-header"></th>
                  </tr>
                </thead>
                <tbody>
                  @for (alarm of alarms; track alarm.id) {
                    <tr class="table-row">
                      <td class="table-cell"><span class="badge-info">{{ alarm.alarmType }}</span></td>
                      <td class="table-cell">
                        <span [ngClass]="alarm.severity === 'Critical' ? 'badge-critical' : alarm.severity === 'Warning' ? 'badge-warning' : 'badge-info'">{{ alarm.severity }}</span>
                      </td>
                      <td class="table-cell font-mono text-sm">{{ alarm.value | number:'1.1-1' }}</td>
                      <td class="table-cell text-xs text-dashboard-muted">{{ alarm.createdAt | date:'dd/MM/yyyy HH:mm' }}</td>
                      <td class="table-cell">
                        @if (alarm.isResolved) {
                          <span class="badge-online">Resolved</span>
                        } @else if (alarm.isAcknowledged) {
                          <span class="badge-warning">Acknowledged</span>
                        } @else {
                          <span class="badge-critical">Active</span>
                        }
                      </td>
                      <td class="table-cell">
                        @if (!alarm.isResolved && auth.hasAnyRole('Admin', 'Operator')) {
                          <button (click)="resolveAlarm(alarm.id)" class="btn-ghost text-xs px-2 py-1">Resolve</button>
                        }
                      </td>
                    </tr>
                  }
                </tbody>
              </table>
            </div>
          }
        </div>
      }

      <!-- Edit Modal -->
      @if (showEditModal) {
        <div class="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 animate-fade-in" (click)="showEditModal = false">
          <div class="card w-full max-w-lg mx-4 animate-slide-up" (click)="$event.stopPropagation()">
            <h3 class="text-lg font-bold mb-4">{{ 'DEVICES.EDIT' | translate }}: {{ device.name }}</h3>
            <form (ngSubmit)="saveDevice()" class="space-y-4">
              <div class="grid grid-cols-2 gap-4">
                <div>
                  <label class="block text-xs text-dashboard-muted mb-1">{{ 'DEVICES.NAME' | translate }}</label>
                  <input [(ngModel)]="editForm.name" name="name" class="input-field text-sm" required />
                </div>
                <div>
                  <label class="block text-xs text-dashboard-muted mb-1">{{ 'DEVICES.GATEWAY_ID' | translate }}</label>
                  <input [(ngModel)]="editForm.gatewayIdentify" name="gwId" class="input-field text-sm" required />
                </div>
                <div>
                  <label class="block text-xs text-dashboard-muted mb-1">MQTT Topic</label>
                  <input [(ngModel)]="editForm.mqttTopic" name="mqtt" class="input-field text-sm" />
                </div>
                <div>
                  <label class="block text-xs text-dashboard-muted mb-1">{{ 'DEVICES.PROVINCE' | translate }}</label>
                  <select [(ngModel)]="editForm.provinceId" name="prov" class="input-field text-sm">
                    @for (p of provinces; track p.id) { <option [ngValue]="p.id">{{ p.name }}</option> }
                  </select>
                </div>
                <div>
                  <label class="block text-xs text-dashboard-muted mb-1">Latitude</label>
                  <input [(ngModel)]="editForm.latitude" name="lat" type="number" step="any" class="input-field text-sm" />
                </div>
                <div>
                  <label class="block text-xs text-dashboard-muted mb-1">Longitude</label>
                  <input [(ngModel)]="editForm.longitude" name="lng" type="number" step="any" class="input-field text-sm" />
                </div>
              </div>
              <div class="flex gap-3 justify-end pt-2">
                <button type="button" (click)="showEditModal = false" class="btn-secondary text-sm">{{ 'COMMON.CANCEL' | translate }}</button>
                <button type="submit" class="btn-primary text-sm">{{ 'COMMON.SAVE' | translate }}</button>
              </div>
            </form>
          </div>
        </div>
      }
    </div>
  `
})
export class DeviceDetailComponent implements OnInit, OnDestroy, AfterViewInit {
  @ViewChild('tempChart') tempChartRef!: ElementRef<HTMLCanvasElement>;
  @ViewChild('humiChart') humiChartRef!: ElementRef<HTMLCanvasElement>;

  device: any = null;
  liveTemp: number | null = null;
  liveHumi: number | null = null;
  activeTab = 'chart';
  alarms: any[] = [];
  alarmCount = 0;
  provinces: any[] = [];
  showEditModal = false;
  settingsSaved = false;
  maxPoints = 50;

  editForm: any = {};
  settingsForm: any = { tempHigh: 35, tempLow: 10, humiHigh: 80, humiLow: 30, logCycleSeconds: 300, offlineTimeout: 120 };

  exportFrom = '';
  exportTo = '';

  private tempChart: any;
  private humiChart: any;
  private chartLabels: string[] = [];
  private tempData: number[] = [];
  private humiData: number[] = [];
  private deviceId!: number;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private api: ApiService,
    public auth: AuthService,
    private signalR: SignalRService
  ) {
    // Real-time update
    effect(() => {
      const latest = this.signalR.latestTelemetry();
      if (latest && this.device && latest.gatewayId === this.device.gatewayIdentify) {
        this.liveTemp = latest.temperature;
        this.liveHumi = latest.humidity;
        this.addChartPoint(latest.temperature ?? 0, latest.humidity ?? 0);
      }
    });
  }

  ngOnInit() {
    this.deviceId = +this.route.snapshot.params['id'];
    this.loadDevice();
    this.api.getProvinces().subscribe(p => this.provinces = p);

    const now = new Date();
    const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    this.exportFrom = weekAgo.toISOString().slice(0, 16);
    this.exportTo = now.toISOString().slice(0, 16);
  }

  ngAfterViewInit() {
    setTimeout(() => this.initCharts(), 300);
  }

  ngOnDestroy() {
    this.tempChart?.destroy();
    this.humiChart?.destroy();
  }

  loadDevice() {
    this.api.getDevice(this.deviceId).subscribe(d => {
      this.device = d;
      this.editForm = { ...d };
      // Load settings
      this.api.getDeviceSettings(this.deviceId).subscribe(s => {
        if (s) this.settingsForm = { ...s };
      });
      // Load live telemetry
      this.api.getDeviceTelemetry(d.gatewayIdentify).subscribe(t => {
        if (t) { this.liveTemp = t.temperature; this.liveHumi = t.humidity; }
      });
      // Load alarm count
      this.api.getAlarms({ deviceId: this.deviceId, page: 1, pageSize: 1 }).subscribe(r => {
        this.alarmCount = r.totalCount || 0;
      });
    });
  }

  loadAlarms() {
    this.api.getAlarms({ deviceId: this.deviceId, page: 1, pageSize: 50 }).subscribe(r => {
      this.alarms = r.items || [];
    });
  }

  saveSettings() {
    this.api.updateDeviceSettings(this.deviceId, this.settingsForm).subscribe(() => {
      this.settingsSaved = true;
      setTimeout(() => this.settingsSaved = false, 3000);
    });
  }

  saveDevice() {
    this.api.updateDevice(this.deviceId, this.editForm).subscribe(() => {
      this.showEditModal = false;
      this.loadDevice();
    });
  }

  resolveAlarm(id: number) {
    this.api.resolveAlarm(id).subscribe(() => this.loadAlarms());
  }

  exportCSV() {
    this.api.exportData({ deviceId: this.deviceId, from: this.exportFrom, to: this.exportTo })
      .subscribe(data => {
        if (!data || data.length === 0) { alert('Không có dữ liệu để xuất'); return; }
        const csv = [Object.keys(data[0]).join(','), ...data.map((r: any) => Object.values(r).join(','))].join('\n');
        const blob = new Blob([csv], { type: 'text/csv' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url; a.download = `${this.device.gatewayIdentify}_report.csv`; a.click();
        URL.revokeObjectURL(url);
      });
  }

  private addChartPoint(temp: number, humi: number) {
    if (!this.tempChart || !this.humiChart) return;
    const label = new Date().toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    this.chartLabels.push(label);
    this.tempData.push(temp);
    this.humiData.push(humi);
    if (this.chartLabels.length > this.maxPoints) {
      this.chartLabels.shift(); this.tempData.shift(); this.humiData.shift();
    }
    this.tempChart.data.labels = [...this.chartLabels];
    this.tempChart.data.datasets[0].data = [...this.tempData];
    this.tempChart.update('none');
    this.humiChart.data.labels = [...this.chartLabels];
    this.humiChart.data.datasets[0].data = [...this.humiData];
    this.humiChart.update('none');
  }

  private initCharts() {
    if (typeof Chart === 'undefined' || !this.tempChartRef) return;
    const opts = {
      responsive: true, maintainAspectRatio: false,
      plugins: { legend: { display: false } },
      scales: {
        x: { grid: { color: 'rgba(30,58,90,0.3)', drawBorder: false }, ticks: { color: '#7A98BA', font: { size: 10 }, maxTicksLimit: 10 } },
        y: { grid: { color: 'rgba(30,58,90,0.3)', drawBorder: false }, ticks: { color: '#7A98BA', font: { size: 10 } } },
      },
      elements: { point: { radius: 2, hoverRadius: 5 }, line: { tension: 0.4 } },
      interaction: { intersect: false, mode: 'index' as const },
    };

    this.tempChart = new Chart(this.tempChartRef.nativeElement, {
      type: 'line',
      data: { labels: [], datasets: [{ label: 'Temperature', data: [], borderColor: '#E31B23', backgroundColor: 'rgba(227,27,35,0.1)', borderWidth: 2, fill: true }] },
      options: { ...opts, scales: { ...opts.scales, y: { ...opts.scales.y, suggestedMin: 15, suggestedMax: 40 } } }
    });

    this.humiChart = new Chart(this.humiChartRef.nativeElement, {
      type: 'line',
      data: { labels: [], datasets: [{ label: 'Humidity', data: [], borderColor: '#00A651', backgroundColor: 'rgba(0,166,81,0.1)', borderWidth: 2, fill: true }] },
      options: { ...opts, scales: { ...opts.scales, y: { ...opts.scales.y, suggestedMin: 20, suggestedMax: 90 } } }
    });
  }
}
