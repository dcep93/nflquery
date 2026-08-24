# Puka Nacua and Davante Adams Red-Zone Chart Design

## Goal

Create one in-conversation graph comparing Puka Nacua and Davante Adams by regular-season week in 2025. Show red-zone targets and receiving touchdowns simultaneously without splitting the result into separate charts.

## Data definitions

- Use weeks 1–18 from `data_v6/2025.json`.
- A red-zone target is an official pass target on a play that starts at the opponent's 20-yard line or closer.
- Exclude nullified plays. Validate each player's parsed weekly target count against the matching weekly box-score target total before filtering to red-zone plays.
- A touchdown is a receiving touchdown from any field position.
- Show zero for bye weeks and games in which a player did not record a target.

## Graph design

Use one Cartesian line graph with week on the x-axis and count on the y-axis. Render all four weekly series as lines. Use a stable color for each player: Puka Nacua uses the first series color and Davante Adams uses the second. Distinguish metrics by treatment: red-zone targets use solid lines with circle markers, while receiving touchdowns use dashed lines with diamond markers. This makes player comparisons intuitive while ensuring that the encoding does not depend on color alone.

Provide a compact interactive legend that can toggle each player-metric series and a cross-series tooltip with exact weekly values. Keep the plot responsive at both standard and narrow conversation widths, with labeled axes, integer ticks, an accessible description, and theme-aware colors.

## Verification

- Confirm all four weekly series against the parsed NFLQuery play data.
- Check that all four lines and their markers remain inside the chart frame and labels do not overlap at 736px and 360px.
- Check light and dark themes.
- Exercise legend toggles and the cross-series tooltip.

## Scope

The deliverable is a single in-conversation graph. It does not change the NFLQuery application or its source data.
