import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../../core/services/api.service';
import { AuthService } from '../../core/services/auth.service';

@Component({
  selector: 'app-users',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="p-4 md:p-6 max-w-7xl mx-auto">
      <!-- Header -->
      <div class="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
        <div>
          <h1 class="text-2xl font-bold text-vpb-dark-700">Quản lý người dùng</h1>
          <p class="text-vpb-grey-500 mt-1">Quản lý tài khoản và phân quyền thiết bị</p>
        </div>
        <button (click)="openCreateModal()" class="bg-vpb-green-500 text-white px-4 py-2.5 rounded-xl font-medium hover:bg-vpb-green-600 transition-colors flex items-center gap-2 shadow-sm">
          <svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"/></svg>
          Thêm người dùng
        </button>
      </div>

      <!-- Users Table -->
      <div class="bg-white rounded-2xl shadow-sm border border-vpb-grey-200 overflow-hidden">
        <div class="overflow-x-auto">
          <table class="w-full">
            <thead>
              <tr class="border-b border-vpb-grey-200 bg-vpb-grey-50">
                <th class="text-left py-3 px-4 text-xs font-semibold text-vpb-grey-500 uppercase tracking-wider">Tên đăng nhập</th>
                <th class="text-left py-3 px-4 text-xs font-semibold text-vpb-grey-500 uppercase tracking-wider">Họ tên</th>
                <th class="text-left py-3 px-4 text-xs font-semibold text-vpb-grey-500 uppercase tracking-wider">Email</th>
                <th class="text-left py-3 px-4 text-xs font-semibold text-vpb-grey-500 uppercase tracking-wider">Vai trò</th>
                <th class="text-left py-3 px-4 text-xs font-semibold text-vpb-grey-500 uppercase tracking-wider">Thiết bị</th>
                <th class="text-right py-3 px-4 text-xs font-semibold text-vpb-grey-500 uppercase tracking-wider">Thao tác</th>
              </tr>
            </thead>
            <tbody>
              @for (user of users; track user.id) {
                <tr class="border-b border-vpb-grey-100 hover:bg-vpb-grey-50 transition-colors">
                  <td class="py-3 px-4">
                    <div class="flex items-center gap-3">
                      <div class="w-8 h-8 rounded-full flex items-center justify-center text-white font-medium text-sm"
                           [class]="getRoleBgClass(user.role)">
                        {{ user.fullName?.charAt(0) || 'U' }}
                      </div>
                      <span class="font-medium text-vpb-dark-700">{{ user.username }}</span>
                    </div>
                  </td>
                  <td class="py-3 px-4 text-vpb-dark-600">{{ user.fullName }}</td>
                  <td class="py-3 px-4 text-vpb-grey-500 text-sm">{{ user.email || '—' }}</td>
                  <td class="py-3 px-4">
                    <span class="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium"
                          [class]="getRoleBadgeClass(user.role)">
                      {{ getRoleLabel(user.role) }}
                    </span>
                  </td>
                  <td class="py-3 px-4">
                    <button (click)="openDeviceModal(user)" class="text-vpb-green-600 hover:text-vpb-green-700 text-sm font-medium hover:underline">
                      {{ user.assignedDeviceCount || 0 }} thiết bị
                    </button>
                  </td>
                  <td class="py-3 px-4 text-right">
                    <div class="flex items-center justify-end gap-1">
                      <button (click)="openEditModal(user)" class="p-2 text-vpb-grey-400 hover:text-vpb-green-600 hover:bg-vpb-grey-100 rounded-lg transition-colors" title="Chỉnh sửa">
                        <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/></svg>
                      </button>
                      <button (click)="deleteUser(user)" class="p-2 text-vpb-grey-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors" title="Xóa">
                        <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/></svg>
                      </button>
                    </div>
                  </td>
                </tr>
              }
              @if (users.length === 0) {
                <tr><td colspan="6" class="py-12 text-center text-vpb-grey-400">Chưa có người dùng nào</td></tr>
              }
            </tbody>
          </table>
        </div>
      </div>
    </div>

    <!-- Create/Edit User Modal -->
    @if (showUserModal) {
      <div class="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4" (click)="showUserModal = false">
        <div class="bg-white rounded-2xl shadow-xl max-w-md w-full p-6" (click)="$event.stopPropagation()">
          <h2 class="text-lg font-bold text-vpb-dark-700 mb-4">{{ editingUser ? 'Chỉnh sửa' : 'Thêm người dùng' }}</h2>
          <div class="space-y-4">
            <div>
              <label class="block text-sm font-medium text-vpb-dark-600 mb-1">Tên đăng nhập</label>
              <input [(ngModel)]="userForm.username" [disabled]="!!editingUser"
                     class="w-full px-3 py-2 border border-vpb-grey-300 rounded-lg focus:ring-2 focus:ring-vpb-green-500 focus:border-vpb-green-500 disabled:bg-vpb-grey-100"/>
            </div>
            <div>
              <label class="block text-sm font-medium text-vpb-dark-600 mb-1">Họ tên</label>
              <input [(ngModel)]="userForm.fullName" class="w-full px-3 py-2 border border-vpb-grey-300 rounded-lg focus:ring-2 focus:ring-vpb-green-500 focus:border-vpb-green-500"/>
            </div>
            <div>
              <label class="block text-sm font-medium text-vpb-dark-600 mb-1">Email</label>
              <input [(ngModel)]="userForm.email" type="email" class="w-full px-3 py-2 border border-vpb-grey-300 rounded-lg focus:ring-2 focus:ring-vpb-green-500 focus:border-vpb-green-500"/>
            </div>
            <div>
              <label class="block text-sm font-medium text-vpb-dark-600 mb-1">{{ editingUser ? 'Mật khẩu mới (để trống nếu không đổi)' : 'Mật khẩu' }}</label>
              <input [(ngModel)]="userForm.password" type="password" class="w-full px-3 py-2 border border-vpb-grey-300 rounded-lg focus:ring-2 focus:ring-vpb-green-500 focus:border-vpb-green-500"/>
            </div>
            <div>
              <label class="block text-sm font-medium text-vpb-dark-600 mb-1">Vai trò</label>
              <select [(ngModel)]="userForm.role" class="w-full px-3 py-2 border border-vpb-grey-300 rounded-lg focus:ring-2 focus:ring-vpb-green-500 focus:border-vpb-green-500">
                <option value="Admin">Admin</option>
                <option value="Operator">Operator</option>
                <option value="Viewer">Viewer</option>
              </select>
            </div>
            <div>
              <label class="block text-sm font-medium text-vpb-dark-600 mb-1">Tỉnh/Thành phố</label>
              <select [(ngModel)]="userForm.provinceId" class="w-full px-3 py-2 border border-vpb-grey-300 rounded-lg focus:ring-2 focus:ring-vpb-green-500 focus:border-vpb-green-500">
                <option [ngValue]="null">— Không chọn —</option>
                @for (p of provinces; track p.id) {
                  <option [ngValue]="p.id">{{ p.name }}</option>
                }
              </select>
            </div>
          </div>
          <div class="flex justify-end gap-3 mt-6">
            <button (click)="showUserModal = false" class="px-4 py-2 text-vpb-grey-600 hover:bg-vpb-grey-100 rounded-lg transition-colors">Huỷ</button>
            <button (click)="saveUser()" class="px-4 py-2 bg-vpb-green-500 text-white rounded-lg hover:bg-vpb-green-600 transition-colors font-medium">
              {{ editingUser ? 'Lưu' : 'Tạo' }}
            </button>
          </div>
        </div>
      </div>
    }

    <!-- Device Assignment Modal -->
    @if (showDeviceModal && selectedUser) {
      <div class="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4" (click)="showDeviceModal = false">
        <div class="bg-white rounded-2xl shadow-xl max-w-2xl w-full max-h-[80vh] flex flex-col" (click)="$event.stopPropagation()">
          <div class="p-6 border-b border-vpb-grey-200">
            <h2 class="text-lg font-bold text-vpb-dark-700">Gán thiết bị - {{ selectedUser.fullName }}</h2>
            <p class="text-sm text-vpb-grey-500 mt-1">Chọn thiết bị mà người dùng này được phép xem</p>
            <div class="mt-3 flex items-center gap-3">
              <input [(ngModel)]="deviceSearch" placeholder="Tìm thiết bị..." class="flex-1 px-3 py-2 border border-vpb-grey-300 rounded-lg text-sm focus:ring-2 focus:ring-vpb-green-500"/>
              <button (click)="toggleAllDevices()" class="text-sm text-vpb-green-600 hover:text-vpb-green-700 font-medium whitespace-nowrap">
                {{ allDevicesSelected ? 'Bỏ tất cả' : 'Chọn tất cả' }}
              </button>
            </div>
          </div>
          <div class="flex-1 overflow-y-auto p-4">
            @for (province of groupedDevices; track province.name) {
              <div class="mb-4">
                <div class="flex items-center gap-2 mb-2">
                  <input type="checkbox" [checked]="isProvinceSelected(province)"
                         (change)="toggleProvince(province)" class="w-4 h-4 text-vpb-green-500 rounded"/>
                  <h3 class="font-semibold text-vpb-dark-600 text-sm">{{ province.name }} ({{ province.devices.length }})</h3>
                </div>
                <div class="grid grid-cols-1 md:grid-cols-2 gap-1 ml-6">
                  @for (device of getFilteredDevices(province.devices); track device.id) {
                    <label class="flex items-center gap-2 p-2 rounded-lg hover:bg-vpb-grey-50 cursor-pointer transition-colors">
                      <input type="checkbox" [checked]="selectedDeviceIds.has(device.id)"
                             (change)="toggleDevice(device.id)" class="w-4 h-4 text-vpb-green-500 rounded"/>
                      <span class="text-sm text-vpb-dark-600">{{ device.name }}</span>
                      <span class="text-xs text-vpb-grey-400 ml-auto">{{ device.gatewayIdentify }}</span>
                    </label>
                  }
                </div>
              </div>
            }
          </div>
          <div class="p-4 border-t border-vpb-grey-200 flex items-center justify-between">
            <span class="text-sm text-vpb-grey-500">Đã chọn: <strong class="text-vpb-green-600">{{ selectedDeviceIds.size }}</strong> thiết bị</span>
            <div class="flex gap-3">
              <button (click)="showDeviceModal = false" class="px-4 py-2 text-vpb-grey-600 hover:bg-vpb-grey-100 rounded-lg transition-colors">Huỷ</button>
              <button (click)="saveDeviceAssignment()" class="px-4 py-2 bg-vpb-green-500 text-white rounded-lg hover:bg-vpb-green-600 transition-colors font-medium">
                Lưu phân quyền
              </button>
            </div>
          </div>
        </div>
      </div>
    }

    <!-- Success Toast -->
    @if (toastMessage) {
      <div class="fixed bottom-4 right-4 z-50 bg-vpb-green-500 text-white px-6 py-3 rounded-xl shadow-lg animate-slide-up">
        {{ toastMessage }}
      </div>
    }
  `
})
export class UsersComponent implements OnInit {
  users: any[] = [];
  provinces: any[] = [];
  allDevices: any[] = [];
  showUserModal = false;
  showDeviceModal = false;
  editingUser: any = null;
  selectedUser: any = null;
  selectedDeviceIds = new Set<number>();
  deviceSearch = '';
  toastMessage = '';
  groupedDevices: { name: string; devices: any[] }[] = [];

  userForm: any = { username: '', fullName: '', email: '', password: '', role: 'Viewer', provinceId: null };

  constructor(private api: ApiService, public auth: AuthService) {}

  ngOnInit() {
    this.loadUsers();
    this.api.getProvinces().subscribe(p => this.provinces = p);
    this.api.getDevices().subscribe(d => {
      this.allDevices = d;
      this.groupDevices();
    });
  }

  loadUsers() {
    this.api.getUsers().subscribe(u => this.users = u);
  }

  groupDevices() {
    const map = new Map<string, any[]>();
    for (const d of this.allDevices) {
      const pName = d.province?.name || 'Chưa phân loại';
      if (!map.has(pName)) map.set(pName, []);
      map.get(pName)!.push(d);
    }
    this.groupedDevices = Array.from(map.entries()).map(([name, devices]) => ({ name, devices }));
  }

  getFilteredDevices(devices: any[]) {
    if (!this.deviceSearch) return devices;
    const s = this.deviceSearch.toLowerCase();
    return devices.filter(d => d.name.toLowerCase().includes(s) || d.gatewayIdentify.toLowerCase().includes(s));
  }

  get allDevicesSelected(): boolean {
    return this.allDevices.length > 0 && this.selectedDeviceIds.size === this.allDevices.length;
  }

  toggleAllDevices() {
    if (this.allDevicesSelected) {
      this.selectedDeviceIds.clear();
    } else {
      this.allDevices.forEach(d => this.selectedDeviceIds.add(d.id));
    }
  }

  isProvinceSelected(province: { devices: any[] }): boolean {
    return province.devices.every(d => this.selectedDeviceIds.has(d.id));
  }

  toggleProvince(province: { devices: any[] }) {
    if (this.isProvinceSelected(province)) {
      province.devices.forEach(d => this.selectedDeviceIds.delete(d.id));
    } else {
      province.devices.forEach(d => this.selectedDeviceIds.add(d.id));
    }
  }

  toggleDevice(id: number) {
    if (this.selectedDeviceIds.has(id)) {
      this.selectedDeviceIds.delete(id);
    } else {
      this.selectedDeviceIds.add(id);
    }
  }

  openCreateModal() {
    this.editingUser = null;
    this.userForm = { username: '', fullName: '', email: '', password: '', role: 'Viewer', provinceId: null };
    this.showUserModal = true;
  }

  openEditModal(user: any) {
    this.editingUser = user;
    this.userForm = { username: user.username, fullName: user.fullName, email: user.email || '', password: '', role: user.role, provinceId: user.provinceId };
    this.showUserModal = true;
  }

  openDeviceModal(user: any) {
    this.selectedUser = user;
    this.selectedDeviceIds = new Set<number>(user.assignedDeviceIds || []);
    this.deviceSearch = '';
    this.showDeviceModal = true;
  }

  saveUser() {
    if (this.editingUser) {
      const data: any = { fullName: this.userForm.fullName, email: this.userForm.email, role: this.userForm.role, provinceId: this.userForm.provinceId };
      if (this.userForm.password) data.password = this.userForm.password;
      this.api.updateUser(this.editingUser.id, data).subscribe(() => {
        this.showUserModal = false;
        this.loadUsers();
        this.showToast('Đã cập nhật người dùng');
      });
    } else {
      this.api.createUser(this.userForm).subscribe(() => {
        this.showUserModal = false;
        this.loadUsers();
        this.showToast('Đã tạo người dùng mới');
      });
    }
  }

  deleteUser(user: any) {
    if (confirm(`Xác nhận xoá người dùng "${user.fullName}"?`)) {
      this.api.deleteUser(user.id).subscribe(() => {
        this.loadUsers();
        this.showToast('Đã xoá người dùng');
      });
    }
  }

  saveDeviceAssignment() {
    const ids = Array.from(this.selectedDeviceIds);
    this.api.setUserDevices(this.selectedUser.id, ids).subscribe(() => {
      this.showDeviceModal = false;
      this.loadUsers();
      this.showToast(`Đã gán ${ids.length} thiết bị cho ${this.selectedUser.fullName}`);
    });
  }

  getRoleBgClass(role: string): string {
    switch (role) {
      case 'Admin': return 'bg-red-500';
      case 'Operator': return 'bg-amber-500';
      default: return 'bg-vpb-green-500';
    }
  }

  getRoleBadgeClass(role: string): string {
    switch (role) {
      case 'Admin': return 'bg-red-100 text-red-700';
      case 'Operator': return 'bg-amber-100 text-amber-700';
      default: return 'bg-green-100 text-green-700';
    }
  }

  getRoleLabel(role: string): string {
    switch (role) {
      case 'Admin': return 'Quản trị viên';
      case 'Operator': return 'Vận hành';
      default: return 'Xem';
    }
  }

  private showToast(msg: string) {
    this.toastMessage = msg;
    setTimeout(() => this.toastMessage = '', 3000);
  }
}
