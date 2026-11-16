import { Injectable } from '@angular/core';
import {
  HttpRequest,
  HttpHandler,
  HttpEvent,
  HttpInterceptor,
  HttpErrorResponse
} from '@angular/common/http';
import { Observable, catchError, throwError } from 'rxjs';
import { Router } from '@angular/router';

@Injectable()
export class TokenInterceptor implements HttpInterceptor {

  constructor(private router: Router) {}

  intercept(request: HttpRequest<unknown>, next: HttpHandler): Observable<HttpEvent<unknown>> {

    const myToken = localStorage.getItem("JWT_TOKEN");
    if(myToken){
      request = request.clone({
        setHeaders: {Authorization: `Bearer ${myToken}`}
      })
    }
    return next.handle(request)
    .pipe(
      catchError((err: any)=>{
        if(err instanceof HttpErrorResponse){
          if (err.status === 0) {
            alert('You are not allowed to enter — backend is not reachable.');
            return throwError(() => new Error('AEROHR is not reachable'));
          }
          if (err.status === 401) {
            alert(err.error?.message || 'Token is expired, Please login again...');
            this.router.navigate(['']);
            return throwError(() => err);
          }
          if (err.status === 403) {
            alert(err.error?.message || 'You do not have permission to perform this action.');
            return throwError(() => err);
          }
        }
        return throwError(() => {
          if (err.error && err.error.message) {
            alert(err.error.message);
          } else if (err.error && err.error.text) {
            alert(err.error.text);
          } else if (err.error && typeof err.error === 'string') {
            alert(err.error);
          }
          return err;
        });
      })
   );
  }
}
