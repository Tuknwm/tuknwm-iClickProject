document.addEventListener('DOMContentLoaded', function() {
    const timeTabs = document.querySelectorAll('.tmblModeT');
    const clickTabs = document.querySelectorAll('.tmblModeG');

    function updateLeaderboard() {
        const currentTimeMode = document.querySelector('.tmblModeT.active').dataset.timemode;
        const currentClickMode = document.querySelector('.tmblModeG.active').dataset.clickmode;

        document.querySelectorAll('.dislpayLeaderboard').forEach(s => s.classList.remove('active'));

        const target = document.getElementById(`leaderboard-${currentTimeMode}-${currentClickMode}`);
        if (target) target.classList.add('active');
    }

    timeTabs.forEach(tab => {
        tab.addEventListener('click', function() {
            timeTabs.forEach(t => t.classList.remove('active'));
            this.classList.add('active');
            updateLeaderboard();
        });
    });

    clickTabs.forEach(tab => {
        tab.addEventListener('click', function() {
            clickTabs.forEach(t => t.classList.remove('active'));
            this.classList.add('active');
            updateLeaderboard();
        });
    });

    updateLeaderboard();
});
