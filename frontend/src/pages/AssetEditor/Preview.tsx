import { Dropdown, Spacer, InputTimecode, Navbar, Button, Section } from '@components';
import VideoPlayer from '@containers/VideoPlayer';
import { VideoPlayerRef } from '@containers/VideoPlayer/types';
import { useKeyDown } from '@lib/useKeyDown';
import { arrayEquals } from '@lib/utils';
import axios from 'axios';
import React, { useState, useEffect, useMemo, useRef } from 'react';
import { toast } from 'react-toastify';

import Subclip from './Subclip';

import nebula from '@/nebula';

interface SubclipData {
  title: string;
  mark_in: number;
  mark_out: number;
}

interface SubclipsPanelProps {
  subclips: SubclipData[];
  setSubclips: React.Dispatch<React.SetStateAction<SubclipData[]>>;
  selection: { mark_in: number | null; mark_out: number | null };
  setSelection: React.Dispatch<
    React.SetStateAction<{ mark_in: number | null; mark_out: number | null }>
  >;
  fps: number;
  onSeek: (time: number) => void;
}

const SubclipsPanel: React.FC<SubclipsPanelProps> = ({
  subclips,
  setSubclips,
  selection,
  setSelection,
  fps,
  onSeek,
}) => {
  return (
    <Section className="grow">
      <div
        className="contained column"
        style={{
          overflowY: 'scroll',
          display: 'flex',
          gap: 8,
          justifyContent: 'flex-start',
          padding: 6,
        }}
      >
        {subclips.map((subclip, index) => (
          <Subclip
            key={index}
            index={index}
            setSubclips={setSubclips}
            selection={selection}
            setSelection={setSelection}
            fps={fps}
            onSeek={onSeek}
            {...subclip}
          />
        ))}
        <Spacer />
      </div>
    </Section>
  );
};

interface AssetData extends Record<string, any> {
  id?: number;
  'file/mtime'?: number;
  'video/fps_f'?: number;
  mark_in?: number;
  mark_out?: number;
  subclips?: SubclipData[];
  poster_frame?: number;
  title?: string;
  subtitle?: string;
}

interface ProxyInfo {
  id: number;
  available: boolean;
  timestamp: number;
}

interface PreviewProps {
  assetData: AssetData;
  setAssetData: React.Dispatch<React.SetStateAction<AssetData>>;
}

const Preview: React.FC<PreviewProps> = ({ assetData, setAssetData }) => {
  const accessToken = nebula.getAccessToken();
  const videoPlayerRef = useRef<VideoPlayerRef>(null);
  const [selection, setSelection] = useState<{
    mark_in: number | null;
    mark_out: number | null;
  }>({ mark_in: null, mark_out: null });
  const [subclips, setSubclips] = useState<SubclipData[]>([]);
  const [position, setPosition] = useState(0);
  const [proxyInfo, setProxyInfo] = useState<ProxyInfo | null>(null);
  const [loading, setLoading] = useState(true);

  const setMarkIn = (mark_in: number | null) => {
    setSelection((s) => {
      if (mark_in === null || isNaN(mark_in)) return s;
      if (mark_in === s.mark_in) return s;
      return { ...s, mark_in };
    });
  };

  const setMarkOut = (mark_out: number | null) => {
    setSelection((s) => {
      if (mark_out === null || isNaN(mark_out)) return s;
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
    axios
      .get<ProxyInfo>(`/proxy/${assetData.id}/info`)
      .then((response) => {
        setProxyInfo(response.data);
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

  const frameRate = useMemo(() => {
    const fps = assetData['video/fps_f'] || 25.0;
    return fps;
  }, [assetData]);

  const patchAsset = (data: Partial<AssetData>) => {
    console.log('Patching asset with data', data);
    // helper function to update asset data
    if (!data) return;
    setAssetData((o) => {
      return { ...o, ...data };
    });
  };

  useEffect(() => {
    setSelection({
      mark_in: assetData.mark_in ?? null,
      mark_out: assetData.mark_out ?? null,
    });
    setSubclips(assetData.subclips || []);
  }, [assetData?.id]); //eslint-disable-line

  useEffect(() => {
    // when subclip list changes, update it in asset data
    if (!assetData) return;
    const existingSubclips = assetData.subclips || [];
    if (!arrayEquals(existingSubclips, subclips)) {
      patchAsset({ subclips });
    }
  }, [subclips]);

  // Dropdown menu options for poster frame

  const setPosterFrame = () => {
    patchAsset({ poster_frame: position });
  };

  const goToPosterFrame = () => {
    if (assetData.poster_frame !== undefined) {
      videoPlayerRef.current?.seek(assetData.poster_frame);
    }
  };

  const clearPosterFrame = () => {
    patchAsset({ poster_frame: undefined });
  };

  const posterOptions = [
    { label: 'Set poster frame', onClick: setPosterFrame },
    { label: 'Go to poster frame', onClick: goToPosterFrame },
    { label: 'Clear poster frame', onClick: clearPosterFrame },
  ];

  // Actions

  const onSetMarks = () => {
    // Set asset mark_in and mark_out values
    // (content primary selection)
    patchAsset({
      mark_in: selection.mark_in || undefined,
      mark_out: selection.mark_out || undefined,
    });
  };

  const onNewSubclip = () => {
    if (!(selection.mark_in && selection.mark_out)) {
      toast.error('Please select a region first');
      return;
    }

    if (selection.mark_in >= selection.mark_out) {
      toast.error('Please select a valid region');
      return;
    }

    if (selection.mark_out - selection.mark_in < 2.0 / frameRate) {
      toast.error('Region must be at least 2 frames long');
      return;
    }

    setSubclips((subclips) => [
      ...subclips,
      {
        title: `SubClip ${subclips.length + 1}`,
        mark_in: selection.mark_in!,
        mark_out: selection.mark_out!,
      },
    ]);
  };

  // Keyboard shortcuts

  useKeyDown('v', onNewSubclip);

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

      <div className="column" style={{ minWidth: 400 }}>
        <Navbar>
          <InputTimecode
            value={assetData.mark_in}
            readOnly={true}
            tooltip="Content start"
            fps={frameRate}
          />
          <InputTimecode
            value={assetData.mark_out}
            readOnly={true}
            tooltip="Content end"
            fps={frameRate}
          />
          <Button
            icon="screenshot_region"
            tooltip="Marks from selection"
            onClick={onSetMarks}
          />
          <Button
            icon="frame_inspect"
            tooltip="Marks to selection"
            onClick={() => {
              setSelection({
                mark_in: assetData.mark_in ?? null,
                mark_out: assetData.mark_out ?? null,
              });
            }}
          />
          <Spacer />
          <Button icon="add" tooltip="New subclip" onClick={onNewSubclip} />
          <Dropdown icon="image" align="right" options={posterOptions} />
        </Navbar>

        <SubclipsPanel
          subclips={subclips}
          setSubclips={setSubclips}
          selection={selection}
          setSelection={setSelection}
          fps={frameRate}
          onSeek={(t) => videoPlayerRef.current?.seek(t)}
        />
      </div>
    </div>
  );
};

export default Preview;
