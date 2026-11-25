# पत्थरों के पार — the film (1:1, 89 s)

`river-story.mp4`: 1080×1080, 30 fps, with sound. Hand-drawn Madhubani folk-art style: ink lines that "boil" like frame-by-frame animation, handmade-paper texture, earthy pigments (vermilion, turmeric, indigo, leaf green), and the Madhubani triangle border. By default there is no border and no captions, and every scene fills the square frame (add your own voice-over or text in the edit). To get the captioned version with the border back, open `film.html?text&border`.

The soundtrack is synthesized from scratch in `audio.js`: a tanpura drone (Pa–Sa–Sa–Sa), water that dries up in the drought and swells at the river and sea, a temple bell at "एक नदी", at 16 and at RIVER, stone cracks when 10th, 12th and Graduation crumble, and a plop when she leaps.

| Time | Scene |
|---|---|
| 0:00 | The pond: 100 fish; the stones drop in one by one, then the rule appears |
| 0:07 | "पत्थरों के पार क्या है?" / "सिर्फ अँधेरा।" Ink darkness spreads, she turns back |
| 0:15 | Sun and moon cycle; she circles the same spot as her colour fades |
| 0:24 | Drought: the water shrinks, the ground cracks, the sun grows |
| 0:31 | The leap: the darkness dissolves as she swims into it, and there is a river |
| 0:40 | The river becomes the sea: thousands of fish |
| 0:48 | The old fish of the sea laughs |
| 0:56 | The pond keeps telling its story; the little fish tremble |
| 1:04 | 10th / 12th / Graduation / फिर? crumble; she swims through |
| 1:12 | 16, and people her age swim beside her |
| 1:20 | Comment करो **RIVER** |

To rebuild: `node render.js`. To check frames: `node render.js --stills=12,40.5`.

## Style options
`style-options/` has the same moment (the leap) in four Indian art styles: Madhubani, Gond, Warli and Tholu Bommalata shadow puppet. To re-render them: `node styles.js`.
