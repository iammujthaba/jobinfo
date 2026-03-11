/**
 * components.js
 * Dynamically loads shared HTML components into the page.
 */

document.addEventListener("DOMContentLoaded", function() {
  const modalsContainer = document.getElementById("modals-container");
  
  if (modalsContainer) {
    // Only load if the container exists on this page
    fetch("components/modals.html")
      .then(response => {
        if (!response.ok) {
          throw new Error("Network response was not ok");
        }
        return response.text();
      })
      .then(html => {
        modalsContainer.innerHTML = html;
        console.log("Modals loaded successfully.");
      })
      .catch(error => {
        console.error("Error loading modals:", error);
      });
  }
});
