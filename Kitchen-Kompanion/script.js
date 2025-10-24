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

/* === Recipes feature ===
   - Persisted in localStorage key 'kk_recipes'
   - Add/Edit/Delete recipes
   - Collapsed card shows image or name, click to expand to show ingredients & procedures
*/

(() => {
  const RECIPES_KEY = 'kk_recipes';
  const addRecipeBtn = document.getElementById('addRecipeBtn');
  const recipeBackdrop = document.getElementById('recipeBackdrop');
  const recipeForm = document.getElementById('recipeForm');
  const recipesList = document.getElementById('recipesList');
  const addIngredientBtn = document.getElementById('addIngredientBtn');
  const ingredientsContainer = document.getElementById('ingredientsContainer');
  const cancelRecipeBtn = document.getElementById('cancelRecipeBtn');

  function loadRecipes() {
    try {
      return JSON.parse(localStorage.getItem(RECIPES_KEY) || '[]');
    } catch (e) { return []; }
  }

  function saveRecipes(recipes) {
    localStorage.setItem(RECIPES_KEY, JSON.stringify(recipes || []));
  }

  let recipes = loadRecipes();

  function openRecipeModal(prefill) {
    recipeBackdrop.style.display = 'flex';
    recipeBackdrop.setAttribute('aria-hidden', 'false');
    if (prefill) {
      recipeForm.editIndex.value = (typeof prefill.index === 'number') ? prefill.index : '';
      recipeForm.name.value = prefill.name || '';
      recipeForm.image.value = prefill.image || '';
      recipeForm.procedures.value = prefill.procedures || '';
      recipeForm.servings.value = prefill.servings || 1;
      populateIngredientInputs(prefill.ingredients || []);
    } else {
      recipeForm.reset();
      recipeForm.editIndex.value = '';
      recipeForm.servings.value = 1;
      populateIngredientInputs([]);
    }
    recipeForm.name.focus();
  }

  function closeRecipeModal() {
    recipeBackdrop.style.display = 'none';
    recipeBackdrop.setAttribute('aria-hidden', 'true');
    recipeForm.reset();
    ingredientsContainer.innerHTML = '';
  }

  function populateIngredientInputs(list) {
    // list can be array of objects {qty, unit, name} or strings
    ingredientsContainer.innerHTML = '';
    const items = (list && list.length) ? list : [];
    if (!items.length) items.push({ qty: '', unit: '', name: '' });
    items.forEach((ing) => {
      let qty = '', unit = '', name = '';
      if (typeof ing === 'string') {
        // try to parse leading number and unit
        const m = String(ing).trim().match(/^\s*([\d\.\/]+)\s*([^\s\d]+)?\s*(.*)$/);
        if (m) {
          qty = m[1] || '';
          unit = m[2] || '';
          name = m[3] || '';
        } else {
          name = ing;
        }
      } else if (ing && typeof ing === 'object') {
        qty = ing.qty == null ? '' : String(ing.qty);
        unit = ing.unit || '';
        name = ing.name || '';
      }

      const row = document.createElement('div');
      row.className = 'form-row';
      row.style.marginBottom = '0.4rem';
      row.innerHTML = `
        <input type="number" step="any" name="ingredient_qty" value="${escapeHtml(qty)}" placeholder="qty" style="width:80px">
        <input type="text" name="ingredient_unit" value="${escapeHtml(unit)}" placeholder="unit" style="width:70px">
        <input type="text" name="ingredient_name" value="${escapeHtml(name)}" placeholder="e.g., flour">
        <button type="button" class="btn ghost small remove-ingredient">Remove</button>
      `;
      ingredientsContainer.appendChild(row);
      row.querySelector('.remove-ingredient').addEventListener('click', () => row.remove());
    });
  }

  addIngredientBtn.addEventListener('click', () => {
    const current = Array.from(ingredientsContainer.querySelectorAll('div.form-row')).map(row => {
      const q = row.querySelector('input[name="ingredient_qty"]').value;
      const u = row.querySelector('input[name="ingredient_unit"]').value;
      const n = row.querySelector('input[name="ingredient_name"]').value;
      return { qty: q, unit: u, name: n };
    });
    populateIngredientInputs([...current, { qty: '', unit: '', name: '' }]);
  });

  addRecipeBtn.addEventListener('click', () => openRecipeModal());
  cancelRecipeBtn.addEventListener('click', closeRecipeModal);
  recipeBackdrop.addEventListener('click', (e) => { if (e.target === recipeBackdrop) closeRecipeModal(); });

  recipeForm.addEventListener('submit', (ev) => {
    ev.preventDefault();
    const form = ev.target;
    const editIndex = form.editIndex.value;
    const name = form.name.value.trim();
    const image = form.image.value.trim();
    const procedures = form.procedures.value.trim();
    const servings = Number(form.servings.value) || 1;

    const ingredients = Array.from(ingredientsContainer.querySelectorAll('div.form-row')).map(row => {
      const qv = row.querySelector('input[name="ingredient_qty"]').value.trim();
      const uv = row.querySelector('input[name="ingredient_unit"]').value.trim();
      const nv = row.querySelector('input[name="ingredient_name"]').value.trim();
      return { qty: qv === '' ? '' : Number(qv), unit: uv, name: nv };
    }).filter(it => it.name);

    const recipeObj = { name, image, procedures, ingredients, servings };

    if (editIndex !== '') {
      recipes[Number(editIndex)] = recipeObj;
    } else {
      recipes.unshift(recipeObj);
    }
    saveRecipes(recipes);
    renderRecipes();
    closeRecipeModal();
  });

  function createRecipeCard(recipe, index) {
    const card = document.createElement('article');
    card.className = 'recipe-card';

    const header = document.createElement('div');
    header.className = 'recipe-header';

    const thumb = document.createElement('div');
    thumb.className = 'recipe-thumb';
    if (recipe.image) {
      const img = document.createElement('img'); img.src = recipe.image; img.alt = recipe.name;
      thumb.appendChild(img);
    } else {
      thumb.textContent = recipe.name || '?';
    }

    const title = document.createElement('div');
    title.className = 'recipe-title';
    title.innerHTML = `<strong>${escapeHtml(recipe.name || 'Untitled')}</strong>`;

    header.appendChild(thumb);
    header.appendChild(title);
    card.appendChild(header);

    const details = document.createElement('div');
    details.className = 'recipe-details';

    // Ingredients
    const ingH = document.createElement('h3'); ingH.textContent = 'Ingredients';
    details.appendChild(ingH);
    const ul = document.createElement('ul'); ul.className = 'ingredients-list';
    (recipe.ingredients || []).forEach(it => {
      const li = document.createElement('li');
      // store base qty/unit/name
      if (it && (it.qty !== '' && it.qty != null)) {
        li.dataset.baseQty = String(it.qty);
      }
      if (it && it.unit) li.dataset.unit = it.unit;
      li.dataset.name = it.name || '';
      ul.appendChild(li);
    });
    details.appendChild(ul);

    // Procedures
    const procH = document.createElement('h3'); procH.textContent = 'Procedures';
    details.appendChild(procH);
    const p = document.createElement('div'); p.className = 'procedures'; p.textContent = recipe.procedures || '';
    details.appendChild(p);

  // servings control + actions
  const servingsWrap = document.createElement('div');
  servingsWrap.style.display = 'flex';
  servingsWrap.style.justifyContent = 'space-between';
  servingsWrap.style.alignItems = 'center';
  servingsWrap.style.gap = '0.5rem';
  const servingsLabel = document.createElement('label');
  servingsLabel.textContent = 'Servings: ';
  const servingsInput = document.createElement('input');
  servingsInput.type = 'number'; servingsInput.min = 1; servingsInput.value = recipe.servings || 1; servingsInput.style.width = '5rem';
  servingsLabel.appendChild(servingsInput);
  servingsWrap.appendChild(servingsLabel);

  details.appendChild(servingsWrap);

  // actions
    const actions = document.createElement('div'); actions.className = 'recipe-actions';
    const editBtn = document.createElement('button'); editBtn.className = 'btn'; editBtn.textContent = 'Edit';
    const delBtn = document.createElement('button'); delBtn.className = 'btn ghost'; delBtn.textContent = 'Delete';
    actions.appendChild(editBtn); actions.appendChild(delBtn);
    details.appendChild(actions);

    card.appendChild(details);

    // collapsed by default via CSS class
    card.classList.remove('open');

    header.addEventListener('click', (e) => {
      // Only toggle this card's details; close other cards within the recipesList
      e.stopPropagation();
      const isOpen = card.classList.contains('open');
      console.log('recipe toggle', index, 'willOpen=', !isOpen);
      // close others
      Array.from(recipesList.querySelectorAll('.recipe-card')).forEach(cardEl => {
        if (cardEl !== card) cardEl.classList.remove('open');
      });
      // toggle current
      if (isOpen) card.classList.remove('open'); else card.classList.add('open');
    });

    function formatQty(n) {
      if (n == null || n === '') return '';
      if (Number.isInteger(n)) return String(n);
      return String(Math.round(n * 100) / 100).replace(/\.0+$/, '');
    }

    function updateIngredientDisplay() {
      const baseServ = recipe.servings || 1;
      const curServ = Number(servingsInput.value) || 1;
      Array.from(ul.children).forEach(li => {
        const base = li.dataset.baseQty;
        const unit = li.dataset.unit || '';
        const name = li.dataset.name || '';
        if (base) {
          const scaled = (Number(base) * curServ) / baseServ;
          li.textContent = `${formatQty(scaled)} ${unit} ${name}`.trim();
        } else {
          li.textContent = name;
        }
      });
    }

    // initialize ingredient display
    updateIngredientDisplay();

    servingsInput.addEventListener('input', () => updateIngredientDisplay());

    editBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      openRecipeModal({ ...recipe, index });
    });

    delBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      if (!confirm('Delete this recipe?')) return;
      recipes.splice(index, 1);
      saveRecipes(recipes);
      renderRecipes();
    });

    return card;
  }

  function renderRecipes() {
    recipesList.innerHTML = '';
    if (!recipes.length) {
      recipesList.innerHTML = '<p class="hint">No recipes yet — click "Add Recipe" to create one.</p>';
      return;
    }
    recipes.forEach((r, i) => recipesList.appendChild(createRecipeCard(r, i)));
  }

  // seed a demo recipe if none exist (safe, local only)
  if (!recipes.length) {
    recipes = [
      { name: 'Tomato Pasta', image: '', ingredients: [ {qty:200, unit:'g', name:'pasta'}, {qty:2, unit:'', name:'tomatoes'}, {qty:1, unit:'tbsp', name:'olive oil'} ], procedures: 'Boil pasta. Cook tomatoes. Mix.', servings: 1 }
    ];
    saveRecipes(recipes);
  }

  renderRecipes();

})();

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
//need to see how shopping list is implemented before finishing add to grocery button



