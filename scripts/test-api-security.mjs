/* eslint-disable no-console */
// Black-box security checks against a RUNNING build: security headers, 401 on every protected API, guest redirects,
// no sensitive columns in public responses, open-redirect handling. Read-only: it creates no accounts and writes nothing
// (the contact check uses the honeypot field, so nothing is stored).
//   npm run build && npx next start -p 3100   then   BASE_URL=http://localhost:3100 node scripts/test-api-security.mjs
const B=process.env.BASE_URL||'http://localhost:3000';
const out=[];const t=(n,ok,d='')=>{out.push((ok?'PASS ':'FAIL ')+n+(d?'  '+d:''))};
const j=async(m,p,body,h={})=>{const r=await fetch(B+p,{method:m,headers:{'content-type':'application/json',...h},body:body===undefined?undefined:JSON.stringify(body),redirect:'manual'});let b=null;try{b=await r.json()}catch{};return{s:r.status,b,h:r.headers}};
(async()=>{
 const home=await fetch(B+'/login',{redirect:'manual'});
 const h=home.headers;
 t('header: CSP present',/default-src 'self'/.test(h.get('content-security-policy')||''));
 t('header: CSP has upgrade-insecure-requests',/upgrade-insecure-requests/.test(h.get('content-security-policy')||''));
 t('header: CSP frame-ancestors none',/frame-ancestors 'none'/.test(h.get('content-security-policy')||''));
 t('header: HSTS',/max-age=\d+/.test(h.get('strict-transport-security')||''));
 t('header: X-Frame-Options DENY',h.get('x-frame-options')==='DENY');
 t('header: nosniff',h.get('x-content-type-options')==='nosniff');
 t('header: X-Powered-By removed',!h.get('x-powered-by'));
 t('header: COOP',h.get('cross-origin-opener-policy')==='same-origin-allow-popups');
 const api=await j('GET','/api/questions?limit=2');
 t('api: no-store on /api/*',api.h.get('cache-control')==='no-store',api.h.get('cache-control'));
 // unauthenticated access
 for (const [m,p,b] of [
  ['POST','/api/progress',{questionId:'00000000-0000-0000-0000-000000000000',submittedCode:'A'}],
  ['GET','/api/progress'],['GET','/api/bookmarks'],['POST','/api/bookmarks',{questionId:'x'}],
  ['POST','/api/videos/submit',{videoId:'AAAAAAAAAAA',title:'t',category:'DSA'}],
  ['POST','/api/videos/report',{videoId:'x',reason:'r'}],['POST','/api/videos/verify',{videoId:'AAAAAAAAAAA'}],
  ['POST','/api/questions',{title:'t',description:'d'}],['PUT','/api/questions/some-slug',{points:1}],['DELETE','/api/questions/some-slug'],
  ['GET','/api/admin/problems'],['POST','/api/admin/problems',{}],['GET','/api/admin/problems/00000000-0000-0000-0000-000000000000'],['DELETE','/api/admin/problems/00000000-0000-0000-0000-000000000000'],
  ['POST','/api/judge/run',{}],['POST','/api/judge/submit',{}],['POST','/api/ai/chat',{message:'hi'}],['POST','/api/ai/hint',{}],
  ['GET','/api/dashboard'],['GET','/api/account/export'],['POST','/api/account/delete',{confirm:'DELETE'}],
  ['POST','/api/sync-leetcode',{}],
 ]) { const r=await j(m,p,b); t(`unauth ${m} ${p} -> 401`, r.s===401, 'got '+r.s); }
 const wrong=await j('POST','/api/sync-leetcode',{}, {'x-sync-secret':'wrong-secret'});
 t('sync-leetcode: wrong secret rejected',wrong.s===401);
 t('sync-leetcode: no upstream/raw leakage',!JSON.stringify(wrong.b).includes('raw'));
 // protected pages redirect
 for (const p of ['/profile','/upload','/admin','/dashboard']) { const r=await fetch(B+p,{redirect:'manual'}); t(`page ${p} redirects guests to /login`, r.status>=300&&r.status<400&&/\/login/.test(r.headers.get('location')||''),'got '+r.status); }
 // validation / info leak on public GETs
 const bad=await j('GET','/api/questions/..%2F..%2Fetc');
 t('questions/[slug]: bad slug -> 400',bad.s===400,'got '+bad.s);
 const q=await j('GET','/api/questions?page=abc&limit=zzz&search=%25%25');
 t('questions list: junk params tolerated',q.s===200,'got '+q.s);
 const list=await j('GET','/api/questions?limit=50');
 t('questions list: no answer/test columns',list.s===200&&!JSON.stringify(list.b).includes('correct_answer')&&!JSON.stringify(list.b).includes('test_cases'));
 const one=list.b?.questions?.[0]; if(one){const d=await j('GET','/api/questions/'+one.slug); t('questions/[slug]: strips correct_answer/test_cases/editorial',d.s===200&&!('correct_answer' in d.b.question)&&!('test_cases' in d.b.question)&&!('editorial' in d.b.question));}
 const daily=await j('GET','/api/daily-challenge');
 t('daily-challenge: strips answer key/test_cases/editorial',daily.s===200&&!JSON.stringify(daily.b).match(/"(correct_answer|test_cases|editorial)"/));
 // open redirect on auth callback
 for (const next of ['//evil.com','https://evil.com','/\\evil.com']) { const r=await fetch(B+'/api/auth/callback?code=bad&next='+encodeURIComponent(next),{redirect:'manual'}); const loc=r.headers.get('location')||''; t('auth callback does not redirect off-site ('+next+')',loc.startsWith(B+'/login')&&!/evil/.test(loc),loc); }
 // body size / malformed json
 const mal=await fetch(B+'/api/contact',{method:'POST',headers:{'content-type':'application/json'},body:'{bad'}); t('contact: malformed JSON -> 400',mal.status===400,'got '+mal.status);
 const hp=await j('POST','/api/contact',{website:'bot',name:'a',email:'a@b.co',subject:'s',message:'x'.repeat(20)}); t('contact: honeypot accepted silently, nothing stored',hp.s===200&&hp.b?.ok===true);
 const inv=await j('POST','/api/contact',{name:'',email:'nope',subject:'',message:'short'}); t('contact: validation rejects bad input',inv.s===400);
 console.log(out.join('\n')); console.log(out.some(l=>l.startsWith('FAIL'))?'\nSOME FAILED':'\nALL PASSED');
})();

