/* JSCCB HR 管理系统 v3
 * 登录凭证：GitHub 个人访问令牌（验证后可管理工号）
 * 数据持久化：employees.json 推送到 jsccb-hr 仓库，多设备共享
 * 工作台读取同一份数据实现多设备登录
 */
(function () {
  "use strict";

  var OWNER = "JSCCB";
  var REPO = "jsccb-hr";
  var FILE_PATH = "employees.json";
  var RAW_URL = "https://raw.githubusercontent.com/" + OWNER + "/" + REPO + "/main/" + FILE_PATH;
  var API_BASE = "https://api.github.com";
  var API_CONTENTS = API_BASE + "/repos/" + OWNER + "/" + REPO + "/contents/" + FILE_PATH;
  var LOCAL_KEY = "jsccb:employees";
  var SESSION_TOKEN_KEY = "jsccb:hr_token";

  var $ = function (id) { return document.getElementById(id); };
  var token = null;

  // 从 GitHub 读取 employees.json
  function fetchFromGitHub() {
    return fetch(RAW_URL + "?t=" + Date.now())
      .then(function (r) {
        if (!r.ok) throw new Error("HTTP " + r.status);
        return r.json();
      })
      .catch(function () { return null; });
  }

  // 从 GitHub API 获取文件 SHA（用于更新）
  function getFileSha() {
    if (!token) return Promise.resolve(null);
    return fetch(API_CONTENTS, {
      headers: { Authorization: "token " + token, Accept: "application/vnd.github.v3+json" }
    }).then(function (r) {
      if (!r.ok) return null;
      return r.json().then(function (d) { return d.sha; });
    }).catch(function () { return null; });
  }

  // 推送 employees.json 到 GitHub
  function pushToGitHub(list) {
    if (!token) return Promise.reject("未登录");
    return getFileSha().then(function (sha) {
      var content = btoa(unescape(encodeURIComponent(JSON.stringify(list, null, 2))));
      var body = {
        message: "update employees (" + list.length + " records)",
        content: content,
        sha: sha || undefined  // undefined for first create
      };
      // 移除 undefined 字段
      if (!sha) delete body.sha;
      return fetch(API_CONTENTS, {
        method: "PUT",
        headers: { Authorization: "token " + token, "Content-Type": "application/json", Accept: "application/vnd.github.v3+json" },
        body: JSON.stringify(body)
      }).then(function (r) {
        if (!r.ok) return r.text().then(function (t) { throw new Error("GitHub API error: " + t); });
        return r.json();
      });
    });
  }

  // 同步数据：从 GitHub 拉取 → 合并到本地 → 写入本地缓存
  function syncFromGithub() {
    return fetchFromGitHub().then(function (remote) {
      if (remote && Array.isArray(remote)) {
        localStorage.setItem(LOCAL_KEY, JSON.stringify(remote));
        return remote;
      }
      return loadLocal();
    });
  }

  // 保存：本地 + 远程
  function saveAndSync(list) {
    localStorage.setItem(LOCAL_KEY, JSON.stringify(list));
    if (token) {
      pushToGitHub(list).catch(function (e) {
        console.warn("GitHub sync failed, data saved locally only:", e);
      });
    }
  }

  function loadLocal() {
    try { return JSON.parse(localStorage.getItem(LOCAL_KEY)) || []; }
    catch (e) { return []; }
  }

  // 验证 token 有效性
  function verifyToken(t) {
    return fetch(API_BASE + "/user", {
      headers: { Authorization: "token " + t, Accept: "application/vnd.github.v3+json" }
    }).then(function (r) {
      if (!r.ok) throw new Error("token 无效");
      return r.json().then(function (u) { return u.login; });
    });
  }

  function unlock(t) {
    token = t;
    sessionStorage.setItem(SESSION_TOKEN_KEY, t);
    $("lock").classList.add("hidden");
    $("app").classList.remove("hidden");
    refreshData();
  }
  function lock() {
    token = null;
    sessionStorage.removeItem(SESSION_TOKEN_KEY);
    $("app").classList.add("hidden");
    $("lock").classList.remove("hidden");
    $("lock-error").textContent = "";
  }

  // 刷新数据并渲染
  function refreshData() {
    var status = $("sync-status");
    if (status) status.textContent = "同步中…";
    syncFromGithub().then(function (list) {
      render(list);
      if (status) status.textContent = "已同步 ✓";
    }).catch(function () {
      render(loadLocal());
      if (status) status.textContent = "本地模式";
    });
  }

  function render(list) {
    var total = list.length;
    var active = list.filter(function (e) { return e.status === "在职"; }).length;
    $("stat-total").textContent = total;
    $("stat-active").textContent = active;
    $("stat-disabled").textContent = total - active;

    var body = $("emp-body");
    body.innerHTML = "";
    $("empty-tip").style.display = total ? "none" : "block";
    list.forEach(function (e) {
      var tr = document.createElement("tr");
      var tagClass = e.status === "在职" ? "tag active" : "tag disabled";
      tr.innerHTML =
        "<td>" + esc(e.id) + "</td>" +
        "<td>" + esc(e.name) + "</td>" +
        "<td>" + esc(e.dept || "-") + "</td>" +
        "<td>" + esc(e.role || "-") + "</td>" +
        '<td><span class="' + tagClass + '">' + esc(e.status) + "</span></td>" +
        '<td><button class="row-del" data-id="' + esc(e.id) + '">删除</button></td>';
      body.appendChild(tr);
    });
    Array.prototype.forEach.call(body.querySelectorAll(".row-del"), function (btn) {
      btn.addEventListener("click", function () { removeEmp(btn.getAttribute("data-id")); });
    });
  }

  function esc(s) {
    return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
    });
  }

  function addEmp(data) {
    var list = loadLocal();
    if (list.some(function (e) { return e.id === data.id; })) {
      alert("工号 " + data.id + " 已存在");
      return false;
    }
    list.push(data);
    saveAndSync(list);
    render(list);
    return true;
  }

  function removeEmp(id) {
    if (!confirm("确认删除工号 " + id + "？")) return;
    var list = loadLocal().filter(function (e) { return e.id !== id; });
    saveAndSync(list);
    render(list);
  }

  function genId() {
    var list = loadLocal();
    var max = 0;
    list.forEach(function (e) {
      var m = /^JSCCB(\d+)$/.exec(e.id || "");
      if (m) max = Math.max(max, parseInt(m[1], 10));
    });
    return "JSCCB" + String(max + 1).padStart(4, "0");
  }

  // ====== 事件绑定 ======

  // Token 登录
  $("unlock-form").addEventListener("submit", function (ev) {
    ev.preventDefault();
    var v = $("token-input").value.trim();
    if (!v) { $("lock-error").textContent = "请输入 GitHub Token"; return; }
    $("lock-error").textContent = "验证中…";
    verifyToken(v).then(function (login) {
      $("lock-error").textContent = "验证通过，欢迎 " + login;
      unlock(v);
    }).catch(function () {
      $("lock-error").textContent = "Token 无效，请检查后重试";
    });
  });

  $("lock-btn").addEventListener("click", lock);

  // 头像预览
  var avatarBase64 = "";
  $("avatar-input").addEventListener("change", function(ev) {
    var file = ev.target.files[0];
    if (!file) return;
    var reader = new FileReader();
    reader.onload = function(e) {
      avatarBase64 = e.target.result;
      $("avatar-preview").src = avatarBase64;
      $("avatar-preview").style.display = "block";
    };
    reader.readAsDataURL(file);
  });

  // 添加/删除工号
  $("emp-form").addEventListener("submit", function (ev) {
    ev.preventDefault();
    var f = ev.target;
    var data = {
      id: f.id.value.trim(),
      name: f.name.value.trim(),
      dept: f.dept.value.trim(),
      role: f.role.value.trim(),
      status: f.status.value,
      avatar: avatarBase64,
      createdAt: new Date().toISOString()
    };
    if (!data.id || !data.name) { alert("工号和姓名为必填项"); return; }
    if (addEmp(data)) {
      f.reset();
      avatarBase64 = "";
      $("avatar-preview").style.display = "none";
    }
  });

  $("gen-btn").addEventListener("click", function () {
    var f = $("emp-form");
    if (!f.id.value.trim()) f.id.value = genId();
  });

  $("export-btn").addEventListener("click", function () {
    var blob = new Blob([JSON.stringify(loadLocal(), null, 2)], { type: "application/json" });
    var a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "jsccb-employees.json";
    a.click();
  });

  $("import-btn").addEventListener("click", function () {
    $("import-input").click();
  });
  $("import-input").addEventListener("change", function (ev) {
    var file = ev.target.files[0];
    if (!file) return;
    var reader = new FileReader();
    reader.onload = function () {
      try {
        var arr = JSON.parse(reader.result);
        if (!Array.isArray(arr)) throw new Error("格式错误");
        saveAndSync(arr);
        render(arr);
        alert("已导入 " + arr.length + " 条工号");
      } catch (e) { alert("导入失败：" + e.message); }
    };
    reader.readAsText(file);
    ev.target.value = "";
  });

  $("sync-btn").addEventListener("click", function () {
    refreshData();
  });

  // 启动：检查 session 中是否有 token
  var savedToken = sessionStorage.getItem(SESSION_TOKEN_KEY);
  if (savedToken) {
    verifyToken(savedToken).then(function () {
      unlock(savedToken);
    }).catch(function () {
      sessionStorage.removeItem(SESSION_TOKEN_KEY);
    });
  }
})();
