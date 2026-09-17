import React, { Suspense } from 'react';

import { TextArea } from '../TextArea';

import type { MarkdownEditorProps } from './types';

export type { MarkdownEditorProps };

// MDXEditor pulls in lexical and codemirror, which roughly triples the
// size of the main bundle. Only a handful of fields use it, so it is
// loaded on demand. Until it arrives, the markdown is shown as plain
// text in the regular textarea.

const MdxEditor = React.lazy(() => import('./MdxEditor'));

export const MarkdownEditor: React.FC<MarkdownEditorProps> = (props) => {
  return (
    <Suspense
      fallback={
        <TextArea
          value={props.value || ''}
          onChange={() => {
            // not editable until the editor is loaded
          }}
          tooltip={props.tooltip}
          readOnly
        />
      }
    >
      <MdxEditor {...props} />
    </Suspense>
  );
};
MarkdownEditor.displayName = 'MarkdownEditor';
