function createBootstrapModal(id, title, options = {}) {
  const existing = document.getElementById(id);
  if (existing) {
    return bootstrap.Modal.getOrCreateInstance(existing);
  }

  const dialogClass = options.size ? `modal-dialog ${options.size}` : "modal-dialog";
  const extraClass = options.modalClass || "";
  const backdrop = options.staticBackdrop ? ' data-bs-backdrop="static"' : "";
  const titleIcon = options.icon ? `<span>${options.icon}</span> ` : "";

  const modalHTML = `
    <div class="modal fade ${extraClass}" id="${id}" tabindex="-1" aria-hidden="true"${backdrop}>
      <div class="${dialogClass}">
        <div class="modal-content">
          <div class="modal-header">
            <h5 class="modal-title">${titleIcon}${title}</h5>
            <button type="button" class="btn-close btn-close-white" data-bs-dismiss="modal" aria-label="Close"></button>
          </div>
          <div class="modal-body" id="${id}Body">
          </div>
        </div>
      </div>
    </div>
  `;

  document.body.insertAdjacentHTML("beforeend", modalHTML);
  return new bootstrap.Modal(document.getElementById(id));
}

window.createBootstrapModal = createBootstrapModal;
