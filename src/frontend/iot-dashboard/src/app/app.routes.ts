import { Routes } from '@angular/router';
import { authGuard } from './core/guards/auth.guard';

export const routes: Routes = [
  { path: 'login', loadComponent: () => import('./pages/login/login.component').then(m => m.LoginComponent) },
  {
    path: '',
    loadComponent: () => import('./layout/layout.component').then(m => m.LayoutComponent),
    canActivate: [authGuard],
    children: [
      { path: '', redirectTo: 'dashboard', pathMatch: 'full' },
      { path: 'dashboard', loadComponent: () => import('./pages/dashboard/dashboard.component').then(m => m.DashboardComponent) },
      { path: 'devices', loadComponent: () => import('./pages/devices/devices.component').then(m => m.DevicesComponent) },
      { path: 'devices/:id', loadComponent: () => import('./pages/device-detail/device-detail.component').then(m => m.DeviceDetailComponent) },
      { path: 'alarms', loadComponent: () => import('./pages/alarms/alarms.component').then(m => m.AlarmsComponent) },
      { path: 'reports', loadComponent: () => import('./pages/reports/reports.component').then(m => m.ReportsComponent) },
    ]
  },
  { path: '**', redirectTo: '' }
];
