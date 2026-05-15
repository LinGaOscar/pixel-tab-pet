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

**正式封裝**（首次產生 `.crx` 與 `.pem`，後續更新需保留同一把 `.pem`）：
```bash
chrome.exe --pack-extension=專案路徑 --pack-extension-key=金鑰路徑
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
idle / sleep ──(mousemove)──→ 面向滑鼠（僅改 direction，無獨立 state）
```

- `startBrain()`：每 3–8 秒隨機決策一次，決策邏輯依物種分區而異
- `physicsLoop()`：`requestAnimationFrame` 驅動，用 `transform: translate + scaleX` 更新位置與面向
- `alive` flag：`destroy()` 設為 `false`，同時終止 brain timeout 與 rAF loop，並移除所有 window 事件監聽器
- 寵物顯示尺寸由 `--pet-size` CSS 變數控制（`PetEngine.petSizePx()` 計算，範圍 48–128px，依視窗短邊 1/8 決定），RWD resize 時自動更新

### 三分區系統

每隻寵物依品種前綴限制活動範圍：

| 方法 | 品種 | 活動區 |
|---|---|---|
| `isGroundPet()` | `cat*`、`dog*` | 地面（`window.innerHeight × 65% - petSize`），水平移動 |
| `isAirPet()` | `bird*` | 空中層（`20px` 至地面線 - 30px），可降落地面後再起飛 |
| `isWaterPet()` | `fish*` | 水層（地面線 +15px 至底部 -20px），自由游動 |

`_snapZoneY()` 在初始化與存檔還原時把 Y 座標強制吸附到對應層，避免跨層偏移。

### 寵物拖曳與小屋回收

拖曳超過 5px 觸發拖曳模式；放開時若游標在 `#pet-house` 範圍內，`PetEngine` 向 `petStage` 冒泡一個 `pet-drop` 自訂事件（`detail: { id, clientX, clientY }`），由 `newtab.js` 監聽後執行刪除與存檔。

### 召喚模式

- **隨機召喚**：從尚未出現的品種中隨機挑選；全滿時全域隨機
- **定向召喚**：點選 `#directed-summon-btn` 展開品種選單，點選特定 `.pet-option` 直接召喚

### Sprite Sheet 規格

每張 PNG 均為 **1024×1024 px**，採 4 欄 × 4 排排列，每格原始 256×256 px：

| 排（Row） | CSS Y 偏移 | 內容 |
|---|---|---|
| Row 0 | 0 | 待機 4 幀 |
| Row 1 | -128 | 走路 4 幀 |
| Row 2 | -256 | 跳躍 2 幀（x: 0, -128） + 睡覺 2 幀（x: -256, -384） |
| Row 3 | -384 | 配件圖示（不參與動畫） |

CSS 以 `background-size: 512px 512px`（原始 1024 縮 0.5x）顯示，動畫用 `steps(N)` 切格。

### 寵物素材

`assets/pets/` 存放靜態 PNG，目前有 4 種動物 × 3 個品種共 12 張：`cat1–3`、`dog1–3`、`bird1–3`、`fish1–3`。`newtab.js` 的 `PET_NAMES` 常數維護品種 key → 中文名稱對照。

**新增寵物種類需同步修改三處：**
1. `assets/pets/` 加入新 PNG（遵循 Sprite Sheet 規格）
2. `styles/pet.css` 加入對應的 `.pet-<type>` background-image 規則
3. `newtab.js` 的 `PET_NAMES` 物件加入新 key
4. 若屬於新物種前綴，在 `PetEngine` 加入對應的 `is*Pet()` 方法並更新三分區邏輯

DOM class 為 `pet-${type}`（如 `pet-cat1`），CSS 以 `image-rendering: pixelated` 確保像素邊緣不模糊。

### 背景主題

`assets/` 下有兩張 SVG 背景：`bg-cozy-room.svg`、`bg-pixel-forest.svg`。切換時在 `#background-layer` 上加掛 CSS class（`theme-cozy-room`、`theme-pixel-forest`），`styles/newtab.css` 以 `background-image` 套用對應 SVG。

### 資料結構

儲存在 `chrome.storage.local` 的 settings 物件：
```js
{
  pets: [{ id, type, x, y }],        // x, y 為視窗比例 (0–1)
  bgTheme: 'default' | 'cozy-room' | 'pixel-forest',
  shortcuts: [{ name, url, icon }]   // icon 可為 emoji 或單字母
}
```

`newtab.js` 以 `Map<id, PetEngine>` 維護執行中的寵物實例（`petInstances`）。

## 關鍵限制

- `newtab.html` 是唯一入口，透過 `chrome_url_overrides.newtab` 覆寫新分頁；若使用者已安裝其他同類擴充套件，本套件不會生效。
- Manifest V3 不允許 `newtab` 指向遠端 URL。
- 所有像素素材尺寸應為 8 或 16 的倍數，基礎角色建議 64×64（`background-size` 縮放後顯示為 `--pet-size`）。
- 每次正式發佈前需同步更新 `manifest.json` 的 `version` 欄位。
