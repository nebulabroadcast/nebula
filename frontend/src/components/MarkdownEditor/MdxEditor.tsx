import {
  BlockTypeSelect,
  BoldItalicUnderlineToggles,
  CodeToggle,
  CreateLink,
  InsertThematicBreak,
  ListsToggle,
  MDXEditor,
  Separator,
  UndoRedo,
  diffSourcePlugin,
  headingsPlugin,
  linkDialogPlugin,
  linkPlugin,
  listsPlugin,
  markdownShortcutPlugin,
  quotePlugin,
  tablePlugin,
  thematicBreakPlugin,
  toolbarPlugin,
} from '@mdxeditor/editor';
import type { MDXEditorMethods } from '@mdxeditor/editor';
import clsx from 'clsx';
import React, { useCallback, useEffect, useRef, useState } from 'react';

import { Button } from '../Button';
import { TextArea } from '../TextArea';

import { sourceThemeExtensions } from './sourceTheme';
import type { MarkdownEditorProps } from './types';
import { viewModePlugin } from './viewModePlugin';

import '@mdxeditor/editor/style.css';
import './MdxEditor.css';

// Formatting toolbar, hidden until the user asks for it. Image support is
// intentionally left out for now, since we have nowhere to upload the
// images to.

const toolbarContents = () => (
  <>
    <UndoRedo />
    <Separator />
    <BoldItalicUnderlineToggles />
    <CodeToggle />
    <Separator />
    <BlockTypeSelect />
    <Separator />
    <ListsToggle options={['bullet', 'number']} />
    <Separator />
    <CreateLink />
    <InsertThematicBreak />
  </>
);

const MdxEditor: React.FC<MarkdownEditorProps> = ({
  value,
  onChange,
  disabled,
  tooltip,
  className,
}) => {
  const editorRef = useRef<MDXEditorMethods>(null);

  const [sourceMode, setSourceMode] = useState(false);
  const [showToolbar, setShowToolbar] = useState(false);

  // Last value we know the editor and the parent agree on.
  // MDXEditor reads its `markdown` prop only when it mounts, so
  // external updates (switching assets, websocket refresh, revert)
  // have to be pushed to it imperatively - but only when they
  // aren't just an echo of what the user typed.

  const settledValue = useRef(value || '');

  // Not everything stored in a text field is valid markdown - a legacy
  // plain text description may well contain something that looks like a
  // JSX tag. MDXEditor renders nothing at all in that case, so we fall
  // back to editing the raw text. Another value (a different asset, for
  // example) gets another chance at rich text.

  const [parseError, setParseError] = useState(false);

  // MDXEditor renders its popups (link dialog, block type select) in a
  // container appended to document.body, which is painted below modal
  // dialogs. When we're inside one, render them in the dialog instead.

  const [overlayContainer, setOverlayContainer] = useState<HTMLElement | null>(null);

  const wrapperRef = useCallback((element: HTMLDivElement | null) => {
    setOverlayContainer(element?.closest('dialog') ?? null);
  }, []);

  useEffect(() => {
    const newValue = value || '';
    if (newValue === settledValue.current) return;
    settledValue.current = newValue;
    setParseError(false);
    // Doesn't trigger onChange (MDXEditor mutes changes it makes itself)
    editorRef.current?.setMarkdown(newValue);
  }, [value]);

  // Keeping settledValue in sync with what we report upwards is what
  // stops the effect above from feeding our own edits back into the
  // editor (and, in the raw text fallback, from remounting it on every
  // keystroke).

  const emitChange = (markdown: string) => {
    if (markdown === settledValue.current) return;
    settledValue.current = markdown;
    onChange(markdown);
  };

  const handleChange = (markdown: string, initialMarkdownNormalize: boolean) => {
    // Importing the markdown may reformat it slightly (different bullet
    // symbols, whitespace...). That isn't a user edit, so it must not
    // mark the field as changed.
    if (initialMarkdownNormalize) return;
    emitChange(markdown);
  };

  const handleError = ({ error, source }: { error: string; source: string }) => {
    // micromark's messages aren't much use to the user, but they are to us
    console.warn('Unable to edit markdown as rich text:', error, source);
    setParseError(true);
  };

  const actions = (
    <div className="nb-markdown-editor-actions">
      <Button
        icon="markdown"
        active={sourceMode}
        tooltip="Edit the markdown source"
        disabled={parseError}
        onClick={() => {
          setSourceMode((current) => !current);
        }}
      />
      <Button
        icon="text_format"
        active={showToolbar}
        tooltip="Show the formatting toolbar"
        disabled={parseError || sourceMode}
        onClick={() => {
          setShowToolbar((current) => !current);
        }}
      />
    </div>
  );

  return (
    <div
      className={clsx('nb-markdown-editor-wrapper', className)}
      ref={wrapperRef}
      data-tooltip={tooltip}
    >
      {parseError && (
        <span className="nb-markdown-editor-notice">
          This text is not valid markdown. Editing as plain text.
        </span>
      )}
      <div className="nb-markdown-editor-row">
        {parseError ? (
          <TextArea value={value || ''} onChange={emitChange} disabled={disabled} />
        ) : (
          <MDXEditor
            ref={editorRef}
            className={clsx('nb-markdown-editor', 'dark-theme', {
              'toolbar-hidden': !showToolbar || sourceMode,
            })}
            contentEditableClassName="nb-markdown-content"
            markdown={value || ''}
            onChange={handleChange}
            onError={handleError}
            readOnly={disabled}
            overlayContainer={overlayContainer}
            plugins={[
              headingsPlugin({ allowedHeadingLevels: [1, 2, 3, 4] }),
              listsPlugin(),
              quotePlugin(),
              thematicBreakPlugin(),
              tablePlugin(),
              linkPlugin(),
              linkDialogPlugin(),
              markdownShortcutPlugin(),
              diffSourcePlugin({ codeMirrorExtensions: sourceThemeExtensions }),
              viewModePlugin({ viewMode: sourceMode ? 'source' : 'rich-text' }),
              toolbarPlugin({ toolbarContents }),
            ]}
          />
        )}
        {actions}
      </div>
    </div>
  );
};
MdxEditor.displayName = 'MdxEditor';

export default MdxEditor;
