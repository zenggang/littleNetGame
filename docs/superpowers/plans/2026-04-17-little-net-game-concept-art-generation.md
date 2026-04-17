# Little Net Game Concept Art Generation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Generate three approved 9:16 concept posters for `little-net-game`, save them into `public/concepts/`, and preserve the exact prompts so later asset work can reuse the same visual language.

**Architecture:** Treat `docs/superpowers/specs/2026-04-17-little-net-game-concept-art-design.md` as the single source of truth. First record the exact prompt set and target filenames in a prompt log, then generate three built-in `image_gen` variants that share one approved visual system but differ in focal emphasis: balanced confrontation, stronger energy impact, and stronger red/blue structural asymmetry. After each generation, move the selected output into `public/concepts/` with a stable project filename and verify the repo now contains usable PNG concept assets.

**Tech Stack:** Built-in `image_gen` tool, shell utilities (`mkdir`, `cp`, `file`, `sed`), Markdown docs

---

## Target Repository Shape

### Existing spec to preserve

- `docs/superpowers/specs/2026-04-17-little-net-game-concept-art-design.md`

### New documentation files

- `docs/superpowers/assets/2026-04-17-little-net-game-concept-art-prompts.md`

### New asset files

- `public/concepts/battle-tech-poster-a.png`
- `public/concepts/battle-tech-poster-b.png`
- `public/concepts/battle-tech-poster-c.png`

## Task 1: Record The Exact Prompt Pack

**Files:**
- Create: `docs/superpowers/assets/2026-04-17-little-net-game-concept-art-prompts.md`
- Reference: `docs/superpowers/specs/2026-04-17-little-net-game-concept-art-design.md`

- [ ] **Step 1: Create the asset docs directory**

Run: `mkdir -p docs/superpowers/assets`

Expected: the directory `docs/superpowers/assets` exists and is ready for `2026-04-17-little-net-game-concept-art-prompts.md`.

- [ ] **Step 2: Create the prompt log file with the shared prompt contract and three variant prompts**

````md
# little-net-game 概念主视觉 Prompt 记录

- 日期：2026-04-17
- 对应设计：`docs/superpowers/specs/2026-04-17-little-net-game-concept-art-design.md`
- 输出目录：`public/concepts/`

## 统一约束

- 画幅：竖版 9:16
- 用途：概念主视觉，不是运行时切图素材
- 必须出现：红方基地、蓝方基地、机械炮塔、能量护盾、科技竞技场
- 禁止出现：文字、UI、水印、具体人物角色
- 统一风格：轻竞技卡通、科技竞技感、半写实 3D 插画质感
- 明确避免：儿童贴纸风、写实军武风、废土脏污感、赛博朋克霓虹堆叠

## 方案 A

- 输出文件：`public/concepts/battle-tech-poster-a.png`
- 目标：最标准的竞技海报型世界观锚点图

```text
Use case: stylized-concept
Asset type: vertical concept poster for a mobile battle game
Primary request: a cool and polished 9:16 concept poster for a red-vs-blue tech battle game, balanced confrontation composition, no characters
Scene/backdrop: a futuristic cartoon arena platform with energy rails, shield barriers, floating debris, and a bright explosive energy sky at the top
Subject: a red attack-oriented tech base in the lower left, a blue defense-oriented tech base in the lower right, mechanical turrets in the foreground, and a central energy collision corridor between them
Style/medium: stylized competitive game key art, semi-realistic 3D illustration, mobile game promotional art, clean readable silhouettes
Composition/framing: vertical 9:16 poster, slight low-angle view, diagonal red-vs-blue confrontation, strong center focal point, clear foreground-midground-background layering
Lighting/mood: dramatic, cool, energetic, polished, high-impact but still bright and game-like
Color palette: lava orange red, deep metallic red, copper, electric blue, cyan blue, cold white, gunmetal gray, bright white energy highlights
Materials/textures: metallic structures, glowing energy cores, shield edges, power conduits, polished arena surfaces
Constraints: no characters, no text, no watermark, no UI, keep the world readable and cohesive, emphasize base/turret/shield technology rather than generic sci-fi clutter
Avoid: childish sticker style, realistic military weapons, dirty wasteland look, cyberpunk neon overload, dark horror tone
```

## 方案 B

- 输出文件：`public/concepts/battle-tech-poster-b.png`
- 目标：更强调中轴能量爆发和视觉冲击

```text
Use case: stylized-concept
Asset type: vertical concept poster for a mobile battle game
Primary request: a cooler and more explosive 9:16 concept poster for a red-vs-blue tech arena battle, centered on the energy collision in the middle, no characters
Scene/backdrop: a bright sci-fi cartoon arena with shield arcs, energy shockwaves, sparks, lightning, and glowing atmosphere gathered around the center of the battlefield
Subject: red base and red turrets pushing from the lower left, blue base and blue turrets pushing from the lower right, a violent energy beam clash at the center, visible shield edges and power conduits
Style/medium: stylized mobile game key art, semi-realistic 3D illustration, high polish, competitive and energetic
Composition/framing: vertical 9:16 poster, slight low-angle shot, the center energy clash occupies more visual weight than in poster A, foreground turrets frame the confrontation
Lighting/mood: explosive, intense, competitive, bright and exciting rather than dark
Color palette: glowing orange red, bright magma highlights, electric blue, cyan white, warm gold impact highlights, steel gray
Materials/textures: hard-surface arena panels, energy shields, metallic turret housings, radiant power cores
Constraints: no characters, no text, no watermark, no UI, preserve the approved red/blue tech battle language, make the image feel cooler and more explosive than the base version
Avoid: childish toy look, flat illustration look, realistic war scene, dirty rubble wasteland, messy neon signage
```

## 方案 C

- 输出文件：`public/concepts/battle-tech-poster-c.png`
- 目标：拉大红蓝双方结构差异，方便后续拆单体资产

```text
Use case: stylized-concept
Asset type: vertical concept poster for a mobile battle game
Primary request: a polished 9:16 concept poster for a red-vs-blue tech battle game with strong structural contrast between the two sides, no characters
Scene/backdrop: a game-like futuristic arena with shield fields, arena platforms, energy rails, floating battlefield fragments, and a luminous charged sky
Subject: the red side is an aggressive furnace-like attack base with sharper armored turrets, the blue side is a stable shield-driven defense base with cleaner ring structures and defensive turrets, both sides collide through a central energy lane
Style/medium: stylized competitive game concept art, semi-realistic 3D illustration, readable silhouettes, premium mobile game promotional art
Composition/framing: vertical 9:16 poster, diagonal confrontation from lower corners to center, the red and blue sides must feel structurally different rather than just recolored
Lighting/mood: high energy, polished, heroic battlefield atmosphere, bright and readable
Color palette: molten red-orange and copper for the red side, electric blue-cyan and cold white for the blue side, white-gold collision highlights
Materials/textures: metal armor shells, glowing core chambers, shield rings, power conduits, glossy arena platform edges
Constraints: no characters, no text, no watermark, no UI, preserve a single unified world while making red and blue structures visibly distinct
Avoid: lookalike mirrored structures, military realism, post-apocalyptic debris focus, cyberpunk city clutter, childlike classroom art
```
````

- [ ] **Step 3: Save the prompt log file**

Save the content from Step 2 into `docs/superpowers/assets/2026-04-17-little-net-game-concept-art-prompts.md`.

- [ ] **Step 4: Verify the prompt log content**

Run: `sed -n '1,260p' docs/superpowers/assets/2026-04-17-little-net-game-concept-art-prompts.md`

Expected: the output shows `统一约束`, `方案 A`, `方案 B`, and `方案 C`, each with an exact prompt and target file path.

- [ ] **Step 5: Commit the prompt log**

```bash
git add docs/superpowers/assets/2026-04-17-little-net-game-concept-art-prompts.md
git commit -m "docs: add concept art prompt pack"
```

## Task 2: Generate And Save Poster A

**Files:**
- Create: `public/concepts/battle-tech-poster-a.png`
- Reference: `docs/superpowers/assets/2026-04-17-little-net-game-concept-art-prompts.md`

- [ ] **Step 1: Create the concepts output directory**

Run: `mkdir -p public/concepts`

Expected: the directory `public/concepts` exists.

- [ ] **Step 2: Generate poster A with the exact prompt from the prompt log**

Use the built-in `image_gen` tool with the exact `方案 A` prompt from `docs/superpowers/assets/2026-04-17-little-net-game-concept-art-prompts.md`.

Expected: one generated PNG concept image whose composition matches the balanced confrontation brief.

- [ ] **Step 3: Copy the selected generated file into the project**

Run: `latest="$(find "$CODEX_HOME/generated_images" -type f -name '*.png' -print | sort | tail -n 1)" && cp "$latest" public/concepts/battle-tech-poster-a.png`

Expected: `public/concepts/battle-tech-poster-a.png` exists in the repository.

- [ ] **Step 4: Verify poster A is a PNG asset inside the repo**

Run: `file public/concepts/battle-tech-poster-a.png`

Expected: output contains `PNG image data`.

- [ ] **Step 5: Commit poster A**

```bash
git add public/concepts/battle-tech-poster-a.png
git commit -m "assets: add battle tech poster a"
```

## Task 3: Generate And Save Poster B

**Files:**
- Create: `public/concepts/battle-tech-poster-b.png`
- Reference: `docs/superpowers/assets/2026-04-17-little-net-game-concept-art-prompts.md`

- [ ] **Step 1: Generate poster B with the exact prompt from the prompt log**

Use the built-in `image_gen` tool with the exact `方案 B` prompt from `docs/superpowers/assets/2026-04-17-little-net-game-concept-art-prompts.md`.

Expected: one generated PNG concept image whose center energy clash is stronger and more explosive than poster A.

- [ ] **Step 2: Copy the selected generated file into the project**

Run: `latest="$(find "$CODEX_HOME/generated_images" -type f -name '*.png' -print | sort | tail -n 1)" && cp "$latest" public/concepts/battle-tech-poster-b.png`

Expected: `public/concepts/battle-tech-poster-b.png` exists in the repository.

- [ ] **Step 3: Verify poster B is a PNG asset inside the repo**

Run: `file public/concepts/battle-tech-poster-b.png`

Expected: output contains `PNG image data`.

- [ ] **Step 4: Commit poster B**

```bash
git add public/concepts/battle-tech-poster-b.png
git commit -m "assets: add battle tech poster b"
```

## Task 4: Generate And Save Poster C

**Files:**
- Create: `public/concepts/battle-tech-poster-c.png`
- Reference: `docs/superpowers/assets/2026-04-17-little-net-game-concept-art-prompts.md`

- [ ] **Step 1: Generate poster C with the exact prompt from the prompt log**

Use the built-in `image_gen` tool with the exact `方案 C` prompt from `docs/superpowers/assets/2026-04-17-little-net-game-concept-art-prompts.md`.

Expected: one generated PNG concept image whose red and blue structure language is more visibly different than posters A and B.

- [ ] **Step 2: Copy the selected generated file into the project**

Run: `latest="$(find "$CODEX_HOME/generated_images" -type f -name '*.png' -print | sort | tail -n 1)" && cp "$latest" public/concepts/battle-tech-poster-c.png`

Expected: `public/concepts/battle-tech-poster-c.png` exists in the repository.

- [ ] **Step 3: Verify poster C is a PNG asset inside the repo**

Run: `file public/concepts/battle-tech-poster-c.png`

Expected: output contains `PNG image data`.

- [ ] **Step 4: Commit poster C**

```bash
git add public/concepts/battle-tech-poster-c.png
git commit -m "assets: add battle tech poster c"
```

## Task 5: Final Verification And Handoff

**Files:**
- Verify: `public/concepts/battle-tech-poster-a.png`
- Verify: `public/concepts/battle-tech-poster-b.png`
- Verify: `public/concepts/battle-tech-poster-c.png`
- Verify: `docs/superpowers/assets/2026-04-17-little-net-game-concept-art-prompts.md`

- [ ] **Step 1: Verify all final assets and the prompt log are present**

Run: `ls public/concepts docs/superpowers/assets`

Expected: the output lists `battle-tech-poster-a.png`, `battle-tech-poster-b.png`, `battle-tech-poster-c.png`, and `2026-04-17-little-net-game-concept-art-prompts.md`.

- [ ] **Step 2: Verify every saved asset is a PNG**

Run: `file public/concepts/battle-tech-poster-a.png public/concepts/battle-tech-poster-b.png public/concepts/battle-tech-poster-c.png`

Expected: each line contains `PNG image data`.

- [ ] **Step 3: Review the saved prompts against the saved assets**

Compare each file under `public/concepts/` with the corresponding prompt section in `docs/superpowers/assets/2026-04-17-little-net-game-concept-art-prompts.md`.

Expected: poster A reads as balanced confrontation, poster B reads as stronger central energy impact, and poster C reads as stronger structural contrast between red and blue.

- [ ] **Step 4: Commit the final asset set**

```bash
git add public/concepts docs/superpowers/assets/2026-04-17-little-net-game-concept-art-prompts.md
git commit -m "assets: add first concept poster set"
```
