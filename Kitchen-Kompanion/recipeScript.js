
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


//filterbuttons nd stuff
// Filter elements
  const filterRecipesBtn = document.getElementById('filterRecipesBtn');
  const filterRecipesPanel = document.getElementById('filterRecipesPanel');
  const filterByAllergies = document.getElementById('filterByAllergies');
  const filterByPreferences = document.getElementById('filterByPreferences');
  const applyFiltersBtn = document.getElementById('applyFiltersBtn');
  const clearFiltersBtn = document.getElementById('clearFiltersBtn');

  let activeFilters = {
    allergies: false,
    preferences: false
  };

  function loadRecipes() {
    try {
      return JSON.parse(localStorage.getItem(RECIPES_KEY) || '[]');
    } catch (e) { return []; }
  }

  function saveRecipes(recipes) {
    localStorage.setItem(RECIPES_KEY, JSON.stringify(recipes || []));
  }

  let recipes = loadRecipes();
  // store last focused element and key handler for modal
  let _lastFocusedElement = null;
  let _modalKeyHandler = null;
  //newly added starts here
  function getCurrentUser() {
    try {
      return JSON.parse(localStorage.getItem('currentUser'));
    } catch (e) {
      return null;
    }
  }

  // Check recipe for allergens
function checkRecipeForAllergens(recipe) {
    const user = getCurrentUser();
    if (!user || !user.allergies) return { safe: true, foundAllergens: [] };

    const allUserAllergens = [...user.allergies];
    if (user.otherAllergies) {
      allUserAllergens.push(...user.otherAllergies.split(',').map(a => a.trim()).filter(a => a));
    }

    const foundAllergens = [];
    const recipeIngredients = (recipe.ingredients || []).map(ing => 
      (ing.name || '').toLowerCase()
    ).join(' ');

    allUserAllergens.forEach(allergen => {
      // Check for singular and plural forms, case-insensitive
      const allergenLower = allergen.toLowerCase();
      const allergenSingular = allergenLower.replace(/s$/, ''); // Remove trailing 's'
      
      if (recipeIngredients.includes(allergenLower) || 
          recipeIngredients.includes(allergenSingular)) {
        foundAllergens.push(allergen);
      }
    });

    return {
      safe: foundAllergens.length === 0,
      foundAllergens
    };
  }

  // Filter button handlers
  filterRecipesBtn.addEventListener('click', () => {
    const isHidden = filterRecipesPanel.style.display === 'none';
    filterRecipesPanel.style.display = isHidden ? 'block' : 'none';
  });

  applyFiltersBtn.addEventListener('click', () => {
    activeFilters.allergies = filterByAllergies.checked;
    activeFilters.preferences = filterByPreferences.checked;
    renderRecipes();
  });

  clearFiltersBtn.addEventListener('click', () => {
    filterByAllergies.checked = false;
    filterByPreferences.checked = false;
    activeFilters.allergies = false;
    activeFilters.preferences = false;
    renderRecipes();
  });

  //newly added ends here

  function openRecipeModal(prefill) {
    // if a recipe was left open in fullscreen, clear that state
    document.body.classList.remove('fullscreen-active');
    Array.from(document.querySelectorAll('.recipe-card.fullscreen')).forEach(el => {
      el.classList.remove('fullscreen');
      el.classList.remove('open');
      const closeBtn = el.querySelector('.close-fullscreen');
      if (closeBtn) closeBtn.remove();
      const bottomNav = el.querySelector('.recipe-bottom-nav');
      if (bottomNav) bottomNav.remove();
    });
    // remember where focus was
    _lastFocusedElement = document.activeElement;

    // show backdrop/modal
    recipeBackdrop.style.display = 'flex';
    recipeBackdrop.setAttribute('aria-hidden', 'false');

    // populate or reset form
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

    // focus the first input
    const firstInput = recipeForm.querySelector('input[name="name"]') || recipeForm.querySelector('input,textarea,button');
    if (firstInput) firstInput.focus();

    // key handler: Escape to close, Tab to trap focus
    _modalKeyHandler = function (e) {
      if (e.key === 'Escape') {
        e.preventDefault();
        closeRecipeModal();
        return;
      }

      if (e.key === 'Tab') {
        const modal = recipeBackdrop.querySelector('.modal');
        if (!modal) return;
        const focusable = Array.from(modal.querySelectorAll('a[href], button:not([disabled]), textarea, input, select, [tabindex]:not([tabindex="-1"])'))
          .filter(el => el.offsetParent !== null);
        if (!focusable.length) return;
        const first = focusable[0];
        const last = focusable[focusable.length - 1];

        if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        } else if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
        }
      }
    };

    document.addEventListener('keydown', _modalKeyHandler);
  }

  function closeRecipeModal() {
    // hide backdrop/modal
    recipeBackdrop.style.display = 'none';
    recipeBackdrop.setAttribute('aria-hidden', 'true');

    // ensure any fullscreen dim overlay is cleared (e.g., if editing from fullscreen)
    document.body.classList.remove('fullscreen-active');
    Array.from(document.querySelectorAll('.recipe-card.fullscreen')).forEach(el => {
      el.classList.remove('fullscreen');
      el.classList.remove('open');
      const closeBtn = el.querySelector('.close-fullscreen');
      if (closeBtn) closeBtn.remove();
      const bottomNav = el.querySelector('.recipe-bottom-nav');
      if (bottomNav) bottomNav.remove();
    });

    // cleanup form
    recipeForm.reset();
    ingredientsContainer.innerHTML = '';

    // remove key handler and restore focus
    if (_modalKeyHandler) {
      document.removeEventListener('keydown', _modalKeyHandler);
      _modalKeyHandler = null;
    }
    try {
      if (_lastFocusedElement && typeof _lastFocusedElement.focus === 'function') _lastFocusedElement.focus();
    } catch (e) { /* ignore */ }
    _lastFocusedElement = null;
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
        const m = String(ing).trim().match(/^\s*([\d\.\/]+)\s*([^\s\d]+)?\s*(.*)$/); //regex goes crazy
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

  // function createRecipeCard(recipe, index) {
  //   const card = document.createElement('article');
  //   card.className = 'recipe-card';

  //   const header = document.createElement('div');
  //   header.className = 'recipe-header';

  //   const thumb = document.createElement('div');
  //   thumb.className = 'recipe-thumb';
  //   if (recipe.image) {
  //     const img = document.createElement('img'); img.src = recipe.image; img.alt = recipe.name;
  //     thumb.appendChild(img);
  //   } else {
  //     thumb.textContent = recipe.name || '?';
  //   }

  //   const title = document.createElement('div');
  //   title.className = 'recipe-title';
  //   title.innerHTML = `<strong>${escapeHtml(recipe.name || 'Untitled')}</strong>`;

  //   header.appendChild(thumb);
  //   header.appendChild(title);
  //   card.appendChild(header);


  function createRecipeCard(recipe, index, allergenInfo) {
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
    
    // Add allergen warning badge if applicable
    if (!allergenInfo.safe) {
      const warning = document.createElement('span');
      warning.style.cssText = 'background:#ff4444;color:white;padding:2px 8px;border-radius:4px;font-size:0.75rem;margin-left:8px;';
      warning.textContent = '⚠️ Contains Allergens';
      title.appendChild(warning);
    }

    header.appendChild(thumb);
    header.appendChild(title);
    card.appendChild(header);

    const details = document.createElement('div');
    details.className = 'recipe-details';

    // Allergen warning in details
    if (!allergenInfo.safe) {
      const allergenWarning = document.createElement('div');
      allergenWarning.style.cssText = 'background:#fff3cd;border:1px solid #ffc107;padding:0.75rem;border-radius:4px;margin-bottom:1rem;';
      allergenWarning.innerHTML = `<strong style="color:#856404;">⚠️ Warning:</strong> Contains ${allergenInfo.foundAllergens.join(', ')}`;
      details.appendChild(allergenWarning);
    }

    //everything below this comment in this card wasnt changed

    // const details = document.createElement('div');
    // details.className = 'recipe-details';

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
  servingsWrap.className = 'servings-wrap';
  servingsWrap.style.display = 'flex';
  servingsWrap.style.justifyContent = 'space-between';
  servingsWrap.style.alignItems = 'center';
  servingsWrap.style.gap = '0.5rem';
  const servingsLabel = document.createElement('label');
  servingsLabel.textContent = 'Servings: ';
  servingsLabel.style.fontSize = '1.3rem';
  servingsLabel.style.fontWeight = 'bold';
  const servingsInput = document.createElement('input');
  servingsInput.type = 'number'; servingsInput.min = 1; servingsInput.value = recipe.servings || 1; servingsInput.style.width = '5rem';
  servingsLabel.appendChild(servingsInput);
  servingsWrap.appendChild(servingsLabel);

  details.appendChild(servingsWrap);

  // actions
    const actions = document.createElement('div'); actions.className = 'recipe-actions';
  const editBtn = document.createElement('button'); editBtn.className = 'btn primary'; editBtn.textContent = 'Edit';
    const delBtn = document.createElement('button'); delBtn.className = 'btn ghost delete'; delBtn.textContent = 'Delete';
  // append Delete first so it appears on the left, then Edit on the right
  actions.appendChild(delBtn); actions.appendChild(editBtn);
    details.appendChild(actions);

    card.appendChild(details);

    // collapsed by default via CSS class
    card.classList.remove('open');


    // clicking the header opens the recipe in fullscreen "stage" view
    header.addEventListener('click', (e) => {
      e.stopPropagation();
      // close any other fullscreen cards
      Array.from(document.querySelectorAll('.recipe-card.fullscreen')).forEach(el => {
        if (el !== card) {
          el.classList.remove('fullscreen');
          el.classList.remove('open');
          // remove close button if present
          const oldClose = el.querySelector('.close-fullscreen');
          if (oldClose) oldClose.remove();
        }
      });

      // mark body for dimming and put this card into fullscreen mode
      document.body.classList.add('fullscreen-active');
      card.classList.add('fullscreen');
      card.classList.add('open');

      // add close button at top and prev/next navigation at bottom
      if (!card.querySelector('.close-fullscreen')) {
        // Close button at top
        const closeFs = document.createElement('button');
        closeFs.type = 'button';
        closeFs.className = 'close-fullscreen btn ghost';
        closeFs.setAttribute('aria-label', 'Close recipe');
        closeFs.textContent = 'Close';
        closeFs.addEventListener('click', (ev) => {
          ev.stopPropagation();
          card.classList.remove('fullscreen');
          card.classList.remove('open');
          document.body.classList.remove('fullscreen-active');
          // remove close button and bottom nav
          closeFs.remove();
          const bottomNav = card.querySelector('.recipe-bottom-nav');
          if (bottomNav) bottomNav.remove();
          // restore focus
          try {
            const addBtn = document.getElementById('addRecipeBtn');
            if (addBtn) addBtn.focus();
          } catch (e) { /* ignore */ }
        });
        
        // place close button at top
        card.insertBefore(closeFs, header);
        closeFs.focus();
        
        // Bottom navigation for prev/next
        const bottomNav = document.createElement('div');
        bottomNav.className = 'recipe-bottom-nav';
        
        // Previous button
        const prevBtn = document.createElement('button');
        prevBtn.type = 'button';
        prevBtn.className = 'nav-prev btn ghost';
        prevBtn.textContent = '← Previous';
        prevBtn.disabled = index === 0;
        prevBtn.addEventListener('click', (ev) => {
          ev.stopPropagation();
          if (index > 0) {
            // Close current and open previous
            card.classList.remove('fullscreen', 'open');
            closeFs.remove();
            bottomNav.remove();
            const allCards = Array.from(document.querySelectorAll('.recipe-card'));
            const prevCard = allCards[index - 1];
            if (prevCard) {
              prevCard.querySelector('.recipe-header').click();
            }
          }
        });
        
        // Next button
        const nextBtn = document.createElement('button');
        nextBtn.type = 'button';
        nextBtn.className = 'nav-next btn ghost';
        nextBtn.textContent = 'Next →';
        const allCards = Array.from(document.querySelectorAll('.recipe-card'));
        nextBtn.disabled = index >= allCards.length - 1;
        nextBtn.addEventListener('click', (ev) => {
          ev.stopPropagation();
          if (index < allCards.length - 1) {
            // Close current and open next
            card.classList.remove('fullscreen', 'open');
            closeFs.remove();
            bottomNav.remove();
            const nextCard = allCards[index + 1];
            if (nextCard) {
              nextCard.querySelector('.recipe-header').click();
            }
          }
        });
        
        bottomNav.appendChild(prevBtn);
        bottomNav.appendChild(nextBtn);
        
        // append bottom navigation after all content
        card.appendChild(bottomNav);
      }
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
      // inline confirmation UI
      const confirmWrap = document.createElement('div');
      confirmWrap.className = 'confirm-delete';
      confirmWrap.style.cssText = 'margin-top:0.5rem;padding:0.5rem;border:1px solid rgba(0,0,0,0.12);border-radius:6px;background:#fff;display:flex;align-items:center;justify-content:space-between;gap:0.5rem;';
      const txt = document.createElement('span');
      txt.textContent = 'Click "Delete" to permanently delete this recipe?';
      const btns = document.createElement('div');
      btns.style.display = 'flex';
      btns.style.gap = '0.5rem';
      const cancelBtn = document.createElement('button');
      cancelBtn.type = 'button';
      cancelBtn.className = 'btn ghost small';
      cancelBtn.textContent = 'Cancel';
      const confirmBtn = document.createElement('button');
      confirmBtn.type = 'button';
      confirmBtn.className = 'btn danger small';
      confirmBtn.textContent = 'Delete';
      btns.appendChild(cancelBtn);
      btns.appendChild(confirmBtn);
      confirmWrap.appendChild(txt);
      confirmWrap.appendChild(btns);

      // hide default actions while confirming
      actions.style.display = 'none';
      details.appendChild(confirmWrap);

      cancelBtn.addEventListener('click', (ev) => {
        ev.stopPropagation();
        confirmWrap.remove();
        actions.style.display = '';
      });

      confirmBtn.addEventListener('click', (ev) => {
        ev.stopPropagation();
        // ensure any fullscreen overlay is cleared so the page stays interactive
        document.body.classList.remove('fullscreen-active');
        Array.from(document.querySelectorAll('.recipe-card.fullscreen')).forEach(el => {
          el.classList.remove('fullscreen');
          el.classList.remove('open');
          const closeBtn = el.querySelector('.close-fullscreen');
          if (closeBtn) closeBtn.remove();
          const bottomNav = el.querySelector('.recipe-bottom-nav');
          if (bottomNav) bottomNav.remove();
        });

        recipes.splice(index, 1);
        saveRecipes(recipes);
        renderRecipes();
      });
    });

    return card;
  }

  // function renderRecipes() {
  //   recipesList.innerHTML = '';
  //   if (!recipes.length) {
  //     recipesList.innerHTML = '<p class="hint">No recipes yet — click "Add Recipe" to create one.</p>';
  //     return;
  //   }
  //   recipes.forEach((r, i) => recipesList.appendChild(createRecipeCard(r, i)));
  // }
  function renderRecipes() {
    recipesList.innerHTML = '';
    
    if (!recipes.length) {
      recipesList.innerHTML = '<p class="hint">No recipes yet — click "Add Recipe" to create one.</p>';
      return;
    }

    const safeRecipes = [];
    const unsafeRecipes = [];

    recipes.forEach((r, i) => {
      const allergenInfo = checkRecipeForAllergens(r);
      const recipeData = { recipe: r, index: i, allergenInfo };
      
      if (allergenInfo.safe) {
        safeRecipes.push(recipeData);
      } else {
        unsafeRecipes.push(recipeData);
      }
    });

    // Apply filters
    let recipesToShow = [...safeRecipes, ...unsafeRecipes];
    
    if (activeFilters.allergies) {
      recipesToShow = safeRecipes; // Only show safe recipes
    }

    if (recipesToShow.length === 0) {
      recipesList.innerHTML = '<p class="hint">No recipes match your filters.</p>';
      return;
    }

    // Render safe recipes first
    const safeToShow = recipesToShow.filter(r => r.allergenInfo.safe);
    const unsafeToShow = recipesToShow.filter(r => !r.allergenInfo.safe);

    safeToShow.forEach(({ recipe, index, allergenInfo }) => {
      recipesList.appendChild(createRecipeCard(recipe, index, allergenInfo));
    });

    
// Seperator for unsafe recipes
    if (unsafeToShow.length > 0 && !activeFilters.allergies) {
      const separator = document.createElement('div');
      separator.style.cssText = 'grid-column: 1 / -1; margin:2rem 0 1rem; padding:1rem; background:#fff3cd; border-left:4px solid #ff4444; border-radius:8px;';
      separator.innerHTML = `
        <div style="display:flex;align-items:center;justify-content:center;gap:0.5rem;">
          <span style="font-size:1.5rem;">⚠️</span>
          <h3 style="color:#856404;font-size:1.3rem;margin:0;font-weight:600;">
            Recipes Containing Allergens
          </h3>
          <span style="font-size:1.5rem;">⚠️</span>
        </div>
      `;
      recipesList.appendChild(separator);

      unsafeToShow.forEach(({ recipe, index, allergenInfo }) => {
        recipesList.appendChild(createRecipeCard(recipe, index, allergenInfo));
      });
    }
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
// =======================
// SMART SHOPPING FROM RECIPES
// =======================


function loadRecipes() {
  try {
    return JSON.parse(localStorage.getItem('kk_recipes') || '[]');
  } catch (e) {
    return [];
  }
}

function loadInventory() {
  try {
    return JSON.parse(localStorage.getItem('kk_inventory') || '[]');
  } catch (e) {
    return [];
  }
}

let selectedRecipeIndices = new Set();

function renderRecipeSelection() {
  const container = document.getElementById('recipeSelectionContainer');
  if (!container) return;

  const recipes = loadRecipes();

  if (recipes.length === 0) {
    container.innerHTML = '<p style="color:#94a3b8;font-size:1.3rem;text-align:center;padding:1rem;">No recipes found. Add recipes first.</p>';
    return;
  }

  container.innerHTML = '';

  recipes.forEach((recipe, index) => {
    const label = document.createElement('label');
    label.style.cssText = 'display:flex;align-items:center;gap:0.5rem;padding:0.5rem;cursor:pointer;font-size:1.4rem;';
    
    const checkbox = document.createElement('input');
    checkbox.type = 'checkbox';
    checkbox.style.cssText = 'width:20px;height:20px;cursor:pointer;';
    checkbox.checked = selectedRecipeIndices.has(index);
    
    checkbox.addEventListener('change', () => {
      if (checkbox.checked) {
        selectedRecipeIndices.add(index);
      } else {
        selectedRecipeIndices.delete(index);
      }
    });

    const nameSpan = document.createElement('span');
    nameSpan.textContent = recipe.name || 'Untitled Recipe';

    label.appendChild(checkbox);
    label.appendChild(nameSpan);
    container.appendChild(label);
  });
}

function generateSmartShoppingList() {
  if (selectedRecipeIndices.size === 0) {
    alert('Please select at least one recipe first');
    return;
  }

  const recipes = loadRecipes();
  const inventory = loadInventory();
  const selectedRecipes = Array.from(selectedRecipeIndices).map(i => recipes[i]);

  // Collect all ingredients from selected recipes
  const neededIngredients = {};

  selectedRecipes.forEach(recipe => {
    (recipe.ingredients || []).forEach(ing => {
      const name = (ing.name || '').toLowerCase().trim();
      if (!name) return;

      if (!neededIngredients[name]) {
        neededIngredients[name] = {
          name: ing.name,
          quantity: 0,
          unit: ing.unit || '',
          recipes: []
        };
      }

      const qty = typeof ing.qty === 'number' ? ing.qty : (parseFloat(ing.qty) || 0);
      neededIngredients[name].quantity += qty;
      neededIngredients[name].recipes.push(recipe.name);
    });
  });

  // Check what's already in inventory
  const inventoryMap = {};
  inventory.forEach(item => {
    const name = (item.name || '').toLowerCase().trim();
    inventoryMap[name] = item.amount || 0;
  });

  // Determine what needs to be bought
  const shoppingList = [];

  Object.values(neededIngredients).forEach(ing => {
    const nameKey = ing.name.toLowerCase();
    const inStock = inventoryMap[nameKey] || 0;
    const needed = ing.quantity;

    if (inStock < needed) {
      const toBuy = needed - inStock;
      shoppingList.push({
        name: ing.name,
        quantity: `${Math.ceil(toBuy)} ${ing.unit}`.trim(),
        category: 'From Recipes',
        requestedBy: `For: ${ing.recipes.slice(0, 2).join(', ')}${ing.recipes.length > 2 ? '...' : ''}`,
        purchased: false
      });
    }
  });

  if (shoppingList.length === 0) {
  closeSmartShoppingModal();
  // Redirect to shopping page even if nothing to add
  window.location.href = 'shopping.html';
  return;
}

// Save to localStorage for shopping page to pick up
localStorage.setItem('smart_shopping_items', JSON.stringify(shoppingList));

// Close modal and redirect to shopping page
closeSmartShoppingModal();
selectedRecipeIndices.clear();
window.location.href = 'shopping.html';
}

// Modal controls
const smartShoppingBtn = document.getElementById('smartShoppingBtn');
const smartShoppingBackdrop = document.getElementById('smartShoppingBackdrop');
const cancelSmartShoppingBtn = document.getElementById('cancelSmartShoppingBtn');
const generateSmartListBtn = document.getElementById('generateSmartListBtn');

function openSmartShoppingModal() {
  smartShoppingBackdrop.style.display = 'flex';
  smartShoppingBackdrop.setAttribute('aria-hidden', 'false');
  renderRecipeSelection();
}

function closeSmartShoppingModal() {
  smartShoppingBackdrop.style.display = 'none';
  smartShoppingBackdrop.setAttribute('aria-hidden', 'true');
  selectedRecipeIndices.clear();
}

if (smartShoppingBtn) {
  smartShoppingBtn.addEventListener('click', openSmartShoppingModal);
}

if (cancelSmartShoppingBtn) {
  cancelSmartShoppingBtn.addEventListener('click', closeSmartShoppingModal);
}

if (generateSmartListBtn) {
  generateSmartListBtn.addEventListener('click', generateSmartShoppingList);
}

if (smartShoppingBackdrop) {
  smartShoppingBackdrop.addEventListener('click', (e) => {
    if (e.target === smartShoppingBackdrop) {
      closeSmartShoppingModal();
    }
  });
}