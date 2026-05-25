# AI Girl Image Generator MVP

Next.js MVP for generating AI girl images from a Google Drive image library.

Flow:

```text
Google Drive素材庫 -> /generate 控制台 -> OpenAI Image API -> Google Drive成品資料夾 -> Supabase紀錄 -> /gallery
```

## Pages

- `/generate` - main generator. Select scene, girl style, outfit, hair, pose, expression, body type, count 1/2/4.
- `/gallery` - generated image history from Supabase `generated_images`.
- `/settings` - connection checks and required environment variables.

## Google Drive Folder Structure

```text
AI-Girl-Generator/
├── 01_Scenes_場景/
├── 02_Girl_References_女仔參考/
├── 03_Outfits_衣服/
├── 04_Hair_髮型髮色/
├── 05_Poses_姿勢/
└── 06_Generated_成品/
    ├── Selected_已選/
    └── Rejected_唔要/
```

Share these folders with the Google service account email in `GOOGLE_CLIENT_EMAIL`.

## Environment Variables

Copy `.env.example` to `.env.local` and fill:

```text
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=

OPENAI_API_KEY=

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

`GOOGLE_PRIVATE_KEY` may contain escaped `\n`; the server converts it automatically.

## Supabase

Run the SQL in:

```text
supabase/migrations/001_ai_girl_generator.sql
```

Tables:

- `drive_assets`
- `generated_images`
- `app_settings`

The app uses `SUPABASE_SERVICE_ROLE_KEY` only in server routes.

## Development

```powershell
npm install
npm run dev
```

Open:

```text
http://localhost:3000/generate
```

## API Routes

- `GET /api/drive/assets` - list Google Drive image assets and upsert to Supabase.
- `POST /api/drive/upload-generated` - upload a PNG to Google Drive generated folder.
- `POST /api/generate-image` - build prompt, call OpenAI Images API, upload to Drive, record in Supabase.
- `GET /api/generated` - gallery data.
- `GET /api/health` - Supabase / Google Drive / OpenAI checks.

## Notes

- `OPENAI_API_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, and Google service account credentials are server-side only.
- First MVP targets Google service account Drive access, not browser OAuth.
- Existing legacy static files (`index.html`, `app.js`, `styles.css`) are retained but the Next.js app is the new product path.
