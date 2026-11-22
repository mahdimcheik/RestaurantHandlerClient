import { inject, Service } from '@angular/core';
import { Observable } from 'rxjs';
import {
  DashboardStats,
  ManageStatsPeakHoursGet$Params,
  ManageStatsProductsGet$Params,
  PeakHoursReport,
  ProductSalesReport,
  StatsApi,
} from '../../core/api/generated';
import { unwrap } from './api-operators';

@Service()
export class StatsService {
  private readonly api = inject(StatsApi);

  dashboard(date?: string): Observable<DashboardStats> {
    return this.api.manageStatsDashboardGet({ date }).pipe(unwrap());
  }

  productSales(params?: ManageStatsProductsGet$Params): Observable<ProductSalesReport> {
    return this.api.manageStatsProductsGet(params).pipe(unwrap());
  }

  peakHours(params?: ManageStatsPeakHoursGet$Params): Observable<PeakHoursReport> {
    return this.api.manageStatsPeakHoursGet(params).pipe(unwrap());
  }
}
