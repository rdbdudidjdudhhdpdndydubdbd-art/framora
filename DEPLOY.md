# Framora 摄影网站 — 部署指南

## 架构

- **线上（GitHub Pages）**：纯静态站点。`npm run build` 会把已发布的照片元数据写入
  `dist/photos.json`、把对应图片拷入 `dist/uploads/`；未发布的照片不会出现在线上。
- **本地**：完整后台。`npm run dev` 后访问 http://localhost:5173/admin 上传和管理照片。
  线上访问 `/admin` 只会看到「后台仅本地可用」提示。

## 首次部署

1. **填写联系邮箱**：`src/components/Footer.tsx` 中的 `CONTACT_EMAIL`。
2. **填写 GitHub 信息**（两处）：
   - `index.html`：`og:image` / `twitter:image` 中的 `<username>` 和 `<repo>`；
   - `package.json`：`deploy` 脚本中的 `BASE_PATH=/<repo>/`。
3. 在 GitHub 上创建仓库，推代码：
   ```sh
   git remote add origin git@github.com:<username>/<repo>.git
   git push -u origin master
   ```
4. 本地构建并部署到 gh-pages 分支：
   ```sh
   npm run deploy
   ```
5. GitHub 仓库 → Settings → Pages → Source 选择 `gh-pages` 分支，保存。
6. 稍等一两分钟，访问 `https://<username>.github.io/<repo>/` 验证。
7. 分享卡检查：用 https://www.opengraph.xyz 抓取你的网址，确认 og 图片正常显示。

## 日常更新流程

1. 本地 `npm run dev`，打开 http://localhost:5173/admin 上传/编辑照片。
2. `npm run deploy` 重新构建并推送线上。

> 照片文件和 `dist/` 不会进入 git 仓库，但 `data/photos.json`（元数据）会入库作为备份。
> 换电脑恢复时：clone 仓库 → `npm install` → 把照片图片放回 `uploads/original` 与
> `uploads/thumbnails` 目录即可。

## 常见问题

- **`npm run build` 报文件缺失**：某条已发布记录引用的图片文件不存在，按报错信息补上
  文件或取消该照片的发布。
- **分享卡没有图**：og:image 必须在 `npm run deploy` 之前填好绝对地址并重新构建。
- **本地 `npm run dev` 起不来**：确认 `.env` 中 `ADMIN_PASSWORD` 已设置、`API_PORT` 是
  数字端口（如 3001）。
