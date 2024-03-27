import { Navbar, Button, Spacer } from '/src/components'

const Pagination = ({ page, setPage, hasMore }) => {
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
    )
  return null
}

export default Pagination
