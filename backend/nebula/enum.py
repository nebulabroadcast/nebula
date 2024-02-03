import enum


class ObjectStatus(enum.IntEnum):
    """Object status enumeration.

    This enumeration is used to indicate the status of an object.
    Objects can be in one of the following states:

    - OFFLINE: Object is in the database, but not available on the filesystem.
    - ONLINE: Object is in the database and available on the filesystem.
    - CREATING: Media file exists, but was changed recently, so its metadata
        is being updated.
    - TRASHED: Object has been marked as deleted, but is still available on
        the filesystem. It will be deleted permanently after some time.
    - ARCHIVED: Object has been marked as archived, but is still available on
        the filesystem. It will be deleted permanently after some time.
    - RESET: User has requested to reset the metadata of the object,
        this triggers a re-scan of the media file metadata.
    - CORRUPTED: Object is corrupted, and cannot be used.
    - REMOTE: Object is not available on the filesystem, but is available one
        a remote storage (typically a playout item which media file is on a
        production storage, but it hasn't been copied to the playout storage yet).
    - UNKNOWN: Object status is unknown.
    - AIRED: Only for items. Item has been broadcasted.
    - ONAIR: Only for items. Item is currently being broadcasted.
    - RETRIEVING: Asset is marked for retrieval from a remote/archive storage.

    """

    OFFLINE = 0
    ONLINE = 1
    CREATING = 2
    TRASHED = 3
    ARCHIVED = 4
    RESET = 5
    CORRUPTED = 6
    REMOTE = 7
    UNKNOWN = 8
    AIRED = 9
    ONAIR = 10
    RETRIEVING = 11


class ContentType(enum.IntEnum):
    AUDIO = 1
    VIDEO = 2
    IMAGE = 3
    TEXT = 4
    DATABROADCASTING = 5
    INTERSTITIAL = 6
    EDUCATION = 7
    APPLICATION = 8
    GAME = 9
    PACKAGE = 10


class JobState(enum.IntEnum):
    PENDING = 0
    IN_PROGRESS = 1
    COMPLETED = 2
    FAILED = 3
    ABORTED = 4
    RESTART = 5
    SKIPPED = 6


class MediaType(enum.IntEnum):
    VIRTUAL = 0
    FILE = 1
    URI = 2


class MetaClass(enum.IntEnum):
    STRING = 0  # Single-line plain text (default)
    TEXT = 1  # Multiline text. 'syntax' can be provided in config
    INTEGER = 2  # Integer only value (for db keys, counts, etc.)
    NUMERIC = 3  # Any integer of float number
    BOOLEAN = 4  # Boolean value stored as... boolean value
    DATETIME = 5  # Date and time information. Stored as timestamp
    TIMECODE = 6  # Timecode information, stored as float (number of seconds)
    OBJECT = 7  # Arbitrary JSON-serializable object
    FRACTION = 8  # 16/9 etc...
    SELECT = 9  # Select one value from list. always stored as string
    LIST = 10  # Select 0 or more values from list, stored as array of strings
    COLOR = 11  # stored as integer


class ObjectType(enum.Enum):
    ASSET = "asset"
    ITEM = "item"
    BIN = "bin"
    EVENT = "event"
    USER = "user"


class ObjectTypeId(enum.IntEnum):
    ASSET = 0
    ITEM = 1
    BIN = 2
    EVENT = 3
    USER = 4


class RunMode(enum.IntEnum):
    RUN_AUTO = 0
    RUN_MANUAL = 1
    RUN_SOFT = 2
    RUN_HARD = 3
    RUN_SKIP = 4


class QCState(enum.IntEnum):
    NEW = 0
    AUTO_REJECTED = 1
    AUTO_ACCEPTED = 2
    REJECTED = 3
    ACCEPTED = 4


class ServiceState(enum.IntEnum):
    STOPPED = 0
    STARTED = 1
    STARTING = 2
    STOPPING = 3
    KILL = 4
