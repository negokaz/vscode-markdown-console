import { setupTocTo } from '@ui/toc/toc';

window.addEventListener('load', () => {
    setupTocTo(window, {
        topPaddingPx: 10,
        bottomPaddingPx: 100,
    });
});
