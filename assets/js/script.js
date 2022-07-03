function toggle() {
  const navBarTag = document.getElementById('toggle-nav-bar');
  if (navBarTag.classList.length === 0) {
    navBarTag.classList.add('responsive');
  } else {
    navBarTag.classList.remove('responsive');
  }
}
