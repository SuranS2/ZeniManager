/**
 * useElectron.ts
 * React hook for Electron IPC integration.
 * Safely detects if running inside Electron and exposes IPC APIs.
 * Falls back gracefully in web browser context.
 */

// Extend Window interface for Electron API
declare global {
  interface Window {
    electronAPI?: {
      getVersion: () => Promise<string>;
      getAppName: () => Promise<string>;
      openFileDialog: (options?: {
        filters?: { name: string; extensions: string[] }[];
        title?: string;
      }) => Promise<{ canceled: boolean; filePaths: string[] }>;
      saveFileDialog: (options?: {
        filters?: { name: string; extensions: string[] }[];
        defaultPath?: string;
        title?: string;
      }) => Promise<{ canceled: boolean; filePath?: string }>;
      showMessage: (options: {
        type?: 'none' | 'info' | 'error' | 'question' | 'warning';
        title?: string;
        message: string;
        detail?: string;
        buttons?: string[];
      }) => Promise<{ response: number }>;
      openExternal: (url: string) => Promise<void>;
      onNavigate: (callback: (path: string) => void) => () => void;
      platform: string;
      isElectron: boolean;
    };
  }
}

export function useElectron() {
  const isElectron = typeof window !== 'undefined' && !!window.electronAPI?.isElectron;
  const api = window.electronAPI;

  return {
    /** Whether the app is running inside Electron */
    isElectron,

    /** Current platform: 'win32' | 'darwin' | 'linux' | 'web' */
    platform: isElectron ? (api?.platform ?? 'web') : 'web',

    /** Open a native file picker dialog */
    openFileDialog: isElectron
      ? api!.openFileDialog
      : async () => ({ canceled: true, filePaths: [] }),

    /** Open a native save dialog */
    saveFileDialog: isElectron
      ? api!.saveFileDialog
      : async () => ({ canceled: true, filePath: undefined }),

    /** Show a native message box */
    showMessage: isElectron
      ? api!.showMessage
      : async (opts: { message: string }) => {
          alert(opts.message);
          return { response: 0 };
        },

    /** Open URL in default browser */
    openExternal: isElectron
      ? api!.openExternal
      : async (url: string) => { window.open(url, '_blank'); },

    /** Listen for navigation events from the main process menu */
    onNavigate: isElectron
      ? api!.onNavigate
      : (_cb: (path: string) => void) => () => {},
  };
}
