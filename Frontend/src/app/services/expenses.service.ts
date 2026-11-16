import { inject, Injectable } from '@angular/core';
import { environment } from '../../environments/environment';
import { HttpClient } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { Expense } from '../common/interfaces/payments/expense';
import { ExcelLog } from '../common/interfaces/payments/excel-log';

@Injectable({
  providedIn: 'root'
})
export class ExpensesService {

  url = `${environment.apiUrl}/expenses`;
  private http = inject(HttpClient);

  addExpense(data: any){
    return this.http.post(this.url + '/save', data);
  }

  getExpense(): Observable<Expense[]>{
    return this.http.get<Expense[]>(this.url + '/find');
  }

  getExpenseByUser(search?: string, currentPage?:number, pageSize?:number, isFlow?: boolean): Observable<Expense[]>{
    return this.http.get<Expense[]>(this.url + `/findbyuser/?search=${search}&page=${currentPage}&pageSize=${pageSize}&isFLow=${isFlow}`);
  }

  updateStatus(data: any){
    return this.http.post(this.url + '/updatestatus', data);
  }

  uploadExpense(formData: any): Observable<any> {
    return this.http.post(this.url + '/fileupload', formData);
  }

  addBankSlip(data: any, id: number){
    return this.http.patch(this.url + '/bankslip/' + id, data);
  }

  getExpenseById(id: number): Observable<Expense>{
    return this.http.get<Expense>(this.url + '/findbyid/'+id);
  }

  deleteUploaded(id: number, i: number, key?: string) {
    return this.http.delete(`${this.url}/filedelete?id=${id}&index=${i}&key=${key}`);
  }

  deleteUploadByurl(key: string) {
    return this.http.delete(`${this.url}/filedeletebyurl/?key=${key}`);
  }

  updateExpense(data: any, id: number){
    return this.http.patch(this.url + '/update/'+ id, data);
  }

  deleteExpense(id: number) {
    return this.http.delete(`${this.url}/${id}`);
  }

  getExpenseReports(data: any){
    return this.http.patch<any[]>(this.url + '/getforadminreport', data);
  }

  reportExport(data: any){
    return this.http.post<any[]>(this.url + '/download-excel', data);
  }

  getExcelLog(): Observable<ExcelLog[]>{
    return this.http.get<ExcelLog[]>(this.url + '/excelLog/findexpenses');
  }
  
  getDashboardExpense(status?: string, currentPage?: number, pageSize?: number): Observable<any[]>{
    return this.http.get<any[]>(this.url + `/dashboard/expense/?status=${status}&page=${currentPage}&pageSize=${pageSize}`);
  }

  getFileUrl(key: string) {
    return this.http.get<any>(
      `${this.url}/file-url`,
      {
        params: {
          key: key
        }
      }
    );
  }
}
