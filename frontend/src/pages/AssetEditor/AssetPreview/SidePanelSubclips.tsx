import { Section, Spacer, Button, Navbar } from '@components';
import type { VideoPlayerRef } from '@containers/VideoPlayer/types.ts';
import { useKeyDown } from '@lib/useKeyDown';
import { arrayEquals } from '@lib/utils';
import React, { useEffect } from 'react';
import { toast } from 'react-toastify';

import { SubclipWidget } from './SubclipWidget';
import type { SubclipData, AssetData } from './types.ts';

interface SidePanelSubclipsProps {
  assetData: AssetData;
  frameRate: number;
  selection: { mark_in: number | null; mark_out: number | null };
  setSelection: React.Dispatch<
    React.SetStateAction<{ mark_in: number | null; mark_out: number | null }>
  >;
  patchAsset: (data: Partial<AssetData>) => void;
  videoPlayerRef: React.RefObject<VideoPlayerRef | null>;
}

export const SidePanelSubclips: React.FC<SidePanelSubclipsProps> = ({
  assetData,
  frameRate,
  selection,
  setSelection,
  patchAsset,
  videoPlayerRef,
}) => {
  const [subclips, setSubclips] = React.useState<SubclipData[]>([]);

  useEffect(() => {
    setSubclips(assetData.subclips || []);
  }, [assetData?.id]); //eslint-disable-line

  useEffect(() => {
    // when subclip list changes, update it in asset data
    if (!assetData) return;
    const existingSubclips = assetData.subclips || [];
    if (!arrayEquals(existingSubclips, subclips)) {
      patchAsset({ subclips });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [subclips]);

  // Helper functions

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
        mark_in: selection.mark_in || 0,
        mark_out: selection.mark_out || 0,
      },
    ]);
  };

  // Keyboard shortcuts

  useKeyDown('v', onNewSubclip);

  // Render

  return (
    <>
      <Navbar>
        <Button
          icon="add"
          onClick={onNewSubclip}
          label="New subclip"
          tooltip="Create a new subclip from the current selection (shortcut: V)"
        />
      </Navbar>
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
          {subclips.map((subclip: SubclipData, index: number) => (
            <SubclipWidget
              key={index}
              index={index}
              setSubclips={setSubclips}
              selection={selection}
              setSelection={setSelection}
              fps={frameRate}
              title={subclip.title}
              mark_in={subclip.mark_in}
              mark_out={subclip.mark_out}
              onSeek={(time) => {
                videoPlayerRef.current?.seek(time);
              }}
            />
          ))}
          <Spacer />
        </div>
      </Section>
    </>
  );
};
