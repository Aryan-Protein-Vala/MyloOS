export const isTauri = () =>
  typeof window !== 'undefined' &&
  Boolean((window as unknown as { __TAURI_INTERNALS__?: unknown }).__TAURI_INTERNALS__);

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

export async function getChatHistory(_limit?: number): Promise<ChatMessage[]> {
  return [];
}

export interface ActiveAgent {
  id: string;
  name: string;
  status: 'running' | 'paused' | 'completed' | 'killed' | 'error';
}

export async function getActiveAgents(): Promise<ActiveAgent[]> {
  return [];
}

export interface UpdateCheckResult {
  available: boolean;
  version?: string;
  currentVersion: string;
  error?: string;
  newVersion?: string;
  releaseNotes?: string;
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
  return {
    available: false,
    currentVersion: '0.1.0',
    error: 'Updater requires Tauri desktop application',
  };
}

export async function installAppUpdate(): Promise<boolean> {
  return false;
}

export async function spawnAgent(_agentId: string, _task: string): Promise<boolean> {
  return false;
}

export async function killAgent(_agentId: string): Promise<boolean> {
  return false;
}
