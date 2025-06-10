import { Component, ViewEncapsulation, ChangeDetectorRef } from '@angular/core';
import { FileService } from '../services/files-service/files.service';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatNativeDateModule } from '@angular/material/core';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { ExcelDataService } from '../services/excel-service/excel-data.service';

@Component({
  selector: 'app-files-upload',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule, ReactiveFormsModule,
    MatDatepickerModule,
    MatNativeDateModule,
    MatFormFieldModule,
    MatInputModule,
  ],
  templateUrl: './files-upload.component.html',
  styleUrls: ['./files-upload.component.scss'],
  encapsulation: ViewEncapsulation.None,
})
export class FilesUploadComponent {
  isFormOpen = false;
  tab: number = 1;

  newFilteredList: any[] = [];
  originalAllFilesList: any[] = [];

  searchQueryFactures: string = '';
  searchQueryFiches: string = '';

  startDateFactures: Date | null = null;
  endDateFactures: Date | null = null;

  startDateFiches: Date | null = null;
  endDateFiches: Date | null = null;

  listPeriods: string[] = [];

  selectedAgence: string = '';
  selectedPeriod: string = '';

  blobUrls: { [key: string]: string } = {};
  selectedMonthYear: string = '';
  monthYearOptions: string[] = [];

  codeToNameMap: Record<string, string> = {};

  listAgences: { code: string; name: string; label: string }[] = [];

  constructor(
    private pdfFilesService: FileService,
    private cdr: ChangeDetectorRef,
    private excelService: ExcelDataService
  ) {}

  ngOnInit(): void {
    // Charger le fichier Excel (BDD) et construire codeToNameMap
    this.excelService.getExcelData().subscribe((excelRows: any[]) => {
      this.codeToNameMap = {};
      for (const row of excelRows) {
        const code = row['Code Agence (compta)'];
        const nom = row['Nom'];
        if (code && nom && !this.codeToNameMap[code]) {
          this.codeToNameMap[code] = nom;
        }
      }

      // Récupérer les codes agences via API
      this.pdfFilesService.getAgencies().subscribe((codes: string[]) => {
        this.listAgences = codes
          .map(code => {
            const name = this.codeToNameMap[code] || 'Nom inconnu';
            return {
              code,
              name,
              label: `${code} - ${name}`,
            };
          })
          .sort((a, b) => a.label.localeCompare(b.label));

        if (this.listAgences.length > 0) {
          this.selectedAgence = this.listAgences[0].code;
        }

        // Charger les périodes
        this.pdfFilesService.getPeriods().subscribe(periods => {
          this.listPeriods = periods.sort((a, b) => a.localeCompare(b));
          this.selectedPeriod = this.listPeriods[0];

          // Charger fichiers initiaux
          this.onAgenceOrPeriodChange();
        });
      });
    });
  }

  onAgenceOrPeriodChange(): void {
    if (!this.selectedAgence || !this.selectedPeriod) return;

    const [monthStr, yearStr] = this.selectedPeriod.split('/');
    const year = parseInt(yearStr, 10);
    const month = parseInt(monthStr, 10);

    this.loadFilesByAgencyAndPeriod(this.selectedAgence, year, month);
  }

  loadFilesByAgencyAndPeriod(agence: string, year: number, month: number): void {
    this.pdfFilesService
      .getPdfFilesByAgencyAndPeriod(agence, year, month)
      .subscribe(data => {
        this.originalAllFilesList = data;
        this.newFilteredList = [...data];
        this.blobUrls = {};

        data.forEach(item => {
          if (item.docFile) {
            this.blobUrls[item.docFile] = this.getBlobUrl(item.docFile);
          }
        });

        this.generateMonthYearOptions();
        this.applyAllFilters();
        this.cdr.detectChanges();
      });
  }

  onTabChange(tab: number) {
    this.tab = tab;
    this.selectedMonthYear = '';
    this.applyAllFilters();
    this.generateMonthYearOptions();
    this.onAgenceOrPeriodChange();
  }

  getBlobUrl(docFile: string): string {
    const b64chain = docFile.replace(/['"]/g, '');
    if (!b64chain) throw new Error('La chaîne Base64 est invalide.');

    try {
      const db64chain = atob(b64chain);
      const byteArrays = new Uint8Array(db64chain.length);
      for (let i = 0; i < db64chain.length; i++) {
        byteArrays[i] = db64chain.charCodeAt(i);
      }
      const blob = new Blob([byteArrays], { type: 'application/pdf' });
      return URL.createObjectURL(blob);
    } catch (error) {
      console.error('Erreur lors du décodage Base64:', error);
      throw new Error('Erreur de décodage Base64');
    }
  }

  filteredSearch() {
    this.applyAllFilters();
  }

  generateMonthYearOptions(): void {
    const uniqueMonthYears = new Set<string>();
    this.newFilteredList.forEach(file => {
      if (file.fileType === (this.tab === 1 ? 'Fact' : 'Paie')) {
        const date = new Date(file.dateFile);
        const monthYear = `${(date.getMonth() + 1).toString().padStart(2, '0')}/${date.getFullYear()}`;
        uniqueMonthYears.add(monthYear);
      }
    });

    this.monthYearOptions = Array.from(uniqueMonthYears).sort((a, b) => {
      const [monthA, yearA] = a.split('/').map(Number);
      const [monthB, yearB] = b.split('/').map(Number);
      return yearB - yearA || monthB - monthA;
    });
  }

  onMonthYearChange(): void {
    this.applyAllFilters();
  }

  applyAllFilters() {
    const currentFileType = this.tab === 1 ? 'Fact' : 'Paie';
    const query = currentFileType === 'Fact' ? this.searchQueryFactures : this.searchQueryFiches;
    const startDate = currentFileType === 'Fact' ? this.startDateFactures : this.startDateFiches;
    const endDate = currentFileType === 'Fact' ? this.endDateFactures : this.endDateFiches;

    this.newFilteredList = this.originalAllFilesList.filter(item => {
      if (item.fileType !== currentFileType) return false;

      if (query && !item.tiersName.toLowerCase().includes(query.toLowerCase())) {
        return false;
      }

      if (startDate && endDate) {
        const itemDate = new Date(item.dateFile);
        if (itemDate < startDate || itemDate > endDate) {
          return false;
        }
      }

      if (this.selectedMonthYear) {
        const [month, year] = this.selectedMonthYear.split('/').map(Number);
        const itemDate = new Date(item.dateFile);
        if (itemDate.getMonth() + 1 !== month || itemDate.getFullYear() !== year) {
          return false;
        }
      }

      return true;
    });

    this.cdr.detectChanges();
  }
}
