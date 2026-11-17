"use strict";
(() => {
  const OWNER = "elabnpd";
  const REPO = "industrial-program-storage";
  const API = `https://api.github.com/repos/${OWNER}/${REPO}`;
  const STAGING_MAX = 10 * 1024 * 1024;
  const MAX_SIZE = 100 * 1000 * 1000;
  const EXTS = [".tar.gz", ".zip", ".rar", ".7z", ".tar", ".tgz", ".gz", ".bz2", ".xz"];

  let token = "";
  let adminConnected = false;
  let viewerConnected = false;
  let releases = [];
  const $ = (id) => document.getElementById(id);

  function setMessage(id, message, isError = false) {
    const el = $(id);
    if (!el) return;
    el.textContent = message;
    el.className = isError ? "error" : "success";
  }

  function tagInfo(tag) {
    const match = /^(.+)-(\d+W\d+S)-(HMI|PLC)-v(\d+\.\d+\.\d+)$/i.exec(tag || "");
    if (!match) return null;
    return {
      series: match[1],
      model: match[2].replace("W", "W+"),
      type: match[3].toUpperCase(),
      version: match[4]
    };
  }

  function supportedArchive(filename) {
    return EXTS.some((ext) => filename.toLowerCase().endsWith(ext));
  }

  async function api(path, options = {}) {
    if (!token) throw new Error("Admin GitHub token required.");
    const headers = {
      Accept: "application/vnd.github+json",
      Authorization: `Bearer ${token}`,
      "X-GitHub-Api-Version": "2022-11-28",
      ...options.headers
    };
    const url = path.startsWith("https://") ? path : `${API}${path}`;
    const response = await fetch(url, { ...options, headers });
    if (!response.ok) {
      let message = response.statusText;
      try {
        const error = await response.json();
        message = error.message || message;
      } catch (_) { /* No JSON error body */ }
      throw new Error(`GitHub ${response.status}: ${message}`);
    }
    return response.status === 204 ? null : response.json();
  }

  function displayReleases() {
    const target = $("releases");
    if (!target) return;
    target.replaceChildren();
    const query = ($("search")?.value || "").trim().toLowerCase();
    const filter = $("filter")?.value || "";
    const matches = releases.filter((release) => {
      const info = tagInfo(release.tag_name);
      return info && (!filter || info.type === filter) &&
        `${info.series} ${info.model} ${info.type} ${info.version} ${release.body || ""}`
          .toLowerCase().includes(query);
    });

    if (!matches.length) {
      const p = document.createElement("p");
      p.className = "muted";
      p.textContent = releases.length
        ? "No programs match your search."
        : "No published program releases yet.";
      target.append(p);
      return;
    }

    for (const release of matches) {
      const info = tagInfo(release.tag_name);
      const card = document.createElement("article");
      card.className = "release";
      const heading = document.createElement("h3");
      heading.textContent = `${info.series} Series / ${info.model} / ${info.type} / v${info.version}`;
      const metadata = document.createElement("p");
      metadata.className = "muted";
      metadata.textContent = `Uploaded by ${release.author?.login || "Unknown"} • ${release.published_at ? new Date(release.published_at).toLocaleString() : "Unknown date"}`;
      const comments = document.createElement("p");
      comments.textContent = release.body || "No upload comments";
      card.append(heading, metadata, comments);

      const assets = (release.assets || []).filter((asset) => supportedArchive(asset.name));
      for (const asset of assets) {
        const button = document.createElement("button");
        button.type = "button";
        button.textContent = `Download ${asset.name}`;
        button.addEventListener("click", () => downloadAsset(asset));
        card.append(button);
      }
      if (!assets.length) {
        const note = document.createElement("p");
        note.className = "muted";
        note.textContent = "No supported archive is attached to this release.";
        card.append(note);
      }
      const link = document.createElement("a");
      link.href = release.html_url;
      link.target = "_blank";
      link.rel = "noopener noreferrer";
      link.textContent = "Open release on GitHub";
      card.append(link);
      target.append(card);
    }
  }

  async function refresh() {
    if (!viewerConnected && !adminConnected) return;
    setMessage("status", "Loading published programs...");
    try {
      const result = [];
      for (let page = 1; page <= 5; page++) {
        // Public repository releases can be listed without a token.
        const response = await fetch(`${API}/releases?per_page=100&page=${page}`, {
          headers: { Accept: "application/vnd.github+json" }
        });
        if (!response.ok) {
          throw new Error(`Cannot load public releases: GitHub HTTP ${response.status}. Verify the storage repository is public.`);
        }
        const chunk = await response.json();
        if (!Array.isArray(chunk)) throw new Error("Unexpected GitHub Releases response.");
        result.push(...chunk);
        if (chunk.length < 100) break;
      }
      releases = result;
      displayReleases();
      setMessage("status", `Loaded ${releases.length} published release(s) from ${OWNER}/${REPO}.`);
    } catch (error) {
      setMessage("status", error.message, true);
    }
  }

  function downloadAsset(asset) {
    const url = asset.browser_download_url;
    if (!url || !url.startsWith(`https://github.com/${OWNER}/${REPO}/releases/download/`)) {
      setMessage("status", "A valid public GitHub Release download URL is unavailable.", true);
      return;
    }
    // Browser navigation, not fetch: avoids cross-origin asset redirect restrictions.
    setMessage("status", `Starting download: ${asset.name}`);
    window.location.assign(url);
  }

  function toBase64(bytes) {
    let output = "";
    for (let index = 0; index < bytes.length; index += 8192) {
      output += String.fromCharCode(...bytes.subarray(index, index + 8192));
    }
    return btoa(output);
  }

  async function upload(event) {
    event.preventDefault();
    if (!adminConnected || !token) {
      setMessage("uploadStatus", "Connect with an admin token first.", true);
      return;
    }
    const file = $("archive").files[0];
    if (!file) return setMessage("uploadStatus", "Choose an archive.", true);
    if (!supportedArchive(file.name)) return setMessage("uploadStatus", "Unsupported archive extension.", true);
    if (!file.size || file.size > MAX_SIZE) return setMessage("uploadStatus", "Archive must be between 1 byte and 100 MB.", true);

    const series = $("series").value.trim();
    const model = $("model").value.trim();
    const type = $("kind").value;
    const version = $("version").value.trim();
    const comments = $("comments").value.trim();
    if (!/^[A-Za-z0-9_-]+$/.test(series) || !/^\d+W\+\d+S$/.test(model) ||
        !/^(HMI|PLC)$/.test(type) || !/^\d+\.\d+\.\d+$/.test(version) || !comments) {
      return setMessage("uploadStatus", "Check Series, Model, Type, Version, and Comments.", true);
    }

    const tag = `${series}-${model.replace("+", "")}-${type}-v${version}`;
    const button = $("uploadBtn");
    button.disabled = true;
    $("manualLink").hidden = true;
    setMessage("uploadStatus", `Checking ${tag}...`);
    try {
      const existing = await fetch(`${API}/releases/tags/${encodeURIComponent(tag)}`, {
        headers: { Authorization: `Bearer ${token}`, Accept: "application/vnd.github+json" }
      });
      if (existing.ok) throw new Error(`Release ${tag} already exists.`);
      if (existing.status !== 404) throw new Error(`Cannot verify release: HTTP ${existing.status}.`);

      if (file.size > STAGING_MAX) {
        // Best effort only: uploads.github.com may block browser CORS.
        setMessage("uploadStatus", `Trying direct GitHub Release upload (${(file.size / 1e6).toFixed(1)} MB)...`);
        let release;
        try {
          release = await api("/releases", {
            method: "POST",
            body: JSON.stringify({
              tag_name: tag,
              target_commitish: "main",
              name: `${series} / ${model} / ${type} / v${version}`,
              body: comments,
              draft: true,
              prerelease: false
            })
          });
          const uploadUrl = release.upload_url.split("{")[0] + `?name=${encodeURIComponent(file.name)}`;
          const response = await fetch(uploadUrl, {
            method: "POST",
            headers: {
              Authorization: `Bearer ${token}`,
              "Content-Type": "application/octet-stream",
              Accept: "application/vnd.github+json",
              "X-GitHub-Api-Version": "2022-11-28"
            },
            body: file
          });
          if (!response.ok) throw new Error(`Asset upload HTTP ${response.status}`);
          await api(`/releases/${release.id}`, {
            method: "PATCH",
            body: JSON.stringify({ draft: false })
          });
          $("upload").reset();
          setMessage("uploadStatus", `Published ${tag}.`);
          await refresh();
        } catch (error) {
          const link = $("manualLink");
          link.href = release?.html_url || `https://github.com/${OWNER}/${REPO}/releases/new`;
          link.hidden = false;
          setMessage("uploadStatus", `Browser upload could not finish (${error.message}). Use the GitHub Release link to attach and publish the archive manually. If a draft was created, finish that draft rather than creating another release.`, true);
        }
        return;
      }

      // Small archives: stage via Git Data API; private repository workflow publishes them.
      const ref = await api("/git/ref/heads/main");
      const commit = await api(`/git/commits/${ref.object.sha}`);
      const id = crypto.randomUUID();
      const path = `incoming/${id}/${file.name}`;
      const manifest = { tag, series, model, kind: type, version, comments, filename: file.name, asset_path: path };
      const archiveBlob = await api("/git/blobs", {
        method: "POST",
        body: JSON.stringify({ content: toBase64(new Uint8Array(await file.arrayBuffer())), encoding: "base64" })
      });
      const metaBlob = await api("/git/blobs", {
        method: "POST",
        body: JSON.stringify({ content: JSON.stringify(manifest, null, 2), encoding: "utf-8" })
      });
      const tree = await api("/git/trees", {
        method: "POST",
        body: JSON.stringify({
          base_tree: commit.tree.sha,
          tree: [
            { path, mode: "100644", type: "blob", sha: archiveBlob.sha },
            { path: `incoming/${id}/manifest.json`, mode: "100644", type: "blob", sha: metaBlob.sha }
          ]
        })
      });
      const nextCommit = await api("/git/commits", {
        method: "POST",
        body: JSON.stringify({ message: `Stage program ${tag}`, tree: tree.sha, parents: [ref.object.sha] })
      });
      await api("/git/refs/heads/main", {
        method: "PATCH",
        body: JSON.stringify({ sha: nextCommit.sha, force: false })
      });
      $("upload").reset();
      setMessage("uploadStatus", `Staged ${tag}. Wait for Publish Staged Program in GitHub Actions, then refresh releases.`);
    } catch (error) {
      setMessage("uploadStatus", error.message, true);
    } finally {
      button.disabled = false;
    }
  }

  async function connectAdmin(event) {
    event.preventDefault();
    const entered = $("token").value.trim();
    const adminMode = $("admin").checked;
    $("token").value = "";
    if (!adminMode) {
      token = "";
      adminConnected = false;
      viewerConnected = true;
      $("uploader").hidden = true;
      $("library").hidden = false;
      setMessage("status", "Viewer connected. Loading releases...");
      await refresh();
      return;
    }
    if (!entered) {
      setMessage("status", "Enter an admin token.", true);
      return;
    }
    token = entered;
    try {
      // Check repo access. GitHub enforces actual write permissions on upload requests.
      await api("https://api.github.com/user");
      adminConnected = true;
      viewerConnected = true;
      $("library").hidden = false;
      $("uploader").hidden = false;
      setMessage("status", "Admin connected. Upload requires Contents: Read and write permission.");
      await refresh();
    } catch (error) {
      token = "";
      adminConnected = false;
      viewerConnected = false;
      $("library").hidden = true;
      $("uploader").hidden = true;
      const message = /GitHub 401|Bad credentials/i.test(error.message)
        ? "GitHub 401: Invalid, expired, or revoked admin token. Create a new fine-grained token and grant access to industrial-program-storage."
        : error.message;
      setMessage("status", message, true);
    }
  }

  function init() {
    const required = [
      "auth", "token", "admin", "disconnect", "uploader", "upload", "archive",
      "uploadBtn", "uploadStatus", "status", "search", "filter", "refresh",
      "releases", "library", "series", "model", "kind", "version", "comments", "manualLink"
    ];
    const missing = required.filter((id) => !$(id));
    if (missing.length) {
      console.error("Portal HTML and app.js do not match. Missing IDs:", missing.join(", "));
      return;
    }
    $("uploader").hidden = true;
    $("library").hidden = true;
    $("auth").addEventListener("submit", connectAdmin);
    $("disconnect").addEventListener("click", () => {
      token = "";
      adminConnected = false;
      viewerConnected = false;
      releases = [];
      $("releases").replaceChildren();
      $("library").hidden = true;
      $("token").value = "";
      $("uploader").hidden = true;
      setMessage("status", "Disconnected. Connect to view releases.");
    });
    $("refresh").addEventListener("click", refresh);
    $("search").addEventListener("input", displayReleases);
    $("filter").addEventListener("change", displayReleases);
    $("upload").addEventListener("submit", upload);
    setMessage("status", "Select Viewer or Admin mode and click Connect to view releases.");
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init, { once: true });
  } else {
    init();
  }
})();
