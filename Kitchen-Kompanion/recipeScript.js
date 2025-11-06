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