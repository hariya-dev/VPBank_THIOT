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
          <h2 class="text-2xl font-bold text-vpb-dark-700">{{ 'REPORTS.TITLE' | translate }}</h2>
          <p class="text-sm text-vpb-grey-600 mt-0.5">Phân tích dữ liệu cảm biến theo địa điểm, thời gian và ngưỡng cảnh báo</p>
        </div>
      </div>

      <!-- ════════ FILTERS ════════ -->
      <div class="bg-white rounded-xl border border-vpb-grey-200 p-5 shadow-sm">
        <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
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
          <!-- Device -->
          <div>
            <label class="block text-xs font-medium text-vpb-grey-600 mb-1.5">Thiết bị</label>
            <select [(ngModel)]="selectedDeviceId" class="input-field text-sm">
              <option [ngValue]="null">Tất cả thiết bị</option>
              @for (d of filteredDevices; track d.id) {
                <option [ngValue]="d.id">{{ d.name }} ({{ d.gatewayIdentify }})</option>
              }
            </select>
          </div>
          <!-- Date From -->
          <div>
            <label class="block text-xs font-medium text-vpb-grey-600 mb-1.5">{{ 'REPORTS.DATE_FROM' | translate }}</label>
            <input [(ngModel)]="dateFrom" type="datetime-local" class="input-field text-sm" />
          </div>
          <!-- Date To -->
          <div>
            <label class="block text-xs font-medium text-vpb-grey-600 mb-1.5">{{ 'REPORTS.DATE_TO' | translate }}</label>
            <input [(ngModel)]="dateTo" type="datetime-local" class="input-field text-sm" />
          </div>
          <!-- Interval -->
          <div>
            <label class="block text-xs font-medium text-vpb-grey-600 mb-1.5">Chu kỳ</label>
            <select [(ngModel)]="interval" class="input-field text-sm">
              <option value="hour">Theo giờ</option>
              <option value="day">Theo ngày</option>
            </select>
          </div>
        </div>

        <!-- Quick ranges + Actions -->
        <div class="flex flex-wrap items-center gap-2 mt-4 pt-3 border-t border-vpb-grey-200">
          <div class="flex gap-1">
            <button (click)="setRange('today')" class="px-3 py-1.5 text-xs font-medium rounded-lg transition-colors"
              [class]="quickRange==='today' ? 'bg-vpb-green-500 text-white' : 'text-vpb-grey-600 hover:bg-vpb-grey-100'">Hôm nay</button>
            <button (click)="setRange('3days')" class="px-3 py-1.5 text-xs font-medium rounded-lg transition-colors"
              [class]="quickRange==='3days' ? 'bg-vpb-green-500 text-white' : 'text-vpb-grey-600 hover:bg-vpb-grey-100'">3 ngày</button>
            <button (click)="setRange('7days')" class="px-3 py-1.5 text-xs font-medium rounded-lg transition-colors"
              [class]="quickRange==='7days' ? 'bg-vpb-green-500 text-white' : 'text-vpb-grey-600 hover:bg-vpb-grey-100'">7 ngày</button>
            <button (click)="setRange('30days')" class="px-3 py-1.5 text-xs font-medium rounded-lg transition-colors"
              [class]="quickRange==='30days' ? 'bg-vpb-green-500 text-white' : 'text-vpb-grey-600 hover:bg-vpb-grey-100'">30 ngày</button>
          </div>
          <div class="flex gap-2 ml-auto">
            <button (click)="generateReport()" class="btn-primary text-sm flex items-center gap-1.5">
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

      <!-- ════════ REPORT TABS ════════ -->
      @if (hasData) {
        <!-- Tab buttons -->
        <div class="flex gap-1 bg-white rounded-xl border border-vpb-grey-200 p-1 shadow-sm">
          <button (click)="activeTab='overview'" class="tab-btn flex items-center gap-1.5"
            [class.active]="activeTab==='overview'">
            <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"/></svg>
            Tổng hợp
          </button>
          <button (click)="activeTab='timeseries'; renderTimeSeriesChart()" class="tab-btn flex items-center gap-1.5"
            [class.active]="activeTab==='timeseries'">
            <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 12l3-3 3 3 4-4M8 21l4-4 4 4M3 4h18M4 4h16v12a1 1 0 01-1 1H5a1 1 0 01-1-1V4z"/></svg>
            Chi tiết thời gian
          </button>
          <button (click)="activeTab='threshold'" class="tab-btn flex items-center gap-1.5"
            [class.active]="activeTab==='threshold'">
            <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z"/></svg>
            Ngưỡng cảnh báo
            @if (totalViolations > 0) {
              <span class="bg-red-500 text-white text-[10px] px-1.5 py-0.5 rounded-full">{{ totalViolations }}</span>
            }
          </button>
          <button (click)="activeTab='raw'" class="tab-btn flex items-center gap-1.5"
            [class.active]="activeTab==='raw'">
            <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4"/></svg>
            Dữ liệu gốc
          </button>
        </div>

        <!-- ──── TAB 1: OVERVIEW ──── -->
        @if (activeTab === 'overview') {
          <div class="space-y-4 animate-fade-in">
            @for (dev of summaryData; track dev.deviceId) {
              <div class="bg-white rounded-xl border border-vpb-grey-200 p-5 shadow-sm">
                <div class="flex items-center justify-between mb-4">
                  <div>
                    <h3 class="font-bold text-vpb-dark-700">{{ dev.deviceName }}</h3>
                    <span class="text-xs text-vpb-grey-500">{{ dev.province }} · {{ dev.gatewayIdentify }} · {{ dev.sampleCount }} mẫu dữ liệu</span>
                  </div>
                  <div class="text-right text-xs text-vpb-grey-500">
                    Ngưỡng T°: <span class="text-sky-600">{{ dev.tempLow }}°</span> – <span class="text-red-500">{{ dev.tempHigh }}°</span> ·
                    Ngưỡng H%: <span class="text-sky-600">{{ dev.humiLow }}%</span> – <span class="text-red-500">{{ dev.humiHigh }}%</span>
                  </div>
                </div>
                <!-- Stats grid -->
                <div class="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
                  <!-- Avg Temp -->
                  <div class="bg-vpb-grey-50 rounded-lg p-3 text-center">
                    <div class="text-[10px] font-semibold text-vpb-grey-500 uppercase tracking-wider">TB Nhiệt độ</div>
                    <div class="text-xl font-bold text-vpb-dark-700 mt-1">{{ dev.avgTemp | number:'1.1-1' }}°C</div>
                  </div>
                  <div class="bg-sky-50 rounded-lg p-3 text-center">
                    <div class="text-[10px] font-semibold text-sky-600 uppercase tracking-wider">Min Nhiệt độ</div>
                    <div class="text-xl font-bold text-sky-700 mt-1">{{ dev.minTemp | number:'1.1-1' }}°C</div>
                  </div>
                  <div class="bg-red-50 rounded-lg p-3 text-center">
                    <div class="text-[10px] font-semibold text-red-500 uppercase tracking-wider">Max Nhiệt độ</div>
                    <div class="text-xl font-bold text-red-600 mt-1">{{ dev.maxTemp | number:'1.1-1' }}°C</div>
                  </div>
                  <div class="bg-vpb-grey-50 rounded-lg p-3 text-center">
                    <div class="text-[10px] font-semibold text-vpb-grey-500 uppercase tracking-wider">TB Độ ẩm</div>
                    <div class="text-xl font-bold text-vpb-dark-700 mt-1">{{ dev.avgHumi | number:'1.1-1' }}%</div>
                  </div>
                  <div class="bg-sky-50 rounded-lg p-3 text-center">
                    <div class="text-[10px] font-semibold text-sky-600 uppercase tracking-wider">Min Độ ẩm</div>
                    <div class="text-xl font-bold text-sky-700 mt-1">{{ dev.minHumi | number:'1.1-1' }}%</div>
                  </div>
                  <div class="bg-amber-50 rounded-lg p-3 text-center">
                    <div class="text-[10px] font-semibold text-amber-600 uppercase tracking-wider">Max Độ ẩm</div>
                    <div class="text-xl font-bold text-amber-700 mt-1">{{ dev.maxHumi | number:'1.1-1' }}%</div>
                  </div>
                </div>
                <!-- Threshold violations row -->
                @if ((dev.overTempCount + dev.underTempCount + dev.overHumiCount + dev.underHumiCount) > 0) {
                  <div class="mt-3 pt-3 border-t border-vpb-grey-200 flex flex-wrap gap-3">
                    @if (dev.overTempCount > 0) {
                      <span class="inline-flex items-center gap-1 text-xs font-medium text-red-600 bg-red-50 border border-red-200 px-2.5 py-1 rounded-full">
                        🔺 Vượt T° cao: {{ dev.overTempCount }} lần
                      </span>
                    }
                    @if (dev.underTempCount > 0) {
                      <span class="inline-flex items-center gap-1 text-xs font-medium text-sky-600 bg-sky-50 border border-sky-200 px-2.5 py-1 rounded-full">
                        🔻 Dưới T° thấp: {{ dev.underTempCount }} lần
                      </span>
                    }
                    @if (dev.overHumiCount > 0) {
                      <span class="inline-flex items-center gap-1 text-xs font-medium text-amber-600 bg-amber-50 border border-amber-200 px-2.5 py-1 rounded-full">
                        🔺 Vượt H% cao: {{ dev.overHumiCount }} lần
                      </span>
                    }
                    @if (dev.underHumiCount > 0) {
                      <span class="inline-flex items-center gap-1 text-xs font-medium text-sky-600 bg-sky-50 border border-sky-200 px-2.5 py-1 rounded-full">
                        🔻 Dưới H% thấp: {{ dev.underHumiCount }} lần
                      </span>
                    }
                  </div>
                }
              </div>
            } @empty {
              <div class="bg-white rounded-xl border border-vpb-grey-200 p-12 text-center text-vpb-grey-500">
                Không có dữ liệu. Vui lòng chọn thiết bị/tỉnh và nhấn "Tạo báo cáo".
              </div>
            }
          </div>
        }

        <!-- ──── TAB 2: TIME SERIES ──── -->
        @if (activeTab === 'timeseries') {
          <div class="space-y-4 animate-fade-in">
            <div class="bg-white rounded-xl border border-vpb-grey-200 p-5 shadow-sm">
              <div class="flex items-center justify-between mb-4">
                <h3 class="font-semibold text-vpb-dark-700 flex items-center gap-2">
                  <svg class="w-5 h-5 text-vpb-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 12l3-3 3 3 4-4"/></svg>
                  Biểu đồ nhiệt độ & độ ẩm
                </h3>
                <div class="flex gap-3 text-[10px] font-medium">
                  <span class="flex items-center gap-1"><span class="w-3 h-0.5 bg-red-500 inline-block"></span> Nhiệt độ</span>
                  <span class="flex items-center gap-1"><span class="w-3 h-0.5 bg-vpb-green-500 inline-block"></span> Độ ẩm</span>
                  <span class="flex items-center gap-1"><span class="w-6 h-0 border-t-2 border-dashed border-red-300 inline-block"></span> Ngưỡng T°</span>
                  <span class="flex items-center gap-1"><span class="w-6 h-0 border-t-2 border-dashed border-amber-400 inline-block"></span> Ngưỡng H%</span>
                </div>
              </div>
              <div class="h-72 md:h-96">
                <canvas #tsChart></canvas>
              </div>
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
                      <th class="table-header">TB T°</th>
                      <th class="table-header">Min T°</th>
                      <th class="table-header">Max T°</th>
                      <th class="table-header">TB H%</th>
                      <th class="table-header">Min H%</th>
                      <th class="table-header">Max H%</th>
                      <th class="table-header">Mẫu</th>
                    </tr>
                  </thead>
                  <tbody>
                    @for (row of reportData; track $index) {
                      <tr class="table-row">
                        <td class="table-cell font-mono text-xs">{{ row.timeBucket | date:'dd/MM HH:mm' }}</td>
                        <td class="table-cell text-xs text-vpb-green-600 font-medium">{{ row.deviceName }}</td>
                        <td class="table-cell font-semibold">{{ row.avgTemp | number:'1.1-1' }}</td>
                        <td class="table-cell text-xs" [class.text-sky-600]="row.minTemp < row.tempLow" [class.text-vpb-grey-600]="row.minTemp >= row.tempLow">{{ row.minTemp | number:'1.1-1' }}</td>
                        <td class="table-cell text-xs" [class.text-red-500]="row.maxTemp > row.tempHigh" [class.text-vpb-grey-600]="row.maxTemp <= row.tempHigh">{{ row.maxTemp | number:'1.1-1' }}</td>
                        <td class="table-cell font-semibold">{{ row.avgHumi | number:'1.1-1' }}</td>
                        <td class="table-cell text-xs" [class.text-sky-600]="row.minHumi < row.humiLow">{{ row.minHumi | number:'1.1-1' }}</td>
                        <td class="table-cell text-xs" [class.text-amber-600]="row.maxHumi > row.humiHigh">{{ row.maxHumi | number:'1.1-1' }}</td>
                        <td class="table-cell text-xs text-vpb-grey-500">{{ row.sampleCount }}</td>
                      </tr>
                    }
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        }

        <!-- ──── TAB 3: THRESHOLD VIOLATIONS ──── -->
        @if (activeTab === 'threshold') {
          <div class="space-y-4 animate-fade-in">
            <!-- Summary cards -->
            <div class="grid grid-cols-2 md:grid-cols-4 gap-3">
              <div class="bg-white rounded-xl border border-red-200 p-4 text-center">
                <div class="text-[10px] font-semibold text-red-500 uppercase tracking-wider">Vượt T° cao</div>
                <div class="text-2xl font-bold text-red-600 mt-1">{{ totalOverTemp }}</div>
              </div>
              <div class="bg-white rounded-xl border border-sky-200 p-4 text-center">
                <div class="text-[10px] font-semibold text-sky-500 uppercase tracking-wider">Dưới T° thấp</div>
                <div class="text-2xl font-bold text-sky-600 mt-1">{{ totalUnderTemp }}</div>
              </div>
              <div class="bg-white rounded-xl border border-amber-200 p-4 text-center">
                <div class="text-[10px] font-semibold text-amber-500 uppercase tracking-wider">Vượt H% cao</div>
                <div class="text-2xl font-bold text-amber-600 mt-1">{{ totalOverHumi }}</div>
              </div>
              <div class="bg-white rounded-xl border border-sky-200 p-4 text-center">
                <div class="text-[10px] font-semibold text-sky-500 uppercase tracking-wider">Dưới H% thấp</div>
                <div class="text-2xl font-bold text-sky-600 mt-1">{{ totalUnderHumi }}</div>
              </div>
            </div>

            <!-- Per-device violations -->
            @for (dev of summaryData; track dev.deviceId) {
              @if ((dev.overTempCount + dev.underTempCount + dev.overHumiCount + dev.underHumiCount) > 0) {
                <div class="bg-white rounded-xl border border-vpb-grey-200 p-5 shadow-sm">
                  <div class="flex items-center justify-between mb-3">
                    <div>
                      <h4 class="font-bold text-vpb-dark-700">{{ dev.deviceName }}</h4>
                      <span class="text-xs text-vpb-grey-500">{{ dev.province }} · Ngưỡng: {{ dev.tempLow }}° – {{ dev.tempHigh }}°C, {{ dev.humiLow }}% – {{ dev.humiHigh }}%</span>
                    </div>
                  </div>
                  <div class="grid grid-cols-2 md:grid-cols-4 gap-3">
                    <div class="rounded-lg p-3" [class]="dev.overTempCount > 0 ? 'bg-red-50 border border-red-200' : 'bg-vpb-grey-50'">
                      <div class="text-[10px] font-medium text-vpb-grey-500">T° > {{ dev.tempHigh }}°C</div>
                      <div class="text-lg font-bold" [class]="dev.overTempCount > 0 ? 'text-red-600' : 'text-vpb-grey-400'">{{ dev.overTempCount }}</div>
                      <div class="text-[10px] text-vpb-grey-500">Max: {{ dev.maxTemp | number:'1.1-1' }}°C</div>
                    </div>
                    <div class="rounded-lg p-3" [class]="dev.underTempCount > 0 ? 'bg-sky-50 border border-sky-200' : 'bg-vpb-grey-50'">
                      <div class="text-[10px] font-medium text-vpb-grey-500">T° < {{ dev.tempLow }}°C</div>
                      <div class="text-lg font-bold" [class]="dev.underTempCount > 0 ? 'text-sky-600' : 'text-vpb-grey-400'">{{ dev.underTempCount }}</div>
                      <div class="text-[10px] text-vpb-grey-500">Min: {{ dev.minTemp | number:'1.1-1' }}°C</div>
                    </div>
                    <div class="rounded-lg p-3" [class]="dev.overHumiCount > 0 ? 'bg-amber-50 border border-amber-200' : 'bg-vpb-grey-50'">
                      <div class="text-[10px] font-medium text-vpb-grey-500">H% > {{ dev.humiHigh }}%</div>
                      <div class="text-lg font-bold" [class]="dev.overHumiCount > 0 ? 'text-amber-600' : 'text-vpb-grey-400'">{{ dev.overHumiCount }}</div>
                      <div class="text-[10px] text-vpb-grey-500">Max: {{ dev.maxHumi | number:'1.1-1' }}%</div>
                    </div>
                    <div class="rounded-lg p-3" [class]="dev.underHumiCount > 0 ? 'bg-sky-50 border border-sky-200' : 'bg-vpb-grey-50'">
                      <div class="text-[10px] font-medium text-vpb-grey-500">H% < {{ dev.humiLow }}%</div>
                      <div class="text-lg font-bold" [class]="dev.underHumiCount > 0 ? 'text-sky-600' : 'text-vpb-grey-400'">{{ dev.underHumiCount }}</div>
                      <div class="text-[10px] text-vpb-grey-500">Min: {{ dev.minHumi | number:'1.1-1' }}%</div>
                    </div>
                  </div>
                </div>
              }
            }
            @if (totalViolations === 0) {
              <div class="bg-vpb-green-50 rounded-xl border border-vpb-green-200 p-8 text-center">
                <svg class="w-12 h-12 mx-auto text-vpb-green-500 mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
                <p class="font-semibold text-vpb-green-700">Tất cả giá trị trong ngưỡng cho phép!</p>
                <p class="text-sm text-vpb-green-600 mt-1">Không có vi phạm ngưỡng trong khoảng thời gian này.</p>
              </div>
            }
          </div>
        }

        <!-- ──── TAB 4: RAW DATA ──── -->
        @if (activeTab === 'raw') {
          <div class="bg-white rounded-xl border border-vpb-grey-200 shadow-sm overflow-hidden animate-fade-in">
            <div class="px-4 py-3 border-b border-vpb-grey-200 flex items-center justify-between">
              <h3 class="font-semibold text-sm text-vpb-dark-700">Dữ liệu gốc ({{ totalCount }} bản ghi)</h3>
              <div class="flex gap-2 items-center text-sm">
                <button (click)="prevPage()" [disabled]="page <= 1" class="btn-ghost text-xs px-2 py-1" [class.opacity-50]="page <= 1">← Trước</button>
                <span class="text-xs text-vpb-grey-500">{{ page }}/{{ totalPages }}</span>
                <button (click)="nextPage()" [disabled]="page >= totalPages" class="btn-ghost text-xs px-2 py-1" [class.opacity-50]="page >= totalPages">Sau →</button>
              </div>
            </div>
            <div class="overflow-x-auto max-h-[500px]">
              <table class="w-full">
                <thead class="bg-vpb-grey-50 sticky top-0">
                  <tr>
                    <th class="table-header">Thiết bị</th>
                    <th class="table-header">Nhiệt độ</th>
                    <th class="table-header">Độ ẩm</th>
                    <th class="table-header">Thời gian</th>
                  </tr>
                </thead>
                <tbody>
                  @for (log of dataLogs; track log.id) {
                    <tr class="table-row">
                      <td class="table-cell text-sm font-medium">{{ log.deviceName }}</td>
                      <td class="table-cell font-mono text-sm">{{ log.temperature | number:'1.1-1' }}°C</td>
                      <td class="table-cell font-mono text-sm">{{ log.humidity | number:'1.1-1' }}%</td>
                      <td class="table-cell text-vpb-grey-500 text-xs">{{ log.createdAt | date:'dd/MM/yyyy HH:mm:ss' }}</td>
                    </tr>
                  } @empty {
                    <tr><td colspan="4" class="table-cell text-center text-vpb-grey-500 py-12">Không có dữ liệu</td></tr>
                  }
                </tbody>
              </table>
            </div>
          </div>
        }
      }

      <!-- Empty state -->
      @if (!hasData && !loading) {
        <div class="bg-white rounded-xl border border-vpb-grey-200 p-16 text-center shadow-sm">
          <svg class="w-16 h-16 mx-auto text-vpb-grey-300 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/></svg>
          <h3 class="font-semibold text-vpb-dark-700 text-lg">Chọn bộ lọc để tạo báo cáo</h3>
          <p class="text-vpb-grey-500 text-sm mt-2">Chọn tỉnh/thành phố, thiết bị, khoảng thời gian rồi nhấn "Tạo báo cáo"</p>
        </div>
      }

      @if (loading) {
        <div class="bg-white rounded-xl border border-vpb-grey-200 p-16 text-center shadow-sm">
          <svg class="animate-spin w-8 h-8 mx-auto text-vpb-green-500 mb-3" fill="none" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"></path></svg>
          <p class="text-vpb-grey-600">Đang tải báo cáo...</p>
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
  selectedDeviceId: number | null = null;
  dateFrom = '';
  dateTo = '';
  interval = 'hour';
  quickRange = 'today';

  // Data
  summaryData: any[] = [];
  reportData: any[] = [];
  dataLogs: any[] = [];
  activeTab = 'overview';
  loading = false;
  hasData = false;

  // Raw data pagination
  page = 1;
  pageSize = 50;
  totalCount = 0;
  totalPages = 1;

  // Threshold counts
  totalOverTemp = 0;
  totalUnderTemp = 0;
  totalOverHumi = 0;
  totalUnderHumi = 0;
  totalViolations = 0;

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
    this.selectedDeviceId = null;
    if (this.selectedProvinceId) {
      this.filteredDevices = this.devices.filter(d => d.provinceId === this.selectedProvinceId);
    } else {
      this.filteredDevices = this.devices;
    }
  }

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

  generateReport() {
    this.loading = true;
    this.hasData = false;
    const params: any = { from: this.dateFrom, to: this.dateTo, interval: this.interval };
    if (this.selectedDeviceId) params.deviceId = this.selectedDeviceId;
    if (this.selectedProvinceId) params.provinceId = this.selectedProvinceId;

    // Load summary + report data in parallel
    this.api.getReportSummary(params).subscribe(data => {
      this.summaryData = data;
      this.calcViolations();
    });

    this.api.getReportData(params).subscribe(data => {
      this.reportData = data;
      this.hasData = data.length > 0 || this.summaryData.length > 0;
      this.loading = false;
      if (this.activeTab === 'timeseries') {
        setTimeout(() => this.renderTimeSeriesChart(), 200);
      }
    });

    // Also load raw data
    this.loadRawData();
  }

  private loadRawData() {
    const params: any = {
      from: this.dateFrom, to: this.dateTo,
      page: this.page, pageSize: this.pageSize
    };
    if (this.selectedDeviceId) params.deviceId = this.selectedDeviceId;
    this.api.getDataLogs(params).subscribe(res => {
      this.dataLogs = res.items || [];
      this.totalCount = res.totalCount;
      this.totalPages = Math.ceil(this.totalCount / this.pageSize);
      if (!this.hasData && this.dataLogs.length > 0) this.hasData = true;
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

  renderTimeSeriesChart() {
    if (typeof Chart === 'undefined' || !this.tsChartRef || this.reportData.length === 0) return;
    this.tsChart?.destroy();

    const labels = this.reportData.map(d => {
      const dt = new Date(d.timeBucket);
      return this.interval === 'hour'
        ? dt.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })
        : dt.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit' });
    });

    // Get threshold values from first data point
    const th = this.reportData[0] || {};
    const tempHigh = th.tempHigh ?? 35;
    const tempLow = th.tempLow ?? 10;
    const humiHigh = th.humiHigh ?? 80;
    const humiLow = th.humiLow ?? 30;

    const datasets: any[] = [
      {
        label: 'TB Nhiệt độ (°C)',
        data: this.reportData.map(d => d.avgTemp),
        borderColor: '#E31B23',
        backgroundColor: 'rgba(227,27,35,0.06)',
        borderWidth: 2, fill: true, tension: 0.4, yAxisID: 'yTemp',
      },
      {
        label: 'TB Độ ẩm (%)',
        data: this.reportData.map(d => d.avgHumi),
        borderColor: '#00A651',
        backgroundColor: 'rgba(0,166,81,0.06)',
        borderWidth: 2, fill: true, tension: 0.4, yAxisID: 'yHumi',
      },
      // Threshold lines
      {
        label: `Ngưỡng T° cao (${tempHigh}°C)`,
        data: Array(labels.length).fill(tempHigh),
        borderColor: 'rgba(227,27,35,0.5)',
        borderWidth: 1.5, borderDash: [6, 4],
        pointRadius: 0, fill: false, yAxisID: 'yTemp',
      },
      {
        label: `Ngưỡng T° thấp (${tempLow}°C)`,
        data: Array(labels.length).fill(tempLow),
        borderColor: 'rgba(56,189,248,0.5)',
        borderWidth: 1.5, borderDash: [6, 4],
        pointRadius: 0, fill: false, yAxisID: 'yTemp',
      },
      {
        label: `Ngưỡng H% cao (${humiHigh}%)`,
        data: Array(labels.length).fill(humiHigh),
        borderColor: 'rgba(245,158,11,0.5)',
        borderWidth: 1.5, borderDash: [6, 4],
        pointRadius: 0, fill: false, yAxisID: 'yHumi',
      },
      {
        label: `Ngưỡng H% thấp (${humiLow}%)`,
        data: Array(labels.length).fill(humiLow),
        borderColor: 'rgba(56,189,248,0.4)',
        borderWidth: 1.5, borderDash: [6, 4],
        pointRadius: 0, fill: false, yAxisID: 'yHumi',
      },
    ];

    this.tsChart = new Chart(this.tsChartRef.nativeElement, {
      type: 'line',
      data: { labels, datasets },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            labels: { color: '#5E6D7F', font: { size: 10 }, usePointStyle: true, padding: 16 },
            position: 'bottom' as const,
          },
          tooltip: {
            mode: 'index' as const, intersect: false,
            backgroundColor: 'rgba(30,51,80,0.9)',
            titleFont: { size: 11 }, bodyFont: { size: 11 },
          },
        },
        scales: {
          x: {
            grid: { color: 'rgba(0,0,0,0.04)' },
            ticks: { color: '#5E6D7F', font: { size: 10 }, maxTicksLimit: 14 },
          },
          yTemp: {
            type: 'linear' as const, position: 'left' as const, display: true,
            title: { display: true, text: 'Nhiệt độ (°C)', color: '#E31B23', font: { size: 11 } },
            grid: { color: 'rgba(0,0,0,0.04)' },
            ticks: { color: '#5E6D7F', font: { size: 10 } },
          },
          yHumi: {
            type: 'linear' as const, position: 'right' as const, display: true,
            title: { display: true, text: 'Độ ẩm (%)', color: '#00A651', font: { size: 11 } },
            grid: { drawOnChartArea: false },
            ticks: { color: '#5E6D7F', font: { size: 10 } },
          },
        },
        interaction: { intersect: false, mode: 'index' as const },
        elements: { point: { radius: 2, hoverRadius: 5 } },
      },
    });
  }

  exportCSV() {
    const lines: string[] = [];
    // Header
    lines.push(`BÁO CÁO IOT - VPBank`);
    lines.push(`Ngày xuất: ${new Date().toLocaleString('vi-VN')}`);
    lines.push(`Khoảng thời gian: ${this.dateFrom} - ${this.dateTo}`);
    if (this.selectedProvinceId) {
      const prov = this.provinces.find(p => p.id === this.selectedProvinceId);
      lines.push(`Tỉnh/Thành phố: ${prov?.name || ''}`);
    }
    lines.push('');

    // Summary section
    lines.push('=== TỔNG HỢP THEO THIẾT BỊ ===');
    lines.push('Thiết bị,Tỉnh,TB Nhiệt độ,Min T°,Max T°,TB Độ ẩm,Min H%,Max H%,Số mẫu,Ngưỡng T° cao,Ngưỡng T° thấp,Ngưỡng H% cao,Ngưỡng H% thấp,Vượt T° cao,Dưới T° thấp,Vượt H% cao,Dưới H% thấp');
    for (const d of this.summaryData) {
      lines.push([
        d.deviceName, d.province,
        d.avgTemp?.toFixed(1), d.minTemp?.toFixed(1), d.maxTemp?.toFixed(1),
        d.avgHumi?.toFixed(1), d.minHumi?.toFixed(1), d.maxHumi?.toFixed(1),
        d.sampleCount,
        d.tempHigh, d.tempLow, d.humiHigh, d.humiLow,
        d.overTempCount, d.underTempCount, d.overHumiCount, d.underHumiCount
      ].join(','));
    }
    lines.push('');

    // Time series section
    lines.push('=== DỮ LIỆU THEO THỜI GIAN ===');
    lines.push('Thời gian,Thiết bị,TB T°,Min T°,Max T°,TB H%,Min H%,Max H%,Số mẫu');
    for (const r of this.reportData) {
      const time = new Date(r.timeBucket).toLocaleString('vi-VN');
      lines.push([
        time, r.deviceName,
        r.avgTemp?.toFixed(1), r.minTemp?.toFixed(1), r.maxTemp?.toFixed(1),
        r.avgHumi?.toFixed(1), r.minHumi?.toFixed(1), r.maxHumi?.toFixed(1),
        r.sampleCount
      ].join(','));
    }

    const bom = '\uFEFF';
    const blob = new Blob([bom + lines.join('\n')], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `VPBank_IoT_Report_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  prevPage() { if (this.page > 1) { this.page--; this.loadRawData(); } }
  nextPage() { if (this.page < this.totalPages) { this.page++; this.loadRawData(); } }
}
