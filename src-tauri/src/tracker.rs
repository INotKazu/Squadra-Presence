use reqwest::{header::RETRY_AFTER, Client, StatusCode};
use serde::Serialize;
use serde_json::{json, Value};
use std::time::Duration;

const TRACKER_ENDPOINT: &str = "https://dbgsbuilds.com/wp-json/dbgs/v1/player-search";
const HERO_REFERENCE_ROOT: &str = "https://dbgsbuilds.com/wp-content/themes/dbgsquad-lite/asset/Char";

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct AbilityReference {
    slot: String,
    key: String,
    name: String,
    description: String,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct BuildGuideSource {
    source_url: String,
    html: String,
}

fn valid_public_id(value: &str) -> bool {
    let groups: Vec<&str> = value.split('-').collect();
    let valid_lengths = groups.len() == 5
        && groups[0].len() == 8
        && groups[1].len() == 4
        && groups[2].len() == 4
        && groups[3].len() == 4
        && groups[4].len() == 12;
    valid_lengths && groups.iter().all(|group| group.bytes().all(|byte| byte.is_ascii_hexdigit()))
}

fn strip_internal_fields(value: &mut Value) {
    match value {
        Value::Object(map) => {
            for key in ["_share_blob", "proof", "player_code", "auth_token"] {
                map.remove(key);
            }
            for child in map.values_mut() {
                strip_internal_fields(child);
            }
        }
        Value::Array(items) => {
            for child in items {
                strip_internal_fields(child);
            }
        }
        _ => {}
    }
}

#[tauri::command(rename_all = "camelCase")]
pub async fn fetch_tracker_profile(public_id: String) -> Result<Value, String> {
    let public_id = public_id.trim().to_lowercase();
    if !valid_public_id(&public_id) {
        return Err("The public player ID must be a valid UUID.".into());
    }

    let client = Client::builder()
        .timeout(Duration::from_secs(15))
        .user_agent("SquadraPresence/0.6.2 (+local desktop companion)")
        .build()
        .map_err(|error| format!("Could not initialize tracker networking: {error}"))?;

    let response = client
        .post(TRACKER_ENDPOINT)
        .header("Accept", "application/json")
        .json(&json!({ "query": public_id }))
        .send()
        .await
        .map_err(|error| format!("Could not reach DBGS Builds: {error}"))?;

    let status = response.status();
    if status == StatusCode::TOO_MANY_REQUESTS {
        let retry_hint = response
            .headers()
            .get(RETRY_AFTER)
            .and_then(|value| value.to_str().ok())
            .map(|value| format!(" Retry-After: {value} seconds."))
            .unwrap_or_default();
        return Err(format!(
            "DBGS Builds returned HTTP 429 Too Many Requests.{retry_hint} The app will pause automatic sync and keep your last successful data active."
        ));
    }
    if !status.is_success() {
        return Err(format!("DBGS Builds returned HTTP {status}. Your last successful data remains active."));
    }

    let mut payload = response
        .json::<Value>()
        .await
        .map_err(|error| format!("DBGS Builds returned invalid JSON: {error}"))?;
    strip_internal_fields(&mut payload);
    Ok(payload)
}

fn valid_hero_id(value: &str) -> bool {
    value.len() == 4 && value.bytes().all(|byte| byte.is_ascii_digit())
}

fn parse_ability_text(slot: &str, key: &str, value: &str) -> Option<AbilityReference> {
    let mut lines = value.lines().map(str::trim).filter(|line| !line.is_empty());
    let name = lines.next()?.trim_matches('\u{feff}').trim();
    let description = lines.collect::<Vec<_>>().join("\n");
    if name.is_empty() || description.is_empty() {
        return None;
    }
    Some(AbilityReference {
        slot: slot.into(),
        key: key.into(),
        name: name.into(),
        description,
    })
}

#[tauri::command(rename_all = "camelCase")]
pub async fn fetch_hero_abilities(hero_id: String) -> Result<Vec<AbilityReference>, String> {
    let hero_id = hero_id.trim();
    if !valid_hero_id(hero_id) {
        return Err("The hero reference ID must contain exactly four digits.".into());
    }

    let client = Client::builder()
        .timeout(Duration::from_secs(12))
        .user_agent("SquadraPresence/0.6.2 (+local desktop companion)")
        .build()
        .map_err(|error| format!("Could not initialize reference networking: {error}"))?;
    let candidates = [
        ("Passive", "icon_passive1"),
        ("Rush", "icon_rush_attack1"),
        ("Skill 1", "icon_skill1"),
        ("Skill 2", "icon_skill2"),
        ("Skill 3", "icon_skill3"),
        ("Super", "icon_super_attack1"),
        ("Transformation", "icon_transformation1"),
    ];
    let mut abilities = Vec::new();

    for (slot, key) in candidates {
        let url = format!("{HERO_REFERENCE_ROOT}/{hero_id}/skill/{key}.txt");
        let response = client
            .get(url)
            .header("Accept", "text/plain")
            .send()
            .await
            .map_err(|error| format!("Could not reach the DBGS ability reference: {error}"))?;
        if response.status() == StatusCode::NOT_FOUND {
            continue;
        }
        if response.status() == StatusCode::TOO_MANY_REQUESTS {
            return Err("DBGS Builds is temporarily rate-limiting ability references. Try this tab again in a few minutes.".into());
        }
        if !response.status().is_success() {
            return Err(format!("DBGS Builds returned HTTP {} while loading ability details.", response.status()));
        }
        let text = response
            .text()
            .await
            .map_err(|error| format!("Could not read an ability reference: {error}"))?;
        if let Some(ability) = parse_ability_text(slot, key, &text) {
            abilities.push(ability);
        }
    }

    if abilities.is_empty() {
        return Err("No ability reference is currently available for this fighter.".into());
    }
    Ok(abilities)
}

fn normalize_build_url(value: &str) -> Option<String> {
    const PREFIX: &str = "https://dbgsbuilds.com/build/";
    let normalized = value.trim().trim_end_matches('/');
    let slug = normalized.strip_prefix(PREFIX)?;
    if slug.is_empty()
        || slug.len() > 96
        || !slug
            .bytes()
            .all(|byte| byte.is_ascii_alphanumeric() || byte == b'-')
    {
        return None;
    }
    Some(format!("{PREFIX}{slug}/"))
}

#[tauri::command(rename_all = "camelCase")]
pub async fn fetch_build_guide(source_url: String) -> Result<BuildGuideSource, String> {
    let source_url = normalize_build_url(&source_url)
        .ok_or_else(|| "Only published DBGS Builds guide URLs are supported.".to_string())?;
    let client = Client::builder()
        .timeout(Duration::from_secs(15))
        .user_agent("SquadraPresence/0.6.2 (+local desktop companion)")
        .build()
        .map_err(|error| format!("Could not initialize guide networking: {error}"))?;
    let response = client
        .get(&source_url)
        .header("Accept", "text/html")
        .send()
        .await
        .map_err(|error| format!("Could not reach the DBGS build guide: {error}"))?;
    if response.status() == StatusCode::TOO_MANY_REQUESTS {
        return Err("DBGS Builds is temporarily rate-limiting guide requests. The cached core recommendation remains available.".into());
    }
    if !response.status().is_success() {
        return Err(format!(
            "DBGS Builds returned HTTP {} while loading the expanded guide.",
            response.status()
        ));
    }
    if response.content_length().unwrap_or(0) > 2_000_000 {
        return Err("The guide response was unexpectedly large and was not processed.".into());
    }
    let html = response
        .text()
        .await
        .map_err(|error| format!("Could not read the expanded build guide: {error}"))?;
    if html.len() > 2_000_000 || !html.contains("<html") {
        return Err("DBGS Builds returned an unexpected guide document.".into());
    }
    Ok(BuildGuideSource { source_url, html })
}

#[cfg(test)]
mod tests {
    use super::{normalize_build_url, parse_ability_text, valid_hero_id, valid_public_id};

    #[test]
    fn validates_public_uuid() {
        assert!(valid_public_id("12345678-1234-4abc-8def-1234567890ab"));
        assert!(!valid_public_id("not-a-public-uuid"));
    }

    #[test]
    fn validates_hero_reference_id() {
        assert!(valid_hero_id("0030"));
        assert!(!valid_hero_id("30"));
        assert!(!valid_hero_id("00x0"));
    }

    #[test]
    fn parses_ability_reference_text() {
        let parsed = parse_ability_text("Passive", "icon_passive1", "FIGHTER SPIRIT\nBuild power after taking damage.\nThe gauge fades over time.").unwrap();
        assert_eq!(parsed.name, "FIGHTER SPIRIT");
        assert_eq!(parsed.description, "Build power after taking damage.\nThe gauge fades over time.");
    }

    #[test]
    fn restricts_build_guide_urls() {
        assert_eq!(
            normalize_build_url("https://dbgsbuilds.com/build/build-super-saiyan-bardock/"),
            Some("https://dbgsbuilds.com/build/build-super-saiyan-bardock/".into())
        );
        assert!(normalize_build_url("https://example.com/build/bardock/").is_none());
        assert!(normalize_build_url("https://dbgsbuilds.com/build/../privacy/").is_none());
    }
}
