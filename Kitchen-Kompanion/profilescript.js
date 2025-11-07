// Load from localStorage or use default hardcoded members
let householdMembers = JSON.parse(localStorage.getItem("householdMembers")) || [
  { name: "Dad", allergies: ["Peanuts"], preferences: [], otherAllergies: "", otherPrefs: "" },
  { name: "Mom", allergies: [], preferences: ["Vegetarian"], otherAllergies: "", otherPrefs: "" },
  { name: "Emma", allergies: ["Shellfish"], preferences: ["Gluten-Free"], otherAllergies: "", otherPrefs: "" }
];

const memberList = document.getElementById('memberList');
const profileForm = document.getElementById('profileForm');
const profileHeader = document.getElementById('profileHeader');
let selectedIndex = null;
// Save to localStorage helper
function saveMembers() {
  localStorage.setItem("householdMembers", JSON.stringify(householdMembers));
}

// Modal handlers – Add member
document.getElementById('addMemberBtn').addEventListener('click', () => {
  document.getElementById('memberModal').style.display = 'flex';
  document.getElementById('newMemberName').focus();
});

document.getElementById('cancelMemberBtn').addEventListener('click', () => {
  document.getElementById('memberModal').style.display = 'none';
  clearMemberForm();
});

document.getElementById('saveMemberBtn').addEventListener('click', () => {
  const name = document.getElementById('newMemberName').value.trim();
  if (!name) return alert('Please enter a name');

  const allergies = Array.from(document.querySelectorAll('.member-allergy:checked')).map(cb => cb.value);
  const preferences = Array.from(document.querySelectorAll('.member-pref:checked')).map(cb => cb.value);
  const otherAllergies = document.getElementById('newOtherAllergies').value.trim();
  const otherPrefs = document.getElementById('newOtherPrefs').value.trim();

  householdMembers.push({ name, allergies, preferences, otherAllergies, otherPrefs });
  saveMembers();

  document.getElementById('memberModal').style.display = 'none';
  clearMemberForm();
  renderMemberList();
});

// Clear modal form
function clearMemberForm() {
  document.getElementById('newMemberName').value = '';
  document.getElementById('newOtherAllergies').value = '';
  document.getElementById('newOtherPrefs').value = '';
  document.querySelectorAll('.member-allergy, .member-pref').forEach(cb => cb.checked = false);
}

// Render list
function renderMemberList() {
  memberList.innerHTML = '';

  if (householdMembers.length === 0) {
    memberList.innerHTML = '<p>No members added yet.</p>';
    return;
  }

  householdMembers.forEach((member, index) => {
    const card = document.createElement('button');
    card.className = 'member-card';
    const allergyList = [...member.allergies];
    if (member.otherAllergies) allergyList.push(member.otherAllergies);

    const prefList = [...member.preferences];
    if (member.otherPrefs) prefList.push(member.otherPrefs);

    card.innerHTML = `
      <strong>✏️ ${member.name}</strong>
      <p>${allergyList.length ? allergyList.join(', ') : 'None'}</p>
      <p>${prefList.length ? prefList.join(', ') : 'None'}</p>
    `;
    card.addEventListener('click', () => selectMember(index));
    memberList.appendChild(card);

    card.addEventListener('click', () => selectMember(index));

    // Prevent checkbox clicks from opening the popup
    card.querySelectorAll('input[type="checkbox"]').forEach(cb => {
    cb.addEventListener('click', (e) => e.stopPropagation());
});

memberList.appendChild(card);
  });
}

// Select member
function selectMember(index) {
  selectedIndex = index;
  const member = householdMembers[index];

  localStorage.setItem("currentUser", JSON.stringify(member));

  profileHeader.textContent = `${member.name}'s Profile`;
  profileForm.style.display = 'block';
  document.getElementById('userName').value = member.name;

  document.querySelectorAll('.my-allergy').forEach(cb => cb.checked = member.allergies.includes(cb.value));
  document.querySelectorAll('.my-pref').forEach(cb => cb.checked = member.preferences.includes(cb.value));
  document.getElementById('otherAllergies').value = member.otherAllergies || '';
  document.getElementById('otherPrefs').value = member.otherPrefs || '';
}

// Save profile changes
document.getElementById('saveProfileBtn').addEventListener('click', () => {
  if (selectedIndex === null) return;
  const member = householdMembers[selectedIndex];

  member.name = document.getElementById('userName').value.trim() || member.name;
  member.allergies = Array.from(document.querySelectorAll('.my-allergy:checked')).map(cb => cb.value);
  member.preferences = Array.from(document.querySelectorAll('.my-pref:checked')).map(cb => cb.value);
  member.otherAllergies = document.getElementById('otherAllergies').value.trim();
  member.otherPrefs = document.getElementById('otherPrefs').value.trim();

  saveMembers();
  profileHeader.textContent = `${member.name}'s Profile`;
  renderMemberList();
});

// Delete member
document.getElementById('deleteMemberBtn').addEventListener('click', () => {
  if (selectedIndex === null) return;
  householdMembers.splice(selectedIndex, 1);
  selectedIndex = null;
  saveMembers();
  profileHeader.textContent = 'My Profile';
  profileForm.style.display = 'none';
  renderMemberList();
});

// Close edit profile "popup"
const closeProfileFormBtn = document.getElementById('closeProfileFormBtn');
if (closeProfileFormBtn) {
  closeProfileFormBtn.addEventListener('click', () => {
    profileForm.style.display = 'none';
    profileHeader.textContent = 'My Profile';
    selectedIndex = null;
  });
}

// --- Fake keyboard behavior for text inputs / textareas ---
const fakeKeyboard = document.getElementById('fakeKeyboard');

document.addEventListener('focusin', (e) => {
  if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') {
    if (fakeKeyboard) fakeKeyboard.classList.add('active');
  }
});

document.addEventListener('focusout', (e) => {
  if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') {
    setTimeout(() => {
      if (fakeKeyboard) fakeKeyboard.classList.remove('active');
    }, 150);
  }
});

// Init
renderMemberList();
