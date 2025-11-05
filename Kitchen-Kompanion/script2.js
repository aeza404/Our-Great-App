let lastFocused = null;

// small utility used when injecting values into HTML attributes
function escapeHtml(s) {
  return String(s).replace(/[&<>\"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
}

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
  let activeCategory = null; // when set, only show recipes from this category
    let _confirmElems = null;
    function ensureConfirmModal() {
      if (_confirmElems) return _confirmElems;
    const backdrop = document.createElement('div');
    backdrop.className = 'modal-backdrop';
    backdrop.style.display = 'none';
    backdrop.setAttribute('aria-hidden', 'true');
    // make sure confirm modal sits above fullscreen recipe cards (which use z-index:300)
    backdrop.style.zIndex = '1000';

      const modal = document.createElement('div');
      modal.className = 'modal';
      modal.setAttribute('role', 'dialog');
      modal.setAttribute('aria-modal', 'true');
      modal.innerHTML = `
        <h2 class="kk-confirm-title"></h2>
        <div class="kk-confirm-message" style="margin:0.5rem 0 1rem 0;"></div>
        <div style="display:flex;justify-content:flex-end;gap:0.5rem">
          <button class="kk-confirm-cancel btn ghost">Cancel</button>
          <button class="kk-confirm-ok btn">OK</button>
        </div>
      `;

      backdrop.appendChild(modal);
      document.body.appendChild(backdrop);

      _confirmElems = {
        backdrop, modal,
        title: modal.querySelector('.kk-confirm-title'),
        message: modal.querySelector('.kk-confirm-message'),
        ok: modal.querySelector('.kk-confirm-ok'),
        cancel: modal.querySelector('.kk-confirm-cancel'),
      };

      return _confirmElems;
    }

    function showConfirm(opts) {
      const e = ensureConfirmModal();
      e.title.textContent = opts.title || '';
      e.message.textContent = opts.message || '';
      e.ok.textContent = opts.confirmText || 'OK';
      e.cancel.textContent = opts.cancelText || 'Cancel';

      function cleanup() {
        e.ok.removeEventListener('click', onOk);
        e.cancel.removeEventListener('click', onCancel);
        document.removeEventListener('keydown', onKey);
        e.backdrop.removeEventListener('click', onBackdropClick);
      }

      function hideConfirm() {
        e.backdrop.style.display = 'none';
        e.backdrop.setAttribute('aria-hidden', 'true');
        cleanup();
      }

      function onOk(ev) {
        ev.preventDefault();
        hideConfirm();
        try { if (typeof opts.onConfirm === 'function') opts.onConfirm(); } catch (err) { console.error(err); }
      }
    function onCancel(ev) { ev.preventDefault(); hideConfirm(); if (typeof opts.onCancel === 'function') opts.onCancel(); }
    function onKey(ev) { if (ev.key === 'Escape') { onCancel(ev); } }
    function onBackdropClick(ev) { if (ev.target === e.backdrop) onCancel(ev); }

      e.ok.addEventListener('click', onOk);
      e.cancel.addEventListener('click', onCancel);
      e.backdrop.addEventListener('click', onBackdropClick);
      document.addEventListener('keydown', onKey);

      e.backdrop.style.display = 'flex';
      e.backdrop.setAttribute('aria-hidden', 'false');
      e.ok.focus();
    }

  function openRecipeModal(prefill) {
    // if any card is fullscreen, exit it so the modal can appear above
    const fs = document.querySelector('.recipe-card.fullscreen');
    if (fs) exitFullscreen(fs);
    // ensure backdrop sits above fullscreen content
    recipeBackdrop.style.zIndex = '1200';
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
    // restore default stacking so it doesn't unintentionally sit above other UI
    recipeBackdrop.style.zIndex = '';
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
  const category = form.category ? form.category.value.trim() : '';
    const servings = Number(form.servings.value) || 1;

    const ingredients = Array.from(ingredientsContainer.querySelectorAll('div.form-row')).map(row => {
      const qv = row.querySelector('input[name="ingredient_qty"]').value.trim();
      const uv = row.querySelector('input[name="ingredient_unit"]').value.trim();
      const nv = row.querySelector('input[name="ingredient_name"]').value.trim();
      return { qty: qv === '' ? '' : Number(qv), unit: uv, name: nv };
    }).filter(it => it.name);

  const recipeObj = { name, image, procedures, ingredients, servings, category };

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

    // Show category tag at top of details only if category is set
    const cat = recipe.category ? recipe.category.trim() : '';
    if (cat) {
        const catTag = document.createElement('div');
        catTag.className = 'recipe-category-tag';
        catTag.innerHTML = `<span>${escapeHtml(cat)}</span>`;
        details.appendChild(catTag);
    }

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
      if (isOpen) {
        card.classList.remove('open');
      } else {
        card.classList.add('open');
      }
      // If user clicks the header while open, also enter fullscreen to take over the stage
      if (card.classList.contains('open')) {
        enterFullscreen(card);
      }
    });

    // add a close control (hidden until fullscreen)
    const closeBtn = document.createElement('button');
    closeBtn.className = 'close-fullscreen';
    closeBtn.type = 'button';
    closeBtn.title = 'Close fullscreen';
    closeBtn.textContent = 'Close';
    closeBtn.style.display = 'none';
    card.appendChild(closeBtn);
    closeBtn.addEventListener('click', (ev) => { ev.stopPropagation(); exitFullscreen(card); });

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
      // show an on-screen confirmation modal (non-blocking)
      showConfirm({
        title: 'Delete recipe',
        message: `Delete "${escapeHtml(recipe.name || 'this recipe')}"? This cannot be undone.`,
        confirmText: 'Delete',
        cancelText: 'Cancel',
          onConfirm() {
            // if this card is currently fullscreen, exit fullscreen first to clear body state
            const fs = document.querySelector('.recipe-card.fullscreen');
            if (fs) exitFullscreen(fs);
            recipes.splice(index, 1);
            saveRecipes(recipes);
            renderRecipes();
          }
      });
    });

    return card;
  }

  function getAllCategories() {
    const set = new Set();
    recipes.forEach((r, i) => {
      if (i === 0) return; // skip featured for collection of category buttons (but could include)
      const c = (r.category || 'Uncategorized').trim() || 'Uncategorized';
      set.add(c);
    });
    return Array.from(set).sort();
  }

  function renderCategoryBar(container) {
    // container is the recipesList parent (we'll insert at top)
    let bar = document.getElementById('categoryBar');
    if (!bar) {
      bar = document.createElement('div');
      bar.id = 'categoryBar';
      bar.style.display = 'flex';
      bar.style.flexWrap = 'wrap';
      bar.style.gap = '0.5rem';
      bar.style.marginTop = '0.6rem';
      container.parentNode.insertBefore(bar, container);
    }
    bar.innerHTML = '';
    const cats = getAllCategories();
    // Add 'All' control
    const allBtn = document.createElement('button');
    allBtn.className = 'cat-box' + (activeCategory === null ? ' active' : '');
    allBtn.textContent = 'All';
    allBtn.addEventListener('click', () => { activeCategory = null; renderRecipes(); });
    bar.appendChild(allBtn);

    cats.forEach(c => {
      const b = document.createElement('button');
      b.className = 'cat-box' + (activeCategory === c ? ' active' : '');
      b.textContent = c;
      b.addEventListener('click', () => { activeCategory = c; renderRecipes(); });
      bar.appendChild(b);
    });
  }

  function enterFullscreen(card) {
    // close any other fullscreen cards
    Array.from(document.querySelectorAll('.recipe-card.fullscreen')).forEach(c => {
      if (c !== card) exitFullscreen(c);
    });
    card.classList.add('fullscreen');
    document.body.classList.add('fullscreen-active');
    // show close control
    const b = card.querySelector('.close-fullscreen'); if (b) b.style.display = 'block';
    // trap focus minimally by focusing the close button
    const cb = card.querySelector('.close-fullscreen'); if (cb) { cb.focus(); lastFocused = document.activeElement; }
  }

  function exitFullscreen(card) {
    if (!card) return;
    card.classList.remove('fullscreen');
    document.body.classList.remove('fullscreen-active');
    const b = card.querySelector('.close-fullscreen'); if (b) b.style.display = 'none';
    // restore focus
    if (lastFocused) try { lastFocused.focus(); } catch (e) {}
  }

  // ESC to close fullscreen
  document.addEventListener('keydown', (ev) => {
    if (ev.key === 'Escape') {
      const fs = document.querySelector('.recipe-card.fullscreen');
      if (fs) exitFullscreen(fs);
    }
  });

  function renderRecipes() {
    // clear any leftover fullscreen state to avoid UI being blocked
    document.body.classList.remove('fullscreen-active');
    Array.from(document.querySelectorAll('.recipe-card.fullscreen')).forEach(c => c.classList.remove('fullscreen'));
    recipesList.innerHTML = '';
    if (!recipes.length) {
      recipesList.innerHTML = '<p class="hint">No recipes yet — click "Add Recipe" to create one.</p>';
      return;
    }
    // render category bar (tabs) at the top
    renderCategoryBar(recipesList);

    // if a category filter is active, show only recipes in that category
    if (activeCategory) {
      const filtered = recipes.map((r, i) => ({ r, i })).filter(e => {
        const cat = (e.r.category || 'Uncategorized').trim() || 'Uncategorized';
        return cat === activeCategory;
      });
      if (!filtered.length) {
        recipesList.innerHTML = '<p class="hint">No recipes in this category.</p>';
        return;
      }
      filtered.forEach(entry => {
        const card = createRecipeCard(entry.r, entry.i);
        recipesList.appendChild(card);
      });
      return;
    }

    // ALL view: show all recipes in a single list (no featured separation)
    recipes.forEach((r, i) => {
      const card = createRecipeCard(r, i);
      recipesList.appendChild(card);
    });
    // Ensure only the first recipe is open (main) and the rest are closed
    const allCards = Array.from(recipesList.querySelectorAll('.recipe-card'));
    allCards.forEach((c, idx) => {
      if (idx === 0) {
        c.classList.add('open', 'featured');
      } else {
        c.classList.remove('open', 'featured');
      }
    });
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