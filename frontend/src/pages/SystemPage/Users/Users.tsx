import Sessions from '@containers/Sessions';
import { useNebula } from '@features/Nebula';
import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate, useSearchParams } from 'react-router';
import { toast } from 'react-toastify';

import nebula from '@/nebula';
import { Navbar, NavbarTitle, Button, Spacer } from '@components';
import type { UserModel } from '../../../client';

import UserForm from './UserForm';
import UserList from './UserList';

const UsersPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const [users, setUsers] = useState<UserModel[]>([]);
  const navigate = useNavigate();
  const [userData, setUserData] = useState<Partial<UserModel>>({});
  const [loading, setLoading] = useState(false);

  const { setPageTitle } = useNebula();
  useEffect(() => {
    setPageTitle('User Management');
  }, [setPageTitle]);

  const currentId = useMemo(() => {
    const idParam = searchParams.get('id');
    if (idParam) {
      const intId = parseInt(idParam);
      if (!isNaN(intId)) return intId;
    }
    return null;
  }, [searchParams]);

  const loadUsers = () => {
    setLoading(true);
    nebula
      .request('list-users')
      .then((res) => {
        setUsers(
          res.data.users.map((user: UserModel) => ({
            ...user,
            password: undefined,
            api_key: undefined,
            api_key_preview: (user as any).api_key,
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
      const user = users.find((u) => u.id === currentId);
      if (user) {
        setUserData(user);
        return;
      }
    }
    const doCopy = new URLSearchParams(window.location.search).get('copy');
    if (!doCopy) setUserData({});
  }, [currentId, users]);

  const onSelect = (userId: number | string) => {
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
    const keysToRemove: (keyof UserModel)[] = [
      'id',
      'login',
      'password',
      'api_key',
      'full_name',
      'email',
    ];
    for (const key of keysToRemove) {
      delete copy[key];
    }
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
        <Sessions userId={userData?.id ?? undefined} />
      </section>
    </main>
  );
};

export default UsersPage;
