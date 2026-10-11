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

// Same as the server's minimum, checked before anything is saved
const MIN_PASSWORD_LENGTH = 8;

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

  const loadUsers = useCallback(async () => {
    setLoading(true);
    try {
      const all: User[] = [];
      let cursor: string | undefined;
      do {
        const { data } = await nebula.usersList({
          query: { sort: 'login', limit: 1000, cursor },
          throwOnError: true,
        });
        all.push(...data.items);
        cursor = data.next_cursor ?? undefined;
      } while (cursor);
      setUsers(all);
    } catch (err: unknown) {
      toast.error(`Unable to load users: ${getErrorDetail(err)}`);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadUsers();
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

  const onSave = async () => {
    const { password } = userData;
    if (password && password.length < MIN_PASSWORD_LENGTH) {
      toast.error(`Password must have at least ${MIN_PASSWORD_LENGTH} characters`);
      return;
    }

    let user: User;
    try {
      const changes = userChanges(userData);
      const response = userData.id
        ? await nebula.usersUpdate({
            path: { user_id: userData.id },
            body: changes,
            throwOnError: true,
          })
        : await nebula.usersCreate({
            body: { ...changes, login: userData.login || '' },
            throwOnError: true,
          });
      user = response.data;
    } catch (err: unknown) {
      toast.error(`Error saving user: ${getErrorDetail(err)}`);
      return;
    }

    // The user is saved: show it even if setting the password fails, so
    // saving again updates it instead of creating it a second time
    setUserData((data) => ({ ...data, password: undefined }));
    void loadUsers();
    if (user.id !== userData.id) void navigate(`/system/users?id=${user.id}`);

    if (!password) {
      toast.success('User saved');
      return;
    }
    try {
      await nebula.usersSetPassword({
        path: { user_id: user.id },
        body: { password },
        throwOnError: true,
      });
      toast.success('User saved');
    } catch (err: unknown) {
      toast.error(`User saved, but the password wasn't set: ${getErrorDetail(err)}`);
    }
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
        <Button icon="check" label="Delete user" disabled={true} />
        <Button icon="check" label="Save user" onClick={() => void onSave()} />
      </Navbar>

      <UserForm userData={userData} setUserData={setUserData} />
      <Sessions userId={userData?.id ?? undefined} />
    </main>
  );
};

export default UsersPage;
