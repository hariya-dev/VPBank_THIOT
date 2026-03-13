import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { TranslateModule } from '@ngx-translate/core';
import { ApiService } from '../../core/services/api.service';
import { AuthService } from '../../core/services/auth.service';

@Component({
  selector: 'app-devices',
  standalone: true,
  imports: [CommonModule, FormsModule, TranslateModule],
  template: `
    <div class="space-y-6 animate-fade-in">
      <div class="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <h2 class="text-2xl font-bold">{{ 'DEVICES.TITLE' | translate }}</h2>
        <div class="flex items-center gap-2">
          @if (auth.hasAnyRole('Admin', 'Operator')) {
            <button (click)="showAddModal = true" class="btn-primary flex items-center gap-2 text-sm">
              <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"/></svg>
              {{ 'DEVICES.ADD_NEW' | translate }}
            </button>
          }
        </div>
      </div>

      <!-- Filters -->
      <div class="flex flex-wrap gap-3 items-center">
        <input [(ngModel)]="searchTerm" (ngModelChange)="filterDevices()" type="text" class="input-field max-w-xs text-sm" [placeholder]="'DEVICES.SEARCH' | translate" />
        <select [(ngModel)]="selectedProvinceId" (ngModelChange)="filterDevices()" class="input-field max-w-[200px] text-sm">
          <option [ngValue]="null">{{ 'DEVICES.ALL_PROVINCES' | translate }}</option>
          @for (p of provinces; track p.id) {
            <option [ngValue]="p.id">{{ p.name }}</option>
          }
        </select>
        <!-- Status toggle -->
        <div class="flex bg-navy-700 rounded-lg p-0.5">
          <button (click)="statusFilter = 'all'; filterDevices()" class="tab-btn text-xs" [class.active]="statusFilter === 'all'">All</button>
          <button (click)="statusFilter = 'Online'; filterDevices()" class="tab-btn text-xs" [class.active]="statusFilter === 'Online'">Online</button>
          <button (click)="statusFilter = 'Offline'; filterDevices()" class="tab-btn text-xs" [class.active]="statusFilter === 'Offline'">Offline</button>
        </div>
        <span class="text-sm text-dashboard-muted ml-auto">{{ filteredDevices.length }}/{{ devices.length }}</span>
      </div>

      <!-- View toggle -->
      <div class="flex gap-1 bg-navy-700 rounded-lg p-0.5 w-fit">
        <button (click)="viewMode = 'grid'" class="tab-btn text-xs px-3" [class.active]="viewMode === 'grid'">
          <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zm10 0a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zm10 0a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z"/></svg>
        </button>
        <button (click)="viewMode = 'table'" class="tab-btn text-xs px-3" [class.active]="viewMode === 'table'">
          <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 10h16M4 14h16M4 18h16"/></svg>
        </button>
      </div>

      <!-- Grid View -->
      @if (viewMode === 'grid') {
        <div class="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          @for (device of filteredDevices; track device.id; let i = $index) {
            <div class="card cursor-pointer animate-slide-up hover:border-primary-500/50 group" [style.animation-delay]="i * 30 + 'ms'" (click)="goToDetail(device)">
              <div class="flex items-start justify-between mb-3">
                <div>
                  <h3 class="font-semibold text-white text-sm group-hover:text-primary-400 transition-colors">{{ device.name }}</h3>
                  <p class="text-xs text-dashboard-muted font-mono">{{ device.gatewayIdentify }}</p>
                </div>
                <span [class]="device.status === 'Online' ? 'badge-online' : 'badge-offline'">{{ device.status }}</span>
              </div>
              <div class="space-y-1.5 text-xs">
                <div class="flex justify-between">
                  <span class="text-dashboard-muted">{{ 'DEVICES.PROVINCE' | translate }}</span>
                  <span>{{ device.province?.name || '--' }}</span>
                </div>
                <div class="flex justify-between">
                  <span class="text-dashboard-muted">MQTT</span>
                  <span class="font-mono text-primary-400 truncate max-w-[120px]">{{ device.mqttTopic || '--' }}</span>
                </div>
                @if (device.setting) {
                  <div class="flex justify-between">
                    <span class="text-dashboard-muted">T° Range</span>
                    <span class="text-sky-400">{{ device.setting.tempLow }}° – {{ device.setting.tempHigh }}°</span>
                  </div>
                }
              </div>
              <div class="mt-3 pt-3 border-t border-dashboard-border/30 flex items-center justify-between">
                <span class="text-[11px] text-dashboard-muted">Click để xem chi tiết</span>
                <svg class="w-4 h-4 text-primary-400 opacity-0 group-hover:opacity-100 transition-all group-hover:translate-x-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"/></svg>
              </div>
            </div>
          } @empty {
            <div class="col-span-full text-center py-12 text-dashboard-muted">{{ 'DASHBOARD.NO_DATA' | translate }}</div>
          }
        </div>
      }

      <!-- Table View -->
      @if (viewMode === 'table') {
        <div class="card !p-0 overflow-hidden">
          <div class="overflow-x-auto">
            <table class="w-full">
              <thead class="bg-navy-700/50">
                <tr>
                  <th class="table-header">{{ 'DEVICES.NAME' | translate }}</th>
                  <th class="table-header">Gateway</th>
                  <th class="table-header">{{ 'DEVICES.PROVINCE' | translate }}</th>
                  <th class="table-header">{{ 'DASHBOARD.STATUS' | translate }}</th>
                  <th class="table-header">T° Range</th>
                  <th class="table-header">H% Range</th>
                  <th class="table-header"></th>
                </tr>
              </thead>
              <tbody>
                @for (device of filteredDevices; track device.id) {
                  <tr class="table-row cursor-pointer hover:bg-primary-500/5" (click)="goToDetail(device)">
                    <td class="table-cell font-medium text-white">{{ device.name }}</td>
                    <td class="table-cell font-mono text-primary-400 text-xs">{{ device.gatewayIdentify }}</td>
                    <td class="table-cell text-dashboard-muted">{{ device.province?.name || '--' }}</td>
                    <td class="table-cell"><span [class]="device.status === 'Online' ? 'badge-online' : 'badge-offline'">{{ device.status }}</span></td>
                    <td class="table-cell text-xs">{{ device.setting?.tempLow || 10 }}° – {{ device.setting?.tempHigh || 35 }}°</td>
                    <td class="table-cell text-xs">{{ device.setting?.humiLow || 30 }}% – {{ device.setting?.humiHigh || 80 }}%</td>
                    <td class="table-cell">
                      <span class="text-primary-400 text-xs font-medium">Chi tiết →</span>
                    </td>
                  </tr>
                }
              </tbody>
            </table>
          </div>
        </div>
      }

      <!-- Add Modal -->
      @if (showAddModal || editingDevice) {
        <div class="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 animate-fade-in" (click)="closeModal()">
          <div class="card w-full max-w-lg mx-4 animate-slide-up" (click)="$event.stopPropagation()">
            <h3 class="text-lg font-bold mb-4">{{ editingDevice ? ('DEVICES.EDIT' | translate) : ('DEVICES.ADD_NEW' | translate) }}</h3>
            <form (ngSubmit)="saveDevice()" class="space-y-4">
              <div class="grid grid-cols-2 gap-4">
                <div>
                  <label class="block text-xs text-dashboard-muted mb-1">{{ 'DEVICES.NAME' | translate }}</label>
                  <input [(ngModel)]="form.name" name="name" class="input-field text-sm" required />
                </div>
                <div>
                  <label class="block text-xs text-dashboard-muted mb-1">{{ 'DEVICES.GATEWAY_ID' | translate }}</label>
                  <input [(ngModel)]="form.gatewayIdentify" name="gwId" class="input-field text-sm" required />
                </div>
                <div>
                  <label class="block text-xs text-dashboard-muted mb-1">MQTT Topic</label>
                  <input [(ngModel)]="form.mqttTopic" name="mqtt" class="input-field text-sm" />
                </div>
                <div>
                  <label class="block text-xs text-dashboard-muted mb-1">{{ 'DEVICES.PROVINCE' | translate }}</label>
                  <select [(ngModel)]="form.provinceId" name="prov" class="input-field text-sm">
                    @for (p of provinces; track p.id) { <option [ngValue]="p.id">{{ p.name }}</option> }
                  </select>
                </div>
                <div>
                  <label class="block text-xs text-dashboard-muted mb-1">Latitude</label>
                  <input [(ngModel)]="form.latitude" name="lat" type="number" step="any" class="input-field text-sm" />
                </div>
                <div>
                  <label class="block text-xs text-dashboard-muted mb-1">Longitude</label>
                  <input [(ngModel)]="form.longitude" name="lng" type="number" step="any" class="input-field text-sm" />
                </div>
              </div>
              <div class="flex gap-3 justify-end pt-2">
                <button type="button" (click)="closeModal()" class="btn-secondary text-sm">{{ 'COMMON.CANCEL' | translate }}</button>
                <button type="submit" class="btn-primary text-sm">{{ 'COMMON.SAVE' | translate }}</button>
              </div>
            </form>
          </div>
        </div>
      }
    </div>
  `
})
export class DevicesComponent implements OnInit {
  devices: any[] = [];
  filteredDevices: any[] = [];
  provinces: any[] = [];
  searchTerm = '';
  selectedProvinceId: number | null = null;
  statusFilter = 'all';
  viewMode = 'grid';
  showAddModal = false;
  editingDevice: any = null;

  form: any = { name: '', gatewayIdentify: '', mqttTopic: '', provinceId: null, latitude: null, longitude: null };

  constructor(private api: ApiService, public auth: AuthService, private router: Router) {}

  ngOnInit() {
    this.loadDevices();
    this.api.getProvinces().subscribe(p => this.provinces = p);
  }

  loadDevices() {
    this.api.getDevices().subscribe(d => {
      this.devices = d;
      this.filterDevices();
    });
  }

  filterDevices() {
    let result = this.devices;
    if (this.selectedProvinceId) result = result.filter(d => d.provinceId === this.selectedProvinceId);
    if (this.statusFilter !== 'all') result = result.filter(d => d.status === this.statusFilter);
    if (this.searchTerm) {
      const term = this.searchTerm.toLowerCase();
      result = result.filter(d => d.name.toLowerCase().includes(term) || d.gatewayIdentify.toLowerCase().includes(term));
    }
    this.filteredDevices = result;
  }

  goToDetail(device: any) {
    this.router.navigate(['/devices', device.id]);
  }

  editDevice(device: any) {
    this.editingDevice = device;
    this.form = { ...device };
  }

  saveDevice() {
    const obs = this.editingDevice
      ? this.api.updateDevice(this.editingDevice.id, this.form)
      : this.api.createDevice(this.form);
    obs.subscribe(() => { this.closeModal(); this.loadDevices(); });
  }

  closeModal() {
    this.showAddModal = false;
    this.editingDevice = null;
    this.form = { name: '', gatewayIdentify: '', mqttTopic: '', provinceId: null, latitude: null, longitude: null };
  }
}
