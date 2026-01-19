import { Navbar, Button, Spacer } from '@components';

interface PaginationProps {
  page: number;
  setPage: (page: number) => void;
  hasMore: boolean;
}

const Pagination = ({ page, hasMore, setPage }: PaginationProps) => {
  if (page > 1 || hasMore)
    return (
      <Navbar>
        <Button
          icon="keyboard_arrow_left"
          disabled={page === 1}
          onClick={() => setPage(page - 1)}
        />
        <Spacer>{page}</Spacer>
        <Button
          icon="keyboard_arrow_right"
          disabled={!hasMore}
          onClick={() => setPage(page + 1)}
        />
      </Navbar>
    );
  return null;
};

export default Pagination;
