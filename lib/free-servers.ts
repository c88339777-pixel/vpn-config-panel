import "server-only";

/**
 * Free public server lists (same sources as the Android app), merged into one small list.
 * The result is cached in memory for a few hours so the lists are not downloaded on every request.
 */

type Source = { repo: string; branch: string; path: string };

const SOURCES: Source[] = [
  { repo: "morpheusadam/v2ray-config", branch: "main", path: "subs/bundles/hysteria2.txt" },
  { repo: "rtwo2/FastNodes", branch: "main", path: "sub/protocols/hysteria2.txt" },
  { repo: "rtwo2/FastNodes", branch: "main", path: "sub/protocols/hysteria2_part2.txt" },
  { repo: "rtwo2/FastNodes", branch: "main", path: "sub/protocols/hysteria2_part3.txt" },
  { repo: "rtwo2/FastNodes", branch: "main", path: "sub/protocols/hysteria2_part4.txt" },
  { repo: "Argh73/VpnConfigCollector", branch: "main", path: "Splitted-By-Protocol/Hysteria2.txt" },
  { repo: "Argh94/Proxy-List", branch: "main", path: "Hysteria2.txt" },
  { repo: "Argh94/V2RayAutoConfig", branch: "main", path: "configs/Hysteria2.txt" },
  { repo: "10ium/VpnClashFaCollector", branch: "main", path: "sub/all/hysteria2.txt" },
  { repo: "10Dream/sub-mod", branch: "main", path: "sub/split/protocols/hy2.txt" },
  { repo: "V2RayRoot/V2RayConfig", branch: "main", path: "Config/vless.txt" },
  { repo: "4n0nymou3/multi-proxy-config-fetcher", branch: "main", path: "configs/proxy_configs_tested.txt" },
  { repo: "kingowow/Kingo-vpn", branch: "main", path: "server/KingoVpn.txt" },
  { repo: "hello-world-1989/cn-news", branch: "main", path: "end-gfw-together" },
  { repo: "sakha1370/OpenRay", branch: "main", path: "output/kind/ss.txt" },
  { repo: "F0rc3Run/F0rc3Run", branch: "main", path: "splitted-by-protocol/shadowsocks.txt" },
  { repo: "barry-far/V2ray-Config", branch: "main", path: "Splitted-By-Protocol/ss.txt" },
  { repo: "barry-far/V2ray-Config", branch: "main", path: "Splitted-By-Protocol/vless.txt" },
  { repo: "barry-far/V2ray-Config", branch: "main", path: "Splitted-By-Protocol/trojan.txt" },
  { repo: "Epodonios/v2ray-configs", branch: "main", path: "Splitted-By-Protocol/ss.txt" },
  { repo: "Epodonios/v2ray-configs", branch: "main", path: "Splitted-By-Protocol/vless.txt" },
  { repo: "ebrasha/free-v2ray-public-list", branch: "main", path: "ss_configs.txt" },
  { repo: "mahdibland/ShadowsocksAggregator", branch: "master", path: "sub/splitted/ss.txt" },
];

// WireGuard links are left out: the iPhone clients do not handle them reliably in a subscription.
const LINK = /^(hysteria2|hy2|vless|vmess|trojan|ss):\/\/\S+$/i;
const HOST_PORT = /:\/\/(?:[^@/?#]*@)?([^/?#]+)/;

const PER_SOURCE = 40;
const MAX_TOTAL = 200;
const MAX_LINES = 5000;
const FETCH_TIMEOUT_MS = 7000;
const CACHE_TTL_MS = 3 * 60 * 60 * 1000;

let cache: { at: number; links: string[] } | null = null;
let inflight: Promise<string[]> | null = null;

async function fetchText(url: string) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

  try {
    const response = await fetch(url, { signal: controller.signal, cache: "no-store" });
    if (!response.ok) return "";
    return (await response.text()).slice(0, 3_000_000);
  } catch {
    return "";
  } finally {
    clearTimeout(timer);
  }
}

function scan(body: string) {
  return body
    .split(/\r?\n/, MAX_LINES)
    .map((line) => line.trim())
    .filter((line) => LINK.test(line));
}

function extractLinks(text: string) {
  const plain = scan(text);
  if (plain.length > 0) return plain;

  // Some lists are published base64-encoded.
  const compact = text.trim();
  if (compact && /^[A-Za-z0-9+/=_\-\s]+$/.test(compact)) {
    try {
      return scan(Buffer.from(compact, "base64").toString("utf8"));
    } catch {
      return [];
    }
  }
  return [];
}

async function fetchSource(source: Source) {
  const raw = `https://raw.githubusercontent.com/${source.repo}/${source.branch}/${source.path}`;
  const mirror = `https://cdn.jsdelivr.net/gh/${source.repo}@${source.branch}/${source.path}`;

  for (const url of [raw, mirror]) {
    const text = await fetchText(url);
    if (!text) continue;
    const links = extractLinks(text);
    if (links.length > 0) return links;
  }
  return [];
}

function shuffle<T>(items: T[]) {
  const copy = items.slice();
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

function pick(lists: string[][]) {
  const seen = new Set<string>();
  const picked: string[] = [];

  // Round-robin over the lists so one big list cannot crowd out the others.
  const queues = lists.map((list) => shuffle(list).slice(0, PER_SOURCE));
  let added = true;

  while (picked.length < MAX_TOTAL && added) {
    added = false;
    for (const queue of queues) {
      if (picked.length >= MAX_TOTAL) break;
      while (queue.length > 0) {
        const link = queue.shift() as string;
        const key = (HOST_PORT.exec(link)?.[1] || link).toLowerCase();
        if (!seen.has(key)) {
          seen.add(key);
          picked.push(link.replace(/^hy2:\/\//i, "hysteria2://"));
          added = true;
          break;
        }
      }
    }
  }

  return picked;
}

async function build() {
  const lists = await Promise.all(SOURCES.map(fetchSource));
  return pick(lists);
}

export async function getFreeLinks(): Promise<string[]> {
  if (cache && Date.now() - cache.at < CACHE_TTL_MS) return cache.links;

  if (!inflight) {
    inflight = build().finally(() => {
      inflight = null;
    });
  }

  const links = await inflight;

  if (links.length > 0) {
    cache = { at: Date.now(), links };
    return links;
  }

  // Better an older list than none.
  return cache ? cache.links : [];
}
