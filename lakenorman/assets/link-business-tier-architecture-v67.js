(function(){
  'use strict';

  const qsa=(s,r=document)=>Array.from(r.querySelectorAll(s));
  const norm=s=>String(s||'').replace(/\s+/g,' ').trim();
  const headingText=el=>{
    const h=el?.querySelector?.('h1,h2,h3,h4,h5,strong');
    return norm(h?.textContent||'');
  };
  const candidateCards=()=>qsa('article,.card,[class*="card"],[class*="tier"],[class*="level"]')
    .filter(el=>norm(el.textContent).length<2200);

  function findCard(name){
    const rx=new RegExp('^'+name.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')+'$','i');
    return candidateCards()
      .filter(el=>rx.test(headingText(el)) || norm(el.textContent).includes(name))
      .sort((a,b)=>norm(a.textContent).length-norm(b.textContent).length)[0]||null;
  }

  function setHeading(card,text){
    if(!card)return;
    const heads=qsa('h1,h2,h3,h4,h5',card);
    const h=heads.find(x=>/Community Business|Resource Contributor/i.test(norm(x.textContent)))||heads[0];
    if(h) h.textContent=text;
  }

  function replaceText(root,replacements){
    if(!root)return;
    const w=document.createTreeWalker(root,NodeFilter.SHOW_TEXT);
    const nodes=[]; while(w.nextNode())nodes.push(w.currentNode);
    nodes.forEach(n=>{
      let v=n.nodeValue;
      replacements.forEach(([a,b])=>{v=v.replace(a,b)});
      n.nodeValue=v;
    });
  }

  function getPrimaryLink(card){
    return qsa('a,button',card).find(x=>/START|JOIN|CONTRIBUTE|EXPLORE/i.test(norm(x.textContent)))||null;
  }

  function normalizeCommunityBusiness(card){
    if(!card)return;
    card.classList.add('link-tier-card-normalized','link-tier-community-business');
    replaceText(card,[
      [/^\s*FREE\s*$/gi,'BASE BUSINESS'],
      [/START BASE BUSINESS/gi,'START COMMUNITY BUSINESS'],
      [/JOIN COMMUNITY BUSINESS/gi,'START COMMUNITY BUSINESS'],
      [/START FREE/gi,'START COMMUNITY BUSINESS'],
      [/\$0(?!\d)/g,'$150/year']
    ]);
    setHeading(card,'Community Business');

    const price=qsa('*',card).find(el=>/^\$150(?:\/year)?(?:\s|$)/i.test(norm(el.textContent)));
    if(price) price.textContent='$150/year';

    const cta=getPrimaryLink(card);
    if(cta){
      cta.textContent='START COMMUNITY BUSINESS →';
      if(cta.tagName==='A' && (!cta.getAttribute('href') || cta.getAttribute('href')==='#')) cta.setAttribute('href','/business/register.html');
    }

    const text=norm(card.textContent);
    if(!/Complimentary through (?:Oct\.|October) 15, 2026/i.test(text)){
      const p=document.createElement('p');
      p.className='link-tier-launch-note';
      p.innerHTML='<strong>Complimentary through Oct. 15, 2026.</strong> $150/year begins Oct. 16, 2026.';
      const ctaWrap=cta?.parentElement;
      if(ctaWrap && ctaWrap!==card) ctaWrap.insertAdjacentElement('beforebegin',p);
      else card.appendChild(p);
    }
  }

  function makeContributorFrom(card){
    const clone=card.cloneNode(true);
    clone.classList.remove('link-tier-community-business');
    clone.classList.add('link-tier-card-normalized','link-tier-resource-contributor');
    clone.setAttribute('data-link-resource-contributor-card','true');

    replaceText(clone,[
      [/BASE BUSINESS/gi,'FREE RESOURCE ACCESS'],
      [/COMMUNITY BUSINESS/gi,'RESOURCE CONTRIBUTOR'],
      [/\$150\/year/gi,'$0'],
      [/Complimentary through Oct\.? 15, 2026\.?/gi,''],
      [/\$150\/year begins Oct\.? 16, 2026\.?/gi,''],
      [/START COMMUNITY BUSINESS/gi,'CONTRIBUTE RESOURCES'],
      [/START BASE BUSINESS/gi,'CONTRIBUTE RESOURCES']
    ]);
    setHeading(clone,'Resource Contributor');

    // Replace explanatory paragraphs without disturbing the structural classes.
    const paras=qsa('p',clone);
    paras.forEach(p=>p.remove());
    const anchor=getPrimaryLink(clone);
    const p1=document.createElement('p');
    p1.textContent='Add donated resources, gift cards, auction or raffle items, supplies, equipment and other in-kind support for approved LINK nonprofits.';
    const p2=document.createElement('p');
    p2.className='link-tier-contributor-note';
    p2.innerHTML='<strong>Includes a existing LINK digital badge.</strong> No public business profile, directory positioning or general-public business marketing.';
    if(anchor?.parentElement && anchor.parentElement!==clone){
      anchor.parentElement.insertAdjacentElement('beforebegin',p1);
      p1.insertAdjacentElement('afterend',p2);
    } else {
      clone.append(p1,p2);
    }
    if(anchor){
      anchor.textContent='CONTRIBUTE RESOURCES →';
      if(anchor.tagName==='A') anchor.setAttribute('href','/business/register.html');
    }
    return clone;
  }

  function removeStandaloneLaunchLine(cb){
    const rx=/^Complimentary through (?:Oct\.|October) 15, 2026\.\s*\$150\/year beginning (?:Oct\.|October) 16, 2026\.?$/i;
    qsa('p,div,span,strong').forEach(el=>{
      if(cb && cb.contains(el)) return;
      if(rx.test(norm(el.textContent)) && el.children.length===0) el.remove();
    });
  }

  function normalizeTierGrid(){
    document.querySelectorAll('.link-resource-contributor-band').forEach(el=>el.remove());

    let cb=findCard('Community Business');
    const ally=findCard('Community Ally');
    const impact=findCard('Impact Partner');
    const champion=findCard('Community Champion');
    const presenting=findCard('Presenting Partner');

    if(!cb || !ally || !impact || !champion) return;

    normalizeCommunityBusiness(cb);

    const parents=[cb,ally,impact,champion,presenting].filter(Boolean).map(x=>x.parentElement);
    const grid=parents.find(p=>p && parents.filter(x=>x===p).length>=4) || cb.parentElement;
    if(!grid)return;

    grid.classList.add('link-business-tier-six-grid');

    let contributor=qsa('[data-link-resource-contributor-card]',grid)[0] ||
      qsa('article,.card,[class*="card"],[class*="tier"],[class*="level"]',grid)
        .find(el=>/^Resource Contributor$/i.test(headingText(el)));

    if(!contributor){
      contributor=makeContributorFrom(cb);
      grid.insertBefore(contributor,cb);
    } else {
      contributor.classList.add('link-tier-card-normalized','link-tier-resource-contributor');
    }

    // Keep the logical order stable without touching unrelated elements.
    const ordered=[contributor,cb,ally,impact,champion,presenting].filter(Boolean);
    ordered.forEach(el=>grid.appendChild(el));

    removeStandaloneLaunchLine(cb);
  }

  function normalizeResidualCopy(){
    replaceText(document.body,[
      [/Community Business — Free/gi,'Resource Contributor — Free'],
      [/Community Business Free/gi,'Resource Contributor'],
      [/Your free Community Business account/gi,'Your free Resource Contributor account'],
      [/START BASE BUSINESS/gi,'START COMMUNITY BUSINESS'],
      [/START FREE/gi,'CONTRIBUTE RESOURCES']
    ]);
  }

  function run(){
    normalizeResidualCopy();
    normalizeTierGrid();
  }

  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',run,{once:true});
  else run();
})();