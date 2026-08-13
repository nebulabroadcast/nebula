import { debounce } from 'lodash';
import React from 'react';
import { useState, useEffect, useMemo, useCallback } from 'react';

import { Navbar, Button, Spacer, Dropdown, InputText } from '@/components';
import type { DropdownOptionProps } from '@/components/Dropdown';
import { useNebula } from '@/features/Nebula';
import nebula from '@/nebula';

const BrowserNav: React.FC = () => {
  const {
    currentViewId,
    searchQuery,
    filterConditions,
    setCurrentView,
    setSearchQuery,
    setFilterConditions,
  } = useNebula();

  const currentView = useMemo(() => {
    return nebula.settings?.views?.find((v) => v.id === currentViewId);
  }, [currentViewId]);

  const [searchText, setSearchText] = useState(searchQuery);

  useEffect(() => {
    setSearchText(searchQuery);
  }, [searchQuery]);

  const viewOptions = useMemo((): DropdownOptionProps[] => {
    const result: DropdownOptionProps[] = [];
    for (const view of nebula.settings?.views || []) {
      result.push({
        label: view.name,
        separator: view.separator,
        onClick: () => {
          setCurrentView(view.id);
        },
      });
    }
    return result;
  }, [setCurrentView]);

  const debounceSetQuery = useCallback(debounce(setSearchQuery, 200), [setSearchQuery]);

  useEffect(() => {
    debounceSetQuery(searchText);
  }, [searchText, debounceSetQuery]);

  const dropdownButtonStyle: React.CSSProperties = {
    justifyContent: 'flex-start',
  };

  const navbar = useMemo(
    () => (
      <Navbar>
        <Dropdown
          options={viewOptions}
          label={currentView?.name || ''}
          buttonStyle={dropdownButtonStyle}
          iconOnRight={true}
        />
        <Spacer />
        {filterConditions.map((condition) => (
          <Button
            key={condition.key}
            label={`${nebula.metaType(condition.key).header}: ${condition.value}`}
            icon="filter_alt_off"
            iconOnRight={true}
            onClick={() => {
              setFilterConditions(
                filterConditions.filter((c) => c.key !== condition.key)
              );
            }}
            className="tool"
            tooltip="Clear filter"
          />
        ))}
        <InputText placeholder="Search" onChange={setSearchText} value={searchText} />
        <Button
          icon="close"
          onClick={() => {
            setSearchText('');
          }}
          className="tool"
          tooltip="Clear search query"
        />
      </Navbar>
    ),
    [currentView?.name, searchText, viewOptions, filterConditions, setFilterConditions]
  );

  return navbar;
};

export default BrowserNav;
