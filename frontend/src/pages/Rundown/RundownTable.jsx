import { useMemo, useRef, useEffect } from 'react';
import { useSelector } from 'react-redux';
import { useSearchParams, useLocation } from 'react-router-dom';

import nebula from '/src/nebula';
import { Table } from '/src/components';
import { useDialog } from '/src/hooks';
import { formatRowHighlightColor, formatRowHighlightStyle } from '/src/tableFormat';

import RundownTableWrapper from './RundownTableWrapper';
import { getRunModeOptions, getRundownColumns } from './utils';

const RundownTable = ({
  data,
  draggedObjects,
  onDrop,
  currentItem,
  cuedItem,
  loading,
  selectedItems,
  setSelectedItems,
  selectedEvents,
  setSelectedEvents,
  focusedObject,
  setFocusedObject,
  rundownMode,
  loadRundown,
  onError,
}) => {
  const [_searchParams, setSearchParams] = useSearchParams();
  const location = useLocation();
  const lastHash = useRef('');
  const currentChannel = useSelector((state) => state.context.currentChannel);
  const tableRef = useRef();
  const showDialog = useDialog();

  const channelConfig = useMemo(() => {
    return nebula.getPlayoutChannel(currentChannel);
  }, [currentChannel]);

  //
  // Scroll to the event definded in the hash when the component mounts
  //

  useEffect(() => {
    if (!location.hash) return;
    if (!data?.length) return;
    if (!tableRef.current) return;
    // already scrolled to this hash
    if (lastHash.current === location.hash.slice(1)) return;

    // find the index of the event to scroll to
    let scrollToIndex = null;
    for (let i = 0; i < data.length; i++) {
      const row = data[i];
      if (row.type === 'event' && row.id == location.hash.slice(1)) {
        scrollToIndex = i;
        break;
      }
    }
    // get the row element and scroll to it
    const query = `[data-index="${scrollToIndex}"]`;
    const row = tableRef.current.querySelector(query);
    if (row) {
      const pos = row.offsetTop - row.parentNode.offsetTop;
      const parent = row.parentNode.parentNode.parentNode; // he he he
      parent.scrollTop = pos;
      lastHash.current = location.hash.slice(1);
    }
  }, [location, data]);

  //
  // Define table columns and additional styling
  //

  const columns = useMemo(() => getRundownColumns(), []);

  const getRundownRowClass = (rowData) => {
    if (rowData.type === 'event') return 'event-row';
    if (rowData.id === currentItem) return 'current-item';
    if (rowData.id === cuedItem) return 'cued-item';
  };

  //
  // Operations on selected items
  //

  const deleteSelectedItems = () => {
    if (!selectedItems.length) return;
    console.debug('Deleting items:', selectedItems);
    const payload = { object_type: 'item', ids: selectedItems };
    nebula.request('delete', payload).then(loadRundown).catch(onError);
  };

  const onSendTo = () => {
    const ids = data
      .filter((row) => row.id_asset && selectedItems.includes(row.id))
      .map((row) => row.id_asset);
    if (!ids.length) return;

    showDialog('sendto', 'Send to...', { assets: ids })
      .then(() => {})
      .catch(() => {});
  };

  const onSetPrimary = async () => {
    const id_asset = focusedObject.id_asset;
    const id_event = focusedObject.id_event;
    try {
      const res = await nebula.request('get', {
        object_type: 'asset',
        ids: [id_asset],
      });
      console.log('Asset:', res.data.data);
      if (!res.data?.data?.length) {
        console.error('Asset not found:', id_asset);
        return;
      }
      const meta = res.data.data[0];
      const emeta = {};
      for (const field of channelConfig.fields) {
        const key = field.name;
        emeta[key] = meta[key] || null;
      }
      emeta.id_asset = id_asset;
      await nebula.request('set', {
        object_type: 'event',
        id: id_event,
        data: emeta,
      });

      loadRundown();
    } catch (err) {
      onError(err);
      return;
    }
  };

  const onSolve = (solver) => {
    const items = data
      .filter(
        (row) => row.item_role === 'placeholder' && selectedItems.includes(row.id)
      )
      .map((row) => row.id);
    // TODO: dialog to select solver
    nebula.request('solve', { solver, items }).then(loadRundown).catch(onError);
  };

  const updateObject = (object_type, id, data) => {
    const operations = [{ object_type, id, data }];
    nebula.request('ops', { operations }).then(loadRundown).catch(onError);
  };

  const setRunMode = (object_type, id, run_mode) => {
    updateObject(object_type, id, { run_mode });
  };

  const editObject = async (object_type, id) => {
    let objectData = {};
    try {
      const res = await nebula.request('get', {
        object_type,
        ids: [id],
      });
      objectData = res.data.data[0];
    } catch (err) {
      onError(err);
      return;
    }

    // Create a field list based on the object type

    let fields;
    if (object_type === 'event') {
      fields = [...channelConfig.fields];
    } else if (objectData.item_role === 'placeholder') {
      fields = [{ name: 'title' }, { name: 'duration' }];
    } else if (['lead_in', 'lead_out'].includes(objectData.item_role)) {
      return;
    } else if (objectData.id_asset) {
      fields = [
        { name: 'title' },
        { name: 'subtitle' },
        { name: 'note' },
        { name: 'mark_in' },
        { name: 'mark_out' },
      ];
    } else {
      return;
    }

    // if the object is item with asset, we need to get the asset data

    if (object_type === 'item' && objectData.id_asset) {
      try {
        const res = await nebula.request('get', {
          object_type: 'asset',
          ids: [objectData.id_asset],
        });
        const assetData = res.data.data[0];
        for (const field of fields) {
          const key = field.name;
          if (!objectData.key) objectData[key] = assetData[key];
        }
      } catch (err) {
        onError(err);
        return;
      }
    }

    // construct the form title and initial data

    const title = `Edit ${object_type}: ${objectData.title}`;
    const initialData = {};
    for (const field of fields) {
      initialData[field.name] = objectData[field.name];
    }

    try {
      const newData = await showDialog('metadata', title, {
        fields,
        initialData,
      });
      updateObject(object_type, id, newData);
    } catch {
      // dialog was cancelled
    }
  };

  //
  // User interaction && Selection handling
  //

  const onRowClick = (rowData, event) => {
    if (rowData.type === 'event') {
      setSelectedItems([]);
      setSelectedEvents([rowData.id]);
      return;
    }

    if (rowData.id_asset) {
      const id_asset = rowData.id_asset;
      setSearchParams((o) => {
        o.set('asset', id_asset);
        return o;
      });
    }

    setSelectedEvents([]);
    if (event.detail === 2) {
      // doubleClick
      if (rundownMode === 'control' && rowData.type === 'item') {
        nebula
          .request('playout', {
            id_channel: currentChannel,
            action: 'cue',
            payload: { id_item: rowData.id },
          })
          .then(loadRundown)
          .catch(onError);
        return;
      }
    }

    let newSelectedItems = [];
    if (event.ctrlKey) {
      if (selectedItems.includes(rowData.id)) {
        newSelectedItems = selectedItems.filter((obj) => obj !== rowData.id);
      } else {
        newSelectedItems = [...selectedItems, rowData.id];
      }
    } else if (event.shiftKey) {
      const clickedIndex = data.findIndex((row) => row.id === rowData.id);
      const focusedIndex =
        data.findIndex((row) => row.id === focusedObject.id) ||
        data.findIndex((row) => selectedItems.includes(row.id)) ||
        clickedIndex ||
        0;

      const min = Math.min(clickedIndex, focusedIndex);
      const max = Math.max(clickedIndex, focusedIndex);

      // Get the ids of the rows in the range
      const rangeIds = data
        .slice(min, max + 1)
        .filter((row) => row.type === 'item')
        .map((row) => row.id);

      newSelectedItems = [...new Set([...selectedItems, ...rangeIds])];
    } else {
      newSelectedItems = [rowData.id];
    }

    setSelectedItems(newSelectedItems);
    setFocusedObject(rowData);
  }; // onRowClick

  const focusNext = (offset) => {
    if (!focusedObject) return;
    const nextIndex =
      data.findIndex(
        (row) => row.type === focusedObject.type && row.id === focusedObject.id
      ) + offset;
    if (nextIndex < data.length) {
      const nextRow = data[nextIndex];
      setSelectedItems([nextRow.id]);
      setFocusedObject(nextRow);
    }
  };

  const onKeyDown = (e) => {
    if (e.key === 'ArrowDown') {
      focusNext(1);
      e.preventDefault();
    } else if (e.key === 'ArrowUp') {
      focusNext(-1);
      e.preventDefault();
    } else if (e.key === 'Delete') {
      deleteSelectedItems();
      e.preventDefault();
    }
  };

  const contextMenu = () => {
    const res = [];
    if (selectedItems.length) {
      if (selectedItems.length === 1) {
        res.push({
          label: 'Edit item',
          icon: 'edit',
          onClick: () => editObject('item', selectedItems[0]),
        });
        if (focusedObject.id_asset) {
          res.push({
            label: 'Set as primary',
            icon: 'star',
            onClick: onSetPrimary,
          });
        }

        res.push({
          label: 'Send to...',
          icon: 'send',
          onClick: onSendTo,
        });
      }

      if (focusedObject.item_role === 'placeholder') {
        for (const solver of channelConfig.solvers) {
          res.push({
            label: `Solve using ${solver}`,
            icon: 'change_circle',
            onClick: () => onSolve(solver),
          });
        }
      }

      res.push(...getRunModeOptions('item', selectedItems[0], setRunMode));

      res.push({
        label: 'Delete',
        icon: 'delete',
        hlColor: 'var(--color-red)',
        onClick: deleteSelectedItems,
        separator: true,
      });
      return res;
    } else if (selectedEvents.length === 1) {
      res.push({
        label: 'Edit event',
        icon: 'edit',
        onClick: () => editObject('event', selectedEvents[0]),
      });
      res.push(...getRunModeOptions('event', selectedEvents[0], setRunMode));
    }
    return res;
  };

  //
  // Render
  //

  const selectedIndices = useMemo(() => {
    const selectedIndices = [];
    for (let i = 0; i < data?.length || 0; i++) {
      if (selectedItems.includes(data[i].id) && data[i].type === 'item') {
        selectedIndices.push(i);
      }
      if (selectedEvents.includes(data[i].id) && data[i].type === 'event') {
        selectedIndices.push(i);
      }
    }
    return selectedIndices;
  }, [selectedItems, selectedEvents, data]);

  return (
    <RundownTableWrapper className="grow nopad" ref={tableRef}>
      <Table
        columns={columns}
        data={data}
        className="contained"
        loading={loading}
        onRowClick={onRowClick}
        rowClass={getRundownRowClass}
        rowHighlightColor={formatRowHighlightColor}
        rowHighlightStyle={formatRowHighlightStyle}
        contextMenu={contextMenu}
        selection={selectedIndices}
        onKeyDown={onKeyDown}
        droppable={draggedObjects}
        onDrop={onDrop}
      />
    </RundownTableWrapper>
  );
};

export default RundownTable;
