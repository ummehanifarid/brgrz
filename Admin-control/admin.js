/* ========================
   THE BRGRZ — ADMIN JS
   admin.js  (MongoDB version)
======================== */

'use strict';

/* -------- CREDENTIALS -------- */
const ADMIN_USER = 'admin@thebrgrz';
const ADMIN_PASS = 'Jasim123';

/* -------- STATE -------- */
let state = {
  orders:             [],
  categories:         [],
  items:              {},   // { catKey: [ {_id, name, price, desc, image, variants}, ... ] }
  activeCatId:        null, // MongoDB _id of selected category
  activeCatKey:       null, // catKey string (e.g. 'burgers')
  editingOrderId:     null, // MongoDB _id
  editingOrderIdx:    null, // local array index
  editingCatId:       null, // MongoDB _id
  editingItemId:      null, // MongoDB _id
  pendingDeleteType:  null,
  pendingDeleteId:    null,
  pendingDeleteSubId: null,
  trafficData:        Array(20).fill(0),
  currentVisitors:    0,
};

/* -------- DOM REFS -------- */
const loginScreen    = document.getElementById('loginScreen');
const adminPanel     = document.getElementById('adminPanel');
const loginForm      = document.getElementById('loginForm');
const loginUser      = document.getElementById('loginUser');
const loginPass      = document.getElementById('loginPass');
const loginError     = document.getElementById('loginError');
const pwToggle       = document.getElementById('pwToggle');
const logoutBtn      = document.getElementById('logoutBtn');
const sidebarToggle  = document.getElementById('sidebarToggle');
const sidebar        = document.getElementById('sidebar');
const pageTitle      = document.getElementById('pageTitle');
const navItems       = document.querySelectorAll('.nav-item');

const statVisitors   = document.getElementById('statVisitors');
const statSales      = document.getElementById('statSales');
const statOrders     = document.getElementById('statOrders');
const statAvg        = document.getElementById('statAvg');
const trafficNow     = document.getElementById('trafficNow');
const miniOrders     = document.getElementById('miniOrders');

const addOrderBtn    = document.getElementById('addOrderBtn');
const ordersBody     = document.getElementById('ordersBody');

const addCatBtn      = document.getElementById('addCatBtn');
const catList        = document.getElementById('catList');
const addItemBtn     = document.getElementById('addItemBtn');
const itemsGrid      = document.getElementById('itemsGrid');
const itemsPanelTitle= document.getElementById('itemsPanelTitle');

const orderModal     = document.getElementById('orderModal');
const catModal       = document.getElementById('catModal');
const itemModal      = document.getElementById('itemModal');
const confirmModal   = document.getElementById('confirmModal');

const orderModalTitle= document.getElementById('orderModalTitle');
const orderCustomer  = document.getElementById('orderCustomer');
const orderPhone     = document.getElementById('orderPhone');
const orderItems     = document.getElementById('orderItems');
const orderAmount    = document.getElementById('orderAmount');
const saveOrderBtn   = document.getElementById('saveOrderBtn');

const catModalTitle  = document.getElementById('catModalTitle');
const catName        = document.getElementById('catName');
const saveCatBtn     = document.getElementById('saveCatBtn');

const itemModalTitle = document.getElementById('itemModalTitle');
const itemName       = document.getElementById('itemName');
const itemPrice      = document.getElementById('itemPrice');
const itemDesc       = document.getElementById('itemDesc');
const itemImageFile  = document.getElementById('itemImageFile');
const imgPreview     = document.getElementById('imgPreview');
const saveItemBtn    = document.getElementById('saveItemBtn');

const confirmMsg       = document.getElementById('confirmMsg');
const confirmDeleteBtn = document.getElementById('confirmDeleteBtn');

let pendingItemImage = null;

/* ======================== API HELPER ======================== */
async function api(method, path, body = null) {
  const opts = { method, headers: { 'Content-Type': 'application/json' } };
  if (body) opts.body = JSON.stringify(body);
  const res  = await fetch(path, opts);
  const json = await res.json();
  if (!res.ok) throw new Error(json.error || 'API error');
  return json;
}

/* ======================== LOAD DATA ======================== */
async function loadAllData() {
  try {
    const [cats, orders] = await Promise.all([
      api('GET', '/api/categories'),
      api('GET', '/api/orders'),
    ]);
    state.categories = cats;
    state.orders     = orders;

    // Load products for each category
    state.items = {};
    await Promise.all(cats.map(async cat => {
      const products = await api('GET', `/api/products?category=${cat.catKey}`);
      state.items[cat.catKey] = products;
    }));
  } catch (err) {
    console.error('Data load error:', err.message);
    alert('Server se connect nahi ho saka. Check karo ke server chal raha hai.');
  }
}

/* ======================== LOGIN ======================== */
pwToggle.addEventListener('click', () => {
  const isPass = loginPass.type === 'password';
  loginPass.type = isPass ? 'text' : 'password';
  pwToggle.innerHTML = isPass
    ? '<i class="fa fa-eye-slash"></i>'
    : '<i class="fa fa-eye"></i>';
});

loginForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  const u = loginUser.value.trim();
  const p = loginPass.value;
  if (u === ADMIN_USER && p === ADMIN_PASS) {
    loginError.textContent = '';
    loginScreen.classList.add('hidden');
    adminPanel.classList.remove('hidden');
    await loadAllData();
    navigateTo('dashboard');
    startLiveTraffic();
  } else {
    loginError.textContent = 'Invalid username or password.';
    loginPass.value = '';
    loginUser.focus();
  }
});

logoutBtn.addEventListener('click', () => {
  adminPanel.classList.add('hidden');
  loginScreen.classList.remove('hidden');
  loginUser.value = '';
  loginPass.value = '';
  loginError.textContent = '';
  stopLiveTraffic();
  state.orders = []; state.categories = []; state.items = {};
});

/* ======================== NAVIGATION ======================== */
const pageTitles = { dashboard: 'Dashboard', orders: 'Orders', menu: 'Menu Manager' };

function navigateTo(page) {
  document.querySelectorAll('.page').forEach(p  => p.classList.remove('active'));
  document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
  document.getElementById(`page-${page}`).classList.add('active');
  document.querySelector(`.nav-item[data-page="${page}"]`).classList.add('active');
  pageTitle.textContent = pageTitles[page];
  sidebar.classList.remove('open');

  if (page === 'dashboard') refreshDashboard();
  if (page === 'orders')    renderOrders();
  if (page === 'menu')      renderCategories();
}

navItems.forEach(btn => btn.addEventListener('click', () => navigateTo(btn.dataset.page)));
sidebarToggle.addEventListener('click', () => sidebar.classList.toggle('open'));
document.addEventListener('click', (e) => {
  if (window.innerWidth <= 700 && sidebar.classList.contains('open')) {
    if (!sidebar.contains(e.target) && e.target !== sidebarToggle)
      sidebar.classList.remove('open');
  }
});

/* ======================== LIVE TRAFFIC ======================== */
let trafficInterval = null;

function startLiveTraffic() {
  const canvas = document.getElementById('trafficCanvas');
  if (!canvas) return;
  trafficInterval = setInterval(tickTraffic, 2000);
  tickTraffic();
}
function stopLiveTraffic() { clearInterval(trafficInterval); }

function tickTraffic() {
  const delta = Math.floor(Math.random() * 11) - 5;
  state.currentVisitors = Math.max(3, Math.min(50,
    state.currentVisitors + delta + Math.floor(Math.random() * 5)));
  state.trafficData.push(state.currentVisitors);
  if (state.trafficData.length > 20) state.trafficData.shift();
  drawTrafficChart();
  trafficNow.textContent  = `${state.currentVisitors} visitor${state.currentVisitors !== 1 ? 's' : ''} right now`;
  statVisitors.textContent = state.currentVisitors;
}

function drawTrafficChart() {
  const canvas = document.getElementById('trafficCanvas');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  const W = canvas.offsetWidth || 400, H = 140;
  canvas.width = W; canvas.height = H;
  const data = state.trafficData;
  const maxV = Math.max(...data, 10);
  const pts  = data.map((v, i) => ({
    x: (i / (data.length - 1)) * W,
    y: H - 10 - (v / maxV) * (H - 20),
  }));
  ctx.clearRect(0, 0, W, H);
  const grad = ctx.createLinearGradient(0, 0, 0, H);
  grad.addColorStop(0, 'rgba(232,168,61,0.35)');
  grad.addColorStop(1, 'rgba(232,168,61,0.02)');
  ctx.beginPath();
  ctx.moveTo(pts[0].x, H);
  pts.forEach(p => ctx.lineTo(p.x, p.y));
  ctx.lineTo(pts[pts.length - 1].x, H);
  ctx.closePath();
  ctx.fillStyle = grad; ctx.fill();
  ctx.beginPath();
  pts.forEach((p, i) => i === 0 ? ctx.moveTo(p.x, p.y) : ctx.lineTo(p.x, p.y));
  ctx.strokeStyle = '#e8a83d'; ctx.lineWidth = 2; ctx.lineJoin = 'round'; ctx.stroke();
  const last = pts[pts.length - 1];
  ctx.beginPath(); ctx.arc(last.x, last.y, 4, 0, Math.PI * 2);
  ctx.fillStyle = '#e8a83d'; ctx.fill();
}

/* ======================== DASHBOARD ======================== */
function refreshDashboard() {
  const total = state.orders.reduce((s, o) => s + (parseFloat(o.total) || 0), 0);
  const count = state.orders.length;
  statSales.textContent    = `Rs ${total.toLocaleString()}`;
  statOrders.textContent   = count;
  statAvg.textContent      = count ? `Rs ${Math.round(total / count).toLocaleString()}` : 'Rs 0';
  statVisitors.textContent = state.currentVisitors;

  const recent = state.orders.slice(0, 5);
  if (recent.length === 0) {
    miniOrders.innerHTML = '<p class="empty-state">No orders yet today.</p>';
  } else {
    miniOrders.innerHTML = recent.map(o => {
      const itemsStr = Array.isArray(o.items)
        ? o.items.map(i => i.name).join(', ')
        : (o.items || '');
      return `
        <div class="mini-order-row">
          <div>
            <div class="customer">${esc(o.customer)}</div>
            <div class="items-preview">${esc(itemsStr).substring(0, 40)}${itemsStr.length > 40 ? '…' : ''}</div>
          </div>
          <div class="amount">Rs ${parseFloat(o.total || 0).toLocaleString()}</div>
        </div>`;
    }).join('');
  }
  setTimeout(() => {
    if (state.trafficData.some(v => v > 0)) drawTrafficChart();
    else startLiveTraffic();
  }, 50);
}

/* ======================== ORDERS ======================== */
function renderOrders() {
  if (state.orders.length === 0) {
    ordersBody.innerHTML = '<tr><td colspan="6" class="empty-state">No orders yet. Add the first one!</td></tr>';
    return;
  }
  ordersBody.innerHTML = state.orders.map((o, i) => {
    const itemsStr = Array.isArray(o.items)
      ? o.items.map(it => `${it.name}${it.size ? ' ('+it.size+')' : ''} x${it.qty}`).join(', ')
      : (o.items || '');
    const shortId  = o._id ? o._id.toString().slice(-4).toUpperCase() : String(i + 1).padStart(3, '0');
    return `
      <tr>
        <td class="order-num">#${shortId}</td>
        <td>${esc(o.customer)}</td>
        <td>${esc(o.phone)}</td>
        <td>${esc(itemsStr)}</td>
        <td class="order-amount">Rs ${parseFloat(o.total || 0).toLocaleString()}</td>
        <td>
          <div class="row-actions">
            <button class="action-btn" onclick="editOrder(${i})" title="Edit"><i class="fa fa-pencil"></i></button>
            <button class="action-btn delete" onclick="deleteOrder(${i})" title="Delete"><i class="fa fa-trash"></i></button>
          </div>
        </td>
      </tr>`;
  }).join('');
}

addOrderBtn.addEventListener('click', () => openOrderModal());

function openOrderModal(idx = null) {
  state.editingOrderIdx = idx;
  orderModalTitle.textContent = idx === null ? 'Add Order' : 'Edit Order';
  if (idx !== null) {
    const o        = state.orders[idx];
    const itemsStr = Array.isArray(o.items)
      ? o.items.map(it => `${it.name} x${it.qty}`).join(', ')
      : (o.items || '');
    orderCustomer.value = o.customer;
    orderPhone.value    = o.phone;
    orderItems.value    = itemsStr;
    orderAmount.value   = o.total || '';
  } else {
    orderCustomer.value = orderPhone.value = orderItems.value = orderAmount.value = '';
  }
  openModal('orderModal');
}

function editOrder(idx)  { openOrderModal(idx); }

function deleteOrder(idx) {
  state.pendingDeleteType = 'order';
  state.pendingDeleteId   = idx;
  const o     = state.orders[idx];
  const short = o._id ? o._id.toString().slice(-4).toUpperCase() : idx + 1;
  confirmMsg.textContent = `Delete order #${short} from "${o.customer}"?`;
  openModal('confirmModal');
}

saveOrderBtn.addEventListener('click', async () => {
  const customer = orderCustomer.value.trim();
  const phone    = orderPhone.value.trim();
  const items    = orderItems.value.trim();
  const total    = parseFloat(orderAmount.value) || 0;
  if (!customer || !phone || !items) {
    alert('Customer name, phone aur items zaroor bharo.');
    return;
  }
  saveOrderBtn.disabled = true; saveOrderBtn.textContent = 'Saving…';
  try {
    if (state.editingOrderIdx !== null) {
      const o   = state.orders[state.editingOrderIdx];
      const res = await api('PUT', `/api/orders/${o._id}`, { customer, phone, items, total });
      state.orders[state.editingOrderIdx] = res;
    } else {
      const res = await api('POST', '/api/orders', { customer, phone, items, total, status: 'pending' });
      state.orders.unshift(res);
    }
    closeModal('orderModal');
    renderOrders();
    refreshDashboard();
  } catch (err) {
    alert('Order save error: ' + err.message);
  } finally {
    saveOrderBtn.disabled = false; saveOrderBtn.textContent = 'Save Order';
  }
});

/* ======================== MENU — CATEGORIES ======================== */
function renderCategories() {
  if (state.categories.length === 0) {
    catList.innerHTML = '<p class="empty-state" style="padding:16px;font-size:12px;">No categories yet.</p>';
  } else {
    catList.innerHTML = state.categories.map(cat => `
      <li class="cat-item ${state.activeCatId === cat._id ? 'active' : ''}" data-id="${cat._id}">
        <span class="cat-item-name" onclick="selectCategory('${cat._id}','${cat.catKey}')">${esc(cat.name)}</span>
        <div class="cat-actions">
          <button class="cat-action" onclick="editCat('${cat._id}')" title="Rename"><i class="fa fa-pencil"></i></button>
          <button class="cat-action del" onclick="deleteCat('${cat._id}')" title="Delete"><i class="fa fa-trash"></i></button>
        </div>
      </li>`).join('');
  }
  if (state.activeCatKey) renderItems(state.activeCatKey);
}

function selectCategory(catId, catKey) {
  state.activeCatId  = catId;
  state.activeCatKey = catKey;
  addItemBtn.disabled = false;
  const cat = state.categories.find(c => c._id === catId);
  itemsPanelTitle.textContent = cat ? cat.name : 'Items';
  renderCategories();
}

addCatBtn.addEventListener('click', () => openCatModal());

function openCatModal(catId = null) {
  state.editingCatId = catId;
  catModalTitle.textContent = catId ? 'Rename Category' : 'Add Category';
  catName.value = catId ? (state.categories.find(c => c._id === catId)?.name || '') : '';
  openModal('catModal');
}

function editCat(catId)  { openCatModal(catId); }

function deleteCat(catId) {
  state.pendingDeleteType = 'cat';
  state.pendingDeleteId   = catId;
  const cat = state.categories.find(c => c._id === catId);
  confirmMsg.textContent  = `Delete category "${cat?.name}" and all its items?`;
  openModal('confirmModal');
}

saveCatBtn.addEventListener('click', async () => {
  const name = catName.value.trim();
  if (!name) { alert('Category name daalo.'); return; }
  saveCatBtn.disabled = true; saveCatBtn.textContent = 'Saving…';
  try {
    if (state.editingCatId) {
      const res = await api('PUT', `/api/categories/${state.editingCatId}`, { name });
      const cat = state.categories.find(c => c._id === state.editingCatId);
      if (cat) cat.name = res.name;
    } else {
      const catKey = name.toLowerCase().replace(/[^a-z0-9]+/g, '-');
      const res    = await api('POST', '/api/categories', { name, catKey });
      state.categories.push(res);
      state.items[res.catKey] = [];
    }
    closeModal('catModal');
    renderCategories();
  } catch (err) {
    alert('Category save error: ' + err.message);
  } finally {
    saveCatBtn.disabled = false; saveCatBtn.textContent = 'Save';
  }
});

/* ======================== MENU — ITEMS ======================== */
addItemBtn.addEventListener('click', () => {
  if (!state.activeCatKey) return;
  openItemModal(null, null);
});

function renderItems(catKey) {
  const items = state.items[catKey] || [];
  if (items.length === 0) {
    itemsGrid.innerHTML = '<p class="empty-state">No items in this category yet. Add one!</p>';
    return;
  }
  itemsGrid.innerHTML = items.map((item, i) => `
    <div class="item-card-admin">
      ${item.image
        ? `<img class="item-card-img" src="${item.image}" alt="${esc(item.name)}">`
        : `<div class="item-card-img-placeholder"><i class="fa fa-image"></i><span>No image</span></div>`}
      <div class="item-card-body">
        <div class="item-card-name">${esc(item.name)}</div>
        ${item.price ? `<div class="item-card-price">Rs ${parseFloat(item.price).toLocaleString()}</div>` : ''}
        ${item.desc  ? `<div class="item-card-desc">${esc(item.desc)}</div>` : ''}
        <div class="item-card-actions">
          <button class="action-btn" onclick="editItem('${catKey}', ${i})" title="Edit"><i class="fa fa-pencil"></i></button>
          <button class="action-btn delete" onclick="deleteItem('${catKey}', ${i})" title="Delete"><i class="fa fa-trash"></i></button>
        </div>
      </div>
    </div>`).join('');
}

function openItemModal(catKey, idx) {
  state.editingItemId = null;
  itemModalTitle.textContent = idx === null ? 'Add Item' : 'Edit Item';
  pendingItemImage = null;
  if (idx !== null && catKey) {
    const item = state.items[catKey][idx];
    state.editingItemId = item._id;
    itemName.value  = item.name;
    itemPrice.value = item.price || '';
    itemDesc.value  = item.desc  || '';
    imgPreview.innerHTML = item.image
      ? `<img src="${item.image}" alt="preview">`
      : '<i class="fa fa-image"></i><span>Click to upload image</span>';
  } else {
    itemName.value = itemPrice.value = itemDesc.value = '';
    resetImgPreview();
  }
  openModal('itemModal');
}

function resetImgPreview() {
  imgPreview.innerHTML = '<i class="fa fa-image"></i><span>Click to upload image</span>';
}

function editItem(catKey, idx) {
  state.activeCatKey = catKey;
  state.activeCatId  = (state.categories.find(c => c.catKey === catKey))?._id || state.activeCatId;
  openItemModal(catKey, idx);
}

function deleteItem(catKey, idx) {
  state.pendingDeleteType  = 'item';
  state.pendingDeleteId    = catKey;
  state.pendingDeleteSubId = idx;
  const item = (state.items[catKey] || [])[idx];
  confirmMsg.textContent = `Delete item "${item?.name}"?`;
  openModal('confirmModal');
}

imgPreview.addEventListener('click', () => itemImageFile.click());
itemImageFile.addEventListener('change', (e) => {
  const file = e.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = (ev) => {
    pendingItemImage = ev.target.result;
    imgPreview.innerHTML = `<img src="${pendingItemImage}" alt="preview">`;
  };
  reader.readAsDataURL(file);
});

saveItemBtn.addEventListener('click', async () => {
  const name  = itemName.value.trim();
  const price = parseFloat(itemPrice.value) || 0;
  const desc  = itemDesc.value.trim();
  if (!name) { alert('Item ka naam daalo.'); return; }

  const catKey = state.activeCatKey;
  if (!catKey) { alert('Pehle category select karo.'); return; }

  saveItemBtn.disabled = true; saveItemBtn.textContent = 'Saving…';
  try {
    let image = null;
    if (pendingItemImage) {
      image = pendingItemImage;
    } else if (state.editingItemId) {
      image = (state.items[catKey] || []).find(it => it._id === state.editingItemId)?.image || null;
    }

    if (state.editingItemId) {
      const res = await api('PUT', `/api/products/${state.editingItemId}`, { name, price, desc, image });
      const idx = state.items[catKey].findIndex(it => it._id === state.editingItemId);
      if (idx !== -1) state.items[catKey][idx] = res;
    } else {
      const res = await api('POST', '/api/products', { name, price, desc, image, category: catKey });
      if (!state.items[catKey]) state.items[catKey] = [];
      state.items[catKey].push(res);
    }
    closeModal('itemModal');
    renderItems(catKey);
  } catch (err) {
    alert('Item save error: ' + err.message);
  } finally {
    saveItemBtn.disabled = false; saveItemBtn.textContent = 'Save Item';
  }
});

/* ======================== CONFIRM DELETE ======================== */
confirmDeleteBtn.addEventListener('click', async () => {
  const type = state.pendingDeleteType;
  confirmDeleteBtn.disabled = true; confirmDeleteBtn.textContent = 'Deleting…';
  try {
    if (type === 'order') {
      const o = state.orders[state.pendingDeleteId];
      await api('DELETE', `/api/orders/${o._id}`);
      state.orders.splice(state.pendingDeleteId, 1);
      renderOrders(); refreshDashboard();
    }
    if (type === 'cat') {
      await api('DELETE', `/api/categories/${state.pendingDeleteId}`);
      const cat = state.categories.find(c => c._id === state.pendingDeleteId);
      if (cat) delete state.items[cat.catKey];
      state.categories = state.categories.filter(c => c._id !== state.pendingDeleteId);
      if (state.activeCatId === state.pendingDeleteId) {
        state.activeCatId = state.activeCatKey = null;
        itemsPanelTitle.textContent = 'Select a category';
        addItemBtn.disabled = true;
        itemsGrid.innerHTML = '<p class="empty-state">Select a category from the left to manage its items.</p>';
      }
      renderCategories();
    }
    if (type === 'item') {
      const catKey = state.pendingDeleteId;
      const item   = state.items[catKey][state.pendingDeleteSubId];
      await api('DELETE', `/api/products/${item._id}`);
      state.items[catKey].splice(state.pendingDeleteSubId, 1);
      renderItems(catKey);
    }
    closeModal('confirmModal');
    state.pendingDeleteType = state.pendingDeleteId = state.pendingDeleteSubId = null;
  } catch (err) {
    alert('Delete error: ' + err.message);
  } finally {
    confirmDeleteBtn.disabled = false; confirmDeleteBtn.textContent = 'Delete';
  }
});

/* ======================== MODAL HELPERS ======================== */
function openModal(id)  { document.getElementById(id).classList.remove('hidden'); }
function closeModal(id) { document.getElementById(id).classList.add('hidden'); }

document.querySelectorAll('[data-modal]').forEach(btn =>
  btn.addEventListener('click', () => closeModal(btn.dataset.modal)));

document.querySelectorAll('.modal-overlay').forEach(overlay =>
  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) closeModal(overlay.id);
  }));

/* ======================== UTILITY ======================== */
function esc(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;')
    .replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}