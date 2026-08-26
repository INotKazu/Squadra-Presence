import { Channel, invoke } from "@tauri-apps/api/core";
import { DEMO_TRACKER_RESPONSE } from "./fixture";
import type { AbilityReference, BuildGuideSource, DiscordStatus, PresencePayload, ProcessStatus, UpdateDownloadEvent, UpdateMetadata } from "../types";

export const isTauri = (): boolean => typeof window !== "undefined" && Boolean(window.__TAURI_INTERNALS__);

const demoDiscordStatus: DiscordStatus = {
  connected: false,
  lastError: null,
  updatedAt: null,
};

export async function fetchTrackerProfile(publicId: string): Promise<unknown> {
  if (!isTauri()) {
    await new Promise((resolve) => setTimeout(resolve, 380));
    return DEMO_TRACKER_RESPONSE;
  }
  return invoke("fetch_tracker_profile", { publicId });
}

const DEMO_ABILITIES: AbilityReference[] = [
  { slot: "Passive", key: "icon_passive1", name: "Fighter Passive", description: "The fighter's defining mechanic and the conditions that strengthen their game plan." },
  { slot: "Rush", key: "icon_rush_attack1", name: "Rush Attack", description: "The fighter's standard Rush Attack behavior and any character-specific bonus effects." },
  { slot: "Skill 1", key: "icon_skill1", name: "Primary Skill", description: "The first active skill, including its targeting, damage, and crowd-control behavior." },
  { slot: "Skill 2", key: "icon_skill2", name: "Secondary Skill", description: "The second active skill and the situations where it provides the most value." },
  { slot: "Skill 3", key: "icon_skill3", name: "Utility Skill", description: "The third active skill, often used for movement, defense, setup, or team utility." },
  { slot: "Super", key: "icon_super_attack1", name: "Super Attack", description: "The fighter's Super Attack and its primary combat effect." },
];

export async function fetchHeroAbilities(heroId: string): Promise<AbilityReference[]> {
  if (!isTauri()) {
    await new Promise((resolve) => setTimeout(resolve, 260));
    return DEMO_ABILITIES;
  }
  return invoke<AbilityReference[]>("fetch_hero_abilities", { heroId });
}

const DEMO_BUILD_GUIDE = `<!doctype html><html><body><main><article>
  <h3>Situational Cards</h3>
  <figure><img src="https://dbgsbuilds.com/wp-content/uploads/2026/01/2-2-verde.png"></figure>
  <p>Solid Barrier is a safer alternative against sudden burst damage.</p>
  <h3>Situational Helper</h3>
  <figure><img src="https://dbgsbuilds.com/wp-content/uploads/2026/01/6-Elder-Supreme-Kai.png"></figure>
  <p>Elder Supreme Kai supports a faster skill rotation.</p>
  <p><strong>Build Explanation</strong></p>
  <p>This setup balances a durable frontline with reliable pressure after each Vanishing Step.</p>
  <section id="skill-upgrade-order">
    <div class="dbgs-skill-order__row"><span class="skills-ui__label">Skill 1</span><div class="dbgs-skill-order__cell"></div><div class="dbgs-skill-order__cell is-on">3</div><div class="dbgs-skill-order__cell"></div></div>
    <div class="dbgs-skill-order__row"><span class="skills-ui__label">Skill 2</span><div class="dbgs-skill-order__cell is-on">2</div><div class="dbgs-skill-order__cell"></div><div class="dbgs-skill-order__cell is-on">4</div></div>
  </section>
  <h2 id="recommended-comps">Recommended Comps</h2><section class="free-rotation"><div class="free-rotation__item"><img src="https://dbgsbuilds.com/wp-content/themes/dbgsquad-lite/asset/Char/0028/image_character.webp"></div></section>
  <h2 id="matchups">Strong/Weak Against</h2><section class="free-rotation"><div class="free-rotation__item is-strong"><img src="https://dbgsbuilds.com/wp-content/themes/dbgsquad-lite/asset/Char/0026/image_character.webp"></div><div class="free-rotation__item is-weak"><img src="https://dbgsbuilds.com/wp-content/themes/dbgsquad-lite/asset/Char/0010/image_character.webp"></div></section>
</article></main></body></html>`;

export async function fetchBuildGuide(sourceUrl: string): Promise<BuildGuideSource> {
  if (!isTauri()) {
    await new Promise((resolve) => setTimeout(resolve, 300));
    return { sourceUrl, html: DEMO_BUILD_GUIDE };
  }
  return invoke<BuildGuideSource>("fetch_build_guide", { sourceUrl });
}

export async function detectGameProcess(processHints: string[]): Promise<ProcessStatus> {
  if (!isTauri()) return { running: false, processName: null };
  return invoke<ProcessStatus>("detect_game_process", { processHints });
}

export async function setDiscordPresence(payload: PresencePayload): Promise<void> {
  if (!isTauri()) {
    demoDiscordStatus.connected = true;
    demoDiscordStatus.updatedAt = Math.floor(Date.now() / 1000);
    return;
  }
  await invoke("set_discord_presence", { payload });
}

export async function clearDiscordPresence(): Promise<void> {
  if (!isTauri()) {
    demoDiscordStatus.connected = false;
    demoDiscordStatus.updatedAt = Math.floor(Date.now() / 1000);
    return;
  }
  await invoke("clear_discord_presence");
}

export async function getDiscordStatus(): Promise<DiscordStatus> {
  if (!isTauri()) return { ...demoDiscordStatus };
  return invoke<DiscordStatus>("discord_status");
}

export async function setLaunchAtLogin(enabled: boolean): Promise<void> {
  if (!isTauri()) return;
  await invoke("set_launch_at_login", { enabled });
}

export async function getLaunchContext(): Promise<{ background: boolean }> {
  if (!isTauri()) return { background: false };
  return invoke<{ background: boolean }>("launch_context");
}

export async function checkForUpdate(): Promise<UpdateMetadata | null> {
  if (!isTauri()) return null;
  return invoke<UpdateMetadata | null>("fetch_update");
}

export async function installPendingUpdate(onProgress: (event: UpdateDownloadEvent) => void): Promise<void> {
  if (!isTauri()) return;
  const onEvent = new Channel<UpdateDownloadEvent>();
  onEvent.onmessage = onProgress;
  await invoke("install_update", { onEvent });
}
