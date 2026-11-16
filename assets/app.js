"use strict";
(() => {
  const OWNER = "elabnpd";
  const REPO = "industrial-program-storage";
  const API = `https://api.github.com/repos/${OWNER}/${REPO}`;
  const STAGING_MAX = 10 * 1024 * 1024;
  const MAX_SIZE = 100 * 1000 * 1000;
  const EXTS = [".tar.gz", ".zip", ".rar", ".7z", ".tar", ".tgz", ".gz", ".bz2", ".xz"];
  let token = "";
  let releases = [];
  const $ = (id) => document.getElementById(id);
  const setMessage = (id, message, isError = false) => {
    const el = $(id);
    if (el) { el.textContent = message; el.className = isError ? "error" : "success"; }
  };
  function tagInfo(tag) {
    const m = /^(.+)-([0-9]+W[0-9]+S)-(HMI|PLC)-v([0-9]+\.[0-9]+\.[0-9]+)$/i.exec(tag || "");
    if (!m) return null;
    return { series: m[1], model: m[2].replace("W", "W+").replace(/S$/, "S"), type: m[3].toUpperCase(), version: m[4] };
  }
  async function api(url, opts = {}) {
    if (!token && opts.method && opts.method.toUpperCase() !== "GET") throw new Error("Admin token required for changes.");
    const headers = { Accept: "application/vnd.github+json", "X-GitHub-Api-Version": "2022-11-28", ...(token ? { Authorization: `Bearer ${token}` } : {}), ...opts.headers };
    const res = await fetch(url.startsWith("https://") ? url : `${API}${url}`, { ...opts, headers });
    if (!res.ok) {
      let detail = "";
      try { detail = (await res.json()).message || ""; } catch (_) {}
      if (res.status === 404) throw new Error(`GitHub 404: Check that ${OWNER}/${REPO} is public and the requested resource exists.`);
      if (res.status === 401) throw new Error("GitHub 401: Token invalid, revoked, or expired.");
      if (res.status === 403) throw new Error("GitHub 403: Insufficient permission, rate limit, or repository policy.");
      throw new Error(`GitHub ${res.status}: ${detail || res.statusText}`);
    }
    return res.status === 204 ? null : res.json();
  }
  function displayReleases() {
    const target = $("releases");
    target.replaceChildren();
    const query = $("search").value.trim().toLowerCase();
    const filter = $("filter").value;
    const matches = releases.filter((r) => {
      const t = tagInfo(r.tag_name);
      return t && (!filter || t.type === filter) &&
        `${t.series} ${t.model} ${t.type} ${t.version} ${r.body || ""}`.toLowerCase().includes(query);
    });
    if (!matches.length) {
      const p = document.createElement("p"); p.className = "muted";
      p.textContent = releases.length ? "No programs match your search." : "No published program releases yet.";
      target.append(p); return;
    }
    for (const release of matches) {
      const t = tagInfo(release.tag_name);
      const card = document.createElement("article"); card.className = "release";
      const title = document.createElement("h3");
      title.textContent = `${t.series} Series / ${t.model} / ${t.type} / v${t.version}`;
      const meta = document.createElement("p"); meta.className = "muted";
      meta.textContent = `Uploaded by ${release.author?.login || "Unknown"} • ${release.published_at ? new Date(release.published_at).toLocaleString() : "Unknown date"}`;
      const comments = document.createElement("p"); comments.textContent = release.body || "No upload comments";
      card.append(title, meta, comments);
      const assets = (release.assets || []).filter((a) => EXTS.some((ext) => a.name.toLowerCase().endsWith(ext)));
      for (const asset of assets) {
        const button = document.createElement("button"); button.type = "button";
        button.textContent = `Download ${asset.name}`;
        button.addEventListener("click", () => downloadAsset(asset, release.html_url));
        card.append(button);
      }
      const link = document.createElement("a"); link.href = release.html_url; link.target = "_blank"; link.rel = "noopener noreferrer";
      link.textContent = "Open release on GitHub"; card.append(link);
      target.append(card);
    }
  }
  async function refresh() {
    
    setMessage("status", "Loading releases...");
    try {
      await api(""); // Verify repository access; public listing works without a token.
      const result = [];
      for (let page = 1; page <= 5; page++) {
        const chunk = await api(`/releases?per_page=100&page=${page}`);
        result.push(...chunk);
        if (chunk.length < 100) break;
      }
      releases = result;
      displayReleases();
      setMessage("status", `Loaded ${releases.length} published release(s) from ${OWNER}/${REPO}.`);
    } catch (err) { setMessage("status", err.message, true); }
  }
  function downloadAsset(asset, releaseUrl) {
    const url = asset.browser_download_url;
    if (!url || !url.startsWith(`https://github.com/${OWNER}/${REPO}/releases/download/`)) {
      setMessage("status", `No valid public asset URL. Check ${releaseUrl}`, true);
      return;
    }
    // Navigate instead of fetch(): public GitHub assets can redirect across origins.
    const a = document.createElement("a");
    a.href = url;
    a.rel = "noopener noreferrer";
    a.target = "_blank";
    document.body.append(a);
    a.click();
    a.remove();
    setMessage("status", `Opening download: ${asset.name}`);
  }
  function toBase64(bytes) {
    let output = "";
    for (let i = 0; i < bytes.length; i += 8192) output += String.fromCharCode(...bytes.subarray(i, i + 8192));
    return btoa(output);
  }
  async function upload(e) {
    e.preventDefault();
    if (!token || !$("admin").checked) return setMessage("uploadStatus", "Connect with an admin write token first.", true);
    const file = $("archive").files[0];
    if (!file) return setMessage("uploadStatus", "Choose an archive.", true);
    if (!EXTS.some((ext) => file.name.toLowerCase().endsWith(ext))) return setMessage("uploadStatus", "Unsupported archive extension.", true);
    if (!file.size || file.size > MAX_SIZE) return setMessage("uploadStatus", "Archive must be between 1 byte and 100 MB.", true);
    const series = $("series").value.trim();
    const model = $("model").value.trim();
    const type = $("kind").value;
    const version = $("version").value.trim();
    const comments = $("comments").value.trim();
    if (!/^[A-Za-z0-9_-]+$/.test(series) || !/^\d+W\+\d+S$/.test(model) || !/^\d+\.\d+\.\d+$/.test(version) || !comments)
      return setMessage("uploadStatus", "Check Series, Model, Version, and Comments.", true);
    const tag = `${series}-${model.replace("+", "")}-${type}-v${version}`;
    const button = $("uploadBtn"); button.disabled = true;
    $("manualLink").hidden = true;
    setMessage("uploadStatus", "Checking version and staging archive...");
    try {
      const existing = await fetch(`${API}/releases/tags/${encodeURIComponent(tag)}`, {
        headers: { Authorization: `Bearer ${token}`, Accept: "application/vnd.github+json" }
      });
      if (existing.ok) throw new Error(`Release ${tag} already exists.`);
      if (existing.status !== 404) throw new Error(`Cannot verify release (${existing.status}).`);
      if (file.size > STAGING_MAX) {
        // The Git data API staging path is intentionally restricted to small files.
        // GitHub's release upload host may reject cross-origin browser requests.
        setMessage("uploadStatus", `Trying direct GitHub Release upload for ${(file.size / 1e6).toFixed(1)} MB...`);
        let release;
        try {
          release = await api("/releases", { method: "POST", body: JSON.stringify({
            tag_name: tag, target_commitish: "main", name: `${series} / ${model} / ${type} / v${version}`,
            body: comments, draft: true, prerelease: false
          }) });
          const uploadUrl = release.upload_url.split("{")[0] + `?name=${encodeURIComponent(file.name)}`;
          const uploadResponse = await fetch(uploadUrl, {
            method: "POST", headers: {
              Authorization: `Bearer ${token}`, "Content-Type": "application/octet-stream",
              Accept: "application/vnd.github+json", "X-GitHub-Api-Version": "2022-11-28"
            }, body: file
          });
          if (!uploadResponse.ok) throw new Error(`Asset upload HTTP ${uploadResponse.status}`);
          await api(`/releases/${release.id}`, { method: "PATCH", body: JSON.stringify({ draft: false }) });
          setMessage("uploadStatus", `Published ${tag}. Click Refresh releases.`);
          await refresh();
        } catch (error) {
          // Never publish an empty draft. Keep it for the admin to complete manually.
          const url = release?.html_url || `https://github.com/${OWNER}/${REPO}/releases/new`;
          const link = $("manualLink"); link.href = url; link.hidden = false;
          setMessage("uploadStatus", `Browser upload failed (${error.message}). GitHub may block cross-origin release uploads. Use the manual GitHub Release link below to attach the archive (GitHub sign-in required for this fallback).`, true);
        }
        return;
      }
      const ref = await api("/git/ref/heads/main");
      const commit = await api(`/git/commits/${ref.object.sha}`);
      const id = crypto.randomUUID();
      const path = `incoming/${id}/${file.name}`;
      const manifest = { tag, series, model, kind: type, version, comments, filename: file.name, asset_path: path };
      const archiveBlob = await api("/git/blobs", { method: "POST", body: JSON.stringify({ content: toBase64(new Uint8Array(await file.arrayBuffer())), encoding: "base64" }) });
      const metaBlob = await api("/git/blobs", { method: "POST", body: JSON.stringify({ content: JSON.stringify(manifest, null, 2), encoding: "utf-8" }) });
      const tree = await api("/git/trees", { method: "POST", body: JSON.stringify({ base_tree: commit.tree.sha, tree: [
        { path, mode: "100644", type: "blob", sha: archiveBlob.sha },
        { path: `incoming/${id}/manifest.json`, mode: "100644", type: "blob", sha: metaBlob.sha }
      ] }) });
      const nextCommit = await api("/git/commits", { method: "POST", body: JSON.stringify({ message: `Stage program ${tag}`, tree: tree.sha, parents: [ref.object.sha] }) });
      await api("/git/refs/heads/main", { method: "PATCH", body: JSON.stringify({ sha: nextCommit.sha, force: false }) });
      $("upload").reset();
      setMessage("uploadStatus", `Staged ${tag}. Wait for the private repository's Publish Staged Program action, then click Refresh releases.`);
    } catch (err) { setMessage("uploadStatus", err.message, true); }
    finally { button.disabled = false; }
  }
  function init() {
    const ids = ["auth", "token", "admin", "disconnect", "uploader", "upload", "archive", "uploadBtn", "uploadStatus", "status", "search", "filter", "refresh", "releases", "series", "model", "kind", "version", "comments", "manualLink"];
    const missing = ids.filter((id) => !$(id));
    if (missing.length) { console.error("Portal HTML and JavaScript versions do not match. Missing IDs:", missing.join(", ")); return; }
    $("auth").addEventListener("submit", async (e) => {
      e.preventDefault();
      token = $("token").value.trim();
      $("token").value = "";
      $("uploader").hidden = !$("admin").checked;
      await refresh();
    });
    $("disconnect").addEventListener("click", () => {
      token = ""; releases = []; $("token").value = "";
      $("uploader").hidden = true; $("releases").replaceChildren();
      setMessage("status", "Disconnected.");
    });
    $("refresh").addEventListener("click", refresh);
    $("search").addEventListener("input", displayReleases);
    $("filter").addEventListener("change", displayReleases);
    $("upload").addEventListener("submit", upload);
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init, { once: true });
  else init();
})();