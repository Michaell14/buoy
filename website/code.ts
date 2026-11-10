// Code blocks on the site: a small highlighter, and a way to select text when copying is refused.

const escape = (text: string) => text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
// Comments, then strings (template literals included), then tags, keywords and calls. A keyword
// followed by `=` or `:` is an attribute or an object key, such as type="email", so it is left alone.
const TOKENS =
  /(\/\/[^\n]*|&lt;!--[\s\S]*?--&gt;)|('(?:[^'\\\n]|\\.)*'|"(?:[^"\\\n]|\\.)*"|`(?:[^`\\]|\\.)*`)|(&lt;\/?)([A-Za-z][\w.-]*)|\b(const|let|import|from|export|default|function|return|await|async|new|for|of|if|else|try|catch|finally|type)\b(?![=:])|([A-Za-z_$][\w$]*)(?=\()/g;

export function highlight(source: string): string {
  return escape(source).replace(TOKENS, (match, comment, string, open, tag, keyword, call) => {
    if (comment) return `<span class="t-c">${comment}</span>`;
    if (string) return `<span class="t-s">${string}</span>`;
    if (open) return `${open}<span class="t-g">${tag}</span>`;
    if (keyword) return `<span class="t-k">${keyword}</span>`;
    if (call) return `<span class="t-f">${call}</span>`;
    return match;
  });
}

export const setCode = (element: HTMLElement, source: string) => {
  element.innerHTML = highlight(source);
};

export function selectText(element: HTMLElement) {
  try {
    const range = document.createRange();
    range.selectNodeContents(element);
    const selection = window.getSelection();
    selection?.removeAllRanges();
    selection?.addRange(range);
  } catch {
    // Selecting is only the fallback for a refused copy.
  }
}
