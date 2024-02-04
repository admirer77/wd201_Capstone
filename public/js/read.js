var pages = document.querySelectorAll('#page-container .page');
var backButton = document.getElementById('back-button');
var nextButton = document.getElementById('next-button');

// Check if the current page index is stored in session storage
var currentIndex = sessionStorage.getItem('currentPageIndex');
if (currentIndex === null) {
    currentIndex = 0; // Default to the first page
} else {
    currentIndex = parseInt(currentIndex);
}

function displayCurrentPage() {
    for (var i = 0; i < pages.length; i++) {
        if (i === currentIndex) {
            pages[i].style.display = 'block';
        } else {
            pages[i].style.display = 'none';
        }
    }

    if (currentIndex === 0) {
        backButton.classList.add('hidden');
        nextButton.classList.remove('hidden');
    } else if (currentIndex === pages.length - 1) {
        backButton.classList.remove('hidden');
        nextButton.classList.add('hidden');
    } else {
        backButton.classList.remove('hidden');
        nextButton.classList.remove('hidden');
    }

    // Store the current page index in session storage
    sessionStorage.setItem('currentPageIndex', currentIndex);
}

function nextPage() {
    if (currentIndex < pages.length - 1) {
        currentIndex++;
        displayCurrentPage();
    }
}

function prevPage() {
    if (currentIndex > 0) {
        currentIndex--;
        displayCurrentPage();
    }
}

nextButton.addEventListener('click', nextPage);
backButton.addEventListener('click', prevPage);
displayCurrentPage(); // Display the last viewed page or the first page initially.