const builtInTemplates = [
    {
      id: "weekly-staples",
      name: "Weekly Staples",
      type: "built-in",
      items: [
        { name: "Milk", quantity: "1 gallon", category: "Dairy" },
        { name: "Bread", quantity: "1 loaf", category: "Bakery" },
        { name: "Eggs", quantity: "1 dozen", category: "Dairy" },
        { name: "Bananas", quantity: "6", category: "Produce" }
      ]
    },
    {
      id: "holiday-baking",
      name: "Holiday Baking",
      type: "built-in",
      items: [
        { name: "Flour", quantity: "5 lb bag", category: "Pantry" },
        { name: "Sugar", quantity: "4 lb bag", category: "Pantry" },
        { name: "Butter", quantity: "2 sticks", category: "Dairy" },
        { name: "Chocolate chips", quantity: "2 bags", category: "Snacks" }
      ]
    },
    {
      id: "vegetarian-meals",
      name: "Vegetarian Meals",
      type: "built-in",
      items: [
        { name: "Chickpeas", quantity: "4 cans", category: "Pantry" },
        { name: "Spinach", quantity: "1 large bag", category: "Produce" },
        { name: "Tofu", quantity: "2 blocks", category: "Meat & Seafood" },
        { name: "Brown rice", quantity: "2 lb bag", category: "Pantry" }
      ]
    }
  ];
  
  const STORAGE_KEY_TEMPLATES = "smart-grocery-user-templates-v1";
  
  let state = {
    items: [],
    listName: "This Week’s Groceries",
    sortMode: "none"
  };
  
  let userTemplates = loadUserTemplates();
  
  // fake data
  function loadUserTemplates() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY_TEMPLATES);
      if (!raw) return [];
      const parsed = JSON.parse(raw);
      if (!Array.isArray(parsed)) return [];
      return parsed;
    } catch (e) {
      return [];
    }
  }
  
  function saveUserTemplates() {
    try {
      localStorage.setItem(STORAGE_KEY_TEMPLATES, JSON.stringify(userTemplates));
    } catch (e) {
    }
  }
  
  // helper functions
  
  function generateId() {
    return "item-" + Math.random().toString(36).slice(2, 9);
  }
  
  function showToast(message) {
    const toast = document.getElementById("toast");
    const msgEl = document.getElementById("toastMessage");
    if (!toast || !msgEl) return;
    msgEl.textContent = message;
    toast.classList.add("show");
    clearTimeout(showToast._timeout);
    showToast._timeout = setTimeout(() => {
      toast.classList.remove("show");
    }, 2200);
  }
  
  function openModal(backdropId) {
    const backdrop = document.getElementById(backdropId);
    if (backdrop) {
      backdrop.style.display = "flex";
    }
  }
  
  function closeModal(backdropId) {
    const backdrop = document.getElementById(backdropId);
    if (backdrop) {
      backdrop.style.display = "none";
    }
  }
  
  // rendering
  
  function render() {
    const { items, sortMode, listName } = state;
    const toBuyListEl = document.getElementById("toBuyList");
    const purchasedListEl = document.getElementById("purchasedList");
    if (!toBuyListEl || !purchasedListEl) return;
  
    toBuyListEl.innerHTML = "";
    purchasedListEl.innerHTML = "";
  
    let toBuyItems = items.filter((i) => !i.purchased);
    let purchasedItems = items.filter((i) => i.purchased);
  
    if (sortMode === "category") {
      const byCategory = (a, b) =>
        (a.category || "").localeCompare(b.category || "") || a.name.localeCompare(b.name);
      toBuyItems = [...toBuyItems].sort(byCategory);
    } else if (sortMode === "requestedBy") {
      const byReq = (a, b) =>
        (a.requestedBy || "").localeCompare(b.requestedBy || "") || a.name.localeCompare(b.name);
      toBuyItems = [...toBuyItems].sort(byReq);
    }
  
    toBuyItems.forEach((item) => {
      toBuyListEl.appendChild(createItemRow(item));
    });
  
    purchasedItems.forEach((item) => {
      purchasedListEl.appendChild(createItemRow(item, true));
    });
  
    const toBuyCountEl = document.getElementById("toBuyCount");
    const purchasedCountEl = document.getElementById("purchasedCount");
  
    if (toBuyCountEl) {
      toBuyCountEl.textContent = toBuyItems.length + (toBuyItems.length === 1 ? " item" : " items");
    }
    if (purchasedCountEl) {
      purchasedCountEl.textContent =
        purchasedItems.length + (purchasedItems.length === 1 ? " item" : " items");
    }
  
    const listNameEl = document.getElementById("currentListName");
    if (listNameEl) listNameEl.textContent = listName;
  
    const toBuyEmptyEl = document.getElementById("toBuyEmpty");
    const purchasedEmptyEl = document.getElementById("purchasedEmpty");
    if (toBuyEmptyEl) toBuyEmptyEl.style.display = toBuyItems.length === 0 ? "block" : "none";
    if (purchasedEmptyEl) purchasedEmptyEl.style.display =
      purchasedItems.length === 0 ? "block" : "none";
  
    const sortLabel = document.getElementById("sortLabel");
    if (sortLabel) {
      if (sortMode === "none") sortLabel.textContent = "None";
      else if (sortMode === "category") sortLabel.textContent = "Category";
      else if (sortMode === "requestedBy") sortLabel.textContent = "Requested By";
    }
  }
  
  function createItemRow(item) {
    const li = document.createElement("li");
    li.className = "item-row" + (item.purchased ? " purchased" : "");
    li.dataset.id = item.id;
  
    const checkboxContainer = document.createElement("div");
    checkboxContainer.className = "item-checkbox";
  
    const checkbox = document.createElement("input");
    checkbox.type = "checkbox";
    checkbox.checked = item.purchased;
    checkbox.addEventListener("change", () => {
      toggleItemPurchased(item.id, checkbox.checked);
    });
  
    checkboxContainer.appendChild(checkbox);
  
    const main = document.createElement("div");
    main.className = "item-main";
  
    const nameLine = document.createElement("div");
    nameLine.className = "item-name-line";
  
    const name = document.createElement("span");
    name.className = "item-name";
    name.textContent = item.name;
  
    nameLine.appendChild(name);
  
    if (item.category) {
      const catBadge = document.createElement("span");
      catBadge.className = "badge green";
      catBadge.textContent = item.category;
      nameLine.appendChild(catBadge);
    }
  
    main.appendChild(nameLine);
  
    const meta = document.createElement("div");
    meta.className = "item-meta";
  
    if (item.quantity) {
      const qtySpan = document.createElement("span");
      qtySpan.textContent = "Qty: " + item.quantity;
      meta.appendChild(qtySpan);
    }
  
    if (item.requestedBy) {
      const reqSpan = document.createElement("span");
      reqSpan.textContent = "Requested by " + item.requestedBy;
      meta.appendChild(reqSpan);
    }
  
    if (meta.childNodes.length > 0) {
      main.appendChild(meta);
    }
  
    const actions = document.createElement("div");
    actions.className = "item-actions";
  
    const editBtn = document.createElement("button");
    editBtn.type = "button";
    editBtn.className = "icon-btn";
    editBtn.title = "Edit item";
    editBtn.innerHTML = '<span class="icon">✏️</span>';
    editBtn.addEventListener("click", () => {
      openEditItemModal(item.id);
    });
  
    const deleteBtn = document.createElement("button");
    deleteBtn.type = "button";
    deleteBtn.className = "icon-btn";
    deleteBtn.title = "Delete item";
    deleteBtn.innerHTML = '<span class="icon">🗑</span>';
    deleteBtn.addEventListener("click", () => {
      deleteItem(item.id);
    });
  
    actions.appendChild(editBtn);
    actions.appendChild(deleteBtn);
  
    li.appendChild(checkboxContainer);
    li.appendChild(main);
    li.appendChild(actions);
  
    return li;
  }

  // items operations
  function addItem(data) {
    state.items.unshift({
      id: generateId(),
      name: data.name.trim(),
      quantity: (data.quantity || "").trim(),
      category: (data.category || "").trim(),
      requestedBy: (data.requestedBy || "").trim(),
      purchased: false,
    });
    render();
  }
  
  function updateItem(id, updates) {
    const idx = state.items.findIndex((i) => i.id === id);
    if (idx === -1) return;
    state.items[idx] = {
      ...state.items[idx],
      ...updates
    };
    render();
  }
  
  function deleteItem(id) {
    const item = state.items.find((i) => i.id === id);
    state.items = state.items.filter((i) => i.id !== id);
    render();
    showToast(`${item ? item.name : "Item"} removed`);
  }
  
  function toggleItemPurchased(id, purchased) {
    const item = state.items.find((i) => i.id === id);
    if (!item) return;
    item.purchased = purchased;
    render();
  }
  
  // template things
  
  function applyTemplate(template) {
    const baseName = template.name;
    state.listName = baseName + " – Active List";
    state.items = (template.items || []).map((t) => ({
      id: generateId(),
      name: t.name,
      quantity: t.quantity || "",
      category: t.category || "",
      requestedBy: t.requestedBy || "",
      purchased: false,
    }));
    state.sortMode = "none";
    render();
  }
  
  function openTemplateModal() {
    const grid = document.getElementById("templateGrid");
    if (!grid) return;
  
    grid.innerHTML = "";
  
    const allTemplates = [...builtInTemplates, ...userTemplates];
    if (allTemplates.length === 0) {
      const p = document.createElement("p");
      p.textContent = "No templates available yet. Save this list as a template once you’ve set it up.";
      p.style.fontSize = "0.82rem";
      p.style.color = "#64748b";
      grid.appendChild(p);
    } else {
      allTemplates.forEach((tmpl) => {
        const card = document.createElement("div");
        card.className = "template-card";
        card.addEventListener("click", () => {
          applyTemplate(tmpl);
          closeModal("templateModalBackdrop");
          showToast("New list created from template");
        });
  
        const titleRow = document.createElement("h4");
        titleRow.textContent = tmpl.name;
  
        const tag = document.createElement("span");
        tag.className = "tag";
        tag.textContent = tmpl.type === "built-in" ? "Starter" : "Saved favorite";
        titleRow.appendChild(tag);
  
        card.appendChild(titleRow);
  
        if (tmpl.items && tmpl.items.length) {
          const ul = document.createElement("ul");
          tmpl.items.slice(0, 4).forEach((it) => {
            const li = document.createElement("li");
            li.textContent = it.name + (it.quantity ? ` – ${it.quantity}` : "");
            ul.appendChild(li);
          });
          if (tmpl.items.length > 4) {
            const liMore = document.createElement("li");
            liMore.textContent = `+ ${tmpl.items.length - 4} more…`;
            ul.appendChild(liMore);
          }
          card.appendChild(ul);
        }
  
        if (tmpl.type === "user") {
          const small = document.createElement("small");
          small.textContent = "Your saved template";
          card.appendChild(small);
        }
  
        grid.appendChild(card);
      });
    }
  
    openModal("templateModalBackdrop");
  }

  function saveCurrentListAsTemplate() {
    if (!state.items.length) {
      showToast("Your list is empty—add items before saving a template.");
      return;
    }
  
    const total = state.items.length;
    const unchecked = state.items.filter((i) => !i.purchased).length;
    const purchased = total - unchecked;
  
    const infoEl = document.getElementById("templateSaveInfo");
    if (infoEl) {
      infoEl.textContent =
        `${total} item${total === 1 ? "" : "s"} total · ` +
        `${unchecked} not purchased · ${purchased} purchased. ` +
        "All items will be saved into this template.";
    }
  
    // suggested name based on current list name
    const suggestedName = state.listName.replace("– Active List", "").trim() || "My Grocery Template";
    const nameInput = document.getElementById("templateNameInput");
    if (nameInput) {
      nameInput.value = suggestedName;
    }
  
    openModal("templateSaveModalBackdrop");
  }

  function handleTemplateSaveFormSubmit(e) {
    e.preventDefault();
  
    const nameInput = document.getElementById("templateNameInput");
    if (!nameInput) return;
  
    const name = nameInput.value.trim();
    if (!name) {
      showToast("Please enter a template name.");
      return;
    }
  
    const tmpl = {
      id: "user-" + Date.now().toString(36),
      name,
      type: "user",
      items: state.items.map((i) => ({
        name: i.name,
        quantity: i.quantity,
        category: i.category,
        requestedBy: i.requestedBy
      }))
    };
  
    userTemplates.unshift(tmpl);
    saveUserTemplates();
    render();
    closeModal("templateSaveModalBackdrop");
    showToast("Template saved for later ✨");
  }

  // modal helper
  
  function openAddItemModal() {
    const titleEl = document.getElementById("itemModalTitle");
    if (titleEl) titleEl.textContent = "Add Item";
    document.getElementById("itemId").value = "";
    document.getElementById("itemNameInput").value = "";
    document.getElementById("itemQtyInput").value = "";
    document.getElementById("itemCategoryInput").value = "";
    document.getElementById("itemRequestedByInput").value = "";
  
    openModal("itemModalBackdrop");
    setTimeout(() => {
      const nameInput = document.getElementById("itemNameInput");
      if (nameInput) nameInput.focus();
    }, 50);
  }
  
  function openEditItemModal(id) {
    const item = state.items.find((i) => i.id === id);
    if (!item) return;
    const titleEl = document.getElementById("itemModalTitle");
    if (titleEl) titleEl.textContent = "Edit Item";
    document.getElementById("itemId").value = item.id;
    document.getElementById("itemNameInput").value = item.name;
    document.getElementById("itemQtyInput").value = item.quantity || "";
    document.getElementById("itemCategoryInput").value = item.category || "";
    document.getElementById("itemRequestedByInput").value = item.requestedBy || "";
    openModal("itemModalBackdrop");
    setTimeout(() => {
      const nameInput = document.getElementById("itemNameInput");
      if (nameInput) nameInput.focus();
    }, 50);
  }
  
  function handleItemFormSubmit(e) {
    e.preventDefault();
    const id = document.getElementById("itemId").value;
    const name = document.getElementById("itemNameInput").value.trim();
    const quantity = document.getElementById("itemQtyInput").value;
    const category = document.getElementById("itemCategoryInput").value;
    const requestedBy = document.getElementById("itemRequestedByInput").value;
  
    if (!name) {
      showToast("Please enter an item name.");
      return;
    }
  
    if (id) {
      updateItem(id, { name, quantity, category, requestedBy });
      showToast("Item updated");
    } else {
      addItem({ name, quantity, category, requestedBy, fromInventory: false });
      showToast("Item added to list");
    }
  
    closeModal("itemModalBackdrop");
  }
  
  // sort by functionality
  
  function handleSortMenuClick(e) {
    const btn = e.target.closest("button[data-sort]");
    if (!btn) return;
    const mode = btn.dataset.sort;
    state.sortMode = mode;
    render();
    hideSortMenu();
  }
  
  function toggleSortMenu() {
    const menu = document.getElementById("sortMenu");
    if (!menu) return;
    const isHidden = menu.classList.contains("hidden");
    if (isHidden) menu.classList.remove("hidden");
    else menu.classList.add("hidden");
  }
  
  function hideSortMenu() {
    const menu = document.getElementById("sortMenu");
    if (!menu) return;
    menu.classList.add("hidden");
  }
  
  // on open default data
  
  function seedInitialItems() {
    state.items = [
      {
        id: generateId(),
        name: "Spinach",
        quantity: "1 bag",
        category: "Produce",
        requestedBy: "You",
        purchased: false,
        fromInventory: true
      },
      {
        id: generateId(),
        name: "Chicken breast",
        quantity: "2 lbs",
        category: "Meat & Seafood",
        requestedBy: "",
        purchased: false,
        fromInventory: false
      },
      {
        id: generateId(),
        name: "Oat milk",
        quantity: "2 cartons",
        category: "Beverages",
        requestedBy: "Roommate",
        purchased: true,
        fromInventory: true
      }
    ];
    render();
  }
  
  function setupEventListeners() {
    const addItemBtn = document.getElementById("addItemBtn");
    const newListBtn = document.getElementById("newListBtn");
    const saveTemplateBtn = document.getElementById("saveTemplateBtn");
  
    if (addItemBtn) addItemBtn.addEventListener("click", openAddItemModal);
    if (newListBtn) newListBtn.addEventListener("click", openTemplateModal);
    if (saveTemplateBtn) saveTemplateBtn.addEventListener("click", saveCurrentListAsTemplate);
  
    document.querySelectorAll("[data-close-item-modal]").forEach((btn) => {
      btn.addEventListener("click", () => closeModal("itemModalBackdrop"));
    });
  
    const itemForm = document.getElementById("itemForm");
    if (itemForm) itemForm.addEventListener("submit", handleItemFormSubmit);
  
    document.querySelectorAll("[data-close-template-modal]").forEach((btn) => {
      btn.addEventListener("click", () => closeModal("templateModalBackdrop"));
    });

    document.querySelectorAll("[data-close-template-save-modal]").forEach((btn) => {
        btn.addEventListener("click", () => closeModal("templateSaveModalBackdrop"));
    });
    
    const templateSaveForm = document.getElementById("templateSaveForm");
    if (templateSaveForm) {
        templateSaveForm.addEventListener("submit", handleTemplateSaveFormSubmit);
    }
    
    const sortBtn = document.getElementById("sortBtn");
    const sortMenu = document.getElementById("sortMenu");
    if (sortBtn) sortBtn.addEventListener("click", toggleSortMenu);
    if (sortMenu) sortMenu.addEventListener("click", handleSortMenuClick);
  
    document.addEventListener("click", (e) => {
      const menu = document.getElementById("sortMenu");
      const sortBtnInner = document.getElementById("sortBtn");
      if (!menu || !sortBtnInner) return;
      if (!menu.contains(e.target) && !sortBtnInner.contains(e.target)) {
        hideSortMenu();
      }
    });
    
    // close modal if you click the back
    const itemBackdrop = document.getElementById("itemModalBackdrop");
    const templateBackdrop = document.getElementById("templateModalBackdrop");
  
    if (itemBackdrop) {
      itemBackdrop.addEventListener("click", (e) => {
        if (e.target.id === "itemModalBackdrop") closeModal("itemModalBackdrop");
      });
    }
    if (templateBackdrop) {
      templateBackdrop.addEventListener("click", (e) => {
        if (e.target.id === "templateModalBackdrop") closeModal("templateModalBackdrop");
      });
    }
  }
  
    document.addEventListener("DOMContentLoaded", () => {
        setupEventListeners();
        seedInitialItems();
    });

    // keyboard behavior
    const fakeKeyboard = document.getElementById("fakeKeyboard");

    document.addEventListener("focusin", (e) => {
    if (e.target.tagName === "INPUT" || e.target.tagName === "TEXTAREA") {
        fakeKeyboard.classList.add("active");
    }
    });

    document.addEventListener("focusout", (e) => {
    if (e.target.tagName === "INPUT" || e.target.tagName === "TEXTAREA") {
        setTimeout(() => fakeKeyboard.classList.remove("active"), 200);
    }
    });

function handleRestockedItems() {
  const raw = localStorage.getItem("restockData");
  if (!raw) return;

  let restockItems;
  try {
    restockItems = JSON.parse(raw);
    if (!Array.isArray(restockItems)) return;
  } catch {
    return;
  }

  restockItems.forEach((item) => {
    // Check if item already exists in shopping list
    const existing = state.items.find(
      (i) => i.name.toLowerCase() === item.name.toLowerCase()
    );
    if (existing) {
      existing.quantity = `${parseInt(existing.quantity || 0) + item.quantity}`;
    } else {
      addItem({
        name: item.name,
        quantity: item.quantity.toString(),
        category: item.category || "",
        requestedBy: item.requestedBy || "",
      });
    }
  });

  showToast("Restocked items added to your grocery list ✅");

  // Clear localStorage key so we don't duplicate
  localStorage.removeItem("restockData");
}

// Run once on page load in case fridge saved data before shopping cart loaded
document.addEventListener("DOMContentLoaded", handleRestockedItems);

// Optional: Listen for localStorage changes if multiple tabs/windows
window.addEventListener("storage", (e) => {
  if (e.key === "restockData" && e.newValue) {
    handleRestockedItems();
  }
});


function handleSmartShoppingItems() {
  const raw = localStorage.getItem("smart_shopping_items");
  if (!raw) return;

  let smartItems;
  try {
    smartItems = JSON.parse(raw);
    if (!Array.isArray(smartItems)) return;
  } catch {
    return;
  }

  smartItems.forEach((item) => {
    const existing = state.items.find(
      (i) => i.name.toLowerCase() === item.name.toLowerCase()
    );
    if (existing) {
      existing.quantity = item.quantity;
      existing.requestedBy = item.requestedBy;
    } else {
      addItem(item);
    }
  });

  showToast("Smart shopping items added to your list! 🛒");
  localStorage.removeItem("smart_shopping_items");
}

// Run on page load
document.addEventListener("DOMContentLoaded", handleSmartShoppingItems);

// Listen for changes from other tabs
window.addEventListener("storage", (e) => {
  if (e.key === "smart_shopping_items" && e.newValue) {
    handleSmartShoppingItems();
  }
});
