const STORAGE_KEY = "directorio-companeros";

const form = document.querySelector("#contact-form");
const nameInput = document.querySelector("#name");
const emailInput = document.querySelector("#email");
const nameError = document.querySelector("#name-error");
const emailError = document.querySelector("#email-error");
const feedback = document.querySelector("#form-feedback");
const searchInput = document.querySelector("#search-input");
const contactList = document.querySelector("#contact-list");
const emptyState = document.querySelector("#empty-state");
const contactCount = document.querySelector("#contact-count");
const listDescription = document.querySelector("#list-description");
const clearAllButton = document.querySelector("#clear-all");
const cancelEditButton = document.querySelector("#cancel-edit");
const submitLabel = document.querySelector("#submit-label");

let contacts = loadContacts();
let editingContactId = null;

function loadContacts() {
  try {
    const savedContacts = JSON.parse(localStorage.getItem(STORAGE_KEY));
    return Array.isArray(savedContacts) ? savedContacts : [];
  } catch (error) {
    return [];
  }
}

function saveContacts() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(contacts));
}

function getInitials(name) {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0].toUpperCase())
    .join("");
}

function escapeHtml(value) {
  const element = document.createElement("div");
  element.textContent = value;
  return element.innerHTML;
}

function renderContacts() {
  const searchTerm = searchInput.value.trim().toLowerCase();
  const visibleContacts = contacts.filter((contact) =>
    `${contact.name} ${contact.email}`.toLowerCase().includes(searchTerm)
  );

  contactList.innerHTML = visibleContacts.map((contact) => `
    <tr>
      <td>
        <div class="person-cell">
          <span class="avatar">${escapeHtml(getInitials(contact.name))}</span>
          <span>${escapeHtml(contact.name)}</span>
        </div>
      </td>
      <td class="email-cell">${escapeHtml(contact.email)}</td>
      <td>
        <div class="row-actions">
          <button class="edit-button" type="button" data-id="${contact.id}">Editar</button>
          <button class="delete-button" type="button" data-id="${contact.id}" aria-label="Eliminar a ${escapeHtml(contact.name)}" title="Eliminar">×</button>
        </div>
      </td>
    </tr>
  `).join("");

  const hasContacts = contacts.length > 0;
  const hasResults = visibleContacts.length > 0;
  contactCount.textContent = contacts.length;
  listDescription.textContent = hasContacts
    ? `${contacts.length === 1 ? "Una persona" : `${contacts.length} personas`} en tu directorio.`
    : "Tu lista aparecerá aquí.";
  clearAllButton.hidden = !hasContacts;
  emptyState.classList.toggle("visible", !hasResults);

  if (hasContacts && !hasResults) {
    emptyState.querySelector("h3").textContent = "Sin resultados";
    emptyState.querySelector("p").textContent = "Prueba con otro nombre o correo.";
  } else {
    emptyState.querySelector("h3").textContent = "Aún no hay compañeros";
    emptyState.querySelector("p").textContent = "Usa el formulario para crear tu primer registro.";
  }
}

function validateForm() {
  const name = nameInput.value.trim();
  const email = emailInput.value.trim().toLowerCase();
  let isValid = true;
  nameError.textContent = "";
  emailError.textContent = "";
  nameInput.classList.remove("invalid");
  emailInput.classList.remove("invalid");

  if (name.length < 2) {
    nameError.textContent = "Escribe al menos 2 caracteres.";
    nameInput.classList.add("invalid");
    isValid = false;
  }

  if (!emailInput.validity.valid || !email) {
    emailError.textContent = "Escribe un correo válido.";
    emailInput.classList.add("invalid");
    isValid = false;
  } else if (contacts.some((contact) => contact.email === email && contact.id !== editingContactId)) {
    emailError.textContent = "Ese correo ya está registrado.";
    emailInput.classList.add("invalid");
    isValid = false;
  }

  return { isValid, name, email };
}

form.addEventListener("submit", (event) => {
  event.preventDefault();
  const result = validateForm();
  feedback.textContent = "";
  feedback.classList.remove("error");

  if (!result.isValid) {
    feedback.textContent = "Revisa los campos marcados.";
    feedback.classList.add("error");
    return;
  }

  if (editingContactId) {
    contacts = contacts.map((contact) => contact.id === editingContactId
      ? { ...contact, name: result.name, email: result.email }
      : contact);
    editingContactId = null;
    submitLabel.textContent = "Agregar compañero";
    cancelEditButton.hidden = true;
    feedback.textContent = "Compañero actualizado correctamente.";
  } else {
    contacts.unshift({ id: crypto.randomUUID(), name: result.name, email: result.email });
    feedback.textContent = "Compañero agregado correctamente.";
  }
  saveContacts();
  renderContacts();
  form.reset();
  nameInput.focus();
});

[nameInput, emailInput].forEach((input) => {
  input.addEventListener("input", () => {
    input.classList.remove("invalid");
    if (input === nameInput) nameError.textContent = "";
    if (input === emailInput) emailError.textContent = "";
  });
});

searchInput.addEventListener("input", renderContacts);

contactList.addEventListener("click", (event) => {
  const editButton = event.target.closest(".edit-button");
  const deleteButton = event.target.closest(".delete-button");
  if (editButton) {
    const contact = contacts.find((item) => item.id === editButton.dataset.id);
    if (!contact) return;
    editingContactId = contact.id;
    nameInput.value = contact.name;
    emailInput.value = contact.email;
    submitLabel.textContent = "Guardar cambios";
    cancelEditButton.hidden = false;
    feedback.textContent = "Editando registro seleccionado.";
    feedback.classList.remove("error");
    nameInput.focus();
    return;
  }
  if (!deleteButton) return;

  contacts = contacts.filter((contact) => contact.id !== deleteButton.dataset.id);
  if (editingContactId === deleteButton.dataset.id) cancelEdit();
  saveContacts();
  renderContacts();
});

function cancelEdit() {
  editingContactId = null;
  form.reset();
  submitLabel.textContent = "Agregar compañero";
  cancelEditButton.hidden = true;
  feedback.textContent = "Edición cancelada.";
  feedback.classList.remove("error");
}

cancelEditButton.addEventListener("click", cancelEdit);

clearAllButton.addEventListener("click", () => {
  if (!window.confirm("¿Quieres eliminar todos los compañeros registrados?")) return;
  contacts = [];
  saveContacts();
  renderContacts();
});

renderContacts();
