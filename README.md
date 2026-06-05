# AI 女仔圖片生成器

本機/單人使用取向的 Next.js MVP：

```text
Google Drive 素材庫
-> /generate 控制台
-> OpenAI Images API 生成圖片
-> Google Drive 成品資料夾
-> Supabase 生成紀錄
-> /gallery 圖庫
```

## 頁面

- `/generate`：同步 Drive 素材、選場景、女仔風格、衣服、髮型、表情、身材、姿勢，生成 1/2/4 張圖。
- `/gallery`：讀取 Supabase `generated_images`，顯示成品、prompt、Google Drive 連結和 PNG 下載。
- `/settings`：OpenAI API key 輸入、連線測試、正確使用方法和 Drive folder map。

## 正確使用方法

1. 把圖片放入 Google Drive 對應資料夾。
2. 到 `/generate` 按「同步 Google Drive 素材」。
3. 至少選一張場景圖。
4. 可選女仔參考、衣服、髮型、姿勢參考圖。
5. 設定風格、髮型、髮色、衣服、身材、表情、姿勢。
6. 按生成，成品會自動上傳到 Google Drive，並寫入 Supabase。

## OpenAI Images API

此 app 使用 OpenAI Images Edits endpoint：

- 預設模型：`gpt-image-1.5`
- 預設尺寸：`1024x1024`
- 預設質素：`medium`
- 場景圖和參考圖會以 `image[]` 傳入。
- GPT Image models 預設回傳 `b64_json`，server route 會轉成 PNG buffer 後上傳 Drive。

如 `/settings` 測試出現 HTTP 403，通常代表：

- API key 屬於錯誤 Project。
- Project/API key 權限未允許 Models 或 Images API。
- GPT Image model 需要先完成 OpenAI Organization Verification。
- 使用 restricted key 時，未開啟相關 endpoint 權限。

## Google Drive 結構

```text
AI-Girl-Generator/
01_Scenes_場景/
02_Girl_References_女仔參考/
03_Outfits_衣服/
04_Hair_髮型髮色/
05_Poses_姿勢/
06_Generated_成品/
```

App 會讀取每個主要資料夾及下一層子資料夾內的圖片。子資料夾名會變成素材分類。請把 root folder 分享給 `GOOGLE_CLIENT_EMAIL` 的 service account。

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

`OPENAI_API_KEY` 亦可在 `/settings` 頁輸入，會由 server route 儲存在 Supabase `app_settings`，不會存在前端 localStorage。

## Supabase

執行：

```text
supabase/migrations/001_ai_girl_generator.sql
```

會建立：

- `drive_assets`
- `generated_images`
- `app_settings`

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

- `GET /api/drive/assets`：讀取 Google Drive 圖片素材並同步到 Supabase。
- `POST /api/generate-image`：組 prompt、呼叫 OpenAI Images API、上傳 Drive、寫入 Supabase。
- `GET /api/generated`：圖庫資料。
- `GET /api/generated/[id]/download`：從 Drive 下載指定成品 PNG。
- `GET /api/health`：Supabase / Google Drive / OpenAI 連線檢查。
- `GET/POST /api/settings/openai-key`：讀取狀態、測試並儲存 OpenAI API key。
