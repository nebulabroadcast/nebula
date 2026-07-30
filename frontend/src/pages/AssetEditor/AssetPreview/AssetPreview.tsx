import VideoPlayer from '@containers/VideoPlayer';
import { VideoPlayerRef } from '@containers/VideoPlayer/types';
import React, { useState, useEffect, useMemo, useRef } from 'react';

import { SidePanel } from './SidePanel';
import type { AssetData, ProxyInfo } from './types';

import nebula from '@/nebula';

interface PreviewProps {
  assetData: AssetData;
  setAssetData: React.Dispatch<React.SetStateAction<AssetData>>;
}

export const AssetPreview: React.FC<PreviewProps> = ({ assetData, setAssetData }) => {
  const accessToken = nebula.getAccessToken();
  const videoPlayerRef = useRef<VideoPlayerRef>(null);

  // Current active selection
  const [selection, setSelection] = useState<{
    mark_in: number | null;
    mark_out: number | null;
  }>({ mark_in: null, mark_out: null });

  const [position, setPosition] = useState(0);
  const [proxyInfo, setProxyInfo] = useState<ProxyInfo | null>(null);
  const [loading, setLoading] = useState(true);

  const frameRate = assetData['video/fps_f'] || 25;

  useEffect(() => {
    setSelection({
      mark_in: assetData.mark_in ?? null,
      mark_out: assetData.mark_out ?? null,
    });
  }, [assetData?.id]); //eslint-disable-line

  const setMarkIn = (mark_in: number | null) => {
    setSelection((s) => {
      if (mark_in === s.mark_in) return s;
      return { ...s, mark_in };
    });
  };

  const setMarkOut = (mark_out: number | null) => {
    setSelection((s) => {
      if (mark_out === s.mark_out) return s;
      return { ...s, mark_out };
    });
  };

  useEffect(() => {
    setLoading(true);
    if (!assetData.id) {
      setProxyInfo(null);
      setLoading(false);
      return;
    }
    nebula
      .getProxyInfo({ path: { id_asset: assetData.id }, throwOnError: true })
      .then((response) => {
        setProxyInfo(response.data as ProxyInfo);
      })
      .catch(() => {
        setProxyInfo(null);
      })
      .finally(() => {
        setLoading(false);
      });
  }, [assetData.id]);

  const warning = useMemo(() => {
    if (loading) return undefined;

    if (!assetData.id) return 'No asset selected';

    if (!(proxyInfo?.id === assetData?.id)) return '';

    if (!proxyInfo.available) return 'No proxy available';

    if (assetData['file/mtime'] && proxyInfo.timestamp < assetData['file/mtime'])
      return 'Proxy is outdated';

    return undefined;
  }, [proxyInfo, assetData, loading]);

  // Video source

  const videoSrc = useMemo(
    () =>
      (accessToken &&
        assetData.id &&
        proxyInfo?.id === assetData.id &&
        proxyInfo?.timestamp &&
        `/proxy/${assetData.id}?token=${accessToken}&ts=${proxyInfo.timestamp}`) ||
      undefined,
    [assetData.id, accessToken, proxyInfo]
  );

  return (
    <div className="grow row">
      <div className="column" style={{ minWidth: 300, flexGrow: 1 }}>
        <VideoPlayer
          ref={videoPlayerRef}
          src={videoSrc}
          frameRate={frameRate}
          setPosition={setPosition}
          markIn={selection.mark_in ?? undefined}
          markOut={selection.mark_out ?? undefined}
          setMarkIn={setMarkIn}
          setMarkOut={setMarkOut}
          marks={
            assetData.poster_frame !== undefined
              ? { poster_frame: assetData.poster_frame }
              : undefined
          }
          warning={warning}
        />
      </div>

      <SidePanel
        assetData={assetData}
        setAssetData={setAssetData}
        videoPlayerRef={videoPlayerRef}
        position={position}
        selection={selection}
        setSelection={setSelection}
      />
    </div>
  );
};
