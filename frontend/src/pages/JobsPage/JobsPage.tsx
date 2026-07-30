import { Section } from '@components';
import { useNebula } from '@features/Nebula';
import { useState, useEffect } from 'react';
import { useParams } from 'react-router';

import JobsNav from './JobsNav';

import { JobsTable } from '@/features/JobsTable';

const JobsPage = () => {
  const { view } = useParams<{ view?: string }>();
  const [searchQuery, setSearchQuery] = useState('');
  const { setPageTitle } = useNebula();

  useEffect(() => {
    const cleanTitle = view ? view[0].toUpperCase() + view.slice(1) + ' jobs' : 'Jobs';
    setPageTitle(cleanTitle);
  }, [view, setPageTitle]);

  return (
    <main className="column">
      <JobsNav searchQuery={searchQuery} setSearchQuery={setSearchQuery} />
      <Section className="grow">
        <JobsTable view={view} searchQuery={searchQuery} className="contained" />
      </Section>
    </main>
  );
};

export default JobsPage;
