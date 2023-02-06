from nebula.settings.models import ServiceSettings

watch = """
<service>
    <folder id_storage="1" id_folder="1" path="media.dir/movies"></folder>
    <folder id_storage="1" id_folder="3" path="media.dir/stories"></folder>
    <folder id_storage="1" id_folder="4" path="media.dir/songs"></folder>
    <folder id_storage="1" id_folder="5" path="media.dir/fill"></folder>
    <folder id_storage="1" id_folder="6" path="media.dir/trailers"></folder>
    <folder id_storage="1" id_folder="7" path="media.dir/jingles"></folder>
    <folder id_storage="1" id_folder="8" path="media.dir/graphics"></folder>
</service>
"""

play = """
<service>
    <id_channel>1</id_channel>
</service>
"""


SERVICES = [
    ServiceSettings(id=1, type="broker", name="broker", host="worker"),
    ServiceSettings(id=2, type="watch", name="watch", host="worker", settings=watch),
    ServiceSettings(id=3, type="meta", name="meta", host="worker", loop_delay=2),
    ServiceSettings(id=4, type="conv", name="conv", host="worker"),
    ServiceSettings(id=5, type="play", name="play", host="worker", settings=play),
]
