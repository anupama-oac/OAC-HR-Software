/* eslint-disable @typescript-eslint/no-explicit-any */
import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';
import { Holidays } from '../common/interfaces/leaves/holidays';
import { CompoOff } from '../common/interfaces/leaves/compo-off';

@Injectable({
  providedIn: 'root'
})
export class HolidayService {

    private readonly apiUrl = environment.apiUrl;
    private readonly http = inject(HttpClient)
  
    getHolidays(filterValue?: string, page?: number, pagesize?:number): Observable<Holidays[]>{
      return this.http.get<Holidays[]>(this.apiUrl + `/holiday/find?search=${filterValue}&page=${page}&pageSize=${pagesize}`)
    }

    getHolidayByDate(date: any): Observable<Holidays[]>{
      return this.http.get<Holidays[]>(this.apiUrl + `/holiday/holidaybydate?date=${date}`)
    }

    getHolidayByYear(year: number): Observable<Holidays[]>{
      return this.http.get<Holidays[]>(this.apiUrl + `/holiday/holidaysbyyear?year=${year}`)
    }

    getHolidayByName(search: string): Observable<Holidays[]>{
      return this.http.get<Holidays[]>(this.apiUrl + `/holiday/byname?search=${search}`)
    }
    getAllHolidays(): Observable<Holidays[]>{
      return this.http.get<Holidays[]>(this.apiUrl + `/holiday/findall`)
    }


    deleteHolidays(id: number){
      return this.http.delete(this.apiUrl + '/holiday/delete/'+id)
    }

    deleteHolidaysByYear(ids: number[]){
      return this.http.patch(this.apiUrl + '/holiday/byyear', ids)
    }

    updateHolidays(id: number, data: any): Observable<Holidays>{
      return this.http.patch<Holidays>(this.apiUrl + `/holiday/updateholiday/${id}`, data)
    }

    addHolidays(data:any){
      return this.http.post(this.apiUrl+'/holiday/save', data)
    }
    
    updateCompoOff(id: number, data: any){
      return this.http.patch<Holidays[]>(`${this.apiUrl}/holiday/update/`+id, data);
    }
  
    updateUpdatedCompoOff(id: number, data: any){
      return this.http.patch<Holidays[]>(`${this.apiUrl}/holiday/updatetheupdated/`+id, data);
    }
  
    getCompoOff(id: number){
      return this.http.get<CompoOff>(`${this.apiUrl}/holiday/findcombooff/${id}`);
    }

    getHolidayById(id: number): Observable<Holidays> {
      return this.http.get<Holidays>(`${this.apiUrl}/holiday/findbyid/${id}`);
    }

    uploadHolidays(formData: FormData){
      return this.http.post(`${this.apiUrl}/holiday/upload`, formData)
    }
}
