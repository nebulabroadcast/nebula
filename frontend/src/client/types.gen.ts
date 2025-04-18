// This file is auto-generated by @hey-api/openapi-ts

export type AcceptModel = {
  /**
   * List of folder IDs
   */
  folders?: Array<number> | null;
  /**
   * List of content types that are accepted. None means all types are accepted.
   */
  content_types?: Array<ContentType> | null;
  /**
   * List of media types that are accepted. None means all types are accepted.
   */
  media_types?: Array<MediaType> | null;
};

export type ActionItemModel = {
  id: number;
  name: string;
};

export type ActionsRequestModel = {
  /**
   * List of asset IDs for which to get available actions
   */
  ids: Array<number>;
};

export type ActionsResponseModel = {
  /**
   * List of available actions
   */
  actions?: Array<ActionItemModel>;
};

export type AgentInfo = {
  platform?: string | null;
  client?: string | null;
  device?: string | null;
};

export type ApplyTemplateRequestModel = {
  id_channel: number;
  template_name: string;
  date: string;
  /**
   * Clear all events before applying the template
   */
  clear?: boolean;
};

export type BasePlayoutChannelSettings = {
  id: number;
  name: string;
  fps?: number;
  plugins?: Array<string>;
  solvers?: Array<string>;
  day_start?: [number, number];
  rundown_columns?: Array<string>;
  /**
   * Metadata fields available for the channel events
   */
  fields?: Array<FolderField>;
  send_action?: number | null;
  scheduler_accepts?: AcceptModel;
  rundown_accepts?: AcceptModel;
  default_template?: string | null;
};

/**
 * Base system settings.
 *
 * Contains settings that are common for server and client.
 * Not all settings are used by the client.
 */
export type BaseSystemSettings = {
  /**
   * A name used as the site (instance) identification
   */
  site_name?: string;
  language?: 'en' | 'cs';
  /**
   * Allow creating assets in the UI(when set to false, assets can only be created via API and watch folders)
   */
  ui_asset_create?: boolean;
  /**
   * Allow previewing low-res proxies of assets in the UI
   */
  ui_asset_preview?: boolean;
  /**
   * Allow uploading asset media files in the UI (when set to false, assets can only be uploaded via API and watch folders)
   */
  ui_asset_upload?: boolean;
  /**
   * String used to separate title and subtitle in displayed title
   */
  subtitle_separator?: string;
};

export type BrowseRequestModel = {
  view?: number | null;
  query?: string | null;
  /**
   * List of additional conditions
   */
  conditions?: Array<ConditionModel> | null;
  /**
   * Override the view columns.Note that several columns are always included.
   */
  columns?: Array<string> | null;
  ignore_view_conditions?: boolean;
  /**
   * Maximum number of items
   */
  limit?: number;
  /**
   * Offset
   */
  offset?: number;
  order_by?: string | null;
  order_dir?: 'asc' | 'desc';
};

export type BrowseResponseModel = {
  columns?: Array<string>;
  data?: Array<{
    [key: string]:
      | number
      | number
      | string
      | boolean
      | {
          [key: string]: unknown;
        }
      | Array<unknown>
      | null;
  }>;
  order_by?: string | null;
  order_dir: 'asc' | 'desc';
};

export type ClientCsItemModel = {
  title: string;
  description?: string | null;
  role?: ('hidden' | 'header' | 'label' | 'option') | null;
};

export type ClientInfo = {
  ip: string;
  languages?: Array<string>;
  location?: LocationInfo | null;
  agent?: AgentInfo | null;
};

export type ClientMetaTypeModel = {
  ns?: string;
  /**
   * Type of the value
   */
  type?: string;
  /**
   * Title of the field
   */
  title: string;
  /**
   * Shortened title used as a column header
   */
  header?: string | null;
  description: string | null;
  /**
   * Classification scheme URN
   */
  cs?: string | null;
  /**
   * Mode / widget of the field
   */
  mode?: string | null;
  /**
   * Format of the field
   */
  format?: string | null;
  /**
   * Order of values in lists
   */
  order?: string | null;
  /**
   * Filter for values in lists
   */
  filter?: string | null;
  default?: unknown | null;
};

/**
 * Client settings.
 *
 * This model is returned by the server to the client in the
 * /api/init request along with the current user information.
 */
export type ClientSettingsModel = {
  system?: BaseSystemSettings;
  folders?: Array<FolderSettings>;
  views?: Array<ViewSettings>;
  users?: Array<UserInfo>;
  metatypes?: {
    [key: string]: ClientMetaTypeModel;
  };
  cs?: {
    [key: string]: {
      [key: string]: ClientCsItemModel;
    };
  };
  playout_channels?: Array<BasePlayoutChannelSettings>;
  filetypes?: {
    [key: string]: ContentType;
  };
  server_url?: string | null;
};

export type ConditionModel = {
  key: string;
  value?:
    | number
    | number
    | string
    | boolean
    | {
        [key: string]: unknown;
      }
    | Array<unknown>
    | null;
  operator?:
    | '='
    | 'LIKE'
    | 'ILIKE'
    | 'IN'
    | 'NOT IN'
    | 'IS NULL'
    | 'IS NOT NULL'
    | '>'
    | '>='
    | '<'
    | '<=';
};

export type ContentType = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10;

export type ContextTestRequest = {
  /**
   * Asset ID
   */
  id_asset: number;
};

export type DeleteRequestModel = {
  object_type?: ObjectType;
  /**
   * A list of object IDs to delete
   */
  ids: Array<number>;
};

export type EventData = {
  /**
   * Event ID. None for new events.
   */
  id?: number | null;
  start: number;
  /**
   * ID of the asset to be used as a primary asset for this event.
   */
  id_asset?: number | null;
  items?: Array<{
    [key: string]: number | string | number | Array<string> | boolean | null;
  }> | null;
  /**
   * Metadata for the event.
   */
  meta?: {
    [key: string]: number | string | number | Array<string> | boolean | null;
  } | null;
};

export type FolderField = {
  name: string;
  section?: string | null;
  mode?: string | null;
  format?: string | null;
  order?: string | null;
  filter?: string | null;
  links?: Array<unknown>;
};

export type FolderLink = {
  name: string;
  view: number;
  source_key: string;
  target_key: string;
};

export type FolderSettings = {
  id: number;
  name: string;
  color: string;
  fields?: Array<FolderField>;
  links?: Array<FolderLink>;
};

export type GetRequestModel = {
  /**
   * Type of objects to get
   */
  object_type?: ObjectType;
  /**
   * List of object IDs to retrieve
   */
  ids?: Array<number>;
};

export type GetResponseModel = {
  /**
   * List of object data
   */
  data?: Array<{
    [key: string]: unknown;
  }>;
};

export type HttpValidationError = {
  detail?: Array<ValidationError>;
};

export type InitResponseModel = {
  /**
   * Is Nebula installed?
   */
  installed?: boolean | null;
  /**
   * Server welcome string (displayed on login page)
   */
  motd?: string | null;
  /**
   * User data if user is logged in
   */
  user?: UserModel | null;
  settings?: ClientSettingsModel | null;
  /**
   * List of plugins available for the web frontend
   */
  frontend_plugins?: Array<PluginItemModel> | null;
  /**
   * List of available scoped endpoints
   */
  scoped_endpoints?: Array<ScopedEndpoint> | null;
  oauth2_options?: Array<{
    [key: string]: unknown;
  }> | null;
  experimental?: boolean | null;
};

export type InvalidateSessionRequestModel = {
  token: string;
};

export type JobState = 0 | 1 | 2 | 3 | 4 | 5 | 6;

export type JobsItemModel = {
  id: number;
  status: JobState;
  progress: number;
  id_action: number;
  id_service?: number | null;
  id_asset: number;
  /**
   * ID of the user who started the job
   */
  id_user?: number | null;
  priority?: number;
  message: string;
  ctime?: number | null;
  stime?: number | null;
  etime?: number | null;
  /**
   * Asset full title (title + subtitle)
   */
  asset_name?: string | null;
  idec?: string | null;
  action_name?: string | null;
  service_name?: string | null;
  service_type?: string | null;
};

export type JobsRequestModel = {
  /**
   * Defines, what jobs should be returned.
   * When set to none, 204 response is returned instead of list of jobs
   */
  view?: ('all' | 'active' | 'finished' | 'failed') | null;
  /**
   * Return only the jobs with the given IDs
   */
  ids?: Array<number> | null;
  /**
   * Return jobs of asset with the given IDs
   */
  asset_ids?: Array<number> | null;
  /**
   * Search for jobs with given string in title
   */
  search_query?: string | null;
  /**
   * Abort job with given id
   */
  abort?: number | null;
  /**
   * Restart job with given id
   */
  restart?: number | null;
  /**
   * Set priority of job with given id. First value is the job id, second is the priority
   */
  priority?: [number, number] | null;
};

export type JobsResponseModel = {
  jobs?: Array<JobsItemModel> | null;
};

export type ListSessionsRequestModel = {
  id_user: number;
};

export type ListTemplatesResponseModel = {
  templates?: Array<TemplateItemModel>;
};

/**
 * Response model for listing users
 */
export type ListUsersResponseModel = {
  users: Array<UserModel>;
};

export type LocationInfo = {
  country?: string | null;
  subdivision?: string | null;
  city?: string | null;
};

export type LoginRequestModel = {
  username: string;
  /**
   * Password in plain text
   */
  password: string;
};

export type LoginResponseModel = {
  /**
   * Access token to be used in Authorization headerfor the subsequent requests
   */
  access_token: string;
};

export type MediaType = 0 | 1 | 2;

/**
 * Object status enumeration.
 *
 * This enumeration is used to indicate the status of an object.
 * Objects can be in one of the following states:
 *
 * - OFFLINE: Object is in the database, but not available on the filesystem.
 * - ONLINE: Object is in the database and available on the filesystem.
 * - CREATING: Media file exists, but was changed recently, so its metadata
 * is being updated.
 * - TRASHED: Object has been marked as deleted, but is still available on
 * the filesystem. It will be deleted permanently after some time.
 * - ARCHIVED: Object has been marked as archived, but is still available on
 * the filesystem. It will be deleted permanently after some time.
 * - RESET: User has requested to reset the metadata of the object,
 * this triggers a re-scan of the media file metadata.
 * - CORRUPTED: Object is corrupted, and cannot be used.
 * - REMOTE: Object is not available on the filesystem, but is available one
 * a remote storage (typically a playout item which media file is on a
 * production storage, but it hasn't been copied to the playout storage yet).
 * - UNKNOWN: Object status is unknown.
 * - AIRED: Only for items. Item has been broadcasted.
 * - ONAIR: Only for items. Item is currently being broadcasted.
 * - RETRIEVING: Asset is marked for retrieval from a remote/archive storage.
 */
export type ObjectStatus = 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11;

export type ObjectType = 'asset' | 'item' | 'bin' | 'event' | 'user';

export type OperationModel = {
  /**
   * Object type
   */
  object_type?: ObjectType;
  /**
   * Object ID. Keep empty to create a new object
   */
  id?: number | null;
  /**
   * Metadata to be set
   */
  data: {
    [key: string]: unknown;
  };
};

export type OperationResponseModel = {
  object_type?: ObjectType;
  success: boolean;
  error?: string | null;
  id?: number | null;
};

export type OperationsRequestModel = {
  /**
   * List of operations to be executed
   */
  operations: Array<OperationModel>;
};

export type OperationsResponseModel = {
  operations: Array<OperationResponseModel>;
  /**
   * True if all operations succeeded
   */
  success: boolean;
};

/**
 * An item in the order request
 */
export type OrderItemModel = {
  /**
   * The ID of the object (none for new items)
   */
  id?: number | null;
  type: 'item' | 'asset';
  meta?: {
    [key: string]: unknown;
  };
};

export type OrderRequestModel = {
  id_channel: number;
  id_bin: number;
  order: Array<OrderItemModel>;
};

export type OrderResponseModel = {
  affected_bins: Array<number>;
};

export type PasswordRequestModel = {
  login?: string | null;
  password: string;
};

export type PlayoutAction =
  | 'cue'
  | 'take'
  | 'abort'
  | 'freeze'
  | 'retake'
  | 'set'
  | 'plugin_list'
  | 'plugin_exec'
  | 'stat'
  | 'recover'
  | 'cue_forward'
  | 'cue_backward';

export type PlayoutPluginManifest = {
  name: string;
  title: string;
  slots?: Array<PlayoutPluginSlot> | null;
};

export type PlayoutPluginSlot = {
  type: 'action' | 'text' | 'number' | 'select';
  name: string;
  options?: Array<PlayoutPluginSlotOption>;
  value?: unknown;
};

export type PlayoutPluginSlotOption = {
  value: string;
  title?: string | null;
};

export type PlayoutRequestModel = {
  id_channel: number;
  /**
   * Action to be executed on the playout service
   */
  action: PlayoutAction;
  /**
   * Engine specific action arguments
   */
  payload?: {
    [key: string]: unknown;
  };
};

export type PlayoutResponseModel = {
  plugins?: Array<PlayoutPluginManifest> | null;
};

/**
 * Plugin item model.
 *
 * This model is used to describe a plugin in the frontend.
 */
export type PluginItemModel = {
  name: string;
  title: string;
  icon?: string | null;
  scope?: 'tool' | 'mam';
  path: string;
};

export type RunMode = 0 | 1 | 2 | 3 | 4;

export type RundownRequestModel = {
  id_channel: number;
  date?: string | null;
};

export type RundownResponseModel = {
  rows?: Array<RundownRow>;
  detail?: string | null;
};

export type RundownRow = {
  id: number;
  row_number: number;
  type: 'item' | 'event';
  id_bin: number;
  id_event: number;
  scheduled_time: number;
  broadcast_time: number;
  meta?: {
    [key: string]: unknown;
  } | null;
  title?: string | null;
  subtitle?: string | null;
  note?: string | null;
  id_asset?: number | null;
  id_folder?: number | null;
  asset_mtime?: number | null;
  status?: ObjectStatus | null;
  transfer_progress?: number | null;
  duration?: number;
  mark_in?: number | null;
  mark_out?: number | null;
  run_mode?: RunMode | null;
  loop?: boolean | null;
  item_role?: ('lead_in' | 'lead_out' | 'placeholder' | 'live') | null;
  is_empty?: boolean;
  is_primary?: boolean;
};

export type SchedulerRequestModel = {
  id_channel: number;
  /**
   * Date of the week start in YYYY-MM-DD format.If none. event data won't be returned.
   */
  date?: string | null;
  /**
   * Number of days to display. One week is the default
   */
  days?: number;
  /**
   * List of event IDs to delete
   */
  delete?: Array<number>;
  /**
   * List of events to create or update
   */
  events?: Array<EventData>;
};

export type SchedulerResponseModel = {
  /**
   * List of event IDs that were affected by this request
   */
  affected_events?: Array<number>;
  /**
   * List of bin IDs that were affected by this request
   */
  affected_bins?: Array<number>;
  /**
   * List of events
   */
  events?: Array<{
    [key: string]: unknown;
  }>;
};

export type ScopedEndpoint = {
  endpoint: string;
  title: string;
  scopes: Array<string>;
};

export type SendRequestModel = {
  /**
   * List of asset ids
   */
  ids?: Array<number>;
  /**
   * Action ID
   */
  id_action: number;
  restart_existing?: boolean;
  restart_running?: boolean;
  params?: {
    [key: string]: unknown;
  };
  priority?: number;
};

export type SendResponseModel = {
  /**
   * List of job ids created/restarted.
   */
  ids?: Array<number | null>;
};

export type ServiceItemModel = {
  id: number;
  name: string;
  type: string;
  hostname: string;
  /**
   * Current status of the service
   */
  status: ServiceState;
  autostart: boolean;
  /**
   * Number of seconds since service was last seen
   */
  last_seen: number;
};

export type ServiceRequestModel = {
  /**
   * ID of service to stop
   */
  stop?: number | null;
  /**
   * ID of service to start
   */
  start?: number | null;
  /**
   * ID of service to toggle autostart
   */
  auto?: number | null;
};

export type ServiceState = 0 | 1 | 2 | 3 | 4;

export type ServicesResponseModel = {
  services?: Array<ServiceItemModel>;
};

export type SessionModel = {
  /**
   * User data
   */
  user: {
    [key: string]: unknown;
  };
  /**
   * Access token
   */
  token: string;
  /**
   * Creation timestamp
   */
  created: number;
  /**
   * Last access timestamp
   */
  accessed: number;
  /**
   * Client info
   */
  client_info?: ClientInfo | null;
};

export type SolveRequestModel = {
  solver: string;
  /**
   * List of placeholder item IDs to solve
   */
  items: Array<number>;
};

export type TemplateItemModel = {
  name: string;
  title: string;
};

export type UserInfo = {
  id: number;
  name: string;
  full_name?: string | null;
};

export type UserModel = {
  id?: number | null;
  login: string;
  ctime: number;
  mtime: number;
  email?: string | null;
  full_name?: string | null;
  local_network_only?: boolean;
  is_admin?: boolean;
  is_limited?: boolean;
  permissions?: UserPermissionsModel;
  password?: string | null;
  api_key?: string | null;
};

/**
 * User permission model.
 */
export type UserPermissionsModel = {
  /**
   * List of folder IDs user can view. Use 'true' for all folders
   */
  asset_view?: boolean | Array<number>;
  /**
   * List of folder IDs user can edit. Use 'true' for all folders
   */
  asset_edit?: boolean | Array<number>;
  /**
   * List of channel IDs user can view. 'true' for all channels
   */
  rundown_view?: boolean | Array<number>;
  /**
   * List of channel IDs user can edit. 'true' for all channels
   */
  rundown_edit?: boolean | Array<number>;
  /**
   * List of channel IDs user can view. 'true' for all channels
   */
  scheduler_view?: boolean | Array<number>;
  /**
   * List of channel IDs user can edit. 'true' for all channels
   */
  scheduler_edit?: boolean | Array<number>;
  /**
   * List of service IDs user can control
   */
  service_control?: boolean | Array<number>;
  /**
   * List of channel IDs user can control
   */
  mcr?: boolean | Array<number>;
  /**
   * Use list of action IDs to grant access to specific actions
   */
  job_control?: boolean | Array<number>;
};

export type ValidationError = {
  loc: Array<string | number>;
  msg: string;
  type: string;
};

export type ViewSettings = {
  id: number;
  name: string;
  position: number;
  folders?: Array<number> | null;
  states?: Array<number> | null;
  columns?: Array<string> | null;
  conditions?: Array<string> | null;
  separator?: boolean;
};

export type DeleteData = {
  body: DeleteRequestModel;
  headers?: {
    authorization?: string | null;
    'x-api-key'?: string | null;
    'x-client-id'?: string | null;
  };
  path?: never;
  query?: {
    token?: string | null;
    api_key?: string | null;
  };
  url: '/api/delete';
};

export type DeleteErrors = {
  /**
   * Validation Error
   */
  422: HttpValidationError;
};

export type DeleteError = DeleteErrors[keyof DeleteErrors];

export type DeleteResponses = {
  /**
   * Successful Response
   */
  200: unknown;
};

export type ListUsersData = {
  body?: never;
  headers?: {
    authorization?: string | null;
    'x-api-key'?: string | null;
  };
  path?: never;
  query?: {
    token?: string | null;
    api_key?: string | null;
  };
  url: '/api/list-users';
};

export type ListUsersErrors = {
  /**
   * Validation Error
   */
  422: HttpValidationError;
};

export type ListUsersError = ListUsersErrors[keyof ListUsersErrors];

export type ListUsersResponses = {
  /**
   * Successful Response
   */
  200: ListUsersResponseModel;
};

export type ListUsersResponse = ListUsersResponses[keyof ListUsersResponses];

export type SaveUserData = {
  body: UserModel;
  headers?: {
    authorization?: string | null;
    'x-api-key'?: string | null;
  };
  path?: never;
  query?: {
    token?: string | null;
    api_key?: string | null;
  };
  url: '/api/save-user';
};

export type SaveUserErrors = {
  /**
   * Validation Error
   */
  422: HttpValidationError;
};

export type SaveUserError = SaveUserErrors[keyof SaveUserErrors];

export type SaveUserResponses = {
  /**
   * Successful Response
   */
  200: unknown;
};

export type InitData = {
  body?: never;
  headers?: {
    authorization?: string | null;
  };
  path?: never;
  query?: {
    token?: string | null;
  };
  url: '/api/init';
};

export type InitErrors = {
  /**
   * Validation Error
   */
  422: HttpValidationError;
};

export type InitError = InitErrors[keyof InitErrors];

export type InitResponses = {
  /**
   * Successful Response
   */
  200: InitResponseModel;
};

export type InitResponse = InitResponses[keyof InitResponses];

export type BrowseData = {
  body: BrowseRequestModel;
  headers?: {
    authorization?: string | null;
    'x-api-key'?: string | null;
  };
  path?: never;
  query?: {
    token?: string | null;
    api_key?: string | null;
  };
  url: '/api/browse';
};

export type BrowseErrors = {
  /**
   * Validation Error
   */
  422: HttpValidationError;
};

export type BrowseError = BrowseErrors[keyof BrowseErrors];

export type BrowseResponses = {
  /**
   * Successful Response
   */
  200: BrowseResponseModel;
};

export type BrowseResponse = BrowseResponses[keyof BrowseResponses];

export type GetData = {
  body: GetRequestModel;
  headers?: {
    authorization?: string | null;
    'x-api-key'?: string | null;
  };
  path?: never;
  query?: {
    token?: string | null;
    api_key?: string | null;
  };
  url: '/api/get';
};

export type GetErrors = {
  /**
   * Validation Error
   */
  422: HttpValidationError;
};

export type GetError = GetErrors[keyof GetErrors];

export type GetResponses = {
  /**
   * Successful Response
   */
  200: GetResponseModel;
};

export type GetResponse = GetResponses[keyof GetResponses];

export type LoginData = {
  body: LoginRequestModel;
  path?: never;
  query?: never;
  url: '/api/login';
};

export type LoginErrors = {
  /**
   * Validation Error
   */
  422: HttpValidationError;
};

export type LoginError = LoginErrors[keyof LoginErrors];

export type LoginResponses = {
  /**
   * Successful Response
   */
  200: LoginResponseModel;
};

export type LoginResponse = LoginResponses[keyof LoginResponses];

export type LogoutData = {
  body?: never;
  headers?: {
    authorization?: string | null;
  };
  path?: never;
  query?: never;
  url: '/api/logout';
};

export type LogoutErrors = {
  /**
   * Validation Error
   */
  422: HttpValidationError;
};

export type LogoutError = LogoutErrors[keyof LogoutErrors];

export type LogoutResponses = {
  /**
   * Successful Response
   */
  200: unknown;
};

export type PasswordData = {
  body: PasswordRequestModel;
  headers?: {
    authorization?: string | null;
    'x-api-key'?: string | null;
  };
  path?: never;
  query?: {
    token?: string | null;
    api_key?: string | null;
  };
  url: '/api/password';
};

export type PasswordErrors = {
  /**
   * Validation Error
   */
  422: HttpValidationError;
};

export type PasswordError = PasswordErrors[keyof PasswordErrors];

export type PasswordResponses = {
  /**
   * Successful Response
   */
  200: unknown;
};

export type RundownData = {
  body: RundownRequestModel;
  headers?: {
    authorization?: string | null;
    'x-api-key'?: string | null;
  };
  path?: never;
  query?: {
    token?: string | null;
    api_key?: string | null;
  };
  url: '/api/rundown';
};

export type RundownErrors = {
  /**
   * Validation Error
   */
  422: HttpValidationError;
};

export type RundownError = RundownErrors[keyof RundownErrors];

export type RundownResponses = {
  /**
   * Successful Response
   */
  200: RundownResponseModel;
};

export type RundownResponse = RundownResponses[keyof RundownResponses];

export type ServicesData = {
  body: ServiceRequestModel;
  headers?: {
    authorization?: string | null;
    'x-api-key'?: string | null;
  };
  path?: never;
  query?: {
    token?: string | null;
    api_key?: string | null;
  };
  url: '/api/services';
};

export type ServicesErrors = {
  /**
   * Validation Error
   */
  422: HttpValidationError;
};

export type ServicesError = ServicesErrors[keyof ServicesErrors];

export type ServicesResponses = {
  /**
   * Successful Response
   */
  200: ServicesResponseModel;
};

export type ServicesResponse = ServicesResponses[keyof ServicesResponses];

export type OpsData = {
  body: OperationsRequestModel;
  headers?: {
    authorization?: string | null;
    'x-api-key'?: string | null;
  };
  path?: never;
  query?: {
    token?: string | null;
    api_key?: string | null;
  };
  url: '/api/ops';
};

export type OpsErrors = {
  /**
   * Validation Error
   */
  422: HttpValidationError;
};

export type OpsError = OpsErrors[keyof OpsErrors];

export type OpsResponses = {
  /**
   * Successful Response
   */
  200: OperationsResponseModel;
};

export type OpsResponse = OpsResponses[keyof OpsResponses];

export type SetData = {
  body: OperationModel;
  headers?: {
    authorization?: string | null;
    'x-api-key'?: string | null;
  };
  path?: never;
  query?: {
    token?: string | null;
    api_key?: string | null;
  };
  url: '/api/set';
};

export type SetErrors = {
  /**
   * Validation Error
   */
  422: HttpValidationError;
};

export type SetError = SetErrors[keyof SetErrors];

export type SetResponses = {
  /**
   * Successful Response
   */
  200: OperationResponseModel;
};

export type SetResponse = SetResponses[keyof SetResponses];

export type PlayoutData = {
  body: PlayoutRequestModel;
  headers?: {
    authorization?: string | null;
    'x-api-key'?: string | null;
  };
  path?: never;
  query?: {
    token?: string | null;
    api_key?: string | null;
  };
  url: '/api/playout';
};

export type PlayoutErrors = {
  /**
   * Validation Error
   */
  422: HttpValidationError;
};

export type PlayoutError = PlayoutErrors[keyof PlayoutErrors];

export type PlayoutResponses = {
  /**
   * Successful Response
   */
  200: PlayoutResponseModel;
};

export type PlayoutResponse = PlayoutResponses[keyof PlayoutResponses];

export type SchedulerData = {
  body: SchedulerRequestModel;
  headers?: {
    authorization?: string | null;
    'x-api-key'?: string | null;
    'x-client-id'?: string | null;
  };
  path?: never;
  query?: {
    token?: string | null;
    api_key?: string | null;
  };
  url: '/api/scheduler';
};

export type SchedulerErrors = {
  /**
   * Validation Error
   */
  422: HttpValidationError;
};

export type SchedulerError = SchedulerErrors[keyof SchedulerErrors];

export type SchedulerResponses = {
  /**
   * Successful Response
   */
  200: SchedulerResponseModel;
};

export type SchedulerResponse = SchedulerResponses[keyof SchedulerResponses];

export type UploadData = {
  body?: never;
  headers?: {
    authorization?: string | null;
    'x-api-key'?: string | null;
  };
  path: {
    id_asset: number;
  };
  query?: {
    token?: string | null;
    api_key?: string | null;
  };
  url: '/upload/{id_asset}';
};

export type UploadErrors = {
  /**
   * Validation Error
   */
  422: HttpValidationError;
};

export type UploadError = UploadErrors[keyof UploadErrors];

export type UploadResponses = {
  /**
   * Successful Response
   */
  200: unknown;
};

export type OrderData = {
  body: OrderRequestModel;
  headers?: {
    authorization?: string | null;
    'x-api-key'?: string | null;
    'x-client-id'?: string | null;
  };
  path?: never;
  query?: {
    token?: string | null;
    api_key?: string | null;
  };
  url: '/api/order';
};

export type OrderErrors = {
  /**
   * Validation Error
   */
  422: HttpValidationError;
};

export type OrderError = OrderErrors[keyof OrderErrors];

export type OrderResponses = {
  /**
   * Successful Response
   */
  200: OrderResponseModel;
};

export type OrderResponse = OrderResponses[keyof OrderResponses];

export type InvalidateSessionData = {
  body: InvalidateSessionRequestModel;
  headers?: {
    authorization?: string | null;
    'x-api-key'?: string | null;
  };
  path?: never;
  query?: {
    token?: string | null;
    api_key?: string | null;
  };
  url: '/api/invalidate_session';
};

export type InvalidateSessionErrors = {
  /**
   * Validation Error
   */
  422: HttpValidationError;
};

export type InvalidateSessionError =
  InvalidateSessionErrors[keyof InvalidateSessionErrors];

export type InvalidateSessionResponses = {
  /**
   * Successful Response
   */
  200: unknown;
};

export type SessionsData = {
  body: ListSessionsRequestModel;
  headers?: {
    authorization?: string | null;
    'x-api-key'?: string | null;
  };
  path?: never;
  query?: {
    token?: string | null;
    api_key?: string | null;
  };
  url: '/api/sessions';
};

export type SessionsErrors = {
  /**
   * Validation Error
   */
  422: HttpValidationError;
};

export type SessionsError = SessionsErrors[keyof SessionsErrors];

export type SessionsResponses = {
  /**
   * Successful Response
   */
  200: Array<SessionModel>;
};

export type SessionsResponse = SessionsResponses[keyof SessionsResponses];

export type ActionsData = {
  body: ActionsRequestModel;
  headers?: {
    authorization?: string | null;
    'x-api-key'?: string | null;
  };
  path?: never;
  query?: {
    token?: string | null;
    api_key?: string | null;
  };
  url: '/api/actions';
};

export type ActionsErrors = {
  /**
   * Validation Error
   */
  422: HttpValidationError;
};

export type ActionsError = ActionsErrors[keyof ActionsErrors];

export type ActionsResponses = {
  /**
   * Successful Response
   */
  200: ActionsResponseModel;
};

export type ActionsResponse = ActionsResponses[keyof ActionsResponses];

export type JobsData = {
  body: JobsRequestModel;
  headers?: {
    authorization?: string | null;
    'x-api-key'?: string | null;
  };
  path?: never;
  query?: {
    token?: string | null;
    api_key?: string | null;
  };
  url: '/api/jobs';
};

export type JobsErrors = {
  /**
   * Validation Error
   */
  422: HttpValidationError;
};

export type JobsError = JobsErrors[keyof JobsErrors];

export type JobsResponses = {
  /**
   * Successful Response
   */
  200: JobsResponseModel;
};

export type JobsResponse = JobsResponses[keyof JobsResponses];

export type SendData = {
  body: SendRequestModel;
  headers?: {
    authorization?: string | null;
    'x-api-key'?: string | null;
  };
  path?: never;
  query?: {
    token?: string | null;
    api_key?: string | null;
  };
  url: '/api/send';
};

export type SendErrors = {
  /**
   * Validation Error
   */
  422: HttpValidationError;
};

export type SendError = SendErrors[keyof SendErrors];

export type SendResponses = {
  /**
   * Successful Response
   */
  200: SendResponseModel;
};

export type SendResponse = SendResponses[keyof SendResponses];

export type ApplySchedulingTemplateData = {
  body: ApplyTemplateRequestModel;
  headers?: {
    authorization?: string | null;
    'x-api-key'?: string | null;
    'x-client-id'?: string | null;
  };
  path?: never;
  query?: {
    token?: string | null;
    api_key?: string | null;
  };
  url: '/api/apply-scheduling-template';
};

export type ApplySchedulingTemplateErrors = {
  /**
   * Validation Error
   */
  422: HttpValidationError;
};

export type ApplySchedulingTemplateError =
  ApplySchedulingTemplateErrors[keyof ApplySchedulingTemplateErrors];

export type ApplySchedulingTemplateResponses = {
  /**
   * Successful Response
   */
  200: unknown;
};

export type ListSchedulingTemplatesData = {
  body?: never;
  headers?: {
    'x-client-id'?: string | null;
  };
  path?: never;
  query?: never;
  url: '/api/list-scheduling-templates';
};

export type ListSchedulingTemplatesErrors = {
  /**
   * Validation Error
   */
  422: HttpValidationError;
};

export type ListSchedulingTemplatesError =
  ListSchedulingTemplatesErrors[keyof ListSchedulingTemplatesErrors];

export type ListSchedulingTemplatesResponses = {
  /**
   * Successful Response
   */
  200: ListTemplatesResponseModel;
};

export type ListSchedulingTemplatesResponse =
  ListSchedulingTemplatesResponses[keyof ListSchedulingTemplatesResponses];

export type ProxyData = {
  body?: never;
  headers?: {
    authorization?: string | null;
    'x-api-key'?: string | null;
  };
  path: {
    id_asset: number;
  };
  query?: {
    token?: string | null;
    api_key?: string | null;
  };
  url: '/proxy/{id_asset}';
};

export type ProxyErrors = {
  /**
   * Validation Error
   */
  422: HttpValidationError;
};

export type ProxyError = ProxyErrors[keyof ProxyErrors];

export type ProxyResponses = {
  /**
   * Successful Response
   */
  200: unknown;
};

export type SolveData = {
  body: SolveRequestModel;
  headers?: {
    authorization?: string | null;
    'x-api-key'?: string | null;
  };
  path?: never;
  query?: {
    token?: string | null;
    api_key?: string | null;
  };
  url: '/api/solve';
};

export type SolveErrors = {
  /**
   * Validation Error
   */
  422: HttpValidationError;
};

export type SolveError = SolveErrors[keyof SolveErrors];

export type SolveResponses = {
  /**
   * Successful Response
   */
  200: unknown;
};

export type AssignmentsData = {
  body?: never;
  headers?: {
    authorization?: string | null;
    'x-api-key'?: string | null;
  };
  path?: never;
  query?: {
    token?: string | null;
    api_key?: string | null;
  };
  url: '/api/assignments';
};

export type AssignmentsErrors = {
  /**
   * Validation Error
   */
  422: HttpValidationError;
};

export type AssignmentsError = AssignmentsErrors[keyof AssignmentsErrors];

export type AssignmentsResponses = {
  /**
   * Successful Response
   */
  200: unknown;
};

export type TestCtxData = {
  body: ContextTestRequest;
  headers?: {
    authorization?: string | null;
    'x-api-key'?: string | null;
  };
  path?: never;
  query?: {
    token?: string | null;
    api_key?: string | null;
  };
  url: '/api/test_ctx';
};

export type TestCtxErrors = {
  /**
   * Validation Error
   */
  422: HttpValidationError;
};

export type TestCtxError = TestCtxErrors[keyof TestCtxErrors];

export type TestCtxResponses = {
  /**
   * Successful Response
   */
  200: unknown;
};

export type AssetRunsData = {
  body: ContextTestRequest;
  headers?: {
    authorization?: string | null;
    'x-api-key'?: string | null;
  };
  path?: never;
  query?: {
    token?: string | null;
    api_key?: string | null;
  };
  url: '/api/asset_runs';
};

export type AssetRunsErrors = {
  /**
   * Validation Error
   */
  422: HttpValidationError;
};

export type AssetRunsError = AssetRunsErrors[keyof AssetRunsErrors];

export type AssetRunsResponses = {
  /**
   * Successful Response
   */
  200: unknown;
};

export type ClientOptions = {
  baseUrl: 'http://localhost:4455' | (string & {});
};
