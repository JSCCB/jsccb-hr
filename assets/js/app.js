/* JSCCB HR 管理系统 v2
 * 工号数据保存在 localStorage 键 `jsccb:employees`，可被同域下的 JSCCB工作台 读取作为登录凭证。
 */
(function () {
  "use strict";

  // HR 管理令牌（钥匙）
  var HR_TOKEN = "JSCCB-HR-2026";
  var STORE_KEY = "jsccb:employees";
  var SESSION_KEY = "jsccb:hr_unlocked_v2";

  var $ = function (id) { return document.getElementById(id); };

  function load() {
    try { return JSON.parse(localStorage.getItem(STORE_KEY)) || []; }
    catch (e) { return []; }
  }
  function save(list) { localStorage.setItem(STORE_KEY, JSON.stringify(list)); }

  function unlock() {
    $("lock").classList.add("hidden");
    $("app").classList.remove("hidden");
    render();
  }
  function lock() {
    localStorage.removeItem(SESSION_KEY);
    $("app").classList.add("hidden");
    $("lock").classList.remove("hidden");
    $("token-input").value = "";
    $("lock-error").textContent = "";
  }

  function render() {
    var list = load();
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
    var list = load();
    if (list.some(function (e) { return e.id === data.id; })) {
      alert("工号 " + data.id + " 已存在");
      return false;
    }
    list.push(data);
    save(list);
    render();
    return true;
  }

  function removeEmp(id) {
    if (!confirm("确认删除工号 " + id + "？")) return;
    save(load().filter(function (e) { return e.id !== id; }));
    render();
  }

  function genId() {
    var list = load();
    var max = 0;
    list.forEach(function (e) {
      var m = /^JSCCB(\d+)$/.exec(e.id || "");
      if (m) max = Math.max(max, parseInt(m[1], 10));
    });
    return "JSCCB" + String(max + 1).padStart(4, "0");
  }

  // 事件绑定
  $("unlock-form").addEventListener("submit", function (ev) {
    ev.preventDefault();
    var v = $("token-input").value.trim();
    console.log("Token input:", v, "Expected:", HR_TOKEN);
    if (v === HR_TOKEN) {
      localStorage.setItem(SESSION_KEY, "1");
      unlock();
    } else {
      $("lock-error").textContent = "令牌错误，请重试。提示：默认令牌 JSCCB-HR-2026";
    }
  });

  $("lock-btn").addEventListener("click", lock);

  $("emp-form").addEventListener("submit", function (ev) {
    ev.preventDefault();
    var f = ev.target;
    var data = {
      id: f.id.value.trim(),
      name: f.name.value.trim(),
      dept: f.dept.value.trim(),
      role: f.role.value.trim(),
      status: f.status.value,
      createdAt: new Date().toISOString()
    };
    if (!data.id || !data.name) { alert("工号和姓名为必填项"); return; }
    if (addEmp(data)) f.reset();
  });

  $("gen-btn").addEventListener("click", function () {
    var f = $("emp-form");
    if (!f.id.value.trim()) f.id.value = genId();
  });

  $("export-btn").addEventListener("click", function () {
    var blob = new Blob([JSON.stringify(load(), null, 2)], { type: "application/json" });
    var a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "jsccb-employees.json";
    a.click();
  });

  $("import-input").addEventListener("change", function (ev) {
    var file = ev.target.files[0];
    if (!file) return;
    var reader = new FileReader();
    reader.onload = function () {
      try {
        var arr = JSON.parse(reader.result);
        if (!Array.isArray(arr)) throw new Error("格式错误");
        save(arr);
        render();
        alert("已导入 " + arr.length + " 条工号");
      } catch (e) { alert("导入失败：" + e.message); }
    };
    reader.readAsText(file);
    ev.target.value = "";
  });

  // 启动：若已解锁直接进
  if (localStorage.getItem(SESSION_KEY) === "1") {
    unlock();
  }
})();
