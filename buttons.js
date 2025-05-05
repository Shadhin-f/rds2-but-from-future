document.addEventListener('DOMContentLoaded', function() {
    const reviewsBtn = document.getElementById('goToReviews');
    const topBtn = document.getElementById('backToTop');
    const reviewSection = document.getElementById('commentSection');

    // Initially hide the back to top button
    topBtn.style.opacity = '0';
    topBtn.style.pointerEvents = 'none';

    reviewsBtn.addEventListener('click', () => {
        reviewSection.scrollIntoView({ behavior: 'smooth' });
    });

    topBtn.addEventListener('click', () => {
        window.scrollTo({ top: 0, behavior: 'smooth' });
    });

    // Show/hide back to top button based on scroll position
    window.addEventListener('scroll', () => {
        if (window.scrollY > 300) {
            topBtn.style.opacity = '1';
            topBtn.style.pointerEvents = 'all';
        } else {
            topBtn.style.opacity = '0';
            topBtn.style.pointerEvents = 'none';
        }
    });
});
