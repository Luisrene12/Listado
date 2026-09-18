const SUPABASE_URL = "https://rdpybjqsbvzjngpjtjfc.supabase.co";
const SUPABASE_KEY = "sb_publishable_m4ci86uTcl-rJ48EI2kt0w_GiIDYvPx";
const TABLE_NAME = "companeros";

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

let contacts = [];
let editingContactId = null;

async function supabaseRequest(path = "", options = {}) {
  const response = await fetch(`${SUPABASE_URL}/rest/v1/${TABLE_NAME}${path}`, {
    ...options,
    headers: {
      apikey: SUPABASE_KEY,
      Authorization: `Bearer ${SUPABASE_KEY}`,
      "Content-Type": "application/json",
      ...options.headers
    }
  });
  if (!response.ok) {
    const body = await response.json().catch(() => ({}));
    throw new Error(body.message || body.details || `Error ${response.status}`);
  }
  return response.status === 204 ? null : response.json();
}

async function loadContacts() {
  try {
    contacts = await supabaseRequest("?select=id,nombre,correo,creado_en&order=creado_en.desc");
    renderContacts();
  } catch (error) {
    showError(`No se pudo cargar el listado: ${error.message}`);
  }
}

function getInitials(name) {
  return name.split(" ").filter(Boolean).slice(0, 2).map((part) => part[0].toUpperCase()).join("");
}

function escapeHtml(value) {
  const element = document.createElement("div");
  element.textContent = value;
  return element.innerHTML;
}

function showError(message) {
  feedback.textContent = message;
  feedback.classList.add("error");
}

function renderContacts() {
  const searchTerm = searchInput.value.trim().toLowerCase();
  const visibleContacts = contacts.filter((contact) => `${contact.nombre} ${contact.correo}`.toLowerCase().includes(searchTerm));
  contactList.innerHTML = visibleContacts.map((contact) => `
    <tr>
      <td><div class="person-cell"><span class="avatar">${escapeHtml(getInitials(contact.nombre))}</span><span>${escapeHtml(contact.nombre)}</span></div></td>
      <td class="email-cell">${escapeHtml(contact.correo)}</td>
      <td><div class="row-actions"><button class="edit-button" type="button" data-id="${contact.id}">Editar</button><button class="delete-button" type="button" data-id="${contact.id}" aria-label="Eliminar a ${escapeHtml(contact.nombre)}" title="Eliminar">×</button></div></td>
    </tr>
  `).join("");

  const hasContacts = contacts.length > 0;
  contactCount.textContent = contacts.length;
  listDescription.textContent = hasContacts ? `${contacts.length === 1 ? "Una persona" : `${contacts.length} personas`} en tu directorio.` : "Tu lista aparecerá aquí.";
  clearAllButton.hidden = !hasContacts;
  emptyState.classList.toggle("visible", visibleContacts.length === 0);
  emptyState.querySelector("h3").textContent = hasContacts && visibleContacts.length === 0 ? "Sin resultados" : "Aún no hay compañeros";
  emptyState.querySelector("p").textContent = hasContacts && visibleContacts.length === 0 ? "Prueba con otro nombre o correo." : "Usa el formulario para crear tu primer registro.";
}

function validateForm() {
  const nombre = nameInput.value.trim();
  const correo = emailInput.value.trim().toLowerCase();
  nameError.textContent = "";
  emailError.textContent = "";
  nameInput.classList.remove("invalid");
  emailInput.classList.remove("invalid");
  let isValid = true;
  if (nombre.length < 2) {
    nameError.textContent = "Escribe al menos 2 caracteres.";
    nameInput.classList.add("invalid");
    isValid = false;
  }
  if (!emailInput.validity.valid || !correo) {
    emailError.textContent = "Escribe un correo válido.";
    emailInput.classList.add("invalid");
    isValid = false;
  } else if (contacts.some((contact) => contact.correo.toLowerCase() === correo && contact.id !== editingContactId)) {
    emailError.textContent = "Ese correo ya está registrado.";
    emailInput.classList.add("invalid");
    isValid = false;
  }
  return { isValid, nombre, correo };
}

form.addEventListener("submit", async (event) => {
  event.preventDefault();
  const result = validateForm();
  feedback.textContent = "";
  feedback.classList.remove("error");
  if (!result.isValid) {
    showError("Revisa los campos marcados.");
    return;
  }
  try {
    if (editingContactId) {
      await supabaseRequest(`?id=eq.${encodeURIComponent(editingContactId)}`, {
        method: "PATCH",
        headers: { Prefer: "return=representation" },
        body: JSON.stringify({ nombre: result.nombre, correo: result.correo })
      });
      feedback.textContent = "Compañero actualizado correctamente.";
    } else {
      await supabaseRequest("", {
        method: "POST",
        headers: { Prefer: "return=representation" },
        body: JSON.stringify({ nombre: result.nombre, correo: result.correo })
      });
      feedback.textContent = "Compañero agregado correctamente.";
    }
    cancelEdit();
    await loadContacts();
  } catch (error) {
    showError(`No se pudo guardar: ${error.message}`);
  }
});

[nameInput, emailInput].forEach((input) => input.addEventListener("input", () => {
  input.classList.remove("invalid");
  if (input === nameInput) nameError.textContent = "";
  if (input === emailInput) emailError.textContent = "";
}));

searchInput.addEventListener("input", renderContacts);

contactList.addEventListener("click", async (event) => {
  const editButton = event.target.closest(".edit-button");
  const deleteButton = event.target.closest(".delete-button");
  if (editButton) {
    const contact = contacts.find((item) => item.id === editButton.dataset.id);
    if (!contact) return;
    editingContactId = contact.id;
    nameInput.value = contact.nombre;
    emailInput.value = contact.correo;
    submitLabel.textContent = "Guardar cambios";
    cancelEditButton.hidden = false;
    feedback.textContent = "Editando registro seleccionado.";
    nameInput.focus();
    return;
  }
  if (!deleteButton || !window.confirm("¿Eliminar este compañero?")) return;
  try {
    await supabaseRequest(`?id=eq.${encodeURIComponent(deleteButton.dataset.id)}`, { method: "DELETE" });
    await loadContacts();
  } catch (error) {
    showError(`No se pudo eliminar: ${error.message}`);
  }
});

function cancelEdit() {
  editingContactId = null;
  form.reset();
  submitLabel.textContent = "Agregar compañero";
  cancelEditButton.hidden = true;
}

cancelEditButton.addEventListener("click", cancelEdit);

clearAllButton.addEventListener("click", async () => {
  if (!window.confirm("¿Quieres eliminar todos los compañeros registrados?")) return;
  try {
    await supabaseRequest("?id=not.is.null", { method: "DELETE" });
    await loadContacts();
  } catch (error) {
    showError(`No se pudo vaciar la lista: ${error.message}`);
  }
});

loadContacts();
