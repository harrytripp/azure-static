const darkModeToggle = document.getElementById('darkModeToggle');
const iconMoon = document.getElementById('iconMoon');
const iconSun = document.getElementById('iconSun');

darkModeToggle.addEventListener('click', toggleDarkMode);

function toggleDarkMode() {
    document.body.classList.toggle('dark-mode');

    if (document.body.classList.contains('dark-mode')) {
        animateIcons(iconMoon, iconSun);
    } else {
        animateIcons(iconSun, iconMoon);
    }
}

function animateIcons(hideIcon, showIcon) {
    hideIcon.style.display = 'none';
    showIcon.style.display = 'block';
}
