(function(){
  'use strict';
  const norm=s=>String(s||'').trim();
  let modal=null;

  function ensureModal(){
    if(modal)return modal;
    modal=document.createElement('div');
    modal.className='link-universal-preview';
    modal.setAttribute('aria-hidden','true');
    modal.innerHTML=`
      <div class="link-universal-preview-backdrop" data-preview-close></div>
      <section class="link-universal-preview-dialog" role="dialog" aria-modal="true" aria-labelledby="link-preview-title">
        <header class="link-universal-preview-header">
          <h2 id="link-preview-title">Preview</h2>
          <button type="button" class="link-universal-preview-close" data-preview-close aria-label="Close preview">×</button>
        </header>
        <div class="link-universal-preview-body" id="link-preview-body"></div>
      </section>`;
    document.body.appendChild(modal);
    modal.querySelectorAll('[data-preview-close]').forEach(b=>b.addEventListener('click',close));
    document.addEventListener('keydown',e=>{if(e.key==='Escape'&&modal?.classList.contains('is-open'))close()});
    return modal;
  }

  function close(){
    if(!modal)return;
    modal.classList.remove('is-open');
    modal.setAttribute('aria-hidden','true');
    document.documentElement.classList.remove('link-preview-open');
    const body=modal.querySelector('#link-preview-body');
    if(body)body.innerHTML='';
  }

  function openPreview(url,title){
    const m=ensureModal();
    m.querySelector('#link-preview-title').textContent=title||'Preview';
    const body=m.querySelector('#link-preview-body');
    body.innerHTML='';
    const clean=url.split('?')[0].toLowerCase();
    if(/\.(png|jpe?g|webp|gif|svg)$/.test(clean)){
      const img=document.createElement('img');
      img.src=url; img.alt=title||'Preview';
      body.appendChild(img);
    }else{
      const frame=document.createElement('iframe');
      frame.src=url+(url.includes('#')?'':'#view=FitH');
      frame.title=title||'Document preview';
      frame.loading='eager';
      body.appendChild(frame);
    }
    m.classList.add('is-open');
    m.setAttribute('aria-hidden','false');
    document.documentElement.classList.add('link-preview-open');
    setTimeout(()=>m.querySelector('.link-universal-preview-close')?.focus(),0);
  }

  document.addEventListener('click',function(e){
    const btn=e.target.closest?.('.preview-btn,[data-preview]');
    if(!btn)return;
    const url=btn.getAttribute('data-preview')||btn.getAttribute('href');
    if(!url)return;
    e.preventDefault();
    e.stopPropagation();
    if(e.stopImmediatePropagation)e.stopImmediatePropagation();
    openPreview(url,btn.getAttribute('data-title')||norm(btn.textContent)||'Preview');
  },true);
})();