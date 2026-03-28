import React from 'react';
import { Table, Section } from '@components';
import type { UserModel } from '../../../client';

interface UserListProps {
  onSelect: (userId: number | string) => void;
  users: UserModel[];
  currentId: number | null;
  loading: boolean;
}

const UserList: React.FC<UserListProps> = ({ onSelect, users, currentId, loading }) => {
  return (
    <Section className="grow" style={{ minWidth: 300, maxWidth: 400 }}>
      <Table
        className="contained"
        data={users}
        loading={loading}
        selection={currentId ? [currentId] : []}
        onRowClick={(row) => onSelect(row.id as number)}
        keyField="id"
        columns={[
          {
            name: 'login',
            title: 'Login',
          },
        ]}
      />
    </Section>
  );
};

export default UserList;
