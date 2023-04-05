type TocOptions = {
    topPaddingPx: number;
    bottomPaddingPx: number;
};

export function setupTocTo(window: Window, options: TocOptions) {
    const document = window.document;
    const tocItems = Array.from(document.querySelectorAll('nav.table-of-contents li')).map(e => {
        const anchor = e.querySelector('a')?.getAttribute('href')?.substring(1);
        if (anchor) {
            const target = document.getElementById(anchor);
            if (target) {
                return {
                    listItem: e,
                    target: target,
                };
            }
        }
        throw new Error('invalid toc item');
    });

    const decorateTocItems = () => {
        const windowTop = options.topPaddingPx;
        const windowBottom = window.innerHeight - options.bottomPaddingPx;
        tocItems.map((item, index) =>  {
            const itemTop = 
                item.target.getBoundingClientRect().top;
            const itemBottom = // calc by top of next item
                (index + 1 < tocItems.length)
                    ? tocItems[index + 1].target.getBoundingClientRect().top
                    : document.documentElement.scrollHeight;
            const visible = 
                (windowTop < itemTop && itemTop < windowBottom) || // top of target is visible
                (windowTop < itemBottom  && itemBottom < windowBottom) || // bottom of target is visible
                (itemTop <= windowTop && windowBottom <= itemBottom); // target is partially or entirely visible
            if (visible) {
                item.listItem.classList.add('visible');
            } else {
                item.listItem.classList.remove('visible');
            }
        });
    };
    decorateTocItems();
    new ResizeObserver(decorateTocItems).observe(document.body);
    window.addEventListener('resize', decorateTocItems);
    window.addEventListener('scroll', decorateTocItems);
}
