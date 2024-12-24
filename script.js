const darkModeToggle = document.getElementById('darkModeToggle');
const iconSun = document.getElementById('iconSun');
const iconMoon = document.getElementById('iconMoon');

darkModeToggle.addEventListener('click', toggleDarkMode);

function toggleDarkMode() {
    document.body.classList.toggle('dark-mode');

    if (document.body.classList.contains('dark-mode')) {
        animateIcons(iconSun, iconMoon);
    } else {
        animateIcons(iconMoon, iconSun);
    }
}

function animateIcons(hideIcon, showIcon) {
    hideIcon.style.display = 'none';
    showIcon.style.display = 'block';
}