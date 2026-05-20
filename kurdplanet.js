// زیادکردنی ستایلەکان بە شێوەی ئۆتۆماتیکی بۆ پەڕەکە
const style = document.createElement('style');
style.textContent = `
    .box { display: inline-flex; align-items: center; justify-content: center; background: rgba(76, 75, 75, 1.00); color: white; padding: 8px 25px; margin: 5px; border-radius: 4px; font-size: 45px; cursor: pointer; white-space: nowrap; border: none; }
    .box:hover { background: rgba(132, 132, 132, 1.00); }
    .scrollable-area::-webkit-scrollbar { height: 6px; }
    .scrollable-area::-webkit-scrollbar-thumb { background: #fff; border-radius: 4px; }
    [contenteditable]:empty:before { content: attr(data-placeholder); color: rgba(255, 255, 255, 0.5); }
`;
document.head.appendChild(style);

// پێناسەکردنی my-button
customElements.define('my-button', class extends HTMLElement {
    connectedCallback() { this.className = 'box'; }
});

// پێناسەکردنی my-search
customElements.define('my-search', class extends HTMLElement {
    connectedCallback() {
        this.className = 'box';
        this.style.display = 'flex';
        this.style.width = '100%';
        this.innerHTML = `
            <button class="box" style="margin: 0; flex-shrink: 0; border: none;">
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
