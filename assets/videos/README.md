# Hero video

The hero uses the authorized Suzuki S-Presso AGS clip already in this folder:

```
New Suzuki S-Presso AGS.mp4
```

It plays muted and loops behind the hero text. If it cannot load, the S-Presso brochure photo remains visible as the fallback. Do not use the unrelated e VITARA clip.

Recommended settings:

| Setting | Recommendation |
|---|---|
| Format | MP4 (H.264) |
| Dimensions | 1920 x 1080 (16:9) |
| Length | 10–20 seconds, with a smooth loop |
| File size | Under 8 MB |
| Audio | Not needed; the video is muted |
| Subject | Suzuki S-Presso AGS |

If you replace the clip and need a web-friendly, silent copy, FFmpeg can create one:

```
ffmpeg -i original.mp4 -vf scale=1920:-2 -c:v libx264 -crf 28 -preset slow -an -movflags +faststart "New Suzuki S-Presso AGS.mp4"
```
