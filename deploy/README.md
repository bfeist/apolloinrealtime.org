# AiRT2 deployment notes
# ========================
#
# Production host: nginx on 165.227.109.165 (DigitalOcean VPS)
# Currently serving: apolloinrealtime.org/{11,13,17}/
#
# ## Deploying the typed app
#
# 1. Build: `npm run build`
#    Output: dist/ (typed app at dist/{N}/index.html, purged of legacy JS)
#
# 2. Copy dist/ to the server webroot:
#    rsync -avz dist/ user@165.227.109.165:/var/www/apolloinrealtime.org/
#    (or scp -r dist/* user@165.227.109.165:/var/www/apolloinrealtime.org/)
#
# 3. Apply nginx redirect config:
#    Copy nginx-redirects.conf snippets into the nginx server block
#    for apolloinrealtime.org and reload: `sudo nginx -t && sudo nginx -s reload`
#
# 4. Rollback: keep the previous webroot in a dated backup directory for 7 days.
#
# ## Cloudflare Pages alternative (if migrating off VPS)
#
# 1. Connect the AiRT2 GitHub repo to Cloudflare Pages.
# 2. Build command: `npm run build`
#    Output directory: `dist`
# 3. Copy _redirects file into dist/ (or add it as publicDir static asset):
#    cp deploy/_redirects dist/_redirects  (run as post-build step)
# 4. Custom domain: apolloinrealtime.org → set CNAME in DNS to Cloudflare.
#
# ## Post-cutover cleanup (Phase 7 step 6)
#
# After 7 days with no regression reports, delete legacy payloads from the repo:
#   git rm -r public/{11,13,17}/{index.js,navigator.js,ajax.js,styles.css,TOC.html}
#   git rm -r public/{11,13,17}/lib/  (keep paper-full.js as vendored dep)
#   git rm -r public/{11,13,17}/MOCRviz/{MOCRviz.html,MOCRviz.js,MOCRviz.css,js/}
#   git rm -r legacy-oracle/ legacy-src/
#   Remove legacyOraclePlugin from vite.config.ts
