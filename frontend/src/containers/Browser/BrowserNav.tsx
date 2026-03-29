import React from 'react';
import nebula from '@/nebula';

import { debounce } from 'lodash';
import { useState, useEffect, useMemo, useCallback } from 'react';

import { useNebula } from '@/features/Nebula';
import { Navbar, Button, Spacer, Dropdown, InputText } from '@/components';
import type { DropdownOptionProps } from '@/components/Dropdown';

const BrowserNav: React.FC = () => {
  const { currentViewId, searchQuery, setCurrentView, setSearchQuery } = useNebula();

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
        onClick: () => setCurrentView(view.id),
      });
    }
    return result;
  }, [setCurrentView]);

  const debounceSetQuery = useCallback(
    debounce((q: string) => {
      setSearchQuery(q);
    }, 200),
    [setSearchQuery]
  );

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
        <InputText placeholder="Search" onChange={setSearchText} value={searchText} />
        <Button
          icon="close"
          onClick={() => setSearchText('')}
          className="tool"
          tooltip="Clear search query"
        />
      </Navbar>
    ),
    [currentView?.name, searchText, viewOptions]
  );

  return navbar;
};

export default BrowserNav;
