#!/usr/bin/env python3
"""Freeze FFC 12-team 2-QB ADP, used as an explicitly labeled superflex proxy.

This authoring tool never runs in the app. Historical archives are checked from
2007 onward. Current-year values come only from preseason player charts.
Optional --cache-dir caches public source responses for reproducible reruns.
"""
import argparse
import concurrent.futures
import datetime
import hashlib
import json
import math
from pathlib import Path
import urllib.request

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / 'app/src/NFLQuery/datasets'
HEADERS = {'User-Agent': 'Mozilla/5.0 (NFLQuery personal ADP archive)'}
FORMAT = '2qb'
TEAMS = 12
CURRENT_YEAR = 2026
OLDEST = datetime.date(2026, 8, 25)
CUTOFF = datetime.date(2026, 9, 8)


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--cache-dir', type=Path)
    args = parser.parse_args()
    if args.cache_dir:
        args.cache_dir.mkdir(parents=True, exist_ok=True)

    def fetch(url):
        cache = (args.cache_dir / (hashlib.sha256(url.encode()).hexdigest() + '.json')) if args.cache_dir else None
        if cache and cache.exists():
            return json.loads(cache.read_text())
        request = urllib.request.Request(url, headers=HEADERS)
        with urllib.request.urlopen(request, timeout=30) as response:
            data = json.load(response)
        if cache:
            cache.write_text(json.dumps(data))
        return data

    def endpoint(fmt, year):
        return f'https://fantasyfootballcalculator.com/api/v1/adp/{fmt}?teams={TEAMS}&year={year}&position=all'

    def valid_adp(value):
        return isinstance(value, (int, float)) and math.isfinite(value) and value >= 1

    def player_record(player, adp=None):
        return {'name': player['name'], 'position': player['position'],
                'team': player.get('team'), 'adp': player['adp'] if adp is None else adp,
                'bye': player.get('bye')}

    adp, years, identities = {}, {}, {}
    for year in range(2007, CURRENT_YEAR + 1):
        url = endpoint(FORMAT, year)
        data = fetch(url)
        players = data.get('players', [])
        meta = data.get('meta')
        # Never accept another scoring format as a silent fallback.
        if players and (not meta or meta.get('type') != '2 QB' or meta.get('teams') != TEAMS):
            raise ValueError(f'Wrong format returned for {year}: {meta}')
        years[str(year)] = {'url': url, 'meta': meta, 'count': len(players),
                            'error': data.get('errors')}
        if year < CURRENT_YEAR and players:
            if not all(valid_adp(p['adp']) for p in players):
                raise ValueError(f'Invalid ADP in {year}')
            adp[str(year)] = [player_record(p) for p in players]
        if year >= CURRENT_YEAR - 1:
            identities.update({p['player_id']: p for p in players})

    # Other formats discover identities only. They NEVER supply saved ADP values.
    identity_urls = [endpoint(FORMAT, CURRENT_YEAR - 1), endpoint(FORMAT, CURRENT_YEAR)]
    for fmt in ['standard', 'ppr', 'half-ppr', 'dynasty', 'rookie']:
        url = endpoint(fmt, CURRENT_YEAR)
        identity_urls.append(url)
        for player in fetch(url).get('players', []):
            identities.setdefault(player['player_id'], player)

    def graph(item):
        player_id, player = item
        url = f'https://fantasyfootballcalculator.com/adp/graph/data?is_v2=1&player={player_id}&teams={TEAMS}&format={FORMAT}&callback=?'
        points = fetch(url)
        valid = []
        for timestamp, value in points:
            day = datetime.datetime.fromtimestamp(timestamp / 1000, datetime.timezone.utc).date()
            if OLDEST <= day <= CUTOFF and valid_adp(value):
                valid.append((day, value))
        if not valid:
            return None
        day, value = max(valid)
        return (player_record(player, value),
                {'name': player['name'], 'date': str(day), 'url': url, 'adp': value})

    print('Fetching preseason 2-QB charts for', len(identities), 'player identities', flush=True)
    # Any fetch/parse error aborts before overwriting the checked-in dump.
    with concurrent.futures.ThreadPoolExecutor(4) as pool:
        results = [result for result in pool.map(graph, identities.items()) if result]
    results.sort(key=lambda result: result[0]['adp'])
    if len(results) < 100:
        raise ValueError('Insufficient preseason coverage; preserve prior dump')
    adp[str(CURRENT_YEAR)] = [result[0] for result in results]
    years[str(CURRENT_YEAR)]['liveMeta'] = years[str(CURRENT_YEAR)].pop('meta')
    years[str(CURRENT_YEAR)].update({
        'count': len(results),
        'basis': f'Most recent 12-team 2-QB daily chart value from {OLDEST} through {CUTOFF}, before NFL Week 1.',
        'identitySourceUrls': identity_urls,
        'playerSources': [result[1] for result in results],
    })
    sources = {
        'provider': 'Fantasy Football Calculator', 'format': FORMAT,
        'formatLabel': '2-QB', 'proxyFor': 'superflex', 'teams': TEAMS,
        'retrievedAt': str(datetime.datetime.now(datetime.timezone.utc).date()),
        'documentation': 'https://help.fantasyfootballcalculator.com/article/42-adp-rest-api',
        'years': years,
        'notes': [
            'FFC publishes 2-QB ADP, not a separate superflex dataset. This is the user-approved superflex proxy, not actual superflex draft observations.',
            'The 2007–2013 2-QB archive endpoints return no ADP data. Populated 12-team 2-QB history begins in 2014; no standard-scoring fallback is used.',
            '2026 live ADP includes in-season drafts and is retained only as metadata. All saved 2026 values are preseason 2-QB player-chart points.',
            'Other format endpoints discover player identities only; every saved ADP value is 12-team 2-QB.',
            'Historical FFC team labels may reflect later trades or franchise relocations; NFLQuery appearances determine historical teams when available.',
            'Daily 2026 chart sample sizes are unavailable. Missing qualifying ADP is not replaced with invented values.',
        ],
    }
    OUT.mkdir(exist_ok=True)
    (OUT / 'adp-by-year.json').write_text(json.dumps(adp, indent=2) + '\n')
    (OUT / 'adp-sources.json').write_text(json.dumps(sources, indent=2, ensure_ascii=False) + '\n')
    print('Saved years:', min(adp), 'through', max(adp), '; 2026 players:', len(results), flush=True)


if __name__ == '__main__':
    main()
