import fs from 'fs-extra';
import path from 'path';
import { fileURLToPath } from 'url';
import { logger } from '../utils/logger.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Service for checking and managing LANStreamer updates
 */
export class UpdateService {
  constructor() {
    this.currentVersion = null;
    this.latestVersion = null;
    this.lastCheck = null;
    this.checkInterval = 6 * 60 * 60 * 1000; // 6 hours
  }

  /**
   * Get current version from package.json
   */
  async getCurrentVersion() {
    try {
      if (this.currentVersion) return this.currentVersion;

      const packagePath = path.join(__dirname, '../../package.json');
      const packageData = await fs.readJson(packagePath);
      this.currentVersion = packageData.version || '1.0.0';
      
      logger.system('Current LANStreamer version detected', { version: this.currentVersion });
      return this.currentVersion;
    } catch (error) {
      logger.error('Failed to read current version:', error);
      return '1.0.0'; // Fallback version
    }
  }

  /**
   * Check for latest version from GitHub
   */
  async checkForUpdates() {
    try {
      logger.system('Checking for LANStreamer updates...');

      const response = await fetch('https://api.github.com/repos/jerryagenyi/LANStreamer/releases/latest', {
        timeout: 10000,
        headers: {
          'User-Agent': 'LANStreamer-UpdateChecker'
        }
      });

      if (!response.ok) {
        throw new Error(`GitHub API returned ${response.status}`);
      }

      const releaseData = await response.json();
      this.latestVersion = releaseData.tag_name.replace(/^v/, ''); // Remove 'v' prefix if present
      this.lastCheck = new Date();

      const current = await this.getCurrentVersion();
      const isUpdateAvailable = this.compareVersions(this.latestVersion, current) > 0;

      logger.system('Update check completed', {
        current: current,
        latest: this.latestVersion,
        updateAvailable: isUpdateAvailable
      });

      return {
        current: current,
        latest: this.latestVersion,
        updateAvailable: isUpdateAvailable,
        releaseUrl: releaseData.html_url,
        releaseNotes: releaseData.body,
        publishedAt: releaseData.published_at,
        downloadUrl: releaseData.zipball_url
      };

    } catch (error) {
      logger.error('Failed to check for updates:', error);
      return {
        current: await this.getCurrentVersion(),
        latest: null,
        updateAvailable: false,
        error: error.message
      };
    }
  }

  /**
   * Compare two version strings
   * Returns: 1 if v1 > v2, -1 if v1 < v2, 0 if equal
   */
  compareVersions(v1, v2) {
    const parts1 = v1.split('.').map(n => parseInt(n) || 0);
    const parts2 = v2.split('.').map(n => parseInt(n) || 0);
    
    const maxLength = Math.max(parts1.length, parts2.length);
    
    for (let i = 0; i < maxLength; i++) {
      const part1 = parts1[i] || 0;
      const part2 = parts2[i] || 0;
      
      if (part1 > part2) return 1;
      if (part1 < part2) return -1;
    }
    
    return 0;
  }

  /**
   * Get update status with caching
   */
  async getUpdateStatus() {
    // Return cached result if recent
    if (this.lastCheck && (Date.now() - this.lastCheck.getTime()) < this.checkInterval) {
      return {
        current: await this.getCurrentVersion(),
        latest: this.latestVersion,
        updateAvailable: this.latestVersion ? this.compareVersions(this.latestVersion, await this.getCurrentVersion()) > 0 : false,
        lastCheck: this.lastCheck,
        cached: true
      };
    }

    // Perform fresh check
    return await this.checkForUpdates();
  }

  /**
   * Get update instructions for the user
   */
  getUpdateInstructions() {
    return {
      automatic: {
        title: "Automatic Update (Recommended)",
        steps: [
          "1. Close LANStreamer (stop the server)",
          "2. Double-click 'Update LANStreamer.bat' in your installation folder",
          "3. Follow the on-screen instructions",
          "4. Your settings and data will be preserved automatically"
        ],
        note: "This method backs up your data and handles everything automatically."
      },
      manual: {
        title: "Manual Update",
        steps: [
          "1. Backup your .env file, icecast.xml, and data folder",
          "2. Download the latest release from GitHub",
          "3. Extract the new files over your installation",
          "4. Restore your backed up files",
          "5. Restart LANStreamer"
        ],
        note: "Only use this method if the automatic updater doesn't work."
      }
    };
  }

  /**
   * Check if update files exist
   */
  async checkUpdateFilesExist() {
    try {
      const rootDir = path.join(__dirname, '../..');
      const updateFiles = [
        'Update LANStreamer.bat'
      ];

      const results = {};
      for (const file of updateFiles) {
        const filePath = path.join(rootDir, file);
        results[file] = await fs.pathExists(filePath);
      }

      return results;
    } catch (error) {
      logger.error('Failed to check update files:', error);
      return {};
    }
  }

  /**
   * Get comprehensive update information
   */
  async getUpdateInfo() {
    const [updateStatus, updateFiles, instructions] = await Promise.all([
      this.getUpdateStatus(),
      this.checkUpdateFilesExist(),
      Promise.resolve(this.getUpdateInstructions())
    ]);

    return {
      ...updateStatus,
      updateFiles,
      instructions,
      timestamp: new Date().toISOString()
    };
  }
}

// Export singleton instance
export const updateService = new UpdateService();
