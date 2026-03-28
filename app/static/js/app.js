/* Etsy Digital Items – frontend JS */

// Auto-dismiss alerts after 5 seconds
document.addEventListener("DOMContentLoaded", function () {
  document.querySelectorAll(".alert.alert-success, .alert.alert-info").forEach(function (el) {
    setTimeout(function () {
      const bsAlert = bootstrap.Alert.getOrCreateInstance(el);
      bsAlert.close();
    }, 5000);
  });

  // Tag input: show live badge preview
  const tagsInput = document.getElementById("tags");
  const tagPreview = document.getElementById("tag-preview");
  if (tagsInput && tagPreview) {
    tagsInput.addEventListener("input", function () {
      const tags = this.value.split(",").map((t) => t.trim()).filter(Boolean);
      tagPreview.innerHTML = tags
        .map((t) => `<span class="badge bg-light text-dark border me-1">${t}</span>`)
        .join("");
    });
  }
});
