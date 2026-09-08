import { invoke } from '@tauri-apps/api/core';

export interface DoAction {
  action_type: string;
  description: string;
  x?: number;
  y?: number;
  text?: string;
}

export interface ChatMessage {
  id?: number;
  role: string;
  content: string;
  timestamp: string;
}

export interface CaptureResult {
  image: string | null;
  rect: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
}

export async function getChatHistory(limit?: number): Promise<ChatMessage[]> {
  try {
    return await invoke<ChatMessage[]>('get_chat_history', { limit });
  } catch (e) {
    console.error('Failed to get chat history:', e);
    return [];
  }
}

export interface ActiveAgent {
  id: string;
  name: string;
  status: 'running' | 'paused';
}

export async function getActiveAgents(): Promise<ActiveAgent[]> {
  try {
    return await invoke<ActiveAgent[]>('get_active_agents');
  } catch (e) {
    console.error('Failed to get active agents:', e);
    return [];
  }
}

export interface UpdateCheckResult {
  available: boolean;
  version?: string;
  currentVersion: string;
  error?: string;
}

export interface AgentLogPayload {
  agent_id: string;
  message: string;
}

export interface AgentStatusPayload {
  agent_id: string;
  status: string;
}

export async function checkForAppUpdates(): Promise<UpdateCheckResult> {
  let currentVersion = '0.1.0';
  if (typeof window === 'undefined') {
    return { available: false, currentVersion };
  }

  try {
    const { isTauri } = await import('@tauri-apps/api/core');
    if (!isTauri()) {
      return { available: false, currentVersion };
    }

    try {
      const { getVersion } = await import('@tauri-apps/api/app');
      currentVersion = await getVersion();
    } catch {
      // Use fallback version
    }

    const { check } = await import('@tauri-apps/plugin-updater');
    const update = await check();
    if (update && update.available) {
      return {
        available: true,
        version: update.version,
        currentVersion: update.currentVersion || currentVersion,
      };
    }

    return {
      available: false,
      currentVersion: update?.currentVersion || currentVersion,
    };
  } catch (e: unknown) {
    const errMsg = e instanceof Error ? e.message : String(e);
    console.warn('Update check failed or running in non-Tauri environment:', errMsg);
    return {
      available: false,
      currentVersion,
      error: errMsg,
    };
  }
}

export async function installAppUpdate(): Promise<boolean> {
  if (typeof window === 'undefined') return false;
  try {
    const { isTauri } = await import('@tauri-apps/api/core');
    if (!isTauri()) return false;
    const { check } = await import('@tauri-apps/plugin-updater');
    const update = await check();
    if (update) {
      await update.downloadAndInstall();
      return true;
    }
    return false;
  } catch (e) {
    console.error('Failed to install update:', e);
    return false;
  }
}

export async function spawnAgent(agentId: string, task: string): Promise<void> {
  try {
    await invoke('spawn_headless_agent', { agentId, task });
  } catch (e) {
    console.error('Failed to spawn agent:', e);
  }
}

export async function killAgent(agentId: string): Promise<void> {
  try {
    await invoke('kill_headless_agent', { agentId });
  } catch (e) {
    console.error('Failed to kill agent:', e);
  }
}

