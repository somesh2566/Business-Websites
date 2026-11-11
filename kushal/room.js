(() => {const slider=document.getElementById('light');slider.addEventListener('input',()=>{document.documentElement.style.setProperty('--room-light',Number(slider.value)/100);});})();
