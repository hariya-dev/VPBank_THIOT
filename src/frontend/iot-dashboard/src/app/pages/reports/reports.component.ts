import { Component, OnInit, ViewChild, ElementRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TranslateModule } from '@ngx-translate/core';
import { ApiService } from '../../core/services/api.service';

declare var Chart: any;

@Component({
  selector: 'app-reports',
  standalone: true,
  imports: [CommonModule, FormsModule, TranslateModule],
  template: `
    <div class="space-y-5 animate-fade-in">
      <div class="flex items-center justify-between">
        <div>
          <h2 class="text-2xl font-bold text-vpb-dark-700">Báo cáo & Lịch sử</h2>
          <p class="text-sm text-vpb-grey-600 mt-0.5">Phân tích dữ liệu cảm biến theo địa điểm, thời gian và ngưỡng cảnh báo</p>
        </div>
      </div>

      <!-- ════════ FILTERS ════════ -->
      <div class="bg-white rounded-xl border border-vpb-grey-200 p-5 shadow-sm">
        <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          <!-- Province -->
          <div>
            <label class="block text-xs font-medium text-vpb-grey-600 mb-1.5">Tỉnh/Thành phố</label>
            <select [(ngModel)]="selectedProvinceId" (ngModelChange)="onProvinceChange()" class="input-field text-sm">
              <option [ngValue]="null">Tất cả tỉnh</option>
              @for (p of provinces; track p.id) {
                <option [ngValue]="p.id">{{ p.name }}</option>
              }
            </select>
          </div>
          <!-- Date From -->
          <div>
            <label class="block text-xs font-medium text-vpb-grey-600 mb-1.5">Từ ngày</label>
            <input [(ngModel)]="dateFrom" type="datetime-local" class="input-field text-sm" />
          </div>
          <!-- Date To -->
          <div>
            <label class="block text-xs font-medium text-vpb-grey-600 mb-1.5">Đến ngày</label>
            <input [(ngModel)]="dateTo" type="datetime-local" class="input-field text-sm" />
          </div>
          <!-- Interval + Data Type -->
          <div class="grid grid-cols-2 gap-2">
            <div>
              <label class="block text-xs font-medium text-vpb-grey-600 mb-1.5">Chu kỳ</label>
              <select [(ngModel)]="interval" class="input-field text-sm">
                <option value="hour">Theo giờ</option>
                <option value="day">Theo ngày</option>
              </select>
            </div>
            <div>
              <label class="block text-xs font-medium text-vpb-grey-600 mb-1.5">Đại lượng</label>
              <select [(ngModel)]="dataType" class="input-field text-sm">
                <option value="both">Cả hai</option>
                <option value="temp">Nhiệt độ</option>
                <option value="humi">Độ ẩm</option>
              </select>
            </div>
          </div>
        </div>

        <!-- Device multi-select -->
        <div class="mt-3 pt-3 border-t border-vpb-grey-200">
          <div class="flex items-center justify-between mb-2">
            <label class="text-xs font-medium text-vpb-grey-600">Chọn thiết bị ({{ selectedDeviceIds.length }}/{{ filteredDevices.length }})</label>
            <div class="flex gap-2">
              <button (click)="selectAllDevices()" class="text-[10px] text-vpb-green-600 hover:underline">Chọn tất cả</button>
              <button (click)="deselectAllDevices()" class="text-[10px] text-vpb-grey-500 hover:underline">Bỏ chọn</button>
            </div>
          </div>
          <div class="flex flex-wrap gap-1.5 max-h-24 overflow-y-auto rounded-lg bg-vpb-grey-50 p-2">
            @for (d of filteredDevices; track d.id) {
              <label class="inline-flex items-center gap-1 px-2 py-1 rounded-md text-xs cursor-pointer transition-colors"
                [class]="isDeviceSelected(d.id) ? 'bg-vpb-green-500 text-white' : 'bg-white border border-vpb-grey-200 text-vpb-grey-600 hover:border-vpb-green-300'">
                <input type="checkbox" class="sr-only" [checked]="isDeviceSelected(d.id)" (change)="toggleDevice(d.id)" />
                {{ d.name }}
              </label>
            }
          </div>
        </div>

        <!-- Quick ranges + Actions -->
        <div class="flex flex-wrap items-center gap-2 mt-3 pt-3 border-t border-vpb-grey-200">
          <div class="flex gap-1">
            @for (r of quickRanges; track r.key) {
              <button (click)="setRange(r.key)" class="px-3 py-1.5 text-xs font-medium rounded-lg transition-colors"
                [class]="quickRange===r.key ? 'bg-vpb-green-500 text-white' : 'text-vpb-grey-600 hover:bg-vpb-grey-100'">{{ r.label }}</button>
            }
          </div>
          <div class="flex gap-2 ml-auto">
            <button (click)="generateReport()" class="btn-primary text-sm flex items-center gap-1.5" [disabled]="selectedDeviceIds.length === 0">
              <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/></svg>
              Tạo báo cáo
            </button>
            <button (click)="exportCSV()" class="btn-secondary text-sm flex items-center gap-1.5" [disabled]="!hasData">
              <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"/></svg>
              Xuất CSV
            </button>
          </div>
        </div>
      </div>

      <!-- ════════ TABS ════════ -->
      @if (hasData || loading) {
        <div class="flex gap-1 bg-white rounded-xl border border-vpb-grey-200 p-1 shadow-sm">
          @for (tab of tabs; track tab.key) {
            <button (click)="switchTab(tab.key)" class="tab-btn flex items-center gap-1.5" [class.active]="activeTab===tab.key">
              <span [innerHTML]="tab.icon"></span>
              {{ tab.label }}
              @if (tab.key === 'alarm' && alarmSummary?.totalAlarms > 0) {
                <span class="bg-red-500 text-white text-[10px] px-1.5 py-0.5 rounded-full">{{ alarmSummary.totalAlarms }}</span>
              }
              @if (tab.key === 'threshold' && totalViolations > 0) {
                <span class="bg-red-500 text-white text-[10px] px-1.5 py-0.5 rounded-full">{{ totalViolations }}</span>
              }
            </button>
          }
        </div>
      }

      <!-- ──── TAB: OVERVIEW ──── -->
      @if (activeTab === 'overview' && hasData) {
        <div class="space-y-4 animate-fade-in">
          @for (dev of summaryData; track dev.deviceId) {
            <div class="bg-white rounded-xl border border-vpb-grey-200 p-5 shadow-sm">
              <div class="flex items-center justify-between mb-4">
                <div>
                  <h3 class="font-bold text-vpb-dark-700">{{ dev.deviceName }}</h3>
                  <span class="text-xs text-vpb-grey-500">{{ dev.province }} · {{ dev.gatewayIdentify }} · {{ dev.sampleCount }} mẫu</span>
                </div>
                <div class="text-right text-xs text-vpb-grey-500">
                  Ngưỡng T°: <span class="text-sky-600">{{ dev.tempLow }}°</span> – <span class="text-red-500">{{ dev.tempHigh }}°</span> ·
                  Ngưỡng H%: <span class="text-sky-600">{{ dev.humiLow }}%</span> – <span class="text-red-500">{{ dev.humiHigh }}%</span>
                </div>
              </div>
              <div class="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
                @if (dataType !== 'humi') {
                  <div class="bg-vpb-grey-50 rounded-lg p-3 text-center">
                    <div class="text-[10px] font-semibold text-vpb-grey-500 uppercase">TB T°</div>
                    <div class="text-xl font-bold text-vpb-dark-700 mt-1">{{ dev.avgTemp | number:'1.1-1' }}°C</div>
                  </div>
                  <div class="bg-sky-50 rounded-lg p-3 text-center">
                    <div class="text-[10px] font-semibold text-sky-600 uppercase">Min T°</div>
                    <div class="text-xl font-bold text-sky-700 mt-1">{{ dev.minTemp | number:'1.1-1' }}°C</div>
                  </div>
                  <div class="bg-red-50 rounded-lg p-3 text-center">
                    <div class="text-[10px] font-semibold text-red-500 uppercase">Max T°</div>
                    <div class="text-xl font-bold text-red-600 mt-1">{{ dev.maxTemp | number:'1.1-1' }}°C</div>
                  </div>
                }
                @if (dataType !== 'temp') {
                  <div class="bg-vpb-grey-50 rounded-lg p-3 text-center">
                    <div class="text-[10px] font-semibold text-vpb-grey-500 uppercase">TB H%</div>
                    <div class="text-xl font-bold text-vpb-dark-700 mt-1">{{ dev.avgHumi | number:'1.1-1' }}%</div>
                  </div>
                  <div class="bg-sky-50 rounded-lg p-3 text-center">
                    <div class="text-[10px] font-semibold text-sky-600 uppercase">Min H%</div>
                    <div class="text-xl font-bold text-sky-700 mt-1">{{ dev.minHumi | number:'1.1-1' }}%</div>
                  </div>
                  <div class="bg-amber-50 rounded-lg p-3 text-center">
                    <div class="text-[10px] font-semibold text-amber-600 uppercase">Max H%</div>
                    <div class="text-xl font-bold text-amber-700 mt-1">{{ dev.maxHumi | number:'1.1-1' }}%</div>
                  </div>
                }
              </div>
              @if ((dev.overTempCount + dev.underTempCount + dev.overHumiCount + dev.underHumiCount) > 0) {
                <div class="mt-3 pt-3 border-t border-vpb-grey-200 flex flex-wrap gap-2">
                  @if (dev.overTempCount > 0) { <span class="text-xs font-medium text-red-600 bg-red-50 border border-red-200 px-2 py-1 rounded-full">🔺 Vượt T° cao: {{ dev.overTempCount }}</span> }
                  @if (dev.underTempCount > 0) { <span class="text-xs font-medium text-sky-600 bg-sky-50 border border-sky-200 px-2 py-1 rounded-full">🔻 Dưới T° thấp: {{ dev.underTempCount }}</span> }
                  @if (dev.overHumiCount > 0) { <span class="text-xs font-medium text-amber-600 bg-amber-50 border border-amber-200 px-2 py-1 rounded-full">🔺 Vượt H% cao: {{ dev.overHumiCount }}</span> }
                  @if (dev.underHumiCount > 0) { <span class="text-xs font-medium text-sky-600 bg-sky-50 border border-sky-200 px-2 py-1 rounded-full">🔻 Dưới H% thấp: {{ dev.underHumiCount }}</span> }
                </div>
              }
            </div>
          }
        </div>
      }

      <!-- ──── TAB: TIME SERIES ──── -->
      @if (activeTab === 'timeseries' && hasData) {
        <div class="space-y-4 animate-fade-in">
          <div class="bg-white rounded-xl border border-vpb-grey-200 p-5 shadow-sm">
            <h3 class="font-semibold text-vpb-dark-700 mb-4 flex items-center gap-2">
              <svg class="w-5 h-5 text-vpb-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 12l3-3 3 3 4-4"/></svg>
              Biểu đồ {{ dataType === 'temp' ? 'nhiệt độ' : dataType === 'humi' ? 'độ ẩm' : 'nhiệt độ & độ ẩm' }}
            </h3>
            <div class="h-72 md:h-96"><canvas #tsChart></canvas></div>
          </div>
          <!-- Time series table -->
          <div class="bg-white rounded-xl border border-vpb-grey-200 shadow-sm overflow-hidden">
            <div class="px-4 py-3 border-b border-vpb-grey-200">
              <h3 class="font-semibold text-sm text-vpb-dark-700">Dữ liệu tổng hợp ({{ reportData.length }} bản ghi)</h3>
            </div>
            <div class="overflow-x-auto max-h-96">
              <table class="w-full">
                <thead class="bg-vpb-grey-50 sticky top-0">
                  <tr>
                    <th class="table-header">Thời gian</th>
                    <th class="table-header">Thiết bị</th>
                    @if (dataType !== 'humi') {
                      <th class="table-header">TB T°</th><th class="table-header">Min T°</th><th class="table-header">Max T°</th>
                    }
                    @if (dataType !== 'temp') {
                      <th class="table-header">TB H%</th><th class="table-header">Min H%</th><th class="table-header">Max H%</th>
                    }
                    <th class="table-header">Mẫu</th>
                  </tr>
                </thead>
                <tbody>
                  @for (row of reportData; track $index) {
                    <tr class="table-row">
                      <td class="table-cell font-mono text-xs">{{ row.timeBucket | date:'dd/MM/yyyy HH:mm' }}</td>
                      <td class="table-cell text-xs text-vpb-green-600 font-medium">{{ row.deviceName }}</td>
                      @if (dataType !== 'humi') {
                        <td class="table-cell font-semibold">{{ row.avgTemp | number:'1.1-1' }}</td>
                        <td class="table-cell text-xs" [class.text-sky-600]="row.minTemp < row.tempLow">{{ row.minTemp | number:'1.1-1' }}</td>
                        <td class="table-cell text-xs" [class.text-red-500]="row.maxTemp > row.tempHigh">{{ row.maxTemp | number:'1.1-1' }}</td>
                      }
                      @if (dataType !== 'temp') {
                        <td class="table-cell font-semibold">{{ row.avgHumi | number:'1.1-1' }}</td>
                        <td class="table-cell text-xs" [class.text-sky-600]="row.minHumi < row.humiLow">{{ row.minHumi | number:'1.1-1' }}</td>
                        <td class="table-cell text-xs" [class.text-amber-600]="row.maxHumi > row.humiHigh">{{ row.maxHumi | number:'1.1-1' }}</td>
                      }
                      <td class="table-cell text-xs text-vpb-grey-500">{{ row.sampleCount }}</td>
                    </tr>
                  }
                </tbody>
              </table>
            </div>
          </div>
        </div>
      }

      <!-- ──── TAB: THRESHOLD ──── -->
      @if (activeTab === 'threshold' && hasData) {
        <div class="space-y-4 animate-fade-in">
          <div class="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div class="bg-white rounded-xl border border-red-200 p-4 text-center">
              <div class="text-[10px] font-semibold text-red-500 uppercase">Vượt T° cao</div>
              <div class="text-2xl font-bold text-red-600 mt-1">{{ totalOverTemp }}</div>
            </div>
            <div class="bg-white rounded-xl border border-sky-200 p-4 text-center">
              <div class="text-[10px] font-semibold text-sky-500 uppercase">Dưới T° thấp</div>
              <div class="text-2xl font-bold text-sky-600 mt-1">{{ totalUnderTemp }}</div>
            </div>
            <div class="bg-white rounded-xl border border-amber-200 p-4 text-center">
              <div class="text-[10px] font-semibold text-amber-500 uppercase">Vượt H% cao</div>
              <div class="text-2xl font-bold text-amber-600 mt-1">{{ totalOverHumi }}</div>
            </div>
            <div class="bg-white rounded-xl border border-sky-200 p-4 text-center">
              <div class="text-[10px] font-semibold text-sky-500 uppercase">Dưới H% thấp</div>
              <div class="text-2xl font-bold text-sky-600 mt-1">{{ totalUnderHumi }}</div>
            </div>
          </div>
          @for (dev of summaryData; track dev.deviceId) {
            @if ((dev.overTempCount + dev.underTempCount + dev.overHumiCount + dev.underHumiCount) > 0) {
              <div class="bg-white rounded-xl border border-vpb-grey-200 p-4 shadow-sm">
                <h4 class="font-bold text-vpb-dark-700 mb-2">{{ dev.deviceName }} <span class="text-xs text-vpb-grey-500 font-normal">{{ dev.province }}</span></h4>
                <div class="grid grid-cols-2 md:grid-cols-4 gap-2">
                  <div class="rounded-lg p-2 text-center" [class]="dev.overTempCount > 0 ? 'bg-red-50 border border-red-200' : 'bg-vpb-grey-50'">
                    <div class="text-[10px] text-vpb-grey-500">T° > {{ dev.tempHigh }}°C</div>
                    <div class="text-lg font-bold" [class]="dev.overTempCount > 0 ? 'text-red-600' : 'text-vpb-grey-400'">{{ dev.overTempCount }}</div>
                  </div>
                  <div class="rounded-lg p-2 text-center" [class]="dev.underTempCount > 0 ? 'bg-sky-50 border border-sky-200' : 'bg-vpb-grey-50'">
                    <div class="text-[10px] text-vpb-grey-500">T° < {{ dev.tempLow }}°C</div>
                    <div class="text-lg font-bold" [class]="dev.underTempCount > 0 ? 'text-sky-600' : 'text-vpb-grey-400'">{{ dev.underTempCount }}</div>
                  </div>
                  <div class="rounded-lg p-2 text-center" [class]="dev.overHumiCount > 0 ? 'bg-amber-50 border border-amber-200' : 'bg-vpb-grey-50'">
                    <div class="text-[10px] text-vpb-grey-500">H% > {{ dev.humiHigh }}%</div>
                    <div class="text-lg font-bold" [class]="dev.overHumiCount > 0 ? 'text-amber-600' : 'text-vpb-grey-400'">{{ dev.overHumiCount }}</div>
                  </div>
                  <div class="rounded-lg p-2 text-center" [class]="dev.underHumiCount > 0 ? 'bg-sky-50 border border-sky-200' : 'bg-vpb-grey-50'">
                    <div class="text-[10px] text-vpb-grey-500">H% < {{ dev.humiLow }}%</div>
                    <div class="text-lg font-bold" [class]="dev.underHumiCount > 0 ? 'text-sky-600' : 'text-vpb-grey-400'">{{ dev.underHumiCount }}</div>
                  </div>
                </div>
              </div>
            }
          }
          @if (totalViolations === 0) {
            <div class="bg-vpb-green-50 rounded-xl border border-vpb-green-200 p-8 text-center">
              <svg class="w-12 h-12 mx-auto text-vpb-green-500 mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
              <p class="font-semibold text-vpb-green-700">Tất cả giá trị trong ngưỡng cho phép!</p>
            </div>
          }
        </div>
      }

      <!-- ──── TAB: ALARM REPORT ──── -->
      @if (activeTab === 'alarm') {
        <div class="space-y-4 animate-fade-in">
          <!-- Alarm filter -->
          <div class="flex gap-2 items-center">
            <span class="text-xs text-vpb-grey-500 font-medium">Trạng thái:</span>
            @for (f of alarmFilters; track f.key) {
              <button (click)="alarmStatus=f.key; loadAlarmReport()" class="px-3 py-1.5 text-xs font-medium rounded-lg transition-colors"
                [class]="alarmStatus===f.key ? 'bg-vpb-green-500 text-white' : 'text-vpb-grey-600 hover:bg-vpb-grey-100'">{{ f.label }}</button>
            }
          </div>
          <!-- Alarm summary cards -->
          @if (alarmSummary) {
            <div class="grid grid-cols-2 md:grid-cols-4 gap-3">
              <div class="bg-white rounded-xl border border-vpb-grey-200 p-4 text-center">
                <div class="text-[10px] font-semibold text-vpb-grey-500 uppercase">Tổng cảnh báo</div>
                <div class="text-2xl font-bold text-vpb-dark-700 mt-1">{{ alarmSummary.totalAlarms || 0 }}</div>
              </div>
              <div class="bg-white rounded-xl border border-red-200 p-4 text-center">
                <div class="text-[10px] font-semibold text-red-500 uppercase">Chưa xử lý</div>
                <div class="text-2xl font-bold text-red-600 mt-1">{{ alarmSummary.activeCount || 0 }}</div>
              </div>
              <div class="bg-white rounded-xl border border-vpb-green-200 p-4 text-center">
                <div class="text-[10px] font-semibold text-vpb-green-600 uppercase">Đã ACK</div>
                <div class="text-2xl font-bold text-vpb-green-600 mt-1">{{ alarmSummary.ackedCount || 0 }}</div>
              </div>
              <div class="bg-white rounded-xl border border-sky-200 p-4 text-center">
                <div class="text-[10px] font-semibold text-sky-500 uppercase">Đã xử lý</div>
                <div class="text-2xl font-bold text-sky-600 mt-1">{{ alarmSummary.resolvedCount || 0 }}</div>
              </div>
            </div>
          }
          <!-- Alarm table -->
          <div class="bg-white rounded-xl border border-vpb-grey-200 shadow-sm overflow-hidden">
            <div class="px-4 py-3 border-b border-vpb-grey-200 flex items-center justify-between">
              <h3 class="font-semibold text-sm text-vpb-dark-700">Lịch sử cảnh báo ({{ alarmTotalCount }} bản ghi)</h3>
              <div class="flex gap-2 items-center">
                <button (click)="alarmPrev()" [disabled]="alarmPage <= 1" class="btn-ghost text-xs px-2 py-1" [class.opacity-50]="alarmPage <= 1">← Trước</button>
                <span class="text-xs text-vpb-grey-500">{{ alarmPage }}/{{ alarmTotalPages }}</span>
                <button (click)="alarmNext()" [disabled]="alarmPage >= alarmTotalPages" class="btn-ghost text-xs px-2 py-1" [class.opacity-50]="alarmPage >= alarmTotalPages">Sau →</button>
              </div>
            </div>
            <div class="overflow-x-auto max-h-[500px]">
              <table class="w-full">
                <thead class="bg-vpb-grey-50 sticky top-0">
                  <tr>
                    <th class="table-header">Thời gian</th>
                    <th class="table-header">Thiết bị</th>
                    <th class="table-header">Tỉnh</th>
                    <th class="table-header">Loại</th>
                    <th class="table-header">Giá trị</th>
                    <th class="table-header">Ngưỡng</th>
                    <th class="table-header">Trạng thái</th>
                    <th class="table-header">ACK bởi</th>
                    <th class="table-header">ACK lúc</th>
                    <th class="table-header">Tuần</th>
                    <th class="table-header">Thứ</th>
                    <th class="table-header">Giờ</th>
                  </tr>
                </thead>
                <tbody>
                  @for (a of alarmData; track a.id) {
                    <tr class="table-row">
                      <td class="table-cell font-mono text-xs">{{ a.createdAt | date:'dd/MM/yyyy HH:mm:ss' }}</td>
                      <td class="table-cell text-xs font-medium">{{ a.deviceName }}</td>
                      <td class="table-cell text-xs text-vpb-grey-500">{{ a.province }}</td>
                      <td class="table-cell text-xs">
                        <span class="px-1.5 py-0.5 rounded text-[10px] font-medium"
                          [class]="a.alarmType === 0 || a.alarmType === 1 ? 'bg-red-50 text-red-600' : 'bg-amber-50 text-amber-600'">
                          {{ getAlarmTypeLabel(a.alarmType) }}
                        </span>
                      </td>
                      <td class="table-cell font-mono text-xs">{{ a.value | number:'1.1-1' }}</td>
                      <td class="table-cell font-mono text-xs text-vpb-grey-500">{{ a.threshold | number:'1.1-1' }}</td>
                      <td class="table-cell text-xs">
                        @if (a.isResolved) {
                          <span class="text-vpb-green-600 font-medium">✅ Đã xử lý</span>
                        } @else if (a.isAcknowledged) {
                          <span class="text-amber-600 font-medium">🔔 Đã ACK</span>
                        } @else {
                          <span class="text-red-500 font-medium">🔴 Active</span>
                        }
                      </td>
                      <td class="table-cell text-xs text-vpb-grey-500">{{ a.acknowledgedBy || '—' }}</td>
                      <td class="table-cell text-xs text-vpb-grey-500">{{ a.acknowledgedAt ? (a.acknowledgedAt | date:'dd/MM HH:mm') : '—' }}</td>
                      <td class="table-cell text-xs text-vpb-grey-500 text-center">W{{ a.weekNo }}</td>
                      <td class="table-cell text-xs text-vpb-grey-500">{{ a.dayOfWeek }}</td>
                      <td class="table-cell text-xs text-vpb-grey-500 text-center">{{ a.hourOfDay }}h</td>
                    </tr>
                  } @empty {
                    <tr><td colspan="12" class="table-cell text-center text-vpb-grey-500 py-8">Không có cảnh báo</td></tr>
                  }
                </tbody>
              </table>
            </div>
          </div>
        </div>
      }

      <!-- ──── TAB: RAW DATA ──── -->
      @if (activeTab === 'raw' && hasData) {
        <div class="bg-white rounded-xl border border-vpb-grey-200 shadow-sm overflow-hidden animate-fade-in">
          <div class="px-4 py-3 border-b border-vpb-grey-200 flex items-center justify-between">
            <h3 class="font-semibold text-sm text-vpb-dark-700">Dữ liệu gốc ({{ totalCount }} bản ghi)</h3>
            <div class="flex gap-2 items-center">
              <button (click)="prevPage()" [disabled]="page <= 1" class="btn-ghost text-xs px-2 py-1" [class.opacity-50]="page <= 1">← Trước</button>
              <span class="text-xs text-vpb-grey-500">{{ page }}/{{ totalPages }}</span>
              <button (click)="nextPage()" [disabled]="page >= totalPages" class="btn-ghost text-xs px-2 py-1" [class.opacity-50]="page >= totalPages">Sau →</button>
            </div>
          </div>
          <div class="overflow-x-auto max-h-[500px]">
            <table class="w-full">
              <thead class="bg-vpb-grey-50 sticky top-0">
                <tr>
                  <th class="table-header">Thời gian</th>
                  <th class="table-header">Thiết bị</th>
                  @if (dataType !== 'humi') { <th class="table-header">Nhiệt độ</th> }
                  @if (dataType !== 'temp') { <th class="table-header">Độ ẩm</th> }
                </tr>
              </thead>
              <tbody>
                @for (log of dataLogs; track log.id) {
                  <tr class="table-row">
                    <td class="table-cell font-mono text-xs">{{ log.createdAt | date:'dd/MM/yyyy HH:mm:ss' }}</td>
                    <td class="table-cell text-sm font-medium">{{ log.deviceName }}</td>
                    @if (dataType !== 'humi') { <td class="table-cell font-mono text-sm">{{ log.temperature | number:'1.1-1' }}°C</td> }
                    @if (dataType !== 'temp') { <td class="table-cell font-mono text-sm">{{ log.humidity | number:'1.1-1' }}%</td> }
                  </tr>
                } @empty {
                  <tr><td colspan="4" class="table-cell text-center text-vpb-grey-500 py-8">Không có dữ liệu</td></tr>
                }
              </tbody>
            </table>
          </div>
        </div>
      }

      <!-- Loading -->
      @if (loading) {
        <div class="bg-white rounded-xl border border-vpb-grey-200 p-16 text-center shadow-sm">
          <svg class="animate-spin w-8 h-8 mx-auto text-vpb-green-500 mb-3" fill="none" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"></path></svg>
          <p class="text-vpb-grey-600">Đang tải báo cáo...</p>
        </div>
      }

      <!-- Empty -->
      @if (!hasData && !loading) {
        <div class="bg-white rounded-xl border border-vpb-grey-200 p-16 text-center shadow-sm">
          <svg class="w-16 h-16 mx-auto text-vpb-grey-300 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/></svg>
          <h3 class="font-semibold text-vpb-dark-700 text-lg">Chọn thiết bị để tạo báo cáo</h3>
          <p class="text-vpb-grey-500 text-sm mt-2">Chọn tỉnh, tick các thiết bị cần báo cáo, chọn khoảng thời gian rồi nhấn "Tạo báo cáo"</p>
        </div>
      }
    </div>
  `
})
export class ReportsComponent implements OnInit {
  @ViewChild('tsChart') tsChartRef!: ElementRef<HTMLCanvasElement>;

  // Filters
  provinces: any[] = [];
  devices: any[] = [];
  filteredDevices: any[] = [];
  selectedProvinceId: number | null = null;
  selectedDeviceIds: number[] = [];
  dateFrom = '';
  dateTo = '';
  interval = 'hour';
  dataType: 'both' | 'temp' | 'humi' = 'both';
  quickRange = 'today';
  quickRanges = [
    { key: 'today', label: 'Hôm nay' },
    { key: '3days', label: '3 ngày' },
    { key: '7days', label: '7 ngày' },
    { key: '30days', label: '30 ngày' },
  ];

  // Tabs
  activeTab = 'overview';
  tabs = [
    { key: 'overview', label: 'Tổng hợp', icon: '📊' },
    { key: 'timeseries', label: 'Chi tiết', icon: '📈' },
    { key: 'threshold', label: 'Ngưỡng', icon: '⚠️' },
    { key: 'alarm', label: 'Cảnh báo', icon: '🔔' },
    { key: 'raw', label: 'Dữ liệu gốc', icon: '📋' },
  ];

  // Data
  summaryData: any[] = [];
  reportData: any[] = [];
  dataLogs: any[] = [];
  loading = false;
  hasData = false;

  // Raw pagination
  page = 1; pageSize = 50; totalCount = 0; totalPages = 1;

  // Thresholds
  totalOverTemp = 0; totalUnderTemp = 0; totalOverHumi = 0; totalUnderHumi = 0; totalViolations = 0;

  // Alarm
  alarmData: any[] = [];
  alarmSummary: any = null;
  alarmStatus: string | null = null;
  alarmPage = 1; alarmPageSize = 100; alarmTotalCount = 0; alarmTotalPages = 1;
  alarmFilters = [
    { key: null, label: 'Tất cả' },
    { key: 'false', label: '🔴 Chưa xử lý' },
    { key: 'true', label: '✅ Đã xử lý' },
  ];

  private tsChart: any = null;

  constructor(private api: ApiService) {}

  ngOnInit() {
    this.api.getProvinces().subscribe(p => this.provinces = p);
    this.api.getDevices().subscribe(d => {
      this.devices = d;
      this.filteredDevices = d;
    });
    this.setRange('today');
  }

  onProvinceChange() {
    this.selectedDeviceIds = [];
    if (this.selectedProvinceId) {
      this.filteredDevices = this.devices.filter(d => d.provinceId === this.selectedProvinceId);
    } else {
      this.filteredDevices = this.devices;
    }
  }

  // Device multi-select
  isDeviceSelected(id: number) { return this.selectedDeviceIds.includes(id); }
  toggleDevice(id: number) {
    const idx = this.selectedDeviceIds.indexOf(id);
    if (idx >= 0) this.selectedDeviceIds.splice(idx, 1);
    else this.selectedDeviceIds.push(id);
  }
  selectAllDevices() { this.selectedDeviceIds = this.filteredDevices.map(d => d.id); }
  deselectAllDevices() { this.selectedDeviceIds = []; }

  setRange(range: string) {
    this.quickRange = range;
    const now = new Date();
    let from: Date;
    switch (range) {
      case 'today': from = new Date(now.getFullYear(), now.getMonth(), now.getDate()); break;
      case '3days': from = new Date(now.getTime() - 3 * 86400000); break;
      case '7days': from = new Date(now.getTime() - 7 * 86400000); break;
      case '30days': from = new Date(now.getTime() - 30 * 86400000); break;
      default: from = new Date(now.getTime() - 86400000);
    }
    this.dateFrom = from.toISOString().slice(0, 16);
    this.dateTo = now.toISOString().slice(0, 16);
  }

  switchTab(tab: string) {
    this.activeTab = tab;
    if (tab === 'timeseries') setTimeout(() => this.renderChart(), 200);
    if (tab === 'alarm') this.loadAlarmReport();
  }

  generateReport() {
    this.loading = true;
    this.hasData = false;
    const baseParams: any = { from: this.dateFrom, to: this.dateTo, interval: this.interval };
    if (this.selectedProvinceId) baseParams.provinceId = this.selectedProvinceId;

    // For single device, use deviceId param; for multi, we call per-device and merge OR use provinceId
    const firstDeviceId = this.selectedDeviceIds.length === 1 ? this.selectedDeviceIds[0] : null;
    if (firstDeviceId) baseParams.deviceId = firstDeviceId;

    this.api.getReportSummary(baseParams).subscribe(data => {
      this.summaryData = (data as any[]).filter(d => this.selectedDeviceIds.includes(d.deviceId));
      this.calcViolations();
    });

    this.api.getReportData(baseParams).subscribe(data => {
      this.reportData = (data as any[]).filter(d => this.selectedDeviceIds.includes(d.deviceId));
      this.hasData = this.reportData.length > 0 || this.summaryData.length > 0;
      this.loading = false;
      if (this.activeTab === 'timeseries') setTimeout(() => this.renderChart(), 200);
    });

    this.loadRawData();
    this.loadAlarmReport();
  }

  private loadRawData() {
    const params: any = { from: this.dateFrom, to: this.dateTo, page: this.page, pageSize: this.pageSize };
    if (this.selectedDeviceIds.length === 1) params.deviceId = this.selectedDeviceIds[0];
    this.api.getDataLogs(params).subscribe(res => {
      this.dataLogs = res.items || [];
      this.totalCount = res.totalCount;
      this.totalPages = Math.ceil(this.totalCount / this.pageSize);
      if (!this.hasData && this.dataLogs.length > 0) this.hasData = true;
    });
  }

  loadAlarmReport() {
    const params: any = { from: this.dateFrom, to: this.dateTo, page: this.alarmPage, pageSize: this.alarmPageSize };
    if (this.selectedProvinceId) params.provinceId = this.selectedProvinceId;
    if (this.selectedDeviceIds.length === 1) params.deviceId = this.selectedDeviceIds[0];
    if (this.alarmStatus !== null) params.isResolved = this.alarmStatus;
    this.api.getAlarmReport(params).subscribe(res => {
      this.alarmData = res.items || [];
      this.alarmSummary = res.summary;
      this.alarmTotalCount = res.totalCount;
      this.alarmTotalPages = Math.ceil(this.alarmTotalCount / this.alarmPageSize) || 1;
      if (!this.hasData && this.alarmData.length > 0) this.hasData = true;
    });
  }

  private calcViolations() {
    this.totalOverTemp = this.summaryData.reduce((s, d) => s + (d.overTempCount || 0), 0);
    this.totalUnderTemp = this.summaryData.reduce((s, d) => s + (d.underTempCount || 0), 0);
    this.totalOverHumi = this.summaryData.reduce((s, d) => s + (d.overHumiCount || 0), 0);
    this.totalUnderHumi = this.summaryData.reduce((s, d) => s + (d.underHumiCount || 0), 0);
    this.totalViolations = this.totalOverTemp + this.totalUnderTemp + this.totalOverHumi + this.totalUnderHumi;
    if (this.summaryData.length > 0) this.hasData = true;
    this.loading = false;
  }

  getAlarmTypeLabel(type: number): string {
    const labels: Record<number, string> = { 0: 'T° Cao', 1: 'T° Thấp', 2: 'H% Cao', 3: 'H% Thấp' };
    return labels[type] || `Type ${type}`;
  }

  renderChart() {
    if (typeof Chart === 'undefined' || !this.tsChartRef || this.reportData.length === 0) return;
    this.tsChart?.destroy();

    const labels = this.reportData.map(d => {
      const dt = new Date(d.timeBucket);
      return this.interval === 'hour'
        ? dt.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })
        : dt.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit' });
    });

    const th = this.reportData[0] || {};
    const datasets: any[] = [];

    if (this.dataType !== 'humi') {
      datasets.push({
        label: 'TB Nhiệt độ (°C)', data: this.reportData.map(d => d.avgTemp),
        borderColor: '#E31B23', backgroundColor: 'rgba(227,27,35,0.06)',
        borderWidth: 2, fill: true, tension: 0.4, yAxisID: 'yTemp',
      });
      datasets.push({
        label: `Ngưỡng T° cao (${th.tempHigh ?? 35}°C)`, data: Array(labels.length).fill(th.tempHigh ?? 35),
        borderColor: 'rgba(227,27,35,0.5)', borderWidth: 1.5, borderDash: [6, 4],
        pointRadius: 0, fill: false, yAxisID: 'yTemp',
      });
      datasets.push({
        label: `Ngưỡng T° thấp (${th.tempLow ?? 10}°C)`, data: Array(labels.length).fill(th.tempLow ?? 10),
        borderColor: 'rgba(56,189,248,0.5)', borderWidth: 1.5, borderDash: [6, 4],
        pointRadius: 0, fill: false, yAxisID: 'yTemp',
      });
    }

    if (this.dataType !== 'temp') {
      datasets.push({
        label: 'TB Độ ẩm (%)', data: this.reportData.map(d => d.avgHumi),
        borderColor: '#00A651', backgroundColor: 'rgba(0,166,81,0.06)',
        borderWidth: 2, fill: true, tension: 0.4,
        yAxisID: this.dataType === 'humi' ? 'yTemp' : 'yHumi',
      });
      datasets.push({
        label: `Ngưỡng H% cao (${th.humiHigh ?? 80}%)`, data: Array(labels.length).fill(th.humiHigh ?? 80),
        borderColor: 'rgba(245,158,11,0.5)', borderWidth: 1.5, borderDash: [6, 4],
        pointRadius: 0, fill: false, yAxisID: this.dataType === 'humi' ? 'yTemp' : 'yHumi',
      });
      datasets.push({
        label: `Ngưỡng H% thấp (${th.humiLow ?? 30}%)`, data: Array(labels.length).fill(th.humiLow ?? 30),
        borderColor: 'rgba(56,189,248,0.4)', borderWidth: 1.5, borderDash: [6, 4],
        pointRadius: 0, fill: false, yAxisID: this.dataType === 'humi' ? 'yTemp' : 'yHumi',
      });
    }

    const scales: any = {
      x: { grid: { color: 'rgba(0,0,0,0.04)' }, ticks: { color: '#5E6D7F', font: { size: 10 }, maxTicksLimit: 14 } },
      yTemp: {
        type: 'linear', position: 'left', display: true,
        title: { display: true, text: this.dataType === 'humi' ? 'Độ ẩm (%)' : 'Nhiệt độ (°C)', color: this.dataType === 'humi' ? '#00A651' : '#E31B23', font: { size: 11 } },
        grid: { color: 'rgba(0,0,0,0.04)' }, ticks: { color: '#5E6D7F', font: { size: 10 } },
      },
    };
    if (this.dataType === 'both') {
      scales.yHumi = {
        type: 'linear', position: 'right', display: true,
        title: { display: true, text: 'Độ ẩm (%)', color: '#00A651', font: { size: 11 } },
        grid: { drawOnChartArea: false }, ticks: { color: '#5E6D7F', font: { size: 10 } },
      };
    }

    this.tsChart = new Chart(this.tsChartRef.nativeElement, {
      type: 'line',
      data: { labels, datasets },
      options: {
        responsive: true, maintainAspectRatio: false,
        plugins: {
          legend: { labels: { color: '#5E6D7F', font: { size: 10 }, usePointStyle: true, padding: 12 }, position: 'bottom' },
          tooltip: { mode: 'index', intersect: false, backgroundColor: 'rgba(30,51,80,0.9)' },
        },
        scales,
        interaction: { intersect: false, mode: 'index' },
        elements: { point: { radius: 2, hoverRadius: 5 } },
      },
    });
  }

  exportCSV() {
    const lines: string[] = [];
    const bom = '\uFEFF';

    // Header
    lines.push('BÁO CÁO IOT - VPBank');
    lines.push(`Ngày xuất: ${new Date().toLocaleString('vi-VN')}`);
    lines.push(`Khoảng thời gian: ${this.dateFrom} - ${this.dateTo}`);
    lines.push(`Đại lượng: ${this.dataType === 'temp' ? 'Nhiệt độ' : this.dataType === 'humi' ? 'Độ ẩm' : 'Nhiệt độ & Độ ẩm'}`);
    const selectedNames = this.filteredDevices.filter(d => this.selectedDeviceIds.includes(d.id)).map(d => d.name);
    lines.push(`Thiết bị: ${selectedNames.join(', ')}`);
    if (this.selectedProvinceId) {
      const prov = this.provinces.find(p => p.id === this.selectedProvinceId);
      lines.push(`Tỉnh/Thành phố: ${prov?.name || ''}`);
    }
    lines.push('');

    // Summary
    lines.push('=== TỔNG HỢP THEO THIẾT BỊ ===');
    const sumHeaders = ['Thiết bị', 'Tỉnh'];
    if (this.dataType !== 'humi') sumHeaders.push('TB T°', 'Min T°', 'Max T°', 'Ngưỡng T° cao', 'Ngưỡng T° thấp', 'Vượt T° cao', 'Dưới T° thấp');
    if (this.dataType !== 'temp') sumHeaders.push('TB H%', 'Min H%', 'Max H%', 'Ngưỡng H% cao', 'Ngưỡng H% thấp', 'Vượt H% cao', 'Dưới H% thấp');
    sumHeaders.push('Số mẫu');
    lines.push(sumHeaders.join(','));
    for (const d of this.summaryData) {
      const row: any[] = [d.deviceName, d.province];
      if (this.dataType !== 'humi') row.push(d.avgTemp?.toFixed(1), d.minTemp?.toFixed(1), d.maxTemp?.toFixed(1), d.tempHigh, d.tempLow, d.overTempCount, d.underTempCount);
      if (this.dataType !== 'temp') row.push(d.avgHumi?.toFixed(1), d.minHumi?.toFixed(1), d.maxHumi?.toFixed(1), d.humiHigh, d.humiLow, d.overHumiCount, d.underHumiCount);
      row.push(d.sampleCount);
      lines.push(row.join(','));
    }
    lines.push('');

    // Time series
    lines.push('=== DỮ LIỆU THEO THỜI GIAN ===');
    const tsHeaders = ['Thời gian', 'Thiết bị'];
    if (this.dataType !== 'humi') tsHeaders.push('TB T°', 'Min T°', 'Max T°');
    if (this.dataType !== 'temp') tsHeaders.push('TB H%', 'Min H%', 'Max H%');
    tsHeaders.push('Số mẫu');
    lines.push(tsHeaders.join(','));
    for (const r of this.reportData) {
      const row: any[] = [new Date(r.timeBucket).toLocaleString('vi-VN'), r.deviceName];
      if (this.dataType !== 'humi') row.push(r.avgTemp?.toFixed(1), r.minTemp?.toFixed(1), r.maxTemp?.toFixed(1));
      if (this.dataType !== 'temp') row.push(r.avgHumi?.toFixed(1), r.minHumi?.toFixed(1), r.maxHumi?.toFixed(1));
      row.push(r.sampleCount);
      lines.push(row.join(','));
    }

    // Alarm section
    if (this.alarmData.length > 0) {
      lines.push('');
      lines.push('=== LỊCH SỬ CẢNH BÁO ===');
      lines.push('Thời gian,Thiết bị,Tỉnh,Loại,Giá trị,Ngưỡng,Trạng thái,ACK bởi,ACK lúc,Tuần,Thứ,Giờ');
      for (const a of this.alarmData) {
        const status = a.isResolved ? 'Đã xử lý' : a.isAcknowledged ? 'Đã ACK' : 'Active';
        lines.push([
          new Date(a.createdAt).toLocaleString('vi-VN'), a.deviceName, a.province,
          this.getAlarmTypeLabel(a.alarmType), a.value?.toFixed(1), a.threshold?.toFixed(1),
          status, a.acknowledgedBy || '', a.acknowledgedAt ? new Date(a.acknowledgedAt).toLocaleString('vi-VN') : '',
          `W${a.weekNo}`, a.dayOfWeek, `${a.hourOfDay}h`
        ].join(','));
      }
    }

    const blob = new Blob([bom + lines.join('\n')], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = `VPBank_IoT_Report_${new Date().toISOString().slice(0, 10)}.csv`; a.click();
    URL.revokeObjectURL(url);
  }

  prevPage() { if (this.page > 1) { this.page--; this.loadRawData(); } }
  nextPage() { if (this.page < this.totalPages) { this.page++; this.loadRawData(); } }
  alarmPrev() { if (this.alarmPage > 1) { this.alarmPage--; this.loadAlarmReport(); } }
  alarmNext() { if (this.alarmPage < this.alarmTotalPages) { this.alarmPage++; this.loadAlarmReport(); } }
}
