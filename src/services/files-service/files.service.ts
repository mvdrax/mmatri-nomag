import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class FileService {

  private apiUrl = 'http://localhost:3000/api/files'; // à adapter selon ton backend

  constructor(private http: HttpClient) {}

  getAgencies(): Observable<any[]> {
    return this.http.get<any[]>(`${this.apiUrl}/agences`);
    console.log('getAg marche')
  }
  
  getPeriods(): Observable<any[]> {
    return this.http.get<any[]>(`${this.apiUrl}/periods`);
  }

  getPdfFilesByAgencyAndPeriod(agence: string, year: number, month: number): Observable<any[]> {
    return this.http.get<any[]>(`${this.apiUrl}/${agence}/${year}/${month}`);
  }
}  
