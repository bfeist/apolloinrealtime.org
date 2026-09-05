# AiRT2 deployment notes

# ========================

#

# Production host: nginx on 165.227.109.165 (DigitalOcean VPS)

# Currently serving: apolloinrealtime.org/{11,13,17}/

#

# ## Deploying the typed app

#

# 1. Build: `npm run build`

# Output: .local/dist/ (typed app at .local/dist/{N}/index.html)

#

# 2. Copy .local/dist/ to the server webroot:

# rsync -avz .local/dist/ user@165.227.109.165:/var/www/apolloinrealtime.org/

# (or scp -r .local/dist/\* user@165.227.109.165:/var/www/apolloinrealtime.org/)

#

# 3. Apply nginx redirect config:

# Copy nginx-redirects.conf snippets into the nginx server block

# for apolloinrealtime.org and reload: `sudo nginx -t && sudo nginx -s reload`

#

# 4. Rollback: keep the previous webroot in a dated backup directory for 7 days.

#

# ## Cloudflare Pages alternative (if migrating off VPS)

#

# 1. Connect the AiRT2 GitHub repo to Cloudflare Pages.

# 2. Build command: `npm run build`

# Output directory: `.local/dist`

# 3. Copy \_redirects file into .local/dist/ (or add it as publicDir static asset):

# cp deploy/\_redirects .local/dist/\_redirects (run as post-build step)

# 4. Custom domain: apolloinrealtime.org → set CNAME in DNS to Cloudflare.

#
