# 開發計劃書

**專案：** Pixel Tab Pet — 網頁分頁馬賽克寵物
**版本：** v1.0
**日期：** 2026-05-13
**平台：** Google Chrome、Microsoft Edge（Chromium）

## 專案概要

開發一套 Chrome / Edge 共用的自訂新分頁擴充套件，主體為馬賽克像素風互動寵物。技術採用 Manifest V3，透過 `chrome_url_overrides.newtab` 覆寫瀏覽器新分頁。

視覺核心為復古 16-bit 像素風，所有角色、配件與介面裝飾需維持一致的像素網格與色盤。放大顯示時使用 `image-rendering: pixelated` 保留方塊感，避免平滑模糊。

## 素材規格

### 風格定義

- 清楚像素邊界，禁用反鋸齒與平滑縮放
- 統一角色比例、色階與亮暗處理
- 配件與 UI 裝飾遵循相同像素格線

### 尺寸

- 基礎角色：64×64（顯示 128×128）
- 配件圖示：16×16 或 32×32
- 所有素材以 8 或 16 的倍數切齊

### Sprite Sheet 格式

單張 1024×1024，4 欄 × 4 排，每格 256×256：

| Row | 內容 |
|---|---|
| 0 | 待機 4 幀 |
| 1 | 走路 / 游動 4 幀 |
| 2 | 跳躍 2 幀 + 睡覺 2 幀 |
| 3 | 配件圖示 4 個（動畫不使用） |

### 寵物品種清單

| 種類 | 品種 |
|---|---|
| 貓 | 英短（cat1）、暹羅（cat2）、緬因（cat3） |
| 狗 | 柴犬（dog1）、柯基（dog2）、黃金獵犬（dog3） |
| 鳥 | 老鷹（bird1）、貓頭鷹（bird2）、鸚鵡（bird3） |
| 魚 | 金魚（fish1）、小丑魚（fish2）、鬥魚（fish3） |

## 功能規劃

### MVP（已完成）

- 自訂新分頁首頁
- 時間 / 日期顯示
- 快捷入口（新增 / 刪除 / 持久化）
- 背景主題切換（3 種）
- 多寵物召喚、品種選擇、管理
- 設定面板

### 寵物狀態機（已完成）

```
idle ──(40%)──→ walk ──(到達目標)──→ idle
idle ──(10%)──→ sleep ──(10%)──→ idle
任意狀態 ──(click)──→ jump ──(1s)──→ idle
idle / sleep ──(mousemove)──→ 面向滑鼠（look）
```

### 進階功能（待規劃）

- 餵食互動
- 待辦事項 / 番茄鐘模組
- 背景主題像素圖素材
- 季節造型 / 配件系統

## 效能要求

- 新分頁首屏顯示優先
- 預設僅載入當前啟用品種的 sprite
- 避免大型框架與過重資源
- 每隻寵物獨立 rAF loop，刪除時確保完整清理（alive flag）

## 相容性與限制

- `chrome_url_overrides.newtab` 同一時間只有一個擴充套件生效；使用者需停用其他同類套件
- Manifest V3 不允許 newtab 指向遠端 URL
- Edge（Chromium）可直接共用同一份程式碼，但需分別面對各商店上架審核

## 打包與發佈

### 開發測試（Unpacked）

1. 開啟 `chrome://extensions`
2. 啟用 Developer mode
3. Load unpacked → 選擇專案根目錄
4. 修改 `manifest.json` 需 Reload extension；其他檔案重開新分頁即生效

### 正式封裝

```bash
chrome.exe --pack-extension=專案路徑 --pack-extension-key=金鑰路徑
```

首次打包產生 `.crx` 與 `.pem`；後續更新需保留同一把 `.pem` 維持 extension 身分。

### 版本管理

每次發佈前同步更新 `manifest.json` 的 `version` 欄位。

## 驗收標準

- Chrome 與 Edge 均可正常覆寫新分頁
- 像素素材在不同縮放倍率下清晰不糊化
- 寵物動畫切換順暢，刪除後無 rAF 殘留
- 設定面板所有功能可正常儲存與讀取
