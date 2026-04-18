# little-net-game 小尺寸运行时资产 Prompt 记录

- 日期：2026-04-18
- 母版参考：`public/concepts/battle-tech-poster-a.png`
- 输出目录：`public/battle-assets/`
- 目标：生成可在手机竖屏 battle 页小区域中使用的正式核心资产

## 统一约束

- 输出类型：透明背景 PNG，主体独立，方便后续直接接入 Phaser 或页面
- 主体必须占画面主要面积，默认至少覆盖可见画面的 70% 左右
- 优先保证缩小后的识别性，而不是大图近看细节
- 结构语言必须采用 `大轮廓 + 少量强识别点`
- 阵营差异必须主要靠外形和核心视觉符号，而不是只靠颜色
- 红方识别点：厚重外轮廓、高温核心、进攻型炮口、偏锐结构
- 蓝方识别点：护盾环、稳定核心、偏圆防御结构、整洁平台
- 炮塔识别点：粗双联炮口、厚底座、明显能量槽、低角度可读剪影
- 不允许依赖微小螺丝、细碎装饰、密集纹理去表达科技感
- 禁止出现：文字、UI、水印、人物角色、复杂背景、漂浮小物件堆满画面
- 风格统一为：轻竞技卡通、科技竞技感、半写实 3D 插画质感

## 红方主基地正式资产

- 输出文件：`public/battle-assets/red-base-runtime.png`

```text
Use case: stylized-concept
Asset type: isolated runtime-ready game asset for a small mobile battle UI
Primary request: a transparent-background red main base asset for a mobile red-vs-blue tech battle game, optimized for small UI readability
Scene/backdrop: transparent background only
Subject: one chunky furnace-like red attack base with a thick silhouette, one dominant glowing core, large weapon pods, and a heavy armored bottom structure, facing slightly toward the right
Style/medium: stylized competitive game asset, semi-realistic 3D illustration, polished mobile game runtime art
Composition/framing: vertical composition, centered isolated object, hero asset fills most of the frame, readable at small size, no scenery
Lighting/mood: powerful, hot, energetic, polished
Color palette: lava orange red, copper, deep metallic red, warm white highlights
Materials/textures: large armor plates, bright core vents, thick energy conduits, clean polished metal
Constraints: transparent background, no text, no watermark, no characters, no scenery, prioritize a bold silhouette and one clear hot core over fine detail
Avoid: tiny greebles, realistic military bunker details, dirt, rubble, excessive pipes, small unreadable weapons, complex background
```

## 蓝方主基地正式资产

- 输出文件：`public/battle-assets/blue-base-runtime.png`

```text
Use case: stylized-concept
Asset type: isolated runtime-ready game asset for a small mobile battle UI
Primary request: a transparent-background blue main base asset for a mobile red-vs-blue tech battle game, optimized for small UI readability
Scene/backdrop: transparent background only
Subject: one stable shield-oriented blue defense base with a thick readable silhouette, one clear shield ring motif, one dominant cool energy core, and a compact layered platform, facing slightly toward the left
Style/medium: stylized competitive game asset, semi-realistic 3D illustration, polished mobile game runtime art
Composition/framing: vertical composition, centered isolated object, hero asset fills most of the frame, readable at small size, no scenery
Lighting/mood: advanced, resilient, bright, clean, polished
Color palette: electric blue, cyan blue, cold white, gunmetal gray
Materials/textures: large shield arcs, clean platform plates, bright energy nodes, polished metal
Constraints: transparent background, no text, no watermark, no characters, no scenery, prioritize a bold silhouette and one clear shield identity over fine detail
Avoid: looking like the red base recolored blue, tiny micro-details, messy sci-fi clutter, military fortress realism, busy background
```

## 红方炮塔正式资产

- 输出文件：`public/battle-assets/red-turret-runtime.png`

```text
Use case: stylized-concept
Asset type: isolated runtime-ready game asset for a small mobile battle UI
Primary request: a transparent-background red turret asset for a mobile red-vs-blue tech battle game, optimized for small UI readability
Scene/backdrop: transparent background only
Subject: one compact red offensive turret with thick dual cannon barrels, a heavy round base, one bright orange energy chamber, and a strong left-to-right attack posture
Style/medium: stylized competitive game asset, semi-realistic 3D illustration, polished mobile game runtime art
Composition/framing: centered isolated object, low three-quarter angle, large readable silhouette, fill most of the frame
Lighting/mood: energetic, aggressive, clean, polished
Color palette: orange red, copper, dark gunmetal, bright orange core highlights
Materials/textures: thick armor shells, bright power core, clean cannon barrels, sturdy base ring
Constraints: transparent background, no text, no watermark, no characters, no scenery, readable at small size, silhouette and barrel shape must stay clear when scaled down
Avoid: realistic artillery complexity, tiny exposed mechanics, cluttered surface detail, toy-like proportions, busy background
```

## 蓝方炮塔正式资产

- 输出文件：`public/battle-assets/blue-turret-runtime.png`

```text
Use case: stylized-concept
Asset type: isolated runtime-ready game asset for a small mobile battle UI
Primary request: a transparent-background blue turret asset for a mobile red-vs-blue tech battle game, optimized for small UI readability
Scene/backdrop: transparent background only
Subject: one compact blue defensive turret with thick dual cannon barrels, a heavy round base, one bright blue energy chamber, and a strong right-to-left battle posture
Style/medium: stylized competitive game asset, semi-realistic 3D illustration, polished mobile game runtime art
Composition/framing: centered isolated object, low three-quarter angle, large readable silhouette, fill most of the frame
Lighting/mood: precise, resilient, clean, polished
Color palette: electric blue, cyan blue, cold white, gunmetal gray
Materials/textures: thick armor shells, bright energy core, clean cannon barrels, sturdy base ring
Constraints: transparent background, no text, no watermark, no characters, no scenery, readable at small size, silhouette and barrel shape must stay clear when scaled down
Avoid: realistic artillery complexity, tiny exposed mechanics, cluttered surface detail, toy-like proportions, busy background
```
