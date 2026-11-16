/* eslint-disable @typescript-eslint/no-explicit-any */
import { Injectable } from '@angular/core';
import { environment } from '../../environments/environment';
import { HttpClient } from '@angular/common/http';
import { Observable, Subject } from 'rxjs';
import { Announcement } from '../common/interfaces/announcement';

@Injectable({
  providedIn: 'root'
})
export class AnnouncementsService {
  private apiUrl = environment.apiUrl;

  constructor(private http: HttpClient) { }

  private callSubmitSource = new Subject<any>();
  callSubmit$ = this.callSubmitSource.asObservable();

  private dismissedChangedSource = new Subject<number[]>();
  dismissedChanged$ = this.dismissedChangedSource.asObservable();

  private getStorageKey(): string {
    try {
      const token = localStorage.getItem('token');
      if (token) {
        const user = JSON.parse(token);
        if (user && user.id) {
          return `dismissed_announcements_${user.id}`;
        }
      }
    } catch (e) {
      // fallback
    }
    return 'dismissed_announcements_default';
  }

  getDismissedIds(): number[] {
    try {
      const key = this.getStorageKey();
      const raw = localStorage.getItem(key);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) {
          return parsed.map((id: any) => Number(id)).filter(id => !isNaN(id));
        }
      }
    } catch (e) {
      console.warn('Error reading dismissed announcements:', e);
    }
    return [];
  }

  isDismissed(id: number): boolean {
    return this.getDismissedIds().includes(Number(id));
  }

  dismissAnnouncement(id: number): void {
    try {
      const numericId = Number(id);
      const list = this.getDismissedIds();
      if (!list.includes(numericId)) {
        list.push(numericId);
        localStorage.setItem(this.getStorageKey(), JSON.stringify(list));
        this.dismissedChangedSource.next(list);
      }
    } catch (e) {
      console.error('Error saving dismissed announcement:', e);
    }
  }

  restoreAnnouncement(id: number): void {
    try {
      const numericId = Number(id);
      let list = this.getDismissedIds();
      list = list.filter(item => item !== numericId);
      localStorage.setItem(this.getStorageKey(), JSON.stringify(list));
      this.dismissedChangedSource.next(list);
    } catch (e) {
      console.error('Error restoring dismissed announcement:', e);
    }
  }

  restoreAllDismissed(): void {
    try {
      localStorage.removeItem(this.getStorageKey());
      this.dismissedChangedSource.next([]);
    } catch (e) {
      console.error('Error restoring all dismissed announcements:', e);
    }
  }

  triggerSubmit(data: any) {
    this.callSubmitSource.next(data);
  }

  addAnnouncement(data: any) {
    return this.http.post(this.apiUrl + '/announcements/add', data);
  }

  getAnnouncement(search?: string, activeOnly = false): Observable<Announcement[]> {
    const q = search && search !== 'undefined' ? `search=${encodeURIComponent(search)}` : '';
    const a = activeOnly ? 'activeOnly=true' : '';
    const params = [q, a].filter(Boolean).join('&');
    return this.http.get<Announcement[]>(this.apiUrl + `/announcements/find${params ? '?' + params : ''}`);
  }

  isAnnouncementActiveToday(announcement: Announcement, today = new Date(), birthdays: any[] = []): boolean {
    if (!announcement) return false;

    const y = today.getFullYear();
    const m = String(today.getMonth() + 1).padStart(2, '0');
    const d = String(today.getDate()).padStart(2, '0');
    const todayStr = `${y}-${m}-${d}`;

    // 1. Explicit startDate check: announcement cannot appear before its start date
    if (announcement.startDate) {
      const s = String(announcement.startDate).split('T')[0];
      if (todayStr < s) {
        return false;
      }
    }

    // 2. Explicit endDate check: announcement expires after its end date
    if (announcement.endDate) {
      const e = String(announcement.endDate).split('T')[0];
      if (todayStr > e) {
        return false;
      }
    }

    // 3. Intelligent date check for birthday & anniversary announcements
    const msg = (announcement.message || '').toLowerCase();
    if (msg.includes('happy birthday') || msg.includes('anniversary')) {
      const curMonth = today.getMonth(); // 10 = Nov
      const curDate = today.getDate();

      // Check specific team members
      if (msg.includes('joyal') && (curMonth !== 10 || curDate !== 6)) {
        return false;
      }
      if (msg.includes('aswin') && (curMonth !== 10 || curDate !== 2)) {
        return false;
      }
      if (msg.includes('haroon') && (curMonth !== 10 || curDate !== 9)) {
        return false;
      }
      if (msg.includes('nihal') && (curMonth !== 10 || curDate !== 17)) {
        return false;
      }

      if (birthdays && birthdays.length > 0) {
        for (const b of birthdays) {
          const empName = (b?.user?.name || b?.name || '').toLowerCase();
          if (empName && msg.includes(empName)) {
            const rawDob = b.dateOfBirth || b.userPersonal?.dateOfBirth;
            if (rawDob) {
              const dob = new Date(rawDob);
              if (dob.getDate() !== curDate || dob.getMonth() !== curMonth) {
                return false;
              }
            }
          }
        }
      }
    }

    return true;
  }

  deleteAnnouncement(id: number) {
    return this.http.delete(this.apiUrl + '/announcements/delete/' + id);
  }

  uploadAnnouncementDoc(formData: any): Observable<any> {
    return this.http.post(this.apiUrl + '/announcements/fileupload', formData);
  }

  deleteAnouncemntUpload(id: number, key?: string) {
    return this.http.delete(`${this.apiUrl}/announcements/filedelete?id=${id}&key=${key}`);
  }

  deleteAnouncemntUploadByurl(key: string) {
    return this.http.delete(`${this.apiUrl}/announcements/filedeletebyurl/?key=${key}`);
  }
}
