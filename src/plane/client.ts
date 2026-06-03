import { config } from '../config.js';
import { logger } from '../logger.js';

export interface PlaneProject {
  id: string;
  name: string;
  identifier: string;
  url: string;
}

export interface PlaneIssue {
  id: string;
  name: string;
  url: string;
}

export class PlaneClient {
  private baseUrl: string;
  private apiKey: string;
  private workspaceSlug: string;

  constructor() {
    this.baseUrl = config.PLANE_URL.replace(/\/$/, '');
    this.apiKey = config.PLANE_API_KEY;
    this.workspaceSlug = config.PLANE_WORKSPACE_SLUG;
  }

  private get apiBase() {
    return `${this.baseUrl}/api/v1/workspaces/${this.workspaceSlug}`;
  }

  private headers() {
    return {
      'X-API-Key': this.apiKey,
      'Content-Type': 'application/json',
    };
  }

  private projectUrl(projectId: string): string {
    return `${this.baseUrl}/${this.workspaceSlug}/projects/${projectId}/issues/`;
  }

  private issueUrl(projectId: string, issueId: string): string {
    return `${this.baseUrl}/${this.workspaceSlug}/projects/${projectId}/issues/${issueId}/`;
  }

  async createProject(name: string, description?: string): Promise<PlaneProject> {
    const baseIdentifier = name
      .toUpperCase()
      .replace(/[^A-Z0-9]/g, '')
      .slice(0, 5) || 'PROJ';

    const tryCreate = async (identifier: string) => {
      const url = `${this.apiBase}/projects/`;
      return fetch(url, {
        method: 'POST',
        headers: this.headers(),
        body: JSON.stringify({
          name: name.trim(),
          description: description?.trim() || '',
          identifier,
          network: 0,
        }),
      });
    };

    let response = await tryCreate(baseIdentifier);

    if (!response.ok) {
      const body = await response.text().catch(() => '');
      if (response.status === 400 && body.includes('identifier')) {
        const fallbackIdentifier = baseIdentifier.slice(0, 3) + Date.now().toString().slice(-2);
        response = await tryCreate(fallbackIdentifier);
      }
      if (!response.ok) {
        const body2 = await response.text().catch(() => '');
        throw new Error(`Failed to create Plane project: ${response.status} ${body2}`);
      }
    }

    const project = await response.json();
    logger.info({ projectId: project.id, name: project.name }, 'plane_project_created');
    return {
      id: project.id,
      name: project.name,
      identifier: project.identifier,
      url: this.projectUrl(project.id),
    };
  }

  async getProjectStates(projectId: string): Promise<Array<{ id: string; name: string; group: string }>> {
    const url = `${this.apiBase}/projects/${projectId}/states/`;
    const response = await fetch(url, { headers: this.headers() });
    if (!response.ok) throw new Error('Failed to fetch project states');
    const data = await response.json();
    return data.results ?? data;
  }

  async findStateByGroup(
    projectId: string,
    group: 'backlog' | 'unstarted' | 'started' | 'completed' | 'cancelled'
  ): Promise<{ id: string; name: string } | null> {
    const states = await this.getProjectStates(projectId);
    return states.find((s) => s.group === group) ?? null;
  }

  async getWorkspaceMembers(): Promise<Array<{ memberId: string; email: string; displayName: string }>> {
    const url = `${this.apiBase}/members/`;
    const response = await fetch(url, { headers: this.headers() });
    if (!response.ok) throw new Error('Failed to fetch workspace members');
    const data = await response.json();
    const results = data.results ?? data;
    return results.map((m: any) => ({
      memberId: m.member?.id ?? m.id,
      email: (m.member?.email ?? m.email ?? '').toLowerCase(),
      displayName: m.member?.display_name ?? m.display_name ?? '',
    }));
  }

  async addMemberToProject(projectId: string, memberId: string): Promise<void> {
    const url = `${this.apiBase}/projects/${projectId}/members/`;
    const response = await fetch(url, {
      method: 'POST',
      headers: this.headers(),
      body: JSON.stringify({ member_id: memberId, role: 15 }),
    });
    if (!response.ok && response.status !== 400) {
      const body = await response.text().catch(() => '');
      throw new Error(`Failed to add member to project: ${response.status} ${body}`);
    }
  }

  async createIssue(projectId: string, name: string, assigneeIds: string[] = []): Promise<PlaneIssue> {
    const state = await this.findStateByGroup(projectId, 'unstarted');
    const url = `${this.apiBase}/projects/${projectId}/issues/`;
    const response = await fetch(url, {
      method: 'POST',
      headers: this.headers(),
      body: JSON.stringify({
        name,
        ...(state ? { state_id: state.id } : {}),
        assignees: assigneeIds,
      }),
    });
    if (!response.ok) {
      const body = await response.text().catch(() => '');
      throw new Error(`Failed to create issue: ${response.status} ${body}`);
    }
    const issue = await response.json();
    return {
      id: issue.id,
      name: issue.name,
      url: this.issueUrl(projectId, issue.id),
    };
  }

  async hasActiveIssues(projectId: string): Promise<boolean> {
    const states = await this.getProjectStates(projectId);
    const activeGroups = new Set(['backlog', 'unstarted', 'started']);
    const activeStateIds = states.filter((s) => activeGroups.has(s.group)).map((s) => s.id);

    for (const stateId of activeStateIds) {
      const url = `${this.apiBase}/projects/${projectId}/issues/?state=${stateId}&per_page=1`;
      const response = await fetch(url, { headers: this.headers() });
      if (!response.ok) continue;
      const data = await response.json();
      const count = data.count ?? (data.results ?? data).length;
      if (count > 0) return true;
    }
    return false;
  }
}

export const planeClient = new PlaneClient();
