const form = document.getElementById('group-form');
const groupNameInput = document.getElementById('group-name');
const membersInput = document.getElementById('members');
const confirmation = document.getElementById('confirmation-message');

const groupDisplayName = document.getElementById('group-display-name');
const memberList = document.getElementById('member-list');

// Load group if exists
function loadGroup() {
  const group = JSON.parse(localStorage.getItem('userGroup'));
  if (group) {
    groupDisplayName.textContent = group.name;
    memberList.innerHTML = '';
    group.members.forEach(member => {
      const li = document.createElement('li');
      li.textContent = member;
      memberList.appendChild(li);
    });

    // Pre-fill form
    groupNameInput.value = group.name;
    membersInput.value = group.members.join(', ');
  }
}

form.addEventListener('submit', function (e) {
  e.preventDefault();

  const groupName = groupNameInput.value.trim();
  const members = membersInput.value.split(',').map(m => m.trim()).filter(Boolean);

  if (!groupName || members.length === 0) {
    confirmation.innerText = 'Please enter a group name and at least one member.';
    return;
  }

  const group = { name: groupName, members };
  localStorage.setItem('userGroup', JSON.stringify(group));
  confirmation.innerText = `Group "${groupName}" saved successfully.`;

  loadGroup(); // refresh display
});

loadGroup(); // load on page load