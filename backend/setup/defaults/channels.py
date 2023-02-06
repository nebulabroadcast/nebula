from nebula.settings.models import PlayoutChannelSettings

demo_channel1 = PlayoutChannelSettings(
    id=1,
    name="Demo channel 1",
    fps=25.0,
    plugins=[],
    solvers=[],
    day_start=(7, 0),
    rundown_columns=[],
    send_action=None,
    engine="conti",
    allow_remote=True,
    controller_host="worker",
    controller_port=42100,
    config={
        "conti_settings": {
            "width": 1920,
            "height": 1080,
            "frame_rate": 25,
        },
        "conti_outputs": [
            {
                "target": "/mnt/nebula_01/hls/nebula.m3u8",
                "audio_filters": ["pan=stereo|c0=c0|c1=c1", "loudnorm=I=-23"],
                "video_filters": "scale=960x540",
                "params": {
                    "pix_fmt": "yuv420p",
                    "c:v": "libx264",
                    "b:v": "1200k",
                    "g": 80,
                    "x264opts": "keyint=80:min-keyint=80:no-scenecut",
                    "c:a": "aac",
                    "b:a": "128k",
                    "f": "hls",
                    "hls_time": 3.2,
                    "hls_segment_filename": "/mnt/nebula_01/hls/nebula%04d.ts",
                    "hls_flags": "+delete_segments",
                },
            }
        ],
    },
)


CHANNELS = [
    demo_channel1
]
