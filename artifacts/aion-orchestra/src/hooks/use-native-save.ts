import { Filesystem, Directory } from '@capacitor/filesystem';
import { Share } from '@capacitor/share';
import { Capacitor } from '@capacitor/core';

/**
 * Native Save & Share Hook - AION ORCHESTRA
 * Handles multi-platform file persistence and sharing.
 */

export function useNativeSave() {
  const isNative = Capacitor.isNativePlatform();

  const saveFile = async (blob: Blob, fileName: string) => {
    try {
      if (isNative) {
        // Convert Blob to Base64 for Capacitor Filesystem
        const reader = new FileReader();
        const base64Promise = new Promise<string>((resolve) => {
          reader.onloadend = () => {
            const base64String = reader.result as string;
            resolve(base64String.split(',')[1]); // Remove data:application/octet-stream;base64,
          };
        });
        reader.readAsDataURL(blob);
        const base64Data = await base64Promise;

        // Write to Documents Directory
        const result = await Filesystem.writeFile({
          path: fileName,
          data: base64Data,
          directory: Directory.Documents,
        });

        console.log(`%c[NATIVE SAVE]: Signal captured to ${result.uri}`, "color: #00f0ff;");
        return result.uri;
      } else {
        // Fallback for Web/Desktop
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = fileName;
        a.click();
        URL.revokeObjectURL(url);
        return 'web-download-triggered';
      }
    } catch (err) {
      console.error('[NATIVE SAVE]: Healing failed.', err);
      throw err;
    }
  };

  const shareFile = async (blob: Blob, fileName: string, title: string, text: string) => {
    if (!isNative) {
      console.warn('[NATIVE SHARE]: Only available on mobile nodes.');
      return;
    }

    try {
      const uri = await saveFile(blob, fileName);
      if (uri) {
        await Share.share({
          title,
          text,
          url: uri,
          dialogTitle: 'Share Nebula Creation',
        });
      }
    } catch (err) {
      console.error('[NATIVE SHARE]: Broadcast interrupted.', err);
    }
  };

  const saveFromUrl = async (url: string, fileName: string) => {
    try {
      const response = await fetch(url);
      const blob = await response.blob();
      return await saveFile(blob, fileName);
    } catch (err) {
      console.error('[NATIVE SAVE]: Link transmission failed.', err);
      throw err;
    }
  };

  const shareFromUrl = async (url: string, fileName: string, title: string, text: string) => {
    try {
      const response = await fetch(url);
      const blob = await response.blob();
      return await shareFile(blob, fileName, title, text);
    } catch (err) {
      console.error('[NATIVE SHARE]: Link transmission failed.', err);
      throw err;
    }
  };

  return { saveFile, shareFile, saveFromUrl, shareFromUrl, isNative };
}
