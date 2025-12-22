// core/vault.js

let entries = [];

export function addEntry(entry) {
  entries.push(entry);
}

export function setEntries(v) {
  entries = v;
}

export function getEntries() {
  return entries;
}

export function filterEntries(search) {
  const s = search.trim().toLowerCase();
  if (!s) return entries;
  return entries.filter(e => e.service.toLowerCase().includes(s));
}
