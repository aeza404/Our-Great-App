const openBtn = document.getElementById('openBtn');
const backdrop = document.getElementById('backdrop');
const cancelBtn = document.getElementById('cancelBtn');
const itemForm = document.getElementById('itemForm');
const fridge = document.getElementById('fridge');

let lastFocused = null;

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

function createItemCard({ name, amount, exp, imgDataUrl, notes }) {
  const card = document.createElement('div');
  card.className = 'item';

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
  left.innerHTML = `<span>${amount}x</span>`;
  const right = document.createElement('div');
  right.innerHTML = `<span>${exp ? formatDate(exp) : '<em>No date</em>'}</span>`;
  meta.appendChild(left);
  meta.appendChild(right);
  card.appendChild(meta);

  if (notes) {
    const p = document.createElement('div');
    p.style.fontSize = '0.85rem';
    p.style.color = 'var(--muted)';
    p.style.marginTop = '0.4rem';
    p.textContent = notes;
    card.appendChild(p);
  }

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
  } catch (e) { return d; }
}

itemForm.addEventListener('submit', async (ev) => {
  ev.preventDefault();

  const form = ev.target;
  const name = form.name.value.trim();
  const amount = form.amount.value;
  const exp = form.exp.value || '';
  const notes = form.notes.value.trim();

  let imgDataUrl = null;
  const file = form.image.files[0];
  if (file) {
    try {
      imgDataUrl = await fileToDataUrl(file);
    } catch (err) {
      console.error('Image load failed', err);
    }
  }

  const card = createItemCard({ name, amount, exp, imgDataUrl, notes });
  fridge.prepend(card);
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

// demo seed
const seed = [
  { name: 'Milk', amount: 1, exp: '', imgDataUrl: '', notes: '2%' },
  { name: 'Apples', amount: 6, exp: '', imgDataUrl: '', notes: 'Green' }
];
seed.forEach(it => fridge.appendChild(createItemCard(it)));



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
    Select items to restock and click next.:</p>
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

  if (selected.length === 0) {
    alert('Please select at least one item.');
    return;
  }

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
            <input type="text" name="brand-${name}" placeholder="(IDK if we even need this box here, but adding incase the shopping list needs more parameter inputs other than item name and count)">
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
//need to see how shopping list is implemented befor finishing add to grocery button

