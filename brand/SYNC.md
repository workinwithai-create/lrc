# How this folder stays in sync

This `brand/` folder is a **copy** of the canonical repo:
https://github.com/workinwithai-create/workinwithai-brand

Why a copy instead of an npm package: the repos are private, and private
git/npm dependencies need extra token setup in every Vercel project.
A vendored copy builds everywhere with zero config. Working today beats perfect.

## To update this app to the latest brand

```bash
# from the app repo root
rm -rf brand && git clone --depth 1 https://github.com/workinwithai-create/workinwithai-brand brand && rm -rf brand/.git
git add brand && git commit -m "chore: sync brand package"
```

Never edit files in `brand/` directly inside an app — change the canonical
repo first, then re-sync, or apps will drift apart.
