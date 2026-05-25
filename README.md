# 角色一致性圖片工廠

本機單人版 AI 圖片生成工具，用來把「人物參考圖 + 場景 + 衣服 + 動作 + 情緒 + 拍攝風格」組合成 1 / 6 / 9 張角色一致性素材。

## 點樣開

在此資料夾開本機 server：

```powershell
python -m http.server 4173 --bind 127.0.0.1
```

然後打開：

```text
http://127.0.0.1:4173/
```

## 主要功能

- 上傳人物參考圖
- Google Drive asset-pack 匯入 / 匯出
- 人物庫、場景庫、衣服庫本機建包工具
- 建立角色卡
- 選擇場景、衣服、情緒、拍攝風格
- 1 / 6 / 9 張姿勢隊列
- OpenAI Images API 生圖
- Demo 生成，無 API key 都可以驗收完整流程
- 每張圖下載、重試、複製單張 prompt
- 拼圖 contact sheet
- 素材包 JSON 下載與匯入
- 文字包 Markdown 下載
- 成人時尚安全線與工作台檢查

## Google Drive 資產庫

App 支援兩種 Drive 用法：

- **手動模式**：下載 `asset-pack.json` 後自己放入 Google Drive。
- **OAuth 同步模式**：輸入 Google OAuth Client ID，登入後由 app 自動同步到 Drive。

建議 Drive 位置：

```text
AI Image Factory/
  asset-packs/
    main/
      asset-pack.json
      notes.md
```

使用方式：

1. 在 app 的「Google Drive 資產庫」建立人物、場景、衣服。
2. 手動下載 `asset-pack.json`，或用 OAuth 同步到 Drive。
3. 下次使用時手動匯入 JSON，或用「從 Drive 載入」。

## Google OAuth 設定

純靜態版不需要 Google client secret，只需要 OAuth Client ID。

1. 打開 Google Cloud Console。
2. 建立或選擇一個 project。
3. 啟用 Google Drive API。
4. OAuth consent screen 設定為 External 或 Internal，加入自己作為 test user。
5. Credentials > Create credentials > OAuth client ID。
6. Application type 選 Web application。
7. Authorized JavaScript origins 加入本機網址，例如：

```text
http://127.0.0.1:4173
http://localhost:4173
```

8. 把產生的 Client ID 填入 app 的「Google OAuth Client ID」。

App 使用 scope：

```text
https://www.googleapis.com/auth/drive.file
```

此 scope 只讓 app 存取由 app 建立或用戶授權選用的檔案。同步檔案固定為：

```text
My Drive / AI Image Factory / asset-packs / main / asset-pack.json
```

範例檔案：

```text
examples/asset-pack.example.json
```

`asset-pack.json` 會把圖片用 Data URL 內嵌，匯入後不用公開 Drive 連結，也不受跨域限制。

## 使用流程

1. 上傳人物參考圖。
2. 填寫角色 ID、角色描述、一致性要求。
3. 設定場景、衣服、情緒、拍攝風格。
4. 在 OpenAI 設定輸入 API key，或先用 Demo 生成測試流程。
5. 勾選成人時尚安全線。
6. 生成圖片。
7. 下載單張圖、拼圖、素材包 JSON 或文字包。

## 本機版限制

- API key 只存在瀏覽器 localStorage，適合自己用，不適合公開部署。
- 瀏覽器直連 OpenAI API 可能受 CORS、網絡、組織驗證或模型權限影響。
- 如果要公開成 SaaS，下一步應改成後端 proxy、登入、多用戶素材庫、付款和隊列系統。

## 驗收 Checklist

- `node --check app.js` 通過。
- 頁面無 console error。
- Demo 生成可完成 1 / 6 / 9 張。
- 拼圖與素材包 JSON 可以下載。
- 素材包 JSON 可以匯入回載。
- 無 API key、無參考圖、未勾選安全線時會阻止真生成。
