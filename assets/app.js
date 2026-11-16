'use strict';
const $ = id => document.getElementById(id);
let token = '', owner = '', repo = '', releases = [], currentUser = null, canWrite = false;
const template = `Program-ID: HPN-2W1S-KINCO\nProgram-Name: HPN 2W+1S\nManufacturer: Kinco\nProgram-Type: HMI\nVersion: 1.2.0\nUpload-Comments: Fixed pressure scaling and improved pump alternation.\n\nChanges:\n- Updated pressure display\n- Revised fault reset logic`;
$('template').textContent = template;
const status = (message, error=false) => { $('status').textContent = message; $('status').style.color = error ? '#b42318' : '#286044'; };
function safe(value) { return String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])); }
async function api(path, options={}) {
 const response = await fetch(`https://api.github.com${path}`, { ...options, headers: {Accept:'application/vnd.github+json',Authorization:`Bearer ${token}`,'X-GitHub-Api-Version':'2022-11-28',...(options.headers||{})},cache:'no-store'});
 if(!response.ok) { let detail='';try{detail=(await response.json()).message||''}catch{} throw new Error(`GitHub API ${response.status}: ${detail}`); }
 return response.json();
}
function metadata(body) {
 const fields={}; for(const line of (body||'').split(/\r?\n/)){const match=line.match(/^(Program-ID|Program-Name|Manufacturer|Program-Type|Version|Upload-Comments):\s*(.+)$/i);if(match)fields[match[1].toLowerCase()]=match[2].trim();}return fields;
}
function entries(){return releases.map(r=>({release:r,fields:metadata(r.body)})).filter(e=>e.fields['program-id']&&e.fields['program-name']&&e.fields['version']);}
function render(){
 const q=$('search').value.trim().toLowerCase(), maker=$('manufacturer').value, type=$('type').value;
 let items=entries().filter(e=>(!maker||e.fields.manufacturer===maker)&&(!type||e.fields['program-type']===type)&&[e.fields['program-name'],e.fields['program-id'],e.fields.version,e.fields['upload-comments'],e.release.body].join(' ').toLowerCase().includes(q));
 if($('versions').value==='latest'){const seen=new Set();items=items.filter(e=>{const id=e.fields['program-id'];if(seen.has(id))return false;seen.add(id);return true;});}
 $('count').textContent=`${items.length} release${items.length===1?'':'s'} displayed`;
 $('programs').innerHTML=items.map(({release:r,fields:f})=>`<article class="program"><div class="row"><h2>${safe(f['program-name'])}</h2><span class="pill">v${safe(f.version)}</span></div><p class="meta">${safe(f.manufacturer)} · ${safe(f['program-type'])} · ${safe(f['program-id'])}</p><p class="comment">${safe(f['upload-comments']||'No upload comments')}</p><p class="meta">Uploaded by ${safe(r.author?.login||'Unknown')} · ${safe(new Date(r.published_at||r.created_at).toLocaleString())}</p><div class="files"><strong>Download files</strong><div>${r.assets?.length?r.assets.map(a=>`<button data-asset="${a.id}">${safe(a.name)} (${(a.size/1048576).toFixed(1)} MB)</button>`).join(''):'No files attached'}</div></div><p><a href="${safe(r.html_url)}" target="_blank" rel="noopener noreferrer">Release details on GitHub ↗</a></p></article>`).join('')||'<p>No matching releases. Ask an administrator to publish a release using the provided metadata template.</p>';
 $('programs').querySelectorAll('[data-asset]').forEach(button=>button.addEventListener('click',()=>downloadAsset(button.dataset.asset,button)));
}
async function downloadAsset(id,button){
 const old=button.textContent;button.disabled=true;button.textContent='Downloading…';
 try{
  // GitHub's authenticated release asset API responds with either a redirect or binary data.
  const res=await fetch(`https://api.github.com/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/releases/assets/${encodeURIComponent(id)}`,{headers:{Authorization:`Bearer ${token}`,Accept:'application/octet-stream','X-GitHub-Api-Version':'2022-11-28'},cache:'no-store'});
  if(!res.ok)throw new Error(`Download failed: HTTP ${res.status}`);
  const contentType=res.headers.get('content-type')||'';
  if(contentType.includes('application/json'))throw new Error('GitHub returned metadata instead of the file. Open the release in GitHub to download it.');
  const asset=releases.flatMap(r=>r.assets||[]).find(a=>String(a.id)===String(id));
  const blob=await res.blob();const url=URL.createObjectURL(blob);const a=document.createElement('a');a.href=url;a.download=asset?.name||'program.zip';document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),60000);status('Download started.');
 }catch(e){status(`${e.message} You can download from the GitHub release page.`,true);}finally{button.disabled=false;button.textContent=old;}
}
async function load(){
 releases=[];for(let page=1;page<=10;page++){const batch=await api(`/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/releases?per_page=100&page=${page}`);releases.push(...batch.filter(r=>!r.draft&&!r.prerelease));if(batch.length<100)break;}
 releases.sort((a,b)=>new Date(b.published_at||b.created_at)-new Date(a.published_at||a.created_at));render();status(`Loaded ${releases.length} published releases. Max 1,000 releases per refresh.`);
}
$('connect').addEventListener('click',async()=>{
 owner=$('owner').value.trim();repo=$('repo').value.trim();token=$('token').value.trim();
 if(!/^[a-zA-Z0-9-]{1,39}$/.test(owner)||!/^[a-zA-Z0-9._-]+$/.test(repo)||!token){status('Enter a valid owner, repository, and token.',true);return;}
 $('token').value='';$('connect').disabled=true;status('Connecting to GitHub…');
 try{
  currentUser=await api('/user');const data=await api(`/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}`);
  if(!data.private)throw new Error('This repository is public. A private storage repository is required.');
  canWrite=Boolean(data.permissions?.push||data.permissions?.admin||data.permissions?.maintain);
  $('setup').hidden=true;$('dashboard').hidden=false;$('admin').hidden=!canWrite;
  $('connection').textContent=`Connected: ${currentUser.login}`;$('who').textContent=`Signed in as ${currentUser.login} · ${canWrite?'Administrator / contributor':'Viewer'}`;
  const repoUrl=`https://github.com/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}`;
  $('githubRepo').href=repoUrl;$('newRelease').href=`${repoUrl}/releases/new`;
  await load();
 }catch(e){status(e.message,true);$('setup').hidden=false;$('dashboard').hidden=true;token='';currentUser=null;}finally{$('connect').disabled=false;}
});
$('refresh').addEventListener('click',()=>load().catch(e=>status(e.message,true)));
$('disconnect').addEventListener('click',()=>{token='';owner='';repo='';releases=[];currentUser=null;canWrite=false;$('dashboard').hidden=true;$('setup').hidden=false;$('connection').textContent='Not connected';status('Disconnected.');});
['search','manufacturer','type','versions'].forEach(id=>$(id).addEventListener(id==='search'?'input':'change',render));
$('copyTemplate').addEventListener('click',async()=>{try{await navigator.clipboard.writeText(template);status('Template copied.');}catch{status('Clipboard unavailable. Copy the template manually.',true);}});
