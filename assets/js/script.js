function toggle() {
  const x = document.getElementById('toggle-nav-bar');
  if (x.className === 'nav-bar') {
    x.className += ' responsive';
  } else {
    x.className = 'nav-bar';
  }
}
