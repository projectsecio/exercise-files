-- Synthetic threat-intel panel snapshots (local lab only)
INSERT INTO dashboard.panel_feed (panel_name, source_feed, payload, collected_at) VALUES
(
  'security_news_rss',
  'synthetic://security-news',
  '{"items":[{"title":"[SYNTH] Critical RCE in widely deployed edge proxy","url":"#","published":"Mon, 12 May 2026 09:00:00 GMT","summary":"Synthetic headline for local dashboard."},{"title":"[SYNTH] Ransomware group targets healthcare MSSPs","url":"#","published":"Sun, 11 May 2026 14:30:00 GMT","summary":"Synthetic headline."},{"title":"[SYNTH] New MFA bypass technique observed in the wild","url":"#","published":"Sat, 10 May 2026 11:15:00 GMT","summary":"Synthetic headline."},{"title":"[SYNTH] Supply-chain compromise in popular CI plugin","url":"#","published":"Fri, 09 May 2026 08:45:00 GMT","summary":"Synthetic headline."},{"title":"[SYNTH] CISA adds actively exploited CVE to KEV catalog","url":"#","published":"Thu, 08 May 2026 16:00:00 GMT","summary":"Synthetic headline."}],"items_count":5,"fetched_at":"2026-05-16T12:00:00Z"}'::jsonb,
  now()
),
(
  'top_100_domains',
  'synthetic://threatfox-domains',
  '{"items":[{"rank":1,"domain":"evil-cdn.example","count":842,"title":"1. evil-cdn.example (842)"},{"rank":2,"domain":"update-checker.bad","count":611,"title":"2. update-checker.bad (611)"},{"rank":3,"domain":"phish-login.net","count":504,"title":"3. phish-login.net (504)"},{"rank":4,"domain":"malware-drop.io","count":398,"title":"4. malware-drop.io (398)"},{"rank":5,"domain":"free-pdf.biz","count":287,"title":"5. free-pdf.biz (287)"},{"rank":6,"domain":"secure-bank.co","count":201,"title":"6. secure-bank.co (201)"},{"rank":7,"domain":"cdn-assets.xyz","count":176,"title":"7. cdn-assets.xyz (176)"},{"rank":8,"domain":"tor-exit.fake","count":142,"title":"8. tor-exit.fake (142)"},{"rank":9,"domain":"botnet-c2.ru","count":98,"title":"9. botnet-c2.ru (98)"},{"rank":10,"domain":"staging-api.dev","count":67,"title":"10. staging-api.dev (67)"}],"items_count":10,"fetched_at":"2026-05-16T12:00:00Z"}'::jsonb,
  now()
),
(
  'top_ips',
  'synthetic://threatfox-ips',
  '{"items":[{"rank":1,"ip":"203.0.113.45","count":1204,"title":"203.0.113.45"},{"rank":2,"ip":"198.51.100.88","count":933,"title":"198.51.100.88"},{"rank":3,"ip":"192.0.2.17","count":801,"title":"192.0.2.17"},{"rank":4,"ip":"203.0.113.201","count":654,"title":"203.0.113.201"},{"rank":5,"ip":"198.51.100.12","count":512,"title":"198.51.100.12"},{"rank":6,"ip":"192.0.2.99","count":445,"title":"192.0.2.99"},{"rank":7,"ip":"203.0.113.77","count":320,"title":"203.0.113.77"},{"rank":8,"ip":"198.51.100.200","count":288,"title":"198.51.100.200"},{"rank":9,"ip":"192.0.2.55","count":190,"title":"192.0.2.55"},{"rank":10,"ip":"203.0.113.10","count":102,"title":"203.0.113.10"}],"items_count":10,"fetched_at":"2026-05-16T12:00:00Z"}'::jsonb,
  now()
),
(
  'top_10_countries_by_ip',
  'synthetic://geolite2',
  '{"items":[{"rank":1,"country_code":"US","country_name":"United States","count":1842},{"rank":2,"country_code":"CN","country_name":"China","count":1203},{"rank":3,"country_code":"RU","country_name":"Russia","count":987},{"rank":4,"country_code":"DE","country_name":"Germany","count":654},{"rank":5,"country_code":"NL","country_name":"Netherlands","count":501},{"rank":6,"country_code":"GB","country_name":"United Kingdom","count":433},{"rank":7,"country_code":"BR","country_name":"Brazil","count":388},{"rank":8,"country_code":"IN","country_name":"India","count":290},{"rank":9,"country_code":"FR","country_name":"France","count":210},{"rank":10,"country_code":"UA","country_name":"Ukraine","count":175}],"items_count":10,"fetched_at":"2026-05-16T12:00:00Z"}'::jsonb,
  now()
),
(
  'top_malware_hashes',
  'synthetic://threatfox-hashes',
  '{"items":[{"rank":1,"hash":"e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855","hash_type":"sha256_hash","count":44,"malware":"SyntheticLoader","title":"e3b0c442... (44)"},{"rank":2,"hash":"a665a45920422f9d417e4867efdc4fb8a04a1f3fff1fa07e998e86f7f7a27ae3","hash_type":"sha256_hash","count":31,"malware":"ProjectXCrypt","title":"a665a459... (31)"},{"rank":3,"hash":"ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad","hash_type":"sha256_hash","count":28,"malware":"CloudBot","title":"ba7816bf... (28)"},{"rank":4,"hash":"3e23e8160039594a33894f6564e58b892de3d0a164a843ee76baf78551c0ca","hash_type":"sha256_hash","count":19,"malware":"StealerX","title":"3e23e816... (19)"},{"rank":5,"hash":"ef2d127de37b942baad06145e54b0c619a1a2c52516199a0a675f95e329e268","hash_type":"sha256_hash","count":15,"malware":"RansomLite","title":"ef2d127d... (15)"}],"items_count":5,"fetched_at":"2026-05-16T12:00:00Z"}'::jsonb,
  now()
),
(
  'top_iocs',
  'synthetic://threatfox-iocs',
  '{"items":[{"rank":1,"ioc_type":"ip:port","ioc_value":"203.0.113.45:443","count":88,"title":"[ip:port] 203.0.113.45:443"},{"rank":2,"ioc_type":"domain","ioc_value":"evil-cdn.example","count":72,"title":"[domain] evil-cdn.example"},{"rank":3,"ioc_type":"url","ioc_value":"http://phish-login.net/signin","count":61,"title":"[url] http://phish-login.net/signin"},{"rank":4,"ioc_type":"email","ioc_value":"billing@secure-bank.co","count":45,"title":"[email] billing@secure-bank.co"},{"rank":5,"ioc_type":"sha256_hash","ioc_value":"e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855","count":44,"title":"[sha256_hash] e3b0c442..."},{"rank":6,"ioc_type":"ip:port","ioc_value":"198.51.100.88:8080","count":39,"title":"[ip:port] 198.51.100.88:8080"},{"rank":7,"ioc_type":"domain","ioc_value":"malware-drop.io","count":33,"title":"[domain] malware-drop.io"},{"rank":8,"ioc_type":"url","ioc_value":"https://update-checker.bad/payload","count":28,"title":"[url] https://update-checker.bad/payload"}],"items_count":8,"fetched_at":"2026-05-16T12:00:00Z"}'::jsonb,
  now()
);
