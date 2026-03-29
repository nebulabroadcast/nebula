import {
  Form,
  FormRow,
  InputColor,
  InputDatetime,
  InputInteger,
  InputSwitch,
  InputText,
  InputTimecode,
  RadioButton,
  Select,
  TextArea,
} from '@components';
import type { SelectOption } from '@components/SelectDialog';
import React, { useMemo } from 'react';

import type { FolderField, ClientMetaTypeModel } from '@/client';
import nebula from '@/nebula';

const eqSet = (xs: Set<any>, ys: Set<any>): boolean =>
  xs.size === ys.size && [...xs].every((x) => ys.has(x));

interface EditorFieldProps {
  field: FolderField;
  value: any;
  originalValue: any;
  onFieldChanged: (name: string, value: any) => void;
  disabled?: boolean;
}

const EditorField: React.FC<EditorFieldProps> = ({
  field,
  value,
  originalValue,
  onFieldChanged,
  disabled,
}) => {
  const metaType = useMemo(
    () => ({ ...nebula.metaType(field.name), ...field }),
    [field]
  ) as ClientMetaTypeModel & FolderField;

  // Memoize options for select and list fields

  const options = useMemo(() => {
    if (!metaType.cs) return [];
    const csOptions = nebula.csOptions(metaType.cs) as unknown as SelectOption[];
    if (metaType.filter) {
      const filterRegex = new RegExp(metaType.filter);
      return csOptions.filter(
        (opt) => opt.value.match(filterRegex) || opt.value === value
      );
    }
    return csOptions;
  }, [metaType, value]);

  // Memoize original value (for changed indicator)

  const originalValueParsed = useMemo(() => {
    if (originalValue !== undefined && originalValue !== null) return originalValue;
    if (metaType.default !== undefined && metaType.default !== null)
      return metaType.default;

    switch (metaType.type) {
      case 'string':
        return '';
      case 'number':
        return 0;
      case 'boolean':
        return false;
      case 'color':
        return 0;
      default:
        return undefined;
    }
  }, [originalValue, metaType]);

  // Don't blame me for this one, it's a mess

  const changed = useMemo(() => {
    if (!originalValue && !value) return false;

    if (metaType.type === 'number' || metaType.type === 'integer') {
      return Number(originalValueParsed) !== Number(value);
    }
    if (metaType.type === 'boolean') {
      return Boolean(originalValueParsed) !== Boolean(value);
    }

    if (metaType.type === 'list') {
      const originalList = Array.isArray(originalValueParsed)
        ? new Set(originalValueParsed)
        : new Set([]);
      const currentList = Array.isArray(value) ? new Set(value) : new Set([]);
      return !eqSet(originalList, currentList);
    }

    return originalValueParsed !== value;
  }, [originalValue, originalValueParsed, value, metaType]);

  // When a field is changed, update the asset data

  const onChange = (value: any) => {
    onFieldChanged(field.name, value);
  };

  // Decide which editor to use for this field

  let editor: React.ReactNode;
  switch (metaType.type) {
    case 'string':
      editor = <InputText value={value} onChange={onChange} disabled={disabled} />;
      break;
    case 'text':
      editor = <TextArea value={value} onChange={onChange} disabled={disabled} />;
      break;
    case 'select':
      editor =
        metaType.mode === 'radio' ? (
          <RadioButton
            options={options}
            value={value}
            onChange={onChange}
            disabled={disabled}
          />
        ) : (
          <Select
            options={options}
            value={value}
            selectionMode="single"
            onChange={onChange}
            disabled={disabled}
          />
        );
      break;
    case 'list':
      editor = (
        <Select
          options={options}
          value={value}
          selectionMode="multiple"
          onChange={onChange}
          disabled={disabled}
        />
      );
      break;
    case 'datetime':
      editor = (
        <InputDatetime
          value={value || 0}
          onChange={onChange}
          mode={metaType.mode as 'date' | 'datetime'}
          placeholder={metaType.title}
          className=""
        />
      );
      break;
    case 'timecode':
      editor = (
        <InputTimecode value={value || ''} onChange={onChange} disabled={disabled} />
      );
      break;
    case 'boolean':
      editor = (
        <InputSwitch value={value || false} onChange={onChange} disabled={disabled} />
      );
      break;
    case 'integer':
      editor = <InputInteger value={value} onChange={onChange} disabled={disabled} />;
      break;
    case 'color':
      editor = <InputColor value={value} onChange={onChange} disabled={disabled} />;
      break;
    default:
      editor = <InputText value={value} onChange={onChange} disabled={true} />;
  }

  // Render the form row

  return (
    <FormRow
      title={metaType.title}
      tooltip={metaType.description || undefined}
      section={metaType.section || undefined}
      changed={changed}
    >
      {editor}
    </FormRow>
  );
};

interface MetadataEditorProps {
  originalData: Record<string, any>;
  objectData: Record<string, any>;
  setObjectData: React.Dispatch<React.SetStateAction<Record<string, any>>>;
  fields: FolderField[];
  onSave?: () => void;
  disabled?: boolean;
}

const MetadataEditor: React.FC<MetadataEditorProps> = ({
  originalData,
  objectData,
  setObjectData,
  fields,
  onSave,
  disabled,
}) => {
  const onFieldChanged = (key: string, value: any) =>
    setObjectData((o) => {
      return { ...o, [key]: value };
    });

  function handleKeyDown(event: React.KeyboardEvent) {
    if (!onSave) return;
    if (event.ctrlKey && event.key === 's') {
      event.preventDefault(); // prevent default browser behavior (saving the page)
      onSave();
    }
  }

  return (
    <Form onKeyDown={handleKeyDown}>
      {fields.map((field) => (
        <EditorField
          key={field.name}
          field={field}
          value={objectData[field.name]}
          originalValue={originalData[field.name]}
          onFieldChanged={onFieldChanged}
          disabled={disabled}
        />
      ))}
    </Form>
  );
};

export default MetadataEditor;
