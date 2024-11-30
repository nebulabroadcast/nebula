import axios from 'axios'
import { v4 as uuidv4 } from 'uuid'

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
  locale:
    typeof window !== 'undefined' ? navigator.language || 'sv-SE' : 'sv-SE',

  // API

  request(endpoint, data = {}) {
    return axios.post(`/api/${endpoint}`, data)
  },

  getAccessToken() {
    return axios.defaults.headers.common['Authorization'].replace('Bearer ', '')
  },

  // Metadata helpers

  metaType(key) {
    const metaType = this.settings?.metatypes[key]
    if (!metaType)
      return {
        title: key,
        header: key,
        description: null,
        type: 'string',
      }
    return metaType
  },

  metaTitle(key) {
    return this.settings?.metatypes[key]?.title || key
  },

  metaHeader(key) {
    return this.settings?.metatypes[key]?.header || ''
  },

  metaDescription(key) {
    return this.settings?.metatypes[key]?.header || null
  },

  csOptions(key) {
    const cs = this.settings?.cs[key] || {}
    const result = []
    for (const value in cs) {
      result.push({
        value,
        title: cs[value].title,
        description: cs[value].description,
        role: cs[value].role,
      })
    }
    return result
  },

  getPlayoutChannel(id_channel) {
    for (const channel of this.settings?.playout_channels || []) {
      if (channel.id === id_channel) return channel
    }
  },

  getFolderName(id_folder) {
    for (const folder of this.settings?.folders || []) {
      if (folder.id === id_folder) return folder.name
    }
  },

  getUserName(id_user) {
    for (const user of this.settings?.users || []) {
      if (user.id === id_user) return user.full_name
    }
  },

  getScopedEndpoints(scope) {
    const result = []
    for (const scopedEndpoint of this.scopedEndpoints || {}) {
      if (scopedEndpoint.scopes.includes(scope)) result.push(scopedEndpoint)
    }
    return result
  },

  getWritableFolders() {
    return (this.settings?.folders || []).filter((folder) => {
      if (this.user.is_admin) return true
      if (this.user['can/asset_edit'] === true) return true
      if (
        Array.isArray(this.user['can/asset_edit']) &&
        this.user['can/asset_edit'].includes(folder.id)
      )
        return true
      return false
    })
  },

  logout() {
    this.request('logout')
      .then(() => {
        window.location.href = '/'
      })
      .catch(() => {
        window.location.href = '/'
      })
  },
}
export default nebula
