import { HighlightStyle, syntaxHighlighting } from '@codemirror/language';
import { tags } from '@lezer/highlight';

// The markdown source view of MDXEditor comes with a hard-coded light
// CodeMirror theme. Its colors are unreadable on our background (quotes
// and comments are near-invisible), so we push our own highlight style
// in front of it. Everything else is handled in MdxEditor.css.

const highlightStyle = HighlightStyle.define([
  { tag: tags.heading, color: 'var(--color-cyan)', fontWeight: 'bold' },
  { tag: tags.strong, color: 'var(--color-text-hl)', fontWeight: 'bold' },
  { tag: tags.emphasis, color: 'var(--color-text-hl)', fontStyle: 'italic' },
  { tag: tags.strikethrough, textDecoration: 'line-through' },
  { tag: tags.quote, color: 'var(--color-text-dim)' },
  { tag: tags.comment, color: 'var(--color-text-muted)', fontStyle: 'italic' },
  { tag: tags.monospace, color: 'var(--color-green)' },
  { tag: tags.link, color: 'var(--color-violet)' },
  { tag: tags.url, color: 'var(--color-violet)', textDecoration: 'underline' },
  { tag: tags.list, color: 'var(--color-yellow)' },
  { tag: tags.contentSeparator, color: 'var(--color-yellow)' },
  { tag: [tags.meta, tags.processingInstruction], color: 'var(--color-text-dim)' },
  { tag: [tags.tagName, tags.angleBracket], color: 'var(--color-magenta)' },
  { tag: tags.attributeName, color: 'var(--color-yellow)' },
  { tag: tags.string, color: 'var(--color-green)' },
  { tag: tags.invalid, color: 'var(--color-red)' },
]);

// Custom extensions take precedence over the ones MDXEditor adds
export const sourceThemeExtensions = [syntaxHighlighting(highlightStyle)];
