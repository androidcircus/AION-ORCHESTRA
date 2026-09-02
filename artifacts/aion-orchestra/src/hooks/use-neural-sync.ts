import { useState, useEffect } from 'react';
import { Network } from '@capacitor/network';
import { App } from '@capacitor/app';

/**
 * Neural Sync Hook - AION ORCHESTRA
 * Manages autonomous updates and repository synchronization.
 */

export interface SyncStatus {
  isChecking: boolean;
  updateAvailable: boolean;
  currentVersion: string;
  latestVersion: string | null;
  lastSync: Date | null;
  error: string | null;
}

const GITHUB_REPO_URL = 'https://raw.githubusercontent.com/androidcircus/AION-ORCHESTRA/main/artifacts/aion-orchestra/public/version.json';

export function useNeuralSync() {
  const [status, setStatus] = useState<SyncStatus>({
    isChecking: false,
    updateAvailable: false,
    currentVersion: '4.2.0', // Standard Nebula Core Version
    latestVersion: null,
    lastSync: null,
    error: null,
  });

  const checkSync = async () => {
    const connection = await Network.getStatus();
    if (!connection.connected) {
      console.log('[NEURAL SYNC]: Offline. Maintaining local logic node.');
      return;
    }

    setStatus(prev => ({ ...prev, isChecking: true, error: null }));

    try {
      // Fetch version manifest from GitHub
      const response = await fetch(`${GITHUB_REPO_URL}?t=${Date.now()}`);
      if (!response.ok) throw new Error('Could not establish link to AION Repository.');

      const data = await response.json();
      const latest = data.version;

      const hasUpdate = latest !== status.currentVersion;

      setStatus(prev => ({
        ...prev,
        isChecking: false,
        updateAvailable: hasUpdate,
        latestVersion: latest,
        lastSync: new Date(),
      }));

      if (hasUpdate) {
        console.warn(`%c[NEURAL SYNC]: New Logic Node detected (${latest}). Ready for realignment.`, "color: #00f0ff;");
      }
    } catch (err: any) {
      setStatus(prev => ({
        ...prev,
        isChecking: false,
        error: 'Sync link unstable.'
      }));
    }
  };

  useEffect(() => {
    checkSync();

    // Listen for app coming to foreground to re-check
    const handleStateChange = App.addListener('appStateChange', ({ isActive }) => {
      if (isActive) checkSync();
    });

    return () => {
      handleStateChange.then(h => h.remove());
    };
  }, []);

  const applyUpdate = () => {
    console.log('%c[NEURAL SYNC]: Applying update. Restarting Core...', "color: #bc00ff;");
    // In a real Capacitor OTA setup, this would trigger CapacitorUpdater.reload()
    window.location.reload();
  };

  return { ...status, checkSync, applyUpdate };
}
