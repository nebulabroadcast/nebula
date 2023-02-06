from nebula.settings.models import ActionSettings


cif = """asset["content_type"] == ContentType.VIDEO """
cif += """and asset["status"] == ObjectStatus.ONLINE"""

sif = """asset["status"] == ObjectStatus.ONLINE """
sif += """and "video/codec" in asset.meta"""

proxy = f"""<?xml version="1.0" encoding="UTF-8"?>
<settings>
    <allow_if>True</allow_if>
    <create_if><![CDATA[{cif}]]></create_if>
    <start_if><![CDATA[{sif}]]></start_if>
    <skip_if><![CDATA[asset.has_proxy]]></skip_if>

    <task mode="ffmpeg">
        <param name="s">"640x360"</param>
        <param name="r">25</param>
        <param name="pix_fmt">"yuv420p"</param>

        <param name="c:v">"libx264"</param>
        <param name="profile:v">"main"</param>
        <param name="preset:v">"fast"</param>
        <param name="g">1</param>

        <param name="c:a">"libfdk_aac"</param>
        <param name="b:a">"128k"</param>
        <param name="ar">48000</param>

        <param name="video_track_timescale">"25"</param>
        <param name='movflags'>"faststart"</param>

        <output storage="asset.proxy_storage">asset.proxy_path</output>
    </task>
</settings>"""


ACTIONS = [ActionSettings(id=1, name="proxy", type="conv", settings=proxy)]
