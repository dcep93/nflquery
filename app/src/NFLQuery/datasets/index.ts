import adpByYear from "./adp-by-year.json";
import adpSources from "./adp-sources.json";
import currentInjuryWeeks from "./current-injury-weeks.json";
import currentInjurySources from "./current-injury-sources.json";

export type DraftPlayer = {
  name: string;
  position: string;
  team: string | null;
  adp: number;
  bye: number | null;
};

// Data only: absence inference and scoring live in the editable query textboxes.
export const ADP_BY_YEAR: Record<string, DraftPlayer[]> = adpByYear;
export const ADP_SOURCES = adpSources;
export const CURRENT_INJURY_WEEKS: Record<string, number[]> =
  currentInjuryWeeks;
export const CURRENT_INJURY_SOURCES = currentInjurySources;
export const NFL_TEAM_ALIASES: Record<string, string> = {
  SD: "LAC",
  STL: "LAR",
  LA: "LAR",
  OAK: "LV",
  WSH: "WAS",
  JAC: "JAX",
  AZ: "ARI",
};
export const NFL_PLAYER_ALIASES: Record<string, string> = {
  benjaminwatson: "benwatson",
  carnellwilliams: "cadillacwilliams",
  anthonydixon: "boobiedixon",
  michaelvick: "mikevick",
  stevejohnson: "steviejohnson",
  lamichaeljames: "lamikejames",
  kennygainwell: "kennethgainwell",
  chadochocinco: "chadjohnson",
  gabrieldavis: "gabedavis",
  mitchelltrubisky: "mitchtrubisky",
  willfuller: "williamfuller",
  stevenhauschka: "stephenhauschka",
};
