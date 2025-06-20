"""
This module provides a Coalescer class that prevents multiple identical,
concurrent asynchronous operations from being executed simultaneously.

If you invoke an async function (e.g., fetch_data(id=1)) through the Coalescer instance,
and another call to fetch_data(id=1) is already in progress, the Coalescer ensures
that the second (and any subsequent identical) call will simply await the result
of the first, ongoing operation, rather than initiating a new, redundant execution.

In essence: It's a smart wrapper for async functions that says:

> If I'm already doing this exact same thing,  don't start it again.
> Just wait for the one already running to finish and share its result.

## Example usage:

```
async def fetch_data(item_id: int):
    print(f"Fetching data for {item_id}...")
    await asyncio.sleep(2) # Simulate network call
    return f"Data for {item_id}"

coalescer = Coalescer()

# These calls will be coalesced if made close together

task1 = asyncio.create_task(coalescer(fetch_data, item_id=1))
task2 = asyncio.create_task(coalescer(fetch_data, item_id=1)) # Will use task1's future
task3 = asyncio.create_task(coalescer(fetch_data, item_id=2)) # New actual call

result1 = await task1
result2 = await task2
result3 = await task3
print(result1, result2, result3)
```
"""

import asyncio
import hashlib
from collections.abc import Callable, Coroutine
from typing import Any, Generic, TypeVar


def _hash_args(func: Callable[..., Any], *args: Any, **kwargs: Any) -> str:
    """Generates a hash from the function arguments and keyword arguments."""
    func_id = str(id(func))
    arg_str = str(args)
    kwarg_str = str(sorted(kwargs.items()))
    combined_str = arg_str + kwarg_str + func_id
    return hashlib.md5(combined_str.encode()).hexdigest()  # noqa: S324


T = TypeVar("T")


class Coalescer(Generic[T]):
    _instance: "Coalescer[Any] | None" = None
    lock: asyncio.Lock
    current_futures: dict[str, asyncio.Task[T]]

    def __new__(cls) -> "Coalescer[Any]":
        if cls._instance is None:
            cls._instance = super().__new__(cls)
            cls._instance.current_futures = {}
            cls._instance.lock = asyncio.Lock()
        return cls._instance

    async def __call__(
        self,
        func: Callable[..., Coroutine[Any, Any, T]],
        *args: Any,
        **kwargs: Any,
    ) -> T:
        key = _hash_args(func, *args, **kwargs)
        async with self.lock:
            if key not in self.current_futures:
                self.current_futures[key] = asyncio.create_task(func(*args, **kwargs))

        try:
            return await self.current_futures[key]
        finally:
            async with self.lock:
                self.current_futures.pop(key, None)
