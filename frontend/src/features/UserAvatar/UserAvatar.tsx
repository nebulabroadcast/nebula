import { Button, Icon } from '@components';
import { getErrorDetail } from '@lib/utils';
import React, { useEffect, useRef, useState } from 'react';
import { toast } from 'react-toastify';
import styled from 'styled-components';

import nebula from '@/nebula';

const AVATAR_TYPES = ['image/png', 'image/jpeg', 'image/webp'];
const SIZE = 112;

const AvatarContainer = styled.div`
  position: relative;
  flex-shrink: 0;
  width: ${SIZE}px;
  height: ${SIZE}px;
  border-radius: 50%;
  overflow: hidden;
  background: var(--color-surface-03);
  display: flex;
  align-items: center;
  justify-content: center;

  img {
    width: 100%;
    height: 100%;
    object-fit: cover;
  }

  .placeholder {
    font-size: ${SIZE / 2}px;
    color: var(--color-text-dim);
  }

  .actions {
    position: absolute;
    inset: 0;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 4px;
    background: rgba(0, 0, 0, 0.5);
    opacity: 0;
    transition: opacity 0.15s;
  }

  &:hover .actions,
  .actions:focus-within {
    opacity: 1;
  }
`;

interface UserAvatarProps {
  // Avatars belong to saved users only
  userId?: number;
}

const UserAvatar: React.FC<UserAvatarProps> = ({ userId }) => {
  const fileInput = useRef<HTMLInputElement>(null);
  // Bumped after changes, so the browser fetches the image again
  const [version, setVersion] = useState(0);
  const [hasAvatar, setHasAvatar] = useState(false);

  useEffect(() => {
    setHasAvatar(Boolean(userId));
  }, [userId, version]);

  const onUpload = (file: File) => {
    if (!userId) return;
    nebula
      .usersAvatarUpload({
        path: { user_id: userId },
        body: file,
        headers: { 'Content-Type': file.type },
        throwOnError: true,
      })
      .then(() => {
        setVersion((v) => v + 1);
      })
      .catch((err: unknown) => {
        toast.error(`Unable to upload avatar: ${getErrorDetail(err)}`);
      });
  };

  const onRemove = () => {
    if (!userId) return;
    nebula
      .usersAvatarDelete({ path: { user_id: userId }, throwOnError: true })
      .then(() => {
        setVersion((v) => v + 1);
      })
      .catch((err: unknown) => {
        toast.error(`Unable to remove avatar: ${getErrorDetail(err)}`);
      });
  };

  return (
    <AvatarContainer>
      {userId && hasAvatar ? (
        // Authenticated by the session cookie
        <img
          src={`/api/v2/users/${userId}/avatar?v=${version}`}
          alt=""
          onError={() => {
            setHasAvatar(false);
          }}
        />
      ) : (
        <Icon icon="person" className="placeholder" />
      )}

      {userId && (
        <div className="actions">
          <Button
            icon="upload"
            tooltip={hasAvatar ? 'Change avatar' : 'Upload avatar'}
            onClick={() => {
              fileInput.current?.click();
            }}
          />
          {hasAvatar && (
            <Button icon="delete" tooltip="Remove avatar" onClick={onRemove} />
          )}
        </div>
      )}

      <input
        ref={fileInput}
        type="file"
        accept={AVATAR_TYPES.join(',')}
        style={{ display: 'none' }}
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) onUpload(file);
          e.target.value = '';
        }}
      />
    </AvatarContainer>
  );
};

export default UserAvatar;
