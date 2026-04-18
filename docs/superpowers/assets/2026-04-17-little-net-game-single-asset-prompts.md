# little-net-game 单体资产概念图 Prompt 记录

- 日期：2026-04-17
- 母版参考：`public/concepts/battle-tech-poster-a.png`
- 输出目录：`public/concepts/`

## 统一约束

- 继承 `battle-tech-poster-a.png` 的世界观和材质语言
- 风格统一为：轻竞技卡通、科技竞技感、半写实 3D 插画质感
- 输出是单体概念图，不是透明底正式切图
- 允许带环境陪衬，但主体必须明确、易读、可用于后续拆正式资源
- 必须优先考虑小尺寸游戏 UI 中的可读性，主体轮廓要大、识别点要集中、不能依赖细碎小零件才能看懂
- 关键识别元素必须在缩小后仍能成立，例如：红方高温核心、蓝方护盾环、炮塔双联炮口、粗能量导轨、厚底座
- 结构设计应偏“大形体 + 少量强特征”，不要堆积过多微小装饰、针脚、螺丝、碎片层
- 默认假设后续会被缩到手机竖屏 battle 页的小区域使用，因此外轮廓、主发光区和阵营差异要比表面细节更重要
- 禁止出现：文字、UI、水印、人物角色
- 明确避免：写实军武、儿童贴纸风、废土脏污感、赛博朋克霓虹堆满画面

## 红方主基地

- 输出文件：`public/concepts/red-base-concept.png`

```text
Use case: stylized-concept
Asset type: single-asset concept art for a mobile battle game
Primary request: a polished concept image of the red main base from a red-vs-blue tech battle game, matching the selected poster world, no characters
Scene/backdrop: a focused game-like arena platform with a little surrounding environment, glowing energy rails, floating debris, and warm battle atmosphere
Subject: one aggressive furnace-like red attack base with thick armored layers, glowing orange-red core chambers, sharp silhouette accents, and integrated attack systems
Style/medium: stylized competitive game concept art, semi-realistic 3D illustration, premium mobile game key art quality
Composition/framing: vertical composition, the red base is the clear hero object, three-quarter view, readable silhouette, enough surrounding space to understand its scale and structure
Lighting/mood: powerful, hot, high-pressure, energetic, bright and polished
Color palette: lava orange red, molten orange, copper, deep metallic red, warm white highlights
Materials/textures: layered armor plates, glowing core vents, metal chassis, energy conduits, polished sci-fi arena surfaces
Constraints: no characters, no text, no watermark, no UI, must feel like the same world as battle-tech-poster-a, emphasize attack-oriented structure rather than generic sci-fi building
Avoid: mirrored symmetry with the blue side, realistic military bunker style, dirty rubble wasteland, childlike classroom art, tiny unreadable micro-details, overly busy surface greebles
```

## 蓝方主基地

- 输出文件：`public/concepts/blue-base-concept.png`

```text
Use case: stylized-concept
Asset type: single-asset concept art for a mobile battle game
Primary request: a polished concept image of the blue main base from a red-vs-blue tech battle game, matching the selected poster world, no characters
Scene/backdrop: a focused futuristic arena platform with shield arcs, cool energy rails, floating fragments, and bright defensive atmosphere
Subject: one stable shield-driven blue defense base with cleaner ring structures, cool glowing energy nodes, rounded defensive architecture, and integrated protection systems
Style/medium: stylized competitive game concept art, semi-realistic 3D illustration, premium mobile game key art quality
Composition/framing: vertical composition, the blue base is the clear hero object, three-quarter view, readable silhouette, enough environment to show shield technology and platform structure
Lighting/mood: calm, advanced, resilient, bright, polished, high-tech
Color palette: electric blue, cyan blue, cold white, gunmetal gray, crisp white energy highlights
Materials/textures: shield rings, metallic panels, glowing power cores, defense emitters, polished sci-fi platform edges
Constraints: no characters, no text, no watermark, no UI, must feel like the same world as battle-tech-poster-a, emphasize defense-oriented structure rather than generic futuristic architecture
Avoid: looking like the red base recolored blue, realistic military fortress style, grimdark sci-fi, overcomplicated cyberpunk city clutter, tiny unreadable micro-details, overly busy surface greebles
```

## 机械炮塔

- 输出文件：`public/concepts/tech-turret-concept.png`

```text
Use case: stylized-concept
Asset type: single-asset concept art for a mobile battle game
Primary request: a polished concept image of a mechanical battle turret from a red-vs-blue tech arena game, matching the selected poster world, no characters
Scene/backdrop: a clean game-like arena platform with energy tracks and a little battlefield atmosphere, but the turret remains the dominant subject
Subject: one stylized mechanical tech turret with exaggerated cannon barrels, heavy base, glowing power conduits, readable attack silhouette, designed to fit both red and blue factions with modular visual language
Style/medium: stylized competitive game concept art, semi-realistic 3D illustration, premium mobile game key art quality
Composition/framing: vertical composition, hero shot of the turret from a low three-quarter angle, strong silhouette, enough nearby platform detail to understand how it sits in the arena
Lighting/mood: powerful, game-ready, polished, energetic
Color palette: neutral gunmetal with bright faction-compatible energy accents in orange and blue, white energy highlights
Materials/textures: hard-surface metal armor, glowing conduits, reinforced turret base, polished sci-fi arena platform
Constraints: no characters, no text, no watermark, no UI, match the world of battle-tech-poster-a, keep the turret stylized and readable rather than overly realistic
Avoid: realistic artillery look, tiny unreadable details, dirty war machine aesthetic, toy sticker proportions, cluttered micro-geometry that breaks at small display sizes
```
