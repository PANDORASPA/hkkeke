# AI 女仔圖片生成器

本機單人使用取向的 Next.js MVP：

```text
Google Drive 素材庫
-> /generate 控制台
-> OpenAI Images API 生成圖片
-> Google Drive 成品資料夾
-> Supabase 生成記錄
-> /gallery 圖庫
```

## 頁面

- `/generate`：同步 Google Drive 素材、上傳本地素材、匯入/匯出素材包、選場景和參考圖、生成 1/2/4 張圖、加入列隊、生成相似場景。
- `/gallery`：合併 Supabase 記錄和本機歷史，顯示成品、prompt、狀態、下載和 Google Drive 連結，並支援搜尋、今日篩選和批量整理。
- `/settings`：OpenAI API key 輸入、連接測試、正確使用方法和 Drive folder map。

## 正確使用方法

1. 把素材圖片放入 Google Drive 對應資料夾。
2. 到 `/generate` 按「同步 Google Drive 素材」。
3. 最少選一張場景圖。
4. 可選女仔參考、衣服、髮型、姿勢參考圖。
5. 設定風格、髮型、髮色、衣服、身材、表情、姿勢。
6. 按「生成」即時生成，或按「加入列隊」排多組慢慢生成。
7. 生成結果會保存到本機 Gallery；如 Google Drive 可寫入，亦會上傳到成品資料夾。

## 批量生產 100+ 張

`/generate` 的「批量生產工廠」可一次建立大量列隊任務：

1. 設定目標張數，例如 `100`。
2. 每任務張數建議選 `4`，系統會建立約 25 個任務。
3. 任務間隔秒數建議 `8-15` 秒，減少 rate limit 風險。
4. 按「建立批量列隊」只建立任務；按「建立並開始」會立即逐個生成。
5. 生成期間可按「暫停」，系統會在目前任務完成後停止。
6. 可按「繼續列隊」恢復，或按「重試全部失敗」把失敗任務放回等待中。
7. 常用設定可保存成「生產配方」，下次直接套用。
8. 可用每日 seed 隨機化組合；同一 seed 可重現同一批組合，不同 seed 會改變場景和造型分配。

批量工廠會自動輪流組合不同場景、女仔風格、髮型、髮色、衣服、身材、表情和姿勢。若素材庫有女仔/衣服/髮型/姿勢參考圖，亦可以勾選使用參考素材。

## 大量成品整理

`/gallery` 是批量生成後的收貨頁：

1. 用「只看今日」快速集中處理每日產出。
2. 用搜尋欄找 prompt、衣服、髮型、表情或姿勢。
3. 先把滿意圖片標記「保留」，不合格圖片標記「唔要」。
4. 可對目前可見的本機圖片批量保留、批量唔要、批量還原或刪除。
5. 匯出素材包 JSON 可備份本機歷史、素材、批次和列隊。

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

App 會讀取每個主要資料夾和下一層子資料夾內的圖片。子資料夾名稱會當作素材分類。

請把 root folder 分享給 `GOOGLE_CLIENT_EMAIL` 的 service account。若 service account 上傳到 My Drive 出現 quota 問題，生成結果仍會以 data URL 留在本機 Gallery 供下載；建議改用 shared drive 或手動下載保存。

## 素材包 JSON

`/generate` 支援「匯出素材包 JSON」和「匯入素材包 JSON」。

素材包會包含：

- 本地上傳素材
- 本地生成圖片
- 批次記錄
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
```

`OPENAI_API_KEY` 亦可以在 `/settings` 輸入。server route 會優先嘗試保存到 Supabase `app_settings`；如果 Supabase 暫停，會以 httpOnly cookie 保存，不會寫入前端 localStorage。

## Supabase

需要建立：

- `drive_assets`
- `generated_images`
- `app_settings`

如果 Supabase 暫停，Google Drive 素材同步和圖片生成仍可用；Gallery 會顯示本機歷史。

## 開發

```powershell
npm install
npm run dev
```

打開：

```text
http://localhost:3000/generate
```

## API Routes

- `GET /api/drive/assets`：讀取 Google Drive 圖片素材，並嘗試同步到 Supabase。
- `POST /api/generate-image`：組 prompt、呼叫 OpenAI Images API、上傳 Drive、寫入 Supabase、回傳圖片 data URL。
- `POST /api/generate-scene`：按目前場景圖生成相似場景。
- `GET /api/generated`：讀取生成圖庫資料。
- `GET /api/generated/[id]/download`：從 Drive 下載指定成品 PNG。
- `GET /api/health`：Supabase / Google Drive / OpenAI 連接檢查。
- `GET/POST /api/settings/openai-key`：讀取狀態、測試並儲存 OpenAI API key。
