const openBtn = document.getElementById('openBtn');
const backdrop = document.getElementById('backdrop');
const cancelBtn = document.getElementById('cancelBtn');
const itemForm = document.getElementById('itemForm');
const fridge = document.getElementById('fridge');
const locationFilter = document.getElementById('locationFilter');
const ownerFilter = document.getElementById('ownerFilter');
const sortSelect = document.getElementById('sortSelect');
const filterToggleBtn = document.getElementById('filterToggle');
const filterPanel = document.getElementById('filterPanel');

let lastFocused = null;
let editIndex = null; // track if editing
let fridgeItems = [];


// ============ MODAL HANDLERS ==============
function openModal(existingItem = null, index = null) {
  lastFocused = document.activeElement;
  backdrop.style.display = 'flex';
  backdrop.setAttribute('aria-hidden', 'false');
  document.getElementById('name').focus();

  if (existingItem) {
    editIndex = index;
    document.getElementById('name').value = existingItem.name;
    document.getElementById('amount').value = existingItem.amount;
    document.getElementById('unit').value = existingItem.unit || '';
    document.getElementById('location').value = existingItem.location || '';
    document.getElementById('exp').value = existingItem.exp || '';
    document.getElementById('notes').value = existingItem.notes || '';
    document.getElementById('owner').value = existingItem.owner || '';
  } else {
    editIndex = null;
    itemForm.reset();
  }
}

function closeModal() {
  backdrop.style.display = 'none';
  backdrop.setAttribute('aria-hidden', 'true');
  if (lastFocused) lastFocused.focus();
  itemForm.reset();
  editIndex = null;
}

openBtn.addEventListener('click', () => openModal());
cancelBtn.addEventListener('click', closeModal);
backdrop.addEventListener('click', e => {
  if (e.target === backdrop) closeModal();
});


// ============ CREATE ITEM CARD ==============
function createItemCard(item, index) {
  const { name, amount, exp, imgDataUrl, notes, unit, location, owner } = item;
  const card = document.createElement('div');
  card.className = 'item';
  card.dataset.location = location || 'Unspecified';

  const thumb = document.createElement('div');
  thumb.className = 'thumb';
  if (imgDataUrl) {
    const img = document.createElement('img');
    img.src = imgDataUrl;
    img.alt = name;
    thumb.appendChild(img);
  } else {
    thumb.textContent = name.charAt(0).toUpperCase();
    thumb.style.fontSize = '2.6rem';
    thumb.style.color = '#555';
  }
  card.appendChild(thumb);

  const title = document.createElement('div');
  title.innerHTML = `<strong>${escapeHtml(name)}</strong>`;
  card.appendChild(title);

  const meta = document.createElement('div');
  meta.className = 'meta';

  const left = document.createElement('div');
  left.className = 'amount-control';
  left.innerHTML = `
    <button class="btn small ghost minus">-</button>
    <span class="amount">${amount}</span>
    <button class="btn small ghost plus">+</button>
    <span class="unit">${unit || ''}</span>
  `;
  const right = document.createElement('div');
  right.innerHTML = `<span>${exp ? formatDate(exp) : '<em>No date</em>'}</span>`;
  meta.appendChild(left);
  meta.appendChild(right);
  card.appendChild(meta);

  const loc = document.createElement('div');
  loc.className = 'location-tag';
  loc.textContent = location ? `📍 ${location}` : '📍 Unspecified';
  card.appendChild(loc);

  if (owner) {
    const o = document.createElement('div');
    o.className = 'location-tag';
    o.textContent = `👤 ${owner}`;
    card.appendChild(o);
  }

  if (notes) {
    const p = document.createElement('div');
    p.style.fontSize = '0.85rem';
    p.style.color = 'var(--muted)';
    p.style.marginTop = '0.4rem';
    p.textContent = notes;
    card.appendChild(p);
  }

  // Add edit & delete buttons
  const controls = document.createElement('div');
  controls.className = 'controls';
  controls.innerHTML = `
    <button class="btn small ghost edit">✏️</button>
    <button class="btn small ghost delete">🗑️</button>
  `;
  card.appendChild(controls);

  // Logic for amount +/- and delete confirmation
  const minusBtn = left.querySelector('.minus');
  const plusBtn = left.querySelector('.plus');
  const amountEl = left.querySelector('.amount');
  const editBtn = controls.querySelector('.edit');
  const deleteBtn = controls.querySelector('.delete');

  minusBtn.addEventListener('click', () => {
    if (item.amount === 1) {
      openDeleteConfirm(index);
      return;
    }
    if (item.amount > 0) item.amount--;
    amountEl.textContent = item.amount;
    saveFridge(); //added recently
  });

  plusBtn.addEventListener('click', () => {
    item.amount++;
    amountEl.textContent = item.amount;
  });

  editBtn.addEventListener('click', () => openModal(item, index));
  deleteBtn.addEventListener('click', () => openDeleteConfirm(index));

  return card;
}

function escapeHtml(s) {
  return String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
}

function formatDate(d) {
  try {
    const dt = new Date(d);
    if (isNaN(dt)) return '';
    return dt.toLocaleDateString();
  } catch {
    return d;
  }
}


// ============ DELETE CONFIRMATION MODAL ==============
const deleteModal = document.getElementById('deleteModal');
const deleteConfirm = document.getElementById('deleteConfirm');
const deleteCancel = document.getElementById('deleteCancel');
let deleteTarget = null;

function openDeleteConfirm(index) {
  deleteTarget = index;
  deleteModal.style.display = 'flex';
}

deleteConfirm.addEventListener('click', () => {
  if (deleteTarget !== null) {
    fridgeItems.splice(deleteTarget, 1);
    saveFridge(); //added recently
    renderFridge();
    updateLocationSelect();
    updateOwnerSelect();
  }
  closeDeleteModal();
});

deleteCancel.addEventListener('click', closeDeleteModal);
function closeDeleteModal() {
  deleteModal.style.display = 'none';
  deleteTarget = null;
}

// ============ UPDATE LOCATION & OWNER SELECTS ==============
function updateLocationSelect() {
  const select = locationFilter;
  const all = new Set(['All Locations']);
  fridgeItems.forEach(i => i.location && all.add(i.location.trim()));
  select.innerHTML = '';
  all.forEach(loc => {
    const o = document.createElement('option');
    o.value = loc;
    o.textContent = loc;
    select.appendChild(o);
  });
}

function updateOwnerSelect() {
  const select = ownerFilter;
  const all = new Set(['All Owners']);
  fridgeItems.forEach(i => i.owner && all.add(i.owner.trim()));
  select.innerHTML = '';
  all.forEach(oVal => {
    const o = document.createElement('option');
    o.value = oVal;
    o.textContent = oVal;
    select.appendChild(o);
  });
}


// ============ FORM SUBMISSION ==============
itemForm.addEventListener('submit', async (ev) => {
  ev.preventDefault();

  const form = ev.target;
  const name = form.name.value.trim();
  const amount = parseInt(form.amount.value, 10);
  const exp = form.exp.value || '';
  const notes = form.notes.value.trim();
  const unit = form.unit.value.trim();
  const location = form.location.value.trim();
  const owner = form.owner.value.trim();

  let imgDataUrl = null;
  const file = form.image.files[0];
  if (file) {
    try {
      imgDataUrl = await fileToDataUrl(file);
    } catch (err) {
      console.error('Image load failed', err);
    }
  }

  const newItem = { name, amount, exp, imgDataUrl, notes, unit, location, owner };

  if (editIndex !== null) {
    fridgeItems[editIndex] = newItem;
  } else {
    fridgeItems.unshift(newItem);
  }

  saveFridge(); //added recently

  updateLocationSelect();
  updateOwnerSelect();
  renderFridge();
  closeModal();
});

function fileToDataUrl(file) {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(r.result);
    r.onerror = reject;
    r.readAsDataURL(file);
  });
}


//Restock Button stuff start here 
//4 screens
//screen 1:
// SMART RESTOCK FLOW
const smartRestockBtn = document.getElementById('smartRestockBtn');
const smartRestockModal = document.getElementById('smartRestock');
const restockContent = document.getElementById('restockContent');

// fake data later will change and update based on stuff added and removed***
const lowItems = [
  { name: "Milk", amount: 0 },
  { name: "Eggs", amount: 2 },
  { name: "Apples", amount: 1 }
];

// Replace the above fake data with this comment later when ready
// const fridgeItems = JSON.parse(localStorage.getItem('fridgeItems')) || [];

// const lowItems = fridgeItems.filter(item => {
//   // you define what "low" means — e.g., amount <= 2
//   return item.amount <= 2;
// });

smartRestockBtn.addEventListener('click', () => {
  showRestockScreen1();
});

function showRestockScreen1() {
  smartRestockModal.setAttribute('aria-hidden', 'false');
  smartRestockModal.style.display = 'flex';

  restockContent.innerHTML = `
    <h2>Smart Restock</h2>
    <p>Selected items that are low and you might want to replace <br>
    Select items to restock and click next:</p>
    <form id="restockForm">
      ${lowItems.map((item, i) => `
        <div>
          <input type="checkbox" id="item${i}" name="item" value="${item.name}">
          <label for="item${i}">${item.name} (Remaining: ${item.amount})</label>
        </div>
      `).join('')}
      <div class="modal-foot">
        <button type="button" id="cancelRestockBtn" class="btn ghost">Cancel</button>
        <button type="submit" class="btn">Next</button>
      </div>
    </form>
  `;

  document.getElementById('cancelRestockBtn').addEventListener('click', closeRestockModal);
  document.getElementById('restockForm').addEventListener('submit', handleRestockSelection);
}

function closeRestockModal() {
  smartRestockModal.style.display = 'none';
  smartRestockModal.setAttribute('aria-hidden', 'true');
}

//screen 2:................................
function handleRestockSelection(event) {
  event.preventDefault(); // stop page reload

  const selected = [...event.target.querySelectorAll('input[name="item"]:checked')]
    .map(input => input.value);
  showRestockScreen2(selected);
}

function showRestockScreen2(selectedItems) {
  restockContent.innerHTML = `
    <h2>Set Quantity & Brand</h2>
    <form id="restockDetailsForm">
      ${selectedItems.map(name => `
        <div class="restock-item">
          <label><strong>${name}</strong></label>
          <div class="form-row">
            <input type="number" name="quantity-${name}" min="1" value="1" required>
          </div>
        </div>
      `).join('')}
      <div class="modal-foot">
        <button type="button" id="backToScreen1" class="btn ghost">Back</button>
        <button type="submit" class="btn">Add to Grocery List</button>
      </div>
    </form>
  `;

  document.getElementById('backToScreen1').addEventListener('click', showRestockScreen1);
  document.getElementById('restockDetailsForm').addEventListener('submit', handleRestockConfirmation);
}



//Screen 3:
//need to see how shopping list is implemented before finishing add to grocery button
// Screen 3: finalize and add to shopping list
function handleRestockConfirmation(event) {
  event.preventDefault();

  const form = event.target;
  const formData = new FormData(form);
  const restockItems = [];

  // Loop through form inputs
  for (const [key, value] of formData.entries()) {
    if (key.startsWith("quantity-")) {
      const name = key.replace("quantity-", "");
      const quantity = parseInt(value, 10) || 1;
      const brand = formData.get(`brand-${name}`) || "";
      restockItems.push({ name, quantity, brand });
    }
  }

  // Save data to localStorage (shopping page listens for this)
  localStorage.setItem("restockData", JSON.stringify(restockItems));

  // Close modal after submitting
  closeRestockModal();
}


// ============ FILTERS & SORTING ==============
function getFilteredAndSortedItems() {
  const locVal = locationFilter.value.trim() || 'All Locations';
  const ownerVal = ownerFilter.value.trim() || 'All Owners';
  const sortVal = sortSelect.value;

  let items = fridgeItems.filter(item =>
    (locVal === 'All Locations' || (item.location && item.location.toLowerCase() === locVal.toLowerCase())) &&
    (ownerVal === 'All Owners' || (item.owner && item.owner.toLowerCase() === ownerVal.toLowerCase()))
  );

  if (sortVal === 'expAsc') {
    items.sort((a, b) => new Date(a.exp || 0) - new Date(b.exp || 0));
  } else if (sortVal === 'expDesc') {
    items.sort((a, b) => new Date(b.exp || 0) - new Date(a.exp || 0));
  }

  return items;
}

locationFilter.addEventListener('change', renderFridge);
ownerFilter.addEventListener('change', renderFridge);
sortSelect.addEventListener('change', renderFridge);

filterToggleBtn.addEventListener('click', () => {
  filterPanel.classList.toggle('open');
});


// ============ RENDER FUNCTION ==============
function renderFridge() {
  fridge.innerHTML = '';
  getFilteredAndSortedItems().forEach((item, i) =>
    fridge.appendChild(createItemCard(item, i))
  );
}


// keyboard behavior
const fakeKeyboard = document.getElementById("fakeKeyboard");

document.addEventListener("focusin", (e) => {
  const targetElement = e.target;
  if ((targetElement.tagName === 'INPUT' &&
      (targetElement.type === 'text' ||
        targetElement.type === 'password' ||
        targetElement.type === 'email' ||
        targetElement.type === 'search' ||
        targetElement.type === 'tel' ||
        targetElement.type === 'url' ||
        targetElement.type === 'number')) ||
    targetElement.tagName === 'TEXTAREA' ||
    targetElement.isContentEditable // For elements with contenteditable attribute
  ) {
    fakeKeyboard.classList.add("active");
  }
});

document.addEventListener("focusout", (e) => {
  if (e.target.tagName === "INPUT" || e.target.tagName === "TEXTAREA") {
    setTimeout(() => fakeKeyboard.classList.remove("active"), 200);
  }
});

// ============ INIT DEFAULT ITEMS ==============
// fridgeItems = [
//   { name: 'Milk', amount: 1, exp: '2025-11-10', imgDataUrl: '', notes: '2%', unit: 'carton', location: 'Fridge', owner: 'Alex' },
//   { name: 'Apples', amount: 6, exp: '2025-12-05', imgDataUrl: '', notes: 'Green', unit: 'pcs', location: 'Pantry', owner: 'Jordan' }
// ];

// window.addEventListener('DOMContentLoaded', () => {
//   renderFridge();
//   updateLocationSelect();
//   updateOwnerSelect();
// });

fridgeItems = JSON.parse(localStorage.getItem('kk_inventory')) || [
  { name: 'Milk', amount: 4, exp: '2025-11-10', imgDataUrl: '', notes: '2%', unit: 'carton', location: 'Fridge', owner: 'Alex' },
  { name: 'Apples', amount: 6, exp: '2025-12-05', imgDataUrl: '', notes: 'Green', unit: 'pcs', location: 'Pantry', owner: 'Jordan' }
];

// Always save after render/update
function saveFridge() {
  localStorage.setItem('kk_inventory', JSON.stringify(fridgeItems));
}

window.addEventListener('DOMContentLoaded', () => {
  renderFridge();
  updateLocationSelect();
  updateOwnerSelect();
  saveFridge(); //added recently
});