import type { User } from '@client';
import { Table, Section } from '@components';
import React from 'react';

interface UserListProps {
  onSelect: (userId: number | string) => void;
  users: User[];
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
        onRowClick={(row) => {
          onSelect(row.id as number);
        }}
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
