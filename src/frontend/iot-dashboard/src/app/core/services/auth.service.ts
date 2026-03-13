import { Injectable, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { environment } from '../../../environments/environment';
import { tap, catchError, of } from 'rxjs';

export interface AuthUser {
  id: string;
  username: string;
  fullName: string;
  email?: string;
  role: string;
  provinceId?: number;
  assignedDeviceIds?: number[];
}

export interface LoginResponse {
  accessToken: string;
  refreshToken: string;
  user: AuthUser;
}

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly API = environment.apiUrl;
  currentUser = signal<AuthUser | null>(null);
  isAuthenticated = signal(false);

  constructor(private http: HttpClient, private router: Router) {
    this.loadFromStorage();
  }

  login(username: string, password: string) {
    return this.http.post<LoginResponse>(`${this.API}/auth/login`, { username, password })
      .pipe(tap(res => {
        localStorage.setItem('accessToken', res.accessToken);
        localStorage.setItem('refreshToken', res.refreshToken);
        localStorage.setItem('user', JSON.stringify(res.user));
        this.currentUser.set(res.user);
        this.isAuthenticated.set(true);
      }));
  }

  refreshToken() {
    const accessToken = localStorage.getItem('accessToken');
    const refreshToken = localStorage.getItem('refreshToken');
    if (!accessToken || !refreshToken) return of(null);

    return this.http.post<{ accessToken: string; refreshToken: string }>(
      `${this.API}/auth/refresh`, { accessToken, refreshToken }
    ).pipe(
      tap(res => {
        localStorage.setItem('accessToken', res.accessToken);
        localStorage.setItem('refreshToken', res.refreshToken);
      }),
      catchError(() => {
        this.logout();
        return of(null);
      })
    );
  }

  logout() {
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
    localStorage.removeItem('user');
    this.currentUser.set(null);
    this.isAuthenticated.set(false);
    this.router.navigate(['/login']);
  }

  getToken(): string | null {
    return localStorage.getItem('accessToken');
  }

  hasRole(role: string): boolean {
    return this.currentUser()?.role === role;
  }

  hasAnyRole(...roles: string[]): boolean {
    const userRole = this.currentUser()?.role;
    return userRole ? roles.includes(userRole) : false;
  }

  isAdmin(): boolean {
    return this.hasRole('Admin');
  }

  isViewer(): boolean {
    return this.hasRole('Viewer');
  }

  canAccessDevice(deviceId: number): boolean {
    const user = this.currentUser();
    if (!user) return false;
    if (user.role === 'Admin' || user.role === 'Operator') return true;
    return user.assignedDeviceIds?.includes(deviceId) ?? false;
  }

  private loadFromStorage() {
    const token = localStorage.getItem('accessToken');
    const userStr = localStorage.getItem('user');
    if (token && userStr) {
      try {
        this.currentUser.set(JSON.parse(userStr));
        this.isAuthenticated.set(true);
      } catch { this.logout(); }
    }
  }
}

