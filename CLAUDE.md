# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## 專案定義

Chrome / Edge 共用的 Manifest V3 新分頁擴充套件，主體為馬賽克像素風互動寵物。無任何 build 工具或 npm 相依，純 Vanilla JS + CSS + HTML。語言介面為繁體中文。

## 開發流程

**載入擴充套件（開發測試）**
1. 開啟 `chrome://extensions`（或 Edge 擴充套件頁）
2. 啟用 Developer mode
3. 點選 **Load unpacked**，選擇本專案根目錄
4. 修改 `manifest.json` 後需按 Reload；其他 HTML/CSS/JS 重新開啟新分頁即可生效

**無 build 步驟**——直接編輯原始檔，重新載入分頁即可驗證。

**正式封裝**
```bash
chrome.exe --pack-extension=專案路徑 --pack-extension-key=金鑰路徑
```
首次打包產生 `.crx` 與 `.pem`；後續更新需保留同一把 `.pem` 維持 extension 身分。每次發佈前同步更新 `manifest.json` 的 `version` 欄位。

## 檔案結構

```
/
├── manifest.json          # MV3 擴充套件設定（版本、權限、newtab override）
├── newtab.html            # 唯一入口頁，載入所有 CSS 與 JS
├── index.html             # 開發用預覽佔位（不進入擴充套件）
├── scripts/
│   ├── state.js           # 儲存層（chrome.storage.local / localStorage fallback）
│   ├── pet-engine.js      # 寵物個體：FSM + 物理位移 + 拖曳互動
│   └── newtab.js          # UI 協調：初始化、時鐘、召喚、設定、快捷入口
├── styles/
│   ├── newtab.css         # 整體版面與 UI 元件樣式
│   └── pet.css            # Sprite Sheet 動畫與寵物狀態 class
├── assets/
│   └── pets/              # 12 張 sprite PNG（cat1-3, dog1-3, bird1-3, fish1-3）
└── doc/
    └── development-plan.md  # 專案開發計劃書
```

## 架構

### 三層模組職責

| 檔案 | 職責 |
|---|---|
| `scripts/state.js` | 儲存層：`AppState.load()` / `AppState.save()`，優先使用 `chrome.storage.local`，fallback 到 `localStorage` |
| `scripts/pet-engine.js` | 寵物個體：FSM 狀態機 + 物理位移，每隻寵物一個 `PetEngine` 實例 |
| `scripts/newtab.js` | UI 協調：初始化、時鐘、背景切換、設定面板、快捷入口，呼叫前兩層 |

**腳本載入順序**：`newtab.html` 中依序載入 `state.js` → `pet-engine.js` → `newtab.js`，後者依賴前兩者的全域物件，不可調換。

### PetEngine 狀態機

狀態以 CSS class 實作（`state-idle`、`state-walk`、`state-sleep`、`state-jump`），動畫定義在 `styles/pet.css`。

```
idle ──(random 40%)──→ walk ──(到達目標)──→ idle
idle ──(random 10%)──→ sleep ──(random 10%)──→ idle
任意狀態 ──(click)──→ jump ──(1s)──→ idle
```

- `startBrain()`：每 3–8 秒隨機決策一次
- `physicsLoop()`：`requestAnimationFrame` 驅動，用 `transform: translate + scaleX` 更新位置與面向
- `destroy()`：設 `alive = false` 並移除全部 `window` 事件監聽器，防止 rAF 殘留
- 物種類型由 `isGroundPet()` / `isAirPet()` / `isWaterPet()` 判斷，各類型有不同的移動區域與行為概率

### 響應式寵物尺寸

`PetEngine.petSizePx()` 根據視窗短邊動態計算寵物像素尺寸（`min(innerWidth, innerHeight) / 8`，夾在 48–128px 之間），並寫入 CSS 變數 `--pet-size`。所有 sprite 動畫偏移量皆以 `calc(N * var(--pet-size))` 表示，不寫死數值。視窗 resize 時 `PetEngine` 會等比例重新計算位置。

### 分層移動區域（Zone System）

畫面依物種分為三個垂直區域，邊界以 `window.innerHeight * 0.65` 為基準線：

| 層 | 物種 | Y 範圍 |
|---|---|---|
| 空中（air） | bird1–3 | `20px` 到 `groundLine - sz - 30` |
| 地面（ground） | cat1–3, dog1–3 | 固定在 `groundLine - sz`（水平滑動）|
| 水域（water） | fish1–3 | `groundLine + 15` 到 `innerHeight - sz - 20` |

`_snapZoneY()` 在初始化時將存檔的 Y 座標吸附到對應層，`physicsLoop` 每幀強制地面寵物保持在 `groundY`。

### 拖曳互動

- 寵物支援 Pointer Events 拖曳（`pointerdown` / `pointermove` / `pointerup`）
- 滑鼠移動 < 5px 視為點擊，觸發 `handleInteraction()`（jump 動畫）；超過 5px 進入拖曳模式
- 拖曳結束時發出自訂事件 `pet-drop`（bubbles），由 `newtab.js` 攔截判斷是否放入寵物小屋
- 拖曳中滑鼠懸停在寵物小屋上會加 `drag-over` class 提供視覺回饋

### 寵物小屋（Pet House）

`#pet-house` 固定在右下角。將寵物拖曳放入小屋即等同「撤回」——從 `settings.pets` 移除、`petInstances` 刪除、儲存狀態，效果與設定面板的「撤回」按鈕相同。

### 快捷入口

`#shortcuts` div 由 `renderShortcuts()` 動態生成 `<a>` 連結，每個連結含圖示（單字元）與名稱。預設內建 Google / YouTube / GitHub 三筆。設定面板的新增表單會自動補上 `https://` 前綴。資料持久化在 `settings.shortcuts` 陣列。

### Sprite Sheet 規格

每張 PNG 均為 **1024×1024 px**，採 4 欄 × 4 排排列，每格原始 256×256 px，顯示縮放 0.5x（`background-size: 4×--pet-size`）：

| 排（Row） | Y 偏移 | 內容 |
|---|---|---|
| Row 0 | `0` | 待機 4 幀 |
| Row 1 | `-1×sz` | 走路 4 幀 |
| Row 2 | `-2×sz` | 跳躍 2 幀（x: 0, -sz）+ 睡覺 2 幀（x: -2sz, -3sz）|
| Row 3 | `-3×sz` | 配件圖示（不參與動畫）|

CSS 動畫用 `steps(N)` 切格。`image-rendering: pixelated` 確保像素邊緣不模糊。

### 寵物素材

`assets/pets/` 存放靜態 PNG，目前有 4 種動物 × 3 個品種共 12 張：`cat1–3`、`dog1–3`、`bird1–3`、`fish1–3`。

**新增寵物種類需同步修改三處：**
1. `assets/pets/` 加入新 PNG（遵循 Sprite Sheet 規格）
2. `styles/pet.css` 加入對應的 `.pet-<type>` background-image 規則
3. `scripts/newtab.js` 的 `PET_NAMES` 物件與 `newtab.html` 的 `#directed-summon-panel` 加入對應項目

DOM class 為 `pet-${type}`（如 `pet-cat1`）。物種前綴（`cat`、`dog`、`bird`、`fish`）決定移動區域，新增物種需同時在 `pet-engine.js` 的 `isGroundPet()` / `isAirPet()` / `isWaterPet()` 加入判斷。

### 資料結構

儲存在 `chrome.storage.local` 的 settings 物件：
```js
{
  pets: [{ id, type, x, y }],  // x, y 為視窗比例 (0–1)
  bgTheme: 'default' | 'cozy-room' | 'pixel-forest',
  shortcuts: [{ name, url, icon }]
}
```

`newtab.js` 以 `Map<id, PetEngine>` 維護執行中的寵物實例（`petInstances`）。

## 開發工具

**Zone Overlay（分層預覽）**：在新分頁按 `` ` ``（反引號）切換三色半透明帶，顯示 air / ground / water 各層實際 Y 範圍與像素值，方便調校移動邊界。定義在 `newtab.html` 底部的 inline script。

## 關鍵限制

- `newtab.html` 是唯一入口，透過 `chrome_url_overrides.newtab` 覆寫新分頁；若使用者已安裝其他同類擴充套件，本套件不會生效。
- Manifest V3 不允許 `newtab` 指向遠端 URL。
- 所有像素素材尺寸應為 8 或 16 的倍數，基礎角色建議 64×64（實際顯示 128×128 或依視窗動態縮放）。
- 每隻寵物獨立 rAF loop；刪除時必須呼叫 `engine.destroy()` 確保完整清理，否則會有記憶體洩漏。

## 待實作功能

- **背景主題**：目前為純 CSS gradient，尚無實際像素圖片素材（`cozy-room`、`pixel-forest` 主題）
- **餵食互動**、**待辦事項 / 番茄鐘**、**季節造型 / 配件系統**（見 `doc/development-plan.md`）
