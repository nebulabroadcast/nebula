import axios from 'axios';
import { v4 as uuidv4 } from 'uuid';

interface MetaType {
  title: string;
  header: string | null;
  description: string | null;
  type: string;
}

interface CSOption {
  value: string;
  title: string;
  description: string | null;
  role: string;
}

const nebula = {
  // Settings

  settings: {},
  user: {},
  plugins: [],
  scopedEndpoints: {},
  language: 'en',
  senderId: uuidv4(),
  users: [],
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

  // Metadata helpers

  metaType(key: string): MetaType {
    const metaType = this.settings?.metatypes[key];
    if (!metaType)
      return {
        title: key,
        header: key,
        description: null,
        type: 'string',
      };
    return metaType;
  },

  metaTitle(key: string): string {
    return this.settings?.metatypes[key]?.title || key;
  },

  metaHeader(key: string): string | null {
    return this.settings?.metatypes[key]?.header || '';
  },

  metaDescription(key: string): string | null {
    return this.settings?.metatypes[key]?.header || null;
  },

  csOptions(key: string): CSOption[] {
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

  getPlayoutChannel(id_channel: number) {
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

  getScopedEndpoints(scope) {
    const result = [];
    for (const scopedEndpoint of this.scopedEndpoints || {}) {
      if (scopedEndpoint.scopes.includes(scope)) result.push(scopedEndpoint);
    }
    return result;
  },

  getWritableFolders() {
    return (this.settings?.folders || []).filter((folder) => {
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

  can(permission: string, value, anyval = false): boolean {
    if (this.user.is_admin) {
      return true;
    }
    const key = `can/${permission}`;
    if (this.user[key] === false) {
      return false;
    }
    if (anyval) {
      return true;
    }
    if (this.user[key] === true) {
      return true;
    }
    if (this.user[key] === value) {
      return true;
    }
    return this.user[key].includes(value);
  },

  logout() {
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
