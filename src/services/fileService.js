import fs from 'fs';
import path from 'path';
import os from 'os';
import { exec } from 'child_process';

/**
 * Returns default/suggested folder for saving Flux images.
 * @returns {string} Default path on current OS
 */
export function getDefaultSaveDirectory() {
  const homeDir = os.homedir();
  const picturesDir = path.join(homeDir, 'Pictures', 'FluxImages');
  return picturesDir;
}

/**
 * Opens native OS folder dialog.
 * Returns { success: true, folderPath } or { canceled: true } or { error: string }
 * @returns {Promise<{ success?: boolean, folderPath?: string, canceled?: boolean, error?: string }>}
 */
export function openNativeFolderDialog() {
  return new Promise((resolve) => {
    const platform = process.platform;

    if (platform === 'win32') {
      const psScript = `
        Add-Type -AssemblyName System.Windows.Forms;
        [System.Windows.Forms.Application]::EnableVisualStyles();
        $dialog = New-Object System.Windows.Forms.FolderBrowserDialog;
        $dialog.Description = 'Select folder to save Flux images';
        $dialog.ShowNewFolderButton = $true;
        if ($dialog.ShowDialog() -eq [System.Windows.Forms.DialogResult]::OK) {
          Write-Output $dialog.SelectedPath
        } else {
          Write-Output '__CANCELED__'
        }
      `.replace(/\r?\n/g, ' ');

      exec(
        `powershell -NoProfile -NonInteractive -ExecutionPolicy Bypass -Command "${psScript}"`,
        { timeout: 120000 },
        (error, stdout, stderr) => {
          if (error) {
            console.warn('[FileService] PowerShell folder dialog error:', error.message);
            return resolve({ success: false, error: error.message });
          }
          const output = stdout.trim();
          if (!output || output.includes('__CANCELED__')) {
            return resolve({ success: false, canceled: true });
          }
          const lines = output.split(/\r?\n/).map(l => l.trim()).filter(Boolean);
          const folderPath = lines[lines.length - 1];
          if (!folderPath || folderPath === '__CANCELED__') {
            return resolve({ success: false, canceled: true });
          }
          return resolve({ success: true, folderPath });
        }
      );
    } else if (platform === 'darwin') {
      const script = `osascript -e 'POSIX path of (choose folder with prompt "Select folder to save Flux images")'`;
      exec(script, { timeout: 120000 }, (error, stdout) => {
        if (error) {
          return resolve({ success: false, canceled: true });
        }
        const folderPath = stdout.trim();
        if (!folderPath) {
          return resolve({ success: false, canceled: true });
        }
        return resolve({ success: true, folderPath });
      });
    } else if (platform === 'linux') {
      const script = `zenity --file-selection --directory --title="Select folder to save Flux images" 2>/dev/null || kdialog --getexistingdirectory 2>/dev/null`;
      exec(script, { timeout: 120000 }, (error, stdout) => {
        if (error) {
          return resolve({ success: false, canceled: true });
        }
        const folderPath = stdout.trim();
        if (!folderPath) {
          return resolve({ success: false, canceled: true });
        }
        return resolve({ success: true, folderPath });
      });
    } else {
      return resolve({ success: false, error: `Platform ${platform} not supported for native folder dialog` });
    }
  });
}

/**
 * Saves a list of image items to the specified directory on disk.
 * @param {Object} options
 * @param {string} options.folderPath
 * @param {Array<{ url: string, filename?: string, seed?: number|string, id?: string }>} options.images
 */
export async function saveImagesToDisk({ folderPath, images }) {
  if (!folderPath || typeof folderPath !== 'string') {
    throw new Error('Target folder path is required.');
  }
  if (!Array.isArray(images) || images.length === 0) {
    throw new Error('No images provided to save.');
  }

  let resolvedPath = folderPath.trim();
  if (resolvedPath.startsWith('~')) {
    resolvedPath = path.join(os.homedir(), resolvedPath.slice(1));
  }
  resolvedPath = path.resolve(resolvedPath);

  // Ensure target directory exists
  await fs.promises.mkdir(resolvedPath, { recursive: true });

  const savedFiles = [];
  const errors = [];

  for (let i = 0; i < images.length; i++) {
    const item = images[i];
    const rawUrl = item.url || item.imageUrl;
    if (!rawUrl) continue;

    let filename = item.filename;
    if (!filename) {
      const seedStr = item.seed !== undefined && item.seed !== null ? item.seed : (i + 1);
      const shortId = (item.id || '').replace(/^img_/, '').slice(-6) || Math.random().toString(36).substring(2, 8);
      filename = `flux-${seedStr}-${shortId}.jpg`;
    }
    // Clean and sanitize filename
    filename = filename.replace(/[/\\?%*:|"<>]/g, '_');
    if (!filename.toLowerCase().endsWith('.jpg') && !filename.toLowerCase().endsWith('.jpeg') && !filename.toLowerCase().endsWith('.png')) {
      filename += '.jpg';
    }

    const targetFilePath = path.join(resolvedPath, filename);

    try {
      let buffer;
      if (rawUrl.startsWith('data:')) {
        const base64Data = rawUrl.split(',')[1];
        buffer = Buffer.from(base64Data, 'base64');
      } else {
        const fetchRes = await fetch(rawUrl);
        if (!fetchRes.ok) {
          throw new Error(`HTTP ${fetchRes.status} from ${rawUrl}`);
        }
        const arrayBuf = await fetchRes.arrayBuffer();
        buffer = Buffer.from(arrayBuf);
      }

      await fs.promises.writeFile(targetFilePath, buffer);
      savedFiles.push({
        filename,
        filePath: targetFilePath,
        size: buffer.length
      });
    } catch (err) {
      console.error(`[FileService] Failed to save image "${filename}":`, err.message);
      errors.push({ filename, error: err.message });
    }
  }

  return {
    success: savedFiles.length > 0,
    folderPath: resolvedPath,
    savedCount: savedFiles.length,
    total: images.length,
    savedFiles,
    errors: errors.length > 0 ? errors : undefined
  };
}
