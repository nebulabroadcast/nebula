import { InputTimecode, Button, Section } from '@components';
import { VideoPlayerRef } from '@containers/VideoPlayer/types.ts';
import { useKeyDown } from '@lib/useKeyDown';

import type { AssetData } from './types.ts';

interface SidePanelMainProps {
  assetData: AssetData;
  frameRate: number;
  selection: { mark_in: number | null; mark_out: number | null };
  setSelection: React.Dispatch<
    React.SetStateAction<{ mark_in: number | null; mark_out: number | null }>
  >;
  patchAsset: (data: Partial<AssetData>) => void;
  position: number;
  videoPlayerRef: React.RefObject<VideoPlayerRef | null>;
}

export const SidePanelMain = ({
  assetData,
  frameRate,
  selection,
  setSelection,
  patchAsset,
  position,
  videoPlayerRef,
}: SidePanelMainProps) => {
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

  const onSetMarks = () => {
    // Set asset mark_in and mark_out values
    // (content primary selection)
    patchAsset({
      mark_in: selection.mark_in || undefined,
      mark_out: selection.mark_out || undefined,
    });
  };

  useKeyDown('v', onSetMarks);

  return (
    <Section
      className="grow"
      style={{ display: 'flex', flexDirection: 'column', gap: 8 }}
    >
      <h4 data-tooltip="Define the content boundaries by setting mark in and mark out points.">
        Content boundaries
      </h4>

      <div
        style={{ display: 'flex', gap: 4, alignItems: 'center', flexDirection: 'row' }}
      >
        <Button
          icon="screenshot_region"
          tooltip="Marks from selection"
          onClick={onSetMarks}
        />
        <Button
          icon="delete"
          tooltip="Clear marks"
          onClick={() => {
            patchAsset({ mark_in: undefined, mark_out: undefined });
          }}
        />
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
          icon="frame_inspect"
          tooltip="Marks to selection"
          onClick={() => {
            setSelection({
              mark_in: assetData.mark_in ?? null,
              mark_out: assetData.mark_out ?? null,
            });
          }}
        />
      </div>

      <h4 data-tooltip="Set a representative frame for the asset">Poster frame</h4>

      <Button icon="image" label="Set poster frame" onClick={setPosterFrame} />
      <Button
        icon="frame_inspect"
        label="Go to poster frame"
        onClick={goToPosterFrame}
      />
      <Button icon="delete" label="Clear poster frame" onClick={clearPosterFrame} />
    </Section>
  );
};
