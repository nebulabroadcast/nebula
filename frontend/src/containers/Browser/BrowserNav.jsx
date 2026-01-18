import nebula from '/src/nebula';

import { debounce } from 'lodash';
import { useState, useEffect, useMemo, useCallback } from 'react';

import { useNebula } from '/src/features/Nebula';
import { Navbar, Button, Spacer, Dropdown, InputText } from '/src/components';

const BrowserNav = () => {
  const { currentViewId, searchQuery, setCurrentView, setSearchQuery } = useNebula();

  const currentView = useMemo(() => {
    return nebula.settings.views.find((v) => v.id === currentViewId);
  }, [currentViewId]);

  const [searchText, setSearchText] = useState(searchQuery);

  useEffect(() => {
    setSearchText(searchQuery);
  }, [searchQuery]);

  const viewOptions = useMemo(() => {
    let result = [];
    for (const view of nebula.settings.views || []) {
      result.push({
        label: view.name,
        separator: view.separator,
        onClick: () => setCurrentView(view.id),
      });
    }
    return result;
  }, []);

  const debounceSetQuery = useCallback(
    debounce((q) => {
      setSearchQuery(q);
    }, 200),
    []
  );

  useEffect(() => {
    debounceSetQuery(searchText);
  }, [searchText]);

  const dropdownButtonStyle = {
    justifyContent: 'flex-start',
  };

  const navbar = useMemo(
    () => (
      <Navbar>
        <Dropdown
          options={viewOptions}
          label={currentView?.name}
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
