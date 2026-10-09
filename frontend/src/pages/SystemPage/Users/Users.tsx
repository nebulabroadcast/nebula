import type { User, UserPatch } from '@client';
import { Navbar, NavbarTitle, Button, Spacer } from '@components';
import Sessions from '@containers/Sessions';
import { useNebula } from '@features/Nebula';
import { getErrorDetail } from '@lib/utils';
import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useNavigate, useSearchParams } from 'react-router';
import { toast } from 'react-toastify';

import UserForm from './UserForm';
import UserList from './UserList';

import nebula from '@/nebula';

import './Users.css';

// The user being edited. The password is set with its own request on save.
export type UserDraft = Partial<User> & { password?: string };

// Fields this page edits. Other fields (e.g. user metatypes) stay untouched.
const userChanges = (draft: UserDraft): UserPatch => ({
  full_name: draft.full_name || null,
  email: draft.email || null,
  is_admin: draft.is_admin ?? false,
  is_limited: draft.is_limited ?? false,
  local_network_only: draft.local_network_only ?? false,
  permissions: draft.permissions ?? undefined,
});

const UsersPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const [users, setUsers] = useState<User[]>([]);
  const navigate = useNavigate();
  const [userData, setUserData] = useState<UserDraft>({});
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

  const loadUsers = useCallback(() => {
    setLoading(true);
    nebula
      .usersList({ query: { sort: 'login', limit: 1000 }, throwOnError: true })
      .then((res) => {
        setUsers(res.data.items);
      })
      .catch((err: unknown) => {
        toast.error(`Unable to load users: ${getErrorDetail(err)}`);
      })
      .finally(() => {
        setLoading(false);
      });
  }, []);

  useEffect(() => {
    loadUsers();
  }, [loadUsers]);

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
    void navigate(`/system/users?id=${userId}`);
  };

  const saveUser = async (): Promise<User> => {
    const changes = userChanges(userData);
    const { data: user } = userData.id
      ? await nebula.usersUpdate({
          path: { user_id: userData.id },
          body: changes,
          throwOnError: true,
        })
      : await nebula.usersCreate({
          body: { ...changes, login: userData.login || '' },
          throwOnError: true,
        });

    if (userData.password) {
      await nebula.usersSetPassword({
        path: { user_id: user.id },
        body: { password: userData.password },
        throwOnError: true,
      });
    }
    return user;
  };

  const onSave = () => {
    saveUser()
      .then((user) => {
        toast.success('User saved');
        loadUsers();
        if (user.id !== userData.id) void navigate(`/system/users?id=${user.id}`);
      })
      .catch((err: unknown) => {
        toast.error(`Error saving user: ${getErrorDetail(err)}`);
      })
      .finally(() => {
        setUserData((data) => ({ ...data, password: undefined }));
      });
  };

  const copyUser = () => {
    const copy = { ...userData };
    const keysToRemove: Array<keyof UserDraft> = [
      'id',
      'login',
      'password',
      'full_name',
      'email',
      'api_key_preview',
      'has_password',
    ];
    for (const key of keysToRemove) {
      Reflect.deleteProperty(copy, key);
    }
    void navigate('/system/users?copy=true');
    setUserData(copy);
  };

  return (
    <main className="users-page">
      <section className="transparent column user-list">
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
            onClick={() => {
              copyUser();
            }}
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

      <Navbar className="editor-nav">
        <Spacer />
        <NavbarTitle>{userData.login || 'New User'}</NavbarTitle>
        <Spacer />
        <Button icon="check" label="Delete user" onClick={onSave} disabled={true} />
        <Button icon="check" label="Save user" onClick={onSave} />
      </Navbar>

      <UserForm userData={userData} setUserData={setUserData} onChanged={loadUsers} />
      <Sessions userId={userData?.id ?? undefined} />
    </main>
  );
};

export default UsersPage;
