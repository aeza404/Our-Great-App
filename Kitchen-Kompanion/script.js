console.log("Script started");
const openBtn = document.getElementById('openBtn');
const backdrop = document.getElementById('backdrop');
const cancelBtn = document.getElementById('cancelBtn');
const itemForm = document.getElementById('itemForm');
const fridge = document.getElementById('fridge');
const contact = document.getElementById("myButton");

let lastFocused = null;

contact.addEventListener("click", () => {
    alert("Calling Kitchen Kompanion Support at (555) 123-4567");
});


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

const addItemForm = document.getElementById('addItemForm');
const groceryList = document.getElementById('groceryList');
const itemNameInput = document.getElementById('itemName');
const itemQtyInput = document.getElementById('itemQty');
const emptyState = document.getElementById('emptyState');
const clearCheckedBtn = document.getElementById('clearCheckedBtn');
const contactBtn = document.getElementById('myButton');
const items = [
  { name: 'Spinach', qty: '1 bag', checked: false },
  { name: 'Chicken breast', qty: '2 lbs', checked: false },
  { name: 'Oat milk', qty: '2 cartons', checked: true }
];

function renderList() {
  // Clear current list in the DOM
  groceryList.innerHTML = '';

  // Show or hide "Your list is empty" message
  if (items.length === 0) {
      emptyState.style.display = 'block';
  } else {
      emptyState.style.display = 'none';
  }

  // Build each row
  items.forEach((item, index) => {
      // container <li>
      const li = document.createElement('li');
      li.classList.add('list-item-row');
      if (item.checked) li.classList.add('checked');

      // checkbox + custom green box
      const checkboxWrapper = document.createElement('label');
      checkboxWrapper.classList.add('checkbox-wrapper');

      const checkboxInput = document.createElement('input');
      checkboxInput.type = 'checkbox';
      checkboxInput.checked = item.checked;
      checkboxInput.dataset.index = index; // save which item this is

      const customCheck = document.createElement('div');
      customCheck.classList.add('custom-checkbox');
      customCheck.textContent = '✓';

      checkboxWrapper.appendChild(checkboxInput);
      checkboxWrapper.appendChild(customCheck);

      // text block (name + quantity)
      const textGroup = document.createElement('div');
      textGroup.classList.add('item-text-group');

      const mainLine = document.createElement('div');
      mainLine.classList.add('item-main-line');
      mainLine.textContent = item.name;

      const qtyLine = document.createElement('div');
      qtyLine.classList.add('item-qty-line');
      qtyLine.textContent = item.qty || '';

      textGroup.appendChild(mainLine);
      textGroup.appendChild(qtyLine);

      // put it all together
      li.appendChild(checkboxWrapper);
      li.appendChild(textGroup);

      groceryList.appendChild(li);
  });
}

addItemForm.addEventListener('submit', function (e) {
  e.preventDefault(); // stop page refresh

  const nameVal = itemNameInput.value.trim();
  const qtyVal = itemQtyInput.value.trim();

  // don't add blank items
  if (!nameVal) {
      return;
  }

  // push new item into our array
  items.push({
      name: nameVal,
      qty: qtyVal,
      checked: false
  });

  // clear input boxes
  itemNameInput.value = '';
  itemQtyInput.value = '';

  // re-draw list
  renderList();
});

groceryList.addEventListener('change', function (e) {
  if (e.target.matches('input[type="checkbox"]')) {
      const idx = e.target.dataset.index;
      const newCheckedState = e.target.checked;

      items[idx].checked = newCheckedState;
      renderList();
  }
});

clearCheckedBtn.addEventListener('click', function () {
  for (let i = items.length - 1; i >= 0; i--) {
      if (items[i].checked) {
          items.splice(i, 1);
      }
  }
  renderList();
});

renderList();


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
//need to see how shopping list is implemented before finishing add to grocery button

