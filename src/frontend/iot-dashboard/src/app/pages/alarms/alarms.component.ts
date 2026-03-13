import { Component, OnInit, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TranslateModule } from '@ngx-translate/core';
import { ApiService } from '../../core/services/api.service';
import { AuthService } from '../../core/services/auth.service';
import { SignalRService } from '../../core/services/signalr.service';

@Component({
  selector: 'app-alarms',
  standalone: true,
  imports: [CommonModule, FormsModule, TranslateModule],
  template: `
    <div class="space-y-6 animate-fade-in">
      <div class="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <h2 class="text-2xl font-bold">{{ 'ALARMS.TITLE' | translate }}</h2>
        <div class="flex bg-navy-700 rounded-lg p-0.5">
          <button (click)="activeTab = 'active'; loadActiveAlarms()" class="tab-btn text-xs" [class.active]="activeTab === 'active'">
            {{ 'ALARMS.ACTIVE' | translate }}
            @if (activeAlarms.length > 0) {
              <span class="ml-1 bg-accent-500 text-white text-[10px] px-1.5 py-0.5 rounded-full">{{ activeAlarms.length }}</span>
            }
          </button>
          <button (click)="activeTab = 'history'; loadHistory()" class="tab-btn text-xs" [class.active]="activeTab === 'history'">{{ 'ALARMS.HISTORY' | translate }}</button>
        </div>
      </div>

      <!-- Stats Bar -->
      <div class="grid grid-cols-3 gap-3">
        <div class="card !p-3 text-center">
          <p class="text-xs text-dashboard-muted mb-1">Active</p>
          <p class="text-xl font-bold text-accent-400">{{ stats.active }}</p>
        </div>
        <div class="card !p-3 text-center">
          <p class="text-xs text-dashboard-muted mb-1">Acknowledged</p>
          <p class="text-xl font-bold text-amber-400">{{ stats.acknowledged }}</p>
        </div>
        <div class="card !p-3 text-center">
          <p class="text-xs text-dashboard-muted mb-1">Resolved (24h)</p>
          <p class="text-xl font-bold text-primary-400">{{ stats.resolved }}</p>
        </div>
      </div>

      <!-- Active Alarms -->
      @if (activeTab === 'active') {
        <!-- Severity Filter -->
        <div class="flex gap-1 bg-navy-700 rounded-lg p-0.5 w-fit">
          <button (click)="severityFilter = 'all'" class="tab-btn text-xs" [class.active]="severityFilter === 'all'">All</button>
          <button (click)="severityFilter = 'Critical'" class="tab-btn text-xs" [class.active]="severityFilter === 'Critical'">🔴 Critical</button>
          <button (click)="severityFilter = 'Warning'" class="tab-btn text-xs" [class.active]="severityFilter === 'Warning'">🟡 Warning</button>
        </div>

        @if (filteredAlarms.length === 0) {
          <div class="card text-center py-16">
            <svg class="w-16 h-16 text-primary-400 mx-auto mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
            <p class="text-lg text-dashboard-muted">{{ 'ALARMS.NO_ACTIVE_ALARMS' | translate }}</p>
            <p class="text-sm text-dashboard-muted mt-1">Hệ thống hoạt động bình thường</p>
          </div>
        } @else {
          <div class="space-y-3">
            @for (alarm of filteredAlarms; track alarm.id) {
              <div class="card flex flex-col sm:flex-row items-start sm:items-center gap-3 animate-slide-up"
                   [class.border-accent-500]="alarm.severity === 'Critical'" [class.border-amber-500]="alarm.severity === 'Warning'">
                <!-- Severity Icon -->
                <div class="shrink-0 w-10 h-10 rounded-lg flex items-center justify-center"
                     [class.bg-accent-900]="alarm.severity === 'Critical'" [class.bg-amber-900]="alarm.severity === 'Warning'" [class.bg-sky-900]="alarm.severity === 'Info'">
                  <svg class="w-5 h-5" [class.text-accent-400]="alarm.severity === 'Critical'"
                       [class.text-amber-400]="alarm.severity === 'Warning'"
                       [class.text-sky-400]="alarm.severity === 'Info'"
                       fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z"/>
                  </svg>
                </div>

                <!-- Info -->
                <div class="flex-1 min-w-0">
                  <div class="flex flex-wrap items-center gap-2 mb-1">
                    <span class="font-semibold text-white text-sm">{{ alarm.device?.name || alarm.deviceId }}</span>
                    <span [class]="getSeverityBadge(alarm.severity)">{{ alarm.severity }}</span>
                    <span class="badge-info">{{ alarm.alarmType }}</span>
                  </div>
                  <p class="text-xs text-dashboard-muted truncate">{{ alarm.message }}</p>
                  <p class="text-[10px] text-dashboard-muted mt-1">{{ alarm.createdAt | date:'dd/MM/yyyy HH:mm:ss' }}</p>
                </div>

                <!-- Actions -->
                @if (auth.hasAnyRole('Admin', 'Operator')) {
                  <div class="flex gap-2 shrink-0">
                    @if (!alarm.isAcknowledged) {
                      <button (click)="acknowledge(alarm.id)" class="btn-secondary text-xs">{{ 'ALARMS.ACKNOWLEDGE' | translate }}</button>
                    }
                    <button (click)="resolve(alarm.id)" class="btn-primary text-xs">{{ 'ALARMS.RESOLVE' | translate }}</button>
                  </div>
                }
              </div>
            }
          </div>
        }
      }

      <!-- History Tab -->
      @if (activeTab === 'history') {
        <div class="card !p-0 overflow-hidden">
          <div class="overflow-x-auto">
            <table class="w-full">
              <thead class="bg-navy-700/50">
                <tr>
                  <th class="table-header">{{ 'ALARMS.DEVICE' | translate }}</th>
                  <th class="table-header">{{ 'ALARMS.TYPE' | translate }}</th>
                  <th class="table-header">{{ 'ALARMS.SEVERITY' | translate }}</th>
                  <th class="table-header">{{ 'ALARMS.VALUE' | translate }}</th>
                  <th class="table-header">{{ 'ALARMS.TIME' | translate }}</th>
                  <th class="table-header">{{ 'DASHBOARD.STATUS' | translate }}</th>
                </tr>
              </thead>
              <tbody>
                @for (alarm of historyAlarms; track alarm.id) {
                  <tr class="table-row">
                    <td class="table-cell font-medium text-sm">{{ alarm.device?.name || alarm.deviceId }}</td>
                    <td class="table-cell"><span class="badge-info">{{ alarm.alarmType }}</span></td>
                    <td class="table-cell"><span [class]="getSeverityBadge(alarm.severity)">{{ alarm.severity }}</span></td>
                    <td class="table-cell font-mono text-sm">{{ alarm.value | number:'1.1-1' }}</td>
                    <td class="table-cell text-dashboard-muted text-xs">{{ alarm.createdAt | date:'dd/MM HH:mm' }}</td>
                    <td class="table-cell">
                      @if (alarm.isResolved) {
                        <span class="badge-online">Resolved</span>
                      } @else if (alarm.isAcknowledged) {
                        <span class="badge-warning">Acknowledged</span>
                      } @else {
                        <span class="badge-critical">Active</span>
                      }
                    </td>
                  </tr>
                }
              </tbody>
            </table>
          </div>
        </div>
      }
    </div>
  `
})
export class AlarmsComponent implements OnInit {
  activeTab = 'active';
  activeAlarms: any[] = [];
  filteredAlarms: any[] = [];
  historyAlarms: any[] = [];
  severityFilter = 'all';
  stats = { active: 0, acknowledged: 0, resolved: 0 };

  constructor(
    private api: ApiService,
    public auth: AuthService,
    private signalR: SignalRService
  ) {
    effect(() => {
      const alarm = this.signalR.latestAlarm();
      if (alarm && this.activeTab === 'active') this.loadActiveAlarms();
    });
  }

  ngOnInit() { this.loadActiveAlarms(); }

  loadActiveAlarms() {
    this.api.getActiveAlarms().subscribe(d => {
      this.activeAlarms = d;
      this.applyFilter();
      this.stats.active = d.filter((a: any) => !a.isAcknowledged).length;
      this.stats.acknowledged = d.filter((a: any) => a.isAcknowledged && !a.isResolved).length;
    });
    // Load resolved count
    this.api.getAlarms({ page: 1, pageSize: 1 }).subscribe(d => {
      this.stats.resolved = d.totalCount || 0;
    });
  }

  loadHistory() {
    this.api.getAlarms({ page: 1, pageSize: 100 }).subscribe(d => this.historyAlarms = d.items || []);
  }

  applyFilter() {
    this.filteredAlarms = this.severityFilter === 'all'
      ? this.activeAlarms
      : this.activeAlarms.filter(a => a.severity === this.severityFilter);
  }

  acknowledge(id: number) {
    this.api.acknowledgeAlarm(id).subscribe(() => this.loadActiveAlarms());
  }

  resolve(id: number) {
    this.api.resolveAlarm(id).subscribe(() => this.loadActiveAlarms());
  }

  getSeverityBadge(severity: string): string {
    switch (severity) {
      case 'Critical': return 'badge-critical';
      case 'Warning': return 'badge-warning';
      default: return 'badge-info';
    }
  }
}
