from nebula.settings.models import FolderField, FolderLink, FolderSettings

content_alert_scheme = {"filter": r"^53\.1\.\d", "default": "53.1.1"}
movie_genre_pattern = r"^3\.(1|4|5|7|8|9)(\.\d+){0,2}$"
music_genre_pattern = r"^3\.6\.(\d|4.(\d|14(.\d)?))$"

FieldList = list[FolderField]

primary_description: FieldList = [
    FolderField(name="title"),
    FolderField(name="subtitle"),
    FolderField(name="description"),
    FolderField(name="keywords"),
]

serie_description: FieldList = [
    FolderField(name="serie", section="Series"),
    FolderField(name="serie/season"),
    FolderField(name="serie/episode"),
]

roles_description: FieldList = [
    FolderField(name="role/director", section="Roles"),
    FolderField(name="role/cast"),
]

content_description: FieldList = [
    FolderField(name="genre", filter=movie_genre_pattern, section="Content"),
    FolderField(name="editorial_format", filter=r"^2(\.\d+){0,2}$"),
    FolderField(name="atmosphere"),
    FolderField(name="intention", filter=r"^1\.(1|2|3|4|5|6|7|8)$"),
    FolderField(name="intended_audience"),
    FolderField(name="content_alert"),
    FolderField(name="content_alert/scheme", **content_alert_scheme),
]

production_description: FieldList = [
    FolderField(name="date/valid", section="Production"),
    FolderField(name="editorial_control"),
    FolderField(name="rights"),
    FolderField(name="rights/type"),
    FolderField(name="rights/description"),
    FolderField(name="rights/ott"),
    FolderField(name="notes"),
    FolderField(name="qc/report"),
]


FOLDERS: list[FolderSettings] = [
    FolderSettings(
        id=1,
        name="Movie",
        color="#2872B3",
        fields=[
            *primary_description,
            *roles_description,
            *content_description,
            *production_description,
        ],
    ),
    FolderSettings(
        id=2,
        name="Serie",
        color="#0397bb",
        fields=[
            *primary_description,
            *serie_description,
            *roles_description,
            *content_description,
            *production_description,
        ],
    ),
    FolderSettings(
        id=3,
        name="Story",
        color="#00b9ce",
        fields=[
            FolderField(name="title"),
            FolderField(name="subtitle"),
            FolderField(name="description"),
            FolderField(name="article"),
            *production_description,
        ],
    ),
    FolderSettings(
        id=4,
        name="Song",
        color="#b9c0dd",
        fields=[
            FolderField(name="title"),
            FolderField(name="role/performer"),
            FolderField(name="album"),
            FolderField(name="genre", filter=music_genre_pattern),
            FolderField(name="content_alert"),
            *production_description,
        ],
    ),
    FolderSettings(
        id=5,
        name="Fill",
        color="#81c77f",
        fields=[
            *primary_description,
            *content_description,
            *production_description,
        ],
    ),
    FolderSettings(
        id=6,
        name="Trailer",
        color="#008e5c",
        fields=[
            FolderField(name="title"),
            FolderField(name="subtitle"),
            FolderField(name="date/valid"),
            FolderField(name="qc/report"),
            FolderField(name="notes"),
        ],
    ),
    FolderSettings(
        id=7,
        name="Jingle",
        color="#cf1f45",
        fields=[
            FolderField(name="title"),
            FolderField(name="graphic_usage"),
            FolderField(name="notes"),
        ],
    ),
    FolderSettings(
        id=8,
        name="Graphic",
        color="#f2799c",
        fields=[
            FolderField(name="title"),
            FolderField(name="graphic_usage"),
            FolderField(name="notes"),
        ],
    ),
    FolderSettings(
        id=9,
        name="Commercial",
        color="#f6d258",
        fields=[
            FolderField(name="title"),
            FolderField(name="commercial/client"),
            FolderField(name="commercial/content"),
            FolderField(name="notes"),
        ],
    ),
    FolderSettings(
        id=10,
        name="Teleshopping",
        color="#e3d6d5",
        fields=[
            FolderField(name="title"),
            FolderField(name="commercial/client"),
            FolderField(name="commercial/content"),
            FolderField(name="notes"),
        ],
    ),
    FolderSettings(
        id=11,
        name="Dataset",
        color="#998e88",
        fields=[
            FolderField(name="title"),
        ],
    ),
    FolderSettings(
        id=12,
        name="Incoming",
        color="#998e88",
        fields=[
            FolderField(name="title"),
            FolderField(name="title/original"),
            FolderField(name="subtitle"),
            FolderField(name="subtitle/original"),
            FolderField(name="description"),
            FolderField(name="description/original"),
            FolderField(name="qc/report"),
        ],
    ),
    FolderSettings(
        id=13,
        name="Series",
        color="#a0aac5",
        fields=[
            *primary_description,
            *content_description,
        ],
        links=[
            FolderLink(
                name="Show episodes",
                view=1,
                source_key="id",
                target_key="serie",
            ),
        ],
    ),
]
