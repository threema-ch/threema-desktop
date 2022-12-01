export function scrollToCenterOfView(node: HTMLElement): void {
    node.scrollIntoView({
        block: 'center',
        inline: 'center',
        behavior: 'auto',
    });
}
