import { Component, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { TranslateModule } from '@ngx-translate/core';
import { AuthService } from '../../core/services/auth.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, FormsModule, TranslateModule],
  template: `
    <div class="min-h-screen flex items-center justify-center bg-gradient-to-br from-vpb-green-50 via-white to-vpb-grey-100 p-4 relative overflow-hidden">
      <!-- Subtle decorative elements -->
      <div class="absolute inset-0 pointer-events-none">
        <div class="absolute top-0 right-0 w-[500px] h-[500px] bg-vpb-green-100/40 rounded-full blur-3xl -translate-y-1/3 translate-x-1/3"></div>
        <div class="absolute bottom-0 left-0 w-[400px] h-[400px] bg-vpb-green-50/60 rounded-full blur-3xl translate-y-1/3 -translate-x-1/3"></div>
      </div>

      <div class="relative w-full max-w-md">
        <!-- Card -->
        <div class="bg-white rounded-2xl border border-vpb-grey-200 p-8 shadow-xl shadow-vpb-grey-300/20 animate-fade-in">
          <!-- Logo -->
          <div class="text-center mb-8">
            <div class="inline-flex items-center justify-center w-16 h-16 bg-vpb-green-500 rounded-2xl mb-4 shadow-lg shadow-vpb-green-500/20">
              <svg class="w-9 h-9 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 3v2m6-2v2M9 19v2m6-2v2M5 9H3m2 6H3m18-6h-2m2 6h-2M7 19h10a2 2 0 002-2V7a2 2 0 00-2-2H7a2 2 0 00-2 2v10a2 2 0 002 2zM9 9h6v6H9V9z"/>
              </svg>
            </div>
            <h1 class="text-2xl font-bold text-vpb-dark-700">VPBank IoT</h1>
            <p class="text-vpb-grey-600 mt-1 text-sm">Real-time Monitoring System</p>
          </div>

          <!-- Form -->
          <form (ngSubmit)="onLogin()" class="space-y-5">
            <div>
              <label class="block text-sm font-medium text-vpb-dark-600 mb-1.5">{{ 'AUTH.USERNAME' | translate }}</label>
              <input type="text" [(ngModel)]="username" name="username" class="input-field" placeholder="admin" autofocus required />
            </div>

            <div>
              <label class="block text-sm font-medium text-vpb-dark-600 mb-1.5">{{ 'AUTH.PASSWORD' | translate }}</label>
              <input type="password" [(ngModel)]="password" name="password" class="input-field" placeholder="••••••••" required />
            </div>

            @if (error()) {
              <div class="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-lg text-sm animate-fade-in">
                {{ error() }}
              </div>
            }

            <button type="submit" [disabled]="loading()"
                    class="w-full py-3 bg-vpb-green-500 hover:bg-vpb-green-600 active:bg-vpb-green-700 text-white rounded-lg font-semibold transition-all duration-200 active:scale-[0.98] focus:ring-2 focus:ring-vpb-green-300 focus:ring-offset-2 focus:outline-none shadow-md shadow-vpb-green-500/15 flex items-center justify-center gap-2">
              @if (loading()) {
                <svg class="animate-spin w-5 h-5" fill="none" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"></path></svg>
              }
              {{ 'AUTH.SIGN_IN' | translate }}
            </button>
          </form>
        </div>

        <!-- Footer -->
        <p class="text-center text-vpb-grey-500 text-xs mt-6">© 2026 VPBank. IoT Monitoring System v1.0</p>
      </div>
    </div>
  `
})
export class LoginComponent {
  username = '';
  password = '';
  loading = signal(false);
  error = signal('');

  constructor(private auth: AuthService, private router: Router) {}

  onLogin() {
    this.loading.set(true);
    this.error.set('');
    this.auth.login(this.username, this.password).subscribe({
      next: () => {
        this.loading.set(false);
        this.router.navigate(['/dashboard']);
      },
      error: (err) => {
        this.loading.set(false);
        this.error.set(err.error?.message || 'Login failed');
      }
    });
  }
}
