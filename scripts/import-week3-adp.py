#!/usr/bin/env python3
"""Freeze FFC ADP archives and recover 2026 preseason values from FFC charts.
No runtime dependency; rerun only deliberately. All network calls are read-only.
"""
import concurrent.futures
import datetime
import json
from pathlib import Path
import urllib.parse
import urllib.request

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / 'app/src/NFLQuery/datasets'
AGENT = {'User-Agent': 'Mozilla/5.0 (NFLQuery personal ADP archive)'}

def fetch(url):
    with urllib.request.urlopen(urllib.request.Request(url, headers=AGENT), timeout=30) as r:
        return json.load(r)

def main():
    OUT.mkdir(exist_ok=True)
    adp = json.loads((OUT / 'adp-by-year.json').read_text())
    sources = json.loads((OUT / 'adp-sources.json').read_text())
    identities = {}
    urls = [f'https://fantasyfootballcalculator.com/api/v1/adp/{fmt}?teams=12&year={year}&position=all'
            for fmt, year in [('standard', 2025), ('standard', 2026), ('ppr', 2026), ('half-ppr', 2026), ('dynasty', 2026), ('rookie', 2026)]]
    for url in urls:
        try:
            for player in fetch(url).get('players', []):
                identities[player['player_id']] = player
        except Exception as e:
            print('Identity source unavailable', url, str(e), flush=True)
    # Identities only come from other formats. EVERY saved ADP below is standard 12-team.
    cutoff = datetime.date(2026, 9, 8)
    oldest = datetime.date(2026, 8, 25)
    def graph(item):
        player_id, p = item
        url = f'https://fantasyfootballcalculator.com/adp/graph/data?is_v2=1&player={player_id}&teams=12&format=standard&callback=?'
        try:
            points = fetch(url)
            valid = [(datetime.datetime.fromtimestamp(t / 1000, datetime.timezone.utc).date(), v)
                     for t, v in points if isinstance(v, (int, float)) and v >= 1
                     and oldest <= datetime.datetime.fromtimestamp(t / 1000, datetime.timezone.utc).date() <= cutoff]
            if not valid:
                return None
            date, value = max(valid)
            return ({'name': p['name'], 'position': p['position'], 'team': p.get('team'),
                     'adp': value, 'bye': p.get('bye')},
                    {'name': p['name'], 'date': str(date), 'url': url, 'adp': value})
        except Exception as e:
            print('Graph unavailable', p['name'], str(e), flush=True)
            return None
    print('Fetching standard preseason charts for',len(identities),'player identities',flush=True)
    results = [r for r in concurrent.futures.ThreadPoolExecutor(4).map(graph, identities.items()) if r]
    results.sort(key=lambda r:r[0]['adp'])
    if len(results) < 100:
        raise ValueError('Insufficient preseason coverage; preserve prior dump')
    adp['2026'] = [r[0] for r in results]
    if 'meta' in sources['years']['2026']:
        sources['years']['2026']['liveMeta'] = sources['years']['2026'].pop('meta')
    sources['years']['2026'].update({'count':len(results), 'basis':'Most recent standard 12-team daily chart value from 2026-08-25 through 2026-09-08, before NFL Week 1.', 'identitySourceUrls':urls,'playerSources':[r[1] for r in results]})
    sources['notes'] = [
        '2007 official API and page have no player rows. A 2007 FFToday table exists, but FFC attribution could not be verified, so it is excluded rather than mixing providers.',
        '2008 and 2009 FFC archive end_date metadata says 2010-06-20. Lists identify their respective seasons, but date metadata is anomalous and retained verbatim.',
        'Historical FFC team labels can reflect subsequent trades or franchise relocations. NFLQuery appearances determine historical teams when available.',
        '2026 ADP recovered from same-provider preseason charts; daily sample sizes are not provided. Other format endpoints were used only to discover player identities, never for ADP values.',
        'Missing ADP is reported as unscored, never silently assigned an invented draft value.'
    ]
    (OUT / 'adp-by-year.json').write_text(json.dumps(adp, indent=2)+'\n')
    (OUT / 'adp-sources.json').write_text(json.dumps(sources, indent=2)+'\n')
    print('Saved 2026 preseason ADP players:',len(results),flush=True)

if __name__ == '__main__':
    main()
