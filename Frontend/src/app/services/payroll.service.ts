/* eslint-disable @typescript-eslint/no-explicit-any */
import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';
import { environment } from '../../environments/environment';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Payroll } from '../common/interfaces/payRoll/payroll';
import { AdvanceSalary } from '../common/interfaces/payRoll/advanceSalary';
import { PayrollLog } from '../common/interfaces/payRoll/payroll-log';
import { MonthlyPayroll } from '../common/interfaces/payRoll/monthlyPayroll';

@Injectable({
  providedIn: 'root'
})
export class PayrollService {

  private apiUrl = environment.apiUrl;

  constructor(private http: HttpClient) { }

  private payrollData = new BehaviorSubject<any>(null);
  currentPayrollData = this.payrollData.asObservable();

  updatePayrollData(data: any) {
    this.payrollData.next(data);
  }

  public savePayroll(data: any): Observable<any> {
    return this.http.post(`${this.apiUrl}/payroll`, data);
  }

  public updatePayroll(id: number, data: any): Observable<any> {
    return this.http.patch(`${this.apiUrl}/payroll/${id}`, data);
  }

  public getPayrollDetailsByUserId(id: number): Observable<Payroll> {
    return this.http.get<Payroll>(`${this.apiUrl}/payroll/${id}`);
  }

  getPayroll(): Observable<any> {
    return this.http.get(`${this.apiUrl}/payroll`);
  }

  getAdvanceSalary(search?: string): Observable<AdvanceSalary[]> {
    let params = new HttpParams();
    if (search) params = params.set('search', search);
    return this.http.get<AdvanceSalary[]>(`${this.apiUrl}/advanceSalary/findall`, { params });
  }

  closeAdvanceSalary(id: number, data: any): Observable<AdvanceSalary> {
    return this.http.patch<AdvanceSalary>(`${this.apiUrl}/advanceSalary/closeadvance/${id}`, data);
  }

  getNotCompletedAdvanceSalary(search?: string, page?: number, pageSize?: number): Observable<AdvanceSalary[]> {
    let params = new HttpParams();
    if (search && search !== 'undefined') params = params.set('search', search);
    if (page !== undefined && page !== null) params = params.set('page', page.toString());
    if (pageSize !== undefined && pageSize !== null) params = params.set('pageSize', pageSize.toString());

    return this.http.get<AdvanceSalary[]>(`${this.apiUrl}/advanceSalary/notcompleted`, { params });
  }

  addAdvanceSalary(data: any) {
    return this.http.post(`${this.apiUrl}/advanceSalary`, data);
  }

  updateAdvanceSalary(id: number, data: any): Observable<AdvanceSalary> {
    return this.http.patch<AdvanceSalary>(`${this.apiUrl}/advanceSalary/update/${id}`, data);
  }

  deleteAdvanceSalary(id: number) {
    return this.http.delete(`${this.apiUrl}/advanceSalary/delete/${id}`);
  }

  getAdvanceSalaryByid(id: number): Observable<any> {
    return this.http.get(`${this.apiUrl}/advanceSalary/findbyid/${id}`);
  }

  getAdvanceSalaryByUserId(id: number): Observable<any> {
    return this.http.get(`${this.apiUrl}/advanceSalary/findbyuserid/${id}`);
  }

  getAllAdvanceSalaryByUserId(id: number, search?: string, page?: number, pageSize?: number): Observable<any> {
    let params = new HttpParams();
    if (search && search !== 'undefined') params = params.set('search', search);
    if (page !== undefined && page !== null) params = params.set('page', page.toString());
    if (pageSize !== undefined && pageSize !== null) params = params.set('pageSize', pageSize.toString());

    return this.http.get(`${this.apiUrl}/advanceSalary/findbyuseridall/${id}`, { params });
  }

  getPayrollLogByUser(id: number): Observable<PayrollLog[]> {
    return this.http.get<PayrollLog[]>(`${this.apiUrl}/payrolllog/getbyuser/${id}`);
  }

  monthlyPayroll(data: any): Observable<any> {
    return this.http.post(`${this.apiUrl}/monthlypayroll/save`, data);
  }

  updateMonthlyPayroll(data: any): Observable<any> {
    return this.http.post(`${this.apiUrl}/monthlypayroll/update`, data);
  }

  public updateMPStatus(data: any): Observable<MonthlyPayroll> {
    return this.http.patch<MonthlyPayroll>(`${this.apiUrl}/monthlypayroll/statusupdate`, data);
  }

  getMonthlyPayroll(filterValue?: string, page?: number, pagesize?: number): Observable<any> {
    let params = new HttpParams();
    if (filterValue && filterValue !== 'undefined') params = params.set('search', filterValue);
    if (page !== undefined && page !== null) params = params.set('page', page.toString());
    if (pagesize !== undefined && pagesize !== null) params = params.set('pageSize', pagesize.toString());

    return this.http.get(`${this.apiUrl}/monthlypayroll/find`, { params });
  }

  getMonthlyPayrollForYTD(fromDate?: any, toDate?: any): Observable<any> {
    let params = new HttpParams();
    if (fromDate) params = params.set('fromDate', fromDate);
    if (toDate) params = params.set('toDate', toDate);

    return this.http.get(`${this.apiUrl}/monthlypayroll/ytd`, { params });
  }

  getMonthlyPayrollByUser(id: number, filterValue?: string, page?: number, pagesize?: number): Observable<any> {
    let params = new HttpParams();
    if (filterValue && filterValue !== 'undefined') params = params.set('search', filterValue);
    if (page !== undefined && page !== null) params = params.set('page', page.toString());
    if (pagesize !== undefined && pagesize !== null) params = params.set('pageSize', pagesize.toString());

    return this.http.get(`${this.apiUrl}/monthlypayroll/findbyuser/${id}`, { params });
  }

  getMonthlyPayrollById(id: number): Observable<any> {
    return this.http.get(`${this.apiUrl}/monthlypayroll/findbyid/${id}`);
  }

  getMonthlyPayrollByPayedFor(payedForValue: string): Observable<Payroll[]> {
    let params = new HttpParams().set('payedFor', payedForValue);
    return this.http.get<Payroll[]>(`${this.apiUrl}/monthlypayroll/bypayedfor/`, { params });
  }

  sendEmailWithExcel(formData: any) {
    return this.http.post(`${this.apiUrl}/monthlypayroll/send-email`, formData);
  }

  sendPayrollEmail(data: any) {
    return this.http.post(`${this.apiUrl}/monthlypayroll/send-payroll-email`, data);
  }
}