const SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbzPt3chXt8SSRJESBe7zl0n4WgOrgxYHrcg5YfJXGXoynJT8sEbH6IPE-emRuTKszcZXA/exec'; // 換成你實際 URL
let currentUser = null;

document.getElementById('loginBtn').addEventListener('click', async () => {
  const email = document.getElementById('emailInput').value.trim();
  if (!email) return;

  const res = await callApi('getUserInfo', { email });
  if (res.success) {
    currentUser = res.data;
    document.getElementById('login-section').style.display = 'none';
    document.getElementById('main-section').style.display = 'block';
    document.getElementById('userInfo').innerText = `Hi, ${currentUser.name} (${currentUser.role})`;

    if (currentUser.role === 'Manager') {
      document.getElementById('teamTab').style.display = 'inline-block';
    }

    loadMySummary();
    loadMyLeaves();
    if (currentUser.role === 'Manager') {
      loadTeamPending();
      loadTeamAttendance();
    }
  } else {
    document.getElementById('loginMsg').innerText = res.message || 'Login 失敗';
  }
});

async function callApi(action, payload) {
  const res = await fetch(SCRIPT_URL, {
    method: 'POST',
    body: JSON.stringify({ action, payload }),
    headers: { 'Content-Type': 'application/json' }
  });
  return res.json();
}

// TODO: 實作 submit leave, load summary, load tables 等
