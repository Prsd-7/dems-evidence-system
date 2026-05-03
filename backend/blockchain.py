"""
blockchain.py — Minimal Forensic Blockchain for DEMS
=====================================================
Purpose: Anchor every evidence hash into an immutable chain structure.
         Each block links to the previous via its hash — any tampering
         of a past block breaks the chain and is detectable.

Features:
  ✔ Genesis block on startup
  ✔ SHA-256 block hashing (same algorithm as evidence hashing)
  ✔ Chain integrity validator (detects tampered blocks)
  ✔ Persistence — chain saved to blockchain_data.json on disk
  ✔ Singleton instance imported by main.py
  ✔ Thread-safe appends via threading.Lock
"""

import hashlib
import json
import time
import os
import threading

CHAIN_FILE = "blockchain_data.json"


class Block:
    def __init__(self, index: int, data: dict, previous_hash: str):
        self.index         = index
        self.timestamp     = time.time()
        self.data          = data
        self.previous_hash = previous_hash
        self.hash          = self._compute_hash()

    def _compute_hash(self) -> str:
        payload = {
            "index":         self.index,
            "timestamp":     self.timestamp,
            "data":          self.data,
            "previous_hash": self.previous_hash,
        }
        encoded = json.dumps(payload, sort_keys=True).encode()
        return hashlib.sha256(encoded).hexdigest()

    def to_dict(self) -> dict:
        return {
            "index":         self.index,
            "timestamp":     self.timestamp,
            "data":          self.data,
            "previous_hash": self.previous_hash,
            "hash":          self.hash,
        }

    @classmethod
    def from_dict(cls, d: dict) -> "Block":
        b = cls.__new__(cls)
        b.index         = d["index"]
        b.timestamp     = d["timestamp"]
        b.data          = d["data"]
        b.previous_hash = d["previous_hash"]
        b.hash          = d["hash"]
        return b


class Blockchain:
    def __init__(self):
        self._lock  = threading.Lock()
        self._chain = []
        self._load_or_create()

    # ── Persistence ────────────────────────────────────────────────────────────

    def _save(self):
        with open(CHAIN_FILE, "w") as f:
            json.dump([b.to_dict() for b in self._chain], f, indent=2)

    def _load_or_create(self):
        if os.path.exists(CHAIN_FILE):
            try:
                with open(CHAIN_FILE) as f:
                    data = json.load(f)
                self._chain = [Block.from_dict(d) for d in data]
                # If loaded chain is invalid, start fresh
                if not self._is_valid():
                    print("[BLOCKCHAIN] Loaded chain is INVALID — starting fresh.")
                    self._chain = []
                    self._add_genesis()
                else:
                    print(f"[BLOCKCHAIN] Loaded {len(self._chain)} blocks from disk.")
                return
            except Exception as e:
                print(f"[BLOCKCHAIN] Load error ({e}) — starting fresh.")
        self._add_genesis()

    def _add_genesis(self):
        genesis = Block(
            index=0,
            data={"type": "GENESIS", "system": "DEMS", "version": "2.0"},
            previous_hash="0" * 64,
        )
        self._chain.append(genesis)
        self._save()
        print("[BLOCKCHAIN] Genesis block created.")

    # ── Public API ─────────────────────────────────────────────────────────────

    def add_block(self, data: dict) -> dict:
        """Append a new block and persist. Returns the new block as dict."""
        with self._lock:
            previous = self._chain[-1]
            block    = Block(
                index         = len(self._chain),
                data          = data,
                previous_hash = previous.hash,
            )
            self._chain.append(block)
            self._save()
            return block.to_dict()

    def is_valid(self) -> bool:
        with self._lock:
            return self._is_valid()

    def _is_valid(self) -> bool:
        """Validate entire chain — O(n) traversal."""
        for i in range(1, len(self._chain)):
            curr = self._chain[i]
            prev = self._chain[i - 1]
            # Check previous_hash pointer
            if curr.previous_hash != prev.hash:
                return False
            # Recompute and verify own hash
            if curr.hash != curr._compute_hash():
                return False
        return True

    @property
    def chain(self) -> list:
        """Return chain as list of dicts (safe copy)."""
        with self._lock:
            return [b.to_dict() for b in self._chain]

    @property
    def length(self) -> int:
        return len(self._chain)

    def last_hash(self) -> str:
        with self._lock:
            return self._chain[-1].hash


# ── Singleton ──────────────────────────────────────────────────────────────────
blockchain = Blockchain()