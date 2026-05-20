// پێناسەکردنی my-button
customElements.define('my-button', class extends HTMLElement {
    connectedCallback() {
        this.classList.add('box');
    }
});

// پێناسەکردنی my-search
customElements.define('my-search', class extends HTMLElement {
    connectedCallback() {
        this.classList.add('box');
        
        // دۆزینەوەی ئەو divـەی کە contenteditableـە
        const inputArea = this.querySelector('.scrollable-area');
        
        if (inputArea) {
            // ڕێگریکردن لە Enter
            inputArea.addEventListener('keydown', (e) => {
                if (e.key === 'Enter') e.preventDefault();
            });

            // ڕێگریکردن لە Newline لە کاتی Paste
            inputArea.addEventListener('paste', (e) => {
                e.preventDefault();
                const text = e.clipboardData.getData('text/plain').replace(/\n/g, '');
                document.execCommand('insertText', false, text);
            });
        }
    }
});
