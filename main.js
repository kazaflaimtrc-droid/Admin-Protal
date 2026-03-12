// 換成你部署好的 Apps Script Web App URL
const SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbzPt3chXt8SSRJESBe7zl0n4WgOrgxYHrcg5YfJXGXoynJT8sEbH6IPE-emRuTKszcZXA/exec';

let currentUser = null;

// 共用：call API
async function callApi(action, payload = {}) {
  const res = await fetch(SCRIPT_URL, {
    method: 'POST',
    // 唔加 headers，等 browser 自己決定 Content-Type
    body: JSON.stringify({ action, payload })
  });
  return res.json();
}

// Login
document.getElementById('loginBtn').addEventListener('click', async () => {
  const email = document.getElementById('emailInput').value.trim();
  if (!email) return;

  document.getElementById('loginMsg').innerText = '登入中...';

  try {
    const res = await callApi('getUserInfo', { email });
    if (res.success) {
      currentUser = res.data;
      document.getElementById('login-section').style.display = 'none';
      document.getElementById('main-section').style.display = 'block';
      document.getElementById('userInfo').innerText = `Hi, ${currentUser.name} (${currentUser.role})`;

      if (currentUser.role === 'Manager') {
        document.getElementById('teamTab').style.display = 'inline-block';
      }
      await loadMySummary();
      await loadMyLeaves();
      if (currentUser.role === 'Manager') {
        await loadPendingLeaves();
      }
    } else {
      document.getElementById('loginMsg').innerText = res.message || 'Login 失敗';
    }
  } catch (e) {
    document.getElementById('loginMsg').innerText = '連線錯誤';
    console.error(e);
  }
});

// Tab 切換
document.querySelectorAll('#tabs button').forEach(btn => {
  btn.addEventListener('click', () => {
    const tab = btn.dataset.tab;
    document.querySelectorAll('.tab').forEach(div => div.style.display = 'none');
    document.getElementById('tab-' + tab).style.display = 'block';
  });
});

// 提交請假
document.getElementById('submitLeaveBtn').addEventListener('click', async () => {
  if (!currentUser) return;
  const type = document.getElementById('leaveType').value;
  const startDate = document.getElementById('leaveStart').value;
  const endDate = document.getElementById('leaveEnd').value;
  const reason = document.getElementById('leaveReason').value;

  if (!startDate || !endDate) {
    document.getElementById('leaveMsg').innerText = '請選擇日期';
    return;
  }
  document.getElementById('leaveMsg').innerText = '提交中...';

  try {
    const res = await callApi('submitLeave', {
      email: currentUser.email,
      type, startDate, endDate, reason
    });
    if (res.success) {
      document.getElementById('leaveMsg').innerText = '已提交';
      await loadMyLeaves();
    } else {
      document.getElementById('leaveMsg').innerText = res.message || '提交失敗';
    }
  } catch (e) {
    console.error(e);
    document.getElementById('leaveMsg').innerText = '連線錯誤';
  }
});

// 載入我的 summary
async function loadMySummary() {
  if (!currentUser) return;
  const res = await callApi('getMySummary', { email: currentUser.email });
  if (!res.success) return;
  const d = res.data;
  const div = document.getElementById('mySummary');
  div.innerHTML = `
    <p>年假結餘：${d.annualBalance} 日<br/>
    病假結餘：${d.sickBalance} 日<br/>
    ${d.month} 遲到：${d.lateCount} 次，早退：${d.earlyCount} 次</p>
  `;
}

// 載入我自己的請假紀錄
async function loadMyLeaves() {
  if (!currentUser) return;
  const res = await callApi('getMyLeaves', { email: currentUser.email });
  if (!res.success) return;
  const rows = res.data || [];
  const tbody = document.querySelector('#myLeaveTable tbody');
  tbody.innerHTML = '';
  rows.slice(-10).reverse().forEach(r => {
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>${r.id}</td>
      <td>${r.type}</td>
      <td>${formatDate(r.start)}</td>
      <td>${formatDate(r.end)}</td>
      <td>${r.days}</td>
      <td><span class="badge ${r.status}">${r.status}</span></td>
    `;
    tbody.appendChild(tr);
  });
}

// Manager：載入 pending leaves
async function loadPendingLeaves() {
  const res = await callApi('getPendingLeaves', {});
  if (!res.success) return;
  const rows = res.data || [];
  const tbody = document.querySelector('#pendingTable tbody');
  tbody.innerHTML = '';
  rows.forEach(r => {
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>${r.id}</td>
      <td>${r.name}<br/><small>${r.email}</small></td>
      <td>${r.type}</td>
      <td>${formatDate(r.start)} ~ ${formatDate(r.end)}</td>
      <td>${r.days}</td>
      <td>${r.reason || ''}</td>
      <td>
        <button data-id="${r.id}" data-status="Approved">Approve</button>
        <button data-id="${r.id}" data-status="Rejected">Reject</button>
      </td>
    `;
    tbody.appendChild(tr);
  });

  tbody.querySelectorAll('button').forEach(btn => {
    btn.addEventListener('click', async () => {
      const id = btn.dataset.id;
      const status = btn.dataset.status;
      await callApi('updateLeaveStatus', { id, status });
      await loadPendingLeaves();
      await loadMyLeaves(); // 如果你係申請人之一
    });
  });
}

function formatDate(v) {
  if (!v) return '';
  // Apps Script 回來可能係 ISO 或 epoch，先簡單處理 string
  const d = new Date(v);
  if (isNaN(d)) return v;
  return d.toISOString().slice(0, 10);
}
