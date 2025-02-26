import nebula from '/src/nebula';
import { useMemo, useState } from 'react';
import { Button } from '/src/components';
import { SelectDialog } from '/src/components';

const AssigneesButton = ({ assignees, setAssignees }) => {
  const [dialogVisible, setDialogVisible] = useState(false);

  const options = useMemo(() => {
    return nebula.settings.users.map((user) => {
      return {
        value: `${user.id}`,
        title: user.name,
      };
    });
  }, [nebula.settings.users]);

  return (
    <>
      {dialogVisible && (
        <SelectDialog
          title="Assignees"
          options={options}
          selectionMode="multiple"
          initialValue={assignees}
          onHide={(value) => {
            setAssignees((value || []).map((v) => parseInt(v)));
            setDialogVisible(false);
          }}
        />
      )}
      <Button
        icon="person"
        label="Assignees"
        onClick={() => setDialogVisible(true)}
        active={assignees?.length > 0}
      />
    </>
  );
};

export default AssigneesButton;
