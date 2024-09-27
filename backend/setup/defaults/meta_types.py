from nebula.enum import MetaClass as T

META_TYPES = {
    "id": {
        "ns": "o",
        "index": True,
        "type": T.INTEGER,
        "default": None,
    },
    "id_asset": {
        "ns": "o",
        "index": True,
        "type": T.INTEGER,
        "default": None,
    },
    "id_item": {
        "ns": "o",
        "index": True,
        "type": T.INTEGER,
        "default": None,
    },
    "id_bin": {
        "ns": "o",
        "index": True,
        "type": T.INTEGER,
        "default": None,
    },
    "id_event": {
        "ns": "o",
        "index": True,
        "type": T.INTEGER,
        "default": None,
    },
    "created_by": {
        "ns": "o",
        "index": False,
        "type": T.INTEGER,
        "default": None,
    },
    "updated_by": {
        "ns": "o",
        "index": False,
        "type": T.INTEGER,
    },
    "id_user": {
        "ns": "o",
        "index": True,
        "type": T.INTEGER,
        "default": None,
    },
    "id_folder": {
        "ns": "o",
        "index": True,
        "type": T.INTEGER,
    },
    "ctime": {
        "ns": "o",
        "index": True,
        "type": T.DATETIME,
    },
    "mtime": {
        "ns": "o",
        "index": True,
        "type": T.DATETIME,
    },
    "is_admin": {
        "ns": "u",
        "type": T.BOOLEAN,
    },
    "full_name": {
        "ns": "u",
        "type": T.STRING,
    },
    "start": {
        "ns": "e",
        "type": T.DATETIME,
    },
    "stop": {
        "ns": "e",
        "type": T.DATETIME,
    },
    "run_mode": {
        "ns": "ei",
        "type": T.INTEGER,
    },
    "loop": {
        "ns": "i",
        "type": T.BOOLEAN,
    },
    "broadcast_time": {
        "ns": "v",
        "type": T.DATETIME,
        "format": "%H:%M:%S",
    },
    "scheduled_time": {
        "ns": "v",
        "type": T.DATETIME,
        "format": "%H:%M:%S",
    },
    "rundown_difference": {
        "ns": "v",
        "type": T.TIMECODE,
        "format": "%H:%M:%S",
    },
    "rundown_symbol": {
        "ns": "v",
        "type": T.INTEGER,
    },
    "rundown_row": {
        "ns": "v",
        "type": T.INTEGER,
    },
    "is_empty": {
        "ns": "v",
        "type": T.BOOLEAN,
    },
    "solver": {
        "ns": "ai",
        "type": T.SELECT,
        "cs": "urn:site:solvers",
    },
    "mark_in": {
        "ns": "ai",
        "type": T.TIMECODE,
        "default": None,
    },
    "mark_out": {
        "ns": "ai",
        "type": T.TIMECODE,
        "default": None,
    },
    "logo": {
        "ns": "ai",
        "type": T.SELECT,
        "cs": "urn:site:logo",
    },
    "media_type": {
        "ns": "a",
        "type": T.INTEGER,
    },
    "content_type": {
        "ns": "a",
        "type": T.INTEGER,
    },
    "status": {
        "ns": "a",
        "type": T.INTEGER,
        "default": 1,
    },
    "version_of": {
        "ns": "a",
        "type": T.INTEGER,
    },
    "id_storage": {
        "ns": "a",
        "type": T.INTEGER,
    },
    "path": {
        "ns": "a",
        "fulltext": 5,
        "type": T.STRING,
    },
    "subclips": {
        "ns": "a",
        "type": T.OBJECT,
    },
    "article": {
        "ns": "a",
        "fulltext": 5,
        "type": T.TEXT,
        "mode": "rich",
    },
    "cue_sheet": {
        "ns": "a",
        "fulltext": 5,
        "type": T.TEXT,
    },
    "aired": {
        "ns": "a",
        "type": T.BOOLEAN,
    },
    "title": {
        "ns": "m",
        "type": T.STRING,
        "fulltext": 9,
    },
    "subtitle": {
        "ns": "m",
        "fulltext": 8,
        "type": T.STRING,
    },
    "summary": {
        "ns": "m",
        "fulltext": 8,
        "type": T.TEXT,
        "syntax": "md",
    },
    "description": {
        "ns": "m",
        "fulltext": 7,
        "type": T.TEXT,
        "syntax": "md",
    },
    "color": {
        "ns": "m",
        "type": T.COLOR,
    },  # Object highlight color
    "notes": {
        "ns": "m",
        "fulltext": 4,
        "type": T.TEXT,
    },  # Production notes
    "promoted": {
        "ns": "m",
        "type": T.BOOLEAN,
    },
    "title/original": {
        "ns": "m",
        "fulltext": 8,
        "type": T.STRING,
    },
    "subtitle/original": {
        "ns": "m",
        "fulltext": 7,
        "type": T.STRING,
    },
    "description/original": {
        "ns": "m",
        "fulltext": 6,
        "type": T.TEXT,
        "syntax": "md",
    },
    "language": {
        "ns": "m",
        "type": T.SELECT,
        "cs": "urn:ebu:metadata-cs:ISO639_1LanguageCodeCS",
        "order": "alias",
    },
    "editorial_format": {
        "ns": "m",
        "type": T.SELECT,
        "index": True,
        "cs": "urn:ebu:metadata-cs:EditorialFormatCodeCS",
        "mode": "tree",
    },
    "editorial_control": {
        "ns": "m",
        "type": T.SELECT,
        "cs": "urn:ebu:metadata-cs:EditorialControlCodeCS",
        "mode": "radio",
    },
    "intended_audience": {
        "ns": "m",
        "type": T.LIST,
        "cs": "urn:ebu:metadata-cs:IntendedAudienceCodeCS",
        "mode": "tree",
    },
    "intention": {
        "ns": "m",
        "type": T.LIST,
        "cs": "urn:ebu:metadata-cs:IntentionCodeCS",
        "mode": "tree",
    },
    "genre": {
        "ns": "m",
        "index": True,
        "type": T.SELECT,
        "cs": "urn:ebu:metadata-cs:ContentGenreCS",
        "mode": "tree",
    },
    "atmosphere": {
        "ns": "m",
        "type": T.LIST,
        "cs": "urn:tva:metadata-cs:AtmosphereCS",
        "order": "alias",
    },
    "place": {
        "ns": "m",
        "type": T.STRING,
    },
    "place/type": {
        "ns": "m",
        "type": T.LIST,
        "cs": "urn:tva:metadata-cs:PlaceTypeCS",
        "mode": "tree",
    },
    "origination": {
        "ns": "m",
        "type": T.SELECT,
        "cs": "urn:tva:metadata:cs:OriginationCS",
        "mode": "tree",
    },
    "content_alert": {
        "ns": "m",
        "type": T.LIST,
        "cs": "urn:tva:metadata-cs:ContentAlertCS",
        "mode": "tree",
    },
    "content_alert/scheme": {
        "ns": "m",
        "type": T.SELECT,
        "cs": "urn:ebu:metadata-cs:ContentAlertSchemeCodeCS",
        "mode": "tree",
    },
    "graphic_usage": {
        "ns": "m",
        "type": T.SELECT,
        "cs": "urn:ebu:metadata-cs:GraphicUsageTypeCodeCS",
    },
    "keywords": {
        "ns": "m",
        "fulltext": 9,
        "type": T.STRING,
    },  # Comma delimited keywords list
    "year": {
        "ns": "m",
        "type": T.INTEGER,
        "hide_null": True,
    },
    "date": {
        "ns": "m",
        "type": T.DATETIME,
        "mode": "date",
    },
    "date/valid": {
        "ns": "m",
        "type": T.DATETIME,
        "mode": "date",
    },
    "date/valid/ott": {
        "ns": "m",
        "type": T.DATETIME,
        "mode": "date",
    },
    "rights": {
        "ns": "m",
        "type": T.SELECT,
        "cs": "urn:immstudios:metadata-cs:ContentLicenceCS",
    },
    "rights/type": {
        "ns": "m",
        "type": T.LIST,
        "cs": "urn:ebu:metadata-cs:RightTypeCodeCS",
    },
    "rights/attribution": {
        "ns": "m",
        "type": T.STRING,
    },
    "rights/attribution/url": {
        "ns": "m",
        "type": T.STRING,
    },
    "rights/description": {
        "ns": "m",
        "fulltext": True,
        "type": T.TEXT,
    },
    "rights/broadcast": {
        "ns": "m",
        "type": T.BOOLEAN,
    },
    "rights/ott": {
        "ns": "m",
        "type": T.BOOLEAN,
    },
    "rights/spatial": {
        "ns": "m",
        "type": T.SELECT,
        "cs": "urn:site:rights-spatial",
    },
    "source": {
        "ns": "m",
        "type": T.STRING,
    },  # Youtube, Vimeo, PirateBay....
    "source/url": {
        "ns": "m",
        "type": T.STRING,
    },
    "source/attribution": {
        "ns": "m",
        "type": T.STRING,
    },  # DEPRECATED
    "source/rating": {
        "ns": "m",
        "index": True,
        "type": T.INTEGER,
    },
    "commercial/content": {
        "ns": "m",
        "type": T.SELECT,
        "cs": "urn:tva:metadata-cs:ContentCommercialCS",
        "mode": "tree",
    },
    "commercial/campaign": {
        "ns": "m",
        "type": T.INTEGER,
    },  # Campaign event id
    "commercial/client": {
        "ns": "m",
        "type": T.SELECT,
        "cs": "urn:site:clients",
    },
    "commercial/pp": {
        "ns": "m",
        "type": T.BOOLEAN,
    },
    "runs/daily": {
        "ns": "m",
        "type": T.INTEGER,
    },
    "runs/weekly": {
        "ns": "m",
        "type": T.INTEGER,
    },
    "runs/monthly": {
        "ns": "m",
        "type": T.INTEGER,
    },
    "runs/total": {
        "ns": "m",
        "type": T.INTEGER,
    },
    "album": {
        "ns": "m",
        "type": T.STRING,
    },
    "serie": {
        "ns": "m",
        "type": T.SELECT,
        "cs": "urn:site:series",
        "order": "alias",
    },
    "serie/season": {
        "ns": "m",
        "type": T.INTEGER,
    },
    "serie/episode": {
        "ns": "m",
        "type": T.INTEGER,
    },
    "id/main": {
        "ns": "m",
        "fulltext": 9,
        "type": T.STRING,
    },  # Primary Content ID (local or global)
    "id/youtube": {
        "ns": "m",
        "type": T.STRING,
    },  # Youtube ID if exists
    "id/vimeo": {
        "ns": "m",
        "type": T.STRING,
    },  # Vimeo ID if exists
    "id/imdb": {
        "ns": "m",
        "type": T.STRING,
    },  # IMDB ID for movies
    "id/guid": {
        "ns": "m",
        "type": T.STRING,
    },
    "id/vod": {
        "ns": "m",
        "fulltext": 7,
        "type": T.STRING,
    },  # VOD KEY
    "id/tape": {
        "ns": "m",
        "type": T.STRING,
    },  # Archive tape ID
    "id/umid": {
        "ns": "m",
        "type": T.STRING,
    },
    "role/director": {
        "ns": "m",
        "fulltext": 6,
        "type": T.STRING,
    },
    "role/performer": {
        "ns": "m",
        "fulltext": 6,
        "type": T.STRING,
    },
    "role/composer": {
        "ns": "m",
        "fulltext": 6,
        "type": T.STRING,
    },
    "role/cast": {
        "ns": "m",
        "fulltext": 6,
        "type": T.STRING,
    },  # Coma delimited cast
    "duration": {
        "ns": "f",
        "type": T.TIMECODE,
        "default": 0,
    },
    "start_timecode": {
        "ns": "f",
        "type": T.TIMECODE,
    },
    "file/ctime": {
        "ns": "f",
        "type": T.DATETIME,
    },
    "file/mtime": {
        "ns": "f",
        "type": T.DATETIME,
    },  # Timestamp of file last modification
    "file/size": {
        "ns": "f",
        "type": T.INTEGER,
    },  # File size in bytes
    "file/format": {
        "ns": "f",
        "type": T.STRING,
    },
    "video/index": {
        "ns": "f",
        "type": T.INTEGER,
    },  # Index of the video track
    "video/width": {
        "ns": "f",
        "type": T.INTEGER,
    },  # Video frame / image width (pixels)
    "video/height": {
        "ns": "f",
        "type": T.INTEGER,
    },
    "video/fps": {
        "ns": "f",
        "type": T.FRACTION,
    },
    "video/fps_f": {
        "ns": "f",
        "type": T.NUMERIC,
    },
    "video/pixel_format": {
        "ns": "f",
        "type": T.STRING,
    },
    "video/color_range": {
        "ns": "f",
        "type": T.STRING,
    },
    "video/color_space": {
        "ns": "f",
        "type": T.STRING,
    },
    "video/aspect_ratio": {
        "ns": "f",
        "type": T.FRACTION,
    },
    "video/aspect_ratio_f": {
        "ns": "f",
        "type": T.NUMERIC,
    },
    "video/codec": {
        "ns": "f",
        "type": T.STRING,
    },
    "video/display_format": {
        "ns": "f",
        "type": T.SELECT,
        "cs": "urn:ebu:metadata-cs:PictureDisplayFormatCodeCS",
    },
    "audio/codec": {
        "ns": "f",
        "type": T.STRING,
    },
    "qc/state": {
        "ns": "q",
        "type": T.INTEGER,
    },
    "qc/report": {
        "ns": "q",
        "type": T.TEXT,
    },
    "audio/bpm": {
        "ns": "q",
        "type": T.NUMERIC,
    },  # Music BPM
    "audio/r128/i": {
        "ns": "q",
        "type": T.NUMERIC,
    },  # Integrated loudness (LUFS)
    "audio/r128/t": {
        "ns": "q",
        "type": T.NUMERIC,
    },
    "audio/r128/lra": {
        "ns": "q",
        "type": T.NUMERIC,
    },  # LRA (LU)
    "audio/r128/lra/t": {
        "ns": "q",
        "type": T.NUMERIC,
    },
    "audio/r128/lra/l": {
        "ns": "q",
        "type": T.NUMERIC,
    },  # LRA Low (LUFS)
    "audio/r128/lra/r": {
        "ns": "q",
        "type": T.NUMERIC,
    },  # LRA High (LUFS)
    "audio/gain/mean": {
        "ns": "q",
        "type": T.NUMERIC,
    },
    "audio/gain/peak": {
        "ns": "q",
        "type": T.NUMERIC,
    },
    "audio/silence": {
        "ns": "q",
        "type": T.OBJECT,
    },  # Areas with silent audio
    "audio/clipping": {
        "ns": "q",
        "type": T.OBJECT,
    },  # Audio clipping areas
    "video/black": {
        "ns": "q",
        "type": T.OBJECT,
    },  # Areas where video is black-only
    "video/static": {
        "ns": "q",
        "type": T.OBJECT,
    },  # Areas with static image
    "video/is_interlaced": {
        "ns": "q",
        "type": T.BOOLEAN,
    },
    "audio_tracks": {
        "ns": "f",
        "type": T.OBJECT,
    },
}
