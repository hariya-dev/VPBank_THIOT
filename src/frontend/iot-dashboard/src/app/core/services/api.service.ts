import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

@Injectable({ providedIn: 'root' })
export class ApiService {
  private readonly API = environment.apiUrl;

  constructor(private http: HttpClient) {}

  // ── Provinces ──
  getProvinces(): Observable<any[]> {
    return this.http.get<any[]>(`${this.API}/provinces`);
  }

  createProvince(data: any): Observable<any> {
    return this.http.post(`${this.API}/provinces`, data);
  }

  updateProvince(id: number, data: any): Observable<any> {
    return this.http.put(`${this.API}/provinces/${id}`, data);
  }

  deleteProvince(id: number): Observable<any> {
    return this.http.delete(`${this.API}/provinces/${id}`);
  }

  // ── Devices ──
  getDevices(params?: { provinceId?: number; status?: string; search?: string }): Observable<any[]> {
    let httpParams = new HttpParams();
    if (params?.provinceId) httpParams = httpParams.set('provinceId', params.provinceId);
    if (params?.status) httpParams = httpParams.set('status', params.status);
    if (params?.search) httpParams = httpParams.set('search', params.search);
    return this.http.get<any[]>(`${this.API}/devices`, { params: httpParams });
  }

  getDevice(id: number): Observable<any> {
    return this.http.get(`${this.API}/devices/${id}`);
  }

  createDevice(data: any): Observable<any> {
    return this.http.post(`${this.API}/devices`, data);
  }

  updateDevice(id: number, data: any): Observable<any> {
    return this.http.put(`${this.API}/devices/${id}`, data);
  }

  deleteDevice(id: number): Observable<any> {
    return this.http.delete(`${this.API}/devices/${id}`);
  }

  getDeviceSettings(id: number): Observable<any> {
    return this.http.get(`${this.API}/devices/${id}/settings`);
  }

  updateDeviceSettings(id: number, data: any): Observable<any> {
    return this.http.put(`${this.API}/devices/${id}/settings`, data);
  }

  // ── Telemetry ──
  getLiveTelemetry(): Observable<any[]> {
    return this.http.get<any[]>(`${this.API}/telemetry/live`);
  }

  getDeviceTelemetry(gatewayId: string): Observable<any> {
    return this.http.get(`${this.API}/telemetry/live/${gatewayId}`);
  }

  getDashboard(): Observable<any> {
    return this.http.get(`${this.API}/telemetry/dashboard`);
  }

  // ── Alarms ──
  getActiveAlarms(): Observable<any[]> {
    return this.http.get<any[]>(`${this.API}/alarms/active`);
  }

  getAlarms(params?: any): Observable<any> {
    let httpParams = new HttpParams();
    if (params) {
      Object.keys(params).forEach(key => {
        if (params[key] !== null && params[key] !== undefined)
          httpParams = httpParams.set(key, params[key]);
      });
    }
    return this.http.get(`${this.API}/alarms`, { params: httpParams });
  }

  acknowledgeAlarm(id: number): Observable<any> {
    return this.http.post(`${this.API}/alarms/${id}/acknowledge`, {});
  }

  resolveAlarm(id: number): Observable<any> {
    return this.http.post(`${this.API}/alarms/${id}/resolve`, {});
  }

  // ── DataLogs ──
  getDataLogs(params: any): Observable<any> {
    let httpParams = new HttpParams();
    Object.keys(params).forEach(key => {
      if (params[key] !== null && params[key] !== undefined)
        httpParams = httpParams.set(key, params[key]);
    });
    return this.http.get(`${this.API}/datalogs`, { params: httpParams });
  }

  getChartData(deviceId: number, from: string, to: string, interval = 'hour'): Observable<any[]> {
    return this.http.get<any[]>(`${this.API}/datalogs/chart`, {
      params: { deviceId, from, to, interval }
    });
  }

  exportData(params: any): Observable<any[]> {
    let httpParams = new HttpParams();
    Object.keys(params).forEach(key => {
      if (params[key]) httpParams = httpParams.set(key, params[key]);
    });
    return this.http.get<any[]>(`${this.API}/datalogs/export`, { params: httpParams });
  }

  // ── Advanced Reports ──
  getReportData(params: any): Observable<any[]> {
    let httpParams = new HttpParams();
    Object.keys(params).forEach(key => {
      if (params[key] !== null && params[key] !== undefined)
        httpParams = httpParams.set(key, params[key]);
    });
    return this.http.get<any[]>(`${this.API}/datalogs/report`, { params: httpParams });
  }

  getReportSummary(params: any): Observable<any[]> {
    let httpParams = new HttpParams();
    Object.keys(params).forEach(key => {
      if (params[key] !== null && params[key] !== undefined)
        httpParams = httpParams.set(key, params[key]);
    });
    return this.http.get<any[]>(`${this.API}/datalogs/summary`, { params: httpParams });
  }

  getAlarmReport(params: any): Observable<any> {
    let httpParams = new HttpParams();
    Object.keys(params).forEach(key => {
      if (params[key] !== null && params[key] !== undefined)
        httpParams = httpParams.set(key, params[key]);
    });
    return this.http.get(`${this.API}/datalogs/alarm-report`, { params: httpParams });
  }

  // ── Users (Admin only) ──
  getUsers(): Observable<any[]> {
    return this.http.get<any[]>(`${this.API}/users`);
  }

  getUser(id: string): Observable<any> {
    return this.http.get(`${this.API}/users/${id}`);
  }

  createUser(data: any): Observable<any> {
    return this.http.post(`${this.API}/auth/register`, data);
  }

  updateUser(id: string, data: any): Observable<any> {
    return this.http.put(`${this.API}/users/${id}`, data);
  }

  deleteUser(id: string): Observable<any> {
    return this.http.delete(`${this.API}/users/${id}`);
  }

  getUserDevices(userId: string): Observable<any[]> {
    return this.http.get<any[]>(`${this.API}/users/${userId}/devices`);
  }

  setUserDevices(userId: string, deviceIds: number[]): Observable<any> {
    return this.http.put(`${this.API}/users/${userId}/devices`, { deviceIds });
  }
}
