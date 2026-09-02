/**
 * Chief Medical Officer (CMO) - AION ORCHESTRA
 * Responsible for system health, error diagnosis, and swarm repair orchestration.
 */

import { logger } from "./logger";

export type MedicalReport = {
  id: string;
  timestamp: Date;
  severity: "low" | "medium" | "high" | "critical";
  component: string;
  diagnosis: string;
  symptoms: string[];
  repairStatus: "pending" | "healing" | "resolved" | "failed";
};

class ChiefMedicalOfficer {
  private reports: MedicalReport[] = [];
  private isSwarmActive: boolean = false;

  constructor() {
    logger.info("[CMO]: Node activated. Monitoring Nebula protocols...");
  }

  /**
   * Diagnoses a system anomaly and files a medical report.
   */
  public diagnose(error: Error, component: string, severity: MedicalReport["severity"] = "medium"): MedicalReport {
    const report: MedicalReport = {
      id: `report-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
      timestamp: new Date(),
      severity,
      component,
      diagnosis: error.message,
      symptoms: error.stack ? [error.stack] : [],
      repairStatus: "pending",
    };

    this.reports.push(report);
    logger.error({ report }, `[CMO]: System Anomaly Detected in ${component}`);

    if (severity === "critical" || severity === "high") {
      this.deployRepairSwarm(report);
    }

    return report;
  }

  /**
   * Deploys the repair swarm to heal the system.
   */
  private async deployRepairSwarm(report: MedicalReport) {
    if (this.isSwarmActive) return;

    this.isSwarmActive = true;
    report.repairStatus = "healing";
    logger.warn(`[CMO]: Deploying Repair Swarm for ${report.id}...`);

    try {
      // In a real autonomous system, this would trigger repair scripts or sub-agents.
      // For now, we simulate the healing process.
      await new Promise(resolve => setTimeout(resolve, 2000));

      report.repairStatus = "resolved";
      logger.info(`[CMO]: Swarm Success. ${report.id} has been resolved.`);
    } catch (err) {
      report.repairStatus = "failed";
      logger.error(`[CMO]: Swarm Failed to heal ${report.id}. Manual intervention required.`);
    } finally {
      this.isSwarmActive = false;
    }
  }

  public getReports() {
    return this.reports;
  }

  public getStatus() {
    return {
      status: this.reports.some(r => r.repairStatus !== "resolved") ? "distressed" : "healthy",
      activeReports: this.reports.filter(r => r.repairStatus !== "resolved").length,
      swarmActive: this.isSwarmActive
    };
  }
}

export const cmo = new ChiefMedicalOfficer();
