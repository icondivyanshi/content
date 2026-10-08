# AI Reel Tracker

A free tool for **face, body and object tracking** in your reels. It works like CapCut's auto-tracking: a virtual camera follows your subject and reframes the video to 9:16 (or 4:5, 1:1, 16:9). You can also add a trending overlay effect.

Everything runs in your browser with Google's MediaPipe AI models. Your video is never uploaded anywhere.

## How to use

1. Open `index.html` in Chrome or Safari, on your phone or on a computer (see *Getting a link* below).
2. Tap **Tap to choose a video** and pick a clip from your gallery.
3. Pick what to follow: **Face**, **Body** or **Object** (for objects you can choose dog, car, ball and so on).
   If there are several people in the shot, tap the one you want on the video.
4. Pick the look:
   - **9:16 / 4:5 / 1:1 / 16:9**: output shape (9:16 for Reels and Shorts)
   - **Zoom**: how tight the shot is
   - **Smoothness**: higher gives a slow, cinematic camera; lower snaps to fast movement
   - **Auto zoom**: keeps the subject the same size as they move closer or further away
   - **Effect overlay**: *Lock-on* (target-lock frame), *Box* (labelled box) or *Spotlight* (darkens everything except the subject)
5. Press **Start AI tracking** and wait for it to reach 100%.
6. Press **Play** to preview. You can change zoom, smoothness, overlay and shape without tracking again.
7. Press **Export video**, wait while it plays through once, then tap **Download**.

Tips
- **Fast / Balanced / Precise** controls how many frames per second the AI looks at. Use *Precise* for quick dance moves or sports.
- Face mode works best when the face is fairly close to the camera. For full-body or far-away shots, use **Body**.
- Chrome and Safari on phones save **MP4**. Some desktop browsers save **WebM**.

## Getting a link

The tool is a single HTML file, so any static host can serve it. The simplest is **GitHub Pages**:
repo **Settings → Pages → Build and deployment → Deploy from a branch**, choose the branch, folder `/ (root)`, and save.
After a minute it is live at `https://<your-username>.github.io/content/ai-tracker/`. Open that on your phone and add it to your home screen.

## Running offline / development

By default the page loads the MediaPipe library from jsDelivr and the models from Google's model storage. To serve everything yourself, put these files in `ai-tracker/vendor/` and open the page with `?local` on the URL:

```
vendor/vision_bundle.mjs            from npm @mediapipe/tasks-vision@0.10.21
vendor/wasm/*                       the package's wasm/ folder
vendor/models/blaze_face_short_range.tflite
vendor/models/pose_landmarker_lite.task
vendor/models/efficientdet_lite0.tflite
```

Serve the folder over http (for example `npx serve ai-tracker`), since browsers won't load the WASM from `file://`.
