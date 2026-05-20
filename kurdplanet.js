// my-button
customElements.define('my-button', class extends HTMLElement {
    connectedCallback() {
        this.className = 'box';
    }
});

// my-search
customElements.define('my-search', class extends HTMLElement {
    connectedCallback() {
        this.className = 'box';
        this.style.display = 'flex';
        this.style.width = '100%';

        this.innerHTML = `
            <button class="box" style="margin: 0; flex-shrink: 0; border: none; cursor: pointer;">
                <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2">
                    <circle cx="11" cy="11" r="8"></circle>
                    <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
                </svg>
            </button>
            <div class="scrollable-area" contenteditable="true" data-placeholder="hello" style="flex-grow: 1; overflow-x: auto; white-space: nowrap; outline: none; padding: 0 15px; font-size: 45px;"></div>
        `;

        const inputArea = this.querySelector('.scrollable-area');
        inputArea.addEventListener('keydown', (e) => { if (e.key === 'Enter') e.preventDefault(); });
        inputArea.addEventListener('paste', (e) => {
            e.preventDefault();
            const text = e.clipboardData.getData('text/plain').replace(/\n/g, '');
            document.execCommand('insertText', false, text);
        });
    }
});
