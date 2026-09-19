export interface MarkdownEditorProps {
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
  tooltip?: string;
  className?: string;
}
