import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

export interface PettyCashTransaction {
  id?: number;
  amount: number;
  transactionType: 'CREDIT' | 'DEBIT';
  description: string;
  transactionDate: string;
  recordedBy?: number;
  user?: any;
  userId?:number;
  createdAt?: string;
  updatedAt?: string;
}

@Injectable({
  providedIn: 'root'
})
export class PettyCashService {
  private http = inject(HttpClient);
  // Point to the expense-service which runs on port 4003 (as per our backend setup)
  // Assuming environment.apiUrl is base URL, you might need to adjust this depending on proxy setup
  private apiUrl = environment.apiUrl + '/expenses/petty-cash';

  getTransactions(): Observable<any> {
    return this.http.get(`${this.apiUrl}`);
  }

  getBalance(): Observable<any> {
    return this.http.get(`${this.apiUrl}/balance`);
  }

  addTransaction(data: Partial<PettyCashTransaction>): Observable<any> {
    return this.http.post(`${this.apiUrl}`, data);
  }

  getByUserId(userId: number): Observable<any> {
    return this.http.get(`${this.apiUrl}/user/${userId}`);
  }

  updateTransaction(id: number, data: Partial<PettyCashTransaction>): Observable<any> {
    return this.http.patch(`${this.apiUrl}/${id}`, data);
  }

  deleteTransaction(id: number): Observable<any> {
    return this.http.delete(`${this.apiUrl}/${id}`);
  }
}
