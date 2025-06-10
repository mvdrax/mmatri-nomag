import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class ExcelDataService {
  private apiUrl = 'http://localhost:4000/api/excel-data';

  constructor(private http: HttpClient) { }

  getExcelData(): Observable<any[]> {
    return this.http.get<any[]>(this.apiUrl)
  }
  
}
