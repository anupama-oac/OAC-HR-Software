import { Injectable } from '@angular/core';
import { environment } from '../../environments/environment';
import { HttpClient, HttpParams } from '@angular/common/http';
import { catchError, Observable, throwError } from 'rxjs';
import { Leave } from '../common/interfaces/leaves/leave';
import { UserLeave } from '../common/interfaces/leaves/userLeave';
import { LeaveType } from '../common/interfaces/leaves/leaveType';

@Injectable({
  providedIn: 'root'
})
export class NewLeaveService {
  // private apiUrl = environment.apiUrl;
  
    private apiUrl = `${environment.apiUrl}`;
  constructor(private http: HttpClient) { }

  removePenalty(id: number): Observable<any> {
  return this.http.put(`${this.apiUrl}/leave/removePenalty/${id}`, {});
}
removeApprovedPenalty(id: number): Observable<any> {
  return this.http.put(`${this.apiUrl}/leave/removeApprovedPenalty/${id}`, {});
}

// Inside your NewLeaveService class
updateLeaveStatus(id: number, payload: any): Observable<any> {
  return this.http.put(`${this.apiUrl}/leave/approveLeave/${id}`, payload);
}


  getLeavesPaginated(value: string, search?: string, page?: number, pageSize?: number): Observable<any[]> {
    if(value === 'Not') return this.http.get<any[]>(`${this.apiUrl}/leave/find/?search=${search}&page=${page}&pageSize=${pageSize}`);
    else return this.http.get<any[]>(`${this.apiUrl}/leave/findlocked/?search=${search}&page=${page}&pageSize=${pageSize}`);
  }

  getRequestedLeaves( page?: number, pageSize?: number): Observable<any[]> {
    return this.http.get<any[]>(`${this.apiUrl}/leave/find/requested/?page=${page}&pageSize=${pageSize}`);
  }

  getLeaves():Observable<any>{
    return this.http.get(`${this.apiUrl}/leave/all/totalleaves`);
  }

  getLeavesByUser(value: string, userId: number, search?: string, page?: number, pageSize?: number): Observable<any[]> {
    if(value === 'Not') return this.http.get<any[]>(`${this.apiUrl}/leave/user/${userId}?search=${search}&page=${page}&pageSize=${pageSize}`);
    return this.http.get<any[]>(`${this.apiUrl}/leave/userlocked/${userId}?search=${search}&page=${page}&pageSize=${pageSize}`);
  }

  getLeaveBalance(leaveId: number): Observable<any> {
    return this.http.get(`${this.apiUrl}/leave/leaveBalance/${leaveId}`);
  }

  updateApproveLeaveStatus(approvalData: any) {
    const { leaveId, adminNotes } = approvalData;
    return this.http.put(`${this.apiUrl}/leave/approveLeave/${leaveId}`, { adminNotes });
  }

  updateRejectLeaveStatus(rejectionData: any) {
    const { leaveId, adminNotes } = rejectionData;
    return this.http.put(`${this.apiUrl}/leave/rejectLeave/${leaveId}`, { adminNotes });
  }

  updateLeaveFileUrl(leaveId: number, fileUrl: string): Observable<any> {
    return this.http.patch(`${this.apiUrl}/leave/updateLeaveFileUrl/${leaveId}`, { fileUrl });
  }

  deleteUntakenLeave(leaveId: number): Observable<any> {
    return this.http.delete(`${this.apiUrl}/leave/untakenLeaveDelete/${leaveId}`);
  }

  deleteUploadByurl(key: string) {
    return this.http.delete(`${this.apiUrl}/leave/delete/filedeletebyurl?key=${key}`);
  }

  getLeaveById(id: number) {
    return this.http.get<Leave>(`${this.apiUrl}/leave/${id}`);
  }

  getUserLeaveByUser(id: number){
    return this.http.get<UserLeave[]>(`${this.apiUrl}/userLeave/byuser/${id}`);
  }

  getLeaveType(filterValue?: string, page?: number, pagesize?:number): Observable<LeaveType[]> {
    return this.http.get<LeaveType[]>(this.apiUrl + `/leaveType/find/?search=${filterValue}&page=${page}&pageSize=${pagesize}`);
  }

  deleteLeaveType(id: number) {
    return this.http.delete(this.apiUrl + "/leaveType/" + id);
  }

  updateLeaveType(id: number, data: any): Observable<LeaveType> {
    return this.http.patch<LeaveType>(this.apiUrl + "/leaveType/" + id, data);
  }

  addLeaveType(data:any){
    return this.http.post(this.apiUrl+'/leaveType/', data)
  }

  uploadImage(file: any): Observable<any> {
    if (file instanceof File) {
      const formData = new FormData();
      formData.append("file", file, file.name);
      return this.http.post(`${this.apiUrl}/leave/fileupload`, formData);
    }
    return throwError(() => new Error("Invalid file type"));
  }

  addEmergencyLeave(data:any){
    return this.http.post(this.apiUrl+'/leave/emergencyLeave', data)
  }

  updatemergencyLeave(data:any, id: number){
    return this.http.patch(this.apiUrl +'/leave/updateemergencyLeave/'+ id, data)
  }

  addLeave(data:any){
    return this.http.post(this.apiUrl+'/leave/employeeLeave', data)
  }

  updateLeave(id: number, data: any): Observable<any> {
    return this.http.patch(`${this.apiUrl}/leave/updateemployeeleave/${id}`, data);
  }


  getLeavesPaginatedByRm(rmId: number, search?: string, page?: number, pageSize?: number): Observable<any[]> {
    return this.http.get<any[]>(`${this.apiUrl}/leave/findbyrm/${rmId}?search=${search}&page=${page}&pageSize=${pageSize}`);
  }

  getReport(year: number, page?: number, pageSize?: number, search?: string):Observable<any>{
    return this.http.get(`${this.apiUrl}/leave/all/report?year=${year}&page=${page}&pageSize=${pageSize}&search=${search}`);
  }


  // for setting app password....................................
  getUserEmail(id: number){
    return this.http.get<UserLeave[]>(`${this.apiUrl}/useremail/byuseridforleave/${id}`);
  }

  getUserLeaveForEncash(year: number){
    return this.http.get<any[]>(`${this.apiUrl}/userLeave/forencashment/${year}`);
  }


  getMonthlyLeaveDays(startDate: any, endDate: any){
    return this.http.get<any[]>(`${this.apiUrl}/leave/find/monthlyleavedays?startDate=${startDate}&endDate=${endDate}`);
  }

  getUserLeave(userId: number, typeid: number): Observable<UserLeave> {
    return this.http.get<UserLeave>(`${this.apiUrl}/userLeave/byuserandtype/${userId}/${typeid}`);
  }

  updateUserLeave(data: any): Observable<UserLeave> {
    return this.http.patch<UserLeave>(`${this.apiUrl}/userLeave/update`, data);
  }

  getLeaveCounts(userId: number, ltId: number, year: number): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/userLeave/leavecount/${userId}/${ltId}/${year}`);
  }

  // In your leave.service.ts

  getLeaveBalanceDetails(employeeId: number, leaveTypeId: number, year: number, month: number): Observable<Leave[]> {
    const params = new HttpParams()
      .set('employeeId', employeeId.toString())
      .set('leaveTypeId', leaveTypeId.toString())
      .set('year', year.toString())
      .set('month', month.toString());

    return this.http.get<Leave[]>(`${this.apiUrl}/leave/report/month-details`, { params }).pipe(
      catchError(error => {
        console.error('Error fetching leave balance details:', error);
        return throwError(() => new Error('Failed to fetch leave details'));
      })
    );
  }

}
