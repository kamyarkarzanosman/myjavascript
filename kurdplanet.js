<!DOCTYPE html>
<html lang="en">

<head>
    <style>
        .box {
            display: inline-flex;
            align-items: center;
            justify-content: center;
            background: rgba(76, 75, 75, 1.00);
            color: white;
            padding: 8px 25px;
            margin: 5px;
            border-radius: 4px;
            font-size: 45px;
            border: none;
            cursor: pointer;
            white-space: nowrap;
        }

        .box:hover {
            background: rgba(132, 132, 132, 1.00);
        }

        /* بەکارهێنانی 100% بۆ پانی */
        my-search.box {
            display: flex;
            width: 420px;
            box-sizing: border-box;
            white-space: nowrap;
        }

        .scrollable-area {
            flex-grow: 1;
            /* بۆ ئەوەی هەموو بۆشاییەکە پڕ بکاتەوە */
            overflow-x: auto;
            white-space: nowrap;
            outline: none;
            padding: 0 15px;
            font-size: 45px;
        }

        .scrollable-area::-webkit-scrollbar {
            height: 6px;
        }

        .scrollable-area::-webkit-scrollbar-thumb {
            background: #fff;
            border-radius: 4px;
        }

        [contenteditable]:empty:before {
            content: attr(data-placeholder);
            color: rgba(255, 255, 255, 0.5);
        }
    </style>
</head>

<body>

    <my-button class="box">hello world!</my-button>

    <my-search class="box">
        <button class="box" style="margin: 0; flex-shrink: 0;">
            <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2">
                <circle cx="11" cy="11" r="8"></circle>
                <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
            </svg>
        </button>
        <div class="scrollable-area" contenteditable="true" data-placeholder="hello" id="input"></div>
    </my-search>

    <script>
        customElements.define('my-button', class extends HTMLElement {});
        customElements.define('my-search', class extends HTMLElement {});

        const input = document.getElementById('input');
        input.addEventListener('keydown', (e) => { if (e.key === 'Enter') e.preventDefault(); });
        input.addEventListener('paste', (e) => {
            e.preventDefault();
            const text = e.clipboardData.getData('text/plain').replace(/\n/g, '');
            document.execCommand('insertText', false, text);
        });
    </script>
</body>

</html>
