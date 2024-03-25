from nebula.enum import ContentType


class FileTypes:
    data = {
        "dv": ContentType.VIDEO,
        "avi": ContentType.VIDEO,
        "mov": ContentType.VIDEO,
        "mpg": ContentType.VIDEO,
        "mpeg": ContentType.VIDEO,
        "mp4": ContentType.VIDEO,
        "flv": ContentType.VIDEO,
        "m4v": ContentType.VIDEO,
        "m2t": ContentType.VIDEO,
        "m2v": ContentType.VIDEO,
        "m2p": ContentType.VIDEO,
        "m2ts": ContentType.VIDEO,
        "mts": ContentType.VIDEO,
        "mkv": ContentType.VIDEO,
        "3gp": ContentType.VIDEO,
        "vob": ContentType.VIDEO,
        "wmv": ContentType.VIDEO,
        "video": ContentType.VIDEO,
        "mxf": ContentType.VIDEO,
        "ogv": ContentType.VIDEO,
        "divx": ContentType.VIDEO,
        "m3u8": ContentType.VIDEO,
        "mpd": ContentType.VIDEO,
        "webm": ContentType.VIDEO,
        "wav": ContentType.AUDIO,
        "aiff": ContentType.AUDIO,
        "aif": ContentType.AUDIO,
        "ogg": ContentType.AUDIO,
        "mp3": ContentType.AUDIO,
        "mp2": ContentType.AUDIO,
        "m2a": ContentType.AUDIO,
        "aac": ContentType.AUDIO,
        "flac": ContentType.AUDIO,
        "jpg": ContentType.IMAGE,
        "jpeg": ContentType.IMAGE,
        "png": ContentType.IMAGE,
        "tga": ContentType.IMAGE,
        "targa": ContentType.IMAGE,
        "tif": ContentType.IMAGE,
        "tiff": ContentType.IMAGE,
        "hdr": ContentType.IMAGE,
        "exr": ContentType.IMAGE,
        "bmp": ContentType.IMAGE,
        "gif": ContentType.IMAGE,
        "psd": ContentType.IMAGE,
        "xcf": ContentType.IMAGE,
    }

    @classmethod
    def get(cls, ext: str) -> ContentType | None:
        return cls.data.get(ext)

    @classmethod
    def by_ext(cls, ext: str) -> ContentType:
        return cls.data[ext.lower()]

    @classmethod
    def is_video(cls, ext: str) -> bool:
        return cls.data.get(ext.lower(), -1) == ContentType.VIDEO

    @classmethod
    def is_audio(cls, ext: str) -> bool:
        return cls.data.get(ext.lower(), -1) == ContentType.AUDIO

    @classmethod
    def is_image(cls, ext: str) -> bool:
        return cls.data.get(ext.lower(), -1) == ContentType.IMAGE

    @classmethod
    def exts_by_type(cls, content_type: ContentType) -> list[str]:
        return [ext for ext, ct in cls.data.items() if ct == content_type]

    @classmethod
    def exts(cls) -> list[str]:
        return list(cls.data.keys())
