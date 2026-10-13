/** External labels need a text fallback in engines with incomplete cross-root ARIA. */
export function accessibleLabelText(label: Element): string {
  const explicit = label.getAttribute('aria-label'); if (explicit?.trim()) return explicit.trim();
  const walk = document.createTreeWalker(label, NodeFilter.SHOW_TEXT, { acceptNode: node => {
    const hidden = node.parentElement?.closest('[aria-hidden="true"],[hidden]');
    return hidden && hidden !== label && label.contains(hidden) ? NodeFilter.FILTER_REJECT : NodeFilter.FILTER_ACCEPT;
  } });
  const parts: string[] = []; while (walk.nextNode()) parts.push(walk.currentNode.textContent ?? '');
  return parts.join(' ').replace(/\s+/g, ' ').trim();
}

const associations = new WeakMap<Document | ShadowRoot, { observer: MutationObserver; clients: Set<() => void> }>();
/** One observer per root keeps for/id association changes current, including new destinations. */
export function watchLabelAssociations(host: Element, refresh: () => void): () => void {
  const root = host.getRootNode(); if (!(root instanceof Document || root instanceof ShadowRoot)) return () => {};
  let group = associations.get(root);
  if (!group) {
    const clients = new Set<() => void>();
    const observer = new MutationObserver(records => {
      const changed = records.some(record => record.type === 'attributes' || [...record.addedNodes, ...record.removedNodes].some(node => node instanceof Element && (node.matches('label, [id]') || node.querySelector('label, [id]'))));
      if (changed) for (const client of clients) client();
    });
    observer.observe(root, { childList: true, subtree: true, attributes: true, attributeFilter: ['for', 'id'] });
    group = { observer, clients }; associations.set(root, group);
  }
  group.clients.add(refresh);
  const current = group;
  return () => { current.clients.delete(refresh); if (!current.clients.size) { current.observer.disconnect(); associations.delete(root); } };
}
