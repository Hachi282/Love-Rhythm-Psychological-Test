# 她的戀愛節奏心理測驗

這個專案已整理成可直接部署到 GitHub Pages 的純前端網站，沒有建置工具需求。

## 檔案結構

- `index.html`：網站入口
- `app.js`：互動流程與畫面渲染
- `styles.css`：響應式版型與視覺樣式
- `questions.js`：題庫
- `results.json`：結果庫
- `engine.js`：計分與結果判定邏輯

## 本機預覽

因為頁面會用 `fetch('./results.json')` 讀資料，請不要直接雙擊 `index.html` 用 `file://` 開啟。

可以在專案資料夾執行：

```bash
python -m http.server 8000
```

然後打開：

`http://localhost:8000`

## 自訂方向

- 想改題目文字：編輯 `questions.js`
- 想改人格分析或歌曲：編輯 `results.json`
- 想改計分規則：編輯 `engine.js`
- 想改視覺設計：編輯 `styles.css`
