import { CalendarDays, Gift, Layers3, ShieldQuestion, Sparkles, Trophy } from "lucide-react";
import { CARDS, SEASON_7_NEW_CARDS, getCardsForSlot } from "../lib/cards";
import { SEASON_7_CAMPAIGNS, SEASON_7_MILESTONES } from "../lib/season7";

export function SeasonSevenHub() {
  const activeCards = ([1, 2, 3] as const).flatMap((slot) => getCardsForSlot(slot));
  const returningCount = activeCards.filter((card) => card.introducedSeason === "6").length;
  const archivedCount = CARDS.filter((card) => card.retiredAfterSeason === "6").length;

  return (
    <div className="season7-content">
      <section className="season7-banner build-surface">
        <div className="season7-banner-mark"><span>1</span><small>ST</small></div>
        <div>
          <span className="eyebrow">1st Anniversary • September 9</span>
          <h2>Season 7 operations board</h2>
          <p>The current MOBA season stays front and center: three hero drops, a complete Divine Combo Card rotation, anniversary campaigns, and two GEKISHIN Cups.</p>
        </div>
        <div className="season7-counts" aria-label="Season 7 card rotation summary">
          <span><strong>{SEASON_7_NEW_CARDS.length}</strong> new cards</span>
          <span><strong>{returningCount}</strong> returning</span>
          <span><strong>{archivedCount}</strong> rotated out</span>
        </div>
      </section>

      <section className="season7-roadmap build-surface">
        <div className="build-section-heading">
          <div><span className="eyebrow">Published release dates</span><h3><CalendarDays size={17} /> Hero roadmap</h3></div>
          <span className="season7-live-chip">Season 7</span>
        </div>
        <div className="season7-milestones">
          {SEASON_7_MILESTONES.map((milestone, index) => (
            <article key={milestone.date}>
              <time>{milestone.date}</time>
              <div className={index ? "season7-unknown-hero" : "season7-gogeta-mark"}>
                {index ? <ShieldQuestion /> : <Sparkles />}
              </div>
              <span>{index ? "Reveal pending" : "Confirmed"}</span>
              <h4>{milestone.title}</h4>
              <p>{milestone.detail}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="season7-cards build-surface">
        <div className="build-section-heading">
          <div><span className="eyebrow">Current build pool</span><h3><Layers3 size={17} /> Divine Combo Cards</h3></div>
          <span className="season7-live-chip">{activeCards.length} active</span>
        </div>
        <div className="season7-card-columns">
          {([1, 2, 3] as const).map((slot) => (
            <article key={slot}>
              <header><span>0{slot}</span><div><small>Build position</small><strong>Card {slot}</strong></div></header>
              <div>
                {getCardsForSlot(slot).map((card) => (
                  <div className={`season7-card-line season7-card-line--${card.family}`} key={card.id}>
                    <img src={card.portrait} alt="" />
                    <span><strong>{card.name}</strong><small>{card.introducedSeason === "7" ? "New in S7" : "Returning"}</small></span>
                  </div>
                ))}
              </div>
            </article>
          ))}
        </div>
      </section>

      <section className="season7-campaigns build-surface">
        <div className="build-section-heading">
          <div><span className="eyebrow">Anniversary schedule</span><h3><Gift size={17} /> Campaign watchlist</h3></div>
          <Trophy size={20} />
        </div>
        <div>
          {SEASON_7_CAMPAIGNS.map((campaign) => <span key={campaign}>{campaign}</span>)}
        </div>
      </section>

      <p className="build-source-note">Based on the official Season 7 reveal. Dates, visuals, effects, and campaign contents may change before release; in-game notices remain authoritative.</p>
    </div>
  );
}
