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

## 架構

### 三層模組職責

| 檔案 | 職責 |
|---|---|
| `scripts/state.js` | 儲存層：`AppState.load()` / `AppState.save()`，優先使用 `chrome.storage.local`，fallback 到 `localStorage` |
| `scripts/pet-engine.js` | 寵物個體：FSM 狀態機 + 物理位移，每隻寵物一個 `PetEngine` 實例 |
| `scripts/newtab.js` | UI 協調：初始化、時鐘、背景切換、設定面板，呼叫前兩層 |

**腳本載入順序**：`newtab.html` 中依序載入 `state.js` → `pet-engine.js` → `newtab.js`，後者依賴前兩者的全域物件，不可調換。

### PetEngine 狀態機

狀態以 CSS class 實作（`state-idle`、`state-walk`、`state-sleep`、`state-jump`），動畫定義在 `styles/pet.css`。

```
idle ──(random 40%)──→ walk ──(到達目標)──→ idle
idle ──(random 10%)──→ sleep ──(random)──→ idle
任意狀態 ──(click)──→ jump ──(1s)──→ idle
```

- `startBrain()`：每 3–8 秒隨機決策一次
- `physicsLoop()`：`requestAnimationFrame` 驅動，用 `transform: translate + scaleX` 更新位置與面向
- 寵物 DOM 尺寸固定 **128×128 px**，邊界 margin 均以此為基準（見 `physicsLoop` 的 `128` 常數）

### Sprite Sheet 規格

每張 PNG 均為 **1024×1024 px**，採 4 欄 × 4 排排列，每格原始 256×256 px：

| 排（Row） | Y 偏移 | 內容 |
|---|---|---|
| Row 0 | 0 | 待機 4 幀 |
| Row 1 | -128 | 走路 4 幀 |
| Row 2 | -256 | 跳躍 2 幀（x: 0, -128） + 睡覺 2 幀（x: -256, -384） |
| Row 3 | -384 | 配件圖示（不參與動畫） |

CSS 以 `background-size: 512px 512px`（原始 1024 縮 0.5x）顯示，動畫用 `steps(N)` 切格。

### 寵物素材

`assets/pets/` 存放靜態 PNG，目前有 4 種動物 × 3 個品種共 12 張：`cat1–3`、`dog1–3`、`bird1–3`、`fish1–3`。

**新增寵物種類需同步修改兩處：**
1. `assets/pets/` 加入新 PNG（遵循 Sprite Sheet 規格）
2. `styles/pet.css` 加入對應的 `.pet-<type>` background-image 規則

DOM class 為 `pet-${type}`（如 `pet-cat1`），CSS 以 `image-rendering: pixelated` 確保像素邊緣不模糊。

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

### 未實作功能

- **快捷入口**（`#shortcuts` div）：HTML 佔位已存在，JS 尚未實作渲染邏輯
- **背景主題**：目前為純 CSS gradient，尚無實際圖片素材

## 關鍵限制

- `newtab.html` 是唯一入口，透過 `chrome_url_overrides.newtab` 覆寫新分頁；若使用者已安裝其他同類擴充套件，本套件不會生效。
- Manifest V3 不允許 `newtab` 指向遠端 URL。
- 所有像素素材尺寸應為 8 或 16 的倍數，基礎角色建議 64×64（實際顯示為 128×128）。
