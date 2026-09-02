/**
 * Frontend Chief Medical Officer (CMO) Client
 * Monitors UI health and reports anomalies to the central AION core.
 */

export type UIMedicalReport = {
  id: string;
  error: string;
  componentStack?: string;
  timestamp: string;
};

class UIMedicalOfficer {
  private static instance: UIMedicalOfficer;
  private reports: UIMedicalReport[] = [];

  private constructor() {
    console.log("%c[CMO]: Frontend Watchdog Active.", "color: #00f0ff; font-weight: bold;");
  }

  public static getInstance(): UIMedicalOfficer {
    if (!UIMedicalOfficer.instance) {
      UIMedicalOfficer.instance = new UIMedicalOfficer();
    }
    return UIMedicalOfficer.instance;
  }

  public report(error: Error, componentStack?: string) {
    const report: UIMedicalReport = {
      id: `ui-report-${Date.now()}`,
      error: error.message,
      componentStack,
      timestamp: new Date().toISOString()
    };

    this.reports.push(report);

    // Log with Cyberpunk styling
    console.group(`%c[CMO]: UI Anomaly Detected - ${report.id}`, "color: #ff0055; font-weight: bold;");
    console.error(error);
    if (componentStack) console.info(componentStack);
    console.log("%c[CMO]: Attempting Neural Realignment (Auto-Healing)...", "color: #bc00ff;");
    console.groupEnd();

    // In a real app, this might send to the backend CMO
    this.syncWithCore(report);
  }

  private async syncWithCore(report: UIMedicalReport) {
    try {
      await fetch('/api/healthz', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'diagnose', report })
      });
    } catch (e) {
      // Core offline, silent fail
    }
  }
}

export const cmoClient = UIMedicalOfficer.getInstance();
