import React, { useMemo, useState } from 'react';

import { Button, SelectDialog } from '@/components';
import type { SelectOption } from '@/components/SelectDialog';
import nebula from '@/nebula';

interface AssigneesButtonProps {
  assignees?: number[];
  setAssignees: (assignees: number[]) => void;
}

const AssigneesButton: React.FC<AssigneesButtonProps> = ({
  assignees,
  setAssignees,
}) => {
  const [dialogVisible, setDialogVisible] = useState(false);

  const options = useMemo((): SelectOption[] => {
    return (nebula.settings?.users || []).map((user) => {
      return {
        value: `${user.id}`,
        title: user.name,
      };
    });
  }, [nebula.settings?.users]);

  const initialValue = useMemo(() => {
    return (assignees || []).map((id) => `${id}`);
  }, [assignees]);

  return (
    <>
      {dialogVisible && (
        <SelectDialog
          title="Assignees"
          options={options}
          selectionMode="multiple"
          initialValue={initialValue}
          onHide={(value) => {
            const selected = value as string[] | null;
            setAssignees((selected || []).map((v) => parseInt(v, 10)));
            setDialogVisible(false);
          }}
        />
      )}
      <Button
        icon="person"
        label="Assignees"
        onClick={() => {
          setDialogVisible(true);
        }}
        active={(assignees?.length || 0) > 0}
      />
    </>
  );
};

export default AssigneesButton;
