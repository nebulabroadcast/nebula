import { Button, Dialog, Dropdown } from '@components';
import MetadataEditor from '@containers/MetadataEditor';
import { useState } from 'react';

import { operatorsFor, type Operator } from '@/containers/Browser/conditions';
import type { Condition } from '@/containers/Browser/types';

interface ConditionDialogProps {
  handleCancel: () => void;
  handleConfirm: (condition: Condition) => void;
  title?: React.ReactNode;
  field: string;
}

// A browser condition for one field: an operator and a value, edited
// with the field's usual editor
const ConditionDialog = ({
  handleCancel,
  handleConfirm,
  title,
  field,
}: ConditionDialogProps) => {
  const operators = operatorsFor(field);
  const [operator, setOperator] = useState<Operator>(operators[0]);
  const [data, setData] = useState<Record<string, unknown>>({});
  const value = data[field];
  const needsValue = operator.op !== 'exists';
  const valid =
    !needsValue ||
    (value !== undefined && value !== '' && !(Array.isArray(value) && !value.length));

  const onConfirm = () => {
    if (!valid) return;
    if (!needsValue) {
      handleConfirm({ key: field, op: 'exists', value: operator.value });
    } else if (operator.op === 'ilike') {
      handleConfirm({ key: field, op: 'ilike', value: `%${String(value)}%` });
    } else {
      handleConfirm({ key: field, op: operator.op, value });
    }
  };

  const footer = (
    <>
      <Button
        onClick={handleCancel}
        label="Cancel"
        icon="close"
        hlColor="var(--color-red)"
      />
      <Button
        onClick={onConfirm}
        label="Add"
        icon="check"
        hlColor="var(--color-green)"
        disabled={!valid}
      />
    </>
  );

  return (
    <Dialog onHide={handleCancel} header={title} footer={footer}>
      <Dropdown
        label={operator.label}
        options={operators.map((o) => ({
          label: o.label,
          onClick: () => {
            setOperator(o);
          },
        }))}
      />
      {needsValue && (
        <MetadataEditor
          originalData={{}}
          objectData={data}
          setObjectData={setData}
          fields={[{ name: field }]}
          onSave={onConfirm}
        />
      )}
    </Dialog>
  );
};

export default ConditionDialog;
