__all__ = ["Redis", "redis"]

from nx.redis import Redis, redis

from nebula.config import config

# nx.Redis defaults to a single fixed pubsub channel ("nx"). Nebula sites
# publish on a per-site channel, so other nebula instances sharing the
# same Redis server don't cross-talk.
redis.channel = f"nebula-{config.site_name}"
