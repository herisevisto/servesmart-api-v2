// /src/dto/player.dto.js
export function toAthleteDTO(athlete, profile, seasonStats) {
  return {
    id: athlete.player_id,
    firstName: athlete.first_name,
    lastName: athlete.last_name,
    position: athlete.position,       // "S" | "OH" | "OP" | "OS" | "MB" | "L" | ""
    number: athlete.jersey_no ?? "-",
    type: "athlete",
    age: athlete.age ?? "-",           // if you later add age to schema; else leave "-"
    plays: athlete.plays ?? "-",       // if you later add; else "-"
    profile: profile ? {
      height:  profile.height  ?? "—",
      weight:  profile.weight  ?? "—",
      handed:  profile.handed  ?? "—",
      status:  profile.status  ?? "—",
      season:  profile.season  ?? "—",
      contact: profile.contact ?? "—",
      email:   profile.email   ?? "—",
    } : undefined,
    stats: seasonStats ? {
      matches:     seasonStats.matches,
      sets:        seasonStats.sets,
      totalPoints: seasonStats.totalPoints,
      kills:       seasonStats.kills,
      aces:        seasonStats.aces,
      blocks:      seasonStats.blocks,
      digs:        seasonStats.digs,
      assists:     seasonStats.assists,
    } : undefined,
  };
}

export function toTryoutDTO(tryout, profile, seasonStats) {
  return {
    id: tryout.tryout_id,
    firstName: tryout.first_name,
    lastName: tryout.last_name,
    position: tryout.position_pref,
    number: "-",
    type: "tryout",
    age: tryout.age ?? "-",            // if you later add; else "-"
    plays: tryout.plays ?? "-",        // if you later add; else "-"
    profile: profile ? {
      height:  profile.height  ?? "—",
      weight:  profile.weight  ?? "—",
      handed:  profile.handed  ?? "—",
      status:  profile.status  ?? "—",
      season:  profile.season  ?? "—",
      contact: profile.contact ?? "—",
      email:   profile.email   ?? "—",
    } : undefined,
    stats: seasonStats ? {
      matches:     seasonStats.matches,
      sets:        seasonStats.sets,
      totalPoints: seasonStats.totalPoints,
      kills:       seasonStats.kills,
      aces:        seasonStats.aces,
      blocks:      seasonStats.blocks,
      digs:        seasonStats.digs,
      assists:     seasonStats.assists,
    } : undefined,
  };
}
