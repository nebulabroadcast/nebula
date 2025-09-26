import { useState, useEffect, useMemo } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { toast } from 'react-toastify';
import styled from 'styled-components';

import nebula from '/src/nebula';
import { Navbar, NavbarTitle, Button, Spacer } from '/src/components';
import Sessions from '/src/containers/Sessions';

import UserForm from './UserForm';
import UserList from './UserList';

const PageColumn = styled.div`
  display: flex;
  flex-direction: column;
  flex-grow: 1;
`;

const UsersPage = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const [users, setUsers] = useState([]);

  const navigate = useNavigate();

  const [userData, setUserData] = useState({});
  const [loading, setLoading] = useState(false);

  const currentId = useMemo(() => {
    const intId = parseInt(searchParams.get('id'));
    if (!isNaN(intId)) return intId;
    return null;
  }, [searchParams]);

  const loadUsers = () => {
    setLoading(true);
    nebula
      .request('list-users')
      .then((res) => {
        setUsers(
          res.data.users.map((user) => ({
            ...user,
            password: undefined,
            api_key: undefined,
            api_key_preview: user.api_key,
          }))
        );
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadUsers();
  }, []);

  useEffect(() => {
    if (currentId) {
      const user = users.find((user) => user.id === currentId);
      if (user) {
        setUserData(user);
        return;
      }
    }
    const doCopy = new URLSearchParams(window.location.search).get('copy');
    if (!doCopy) setUserData({});
  }, [currentId, users]);

  const onSelect = (userId) => {
    navigate(`/system/users?id=${userId}`);
  };

  const onSave = () => {
    nebula
      .request('save-user', userData)
      .then(() => {
        loadUsers();
        toast.success('User saved');
      })
      .catch((err) => {
        toast.error('Error saving user');
        console.error(err);
      })
      .finally(() => {
        setUserData((data) => ({
          ...data,
          password: undefined,
          api_key: undefined,
        }));
      });
  };

  const copyUser = () => {
    const copy = { ...userData };
    for (const key of [
      'id',
      'login',
      'password',
      'api_key',
      'api_key_preview',
      'full_name',
      'email',
    ])
      copy[key] = undefined;
    navigate('/system/users?copy=true');
    setUserData(copy);
  };

  return (
    <main className="row">
      <section className="transparent column">
        <Navbar>
          <Button
            icon="person_add"
            label="New user"
            onClick={() => navigate('/system/users')}
          />
          <Button
            icon="content_copy"
            label="Duplicate user"
            tooltip="Create a new user by copying the current one"
            onClick={() => copyUser()}
            disabled={!userData?.id}
          />
          <Spacer />
        </Navbar>

        <UserList
          users={users}
          currentId={currentId}
          onSelect={onSelect}
          loading={loading}
        />
      </section>

      <section className="transparent column grow">
        <Navbar>
          <div className="left"></div>

          <div className="center">
            <NavbarTitle>{userData.login || 'New User'}</NavbarTitle>
          </div>

          <div className="right">
            <Button icon="check" label="Delete user" onClick={onSave} disabled={true} />
            <Button icon="check" label="Save user" onClick={onSave} />
          </div>
        </Navbar>
        <UserForm userData={userData} setUserData={setUserData} />
      </section>

      <section className="transparent column grow">
        <Sessions userId={userData?.id} />
      </section>
    </main>
  );
};

export default UsersPage;
