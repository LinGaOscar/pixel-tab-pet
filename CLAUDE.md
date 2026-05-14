# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## 專案定義

Chrome / Edge 共用的 Manifest V3 新分頁擴充套件，主體為馬賽克像素風互動寵物。無任何 build 工具或 npm 相依，純 Vanilla JS + CSS + HTML。

## 開發流程

**載入擴充套件（開發測試）**
1. 開啟 `chrome://extensions`（或 Edge 擴充套件頁）
2. 啟用 Developer mode
3. 點選 **Load unpacked**，選擇本專案根目錄
4. 修改 `manifest.json` 後需按 Reload；其他 HTML/CSS/JS 重新開啟新分頁即可生效

**無 build 步驟**——直接編輯原始檔，重新載入分頁即可驗證。

**開發者工具**：按鍵 `` ` `` 可切換 zone overlay（顯示空中 / 地面 / 水域的像素座標範圍），方便調試寵物分層位置。

## 檔案結構

```
pixel-tab-pet/
├── manifest.json          # Manifest V3 設定（permissions: storage、newtab override）
├── newtab.html            # 唯一入口頁（所有 DOM 結構、腳本載入順序）
├── index.html             # 重定向 stub，不含業務邏輯
├── scripts/
│   ├── state.js           # 儲存層：AppState.load() / AppState.save()
│   ├── pet-engine.js      # 寵物個體：PetEngine 類別（FSM + 物理 + 拖曳）
│   └── newtab.js          # UI 協調：時鐘、背景、設定面板、快捷入口
├── styles/
│   ├── newtab.css         # 主 UI 樣式（glassmorphism 設計、深色主題）
│   └── pet.css            # 寵物 sprite 動畫與顯示規則
├── assets/pets/           # 12 張 1024×1024 PNG sprite sheet
│   ├── cat1–3.png
│   ├── dog1–3.png
│   ├── bird1–3.png
│   └── fish1–3.png
└── doc/
    └── development-plan.md  # 功能規格與開發計劃（含未來功能清單）
```

## 架構

### 三層模組職責

| 檔案 | 職責 |
|---|---|
| `scripts/state.js` | 儲存層：`AppState.load()` / `AppState.save()`，優先使用 `chrome.storage.local`，fallback 到 `localStorage` |
| `scripts/pet-engine.js` | 寵物個體：FSM 狀態機 + 物理位移 + 拖曳互動，每隻寵物一個 `PetEngine` 實例 |
| `scripts/newtab.js` | UI 協調：初始化、時鐘、背景切換、快捷入口、設定面板，呼叫前兩層 |

**腳本載入順序**：`newtab.html` 中依序載入 `state.js` → `pet-engine.js` → `newtab.js`，後者依賴前兩者的全域物件，不可調換。

### PetEngine 狀態機

狀態以 CSS class 實作（`state-idle`、`state-walk`、`state-sleep`、`state-jump`），動畫定義在 `styles/pet.css`。

```
idle ──(40% chance)──→ walk ──(到達目標, dist < 5)──→ idle
idle ──(10% chance)──→ sleep ──(10% chance)──→ idle
任意狀態 ──(click/tap)──→ jump ──(1s timeout)──→ idle
idle/sleep ──(mousemove)──→ 面向滑鼠（scaleX 翻轉，walk/jump 時不響應）
```

- `startBrain()`：每 3–8 秒（`3000 + Math.random() * 5000` ms）隨機決策一次
- `physicsLoop()`：`requestAnimationFrame` 驅動，用 `transform: translate(X, Y) scaleX(dir)` 更新位置與面向
- `destroy()`：設 `this.alive = false` 停止 rAF loop，移除所有事件監聽器，從 DOM 移除元素

### 三分層系統（Zone System）

`_getZone()` 依視窗高度動態計算三個分層範圍（`scripts/pet-engine.js:109`）：

```js
const groundLine = h * 0.65;   // 地面線在視窗 65% 高度
{
  groundY:   groundLine - sz,             // 地面寵物固定 Y
  airMinY:   20,                          // 空中最高點
  airMaxY:   groundLine - sz - 30,        // 空中最低點（地面線上 30px）
  waterMinY: groundLine + 15,             // 水域起點（地面線下 15px）
  waterMaxY: h - sz - 20                  // 水域底部
}
```

物種判定（`pet-engine.js:105-107`）：
- Ground（地面）：`cat*`、`dog*` — 鎖定在 `groundY`，只水平移動
- Air（空中）：`bird*` — 在 `airMinY ~ airMaxY` 飛行，偶爾落地（10% 機率）
- Water（水域）：`fish*` — 在 `waterMinY ~ waterMaxY` 自由游動

`_snapZoneY()` 在初始化時將儲存的 Y 比例吸附到正確分層，防止跨層出現。

### 響應式尺寸

`PetEngine.petSizePx()`（`pet-engine.js:2`）根據視窗最短邊計算寵物大小：

```js
Math.round(Math.max(48, Math.min(128, Math.min(innerWidth, innerHeight) / 8)))
```

結果透過 CSS 自訂屬性 `--pet-size` 注入，`styles/pet.css` 所有動畫位移均參照此變數。resize 事件會按比例重新映射所有寵物座標並更新 CSS 變數。

### 拖曳互動

- 5px 移動門檻觸發拖曳（防誤觸點擊）
- 拖曳中：加 `.dragging` class，cursor 改為 `grabbing`，z-index 提至 20
- 放開時：發送 `pet-drop` CustomEvent（bubbles），`newtab.js` 監聽後判斷是否進入寵物小屋範圍
- 拖放到 `#pet-house`（左下角）即撤回寵物並儲存設定

## Sprite Sheet 規格

每張 PNG 均為 **1024×1024 px**，採 4 欄 × 4 排排列，每格原始 256×256 px：

| 排（Row） | Y 偏移（CSS 計算值） | 內容 |
|---|---|---|
| Row 0 | `0` | 待機 4 幀，0.8s，steps(4) |
| Row 1 | `calc(-1 * --pet-size)` | 走路 4 幀，0.6s，steps(4) |
| Row 2 前半 | `calc(-2 * --pet-size)`，x: `0 → -2*sz` | 跳躍 2 幀，0.4s，steps(2) |
| Row 2 後半 | `calc(-2 * --pet-size)`，x: `-2*sz → -4*sz` | 睡覺 2 幀，1.5s，steps(2) |
| Row 3 | `calc(-3 * --pet-size)` | 配件圖示（不參與動畫） |

CSS 以 `background-size: calc(4 * var(--pet-size)) calc(4 * var(--pet-size))` 顯示，動畫用 `steps(N)` 切格。`image-rendering: pixelated` 確保像素邊緣不模糊。

## 資料結構

### 儲存格式（`chrome.storage.local` key-value）

```js
{
  pets: [
    { id: number, type: string, x: number, y: number }
    // x, y 為視窗比例 (0–1)，spawn 時乘以 innerWidth/innerHeight 換算像素
  ],
  bgTheme: 'default' | 'cozy-room' | 'pixel-forest',
  shortcuts: [
    { name: string, url: string, icon: string }
    // url 自動補 https:// 前綴；icon 為單字元或 emoji
  ]
}
```

### 預設值（`state.js:2-12`）

```js
pets: [{ id: Date.now(), type: 'cat1', x: 0.5, y: 0.8 }]
bgTheme: 'default'
shortcuts: [Google, YouTube, GitHub]
```

### 執行期（`newtab.js`）

`Map<petId, PetEngine>` 維護執行中的寵物實例（`petInstances`），key 為 `pet.id`（timestamp）。

## 寵物品種一覽

| 種類 | type 值 | 中文名 | 分層 |
|---|---|---|---|
| 貓 | `cat1` | 英短貓 | Ground |
| 貓 | `cat2` | 暹羅貓 | Ground |
| 貓 | `cat3` | 緬因貓 | Ground |
| 狗 | `dog1` | 柴犬 | Ground |
| 狗 | `dog2` | 柯基 | Ground |
| 狗 | `dog3` | 黃金獵犬 | Ground |
| 鳥 | `bird1` | 老鷹 | Air |
| 鳥 | `bird2` | 貓頭鷹 | Air |
| 鳥 | `bird3` | 鸚鵡 | Air |
| 魚 | `fish1` | 金魚 | Water |
| 魚 | `fish2` | 小丑魚 | Water |
| 魚 | `fish3` | 鬥魚 | Water |

## 新增寵物種類

需同步修改四處：

1. `assets/pets/` 加入新 PNG（遵循 1024×1024 sprite sheet 規格）
2. `styles/pet.css` 加入 `.pet-<type> { background-image: url('../assets/pets/<type>.png'); }`
3. `scripts/newtab.js` 的 `PET_NAMES` 物件（`newtab.js:24`）加入 `<type>: '中文名'`
4. `newtab.html` 的 `#directed-summon-panel` 加入 `<button class="pet-option" data-type="<type>">中文名</button>`

新物種的分層由 `PetEngine.isGroundPet()` / `isAirPet()` / `isWaterPet()` 的 `startsWith` 判定決定，**命名前綴決定行為邏輯**（`cat`/`dog` → ground；`bird` → air；`fish` → water）。

## 背景主題

三種純 CSS radial-gradient 主題（`newtab.js:203-207`）：

| `data-bg` | 描述 |
|---|---|
| `default` | `#1e293b → #0f172a`（預設深色） |
| `cozy-room` | `#475569 → #1e293b`（溫馨小屋） |
| `pixel-forest` | `#064e3b → #022c22`（像素森林） |

目前均為純漸層，無實際像素圖素材。

## 快捷入口

完整實作於 `newtab.js:134-173`：

- `renderShortcuts()`：動態生成 `#shortcuts` 內的 `<a>` 元素
- `renderShortcutAdmin()`：設定面板內的管理列表，含刪除按鈕
- 新增時若 URL 無 `http(s)://` 前綴則自動補 `https://`
- icon 欄位空白時取 name 首字大寫或 `?`

## 關鍵限制

- `newtab.html` 是唯一入口，透過 `chrome_url_overrides.newtab` 覆寫新分頁；若使用者已安裝其他同類擴充套件，本套件不會生效。
- Manifest V3 不允許 `newtab` 指向遠端 URL。
- 所有像素素材尺寸應為 8 或 16 的倍數，基礎角色建議 64×64（實際顯示為 128×128）。
- 每隻寵物有獨立的 rAF loop；`destroy()` 必須正確呼叫以避免 loop 殘留（`alive` flag 機制）。
- `chrome.storage` 讀取為非同步，`newtab.js` 以 `await AppState.load()` 在 `DOMContentLoaded` 後初始化。

## 未實作功能（待規劃）

- 餵食互動
- 待辦事項 / 番茄鐘模組
- 背景主題像素圖素材（目前為純漸層）
- 季節造型 / 配件系統（Row 3 sprite 位置已預留）
