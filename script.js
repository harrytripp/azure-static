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

function animateIcons(fromIcon, toIcon) {
    fromIcon.style.opacity = 0;

    setTimeout(() => {
        fromIcon.style.display = 'none';
        toIcon.style.display = 'block';
        toIcon.style.opacity = 0;
        
        requestAnimationFrame(() => {
        toIcon.style.opacity = 1;
        });
    }, 300);
}