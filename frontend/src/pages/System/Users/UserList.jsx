import { Table, Section } from '/src/components';

const UserList = ({ onSelect, users, currentId, loading }) => {
  return (
    <Section className="grow" style={{ minWidth: 300, maxWidth: 400 }}>
      <Table
        className="contained"
        data={users}
        loading={loading}
        selection={currentId ? [currentId] : []}
        onRowClick={(row) => onSelect(row.id)}
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
