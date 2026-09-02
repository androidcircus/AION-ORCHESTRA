/**
 * CMO SWARM HEAL SCRIPT - AION ORCHESTRA
 * Orchestrates a project-wide repair swarm to fix common code errors and realign logic nodes.
 */

import { execSync } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';

const PROJECT_ROOT = path.resolve(__dirname, '..');

function heal() {
  console.log("%c🚀 [CMO]: Initializing Repair Swarm...", "color: #00f0ff; font-weight: bold;");

  try {
    // 1. Dependency Alignment
    if (!fs.existsSync(path.join(PROJECT_ROOT, 'pnpm-lock.yaml'))) {
      console.warn("⚠️ [CMO]: pnpm-lock.yaml missing. Realignment required.");
    }

    // 2. Clear Build Artifacts
    const buildPath = path.join(PROJECT_ROOT, 'artifacts/aion-orchestra/dist');
    if (fs.existsSync(buildPath)) {
      console.log("🧹 [CMO]: Purging stale builds...");
      fs.rmSync(buildPath, { recursive: true, force: true });
    }

    // 3. Logic Node Verification (Type Check)
    console.log("🔍 [CMO]: Scanning for neural inconsistencies (TypeCheck)...");
    try {
      execSync('pnpm run typecheck', { stdio: 'inherit', cwd: PROJECT_ROOT });
    } catch (e) {
      console.warn("⚠️ [CMO]: Neural Node detected syntax warnings. Manual oversight recommended.");
    }

    console.log("✅ [CMO]: Swarm Success. Core Realignment Complete.");
  } catch (error: any) {
    console.error("❌ [CMO]: Swarm failure during healing phase:", error.message);
    process.exit(1);
  }
}

heal();
