document.addEventListener("DOMContentLoaded", () => {
  const form = document.getElementById("contactForm");

  form.addEventListener("submit", (e) => {
    e.preventDefault();
    alert("✅ Gracias por tu mensaje. Te responderemos pronto.");
    form.reset();
  });

  const btn = document.getElementById("empezar");
  btn.addEventListener("click", () => {
    window.scrollTo({ top: document.getElementById("funciones").offsetTop, behavior: "smooth" });
  });
});
