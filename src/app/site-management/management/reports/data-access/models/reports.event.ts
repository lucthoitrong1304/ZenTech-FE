export enum ReportsEvent {
  TabChanged = '[Reports UI] Tab Changed',
  PeriodChanged = '[Reports UI] Period Changed',
  ExportTriggered = '[Reports UI] Export Triggered',
  RefreshRequested = '[Reports UI] Refresh Requested'
}

export interface IReportsEventPayload {
  type: ReportsEvent;
  payload?: string | object;
}
