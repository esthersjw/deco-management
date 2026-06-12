// Budget Module
(function() {
  let data = { currency: 'CNY', totalBudget: 0, items: [], payments: [] };
  let currentTab = 'overview'; // 'overview' | 'payments' | 'charts'

  const CATEGORIES = ['硬装', '主材', '家具', '家电', '软装', '其他'];
  const PAYMENT_TYPES = ['定金', '首款', '中期', '尾款', '全款'];
  const METHODS = ['转账', '现金', '信用卡', '花呗/白条', '其他'];

  function formatMoney(n) {
    if (n === undefined || n === null || isNaN(n)) return '¥0';
    return '¥' + Number(n).toLocaleString('zh-CN');
  }

  function genId(prefix) {
    return prefix + '_' + Date.now().toString(36) + '_' + Math.random().toString(36).slice(2, 6);
  }

  function getItemActual(itemId) {
    return data.payments
      .filter(p => p.itemId === itemId)
      .reduce((sum, p) => sum + (Number(p.amount) || 0), 0);
  }

  function recalcItem(item) {
    item.actual = getItemActual(item.id);
    item.variance = (Number(item.budget) || 0) - item.actual;
    const ratio = item.budget > 0 ? (item.actual - item.budget) / item.budget : 0;
    if (item.actual === 0) item.status = '未开始';
    else if (ratio > 0.10) item.status = '超支';
    else item.status = '正常';
    return item;
  }

  function recalcAll() {
    data.items.forEach(recalcItem);
    data.totalBudget = data.items.reduce((s, it) => s + (Number(it.budget) || 0), 0);
  }

  function getTotalActual() {
    return data.items.reduce((s, it) => s + (Number(it.actual) || 0), 0);
  }

  function getTotalVariance() {
    return data.items.reduce((s, it) => s + (Number(it.variance) || 0), 0);
  }

  function getUsageRate() {
    return data.totalBudget > 0 ? Math.round((getTotalActual() / data.totalBudget) * 100) : 0;
  }

  function getOverBudgetItems() {
    return data.items.filter(it => {
      const ratio = it.budget > 0 ? (it.actual - it.budget) / it.budget : 0;
      return ratio > 0.10;
    });
  }

  function getRowStyle(item) {
    const ratio = item.budget > 0 ? (item.actual - item.budget) / item.budget : 0;
    if (ratio > 0.20) return 'background:rgba(232,74,95,0.06)';
    if (ratio > 0.10) return 'background:rgba(244,215,88,0.12)';
    return '';
  }

  function save() {
    recalcAll();
    App.setData('budget', JSON.parse(JSON.stringify(data)));
  }

  // ========== RENDER: OVERVIEW ==========
  function renderOverview() {
    recalcAll();
    const totalBudget = data.totalBudget;
    const totalActual = getTotalActual();
    const totalVariance = getTotalVariance();
    const usageRate = getUsageRate();
    const overItems = getOverBudgetItems();

    let alerts = '';
    if (totalVariance < 0 && totalBudget > 0 && Math.abs(totalVariance) / totalBudget > 0.05) {
      alerts += `<div class="alert-banner alert-banner-danger">🔴 总预算已超支 ${formatMoney(Math.abs(totalVariance))}（${Math.round(Math.abs(totalVariance)/totalBudget*100)}%），请立即控制支出</div>`;
    }
    overItems.forEach(it => {
      const ratio = Math.round((it.actual - it.budget) / it.budget * 100);
      const cls = ratio > 20 ? 'alert-banner-danger' : 'alert-banner-warning';
      const icon = ratio > 20 ? '🔴' : '⚠️';
      alerts += `<div class="alert-banner ${cls}">${icon} ${escapeHtml(it.name)} 已超支 ${formatMoney(Math.abs(it.variance))}（${ratio}%），建议控制同类预算</div>`;
    });

    let rows = data.items.map((item) => {
      const rowStyle = getRowStyle(item);
      const statusIcon = item.status === '正常' ? '✅' : item.status === '超支' ? '⚠️' : '⏳';
      const statusCls = item.status === '正常' ? 'badge-green' : item.status === '超支' ? 'badge-red' : 'badge-gray';
      return `
        <tr style="${rowStyle}" data-id="${item.id}">
          <td><span class="budget-cell-name" data-field="name">${escapeHtml(item.name)}</span></td>
          <td><span class="budget-cell-category" data-field="category">${escapeHtml(item.category)}</span></td>
          <td style="text-align:right"><span class="budget-cell-budget" data-field="budget">${formatMoney(item.budget)}</span></td>
          <td style="text-align:right"><span class="budget-cell-actual" data-field="actual">${formatMoney(item.actual)}</span></td>
          <td style="text-align:right;${item.variance < 0 ? 'color:var(--red)' : ''}">${formatMoney(item.variance)}</td>
          <td><span class="badge ${statusCls}">${statusIcon} ${item.status}</span></td>
          <td><span class="budget-cell-note" data-field="note">${escapeHtml(item.note || '')}</span></td>
          <td>
            <button class="btn btn-sm btn-danger budget-btn-delete" data-id="${item.id}">🗑</button>
          </td>
        </tr>
      `;
    }).join('');

    if (data.items.length === 0) {
      rows = `<tr><td colspan="8"><div class="empty-state"><div class="empty-state-icon">💰</div><div class="empty-state-text">暂无预算项目，点击右上角「新增项目」开始</div></div></td></tr>`;
    }

    return `
      <div class="budget-overview">
        ${alerts}
        <div class="app-card" style="overflow-x:auto">
          <table class="data-table budget-table">
            <thead>
              <tr>
                <th>项目</th>
                <th>分类</th>
                <th style="text-align:right">预算金额</th>
                <th style="text-align:right">实际金额</th>
                <th style="text-align:right">差额</th>
                <th>状态</th>
                <th>备注</th>
                <th style="width:60px">操作</th>
              </tr>
            </thead>
            <tbody>
              ${rows}
            </tbody>
            <tfoot>
              <tr style="font-weight:700;background:rgba(43,127,216,0.04)">
                <td colspan="2">合计</td>
                <td style="text-align:right">${formatMoney(totalBudget)}</td>
                <td style="text-align:right">${formatMoney(totalActual)}</td>
                <td style="text-align:right;${totalVariance < 0 ? 'color:var(--red)' : ''}">${formatMoney(totalVariance)}</td>
                <td colspan="2">
                  <div style="display:flex;align-items:center;gap:8px">
                    <span>使用率</span>
                    <div class="progress-bar" style="flex:1;min-width:80px">
                      <div class="progress-bar-fill ${usageRate > 100 ? 'danger' : usageRate > 80 ? 'warning' : ''}" style="width:${Math.min(usageRate,100)}%"></div>
                    </div>
                    <span>${usageRate}%</span>
                  </div>
                </td>
                <td></td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>
    `;
  }

  // ========== RENDER: PAYMENTS ==========
  function renderPayments() {
    const sorted = [...data.payments].sort((a, b) => new Date(b.date) - new Date(a.date));

    let rows = sorted.map(pay => {
      const item = data.items.find(it => it.id === pay.itemId);
      const itemName = item ? item.name : '（已删除项目）';
      const payer = App.users.find(u => u.id === pay.payer);
      const payerName = payer ? payer.name : pay.payer;
      return `
        <tr data-id="${pay.id}">
          <td>${pay.date}</td>
          <td>${escapeHtml(itemName)}</td>
          <td style="text-align:right;font-weight:600">${formatMoney(pay.amount)}</td>
          <td><span class="badge badge-blue">${escapeHtml(pay.type)}</span></td>
          <td>${escapeHtml(payerName)}</td>
          <td>${escapeHtml(pay.method)}</td>
          <td>${escapeHtml(pay.note || '')}</td>
          <td><button class="btn btn-sm btn-danger budget-btn-delete-pay" data-id="${pay.id}">🗑</button></td>
        </tr>
      `;
    }).join('');

    if (sorted.length === 0) {
      rows = `<tr><td colspan="8"><div class="empty-state"><div class="empty-state-icon">🧾</div><div class="empty-state-text">暂无支出记录，点击下方「新增支出」添加</div></div></td></tr>`;
    }

    return `
      <div class="budget-payments">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:16px">
          <div class="text-sm text-faint">共 ${data.payments.length} 笔支出，合计 ${formatMoney(getTotalActual())}</div>
          <button class="btn btn-primary btn-sm" id="btnAddPayment">+ 新增支出</button>
        </div>
        <div class="app-card" style="overflow-x:auto">
          <table class="data-table">
            <thead>
              <tr>
                <th>日期</th>
                <th>关联项目</th>
                <th style="text-align:right">金额</th>
                <th>付款类型</th>
                <th>付款人</th>
                <th>付款方式</th>
                <th>备注</th>
                <th style="width:60px">操作</th>
              </tr>
            </thead>
            <tbody>${rows}</tbody>
          </table>
        </div>
        <div style="margin-top:20px">
          <div style="font-weight:600;margin-bottom:12px">📅 支出时间线</div>
          <div class="budget-timeline">
            ${renderTimeline(sorted)}
          </div>
        </div>
      </div>
    `;
  }

  function renderTimeline(payments) {
    if (payments.length === 0) return '<div style="color:var(--ink-faint);font-size:0.85rem">暂无支出记录</div>';
    return payments.map((pay) => {
      const item = data.items.find(it => it.id === pay.itemId);
      const itemName = item ? item.name : '（已删除）';
      const payer = App.users.find(u => u.id === pay.payer);
      return `
        <div style="display:flex;gap:12px;padding:12px 0;border-bottom:1px solid var(--border-light)">
          <div style="flex-shrink:0">
            <div style="width:12px;height:12px;border-radius:50%;background:var(--blue);border:2px solid var(--blue);margin-top:4px"></div>
          </div>
          <div style="flex:1">
            <div style="display:flex;justify-content:space-between;align-items:center">
              <span style="font-weight:600">${escapeHtml(itemName)} — ${escapeHtml(pay.type)}</span>
              <span style="font-weight:700;color:var(--blue)">${formatMoney(pay.amount)}</span>
            </div>
            <div style="font-size:0.78rem;color:var(--ink-faint)">${pay.date} · ${payer ? escapeHtml(payer.name) : escapeHtml(pay.payer)} · ${escapeHtml(pay.method)}</div>
            ${pay.note ? `<div style="font-size:0.78rem;color:var(--ink-faint);margin-top:4px">${escapeHtml(pay.note)}</div>` : ''}
          </div>
        </div>
      `;
    }).join('');
  }

  // ========== RENDER: CHARTS ==========
  function renderCharts() {
    recalcAll();
    const totalBudget = data.totalBudget;
    const totalActual = getTotalActual();
    const totalVariance = getTotalVariance();

    // Bar chart: budget vs actual per item
    const maxVal = Math.max(...data.items.map(it => Math.max(it.budget || 0, it.actual || 0)), 1);
    const barRows = data.items.map(it => {
      const budgetW = Math.round((it.budget / maxVal) * 100);
      const actualW = Math.round((it.actual / maxVal) * 100);
      const overBudget = it.actual > it.budget;
      return `
        <div style="display:grid;grid-template-columns:100px 1fr 1fr 140px;gap:8px;align-items:center;padding:8px 0;border-bottom:1px solid var(--border-light)">
          <div style="font-size:0.85rem;font-weight:500">${escapeHtml(it.name)}</div>
          <div>
            <div style="height:8px;background:var(--border-light);border-radius:4px;overflow:hidden">
              <div style="height:100%;background:var(--blue);border-radius:4px;width:${budgetW}%"></div>
            </div>
          </div>
          <div>
            <div style="height:8px;background:var(--border-light);border-radius:4px;overflow:hidden">
              <div style="height:100%;background:${overBudget ? 'var(--red)' : 'var(--green)'};border-radius:4px;width:${actualW}%"></div>
            </div>
          </div>
          <div style="display:flex;justify-content:space-between;gap:8px;font-size:0.78rem">
            <span style="color:var(--ink-faint)">${formatMoney(it.budget)}</span>
            <span style="font-weight:600;${overBudget ? 'color:var(--red)' : ''}">${formatMoney(it.actual)}</span>
          </div>
        </div>
      `;
    }).join('');

    // Pie chart by category
    const catMap = {};
    data.items.forEach(it => {
      const c = it.category || '其他';
      if (!catMap[c]) catMap[c] = { budget: 0, actual: 0 };
      catMap[c].budget += Number(it.budget) || 0;
      catMap[c].actual += Number(it.actual) || 0;
    });
    const catEntries = Object.entries(catMap);
    const catColors = ['#2B7FD8', '#F4D758', '#E84A5F', '#16a34a', '#8884d8', '#ff9f43'];
    let gradientParts = [];
    let acc = 0;
    const catTotal = catEntries.reduce((s, [, v]) => s + v.actual, 0) || 1;
    catEntries.forEach(([, v], idx) => {
      const pct = (v.actual / catTotal) * 100;
      const color = catColors[idx % catColors.length];
      gradientParts.push(`${color} ${acc}% ${acc + pct}%`);
      acc += pct;
    });
    const pieStyle = gradientParts.length ? `conic-gradient(${gradientParts.join(', ')})` : 'conic-gradient(var(--border-light) 0% 100%)';

    const catLegend = catEntries.map(([name, v], idx) => {
      const color = catColors[idx % catColors.length];
      const pct = catTotal > 0 ? Math.round((v.actual / catTotal) * 100) : 0;
      return `
        <div style="display:flex;align-items:center;gap:8px;padding:4px 0;font-size:0.85rem">
          <span style="width:10px;height:10px;border-radius:50%;background:${color};flex-shrink:0"></span>
          <span>${escapeHtml(name)}</span>
          <span style="margin-left:auto;font-weight:600">${formatMoney(v.actual)}</span>
          <span style="color:var(--ink-faint)">(${pct}%)</span>
        </div>
      `;
    }).join('');

    return `
      <div class="budget-charts">
        <div class="grid-2">
          <div class="app-card">
            <div style="font-weight:600;margin-bottom:16px">📊 预算 vs 实际</div>
            <div>
              <div style="display:grid;grid-template-columns:100px 1fr 1fr 140px;gap:8px;align-items:center;padding-bottom:8px;border-bottom:2px solid var(--border-light);font-size:0.78rem;color:var(--ink-faint)">
                <div></div>
                <div>预算</div>
                <div>实际</div>
                <div></div>
              </div>
              ${barRows || '<div class="empty-state"><div class="empty-state-icon">📊</div><div class="empty-state-text">暂无数据</div></div>'}
            </div>
          </div>
          <div class="app-card">
            <div style="font-weight:600;margin-bottom:16px">🥧 分类支出占比</div>
            <div style="display:flex;align-items:center;gap:24px;flex-wrap:wrap">
              <div class="pie-chart" style="background:${pieStyle};flex-shrink:0">
                <div class="pie-center">
                  <div class="pie-value">${formatMoney(totalActual)}</div>
                  <div class="pie-label">总支出</div>
                </div>
              </div>
              <div style="flex:1;min-width:160px">
                ${catLegend || '<div style="color:var(--ink-faint);font-size:0.85rem">暂无数据</div>'}
              </div>
            </div>
          </div>
        </div>
        <div class="app-card" style="margin-top:20px">
          <div style="font-weight:600;margin-bottom:16px">📈 月度支出趋势</div>
          <div>
            ${renderTrendChart()}
          </div>
        </div>
      </div>
    `;
  }

  function renderTrendChart() {
    if (data.payments.length === 0) {
      return '<div class="empty-state"><div class="empty-state-icon">📈</div><div class="empty-state-text">暂无支出数据</div></div>';
    }
    // Group by month
    const monthMap = {};
    [...data.payments].sort((a, b) => new Date(a.date) - new Date(b.date)).forEach(p => {
      const d = new Date(p.date);
      const key = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`;
      if (!monthMap[key]) monthMap[key] = 0;
      monthMap[key] += Number(p.amount) || 0;
    });
    const entries = Object.entries(monthMap);
    const max = Math.max(...entries.map(([, v]) => v), 1);
    return `
      <div style="display:flex;align-items:flex-end;gap:12px;height:200px;padding-top:20px">
        ${entries.map(([m, v]) => {
          const h = Math.round((v / max) * 100);
          return `
            <div style="flex:1;display:flex;flex-direction:column;align-items:center;gap:6px;min-width:60px">
              <div style="width:100%;max-width:60px;height:160px;background:var(--border-light);border-radius:4px;position:relative;overflow:hidden">
                <div style="position:absolute;bottom:0;left:0;right:0;height:${h}%;background:var(--blue);border-radius:4px;transition:height 0.5s ease"></div>
              </div>
              <div style="font-size:0.75rem;color:var(--ink-faint)">${m}</div>
              <div style="font-size:0.75rem;font-weight:600">${formatMoney(v)}</div>
            </div>
          `;
        }).join('')}
      </div>
    `;
  }

  // ========== INLINE EDITING ==========
  function makeEditable(container) {
    container.querySelectorAll('.budget-cell-name, .budget-cell-category, .budget-cell-budget, .budget-cell-actual, .budget-cell-note').forEach(cell => {
      cell.addEventListener('click', () => {
        if (cell.querySelector('input, select')) return;
        const field = cell.dataset.field;
        const itemId = cell.closest('tr').dataset.id;
        const item = data.items.find(it => it.id === itemId);
        if (!item) return;

        let input;
        if (field === 'category') {
          input = document.createElement('select');
          input.className = 'app-input app-select';
          input.style.padding = '4px 8px';
          input.style.fontSize = '0.85rem';
          input.style.height = '28px';
          CATEGORIES.forEach(c => {
            const opt = document.createElement('option');
            opt.value = c;
            opt.textContent = c;
            if (c === item.category) opt.selected = true;
            input.appendChild(opt);
          });
        } else if (field === 'budget' || field === 'actual') {
          input = document.createElement('input');
          input.type = 'number';
          input.className = 'app-input';
          input.style.padding = '4px 8px';
          input.style.fontSize = '0.85rem';
          input.value = item[field] || 0;
        } else {
          input = document.createElement('input');
          input.type = 'text';
          input.className = 'app-input';
          input.style.padding = '4px 8px';
          input.style.fontSize = '0.85rem';
          input.value = item[field] || '';
        }

        cell.innerHTML = '';
        cell.appendChild(input);
        input.focus();

        const commit = () => {
          let val = input.value;
          if (field === 'budget' || field === 'actual') {
            val = Number(val) || 0;
          }
          item[field] = val;
          recalcItem(item);
          save();
          render();
        };

        input.addEventListener('blur', commit);
        input.addEventListener('keydown', e => {
          if (e.key === 'Enter') { input.blur(); }
          if (e.key === 'Escape') { render(); }
        });
      });
    });
  }

  // ========== ADD ITEM ==========
  function addItem() {
    const newItem = {
      id: genId('bi'),
      name: '新项目',
      category: CATEGORIES[0],
      budget: 0,
      actual: 0,
      variance: 0,
      status: '未开始',
      paymentSchedule: '',
      note: ''
    };
    data.items.push(newItem);
    save();
    render();
    App.showToast('已新增预算项目', 'success');
  }

  // ========== DELETE ITEM ==========
  async function deleteItem(id) {
    const item = data.items.find(it => it.id === id);
    if (!item) return;
    const ok = await App.confirm(`确定删除「${item.name}」？关联的 ${data.payments.filter(p => p.itemId === id).length} 笔支出记录将保留但不再关联。`);
    if (!ok) return;
    data.items = data.items.filter(it => it.id !== id);
    save();
    render();
    App.showToast('已删除', 'info');
  }

  // ========== ADD PAYMENT ==========
  function addPayment() {
    if (data.items.length === 0) {
      App.showToast('请先添加预算项目', 'warning');
      return;
    }
    const overlay = document.getElementById('modalOverlay');
    const content = document.getElementById('modalContent');
    const today = new Date().toISOString().slice(0, 10);
    const itemOptions = data.items.map(it => `<option value="${it.id}">${escapeHtml(it.name)}</option>`).join('');
    const userOptions = App.users.map(u => `<option value="${u.id}" ${u.id === (App.config?.currentUserId || 'user_1') ? 'selected' : ''}>${escapeHtml(u.name)}</option>`).join('');
    const typeOptions = PAYMENT_TYPES.map(t => `<option value="${t}">${t}</option>`).join('');
    const methodOptions = METHODS.map(m => `<option value="${m}">${m}</option>`).join('');

    content.innerHTML = `
      <div class="modal-header">
        <div class="modal-title">新增支出</div>
        <button class="modal-close" onclick="closeModal()">×</button>
      </div>
      <div class="modal-body">
        <div style="margin-bottom:12px">
          <label style="display:block;font-size:0.8rem;color:var(--ink-light);margin-bottom:6px">关联项目</label>
          <select class="app-input app-select" id="payItemId">${itemOptions}</select>
        </div>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:12px">
          <div>
            <label style="display:block;font-size:0.8rem;color:var(--ink-light);margin-bottom:6px">日期</label>
            <input type="date" class="app-input" id="payDate" value="${today}">
          </div>
          <div>
            <label style="display:block;font-size:0.8rem;color:var(--ink-light);margin-bottom:6px">金额</label>
            <input type="number" class="app-input" id="payAmount" placeholder="0">
          </div>
        </div>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:12px">
          <div>
            <label style="display:block;font-size:0.8rem;color:var(--ink-light);margin-bottom:6px">付款类型</label>
            <select class="app-input app-select" id="payType">${typeOptions}</select>
          </div>
          <div>
            <label style="display:block;font-size:0.8rem;color:var(--ink-light);margin-bottom:6px">付款人</label>
            <select class="app-input app-select" id="payPayer">${userOptions}</select>
          </div>
        </div>
        <div style="margin-bottom:12px">
          <label style="display:block;font-size:0.8rem;color:var(--ink-light);margin-bottom:6px">付款方式</label>
          <select class="app-input app-select" id="payMethod">${methodOptions}</select>
        </div>
        <div>
          <label style="display:block;font-size:0.8rem;color:var(--ink-light);margin-bottom:6px">备注</label>
          <input type="text" class="app-input" id="payNote" placeholder="可选">
        </div>
      </div>
      <div class="modal-footer">
        <button class="btn btn-secondary" onclick="closeModal()">取消</button>
        <button class="btn btn-primary" id="btnConfirmAddPay">确认</button>
      </div>
    `;
    overlay.classList.add('show');

    document.getElementById('btnConfirmAddPay').addEventListener('click', () => {
      const itemId = document.getElementById('payItemId').value;
      const date = document.getElementById('payDate').value;
      const amount = Number(document.getElementById('payAmount').value) || 0;
      const type = document.getElementById('payType').value;
      const payer = document.getElementById('payPayer').value;
      const method = document.getElementById('payMethod').value;
      const note = document.getElementById('payNote').value;
      if (!date || amount <= 0) {
        App.showToast('请填写日期和金额', 'warning');
        return;
      }
      data.payments.push({
        id: genId('pay'),
        itemId,
        date,
        amount,
        type,
        payer,
        method,
        receiptDocId: null,
        note
      });
      save();
      closeModal();
      render();
      App.showToast('支出已记录', 'success');
    });
  }

  // ========== DELETE PAYMENT ==========
  async function deletePayment(id) {
    const pay = data.payments.find(p => p.id === id);
    if (!pay) return;
    const ok = await App.confirm(`确定删除这笔 ${formatMoney(pay.amount)} 的支出记录？`);
    if (!ok) return;
    data.payments = data.payments.filter(p => p.id !== id);
    save();
    render();
    App.showToast('已删除', 'info');
  }

  // ========== MAIN RENDER ==========
  function render() {
    const container = document.getElementById('budget-content');
    if (!container) return;

    const tabs = [
      { id: 'overview', label: '预算总表' },
      { id: 'payments', label: '支出明细' },
      { id: 'charts', label: '统计图表' }
    ];

    let content = '';
    if (currentTab === 'overview') content = renderOverview();
    else if (currentTab === 'payments') content = renderPayments();
    else if (currentTab === 'charts') content = renderCharts();

    container.innerHTML = `
      <div class="tab-bar">
        ${tabs.map(t => `<button class="tab ${t.id === currentTab ? 'active' : ''}" data-tab="${t.id}">${t.label}</button>`).join('')}
      </div>
      ${content}
    `;

    // Tab switching
    container.querySelectorAll('.tab').forEach(btn => {
      btn.addEventListener('click', () => {
        currentTab = btn.dataset.tab;
        render();
      });
    });

    // Inline editing (overview only)
    if (currentTab === 'overview') {
      makeEditable(container);
      container.querySelectorAll('.budget-btn-delete').forEach(btn => {
        btn.addEventListener('click', () => deleteItem(btn.dataset.id));
      });
    }

    // Payment actions
    if (currentTab === 'payments') {
      const addBtn = document.getElementById('btnAddPayment');
      if (addBtn) addBtn.addEventListener('click', addPayment);
      container.querySelectorAll('.budget-btn-delete-pay').forEach(btn => {
        btn.addEventListener('click', () => deletePayment(btn.dataset.id));
      });
    }
  }

  function escapeHtml(str) {
    if (str === undefined || str === null) return '';
    return String(str).replace(/[&<>"']/g, m => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[m]));
  }

  // ========== MODULE REGISTRATION ==========
  registerModule('budget', {
    name: '预算',
    init() {
      const btn = document.getElementById('btnAddBudgetItem');
      if (btn) btn.addEventListener('click', addItem);
    },
    render() {
      render();
    },
    onShow() {
      const d = App.getData('budget');
      if (d) data = JSON.parse(JSON.stringify(d));
      render();
    },
    setData(d) {
      if (d) data = JSON.parse(JSON.stringify(d));
    }
  });
})();
