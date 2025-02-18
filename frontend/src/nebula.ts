import axios from 'axios';
import { v4 as uuidv4 } from 'uuid';

import type {
  ClientSettingsModel,
  ClientMetaTypeModel,
  ClientCsItemModel,
  FolderSettings,
  UserInfoModel,
  PluginItemModel,
  ScopedEndpoint,
  BasePlayoutChannelSettings,
} from './client';

const nebula = {
  // Settings

  settings: undefined as ClientSettingsModel | undefined,
  user: undefined as UserInfoModel | undefined,
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
      this.settings?.metatypes[key] || {
        title: key,
        header: key,
        description: null,
        type: 'string',
      }
    );
  },

  csOptions(key: string): ClientCsItemModel[] {
    const cs = this.settings?.cs[key] || {};
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
      if (user.id === id_user) return user.full_name;
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
    return (this.settings?.folders || []).filter((folder: FolderSettings) => {
      if (this.user.is_admin) return true;
      if (this.user['can/asset_edit'] === true) return true;
      if (
        Array.isArray(this.user['can/asset_edit']) &&
        this.user['can/asset_edit'].includes(folder.id)
      )
        return true;
      return false;
    });
  },

  // User access

  can(permission: string, value: string | boolean | number[], anyval = false): boolean {
    if (this.user.is_admin) {
      return true;
    }
    if (this.user.permissions[permission] === false) {
      return false;
    }
    if (anyval) {
      return true;
    }
    if (this.user.permissions[permission] === true) {
      return true;
    }
    if (this.user.permissions[permission] === value) {
      return true;
    }
    return this.user.permissions[permission].includes(value);
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
