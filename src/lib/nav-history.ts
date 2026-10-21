// Remembers whether the visitor has moved between our own pages in this tab,
// so a "Back" link can return to exactly where they were (like the phone's back button).
let inside = false;

export function markInside() {
	inside = true;
}

export function canGoBack(): boolean {
	return inside && typeof history !== 'undefined' && history.length > 1;
}
