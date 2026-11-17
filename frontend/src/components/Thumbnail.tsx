import { useEffect, useState } from 'react';

import { Icon } from './Icon';

// The server's Retry-After for a thumbnail that isn't made yet (spec 011)
const RETRY_MS = 2000;

const thumbnailUrl = (id: number, hash: string, retry: boolean) =>
  `/api/v2/assets/${id}/thumbnail?hash=${hash}${retry ? '&retry=1' : ''}`;

interface ThumbnailProps {
  // The asset and its `thumbnail_hash`; without a hash, only the placeholder
  id?: number;
  hash?: string | null;
}

// The placeholder shows until the picture covers it. After an error
// (404, or 503 from a busy server) the picture is asked for once more.
// Give it `key={hash}`, so a new picture starts afresh.
export const Thumbnail = ({ id, hash }: ThumbnailProps) => {
  const [errors, setErrors] = useState(0);
  const [retry, setRetry] = useState(false);

  useEffect(() => {
    if (errors !== 1) return;
    const timer = setTimeout(() => {
      setRetry(true);
    }, RETRY_MS);
    return () => {
      clearTimeout(timer);
    };
  }, [errors]);

  const waiting = errors === 1 && !retry;
  return (
    <div className="thumbnail">
      <Icon icon="image" />
      {id && hash && errors < 2 && !waiting && (
        <img
          src={thumbnailUrl(id, hash, retry)}
          alt=""
          loading="lazy"
          onError={() => {
            setErrors((count) => count + 1);
          }}
        />
      )}
    </div>
  );
};
