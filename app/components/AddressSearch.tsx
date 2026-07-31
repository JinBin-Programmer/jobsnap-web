"use client";

import { useState } from "react";
import { Search, Loader2 } from "lucide-react";
import { Input } from "@/app/components/ui/input";

interface NominatimResult {
  lat: string;
  lon: string;
  display_name: string;
}

interface AddressSearchProps {
  onSelect: (lat: number, lng: number, displayName: string) => void;
  placeholder?: string;
}

// Free geocoding via OpenStreetMap's Nominatim — no API key, same "no Google
// Maps" constraint as the map itself. Search-on-submit (not type-ahead) to
// stay well within Nominatim's usage policy (max ~1 request/sec, no bulk
// automated queries). Biased to Malaysia since that's the whole customer base.
export default function AddressSearch({ onSelect, placeholder }: AddressSearchProps) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<NominatimResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);

  const runSearch = async () => {
    const q = query.trim();
    if (!q) return;
    setLoading(true);
    setSearched(true);
    try {
      const url = `https://nominatim.openstreetmap.org/search?format=json&limit=5&countrycodes=my&q=${encodeURIComponent(q)}`;
      const res = await fetch(url, { headers: { Accept: "application/json" } });
      const data = (await res.json()) as NominatimResult[];
      setResults(data);
    } catch {
      setResults([]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <div className="flex gap-2">
        <Input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              runSearch();
            }
          }}
          placeholder={placeholder ?? "Search an address (e.g. 12, Jalan SS15/4, Subang Jaya)"}
        />
        <button
          type="button"
          onClick={runSearch}
          disabled={loading || !query.trim()}
          className="flex shrink-0 items-center gap-1.5 rounded-md border border-input bg-card px-3 text-sm font-medium text-body-text hover:bg-accent disabled:opacity-50"
        >
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
          Search
        </button>
      </div>

      {searched && !loading && (
        <div className="mt-2 max-h-52 overflow-y-auto rounded-lg border border-border bg-card">
          {results.length === 0 ? (
            <p className="p-3 text-xs text-muted-foreground">
              No matches — try a more specific address, or just tap the map.
            </p>
          ) : (
            results.map((r, i) => (
              <button
                key={i}
                type="button"
                onClick={() => {
                  onSelect(parseFloat(r.lat), parseFloat(r.lon), r.display_name);
                  setResults([]);
                  setSearched(false);
                }}
                className="block w-full border-b border-divider px-3 py-2 text-left text-xs text-body-text last:border-b-0 hover:bg-muted"
              >
                {r.display_name}
              </button>
            ))
          )}
        </div>
      )}
    </div>
  );
}
