'use strict';
const OWNER='elabnpd', REPO='industrial-program-storage', API=`https://api.github.com/repos/${OWNER}/${REPO}`;
const $=id=>document.getElementById(id);
let token='';
const enc=new TextEncoder();
function msg(id,value,error=false){$(id).textContent=value;$(id).className=error?'error':'success'}
async function gh(path,options={}){
  const response=await fetch(path.startsWith('https://')?path:`${API}${path}`,{
    ...options,headers:{'Accept':'application/vnd.github+json','Authorization':`Bearer ${token}`,'X-GitHub-Api-Version':'2022-11-28',...(options.headers||{})}
  });
  if(!response.ok){let detail='';try{detail=(await response.json()).message||''}catch{}throw new Error(`GitHub API ${response.status}: ${detail||response.statusText}`)}
  if(response.status===204)return null;
  return response.json();
}
function safe(s){return String(s||'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]))}
function decodeTag(tag){const m=/^(.+)-([0-9]+W[0-9]+S)-(HMI|PLC)-v(\d+\.\d+\.\d+)$/i.exec(tag);return m?{series:m[1],model:m[2].replace('W','W+'),kind:m[3].toUpperCase(),version:m[4]}:null}
async function load(){if(!token)return;msg('status','Loading releases…');try{
  const releases=await gh('/releases?per_page=100');
  const q=$('search').value.trim().toLowerCase(),kind=$('filter').value;
  const filtered=releases.filter(r=>{const t=decodeTag(r.tag_name);return t&&(!kind||t.kind===kind)&&`${r.name} ${r.tag_name} ${r.body}`.toLowerCase().includes(q)});
  $('releases').innerHTML=filtered.length?'':'<p class="muted">No matching releases. Publish a version to see it here.</p>';
  for(const r of filtered){const t=decodeTag(r.tag_name);const box=document.createElement('article');box.className='release';
    box.innerHTML=`<h3>${safe(t.series)} Series — ${safe(t.model)} — ${safe(t.kind)} — v${safe(t.version)}</h3><p class="muted">${safe(r.author?.login||'Unknown')} • ${safe(r.published_at||r.created_at||'')}</p><p>${safe(r.body||'No upload comments')}</p>`;
    for(const a of r.assets||[]){const b=document.createElement('button');b.textContent=`Download ${a.name}`;b.onclick=()=>downloadAsset(a);box.appendChild(b)}
    $('releases').appendChild(box);
  }msg('status',`Connected to ${OWNER}/${REPO}. ${releases.length} release(s) found.`)
}catch(e){msg('status',e.message,true)}}
async function downloadAsset(asset){try{
 const response=await fetch(asset.url,{headers:{Authorization:`Bearer ${token}`,Accept:'application/octet-stream','X-GitHub-Api-Version':'2022-11-28'}});
 if(!response.ok)throw new Error(`Download failed (${response.status}). Open the release on GitHub if your browser blocks this download.`);
 const blob=await response.blob();if(blob.type.includes('json'))throw new Error('GitHub returned metadata instead of the archive. Use the GitHub release page to download.');
 const url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download=asset.name;document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),60000)
}catch(e){msg('status',e.message,true)}}
$('auth').addEventListener('submit',async e=>{e.preventDefault();token=$('token').value.trim();$('token').value='';$('uploader').hidden=!$('admin').checked;await load()});
$('disconnect').onclick=()=>{token='';$('token').value='';$('uploader').hidden=true;$('releases').replaceChildren();msg('status','Disconnected')};
$('refresh').onclick=load;$('search').oninput=()=>{if(token)load()};$('filter').onchange=load;
const extensions=['.zip','.rar','.7z','.tar','.tar.gz','.tgz','.gz','.bz2','.xz'];
function base64(bytes){let binary='';for(let i=0;i<bytes.length;i+=8192)binary+=String.fromCharCode(...bytes.subarray(i,i+8192));return btoa(binary)}
$('upload').addEventListener('submit',async e=>{e.preventDefault();if(!token)return msg('uploadStatus','Connect with an admin token first.',true);
 const file=$('archive').files[0];if(!file)return;
 const lower=file.name.toLowerCase();if(!extensions.some(ext=>lower.endsWith(ext)))return msg('uploadStatus','Unsupported archive extension.',true);
 if(file.size>10*1024*1024)return msg('uploadStatus','Maximum archive size is 10 MiB for this GitHub-only upload method.',true);
 if(!file.size)return msg('uploadStatus','Archive is empty.',true);
 const series=$('series').value,model=$('model').value,kind=$('kind').value,version=$('version').value.trim();
 const tag=`${series}-${model.replace('+','')}-${kind}-v${version}`;
 const comment=$('comments').value.trim();if(!comment)return msg('uploadStatus','Upload comments are required.',true);
 $('uploadBtn').disabled=true;msg('uploadStatus','Checking version and preparing upload…');
 try{
   const ref=await gh('/git/ref/heads/main');
   const check=await fetch(`${API}/releases/tags/${encodeURIComponent(tag)}`,{headers:{Authorization:`Bearer ${token}`,Accept:'application/vnd.github+json'}});
   if(check.ok)throw new Error(`Version ${tag} already exists.`);
   if(check.status!==404)throw new Error(`Could not verify release: HTTP ${check.status}`);
   const id=crypto.randomUUID(),path=`incoming/${id}/${file.name}`;
   const manifest={tag,series,model,kind,version,comments:comment,filename:file.name,asset_path:path};
   // Stage the binary and its manifest in one commit to ensure the workflow sees both.
   const blob=await gh('/git/blobs',{method:'POST',body:JSON.stringify({content:base64(new Uint8Array(await file.arrayBuffer())),encoding:'base64'})});
   const metadata=await gh('/git/blobs',{method:'POST',body:JSON.stringify({content:JSON.stringify(manifest,null,2),encoding:'utf-8'})});
   const commit=await gh(`/git/commits/${ref.object.sha}`);
   const tree=await gh('/git/trees',{method:'POST',body:JSON.stringify({base_tree:commit.tree.sha,tree:[{path,mode:'100644',type:'blob',sha:blob.sha},{path:`incoming/${id}/manifest.json`,mode:'100644',type:'blob',sha:metadata.sha}]})});
   const newCommit=await gh('/git/commits',{method:'POST',body:JSON.stringify({message:`stage program ${tag}`,tree:tree.sha,parents:[ref.object.sha]})});
   await gh('/git/refs/heads/main',{method:'PATCH',body:JSON.stringify({sha:newCommit.sha,force:false})});
   msg('uploadStatus',`Upload staged successfully. GitHub Actions will publish ${tag}. Refresh releases after the workflow finishes.`);$('upload').reset();
 }catch(err){msg('uploadStatus',err.message,true)}finally{$('uploadBtn').disabled=false}
});
