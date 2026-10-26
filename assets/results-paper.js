/* ONE PICK 성과 섹션 — 3D Paper 렌더러 이식본
 * 원본: ThreeUI "3D Paper"(Nocturne) 단일 HTML의 렌더러(Three.js r149 + 종이 굽힘 GLSL)
 * 바꾼 것: 전체화면 → 섹션 안 무대(#rp-stage), 인증서 문구 → 원픽 성과 카드 4장 전환,
 *          화면 밖/탭 숨김 시 렌더 정지, 모바일·WebGL 불가 시 정지 이미지(2D 캔버스) 대체.
 * 셰이더·지오메트리·재질·조명·드래그/관성/정착 로직은 원본 그대로.
 */
(function(){
"use strict";

/* ===== 실명/익명 토글 — 기본 익명(false). 병원 동의 후에만 true ===== */
var SHOW_REAL_NAMES = false;

/* 근거(수치는 아래 자료에 있는 것만):
 *  - 플레이스 순위: ~/onepick/naver-dashboard/data/dashboard.db place_rank (source=adlog-sheet), 10.01–10.20
 *  - 강서 C치과: 원장님 보고서 ONEPICK_정성플러스치과_10월1-2주차_보고서 (순위·블로그 통계, 2026.10.16 기준)
 *  - D치과 신환 경로: 원장님 보고서 '실제 신환 추이와 채널별 변화' 표(하루 평균 신환, 명)
 * 환자정보·금액·계약 조건은 넣지 않는다. */
var CARDS = [
  { tag:'PLACE', anon:'수원 A치과', real:'웃는얼굴치과', kind:'rank',
    title:'네이버 플레이스 순위', sub:"키워드 '수원치과' · 2026.10.01 – 10.20",
    kpi:[['1위','10.18–10.20 3일 연속'],['6위 → 1위','10.01 대비'],['20/20일','매일 6위 이내']],
    series:[6,5,4,3,3,3,2,2,3,3,3,3,3,5,5,2,2,1,1,1], from:'10.01', to:'10.20', yMax:7,
    say:'10월 첫날 6위에서 시작해 18일부터 3일 연속 1위를 지키고 있습니다.',
    src:'자료: 원픽 순위 시트 일별 기록',
    list:'수원치과 플레이스 6위 → 1위 · 10.18–10.20 3일 연속 1위' },
  { tag:'PLACE', anon:'대전 B치과', real:'대전365센텀치과', kind:'rank',
    title:'네이버 플레이스 순위', sub:"키워드 '대전 치과' · 2026.10.01 – 10.20",
    kpi:[['2위','10월 최고 순위'],['13/20일','상위 5위 노출'],['20/20일','매일 6위 이내']],
    series:[3,2,2,3,3,4,6,3,5,5,6,6,6,5,6,5,6,5,6,4], from:'10.01', to:'10.20', yMax:7,
    say:'경쟁이 센 광역시 대표 키워드에서 20일 내내 6위 안을 지켰습니다.',
    src:'자료: 원픽 순위 시트 일별 기록',
    list:'대전 치과 플레이스 10월 최고 2위 · 20일 모두 6위 이내' },
  { tag:'BLOG', anon:'강서 C치과', real:'정성플러스치과', kind:'bars',
    title:'블로그 · 플레이스 운영 보고', sub:'2026.10.01 – 10.14 보고',
    kpi:[['1위','강서구치과 4일 연속'],['21/25일','플레이스 상위 5위'],['3개','진료 키워드 검색 메인']],
    bars:[6,12,29,28,31,24], labels:['8/31','9/7','9/14','9/21','9/28','10/5'], hi:[4,5], unit:'블로그 주간 순방문자(명)',
    say:'개설 두 달 된 블로그가 진료 키워드 3개의 검색 메인에 올라와 있습니다.',
    src:'자료: 원픽 운영 시트 · 네이버 블로그 통계',
    list:'플레이스 1위 4일 연속 · 블로그 진료 키워드 3개 검색 메인' },
  { tag:'PATIENT', anon:'D치과', real:'', kind:'table',
    title:'신환 내원경로 분석', sub:'하루 평균 신환(명) · 2026.04 – 09.22',
    kpi:[['7.3명','8월 하루 평균 신환'],['41%','8월 네이버 비중'],['5.55명','9/1~22 하루 평균']],
    head:['채널','4~7월','8월','9/1~22'],
    rows:[['네이버(검색+지도)','1.98','2.97','2.50'],['소개(환자·직원)','1.45','1.97','1.23'],['협력업체','0.34','0.97','0.77'],
          ['광고','0.75','0.68','0.55'],['오프라인(근처)','0.18','0.65','0.36'],['AI·기타','0.14','0.10','0.14']],
    total:['합계','4.84','7.32','5.55'],
    say:'8월 하루 7.3명이 정점이었고, 가장 큰 경로는 매달 네이버였습니다.',
    src:'자료: 병원 내원경로 통계',
    list:'신환 경로 표 · 8월 하루 7.3명, 가장 큰 경로는 네이버' }
];
function nameOf(c){ return (SHOW_REAL_NAMES && c.real) ? c.real : c.anon; }

var stage = document.getElementById('rp-stage');
if(!stage) return;
var listEl = document.getElementById('rp-list');
var KR = '"Noto Sans KR","Apple SD Gothic Neo",sans-serif';
var DISP = 'Anton,"Noto Sans KR",sans-serif';
var TW = 1400, TH = 1932;
var clamp = function(v,a,b){ return v<a?a:(v>b?b:v); };
var REDUCED = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
var cur = 0;

CARDS.forEach(function(c,i){
  var b = document.createElement('button');
  b.type='button'; b.className='rp-item'; b.setAttribute('aria-pressed', i===0?'true':'false');
  b.innerHTML = '<small>'+(i+1<10?'0':'')+(i+1)+' · '+c.tag+'</small><b>'+nameOf(c)+'</b><span>'+c.list+'</span>';
  b.addEventListener('click', function(){ userTouched(); show(i); });
  listEl.appendChild(b);
});
var items = [].slice.call(listEl.children);

/* ======================================================================
   1. THE CERTIFICATE — printed on glass (원본 drawGlass 레이아웃, 원픽 문구)
   ====================================================================== */
function rr(ctx,x,y,w,h,r){ ctx.beginPath(); ctx.moveTo(x+r,y);
  ctx.arcTo(x+w,y,x+w,y+h,r); ctx.arcTo(x+w,y+h,x,y+h,r);
  ctx.arcTo(x,y+h,x,y,r);     ctx.arcTo(x,y,x+w,y,r); ctx.closePath(); }
function wrapL(ctx,text,x,y,maxW,lh){
  var words=text.split(' '), line='', yy=y;
  for(var i=0;i<words.length;i++){ var w=words[i], t=line?line+' '+w:w;
    if(ctx.measureText(t).width>maxW && line){ ctx.fillText(line,x,yy); line=w; yy+=lh; }
    else line=t; }
  if(line) ctx.fillText(line,x,yy);
  return yy+lh;
}
var BLUE='#0D3FA6', INK='#0B1A3F', MUT='#56658A', LINE='#DCE4F4', OK='#1E9E6A';
function fitText(ctx,t,maxW,size,weight,fam){
  var s=size; ctx.font=weight+' '+s+'px '+fam;
  while(ctx.measureText(t).width>maxW && s>12){ s-=2; ctx.font=weight+' '+s+'px '+fam; }
}
/* 원장님 보고서 한 장 — 흰 종이, 파란 머리띠, KPI 3칸, 그래프/표, 한 줄 해석 */
function drawGlass(ctx,c){
  ctx.scale(TW/1200, TH/1656);
  var M=70, W=1200-M*2;
  ctx.fillStyle='#ffffff'; ctx.fillRect(0,0,1200,1656);
  ctx.fillStyle=BLUE; ctx.fillRect(0,0,1200,190);
  ctx.fillStyle='#ffffff'; rr(ctx,M,62,92,74,10); ctx.fill();
  ctx.fillStyle=BLUE; ctx.font='400 58px '+DISP; ctx.fillText('1P',M+16,122);
  ctx.fillStyle='#ffffff'; ctx.font='400 52px '+DISP; ctx.fillText('ONE PICK',M+112,120);
  ctx.font='700 30px '+KR; var r='운영 보고서 · 2026.10';
  ctx.fillText(r,1200-M-ctx.measureText(r).width,116);

  ctx.fillStyle=BLUE; ctx.font='700 30px '+KR; ctx.fillText(nameOf(c)+'  ·  '+c.tag,M,268);
  ctx.fillStyle=INK; fitText(ctx,c.title,W,76,'900',KR); ctx.fillText(c.title,M,356);
  ctx.fillStyle=MUT; fitText(ctx,c.sub,W,32,'500',KR); ctx.fillText(c.sub,M,410);

  var kw=(W-2*24)/3, ky=450, kh=200;
  c.kpi.forEach(function(k,i){
    var x=M+i*(kw+24);
    ctx.fillStyle=i===0?BLUE:'#F2F5FB'; rr(ctx,x,ky,kw,kh,18); ctx.fill();
    ctx.fillStyle=i===0?'#ffffff':BLUE; fitText(ctx,k[0],kw-48,84,'900',KR); ctx.fillText(k[0],x+24,ky+108);
    ctx.fillStyle=i===0?'rgba(255,255,255,.9)':MUT; fitText(ctx,k[1],kw-48,34,'700',KR); ctx.fillText(k[1],x+24,ky+166);
  });

  var gx=M, gy=710, gw=W, gh=560;
  if(c.kind==='rank') drawRank(ctx,c,gx,gy,gw,gh);
  else if(c.kind==='bars') drawBars(ctx,c,gx,gy,gw,gh);
  else drawTable(ctx,c,gx,gy,gw,gh);

  var sy=1312;
  ctx.fillStyle='#EEF3FD'; rr(ctx,M,sy,W,150,16); ctx.fill();
  ctx.fillStyle=BLUE; ctx.fillRect(M,sy,10,150);
  ctx.fillStyle=BLUE; ctx.font='900 30px '+KR; ctx.fillText('한 줄 해석',M+40,sy+50);
  ctx.fillStyle=INK; fitText(ctx,c.say,W-70,40,'700',KR); wrapKR(ctx,c.say,M+40,sy+104,W-70,46);

  ctx.fillStyle=MUT; ctx.font='500 28px '+KR; ctx.fillText(c.src,M,1560);
  ctx.fillStyle=BLUE; ctx.font='400 34px '+DISP; var o='onepick.';
  var ow=ctx.measureText(o).width; ctx.fillText(o,1200-M-ow-124,1562);
  ctx.font='700 26px '+KR; ctx.fillText('실제 기록',1200-M-112,1560);
}
function wrapKR(ctx,t,x,y,maxW,lh){
  var line='', yy=y;
  for(var i=0;i<t.length;i++){ var n=line+t[i];
    if(ctx.measureText(n).width>maxW && line){ ctx.fillText(line,x,yy); line=t[i]===' '?'':t[i]; yy+=lh; } else line=n; }
  if(line) ctx.fillText(line,x,yy);
}
function drawRank(ctx,c,x,y,w,h){
  var pl=70, pb=60, cw=w-pl-20, ch=h-pb-20, n=c.series.length, ymax=c.yMax;
  var Y=function(r){ return y+10+(r-1)/(ymax-1)*ch; }, X=function(i){ return x+pl+i*(cw/(n-1)); };
  ctx.fillStyle='rgba(30,158,106,.10)'; ctx.fillRect(x+pl,Y(1)-14,cw,Y(5)-Y(1)+28);
  ctx.fillStyle=OK; ctx.font='700 30px '+KR; ctx.fillText('상위 5위 구간',x+pl+12,Y(5)+4);
  ctx.strokeStyle=LINE; ctx.lineWidth=2; ctx.fillStyle=MUT; ctx.font='700 30px '+KR;
  for(var r=1;r<=ymax;r+=2){ ctx.beginPath(); ctx.moveTo(x+pl,Y(r)); ctx.lineTo(x+pl+cw,Y(r)); ctx.stroke(); ctx.fillText(r+'위',x,Y(r)+9); }
  ctx.strokeStyle=BLUE; ctx.lineWidth=7; ctx.lineJoin='round'; ctx.beginPath();
  c.series.forEach(function(v,i){ i?ctx.lineTo(X(i),Y(v)):ctx.moveTo(X(i),Y(v)); }); ctx.stroke();
  c.series.forEach(function(v,i){ ctx.fillStyle=v===1?BLUE:'#ffffff'; ctx.strokeStyle=BLUE; ctx.lineWidth=4;
    ctx.beginPath(); ctx.arc(X(i),Y(v),v===1?13:9,0,7); ctx.fill(); ctx.stroke(); });
  var best=Math.min.apply(null,c.series), bi=c.series.lastIndexOf(best);
  ctx.fillStyle=BLUE; ctx.font='900 40px '+KR; var bl=best+'위'; ctx.fillText(bl,X(bi)-ctx.measureText(bl).width/2,Y(best)-26);
  ctx.fillStyle=MUT; ctx.font='700 30px '+KR;
  ctx.fillText(c.from,x+pl-10,y+h-14); var tw=ctx.measureText(c.to).width; ctx.fillText(c.to,x+pl+cw-tw+10,y+h-14);
  var m='일별 순위'; ctx.fillText(m,x+pl+cw/2-ctx.measureText(m).width/2,y+h-14);
}
function drawBars(ctx,c,x,y,w,h){
  var pb=60, ch=h-pb-70, n=c.bars.length, gap=26, bw=(w-gap*(n-1))/n, max=Math.max.apply(null,c.bars);
  ctx.fillStyle=MUT; ctx.font='700 28px '+KR; ctx.fillText(c.unit,x,y+30);
  c.bars.forEach(function(v,i){
    var bh=v/max*ch, bx=x+i*(bw+gap), by=y+70+ch-bh;
    ctx.fillStyle=c.hi.indexOf(i)>=0?BLUE:'#BFD0F2'; rr(ctx,bx,by,bw,bh,10); ctx.fill();
    ctx.fillStyle=INK; ctx.font='900 36px '+KR; var t=v+'명'; ctx.fillText(t,bx+bw/2-ctx.measureText(t).width/2,by-14);
    ctx.fillStyle=MUT; ctx.font='700 30px '+KR; var l=c.labels[i]; ctx.fillText(l,bx+bw/2-ctx.measureText(l).width/2,y+h-14);
  });
}
function drawTable(ctx,c,x,y,w,h){
  var cols=[w*0.43,w*0.19,w*0.19,w*0.19], rowsAll=[c.head].concat(c.rows,[c.total]), rh=h/rowsAll.length;
  rowsAll.forEach(function(row,ri){
    var ry=y+ri*rh, head=ri===0, tot=ri===rowsAll.length-1;
    if(head){ ctx.fillStyle='#F2F5FB'; ctx.fillRect(x,ry,w,rh); }
    if(tot){ ctx.fillStyle='#EEF3FD'; ctx.fillRect(x,ry,w,rh); }
    ctx.strokeStyle=LINE; ctx.lineWidth=2; ctx.beginPath(); ctx.moveTo(x,ry+rh); ctx.lineTo(x+w,ry+rh); ctx.stroke();
    var cx=x;
    row.forEach(function(cell,ci){
      ctx.fillStyle=head?MUT:(ci===2&&!head?BLUE:INK);
      ctx.font=(head?'700 28px ':(tot||ci===2?'900 32px ':(ci===0?'700 30px ':'500 32px ')))+KR;
      if(ci===0) ctx.fillText(cell,cx+18,ry+rh/2+11);
      else { var tw=ctx.measureText(cell).width; ctx.fillText(cell,cx+cols[ci]-tw-22,ry+rh/2+11); }
      cx+=cols[ci];
    });
  });
}
function certCanvas(c){
  var cv = document.createElement('canvas'); cv.width=TW; cv.height=TH;
  var ctx = cv.getContext('2d');
  ctx.save(); rr(ctx,0,0,TW,TH,30); ctx.clip(); drawGlass(ctx,c); ctx.restore();
  return cv;
}

var staticEl = null;
function useStatic(reason){
  stage.classList.add('is-static');
  stage.setAttribute('data-mode','static:'+reason);
  if(!staticEl){ staticEl=document.createElement('div'); staticEl.className='rp-still'; stage.appendChild(staticEl); }
  paintStatic();
}
function paintStatic(){
  if(!staticEl) return;
  var cv = certCanvas(CARDS[cur]);
  cv.setAttribute('role','img');
  cv.setAttribute('aria-label', nameOf(CARDS[cur])+' — '+CARDS[cur].list);
  staticEl.innerHTML=''; staticEl.appendChild(cv);
}

function setActive(i){
  cur=i;
  items.forEach(function(b,k){ b.setAttribute('aria-pressed', k===i?'true':'false'); });
}
var show = function(i){ setActive(i); paintStatic(); };

var visibleNow=false, lastTouch=-1e9, autoT=null;
function userTouched(){ lastTouch=performance.now(); }
function autoTick(){
  if(REDUCED || !visibleNow || document.hidden) return;
  if(performance.now()-lastTouch < 20000) return;
  show((cur+1)%CARDS.length);
}

var fontsReady = (document.fonts && document.fonts.load) ? Promise.race([
  Promise.all([
    document.fonts.load('400 104px Anton','1P.'),
    document.fonts.load('900 46px "Noto Sans KR"','원픽 치과'),
    document.fonts.load('700 76px "Noto Sans KR"','네이버 플레이스'),
    document.fonts.load('500 34px "Noto Sans KR"','연속 위 이내 발행'),
    document.fonts.load('500 23px "IBM Plex Mono"','RESULT')
  ]).then(function(){ return document.fonts.ready; }),
  new Promise(function(r){ setTimeout(r,2500); })
]) : Promise.resolve();

var narrow = window.matchMedia('(max-width: 760px)').matches;
var coarse = window.matchMedia('(hover: none) and (pointer: coarse)').matches;
var hasGL = (function(){ try{ var c=document.createElement('canvas');
  return !!(window.WebGLRenderingContext && (c.getContext('webgl2')||c.getContext('webgl'))); }catch(e){ return false; } })();

function watchVisibility(onChange){
  var io = new IntersectionObserver(function(es){ es.forEach(function(e){
    visibleNow = e.isIntersecting; onChange(); }); }, {threshold:0.05});
  io.observe(stage);
  document.addEventListener('visibilitychange', onChange);
}

if(narrow || coarse || !hasGL || typeof THREE==='undefined'){
  fontsReady.then(function(){ useStatic(narrow||coarse ? 'mobile' : 'no-webgl'); });
  watchVisibility(function(){});
  autoT = setInterval(autoTick, 7000);
  window.__onepickPaper = { mode:'static', cards:CARDS.length, cur:function(){return cur;} };
  return;
}

/* ======================================================================
   2. GRAIN
   ====================================================================== */
(function grain(){
  var n=160, c=document.createElement('canvas'); c.width=c.height=n;
  var x=c.getContext('2d'), d=x.createImageData(n,n);
  for(var i=0;i<n*n;i++){
    var v = 128 + (Math.random()-0.5)*168;
    d.data[i*4]=d.data[i*4+1]=d.data[i*4+2]=v; d.data[i*4+3]=255;
  }
  x.putImageData(d,0,0);
  var url='url('+c.toDataURL()+')';
  stage.querySelector('.rp-grain').style.backgroundImage=url;
  stage.querySelector('.rp-grain2').style.backgroundImage=url;
})();

/* ======================================================================
   3. SCENE
   ====================================================================== */
var T = THREE;
var canvas = stage.querySelector('canvas.rp-gl');
var renderer = new T.WebGLRenderer({canvas:canvas, antialias:true, alpha:true,
                                      powerPreference:'high-performance'});
renderer.outputEncoding = T.sRGBEncoding;
renderer.toneMapping = T.NoToneMapping;

var scene  = new T.Scene();
var camera = new T.PerspectiveCamera(24, 1, 0.1, 100);
camera.position.set(0,0,8.2);

function envTexture(){
  var w=1024,h=512,c=document.createElement('canvas');
  c.width=w;c.height=h; var x=c.getContext('2d');
  var g=x.createLinearGradient(0,0,0,h);
  g.addColorStop(0,'#3a3d47'); g.addColorStop(.46,'#171820'); g.addColorStop(1,'#08080a');
  x.fillStyle=g; x.fillRect(0,0,w,h);
  var blob=function(cx,cy,rx,ry,col,a){
    var rg=x.createRadialGradient(cx,cy,0,cx,cy,Math.max(rx,ry));
    rg.addColorStop(0,col.replace('A',a)); rg.addColorStop(1,col.replace('A','0'));
    x.save(); x.translate(cx,cy); x.scale(1,ry/rx); x.translate(-cx,-cy);
    x.fillStyle=rg; x.beginPath(); x.arc(cx,cy,rx,0,7); x.fill(); x.restore();
  };
  blob(w*0.30,h*0.24,330,240,'rgba(255,252,246,A)','1');
  blob(w*0.74,h*0.34,240,200,'rgba(150,175,235,A)','.42');
  blob(w*0.52,h*0.86,420,190,'rgba(255,170,120,A)','.10');
  var t=new T.CanvasTexture(c);
  t.mapping=T.EquirectangularReflectionMapping; t.encoding=T.sRGBEncoding;
  return t;
}
var pmrem = new T.PMREMGenerator(renderer);
pmrem.compileEquirectangularShader();
var envSrc = envTexture();
scene.environment = pmrem.fromEquirectangular(envSrc).texture;
envSrc.dispose(); pmrem.dispose();

var key  = new T.DirectionalLight(0xfff6ec, 1.42); key.position.set(-3.3,2.1,2.0);
var fill = new T.DirectionalLight(0x9fb6ff, 0.13); fill.position.set(3.6,-1.8,1.6);
var rim  = new T.DirectionalLight(0xffffff, 0.10); rim.position.set(1.6,1.2,-2.6);
scene.add(key,fill,rim,new T.AmbientLight(0xffffff,0.16));

var touchLight = new T.PointLight(0xdfe8ff, 0, 7.5, 1.35);
touchLight.position.set(0,0,1.7); scene.add(touchLight);

/* ---- geometry + the bend (원본 그대로) ---- */
var SW = 2.30, SH = 2.72;
var geo = new T.PlaneGeometry(SW,SH,72,96);
var uni = {
  uTime:{value:0}, uAmp:{value:1.18}, uFreq:{value:4.70}, uTwist:{value:1.30},
  uSize:{value:new T.Vector2(SW,SH)}, uFlutter:{value:0}, uPhase:{value:0},
  uRim:{value:0.62}, uRimA:{value:0.88}, uSpecA:{value:0.14},
  uRimCol:{value:new T.Color(0xeaf2ff)}
};
var WAVE = [
'uniform float uTime, uAmp, uFlutter, uPhase, uFreq, uTwist;',
'uniform vec2  uSize;',
'float sAmp(float u, float v){ return uAmp*(0.10 + pow(u,1.35))*(0.50 + 0.64*v); }',
'float sAmpV(float u){        return uAmp*(0.10 + pow(u,1.35))*0.64; }',
'float sTheta(float u, float v){',
'  float a  = sAmp(u,v);',
'  float ph = uFreq*u + uTwist*v + uTime*0.40 + uPhase;',
'  return a*sin(ph) + uFlutter*a*0.60*sin(ph*2.35 + uTime*2.0);',
'}',
'float sThetaV(float u, float v){',
'  float a  = sAmp(u,v), da = sAmpV(u);',
'  float ph = uFreq*u + uTwist*v + uTime*0.40 + uPhase;',
'  float f  = ph*2.35 + uTime*2.0;',
'  return da*sin(ph) + a*cos(ph)*uTwist',
'       + uFlutter*0.60*(da*sin(f) + a*cos(f)*uTwist*2.35);',
'}',
'float sYoff(float u, float v){',
'  float w = 1.0 - 0.55*v;',
'  return 0.021*uSize.y*sin(2.05*u + uTime*0.47 + uPhase)',
'       + 0.013*uSize.y*sin(3.35*u - 1.55*v + uTime*0.63 + uPhase)*w;',
'}',
'float sYdU(float u, float v){',
'  float w = 1.0 - 0.55*v;',
'  return 0.0431*uSize.y*cos(2.05*u + uTime*0.47 + uPhase)',
'       + 0.0436*uSize.y*cos(3.35*u - 1.55*v + uTime*0.63 + uPhase)*w;',
'}',
'float sYdV(float u, float v){',
'  float ph = 3.35*u - 1.55*v + uTime*0.63 + uPhase;',
'  return 0.013*uSize.y*(-1.55*cos(ph)*(1.0-0.55*v) - 0.55*sin(ph));',
'}',
'void sheetPoint(vec2 q, out vec3 P, out vec3 NN){',
'  float u = q.x, v = q.y;',
'  float x=0.0, z=0.0, xe=0.0, ze=0.0, dxv=0.0, dzv=0.0, dxe=0.0, dze=0.0;',
'  const int NS = 20;',
'  float h = 1.0/float(NS);',
'  for(int i=0;i<NS;i++){',
'    float uu = (float(i)+0.5)*h;',
'    float w  = clamp((u-(uu-0.5*h))/h, 0.0, 1.0);',
'    float th = sTheta(uu,v);',
'    float dt = sThetaV(uu,v);',
'    float c = cos(th), sn = sin(th);',
'    xe += c*h;          ze += sn*h;',
'    dxe += -sn*dt*h;    dze +=  c*dt*h;',
'    x   += c*h*w;       z   += sn*h*w;',
'    dxv += -sn*dt*h*w;  dzv +=  c*dt*h*w;',
'  }',
'  float W = uSize.x, H = uSize.y;',
'  float th0 = sTheta(u,v);',
'  P = vec3((x - xe*0.5)*W, (v-0.5)*H + sYoff(u,v), (z - ze*0.5)*W);',
'  vec3 Tu = vec3(W*cos(th0), sYdU(u,v), W*sin(th0));',
'  vec3 Tv = vec3((dxv - dxe*0.5)*W, H + sYdV(u,v), (dzv - dze*0.5)*W);',
'  NN = normalize(cross(Tu, Tv));',
'}'].join('\n');

function makeCertTexture(c){
  var t = new T.CanvasTexture(certCanvas(c));
  t.encoding = T.sRGBEncoding; t.anisotropy = 8; t.needsUpdate = true;
  return t;
}
var mat = new T.MeshPhysicalMaterial({
  map: null, color: new T.Color(0xffffff), side: T.DoubleSide, metalness: 0.0,
  roughness: 0.06, clearcoat: 1.0, clearcoatRoughness: 0.03,
  iridescence: 0.10, iridescenceIOR: 1.35, iridescenceThicknessRange:[120,420],
  envMapIntensity: 1.15, specularIntensity: 1.0, ior: 1.5,
  transparent: true, alphaTest: 0.012, opacity: 1
});
mat.onBeforeCompile = function(sh){
  Object.assign(sh.uniforms, uni);
  sh.vertexShader = sh.vertexShader
    .replace('#include <common>', '#include <common>\n'+WAVE)
    .replace('#include <beginnormal_vertex>', [
      'vec3 sheetP; vec3 objectNormal;',
      'sheetPoint(uv, sheetP, objectNormal);',
      '#ifdef USE_TANGENT',
      '  vec3 objectTangent = vec3( tangent.xyz );',
      '#endif'].join('\n'))
    .replace('#include <begin_vertex>', 'vec3 transformed = sheetP;');
  sh.fragmentShader = sh.fragmentShader
    .replace('#include <common>',
      '#include <common>\nuniform float uRim, uRimA, uSpecA;\nuniform vec3 uRimCol;')
    .replace('#include <alphatest_fragment>',
      'if ( diffuseColor.a / max(opacity,1e-4) < alphaTest ) discard;')
    .replace('#include <output_fragment>', [
      'float fres = pow(1.0 - clamp(abs(dot(geometry.normal, geometry.viewDir)),0.0,1.0), 3.2);',
      'outgoingLight += fres * uRim * uRimCol;',
      'float baseA = diffuseColor.a / max(opacity, 1e-4);',
      'float outA  = clamp(baseA + fres*uRimA',
      '                  + uSpecA*dot(outgoingLight, vec3(0.3333)), 0.0, 1.0) * opacity;',
      'gl_FragColor = vec4( outgoingLight, outA );'].join('\n'));
};
var mesh  = new T.Mesh(geo, mat);
var group = new T.Group(); group.add(mesh); scene.add(group);

var haloTex = (function(){
  var s=256,c=document.createElement('canvas'); c.width=c.height=s;
  var x=c.getContext('2d');
  var g=x.createRadialGradient(s/2,s/2,0,s/2,s/2,s/2);
  g.addColorStop(0,'rgba(0,0,0,.55)'); g.addColorStop(.45,'rgba(0,0,0,.28)');
  g.addColorStop(1,'rgba(0,0,0,0)');
  x.fillStyle=g; x.fillRect(0,0,s,s);
  var t=new T.CanvasTexture(c); t.encoding=T.sRGBEncoding; return t;
})();
var halo = new T.Mesh(new T.PlaneGeometry(3.9,4.9),
  new T.MeshBasicMaterial({map:haloTex, transparent:true, depthWrite:false, opacity:0.30}));
halo.position.z = -0.62; group.add(halo);

/* ======================================================================
   4. POINTER — drag to turn, hover to light (좌표만 무대 기준으로)
   ====================================================================== */
var dragging=false, dragYaw=0, dragPitch=0, release=0;
var velYaw=0, velPitch=0, prevYaw=0, prevPitch=0;
var lastPX=0, lastPY=0, moved=0, overSheet=false, hover=0, hoverTarget=0;
var quad=null, cursorNow='';
var mouse = {x:0,y:0,tx:0,ty:0};
var hintEl = stage.querySelector('.rp-hint');
var hintUsed=false;
var rect = stage.getBoundingClientRect();

var _v = new T.Vector3();
function cornerPoint(qx,qy){
  var t = uni.uTime.value, ph = uni.uPhase.value;
  var A = uni.uAmp.value, F = uni.uFreq.value, TWs = uni.uTwist.value;
  var u = qx, v = qy;
  var theta = function(uu){ return A*(0.10+Math.pow(uu,1.35))*(0.50+0.64*v)
                      * Math.sin(F*uu + TWs*v + t*0.40 + ph); };
  var x=0,z=0,xe=0,ze=0, N=20, h=1/N;
  for(var i=0;i<N;i++){
    var uu=(i+0.5)*h, w=clamp((u-(uu-0.5*h))/h,0,1);
    var th=theta(uu), c=Math.cos(th), s=Math.sin(th);
    xe+=c*h; ze+=s*h; x+=c*h*w; z+=s*h*w;
  }
  var yo = 0.021*SH*Math.sin(2.05*u + t*0.47 + ph)
         + 0.013*SH*Math.sin(3.35*u - 1.55*v + t*0.63 + ph)*(1-0.55*v);
  return _v.set((x-xe*0.5)*SW, (v-0.5)*SH + yo, (z-ze*0.5)*SW);
}
function buildQuad(){
  var pts=[], cs=[[0,1],[1,1],[1,0],[0,0]];
  for(var i=0;i<4;i++){
    cornerPoint(cs[i][0],cs[i][1]).applyMatrix4(group.matrixWorld).project(camera);
    pts.push([(_v.x*0.5+0.5)*vw, (-_v.y*0.5+0.5)*vh]);
  }
  var cx=(pts[0][0]+pts[1][0]+pts[2][0]+pts[3][0])/4;
  var cy=(pts[0][1]+pts[1][1]+pts[2][1]+pts[3][1])/4;
  quad = pts.map(function(p){ return [cx+(p[0]-cx)*1.07, cy+(p[1]-cy)*1.07]; });
}
function inQuad(px,py){
  if(!quad) return false;
  var sign=0;
  for(var i=0;i<4;i++){
    var a=quad[i], b=quad[(i+1)%4];
    var c=(b[0]-a[0])*(py-a[1])-(b[1]-a[1])*(px-a[0]);
    if(c!==0){ var s=c>0?1:-1; if(sign===0) sign=s; else if(s!==sign) return false; }
  }
  return true;
}
function useHint(){ hintUsed=true; hintEl.style.opacity='0'; }
function local(e){ rect = stage.getBoundingClientRect(); return [e.clientX-rect.left, e.clientY-rect.top]; }

window.addEventListener('pointermove', function(e){
  if(!running) return;
  var p=local(e);
  mouse.tx = clamp((p[0]/vw - 0.5)*2, -1.2, 1.2);
  mouse.ty = clamp((p[1]/vh - 0.5)*2, -1.2, 1.2);
  if(dragging){
    var dx=e.clientX-lastPX, dy=e.clientY-lastPY;
    lastPX=e.clientX; lastPY=e.clientY; moved+=Math.abs(dx)+Math.abs(dy);
    dragYaw   += dx*0.0060;
    dragPitch  = clamp(dragPitch - dy*0.0045, -0.60, 0.60);
    if(moved>40) useHint();
    userTouched();
    return;
  }
  overSheet = inQuad(p[0],p[1]);
  hoverTarget = overSheet ? 1 : 0;
}, {passive:true});
stage.addEventListener('pointerdown', function(e){
  var p=local(e);
  if(inQuad(p[0],p[1])){
    dragging=true; moved=0; lastPX=e.clientX; lastPY=e.clientY;
    velYaw=velPitch=0; prevYaw=dragYaw; prevPitch=dragPitch; userTouched();
    e.preventDefault();
  }
});
window.addEventListener('pointerup', function(){ if(dragging){ dragging=false; release=0.6; } });
stage.addEventListener('pointerleave', function(){ hoverTarget=0; });

/* ======================================================================
   5. RESIZE (창 → 무대 크기)
   ====================================================================== */
var vw=0, vh=0;
function resize(){
  rect = stage.getBoundingClientRect();
  vw = Math.max(1, stage.clientWidth); vh = Math.max(1, stage.clientHeight);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio||1, 2));
  renderer.setSize(vw,vh,false);
  camera.aspect = vw/vh; camera.updateProjectionMatrix();
  var visH = 2*camera.position.z*Math.tan(T.MathUtils.degToRad(camera.fov)/2);
  var visW = visH*camera.aspect;
  var wCap = Math.min(0.88, 0.60 + Math.max(0, 1.45 - camera.aspect)*0.45);
  group.scale.setScalar(Math.min(visH*0.735/SH, visW*wCap/SW));
}
window.addEventListener('resize', resize);
window.addEventListener('scroll', function(){ rect = stage.getBoundingClientRect(); }, {passive:true});

/* ======================================================================
   6. LOOP — 무대가 보일 때만
   ====================================================================== */
var clock = new T.Clock(false);
var lightPos = new T.Vector3();
var intro = 0, running=false, raf=0, frames=0, booted=false;

function frame(){
  raf = requestAnimationFrame(frame);
  var dt = Math.min(clock.getDelta(), 0.05);
  var t  = clock.elapsedTime;
  uni.uTime.value = REDUCED ? 2.4 : t;

  intro += (1 - intro) * Math.min(1, dt*1.9);
  mat.opacity = intro;
  halo.material.opacity = intro*0.30;
  if(intro > 0.7 && !hintUsed) hintEl.style.opacity='1';

  if(dragging){
    var k = Math.min(1, dt*14);
    velYaw   += ((dragYaw   - prevYaw  )/Math.max(dt,1e-3) - velYaw  ) * k;
    velPitch += ((dragPitch - prevPitch)/Math.max(dt,1e-3) - velPitch) * k;
    velYaw   = clamp(velYaw,  -7, 7);
    velPitch = clamp(velPitch,-4, 4);
  } else {
    dragYaw   += velYaw*dt;
    dragPitch  = clamp(dragPitch + velPitch*dt, -0.60, 0.60);
    var decay = Math.pow(0.018, dt);
    velYaw *= decay; velPitch *= decay;
    release = Math.max(0, release - dt);
    if(release <= 0){
      var home = Math.round(dragYaw/(Math.PI*2))*Math.PI*2;
      var k2 = Math.min(1, dt*0.55);
      dragYaw   += (home - dragYaw)*k2;
      dragPitch -= dragPitch*k2;
    }
  }
  prevYaw = dragYaw; prevPitch = dragPitch;

  mouse.x += (mouse.tx-mouse.x)*Math.min(1,dt*3.0);
  mouse.y += (mouse.ty-mouse.y)*Math.min(1,dt*3.0);
  var idle = REDUCED ? 0 : 1;
  var rise = 1 - intro;
  group.rotation.y = dragYaw + mouse.x*0.16 + Math.sin(t*0.23)*0.045*idle;
  group.rotation.x = dragPitch - mouse.y*0.11 + Math.sin(t*0.19)*0.026*idle + rise*0.28;
  group.rotation.z = Math.sin(t*0.27)*0.018*idle;
  group.position.y = Math.sin(t*0.36)*0.06*idle - rise*0.7;
  group.position.x = Math.sin(t*0.21)*0.05*idle + mouse.x*0.10;
  group.updateMatrixWorld();

  hover += (hoverTarget - hover) * Math.min(1, dt*4.5);
  touchLight.intensity = hover * 2.6 * intro;
  if(hover > 0.002){
    lightPos.set(mouse.tx, -mouse.ty, 0.5).unproject(camera).sub(camera.position).normalize();
    touchLight.position.copy(camera.position)
      .addScaledVector(lightPos, (1.75 - camera.position.z)/lightPos.z);
  }

  buildQuad();
  var wantCursor = dragging ? 'grabbing' : (overSheet ? 'grab' : '');
  if(wantCursor !== cursorNow){ cursorNow = wantCursor; stage.style.cursor = wantCursor; }

  renderer.render(scene,camera);
  frames++;
}
function start(){ if(running||!booted) return; running=true; clock.start(); frame(); }
function stop(){ if(!running) return; running=false; cancelAnimationFrame(raf); clock.stop(); }
function sync(){ (visibleNow && !document.hidden) ? start() : stop(); }

show = function(i){
  setActive(i);
  if(stage.classList.contains('is-static')){ paintStatic(); return; }
  var old = mat.map; mat.map = makeCertTexture(CARDS[i]); mat.needsUpdate = true;
  if(old) old.dispose();
  intro = 0;
};

canvas.addEventListener('webglcontextlost', function(e){
  e.preventDefault(); stop(); booted=false; useStatic('context-lost');
});

function boot(){
  mat.map = makeCertTexture(CARDS[cur]); mat.needsUpdate = true;
  resize();
  mesh.visible = true; mat.opacity = 0.002;
  renderer.compile(scene,camera); renderer.render(scene,camera);
  mat.opacity = 1;
  booted = true;
  sync();
}
watchVisibility(sync);
fontsReady.then(boot);
autoT = setInterval(autoTick, 7000);

window.__onepickPaper = { mode:'webgl', cards:CARDS.length, group:group, renderer:renderer,
  cur:function(){ return cur; }, frames:function(){ return frames; },
  running:function(){ return running; }, show:function(i){ show(i); },
  spin:function(y){ dragYaw=y; release=1e9; } };
})();
