// New trigger-mode aware selection handler
export async function onSelection(event) {
    try {
        if (!extensionEnabled) return; // do nothing when extension disabled
        if (skipNextSelection) { // swallow one selection event following icon click
            skipNextSelection = false;
            return;
        }
        const sel = window.getSelection();
        if (!sel) return;
        if (bubbleEl && event && event.target && bubbleEl.contains(event.target)) return; // ignore clicks inside bubble
        const text = sel.toString().trim();
        if (!text) {
            // If we're actively editing inside the bubble (e.g., translation edit input), do not close it
            const active = document.activeElement;
            if (bubbleEl && active && bubbleEl.contains(active) && (active.classList.contains('translation-edit-input') || active.tagName === 'INPUT')) {
                return; // keep bubble open during inline editing
            }
            // removeBubble('on selection'); //TODO: not sure what to do here if remove this or not
            clearPendingState();
            return;
        }

        lastSelection = text;
        let range; try { range = sel.getRangeAt(0); } catch { return; }
        const rects = range.getClientRects();
        let rect = range.getBoundingClientRect();
        if (rect && rect.width === 0 && rects.length) rect = rects[0];
        // Capture nearest block ancestor for later sentence extraction
        try { selectionContextElement = findBlockAncestor(range.commonAncestorContainer); } catch { selectionContextElement = null; }
        settings = await getSettings();
        // Debug log (remove later if noisy)
        // console.debug('[Translator] bubbleMode on selection:', settings.bubbleMode);
        hotkeySpec = parseHotkeyString(settings.bubbleHotkey);
        if (settings.bubbleMode === 'auto') {
            if (bubbleEl) return; // already showing bubble
            performTranslation(text, rect);
        } else if (settings.bubbleMode === 'icon') {
            clearPendingState();
            pendingSelection = { text, rect };
            ensureTriggerStyles();
            triggerIconTimer = setTimeout(() => { if (pendingSelection && pendingSelection.text === text) showTriggerIcon(rect); }, Math.max(0, settings.bubbleIconDelay || 0));
        } else if (settings.bubbleMode === 'hotkey') {
            clearPendingState();
            pendingSelection = { text, rect }; // wait for hotkey or double copy
        }
    } catch (err) {
        console.error('Translator content script selection handling error:', err);
    }
}