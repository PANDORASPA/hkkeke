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

第一版不直接接 Google OAuth。建議用 Google Drive 保存資產包：

```text
AI Image Factory/
  asset-packs/
    main/
      asset-pack.json
      notes.md
```

使用方式：

1. 在 app 的「Google Drive 資產庫」建立人物、場景、衣服。
2. 下載 `asset-pack.json`。
3. 上傳到 Google Drive 的 `AI Image Factory/asset-packs/main/`。
4. 下次使用時從 Drive 下載同一個 JSON，再匯入 app。

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
