import time
import threading

__all__ = ['ResponseCache']


class ResponseCache:
    """Simple thread-safe in-memory cache with TTL support.

    Usage:
        cache = ResponseCache(default_ttl=30)  # 30 second default TTL

        @cache.cached
        def expensive_fn(user_id):
            return {"data": ...}

        cache.get('my_key')       → cached value or None
        cache.set('my_key', val)  → manual set
        cache.invalidate('my_key') → remove key
        cache.clear()             → entire cache flush
    """

    def __init__(self, default_ttl=30):
        self._store = {}
        self._ttl = {}
        self._default_ttl = default_ttl
        self._lock = threading.Lock()

    def get(self, key):
        """Return cached value or None (also returns None if expired)."""
        now = time.time()
        with self._lock:
            entry = self._store.get(key)
            expiry = self._ttl.get(key)
            if entry is None:
                return None
            if expiry is not None and now > expiry:
                del self._store[key]
                del self._ttl[key]
                return None
            return entry

    def set(self, key, value, ttl=None):
        """Cache a value with optional TTL (seconds). Defaults to self._default_ttl."""
        expire_at = time.time() + (ttl if ttl is not None else self._default_ttl)
        with self._lock:
            self._store[key] = value
            self._ttl[key] = expire_at

    def invalidate(self, key):
        with self._lock:
            self._store.pop(key, None)
            self._ttl.pop(key, None)

    def clear(self):
        with self._lock:
            self._store.clear()
            self._ttl.clear()

    # ---- Convenience decorator for functions ----
    def cached(self, fn):
        """Decorator: caches the return value of a no-arg function."""
        import functools

        @functools.wraps(fn)
        def wrapper(*args, **kwargs):
            # Build a simple key from function name + positional args
            key = f"{fn.__qualname__}:{args}:{sorted(kwargs.items())}"
            result = self.get(key)
            if result is not None:
                return result
            result = fn(*args, **kwargs)
            self.set(key, result)
            return result

        return wrapper
