# AI 女仔圖片生成器

本機/單人使用取向的 Next.js MVP：

```text
Google Drive 素材庫
-> /generate 控制台
-> OpenAI Images API 生成圖片
-> Google Drive 成品資料夾
-> Supabase generated_images 紀錄
-> /gallery 審稿和整理
```

## 頁面

- `/generate`：同步 Google Drive 素材、上傳本地素材、匯入/匯出素材包、選場景和參考圖、生成 1/2/4 張圖、建立批量列隊、生成相似場景。
- `/gallery`：顯示 Supabase 紀錄和本機歷史，支援保留/唔要、審稿標籤、批次報表、品質報表、搜尋、下載和 Google Drive 連結。
- `/settings`：設定 API key、測試 OpenAI / Google Drive / Supabase 連接、查看 Drive folder map。

## 正確使用方法

1. 把素材圖片放入 Google Drive 對應資料夾。
2. 到 `/generate` 按「同步 Google Drive 素材」。
3. 至少選一張場景圖。
4. 可選女仔、衣服、髮型、姿勢參考圖。
5. 設定女仔風格、髮型、髮色、衣服、身材、表情和姿勢。
6. 按「生成」即時生成，或按「加入列隊」排多組任務。
7. 成品會先保存到本機歷史；如果 Google Drive 設定可寫入，會自動上傳到成品資料夾並寫入 Supabase。
8. 如果 Drive 上傳失敗，生成結果卡會顯示「補傳 Drive」，修正 Drive 設定後可逐張補傳。

## 批量生產 100+ 張

`/generate` 的「批量生產工廠」可以一次建立大量列隊任務：

1. 可直接按 `24 張試產`、`100 張日產` 或 `200 張高量` 生產規模 preset。
2. 每任務張數建議選 `4`，100 張會建立約 25 個任務。
3. 任務間隔秒數建議 `8-15` 秒，減少 rate limit 風險。
4. 自動重試次數建議 `2`，API 或 Drive 偶發錯誤會自動再試。
5. 勾選「批量防錯 prompt」，針對手部、臉部、背景、風格、衣服或重複構圖加強避免。
6. 先看「生產前檢查」，確認場景數、參考素材、任務數、預估時間和風險提示。
7. 看「生產計劃」確認場景覆蓋和前 8 個任務樣本；需要留底可匯出 JSON。
8. 按「建立批量列隊」只建立任務；按「建立並開始」會立即逐個生成。
9. 開啟「開頁自動繼續列隊」後，只要本機瀏覽器重新打開 `/generate`，未完成的 pending 任務會自動繼續。
10. 生成期間可按「暫停」，系統會在目前任務完成後停止。
11. 可按「繼續列隊」恢復，或按「重試全部失敗」把失敗任務放回等待中。
12. 常用設定可保存成「生產配方」，下次直接套用。
13. 可用每日 seed 隨機化組合；同一 seed 可重現同一批組合，不同 seed 會改變場景和造型分配。
14. 完成後按「匯出生產報告」保存任務、成功率、重試次數和錯誤記錄。

批量工廠會自動輪流組合不同場景、女仔風格、髮型、髮色、衣服、身材、表情和姿勢。若素材庫有女仔/衣服/髮型/姿勢參考圖，亦可以勾選使用參考素材。

## 無人值守自動生產

專案已加入 Vercel Cron route：`/api/auto-production`。

- `vercel.json` 預設每小時呼叫一次。
- `DAILY_AUTO_IMAGES_PER_RUN=5` 時，每日理論產量約 120 張。
- 每次執行會讀取 Google Drive 素材，自動抽場景、女仔參考、衣服、髮型、姿勢和 prompt 選項。
- 成功生成後會上傳到 `06_Generated_成品`，並寫入 Supabase `generated_images`。
- 需要設定 `CRON_SECRET`。Vercel Daily Cron 和手動測試會用它保護 route。
- 如果生成或 Drive 上傳太慢，可把 `DAILY_AUTO_IMAGES_PER_RUN` 改成 `2`、`3` 或 `4`。
- 因 Vercel Hobby 只支援每日 Cron，本 repo 另有 GitHub Actions workflow：`.github/workflows/auto-production.yml`，每小時呼叫一次 `/api/auto-production`。
- GitHub Actions 使用 GitHub OIDC 短期身份 token，不需要新增 repository secret。
- API 只接受來自 `PANDORASPA/hkkeke`、audience 為 `hkkeke-auto-production` 的 GitHub OIDC token。

手動測試：

```text
https://你的網域/api/auto-production?secret=你的_CRON_SECRET&target=1
```

## 相似場景

場景不足時，可以先選一張場景，再按「按目前場景生成相似場景」。

- 臨時相似場景會立即用作下一次生成背景。
- 按「保存到 Drive 場景庫」後，會上傳到 `01_Scenes_場景` folder，之後同步素材和批量工廠都會用到。
- 如果 Drive 因 quota 或權限上傳失敗，可以先下載場景圖，再修正 Drive 設定後補放入素材庫。

## 大量成品整理

`/gallery` 是批量生成後的收貨台：

1. 用「只看今日」快速集中處理每日產出。
2. 用搜尋欄找 prompt、衣服、髮型、表情或姿勢。
3. 先把滿意圖片標記「保留」，不合格圖片標記「唔要」。
4. 為圖片加審稿標籤，例如手部問題、臉部崩壞、背景不真實、風格唔啱、衣服唔啱、太重複。
5. 用「品質報表」查看女仔風格、衣服、髮型、髮色、表情、身材和姿勢的保留率。
6. 按「套用高保留組合到生成」會回到 `/generate`，自動填入高保留率設定、防錯 prompt 和批量 prompt。
7. 把高保留率組合保存成下一次「生產配方」，低保留率組合就減少使用。
8. 匯出素材包 JSON 可備份本機歷史、素材、批次、審稿標籤和列隊。

## Google Drive 素材庫

```text
AI-Girl-Generator/
01_Scenes_場景/
02_Girl_References_女仔參考/
03_Outfits_衣服/
04_Hair_髮型髮色/
05_Poses_姿勢/
06_Generated_成品/
```

App 會讀取每個主要資料夾和下一層子資料夾的圖片。子資料夾名稱會當作素材分類。

請把 root folder 分享給 `GOOGLE_CLIENT_EMAIL` 的 service account。若 service account 上傳到 My Drive 出現 quota 問題，代表 Google 不容許 service account 使用個人儲存空間。要穩定自動上傳，建議把素材和成品資料夾放在 Google Shared Drive，或之後升級成 Google OAuth 使用者授權。

## 素材包 JSON

`/generate` 支援「匯出素材包 JSON」和「匯入素材包 JSON」。

素材包包含：
- 本地上傳素材
- 本地生成圖片
- 批次紀錄
- 生成列隊

建議把匯出的 JSON 放入 Google Drive，例如：

```text
AI-Girl-Generator/asset-packs/main/asset-pack.json
```

之後任何時間下載 JSON，再在 `/generate` 匯入，就可以重用同一批人物、場景、衣服、髮型、姿勢和本地歷史。

## OpenAI Images API

本 app 使用 OpenAI Images Edits endpoint：

- 預設模型：`gpt-image-1.5`
- 預設尺寸：`1024x1024`
- 預設質素：`medium`
- 場景圖和參考圖會以 `image[]` 傳入
- server route 會把回傳圖片轉成 PNG buffer，再嘗試上傳 Drive 和寫入 Supabase

如果 `/settings` 測試出現 HTTP 403，通常代表：
- API key 屬於錯誤 Project
- Project/API key 權限不足
- restricted key 未開啟相關 endpoint 權限
- GPT Image model 需要先完成 OpenAI Organization Verification

## 環境變數

```text
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=

OPENAI_API_KEY=
OPENAI_IMAGE_MODEL=gpt-image-1.5
OPENAI_IMAGE_SIZE=1024x1024
OPENAI_IMAGE_QUALITY=medium

GOOGLE_CLIENT_EMAIL=
GOOGLE_PRIVATE_KEY=
GOOGLE_DRIVE_ROOT_FOLDER_ID=
GOOGLE_DRIVE_SCENES_FOLDER_ID=
GOOGLE_DRIVE_GIRLS_FOLDER_ID=
GOOGLE_DRIVE_OUTFITS_FOLDER_ID=
GOOGLE_DRIVE_HAIR_FOLDER_ID=
GOOGLE_DRIVE_POSES_FOLDER_ID=
GOOGLE_DRIVE_GENERATED_FOLDER_ID=

CRON_SECRET=
DAILY_AUTO_IMAGES_PER_RUN=5
DAILY_AUTO_USE_REFERENCES=true
DAILY_AUTO_SEED=
```
