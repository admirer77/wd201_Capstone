document.addEventListener("DOMContentLoaded", function () {
    const searchInput = document.querySelector("[data-search]");
    const packs = document.querySelectorAll("[data-pack]"); // Select all pack elements
    console.log(packs);

    searchInput.addEventListener("input", (e) => {
        const value = e.target.value.toLowerCase();
        console.log(value);

        packs.forEach((pack) => {
            const isVisible = pack.textContent.toLowerCase().includes(value);
            pack.style.display = isVisible ? "block" : "none";
        });
    });
});