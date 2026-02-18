import { check } from "@tauri-apps/plugin-updater";
import { relaunch } from "@tauri-apps/plugin-process";

export interface UpdateCheckResult {
  available: boolean;
  version?: string;
  body?: string;
}

export interface UpdateProgress {
  total: number | null;
  downloaded: number;
}

export async function checkForUpdate(): Promise<UpdateCheckResult> {
  const update = await check();
  if (!update) {
    return { available: false };
  }
  return {
    available: true,
    version: update.version,
    body: update.body ?? undefined,
  };
}

export async function downloadAndInstallUpdate(
  onProgress?: (progress: UpdateProgress) => void,
): Promise<void> {
  const update = await check();
  if (!update) {
    throw new Error("No update available");
  }

  let totalBytes: number | null = null;
  let downloadedBytes = 0;

  await update.downloadAndInstall((event) => {
    if (event.event === "Started") {
      totalBytes = event.data.contentLength ?? null;
      downloadedBytes = 0;
      onProgress?.({ total: totalBytes, downloaded: 0 });
    } else if (event.event === "Progress") {
      downloadedBytes += event.data.chunkLength;
      onProgress?.({ total: totalBytes, downloaded: downloadedBytes });
    } else {
      onProgress?.({ total: totalBytes, downloaded: downloadedBytes });
    }
  });

  await relaunch();
}
