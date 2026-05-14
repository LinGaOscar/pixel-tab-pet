# Pixel Tab Pet

Chrome / Edge 新分頁像素風互動寵物擴充套件。開啟新分頁時，馬賽克像素寵物會在桌面上自由走動、睡覺、跳躍，並跟隨滑鼠面向。

## 線上預覽

[https://lingaoscar.github.io/pixel-tab-pet/](https://lingaoscar.github.io/pixel-tab-pet/)

> 預覽版以 `localStorage` 取代 `chrome.storage`，功能與擴充套件版本完全相同。

## 功能特色

- **像素寵物** — 12 種品種（貓、狗、鳥、魚各 3 種），支援待機、走路、跳躍、睡眠四種動畫狀態
- **互動行為** — 點擊寵物觸發跳躍；idle / sleep 狀態自動面向滑鼠
- **多寵物** — 可同時召喚複數寵物，各自獨立運行狀態機
- **快捷入口** — 自訂網站捷徑，支援新增 / 刪除，開啟新分頁即可點擊前往
- **背景主題** — 預設深色 / 溫馨小屋 / 像素森林三種主題
- **時鐘日期** — 即時顯示，中文格式
- **設定持久化** — 所有設定儲存於 `chrome.storage.local`

## 安裝方式（擴充套件）

1. 下載或 clone 本專案
2. 開啟 `chrome://extensions`（Edge 為 `edge://extensions`）
3. 啟用右上角 **開發人員模式**
4. 點選 **載入未封裝項目**，選擇本專案根目錄
5. 開啟新分頁即可看到寵物出現

> 若已安裝其他新分頁覆寫類擴充套件，需先停用才能讓本套件生效。

## 使用說明

| 操作 | 效果 |
|---|---|
| 點擊寵物 | 觸發跳躍動畫 |
| 移動滑鼠 | idle / sleep 狀態下寵物面向滑鼠 |
| 點選「+ 召喚寵物」 | 在隨機位置生成一隻新寵物 |
| 設定面板 → 召喚種類 | 選擇下次召喚的品種 |
| 設定面板 → 寵物管理 | 撤回（刪除）已有寵物 |
| 設定面板 → 快捷入口 | 新增 / 移除網站捷徑 |
| 設定面板 → 背景主題 | 切換背景配色 |

## 技術架構

純 Vanilla JS + CSS + HTML，無任何 build 工具或 npm 相依，基於 Manifest V3。

| 檔案 | 職責 |
|---|---|
| `scripts/state.js` | 儲存層：`chrome.storage.local`，fallback 到 `localStorage` |
| `scripts/pet-engine.js` | 寵物個體：FSM 狀態機 + 物理位移 + 事件管理 |
| `scripts/newtab.js` | UI 協調：初始化、時鐘、背景、設定面板、快捷入口 |

## 素材規格

每張 sprite sheet PNG 為 **1024×1024**，4 欄 × 4 排，每格 256×256（顯示縮放至 128×128）：

| Row | 內容 |
|---|---|
| 0 | 待機 4 幀 |
| 1 | 走路 4 幀 |
| 2 | 跳躍 2 幀 + 睡覺 2 幀 |
| 3 | 配件圖示（保留） |

## 開發文件

詳細開發規格與計劃請見 [`doc/development-plan.md`](doc/development-plan.md)。
