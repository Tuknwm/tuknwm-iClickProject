document.addEventListener('DOMContentLoaded', function() {
    loadUserScores('mouse');

    const modeButtons = document.querySelectorAll('.HSmodeButton');
    modeButtons.forEach(button => {
        button.addEventListener('click', function() {
            modeButtons.forEach(btn => btn.classList.remove('active'));
            this.classList.add('active');
            loadUserScores(this.getAttribute('data-mode'));
        });
    });
});

function loadUserScores() {
    document.getElementById('score-5s').textContent = '-';
    document.getElementById('score-10s').textContent = '-';
    document.getElementById('score-15s').textContent = '-';
}
