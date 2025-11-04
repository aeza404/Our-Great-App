const openBtn = document.getElementById('openBtn');
const backdrop = document.getElementById('backdrop');
const cancelBtn = document.getElementById('cancelBtn');
const itemForm = document.getElementById('itemForm');
const fridge = document.getElementById('fridge');
const locationFilter = document.getElementById('locationFilter');
let lastFocused = null;

let fridgeItems = []; // maintain items in memory

// ============ MODAL HANDLERS ==============
function openModal() {
  lastFocused = document.activeElement;
  backdrop.style.display = 'flex';
  backdrop.setAttribute('aria-hidden', 'false');
  document.getElementById('name').focus();
}

function closeModal() {
  backdrop.style.display = 'none';
  backdrop.setAttribute('aria-hidden', 'true');
  if (lastFocused) lastFocused.focus();
  itemForm.reset();
}

openBtn.addEventListener('click', openModal);
cancelBtn.addEventListener('click', closeModal);
backdrop.addEventListener('click', (e) => {
  if (e.target === backdrop) closeModal();
});

// ============ ITEM CARD CREATION ==============
function createItemCard(item, index) {
  const { name, amount, exp, imgDataUrl, notes, unit, location } = item;
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

  if (notes) {
    const p = document.createElement('div');
    p.style.fontSize = '0.85rem';
    p.style.color = 'var(--muted)';
    p.style.marginTop = '0.4rem';
    p.textContent = notes;
    card.appendChild(p);
  }

  // Add +/- functionality
  const minusBtn = left.querySelector('.minus');
  const plusBtn = left.querySelector('.plus');
  const amountEl = left.querySelector('.amount');

  minusBtn.addEventListener('click', () => {
    if (item.amount > 0) item.amount--;
    amountEl.textContent = item.amount;
  });

  plusBtn.addEventListener('click', () => {
    item.amount++;
    amountEl.textContent = item.amount;
  });

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
  } catch (e) {
    return d;
  }
}

// ============ UPDATE LOCATION SELECT ==============
function updateLocationSelect() {
  const select = locationFilter;
  const allLocations = new Set(['All Locations']);
  fridgeItems.forEach(item => {
    if (item.location && item.location.trim() !== '') {
      allLocations.add(item.location.trim());
    }
  });

  // Clear existing options
  select.innerHTML = '';

  // Add each location as an option
  allLocations.forEach(loc => {
    const option = document.createElement('option');
    option.value = loc;
    option.textContent = loc;
    select.appendChild(option);
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

  let imgDataUrl = null;
  const file = form.image.files[0];
  if (file) {
    try {
      imgDataUrl = await fileToDataUrl(file);
    } catch (err) {
      console.error('Image load failed', err);
    }
  }

  const newItem = { name, amount, exp, imgDataUrl, notes, unit, location };
  fridgeItems.push(newItem);

  updateLocationSelect(); // dynamically add new locations
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

// ============ FILTER BY LOCATION ==============
locationFilter.addEventListener('change', () => {
  renderFridge();
});

// ============ RENDER FUNCTION ==============
function renderFridge() {
  fridge.innerHTML = '';
  const filterVal = locationFilter.value.trim() || 'All Locations';

  fridgeItems
    .filter(item => filterVal === 'All Locations' || 
                    (item.location && item.location.toLowerCase() === filterVal.toLowerCase()))
    .forEach((item, index) => fridge.appendChild(createItemCard(item, index)));
}

// ============ INIT DEFAULT ITEMS ==============
fridgeItems = [
  { name: 'Milk', amount: 1, exp: '', imgDataUrl: '', notes: '2%', unit: 'carton', location: 'Fridge' },
  { name: 'Apples', amount: 6, exp: '', imgDataUrl: '', notes: 'Green', unit: 'pcs', location: 'Pantry' }
];

// Ensure default filter value and select options are set on load
window.addEventListener('DOMContentLoaded', () => {
  renderFridge();
  updateLocationSelect();
});
