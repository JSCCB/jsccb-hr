# JSCCB · HR 管理系统（jsccb-hr）

银行人力资源后台，用于管理员工 **工号**。工号是「JSCCB工作台」的登录凭证。

## 功能
- 🔐 **令牌登录**：进入系统需输入 HR 管理令牌（钥匙）。默认令牌 `JSCCB-HR-2026`，可在 `assets/js/app.js` 顶部 `HR_TOKEN` 修改。
- ➕ **新增工号**：工号、姓名、部门、岗位、状态（在职/停用）。
- 🗑 **删除工号**：一键停用/删除。
- 📤 **导入/导出**：以 JSON 备份或迁移工号数据。
- 🔢 **工号生成**：按 `JSCCB0001` 规则自动顺延。

## 数据联动
工号保存在浏览器 `localStorage` 键 `jsccb:employees`。
将本仓库与 `jsccb-workbench`、`jsccb-credit-card` 一同部署到 GitHub Pages 后，三者处于同一域名 `jsccb.github.io`，**共享 localStorage**——HR 在此创建的工号可直接作为工作台登录凭证，无需额外同步。

## 本地运行
```bash
# 任意静态服务器即可
python -m http.server 8080
# 打开 http://localhost:8080
```

## 部署到 GitHub Pages
1. 仓库 Settings → Pages → Source 选择 `main` 分支 `/ (root)`。
2. 访问 `https://jsccb.github.io/jsccb-hr/`。

> 令牌属于前端常量，仅适合演示/内网场景。生产环境应将令牌校验移到后端。
