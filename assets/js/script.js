function toggle() {
  const navBarTag = document.getElementById('toggle-nav-bar');
  const toggleButton = document.getElementById('toggle-button');
  if (navBarTag.classList.length === 0) {
    navBarTag.classList.add('responsive');
    toggleButton.setAttribute("aria-expanded", true);
  } else {
    navBarTag.classList.remove('responsive');
    toggleButton.setAttribute("aria-expanded", false);
  }
}
