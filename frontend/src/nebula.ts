import axios from 'axios';
import { v4 as uuidv4 } from 'uuid';

import type {
  ClientSettingsModel,
  ClientMetaTypeModel,
  ClientCsItemModel,
  FolderSettings,
  UserModel,
  PluginItemModel,
  ScopedEndpoint,
  BasePlayoutChannelSettings,
} from './client';

const nebula = {
  // Settings

  settings: undefined as ClientSettingsModel | undefined,
  user: undefined as UserModel | undefined,
  plugins: [] as PluginItemModel[],
  scopedEndpoints: [] as ScopedEndpoint[],
  language: 'en',
  senderId: uuidv4(),
  experimental: false,
  locale: typeof window !== 'undefined' ? navigator.language || 'en-US' : 'en-US',

  // API

  request(endpoint: string, data = {}) {
    return axios.post(`/api/${endpoint}`, data);
  },

  getAccessToken(): string {
    const header = axios.defaults?.headers?.common['Authorization'];
    return typeof header === 'string' ? header.replace('Bearer ', '') : '';
  },

  // Metadata
  metaType(key: string): ClientMetaTypeModel {
    return (
      this.settings?.metatypes?.[key] || {
        title: key,
        header: key,
        description: null,
        type: 'string',
      }
    );
  },

  csOptions(key: string): ClientCsItemModel[] {
    const cs = this.settings?.cs?.[key] || {};
    const result = [];
    for (const value in cs) {
      result.push({
        value,
        title: cs[value].title,
        description: cs[value].description,
        role: cs[value].role,
      });
    }
    return result;
  },

  // Settings

  getPlayoutChannel(id_channel: number): BasePlayoutChannelSettings | undefined {
    for (const channel of this.settings?.playout_channels || []) {
      if (channel.id === id_channel) return channel;
    }
  },

  getFolderName(id_folder: number): string | undefined {
    for (const folder of this.settings?.folders || []) {
      if (folder.id === id_folder) return folder.name;
    }
  },

  getUserName(id_user: number): string | undefined {
    for (const user of this.settings?.users || []) {
      if (user.id === id_user) return user.full_name || undefined;
    }
    return undefined;
  },

  getScopedEndpoints(scope: string): ScopedEndpoint[] {
    const result = [];
    for (const scopedEndpoint of this.scopedEndpoints || {}) {
      if (scopedEndpoint.scopes.includes(scope)) result.push(scopedEndpoint);
    }
    return result;
  },

  getWritableFolders(): FolderSettings[] {
    if (!this.user) return [];
    return (this.settings?.folders || []).filter((folder: FolderSettings) => {
      if (this.can('asset_edit', folder.id)) return true;
      return false;
    });
  },

  // User access

  can(permission: string, value: string | boolean | number, anyval = false): boolean {
    if (!this.user) return false;
    if (this.user.is_admin) return true;

    const userPermissions: {
      [key: string]: boolean | string | number | (string | number | boolean)[];
    } = this.user.permissions || {};

    if (!Object.keys(userPermissions).includes(permission)) {
      return false;
    }

    const pval = userPermissions[permission];
    if (!pval) return false;

    if (anyval) {
      if (typeof pval === 'boolean' && pval) return true;
      if (Array.isArray(pval) && pval.length > 0) return true;
      return false;
    }

    if (pval === true) {
      return true;
    }
    if (pval === value) {
      return true;
    }

    if (Array.isArray(pval) && pval.includes(value)) {
      return true;
    }

    return false;
  },

  logout(): void {
    this.request('logout')
      .then(() => {
        window.location.href = '/';
      })
      .catch(() => {
        window.location.href = '/';
      });
  },
};
export default nebula;
