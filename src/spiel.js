
(()=>{
"use strict";
// =====================================================================
//  GRUNDLAGEN
// =====================================================================
const T=40,PI=Math.PI,TAU=PI*2,U=T/48,SQ2=Math.SQRT2;
// Spielfeldgröße je Karte: die erste Karte bleibt klein (11×17), alle anderen sind groß (15×23)
const BIGC=15,BIGR=23,GMAX=BIGC*BIGR;
let COLS=11,ROWS=17,W=COLS*T,H=ROWS*T,gridChanged=false;
const idx=(c,r)=>r*COLS+c;
const cx=i=>(i%COLS+.5)*T, cy=i=>(((i/COLS)|0)+.5)*T;
const NB8=[[0,1,1],[1,0,1],[-1,0,1],[0,-1,1],[1,1,SQ2],[-1,1,SQ2],[1,-1,SQ2],[-1,-1,SQ2]];
// Gegner laufen nur gerade (keine Diagonalen) – jede Kurve im Labyrinth kostet sie echten Weg
const NBM=NB8.slice(0,4);
const rock=new Uint8Array(GMAX);
const occ=new Array(GMAX).fill(null);
// Fallen liegen auf dem Weg und blockieren nicht
const trapAt=new Array(GMAX).fill(null);
// Besondere Felder: 1 Podest (+Reichweite), 2 Sumpf (bremst), 3 Kristallader (+Schaden), 4 Windrune (Gegner schneller)
const tile=new Uint8Array(GMAX),TK={hi:1,sw:2,ad:3,ei:4,lv:5},zone=new Uint8Array(GMAX);
function setGrid(c,r){if(c===COLS&&r===ROWS)return;COLS=c;ROWS=r;W=c*T;H=r*T;gridChanged=true;
  if(typeof setPitch==="function"){CAMX=W/2;setPitch(PITCH*180/PI);}}

// =====================================================================
//  KARTEN
// =====================================================================
const THEMES={
  grass:{g0:"#8fdc5a",g1:"#5fc23c",lt:"rgba(190,245,120,.35)",dk:"rgba(60,150,40,.28)",bl:["#4fa82e","#3f9424","#6cc243"],fl:["#ffffff","#ffe24a","#ff7aa8","#9f8cff"],tr:["#b6f07a","#5cc23a","#2f8a2a","#1f5a1c"],vig:.22},
  stone:{g0:"#c4cf86",g1:"#9aab62",lt:"rgba(240,236,200,.35)",dk:"rgba(120,120,80,.25)",bl:["#7e9446","#6a7f3a","#93a856"],fl:["#ffffff","#ffe9a8"],tr:["#cfe68c","#86ac4c","#4f7a2c","#33521c"],vig:.22},
  autumn:{g0:"#c9c24a",g1:"#a89a34",lt:"rgba(255,215,110,.35)",dk:"rgba(160,100,30,.25)",bl:["#9a8a2a","#b07a2a","#c99a3a"],fl:["#ff6a2a","#ffd23a","#ff4a3a"],tr:["#ffd06a","#ff8a2a","#c2481a","#7a2a0a"],vig:.22},
  dark:{g0:"#5aa58a",g1:"#3a7a66",lt:"rgba(170,140,255,.22)",dk:"rgba(20,50,60,.3)",bl:["#2f6a58","#3f8a70","#287060"],fl:["#c9a6ff","#8fe0ff"],tr:["#9fe0c8","#4fa88c","#2a6a5a","#174238"],vig:.4},
  sand:{g0:"#efd690",g1:"#d6ac5e",lt:"rgba(255,244,200,.38)",dk:"rgba(170,115,45,.24)",bl:["#b89a4a","#a8843a","#c9b060"],fl:["#ff7a5a","#ffffff","#ffd23a"],tr:["#e6d08a","#b89a4a","#8a6a2a","#5a431a"],vig:.22},
  snow:{g0:"#f2f8ff",g1:"#c8dbf0",lt:"rgba(255,255,255,.55)",dk:"rgba(110,145,190,.22)",bl:["#a8c0dc","#90acc8","#bcd0e6"],fl:["#8fd3ff","#ffffff","#c9a6ff"],tr:["#ffffff","#cfe2f5","#8fb0d0","#5a7a9a"],vig:.25},
  lava:{g0:"#6a4552",g1:"#4a2f3c",lt:"rgba(255,150,90,.20)",dk:"rgba(15,0,25,.38)",bl:["#3d2a36","#52364a","#2e2030"],fl:["#ff7a2a","#ffd23a","#ff4a3a"],tr:["#7a5566","#523844","#3a2733","#241820"],vig:.45}
};
const MAPS=[
  {name:"Grüne Lichtung",desc:"Der Anfang deiner Wacht",waves:15,theme:"grass",spawns:[[5,0]],goal:[5,16],decor:[]},
  {name:"Steinbruch",desc:"Quer über das ganze Feld",waves:20,theme:"stone",spawns:[[0,0]],goal:[10,16],decor:[]},
  {name:"Zwei Portale",desc:"Die Schatten kommen von zwei Seiten",waves:20,theme:"grass",spawns:[[1,0],[9,0]],goal:[5,16],decor:[]},
  {name:"Herbstwald",desc:"Der Kristall steht in der Mitte",waves:25,theme:"autumn",spawns:[[5,0],[5,16]],goal:[5,8],decor:[]},
  {name:"Schattenpass",desc:"Der lange Weg – Gegner sind zäher",waves:30,theme:"dark",hp:1.2,spawns:[[0,1]],goal:[10,15],decor:[]},
  {name:"Endlos",desc:"Wie lange hältst du durch?",waves:0,theme:"grass",spawns:[[5,0]],goal:[5,16],decor:[]},
  {name:"Mondsumpf",desc:"Quer durchs Moor – Sumpf bremst die Gegner",waves:20,theme:"grass",spawns:[[0,8]],goal:[10,8],decor:[],
    tiles:{sw:[[3,6],[3,7],[4,7],[3,9],[4,9],[4,10],[7,5],[7,6],[6,6],[6,11],[7,11],[7,12],[5,3],[5,13]],hi:[[5,8],[2,4],[8,12]]}},
  {name:"Wüstenruinen",desc:"Ein Windpfad treibt die Gegner an – verbaue ihn!",waves:25,theme:"sand",spawns:[[5,0]],goal:[5,16],decor:[],
    tiles:{ei:[[5,2],[5,3],[5,4],[5,5],[5,6],[5,7],[5,8],[5,9],[5,10],[5,11],[5,12],[5,13],[5,14]],hi:[[2,4],[8,4],[3,8],[7,8],[2,12],[8,12]],ad:[[1,8],[9,8]]}},
  {name:"Kristallmine",desc:"Zwei Portale – Kristalladern verstärken deine Türme",waves:25,theme:"stone",spawns:[[0,0],[10,0]],goal:[5,16],decor:[],
    tiles:{ad:[[5,4],[2,7],[8,7],[5,10],[3,13],[7,13]],ei:[[0,3],[0,4],[0,5],[10,3],[10,4],[10,5],[5,13],[5,14]],sw:[[4,7],[5,7],[6,7]]}},
  {name:"Frostgipfel",desc:"Drei Portale, zähe Gegner – nutze jedes Feld",waves:30,theme:"snow",hp:1.15,spawns:[[0,8],[10,8],[5,0]],goal:[5,16],decor:[],
    tiles:{hi:[[5,5],[2,11],[8,11]],ad:[[5,12],[3,3],[7,3]],sw:[[2,8],[3,8],[7,8],[8,8],[5,2],[5,3]],ei:[[4,14],[5,14],[6,14],[5,15]]}},
  {name:"Aschepfad",desc:"Vulkan 1 – ein ruhiger Einstieg zwischen den Lavatümpeln",waves:15,theme:"lava",hp:.85,spawns:[[5,0]],goal:[5,16],decor:[],
    lava:[[2,5],[3,5],[7,5],[8,5],[2,11],[3,11],[7,11],[8,11],[5,8]],
    tiles:{hi:[[4,3],[6,3],[4,13],[6,13]],ad:[[5,6],[5,10]]}},
  {name:"Lavaströme",desc:"Vulkan 2 – glühende Ströme zwingen die Gegner auf Umwege",waves:20,theme:"lava",hp:.9,spawns:[[0,0]],goal:[10,16],decor:[],
    lava:[[3,2],[4,2],[4,3],[5,3],[5,4],[6,4],[6,5],[7,5],[7,6],[7,7],[3,9],[3,10],[4,10],[4,11],[5,11],[5,12],[6,12]],
    tiles:{ei:[[1,4],[1,5],[1,6],[9,10],[9,11],[9,12]],hi:[[2,8],[8,8],[5,6]],ad:[[2,13],[8,3]]}},
  {name:"Magmakammer",desc:"Vulkan 3 – zwei Portale, ein Lavapfropfen in der Mitte",waves:20,theme:"lava",spawns:[[2,0],[8,0]],goal:[5,16],decor:[],
    lava:[[5,4],[5,5],[5,6],[5,7],[4,7],[6,7],[2,9],[8,9]],
    tiles:{ad:[[3,5],[7,5],[3,12],[7,12]],ei:[[5,12],[5,13],[5,14]],hi:[[2,6],[8,6]]}},
  {name:"Schlot",desc:"Vulkan 4 – die Schatten steigen von unten zum Kristall auf",waves:25,theme:"lava",spawns:[[0,16],[10,16]],goal:[5,0],decor:[],
    lava:[[3,4],[4,4],[6,4],[7,4],[4,8],[5,8],[6,8],[2,12],[5,12],[8,12]],
    tiles:{ad:[[5,6],[3,9],[7,9]],hi:[[3,14],[7,14],[5,3]],ei:[[1,13],[9,13]]}},
  {name:"Aschewüste",desc:"Vulkan 5 – zwei enge Tore, dazwischen glühende Wände",waves:25,theme:"lava",spawns:[[0,8]],goal:[10,8],decor:[],
    lava:[[3,2],[3,3],[3,4],[3,5],[3,11],[3,12],[3,13],[3,14],[7,1],[7,2],[7,3],[7,4],[7,12],[7,13],[7,14],[7,15]],
    tiles:{hi:[[5,6],[5,10],[2,8]],ad:[[5,8],[8,6],[8,10]],ei:[[4,8],[6,8]]}},
  {name:"Feuerherz",desc:"Vulkan 6 – drei Portale umzingeln den Kristall im Feuerring",waves:30,theme:"lava",hp:1.15,spawns:[[0,0],[10,0],[5,16]],goal:[5,8],decor:[],
    lava:[[4,6],[5,6],[6,6],[4,10],[5,10],[6,10],[3,7],[3,9],[7,7],[7,9]],
    tiles:{ad:[[2,4],[8,4],[2,12],[8,12]],hi:[[4,3],[6,3],[4,13],[6,13]],ei:[[5,3],[5,13]]}}  ,
  {name:"Blumenhügel",desc:"Quer über die Hügel – Felsen lenken den Weg",waves:20,theme:"grass",spawns:[[0,0]],goal:[10,16],decor:[[3,4],[4,4],[7,8],[8,8],[2,12],[3,12]],
    tiles:{hi:[[5,6],[6,11]]}},
  {name:"Zwillingsbach",desc:"Zwei Portale, ein Sumpfbach in der Mitte",waves:25,theme:"grass",spawns:[[2,0],[8,0]],goal:[5,16],decor:[[5,3],[5,13]],
    tiles:{sw:[[0,8],[1,8],[2,8],[3,8],[4,8],[6,8],[7,8],[8,8],[9,8],[10,8]],hi:[[3,5],[7,5]]}},
  {name:"Felsenlabyrinth",desc:"Felsbrocken überall – nutze sie für dein Labyrinth",waves:25,theme:"stone",spawns:[[5,0]],goal:[5,16],
    decor:[[1,3],[2,3],[8,3],[9,3],[4,6],[5,6],[6,6],[1,9],[2,9],[8,9],[9,9],[4,12],[6,12]],tiles:{ad:[[5,9]],hi:[[2,6],[8,6]]}},
  {name:"Laubtor",desc:"Angriff von links und rechts durch den Herbstwald",waves:25,theme:"autumn",hp:1.05,spawns:[[0,6],[10,6]],goal:[5,16],decor:[[3,3],[7,3],[5,9],[2,12],[8,12]],
    tiles:{sw:[[4,11],[5,11],[6,11]],hi:[[5,4]]}},
  {name:"Dämmerhain",desc:"Drei Portale im Schatten – das Finale der Grünen Lande",waves:30,theme:"dark",hp:1.2,spawns:[[0,0],[5,0],[10,0]],goal:[5,16],decor:[[2,7],[8,7],[5,10]],
    tiles:{hi:[[3,10],[7,10]],ad:[[5,13]]}},
  {name:"Nebelmoor",desc:"Fast alles ist Sumpf – lange Wege lohnen sich doppelt",waves:25,theme:"grass",spawns:[[5,0]],goal:[5,16],decor:[],
    tiles:{sw:[[2,3],[3,3],[4,3],[6,3],[7,3],[8,3],[2,6],[3,6],[7,6],[8,6],[1,9],[2,9],[3,9],[7,9],[8,9],[9,9],[3,12],[4,12],[6,12],[7,12]],hi:[[5,8]]}},
  {name:"Sandsturm",desc:"Windrunen treiben die Gegner diagonal übers Feld",waves:25,theme:"sand",spawns:[[0,3]],goal:[10,13],decor:[[5,8]],
    tiles:{ei:[[2,4],[3,5],[4,6],[6,10],[7,11],[8,12]],hi:[[2,10],[8,5]],ad:[[5,3],[5,13]]}},
  {name:"Kristallgrotte",desc:"Der Kristall in der Mitte – Adern stärken deine Türme",waves:25,theme:"stone",spawns:[[0,0],[10,16]],goal:[5,8],decor:[[4,5],[6,11]],
    tiles:{ad:[[3,7],[7,9],[5,4],[5,12],[2,2],[8,14]]}},
  {name:"Eisspiegel",desc:"Glattes Eis – Windrunen und Podeste im Wechsel",waves:25,theme:"snow",hp:1.1,spawns:[[5,0]],goal:[5,16],decor:[[2,8],[8,8]],
    tiles:{ei:[[4,4],[5,4],[6,4],[4,12],[5,12],[6,12]],hi:[[2,4],[8,4],[2,12],[8,12]],sw:[[5,8]]}},
  {name:"Windschneise",desc:"Zwei Portale, zwei Windkanäle – verbaue sie früh",waves:30,theme:"sand",hp:1.1,spawns:[[0,0],[10,0]],goal:[5,16],decor:[],
    tiles:{ei:[[2,2],[2,3],[2,4],[2,5],[2,6],[8,2],[8,3],[8,4],[8,5],[8,6]],hi:[[5,5],[5,11]],ad:[[3,13],[7,13]]}},
  {name:"Gletscherthron",desc:"Drei Portale im ewigen Eis – die Meisterprüfung",waves:30,theme:"snow",hp:1.25,spawns:[[0,6],[10,6],[5,0]],goal:[5,16],decor:[[3,10],[7,10]],
    tiles:{hi:[[5,6],[2,13],[8,13]],ad:[[5,11]],sw:[[4,14],[6,14]]}},
  {name:"Glutbrücke",desc:"Vulkan 7 – ein Lavaband mit nur zwei Übergängen",waves:25,theme:"lava",spawns:[[5,0]],goal:[5,16],decor:[],
    lava:[[0,8],[2,8],[3,8],[4,8],[5,8],[6,8],[7,8],[8,8],[10,8]],tiles:{hi:[[3,5],[7,5],[5,12]],ad:[[5,3]]}},
  {name:"Rauchschlucht",desc:"Vulkan 8 – zwei Portale, glühende Felswände",waves:25,theme:"lava",hp:1.1,spawns:[[0,0],[10,0]],goal:[5,16],decor:[],
    lava:[[3,4],[3,5],[3,6],[7,4],[7,5],[7,6],[1,10],[2,10],[8,10],[9,10],[5,13]],tiles:{ei:[[5,5],[5,6]],ad:[[2,13],[8,13]]}},
  {name:"Obsidianfeld",desc:"Vulkan 9 – verstreute Lavatümpel, Gegner von links",waves:30,theme:"lava",hp:1.15,spawns:[[0,8]],goal:[10,8],decor:[],
    lava:[[3,2],[6,3],[2,6],[5,6],[8,5],[4,10],[7,11],[2,13],[5,14],[8,14]],tiles:{hi:[[5,8],[3,8]],ad:[[7,8]],ei:[[9,7],[9,9]]}},
  {name:"Herz des Vulkans",desc:"Vulkan 10 – vier Portale, der Kristall im Lavaring",waves:30,theme:"lava",hp:1.3,spawns:[[0,0],[10,0],[0,16],[10,16]],goal:[5,8],decor:[],
    lava:[[4,6],[6,6],[3,7],[7,7],[3,9],[7,9],[4,10],[6,10]],tiles:{ad:[[2,3],[8,3],[2,13],[8,13]],hi:[[5,4],[5,12]]}}
];
const ZR=2.3,ANL=7;let showPath=false;
// Alle Karten außer der ersten auf das große Feld übertragen.
// Punkte (Portale, Kristall, Podeste, Adern) wandern an die passende Stelle, Flächen (Lava, Sumpf, Wind, Felsen) wachsen mit.
(function scaleMaps(){
  const fx=BIGC/11,fy=BIGR/17;
  const pt=([c,r])=>[Math.round((c+.5)*fx-.5),Math.round((r+.5)*fy-.5)];
  const blk=list=>{const out=[],seen=new Set();
    for(const [c,r] of list)for(let y=Math.floor(r*fy);y<=Math.floor((r+1)*fy)-1;y++)for(let x=Math.floor(c*fx);x<=Math.floor((c+1)*fx)-1;x++){const k=x+","+y;if(!seen.has(k)){seen.add(k);out.push([x,y]);}}
    return out;};
  MAPS.forEach((m,i)=>{if(i===0)return;m.cols=BIGC;m.rows=BIGR;m.hp=+((m.hp||1)*1.08).toFixed(3); // längere Wege auf dem großen Feld -> Gegner etwas zäher
    m.spawns=m.spawns.map(pt);m.goal=pt(m.goal);
    if(m.lava)m.lava=blk(m.lava);if(m.decor)m.decor=blk(m.decor);
    if(m.tiles){const t={};for(const k in m.tiles)t[k]=(k==="hi"||k==="ad")?m.tiles[k].map(pt):blk(m.tiles[k]);m.tiles=t;}});
})();
function pathSec(L){return Math.round(L/(ED.normal.spd*DF().spd));}
const gardenIndex=MAPS.length;
MAPS.push({name:"Uhrwerkgarten",desc:"Zwei Portale im Heckengarten",theme:"grass",waves:20,spawns:[[1,0],[9,0]],goal:[5,16],decor:[],garden:true});
const MORDER=[0,1,2,3,4,16,17,18,19,20,6,7,8,9,21,22,23,24,25,26,10,11,12,13,14,15,27,28,29,30,5]; // Reihenfolge in der Kampagne (Endlos bleibt Nr. 5, damit alte Spielstände passen)
function tileSpd(e){
  const c=Math.floor(e.x/T),r=Math.floor(e.y/T);if(c<0||c>=COLS||r<0||r>=ROWS)return 1;const k=tile[idx(c,r)];
  if(k===2){if(Math.random()<.06)S.parts.push({k:"smoke",x:e.x,y:e.y,z:1,vx:0,vy:0,vz:8,t:0,max:.4,r:3,green:MAP.theme!=="snow"?1:0});return .62;}
  if(k===4){if(Math.random()<.1)S.parts.push({k:"spark",x:e.x,y:e.y,z:3,vx:-e.dir[0]*40,vy:-e.dir[1]*40,vz:5,t:0,max:.3,r:1.8,col:"#ffb09a"});return 1.45;}
  return 1;
}
const tileHint=i=>S.build&&S.build!=="wall"?(tile[i]===1?" · Podest: +20% Reichweite":tile[i]===3?" · Kristallader: +25% Schaden":""):"";
let MAP=MAPS[0],TH=THEMES.grass,SPAWNS=[],PORTALS=[],GI=0,GC=0,GR=0,CRY={x:0,y:0};
let referenceLayout=false;
function loadMap(m){
  const spawns=referenceLayout?[[8,0]]:m.spawns, goal=referenceLayout===2?[1,16]:referenceLayout?[2,16]:m.goal;
  setGrid(m.cols||11,m.rows||17);trapAt.fill(null);
  MAP=m;TH=THEMES[m.theme];document.body.dataset.th=m.theme;rock.fill(0);
  tile.fill(0);for(const k in (m.tiles||{}))for(const [c,r] of m.tiles[k])tile[idx(c,r)]=TK[k];
  (m.lava||[]).forEach(([c,r])=>{rock[idx(c,r)]=1;tile[idx(c,r)]=5;});
  (m.decor||[]).forEach(([c,r])=>{rock[idx(c,r)]=1;tile[idx(c,r)]=6;});
  zone.fill(0);for(const [sc,sr] of spawns)for(let dr=-2;dr<=2;dr++)for(let dc=-2;dc<=2;dc++){const c=sc+dc,r=sr+dr;if(c>=0&&c<COLS&&r>=0&&r<ROWS&&dc*dc+dr*dr<=ZR*ZR)zone[idx(c,r)]=1;}
  SPAWNS=spawns.map(([c,r])=>idx(c,r));[GC,GR]=goal;GI=idx(GC,GR);CRY={x:(GC+.5)*T,y:(GR+.5)*T};
  for(const i of [...SPAWNS,GI]){if(rock[i]){rock[i]=0;tile[i]=0;}}
  PORTALS=spawns.map(([c,r])=>{const x=(c+.5)*T,y=(r+.5)*T;
    if(r===0)return{x,y:T*.35,ex:x,ey:-T*.4,dir:[0,1],h:1};
    if(r===ROWS-1)return{x,y:H-T*.35,ex:x,ey:H+T*.4,dir:[0,-1],h:1};
    if(c===0)return{x:T*.35,y,ex:-T*.4,ey:y,dir:[1,0],h:0};
    return{x:W-T*.35,y,ex:W+T*.4,ey:y,dir:[-1,0],h:0};});
  if(R>0)renderBg(),renderVignette();
}

// =====================================================================
//  WEGFINDUNG (Dijkstra, nur gerade Schritte)
// =====================================================================
function free(c,r,extra){if(c<0||c>=COLS||r<0||r>=ROWS)return false;const j=idx(c,r),o=occ[j];return !rock[j]&&(!o||o.open===true)&&j!==extra;}
function bfs(extra){
  const n=COLS*ROWS,d=new Float32Array(n).fill(-1),done=new Uint8Array(n);d[GI]=0;
  for(;;){
    let b=-1,bv=1e9;for(let i=0;i<n;i++)if(!done[i]&&d[i]>=0&&d[i]<bv){bv=d[i];b=i;}
    if(b<0)break;done[b]=1;const c=b%COLS,r=(b/COLS)|0;
    for(const [dx,dy,w] of NBM){const nc=c+dx,nr=r+dy;if(!free(nc,nr,extra))continue;
      if(dx&&dy&&(!free(c+dx,r,extra)||!free(c,r+dy,extra)))continue;
      const j=idx(nc,nr),nd=bv+w;if(d[j]<0||nd<d[j]-1e-5)d[j]=nd;}
  }
  return d;
}
function nextCell(d,i,dir){
  if(d[i]<=0)return -1;
  const c=i%COLS,r=(i/COLS)|0,gx=GC-c,gy=GR-r,gl=Math.hypot(gx,gy)||1;
  const ok=(x,y)=>x>=0&&x<COLS&&y>=0&&y<ROWS&&d[idx(x,y)]>=0;
  let best=-1,bs=-1e9,fb=-1,fv=1e9;
  for(const [dx,dy,w] of NBM){const nc=c+dx,nr=r+dy;if(!ok(nc,nr))continue;if(dx&&dy&&(!ok(c+dx,r)||!ok(c,r+dy)))continue;
    const j=idx(nc,nr),v=w+d[j];if(v<fv){fv=v;fb=j;}
    if(v>d[i]+1e-3)continue;
    const sc=(dir&&dir[0]===dx&&dir[1]===dy?1.5:0)+(dx*gx+dy*gy)/(gl*w);
    if(sc>bs){bs=sc;best=j;}}
  return best>=0?best:fb;
}
// Schnelle Prüfung: Erreichen alle Portale den Kristall noch, wenn Feld "extra" bebaut wird?
function reachAll(extra){
  const n=COLS*ROWS,seen=new Uint8Array(n),q=new Int16Array(n);let h=0,tl=0;seen[GI]=1;q[tl++]=GI;
  while(h<tl){const b=q[h++],c=b%COLS,r=(b/COLS)|0;
    for(const [dx,dy] of NBM){const nc=c+dx,nr=r+dy;if(!free(nc,nr,extra))continue;if(dx&&dy&&(!free(c+dx,r,extra)||!free(c,r+dy,extra)))continue;
      const j=idx(nc,nr);if(!seen[j]){seen[j]=1;q[tl++]=j;}}}
  for(const s of SPAWNS)if(!seen[s])return false;return true;
}
function routeFrom(d,si,P){
  if(d[si]<0)return[];
  const pts=[{x:P.x,y:P.y}];let i=si,dir=P.dir;
  for(let k=0;k<400;k++){pts.push({x:cx(i),y:cy(i)});if(i===GI)break;const n=nextCell(d,i,dir);if(n<0)break;dir=[n%COLS-i%COLS,((n/COLS)|0)-((i/COLS)|0)];i=n;}
  return pts;
}

// =====================================================================
//  META / SPEICHER
// =====================================================================
const SIM=location.hash==="#sim"; // nur für Balance-Tests: speichert nichts
const store={get(k,d){try{const v=localStorage.getItem(k);return v===null?d:JSON.parse(v);}catch(e){return d;}},
  set(k,v){if(SIM)return;try{localStorage.setItem(k,JSON.stringify(v));}catch(e){}},del(k){if(SIM)return;try{localStorage.removeItem(k);}catch(e){}}};
const meta=Object.assign({shards:0,lv:{},kills:0,elites:0,ach:{},best:0,bestD:{},stars:{},sound:true,runs:0,daily:""},store.get("kw2_meta",{}));
if(!meta.bestD)meta.bestD={};if(!meta.stars)meta.stars={};
const saveMeta=()=>store.set("kw2_meta",meta);
function recStat(win){try{if(!S||S.daily||S.intro)return;const m=meta.ls||(meta.ls={}),k=S.map+"_"+S.diff,o=m[k]||(m[k]={t:0,w:0,bw:0,lost:0,bu:0});
  o.t++;if(win)o.w++;o.bw=Math.max(o.bw,win?(S.goalW||S.wave):Math.max(0,S.wave-1));o.lost+=S.lost||0;o.bu+=S.bu?Object.values(S.bu).reduce((a,b)=>a+b,0):0;saveMeta();}catch(e){}}
const ARTI={};for(const [k,u] of [...Object.entries({"boss": "assets/boss.webp", "flieger": "assets/flieger.webp", "flitzer": "assets/flitzer.webp", "i_bombe": "assets/i_bombe.webp", "i_eis": "assets/i_eis.webp", "i_gold": "assets/i_gold.webp", "i_leben": "assets/sheart.webp", "i_muenze": "assets/scoin.webp", "i_noads": "assets/i_noads.webp", "i_schloss": "assets/slock.webp", "i_splitter": "assets/sgem.webp", "i_stern": "assets/sstar.webp", "i_video": "assets/i_video.webp", "kaefer": "assets/kaefer.webp", "kobold": "assets/kobold.webp", "kristall": "assets/kristall.webp", "mauer": "assets/mauer.webp", "panzer": "assets/panzer.webp", "portal": "assets/portal.webp", "schamane": "assets/schamane.webp", "schleim": "assets/schleim.webp", "turm_blitz": "assets/turm_blitz.webp", "turm_frost": "assets/turm_frost.webp", "turm_gift": "assets/turm_gift.webp", "turm_kanone": "assets/turm_kanone.webp", "turm_pfeil": "assets/turm_pfeil.webp", "turm_schuetze": "assets/turm_schuetze.webp"}),...[["turm", "assets/turm_pfeil.webp"], ["kris", "assets/kristall.webp"], ["kobold", "assets/kobold.webp"]]]){const im=new Image();im.onload=()=>{try{if(typeof buildShop==="function"&&S)buildShop();}catch(e){}};im.src=u;ARTI[k]=im;}
const TWI={arrow:"turm_pfeil",cannon:"turm_kanone",frost:"turm_frost",poison:"turm_gift",tesla:"turm_blitz",sniper:"turm_schuetze"};
const ENI={jumper:"kobold",burrow:"panzer",smart:"flitzer",normal:"kobold",fast:"flitzer",armored:"panzer",swarm:"kaefer",air:"flieger",splitter:"schleim",mini:"schleim",healer:"schamane",boss:"boss"};
const artOk=k=>ARTI[k]&&ARTI[k].complete&&ARTI[k].naturalWidth>0;
const BICON={"gold": "<img src=\"assets/i_gold.webp\" alt=\"\" style=\"width:100%;height:100%;object-fit:contain\">", "ice": "<img src=\"assets/i_eis.webp\" alt=\"\" style=\"width:100%;height:100%;object-fit:contain\">", "bomb": "<img src=\"assets/i_bombe.webp\" alt=\"\" style=\"width:100%;height:100%;object-fit:contain\">", "life": "<img src=\"assets/sheart.webp\" alt=\"\" style=\"width:100%;height:100%;object-fit:contain\">", "noads": "<img src=\"assets/i_noads.webp\" alt=\"\" style=\"width:100%;height:100%;object-fit:contain\">", "skin": "<svg viewBox=\"0 0 40 40\"><path d=\"M20 4C10 4 4 11 4 19c0 9 8 15 15 15 3 0 4-2 3-4s0-4 3-4h4c4 0 7-3 7-7C36 10 29 4 20 4z\" fill=\"#ffe0a8\" stroke=\"#10182b\" stroke-width=\"2.5\"/><circle cx=\"12\" cy=\"17\" r=\"3\" fill=\"#ff4d6a\"/><circle cx=\"18\" cy=\"11\" r=\"3\" fill=\"#ffd23a\"/><circle cx=\"26\" cy=\"12\" r=\"3\" fill=\"#5ec8ff\"/><circle cx=\"29\" cy=\"19\" r=\"3\" fill=\"#7be36b\"/></svg>", "bolt": "<svg viewBox=\"0 0 40 40\"><circle cx=\"20\" cy=\"20\" r=\"16\" fill=\"#ffd84a\" stroke=\"#10182b\" stroke-width=\"2.5\"/><path d=\"M22 7L12 22h7l-2 11 11-16h-7z\" fill=\"#fff\" stroke=\"#10182b\" stroke-width=\"2\" stroke-linejoin=\"round\"/></svg>"};
const DIFFN=["Leicht","Normal","Schwer","Albtraum"];
const BOL=[["gold", "💰", "Startgold", "+120 Gold sofort"], ["ice", "❄️", "Eis-Welle", "Alle Gegner 4 s stark verlangsamt"], ["bomb", "💣", "Bombe", "Alle Bodengegner verlieren 35 % Leben"], ["life", "❤️", "Zusatzleben", "+3 Leben"]];
function BS(){if(!meta.boost){meta.boost={gold:1,ice:1,bomb:1,life:1};saveMeta();}return meta.boost;}
const todayK=()=>new Date().toISOString().slice(0,10);
function giveBoost(k,n){BS()[k]=(BS()[k]||0)+(n||1);saveMeta();}
const rndBoost=()=>BOL[(Math.random()*BOL.length)|0][0];
const lv=id=>meta.lv[id]||0;
const totalStars=()=>Object.values(meta.stars).reduce((a,b)=>a+b,0);

const DIFF=[
  {name:"Leicht",desc:"Schwächere Gegner, mehr Gold und Leben",hp:.7,spd:1,gold:1.25,lives:30,shard:.6,col:"#7ef0a0"},
  {name:"Normal",desc:"Die ausgewogene Herausforderung",hp:1,spd:1,gold:1,lives:20,shard:1,col:"#ffd25e"},
  {name:"Schwer",desc:"Zähere, schnellere Gegner, weniger Gold",hp:1.45,spd:1.06,gold:.85,lives:15,shard:1.6,col:"#ff9f43"},
  {name:"Albtraum",desc:"Nur für Meister – zäh, schnell, gnadenlos",hp:2,spd:1.15,gold:.75,lives:10,shard:2.5,col:"#ff5d6c",need:"Auf Schwer Welle 15 schaffen"}
];
const diffUnlocked=i=>i<3||(meta.bestD[2]||0)>=15;
const MODS=[
  {id:"air",name:"Flieger-Invasion",desc:"Jede Welle bringt zusätzliche Flieger"},
  {id:"elite",name:"Elite-Sturm",desc:"Viel mehr Elite-Gegner ab Welle 3"},
  {id:"glass",name:"Glaskanone",desc:"Türme +50% Schaden, aber nur 5 Leben"},
  {id:"saver",name:"Sparbuch",desc:"Keine Zinsen, dafür +150 Startgold"},
  {id:"turbo",name:"Turbo",desc:"Gegner 25% schneller, dafür +25% Gold"}
];
function dailyCfg(){const d=new Date(),key=d.getFullYear()+"-"+(d.getMonth()+1)+"-"+d.getDate();let h=7;for(const ch of key)h=(h*131+ch.charCodeAt(0))>>>0;
  return{key,map:[0,1,2,3,4,6,7,8,9][h%9],mod:MODS[(h>>>5)%MODS.length]};}

const META_DEF=[
  {id:"u_frost",name:"Frost-Turm",desc:"Schaltet den Frost-Turm frei",max:1,cost:()=>12},
  {id:"gold",name:"Startkapital",desc:"+25 Startgold",max:5,cost:l=>10+10*l},
  {id:"dmg",name:"Schärfere Waffen",desc:"+6% Schaden für alle Türme",max:10,cost:l=>12+8*l},
  {id:"lives",name:"Kristallpanzer",desc:"+5 Leben",max:4,cost:l=>16+16*l},
  {id:"u_poison",name:"Gift-Turm",desc:"Schaltet den Gift-Turm frei",max:1,cost:()=>30},
  {id:"interest",name:"Zinsen",desc:"+1% Zinsen nach jeder Welle",max:5,cost:l=>20+16*l},
  {id:"meteor",name:"Meteor",desc:"+25% Schaden, −12% Abklingzeit",max:4,cost:l=>16+16*l},
  {id:"relic",name:"Relikt-Glück",desc:"Höhere Chance auf seltene Relikte",max:3,cost:l=>24+20*l},
  {id:"u_tesla",name:"Blitz-Turm",desc:"Schaltet den Blitz-Turm frei",max:1,cost:()=>50},
  {id:"u_sniper",name:"Schützen-Turm",desc:"Schaltet den Schützen frei",max:1,cost:()=>75}
];
const RES=[{k:"dmg",name:"Schaden",desc:"+8%",max:5,cost:l=>12+8*l},{k:"rng",name:"Reichweite",desc:"+6%",max:3,cost:l=>16+12*l},{k:"cost",name:"Baukosten",desc:"−6%",max:3,cost:l=>16+12*l}];
const ACH=[
  {id:"w5",name:"Erste Schritte",desc:"Welle 5 überstehen",r:3},
  {id:"maze40",name:"Baumeister",desc:"Weglänge von 50 Feldern",r:4},
  {id:"win",name:"Sieger",desc:"Eine Karte gewinnen",r:5},
  {id:"w10",name:"Wächter",desc:"Welle 10 überstehen",r:5},
  {id:"boss",name:"Dämonenjäger",desc:"Einen Boss besiegen",r:5},
  {id:"lvl5",name:"Meisterwerk",desc:"Einen Turm auf Stufe 5 bringen",r:5},
  {id:"lvl7",name:"Legendenschmied",desc:"Einen Turm auf Stufe 7 (legendär) bringen",r:10},
  {id:"rich",name:"Schatzmeister",desc:"500 Gold gleichzeitig besitzen",r:5},
  {id:"daily",name:"Tagwerk",desc:"Eine Tägliche Herausforderung gewinnen",r:5},
  {id:"meteor10",name:"Sternenfall",desc:"10 Gegner mit einem Meteor treffen",r:5},
  {id:"combo30",name:"Kettenkiller",desc:"Eine Combo von 30 schaffen",r:6},
  {id:"vet3",name:"Kriegsheld",desc:"Ein Turm erreicht Veteran III",r:6},
  {id:"relic6",name:"Sammler",desc:"6 Relikte in einer Runde",r:6},
  {id:"perfect3",name:"Perfektionist",desc:"3 Sterne auf einer Karte",r:8},
  {id:"elite50",name:"Elitejäger",desc:"50 Elite-Gegner besiegen",r:8},
  {id:"maze70",name:"Labyrinth-Meister",desc:"Weglänge von 100 Feldern",r:10},
  {id:"perfect",name:"Unberührt",desc:"Welle 10 ohne Lebensverlust",r:10},
  {id:"stars10",name:"Sternensammler",desc:"10 Sterne sammeln",r:10},
  {id:"w20",name:"Veteran",desc:"Welle 20 überstehen",r:10},
  {id:"k1000",name:"Schattenfeger",desc:"1000 Gegner insgesamt besiegen",r:10},
  {id:"w30",name:"Legende",desc:"Welle 30 überstehen",r:15},
  {id:"stars15",name:"Sternenhimmel",desc:"15 Kampagnen-Sterne sammeln",r:25},
  {id:"stars27",name:"Sternenmeer",desc:"Alle 27 Kampagnen-Sterne",r:40},
  {id:"w50",name:"Unsterblich",desc:"Welle 50 überstehen",r:30}
];
const achQ=[];let achShowing=false;
function ach(id){if(meta.ach[id])return;const a=ACH.find(x=>x.id===id);if(!a)return;meta.ach[id]=1;meta.shards+=a.r;saveMeta();achQ.push(a);showAch();}
function showAch(){
  if(achShowing||!achQ.length)return;const a=achQ.shift();achShowing=true;
  $("achName").textContent="Erfolg: "+a.name;$("achTxt").textContent=a.desc+"  ·  +"+a.r+" Kristallsplitter";
  $("achPop").classList.add("on");beep(880,.15,"triangle",.05,true);setTimeout(()=>beep(1320,.25,"triangle",.05,true),120);
  setTimeout(()=>{$("achPop").classList.remove("on");setTimeout(()=>{achShowing=false;showAch();},400);},2600);
}

// =====================================================================
//  RELIKTE
// =====================================================================
const RAR=[{n:"Gewöhnlich",c:"#a9bcd9",w:60},{n:"Selten",c:"#5ec8ff",w:30},{n:"Episch",c:"#d38cff",w:10}];
const RELICS=[
  {id:"spitzen",name:"Scharfe Spitzen",desc:"Pfeil-Türme +35% Schaden",rar:0},
  {id:"pulver",name:"Schwarzpulver",desc:"Kanonen +30% Schaden, +15% Explosionsradius",rar:0},
  {id:"eis",name:"Ewiges Eis",desc:"Frost verlangsamt 15% stärker",rar:0},
  {id:"druese",name:"Giftdrüse",desc:"Gift wirkt 40% stärker",rar:0},
  {id:"leiter",name:"Leiterspule",desc:"Blitze springen auf 1 Ziel mehr",rar:0},
  {id:"herz",name:"Kristallherz",desc:"+8 Leben sofort",rar:0},
  {id:"ernte",name:"Goldene Ernte",desc:"Wellen-Bonus wird verdoppelt",rar:0},
  {id:"drill",name:"Drill",desc:"Türme sammeln doppelte Erfahrung",rar:0},
  {id:"fernrohr",name:"Fernrohr",desc:"Alle Türme +12% Reichweite",rar:1},
  {id:"kopfgeld",name:"Kopfgeld",desc:"+1 Gold pro Abschuss",rar:1},
  {id:"zins",name:"Zinseszins",desc:"Zins-Obergrenze verdoppelt",rar:1},
  {id:"dornen",name:"Dornenmauern",desc:"Mauern verletzen Gegner direkt daneben",rar:1},
  {id:"baumeister",name:"Baumeister",desc:"Mauern kosten nur noch 2 Gold",rar:1},
  {id:"stern",name:"Sternschnuppe",desc:"Meteor lädt doppelt so schnell",rar:1},
  {id:"brecher",name:"Rüstungsbrecher",desc:"Treffer ignorieren 50% Rüstung",rar:1},
  {id:"schatz",name:"Schatzsucher",desc:"Elite-Gegner: doppelt Gold und Splitter",rar:1},
  {id:"glueck",name:"Glückstreffer",desc:"8% Chance auf 3-fachen Schaden",rar:2},
  {id:"frostwall",name:"Frostmauern",desc:"Mauern verlangsamen Gegner daneben",rar:2},
  {id:"ueber",name:"Überstunden",desc:"Alle Türme feuern 15% schneller",rar:2},
  {id:"kette",name:"Kettenreaktion",desc:"Gegner explodieren beim Tod (Flächenschaden)",rar:2}
];
const has=id=>S&&S.rel&&S.rel.includes(id);

// =====================================================================
//  TÜRME
// =====================================================================
const TD={
  wall:{name:"Mauer",cost:3,desc:"Mit dem Finger ziehen baut eine Mauerreihe"},
  arrow:{name:"Pfeil",cost:25,dmg:6,rate:2,range:2.6,air:1,ground:1,pspd:560,color:"#7be0a0",desc:"Schnell, trifft auch Flieger",
    br:[{name:"Salve",desc:"Schießt auf mehrere Ziele"},{name:"Falke",desc:"Mehr Reichweite, ×3 gegen Flieger"}]},
  cannon:{name:"Kanone",cost:45,dmg:14,rate:.7,range:2.3,splash:.9,ground:1,pspd:280,color:"#ff9f43",desc:"Flächenschaden, nur Bodenziele",
    br:[{name:"Mörser",desc:"Riesige Explosionen, mehr Reichweite"},{name:"Brandkugeln",desc:"Setzt Gegner in Flammen"}]},
  frost:{name:"Frost",cost:40,dmg:2,rate:1,range:2.2,splash:.8,slow:.4,slowT:1.5,air:1,ground:1,pspd:360,color:"#8fd3ff",desc:"Verlangsamt Gegner",unlock:"u_frost",
    br:[{name:"Eissturm",desc:"Dauerhafte Frost-Aura"},{name:"Spröde",desc:"Gefrorene nehmen mehr Schaden"}]},
  poison:{name:"Gift",cost:50,dmg:1,rate:.9,range:2.4,splash:.55,dot:5,dotT:3,air:1,ground:1,pspd:300,color:"#9be15d",desc:"Gift ignoriert Rüstung",unlock:"u_poison",
    br:[{name:"Seuche",desc:"Gift springt beim Tod über"},{name:"Säure",desc:"Zerfrisst Rüstung, mehr Gift"}]},
  tesla:{name:"Blitz",cost:70,dmg:14,rate:.8,range:2.4,chain:2,air:1,ground:1,color:"#c77dff",desc:"Springender Kettenblitz",unlock:"u_tesla",
    br:[{name:"Gewitter",desc:"Springt auf viel mehr Ziele"},{name:"Überladung",desc:"Kann Gegner betäuben"}]},
  sniper:{name:"Schütze",cost:80,dmg:45,rate:.45,range:4.6,air:1,ground:1,color:"#ffd25e",desc:"Riesige Reichweite und Schaden",unlock:"u_sniper",
    br:[{name:"Kopfschuss",desc:"Chance auf 4-fachen Schaden"},{name:"Kopfgeld",desc:"Mehr Gold pro Abschuss"}]}
};
const ORDER=["wall","arrow","cannon","frost","poison","tesla","sniper"];
// Mauern mit Wirkung: eine normale Mauer wird angetippt und umgebaut
const WK={gate:{name:"Tor",cost:15,icon:"🚪",short:"Auf/zu im Kampf",desc:"Im Kampf antippen: öffnet oder schließt – die Gegner laufen sofort um"},
  thorn:{name:"Dornmauer",cost:25,icon:"🌵",short:"Sticht Vorbeilaufende",desc:"Verletzt Bodengegner, die direkt daneben vorbeilaufen"},
  crystal:{name:"Kristallmauer",cost:25,icon:"💎",short:"Türme daneben +12%",desc:"Türme direkt daneben machen +12% Schaden (bis +24%)"}};
const GATE_CD=1.5;
// Fallen: liegen auf dem Weg, blockieren nicht – lange Wege über Fallen lohnen sich doppelt
const TRAPS={spike:{name:"Stachelfalle",cost:20,desc:"Sticht jeden Bodengegner, der drüberläuft"},
  tar:{name:"Teergrube",cost:20,desc:"Bremst Bodengegner stark ab"},
  fire:{name:"Glutplatte",cost:30,desc:"Setzt Bodengegner in Brand"}};
const TRAPMAX=8,TRAPK=["spike","tar","fire"];
const MODES=["Erster","Stärkster","Nächster"];
const VET=[0,20,80,250],VETN=["","Veteran I","Veteran II","Veteran III"];
const rankOf=t=>t.kills>=VET[3]?3:t.kills>=VET[2]?2:t.kills>=VET[1]?1:0;
const rkey=(type,k)=>"t_"+type+"_"+k;
// Meister-Fähigkeiten: Wahl beim Aufstieg von Stufe 6 auf 7 (je Spezialisierung zwei)
const PERKS={
  arrow0:[{name:"Pfeilhagel",desc:"+2 Ziele, lädt schneller nach"},{name:"Giftpfeile",desc:"Pfeile vergiften – ignoriert Rüstung"}],
  arrow1:[{name:"Adlerauge",desc:"20% Chance auf 3-fachen Schaden"},{name:"Sturmfalke",desc:"Feuert 40% schneller"}],
  cannon0:[{name:"Erdbeben",desc:"Explosionen betäuben Gegner kurz"},{name:"Großkaliber",desc:"+50% Schaden, größere Explosion"}],
  cannon1:[{name:"Inferno",desc:"Brandschaden mehr als verdoppelt"},{name:"Napalm",desc:"Hinterlässt brennende Pfützen"}],
  frost0:[{name:"Permafrost",desc:"Stärkere Bremse, doppelter Aura-Schaden"},{name:"Eiszeit",desc:"Friert alle 4 s alles im Umkreis ein"}],
  frost1:[{name:"Glassplitter",desc:"Gefrorene nehmen noch mehr Schaden"},{name:"Frostnova",desc:"Riesiger Frostradius, längere Bremse"}],
  poison0:[{name:"Pandemie",desc:"Seuche springt weiter, Gift +50%"},{name:"Giftwolke",desc:"Hinterlässt giftige Wolken"}],
  poison1:[{name:"Ätzend",desc:"Säure macht Gegner spröde (+30% Schaden)"},{name:"Konzentrat",desc:"Doppeltes Gift, feuert schneller"}],
  tesla0:[{name:"Superzelle",desc:"+4 Sprünge ohne Schadensverlust"},{name:"Kugelblitz",desc:"Feuert 50% schneller"}],
  tesla1:[{name:"Elektroschock",desc:"Betäubt fast immer – und länger"},{name:"Hochspannung",desc:"+60% Schaden, ×1,5 gegen Flieger"}],
  sniper0:[{name:"Todesschuss",desc:"50% Krit-Chance, 5-facher Schaden"},{name:"Durchschuss",desc:"Trifft alle Gegner in der Schusslinie"}],
  sniper1:[{name:"Goldgräber",desc:"Noch mehr Gold pro Abschuss"},{name:"Hinrichtung",desc:"Tötet Gegner unter 25% Leben sofort (keine Bosse)"}]
};
const MAXL=7,BRL=3,PERKL=6; // höchste Stufe; Spezialisierung ab 3; Meister-Wahl ab 6
const metaDmg=()=>1+.06*lv("dmg");
function tstats(t){
  const d=TD[t.type],L=Math.min(t.level,3)-1,k=t.level>3?Math.min(3,t.level-3):0,leg=t.level>=MAXL;
  let M=metaDmg()*(1+.08*lv(rkey(t.type,"dmg")))*(1+.12*rankOf(t))*(leg?1.35:1);
  if(S&&S.mod==="glass")M*=1.5;
  if(t.i!=null&&tile[t.i]===3)M*=1.25; // Kristallader
  if(t.i!=null)M*=1+.12*crystalNb(t); // Kristallmauern daneben
  const s={dmg:d.dmg*[1,1.6,2.5][L]*M,rate:d.rate*[1,1.1,1.2][L],range:d.range+.25*L,splash:d.splash||0,slow:d.slow||0,slowT:d.slowT||0,
    dot:(d.dot||0)*[1,1.6,2.5][L]*M,dotT:d.dotT||0,chain:d.chain||0,air:!!d.air,ground:!!d.ground,multi:1,airMul:1,burn:0,aura:0,brittle:0,plague:0,acid:0,stun:0,crit:0,bounty:1,luck:0,
    critMul:4,stunT:.5,pool:null,freeze:0,freezeT:0,pierce:0,execute:0,plagueR:1.3,noFall:0,acidBrittle:0};
  if(k){const K=k-1;
    switch(t.type+t.branch){
      case "arrow0":s.multi=k+1;s.dmg*=[1.4,2,2.7][K];break;
      case "arrow1":s.range+=[.8,1.3,1.7][K];s.airMul=[2.5,3.5,4.5][K];s.dmg*=[1.5,2.2,3][K];break;
      case "cannon0":s.splash*=[1.5,1.9,2.2][K];s.range+=[.7,1.1,1.4][K];s.dmg*=[1.8,2.8,3.9][K];s.rate*=.85;break;
      case "cannon1":s.dmg*=[1.4,2,2.8][K];s.burn=s.dmg*[.5,.8,1][K];break;
      case "frost0":s.aura=1;s.slow=[.5,.6,.65][K];s.dmg*=[2,3.5,5][K];break;
      case "frost1":s.brittle=[.25,.4,.5][K];s.dmg*=[2,3,4.2][K];s.slow+=.08*k;break;
      case "poison0":s.plague=1;s.dot*=[1.6,2.5,3.5][K];break;
      case "poison1":s.acid=1;s.dot*=[1.5,2.2,3.1][K];break;
      case "tesla0":s.chain+=[2,4,6][K];s.dmg*=[1.5,2.2,3][K];break;
      case "tesla1":s.stun=[.25,.35,.42][K];s.dmg*=[1.8,2.8,3.9][K];break;
      case "sniper0":s.crit=[.25,.35,.42][K];s.dmg*=[1.6,2.4,3.3][K];break;
      case "sniper1":s.bounty=[1.6,2.2,2.6][K];s.dmg*=[1.4,2,2.8][K];break;
    }}
  if(leg&&t.perk>=0)switch(t.type+t.branch+"_"+t.perk){
    case "arrow0_0":s.multi+=2;s.rate*=1.15;break;
    case "arrow0_1":s.dot=s.dmg*.6;s.dotT=3;break;
    case "arrow1_0":s.crit=.2;s.critMul=3;break;
    case "arrow1_1":s.rate*=1.4;break;
    case "cannon0_0":s.stun=.3;s.stunT=.6;break;
    case "cannon0_1":s.dmg*=1.5;s.splash*=1.2;break;
    case "cannon1_0":s.burn*=2.2;break;
    case "cannon1_1":s.pool={dps:s.dmg*.5,f:.8,t:3,kind:"fire"};break;
    case "frost0_0":s.slow=Math.min(.75,s.slow+.12);s.dmg*=2;break;
    case "frost0_1":s.freeze=4;s.freezeT=.9;break;
    case "frost1_0":s.brittle+=.3;break;
    case "frost1_1":s.splash*=1.7;s.slowT*=2;break;
    case "poison0_0":s.plagueR=2.2;s.dot*=1.5;break;
    case "poison0_1":s.pool={dps:s.dot*.7,f:1.2,t:3.5,kind:"poison"};break;
    case "poison1_0":s.acidBrittle=.3;break;
    case "poison1_1":s.dot*=2;s.rate*=1.2;break;
    case "tesla0_0":s.chain+=4;s.noFall=1;break;
    case "tesla0_1":s.rate*=1.5;break;
    case "tesla1_0":s.stun=.65;s.stunT=.9;break;
    case "tesla1_1":s.dmg*=1.6;s.airMul*=1.5;break;
    case "sniper0_0":s.crit=.5;s.critMul=5;break;
    case "sniper0_1":s.pierce=1;break;
    case "sniper1_0":s.bounty*=1.5;break;
    case "sniper1_1":s.execute=.25;break;
  }
  // Relikte
  if(t.type==="arrow"&&has("spitzen"))s.dmg*=1.35;
  if(t.type==="cannon"&&has("pulver")){s.dmg*=1.3;s.splash*=1.15;}
  if(t.type==="frost"&&has("eis"))s.slow=Math.min(.8,s.slow+.15);
  if(t.type==="poison"&&has("druese"))s.dot*=1.4;
  if(t.type==="tesla"&&has("leiter"))s.chain+=1;
  if(has("ueber"))s.rate*=1.15;
  if(has("glueck"))s.luck=.08;
  s.range*=T*(1+.06*lv(rkey(t.type,"rng")))*(has("fernrohr")?1.12:1)*(t.i!=null&&tile[t.i]===1?1.2:1);s.splash*=T;
  if(s.pool)s.pool.r=Math.max(s.splash,.6*T)*s.pool.f;
  return s;
}
function crystalNb(t){let n=0;for(let dy=-1;dy<=1;dy++)for(let dx=-1;dx<=1;dx++){if(!dx&&!dy)continue;const c=t.c+dx,r=t.r+dy;if(c<0||c>=COLS||r<0||r>=ROWS)continue;const o=occ[idx(c,r)];if(o&&o.wk==="crystal")n++;}return Math.min(2,n);}
const wallCount=()=>S?S.towers.reduce((n,t)=>n+(t.type==="wall"),0):0;
// Mauern: fester, günstiger Preis – große Labyrinthe sind das Herz des Spiels
const costOf=type=>type==="wall"?(has("baumeister")?2:TD.wall.cost):Math.round(TD[type].cost*(1-.06*lv(rkey(type,"cost"))));
const upCost=t=>Math.round(costOf(t.type)*[.8,1.4,2.2,3.5,5,7.5][t.level-1]);
const sellVal=t=>t.fresh?t.spent:Math.floor(t.spent*.7);

// =====================================================================
//  GEGNER & WELLEN
// =====================================================================
const ED={
  normal:{hp:22,spd:1.1,rew:2,r:10,dmg:1,col:"#ff5f7e"},
  fast:{hp:13,spd:2,rew:2,r:8,dmg:1,col:"#ffc22e"},
  armored:{hp:40,spd:.8,rew:4,r:12,armor:3,dmg:2,col:"#a08d78"},
  swarm:{hp:7,spd:1.4,rew:1,r:6,dmg:1,col:"#2ee59d"},
  air:{hp:18,spd:1.2,rew:3,r:9,air:1,dmg:1,col:"#b07cff"},
  splitter:{hp:30,spd:.9,rew:2,r:12,dmg:1,col:"#7be36b"},
  mini:{hp:0,spd:1.4,rew:1,r:7,dmg:1,col:"#7be36b"},
  healer:{hp:28,spd:.9,rew:4,r:10,dmg:1,col:"#b48cff"},
  boss:{hp:420,spd:.5,rew:45,r:18,armor:4,dmg:8,col:"#ff3366"},
  jumper:{hp:20,spd:1.15,rew:3,r:9,dmg:1,col:"#ffa040"},
  burrow:{hp:34,spd:.95,rew:3,r:10,dmg:1,col:"#a0703a"},
  smart:{hp:24,spd:1.15,rew:3,r:9,dmg:1,col:"#4ad0ff"}
};
const AFFIX=[{id:"shield",name:"Schild"},{id:"swift",name:"Flink"},{id:"regen",name:"Regeneration"},{id:"giant",name:"Riese"}];
const WNAMES=["Kobolde","Flitzer","Gepanzerte","Schwarm","Flieger","Schleime","Schamanen","Panzer","Gemischt","BOSS"];
const hpMult=n=>Math.pow(1.13,n-1)*(1+.06*n);
const spdMult=n=>1+Math.min(.4,(n-1)*.015);
const ENAMES={normal:"Kobolde",fast:"Flitzer",armored:"Gepanzerte",swarm:"Käfer",air:"Flieger",splitter:"Schleime",healer:"Schamanen",boss:"Boss",jumper:"Springer",burrow:"Bohrer",smart:"Späher"};
let sumCache={n:-1,t:""};
function waveSummary(n){
  if(sumCache.n===n&&sumCache.map===(S?S.map:-1))return sumCache.t;const c={};for(const q of makeWave(n))c[q.type]=(c[q.type]||0)+1;
  const t=Object.entries(c).sort((a,b)=>(b[0]==="boss")-(a[0]==="boss")||b[1]-a[1]).slice(0,2).map(([k,v])=>v+" "+(k==="boss"?(v>1?"Bosse":"Boss"):ENAMES[k])).join(" + ");
  sumCache={n,t,map:S?S.map:-1};return t;
}
function makeWave(n){
  const k=(n-1)%10,q=[],add=(t,c,gap)=>{c=Math.max(1,Math.round(c));for(let i=0;i<c;i++)q.push({type:t,gap,w:n});};
  switch(k){
    case 0:add("normal",6+n*.8,.75);break;
    case 1:add("fast",6+n*.8,.5);break;
    case 2:add("normal",5,.7);add("armored",3+n*.2,1);break;
    case 3:add("swarm",16+n,.22);break;
    case 4:add("air",6+n*.4,.7);break;
    case 5:add("splitter",5+n*.3,.9);break;
    case 6:{const nn=Math.round(6+n*.3);for(let i=0;i<nn;i++){q.push({type:"normal",gap:.7,w:n});if(i%3===1)q.push({type:"healer",gap:.7,w:n});}break;}
    case 7:add("armored",5+n*.3,.9);break;
    case 8:add("normal",3+n*.15,.6);add("fast",3+n*.15,.45);add("air",3+n*.12,.6);add("armored",2+n*.1,.9);break;
    case 9:add("normal",5,.7);add("boss",n/10,3);break;
  }
  if(S.mod==="air"&&k!==4)add("air",2+n*.2,.6);
  if(k!==9&&n>=5&&S.map!==0&&S.map!==1&&S.map!==5){
    if(n%3===0)add("burrow",1+n*.07,1.1);
    if(n%4===2)add("jumper",2+n*.08,.8);
    if(n>=8&&n%5===1)add("smart",2+n*.07,.8);}
  return q;
}
// V6: Kartenspezifische Gegnerkompositionen. Die ersten zwei Karten bleiben Lerngebiete.
// Zusätzliche Gegner ersetzen einen Teil der Standardwelle NICHT: ihre Anzahl ist
// bewusst begrenzt, und sie zahlen die normalen Goldbelohnungen aus.
const MAP_TACTICS={
  2:{name:"Zangenangriff",hint:"Zwei Portale: plane Reichweite auf beiden Seiten.",every:4,type:"fast",count:2},
  3:{name:"Schwarmwald",hint:"Flächenschaden hilft gegen Käfer und Schleime.",every:3,type:"swarm",count:5},
  4:{name:"Schattenrüstung",hint:"Gepanzerte Feinde verlangen Kanonen oder Gift.",every:4,type:"armored",count:2},
  6:{name:"Sumpfgeister",hint:"Heiler halten Gruppen länger am Leben.",every:4,type:"healer",count:2},
  7:{name:"Wüstenwind",hint:"Schnelle Gegner nutzen die Windrunen.",every:3,type:"fast",count:3},
  8:{name:"Kristallflug",hint:"Flieger und Bodentruppen wechseln sich ab.",every:4,type:"air",count:3},
  9:{name:"Frostpanzer",hint:"Rüstung und Flieger erfordern gemischte Verteidigung.",every:3,type:"armored",count:2},
  10:{name:"Aschekäfer",hint:"Frühe Schwärme belohnen Flächenschaden.",every:4,type:"swarm",count:4},
  11:{name:"Lavaläufer",hint:"Schnelle Angreifer testen die Engstellen.",every:3,type:"fast",count:3},
  12:{name:"Magmaheiler",hint:"Schamanen verstärken die beiden Angriffsseiten.",every:4,type:"healer",count:2},
  13:{name:"Schlotflieger",hint:"Flieger umgehen deine Bodenlabyrinthe.",every:3,type:"air",count:3},
  14:{name:"Aschepanzer",hint:"Schwere Gegner nutzen die engen Tore.",every:4,type:"armored",count:3},
  15:{name:"Feuersturm",hint:"Gemischte Angriffe aus drei Portalen.",every:3,type:"fast",count:3},
  16:{name:"Springerplage",hint:"Springer überhüpfen kurze Wege – mach sie lang.",every:3,type:"jumper",count:2},
  17:{name:"Bachkäfer",hint:"Schwärme aus zwei Richtungen – Flächenschaden hilft.",every:3,type:"swarm",count:4},
  18:{name:"Bohrtrupp",hint:"Bohrer graben sich am Portal vorbei – verteidige weiter hinten.",every:3,type:"burrow",count:2},
  19:{name:"Flankenspäher",hint:"Späher suchen den Weg mit den wenigsten Türmen.",every:4,type:"smart",count:2},
  20:{name:"Schattenheer",hint:"Alles kommt – Bohrer, Springer und Späher.",every:3,type:"burrow",count:2},
  21:{name:"Moorgeister",hint:"Heiler im Sumpf – Gift wirkt lange.",every:4,type:"healer",count:2},
  22:{name:"Sandspringer",hint:"Springer nutzen die Windrunen.",every:3,type:"jumper",count:3},
  23:{name:"Grottenbohrer",hint:"Bohrer tauchen erst kurz vor der Mitte auf.",every:3,type:"burrow",count:2},
  24:{name:"Eisspäher",hint:"Späher meiden deine stärksten Türme.",every:3,type:"smart",count:2},
  25:{name:"Sturmläufer",hint:"Schnelle Gegner in beiden Windkanälen.",every:3,type:"fast",count:3},
  26:{name:"Gletscherlegion",hint:"Gepanzerte und Bohrer aus drei Richtungen.",every:3,type:"armored",count:2},
  27:{name:"Brückenspringer",hint:"Springer überwinden die Engstellen schnell.",every:3,type:"jumper",count:3},
  28:{name:"Rauchbohrer",hint:"Bohrer kommen unter den Felswänden hindurch.",every:3,type:"burrow",count:3},
  29:{name:"Obsidianspäher",hint:"Späher finden jede Lücke zwischen den Tümpeln.",every:3,type:"smart",count:3},
  30:{name:"Vulkanherz",hint:"Vier Portale – das große Finale.",every:3,type:"fast",count:3}
};
function tacticalWave(q,n){
  const t=MAP_TACTICS[S.map];
  if(!t||n<3||n%10===0||n%t.every!==0)return q;
  // Begrenzter Zusatztrupp; Bonus-Gold verhindert eine versteckte Wirtschaftsbremse.
  for(let i=0;i<t.count;i++)q.push({type:t.type,gap:t.type==="swarm"?.26:.65,w:n});
  return q;
}
function tacticalHint(){const t=MAP_TACTICS[S.map];return t?t.name+": "+t.hint:"Baue Wege und kombiniere Türme für verschiedene Gegnertypen.";}
const isAirWave=n=>{const k=(n-1)%10;return k===4||k===8||(S&&S.mod==="air");};

// =====================================================================
//  AUDIO & HELFER
// =====================================================================
// ---------- Audio: Effekte + generative Musik ----------
let AC=null,sfxBus=null,musBus=null,noiseBuf=null,lastSnd=0;
if(meta.music===undefined)meta.music=true;
function ac(){
  try{
    if(!AC){AC=new(window.AudioContext||window.webkitAudioContext)();
      const comp=AC.createDynamicsCompressor(),master=AC.createGain();master.gain.value=.9;master.connect(comp);comp.connect(AC.destination);
      sfxBus=AC.createGain();sfxBus.connect(master);musBus=AC.createGain();musBus.gain.value=.42;musBus.connect(master);
      noiseBuf=AC.createBuffer(1,AC.sampleRate,AC.sampleRate);const d=noiseBuf.getChannelData(0);for(let i=0;i<d.length;i++)d[i]=Math.random()*2-1;}
    if(AC.state==="suspended")AC.resume();
  }catch(e){}
  return AC;
}
document.addEventListener("pointerdown",()=>ac(),true);
function beep(f,d,type="square",v=.035,force){
  if(!meta.sound||!AC)return;const now=performance.now();if(!force&&now-lastSnd<45)return;lastSnd=now;
  try{const t=AC.currentTime,o=AC.createOscillator(),gn=AC.createGain();o.type=type;o.frequency.setValueAtTime(f*(.96+Math.random()*.08),t);
    o.frequency.exponentialRampToValueAtTime(Math.max(40,f*.6),t+d);
    gn.gain.setValueAtTime(v,t);gn.gain.exponentialRampToValueAtTime(.0001,t+d);
    o.connect(gn);gn.connect(sfxBus);o.start(t);o.stop(t+d+.02);}catch(e){}
}
let lastNoise=0;
function noise(d,freq,v,type="lowpass",bus){
  if(!AC||(!bus&&!meta.sound))return;
  if(!bus&&d<.1){const n=performance.now();if(n-lastNoise<22)return;lastNoise=n;}
  try{const t=AC.currentTime,s=AC.createBufferSource(),f=AC.createBiquadFilter(),gn=AC.createGain();s.buffer=noiseBuf;f.type=type;f.frequency.setValueAtTime(freq,t);
    if(type==="lowpass")f.frequency.exponentialRampToValueAtTime(Math.max(60,freq*.25),t+d);
    gn.gain.setValueAtTime(v,t);gn.gain.exponentialRampToValueAtTime(.0001,t+d);s.connect(f);f.connect(gn);gn.connect(bus||sfxBus);s.start(t);s.stop(t+d+.02);}catch(e){}
}
let lastPop=0;
const sfx={
  pop(){ // Comic-„Plopp" beim Besiegen
    if(!meta.sound||!AC)return;const n=performance.now();if(n-lastPop<28)return;lastPop=n;
    try{const t=AC.currentTime,o=AC.createOscillator(),gn=AC.createGain(),f0=520+Math.random()*380;o.type="sine";
      o.frequency.setValueAtTime(f0,t);o.frequency.exponentialRampToValueAtTime(f0*.28,t+.09);gn.gain.setValueAtTime(.16,t);gn.gain.exponentialRampToValueAtTime(.0001,t+.11);
      o.connect(gn);gn.connect(sfxBus);o.start(t);o.stop(t+.13);}catch(e){}
    noise(.022,4500,.1,"highpass");
  },
  boom(big){noise(big?.9:.35,big?1400:900,big?.5:.22);beep(big?55:80,big?.6:.25,"sine",big?.2:.1,true);},
  hit(){noise(.05,3000,.05,"bandpass");},
  coin(){beep(1500+Math.random()*300,.06,"square",.018);},
  leak(){noise(.4,600,.3);beep(70,.4,"sawtooth",.08,true);}
};
function burst(x,y,z,r,col,n,max){S.parts.push({k:"burst",x,y,z,r,col,n:n||8,rot:Math.random()*TAU,t:0,max:max||.2});}
// ---------- Turm-Sounds: eigener Klang je Turm, wuchtiger mit jeder Stufe ----------
const sndT={};
function sOk(k,gap){if(!meta.sound||!AC)return false;const n=performance.now();if(n-(sndT[k]||0)<gap)return false;sndT[k]=n;return true;}
function tn(f0,f1,d,type,v,dl){try{const t=AC.currentTime+(dl||0),o=AC.createOscillator(),gn=AC.createGain();o.type=type;o.frequency.setValueAtTime(f0,t);o.frequency.exponentialRampToValueAtTime(Math.max(30,f1),t+d);
  gn.gain.setValueAtTime(.0001,t);gn.gain.exponentialRampToValueAtTime(v,t+.006);gn.gain.exponentialRampToValueAtTime(.0001,t+d);o.connect(gn);gn.connect(sfxBus);o.start(t);o.stop(t+d+.03);}catch(e){}}
function nz(d,f0,f1,v,type,q,dl){try{const t=AC.currentTime+(dl||0),s=AC.createBufferSource(),f=AC.createBiquadFilter(),gn=AC.createGain();s.buffer=noiseBuf;f.type=type;f.Q.value=q||1;
  f.frequency.setValueAtTime(f0,t);f.frequency.exponentialRampToValueAtTime(Math.max(40,f1),t+d);gn.gain.setValueAtTime(v,t);gn.gain.exponentialRampToValueAtTime(.0001,t+d);
  s.connect(f);f.connect(gn);gn.connect(sfxBus);s.start(t,Math.random()*.5);s.stop(t+d+.03);}catch(e){}}
sfx.shoot=function(type,lv,crit){
  if(!sOk("s"+type,type==="cannon"||type==="frost"||type==="poison"?70:55))return;
  const L=(lv-1)/6,v=.72+L*.12,dp=1-L*.15,hi=lv>=4;
  switch(type){
    case "arrow":nz(.09,3400*dp,900,.075*v,"bandpass",2);tn(540*dp,180,.07,"triangle",.05*v);if(hi)tn(270*dp,120,.1,"sine",.04*v);break; // Sehne + Zischen
    case "cannon":tn(150*dp,38,.22+L*.2,"sine",.22*v);nz(.2+L*.2,1400,200,.16*v,"lowpass",.7);if(hi)tn(72,30,.42,"sine",.14*v);break; // Wumms
    case "frost":tn(1900,1500,.12,"sine",.032*v);tn(2850*dp,2300,.16,"sine",.022*v,.02);nz(.12,7000,5000,.03*v,"highpass",1);if(hi)tn(950,700,.22,"triangle",.026*v);break; // Klirren
    case "poison":tn(170*dp,420,.09,"sine",.07*v);tn(240*dp,560,.08,"sine",.05*v,.07);nz(.1,900,400,.04*v,"lowpass",3);if(hi)tn(130*dp,330,.1,"sine",.05*v,.13);break; // Blubbern
    case "tesla":tn(1700,160*dp,.11,"sawtooth",.035*v);nz(.13,4500,1800,.07*v,"bandpass",4);tn(90*dp,50,.14,"square",.03*v);if(hi)nz(.28,2500,600,.04*v,"bandpass",2,.05);break; // Knall + Knistern
    case "sniper":nz(.05,6000,2500,.2*v,"highpass",.7);tn(230*dp,55,.16,"sine",.16*v);nz(.3,1800,400,.05*v,"lowpass",.7,.06);if(hi)tn(110,40,.26,"sine",.1*v);if(crit)tn(1900,1200,.16,"triangle",.04,.02);break; // Schuss mit Hall
  }
  if(lv>=7){tn(1568,1568,.26,"sine",.012,.01);tn(2349,2349,.3,"sine",.008,.03);} // legendärer Schimmer
};
sfx.hit=function(kind,lv,x){
  if(!sOk("h"+kind,kind==="arrow"?40:75))return;
  const L=((lv||1)-1)/6,v=1+L*.6,dp=1-L*.3;
  switch(kind){
    case "arrow":nz(.035,1500,500,.06,"lowpass",1);tn(240,120,.04,"triangle",.03);break;
    case "boom":tn(110*dp,32,.3+L*.25,"sine",.2*v);nz(.35+L*.3,1100,120,.2*v,"lowpass",.7);nz(.08,3000,1500,.05,"bandpass",2,.05);if(x)nz(.45,2600,900,.045,"bandpass",1,.08);break;
    case "ice":nz(.09,8000,4000,.06*v,"highpass",1);tn(2600,2300,.07,"sine",.03*v);tn(2100,1800,.08,"sine",.025*v,.04);tn(3100,2700,.1,"sine",.02*v,.08);break;
    case "splash":nz(.14,700,250,.08*v,"lowpass",2);tn(300,130,.12,"sine",.05*v);if(x)nz(.3,5000,3000,.022,"highpass",1,.05);break;
    case "nova":nz(.4,9000,2500,.09,"highpass",1);tn(1500,400,.4,"triangle",.05);for(let i=0;i<5;i++)tn(2000+i*320,1700+i*300,.1,"sine",.025,i*.045);break;
  }
};
// Kristallwacht V8: Samples werden einmal dekodiert und direkt über Web Audio abgespielt.
// (V7 erzeugte pro Schuss ein neues <audio>-Element -> auf iOS 100-300 ms Verzögerung und Ruckeln.)
const KW_AUDIO_FILES=['arrow','cannon','frost','poison','tesla','sniper','hit_arrow','hit_boom','hit_ice','hit_splash','hit_nova','enemy_down','boss_down','coin','leak','music_build','music_battle'];
const kwRaw={},kwBuf={};let kwDecoding=false,kwVoices=0;const KW_MAX_VOICES=14;
// Dateien sofort laden (noch ohne Dekodieren, das geht erst mit AudioContext)
const kwInlineAudio = {
/*@build:audio*/
};
for (const key of KW_AUDIO_FILES) {
  kwRaw[key] = Uint8Array.from(atob(kwInlineAudio[key]), character => character.charCodeAt(0)).buffer;
}
const kwFetchAll = Promise.resolve();
function kwDecodeAll(){
 if(kwDecoding||!AC)return;kwDecoding=true;
 kwFetchAll.then(()=>{for(const key of KW_AUDIO_FILES){const ab=kwRaw[key];if(!ab)continue;delete kwRaw[key];
  const done=buf=>{kwBuf[key]=buf;if(key.startsWith('music_'))kwUpdateMusic();};
  try{const pr=AC.decodeAudioData(ab,done,()=>{});if(pr&&pr.catch)pr.catch(()=>{});}catch(e){}}});
}
function kwUnlock(){const c=ac();if(c){kwDecodeAll();if(c.state!=="running")c.resume().catch(()=>{});}}
document.addEventListener('pointerdown',kwUnlock,true);
document.addEventListener('touchend',kwUnlock,true);
document.addEventListener('keydown',kwUnlock,true);
function kwPlay(key,volume=.5,limit=60){
 if(!meta.sound||document.hidden||!AC||AC.state!=="running")return;
 const buf=kwBuf[key];if(!buf||kwVoices>=KW_MAX_VOICES)return;
 const now=performance.now(),id='kw_'+key;
 if(now-(sndT[id]||0)<limit)return;sndT[id]=now;
 try{const s=AC.createBufferSource(),gn=AC.createGain();s.buffer=buf;
  s.playbackRate.value=.97+Math.random()*.06;gn.gain.value=Math.max(0,Math.min(1,volume));
  s.connect(gn);gn.connect(sfxBus);kwVoices++;s.onended=()=>{kwVoices--;try{gn.disconnect();}catch(e){}};s.start();}catch(e){}
}
sfx.shoot=(type,lv,crit)=>kwPlay(type, type==='cannon'?.53:type==='sniper'?.48:.33, type==='arrow'?85:110);
sfx.hit=(kind,lv,x)=>kwPlay('hit_'+kind,kind==='boom'?.43:.25,kind==='arrow'?90:125);
sfx.pop=()=>kwPlay('enemy_down',.18,95);
sfx.boom=(big)=>kwPlay(big?'boss_down':'hit_boom',big?.64:.4,250);
sfx.coin=()=>kwPlay('coin',.35,70);
sfx.leak=()=>kwPlay('leak',.45,250);
// Musik ebenfalls über Web Audio: nahtlose Schleife, Lautstärke wirkt auch auf iOS, sanfte Überblendung
let kwMusicSrc=null,kwMusicGain=null,kwMusicMode='';
function kwStopMusic(fade){if(!kwMusicSrc)return;const s=kwMusicSrc,g=kwMusicGain,t=AC.currentTime;
 try{g.gain.cancelScheduledValues(t);g.gain.setValueAtTime(g.gain.value,t);g.gain.linearRampToValueAtTime(0,t+fade);s.stop(t+fade+.05);}catch(e){}
 kwMusicSrc=null;kwMusicGain=null;kwMusicMode='';}
function kwUpdateMusic(){
 if(!AC||AC.state!=="running")return;
 const mode=(S&&S.started&&S.active&&!S.over)?'kampf':'ruhe';
 if(!meta.music||document.hidden){kwStopMusic(.25);return;}
 if(kwMusicMode===mode&&kwMusicSrc)return;
 const buf=kwBuf[mode==='kampf'?'music_battle':'music_build'];if(!buf)return;
 kwStopMusic(.6);
 try{const s=AC.createBufferSource(),g=AC.createGain(),t=AC.currentTime;s.buffer=buf;s.loop=true;
  g.gain.setValueAtTime(0,t);g.gain.linearRampToValueAtTime(.55,t+.6);s.connect(g);g.connect(musBus);s.start(t);
  kwMusicSrc=s;kwMusicGain=g;kwMusicMode=mode;}catch(e){}
}
document.addEventListener('pointerdown',()=>setTimeout(kwUpdateMusic,0),{passive:true});
document.addEventListener('visibilitychange',()=>{if(!AC)return;if(document.hidden){kwStopMusic(.05);}else{AC.resume&&AC.resume().catch(()=>{});setTimeout(kwUpdateMusic,100);}});
setInterval(kwUpdateMusic,450);

// Kristallwacht V4: eigenständige, sanfte Fantasy-Musik aus WebAudio.
// Kein externes Audio, keine Lizenz-Abhängigkeit; Musik und Effekte separat schaltbar.
let musT=0,musStep=0,musMode="";
const CHORDS=[[57,60,64],[53,57,60],[60,64,67],[55,59,62]];
const mtof=m=>440*Math.pow(2,(m-69)/12);
function mnote(f,t,d,type,vol){
  if(!AC)return;
  const o=AC.createOscillator(),gn=AC.createGain(),filter=AC.createBiquadFilter();
  o.type=type;o.frequency.setValueAtTime(f,t);filter.type="lowpass";filter.frequency.value=type==="sine"?2200:1250;
  gn.gain.setValueAtTime(.0001,t);gn.gain.exponentialRampToValueAtTime(Math.max(.0002,vol),t+.045);
  gn.gain.exponentialRampToValueAtTime(.0001,t+d);
  o.connect(filter);filter.connect(gn);gn.connect(musBus);o.start(t);o.stop(t+d+.03);
}
function kick(t){const o=AC.createOscillator(),gn=AC.createGain();o.type="sine";o.frequency.setValueAtTime(95,t);o.frequency.exponentialRampToValueAtTime(43,t+.16);gn.gain.setValueAtTime(.09,t);gn.gain.exponentialRampToValueAtTime(.0001,t+.2);o.connect(gn);gn.connect(musBus);o.start(t);o.stop(t+.22);}
function hat(t,v){const s=AC.createBufferSource(),f=AC.createBiquadFilter(),gn=AC.createGain();s.buffer=noiseBuf;f.type="highpass";f.frequency.value=6200;gn.gain.setValueAtTime(v,t);gn.gain.exponentialRampToValueAtTime(.0001,t+.045);s.connect(f);f.connect(gn);gn.connect(musBus);s.start(t);s.stop(t+.055);}
const MELODY=[0,2,4,2,1,2,4,5,4,2,1,0,2,1,0,-1];
setInterval(()=>{
  if(true)return; // V7: Musik kommt aus vorproduzierten Dateien
  if(!AC||!meta.music||document.hidden||AC.state!=="running")return;
  const fight=!!(S&&S.started&&S.active&&!S.over),mode=fight?"kampf":"ruhe",beat=60/(fight?108:76)/2;
  if(mode!==musMode){musMode=mode;musT=AC.currentTime+.08;musStep=0;}
  if(musT<AC.currentTime)musT=AC.currentTime+.06;
  try{let limit=0;while(musT<AC.currentTime+.24&&limit++<8){
    const ch=CHORDS[Math.floor(musStep/8)%4],step=musStep%8;
    if(step===0){ch.forEach((m,i)=>mnote(mtof(m-12),musT,beat*7.7,"sine",i===0?.023:.012));mnote(mtof(ch[0]-24),musT,beat*3.2,"sine",.05);}
    if(step===4)mnote(mtof(ch[0]-24),musT,beat*2.6,"sine",.035);
    if(fight){
      if(step%2===0){const note=ch[MELODY[musStep%16]%3]||ch[0];mnote(mtof(note+12),musT,beat*1.65,"triangle",.018);}
      if(step===0||step===4)kick(musT);
      if(step===2||step===6)hat(musT,.014);
    }else if(step===2||step===6){mnote(mtof(ch[step===2?1:2]+12),musT,beat*2.9,"sine",.015);}
    musT+=beat;musStep++;
  }}catch(e){console.warn("Musik konnte nicht abgespielt werden",e);}
},100);
const $=id=>document.getElementById(id);
const cv=$("cv"),g=cv.getContext("2d");
let seed=11;const rnd=()=>{seed=(seed*16807)%2147483647;return seed/2147483647;};
function rr(c,x,y,w,h,r){c.beginPath();c.moveTo(x+r,y);c.arcTo(x+w,y,x+w,y+h,r);c.arcTo(x+w,y+h,x,y+h,r);c.arcTo(x,y+h,x,y,r);c.arcTo(x,y,x+w,y,r);c.closePath();}
function radial(c,x,y,r0,r1,st){const gr=c.createRadialGradient(x,y,r0,x,y,r1);st.forEach(([o,col])=>gr.addColorStop(o,col));return gr;}
function linear(c,x0,y0,x1,y1,st){const gr=c.createLinearGradient(x0,y0,x1,y1);st.forEach(([o,col])=>gr.addColorStop(o,col));return gr;}
function ell(c,x,y,rx,ry){c.beginPath();c.ellipse(x,y,Math.max(.1,rx),Math.max(.1,ry),0,0,TAU);}
function mkCanvas(w,h){const c=document.createElement("canvas");c.width=Math.max(1,Math.ceil(w));c.height=Math.max(1,Math.ceil(h));return c;}
const COIN='<svg class="ic"><use href="#sCoin"/></svg>',GEM='<svg class="ic"><use href="#sGem"/></svg>';
const starsHTML=n=>"★".repeat(n)+'<i>'+"★".repeat(3-n)+'</i>';

// =====================================================================
//  3D-KAMERA: feste Schrägansicht mit Perspektive, dazu Zoom & Verschieben
// =====================================================================
// Neigung passt sich dem Bildschirm an: hoher, schmaler Bildschirm = steilerer Blick = höhere Felder
const CDIST=1500;let CAMX=W/2,PITCH=52*PI/180,cP=Math.cos(PITCH),sP=Math.sin(PITCH),CAMY=H/2+CDIST*cP,CAMZ=CDIST*sP;
function setPitch(deg){PITCH=deg*PI/180;cP=Math.cos(PITCH);sP=Math.sin(PITCH);CAMY=H/2+CDIST*cP;CAMZ=CDIST*sP;}
const WH=T*.42,CLIFF=T*1.1,BIN=2.5; // Mauerhöhe, Dicke der Insel, Abstand freistehender Blöcke
let kwDprCap=2,dpr=1,R=1,RB=1,VS=1,FOC=CDIST,VCX=0,VCY=0,CW=100,CH=100,VZ=1,VX=0,VY=0,VZq=0,BB={x0:0,y0:0,x1:1,y1:1};
let zoomAnim=null,shX=0,shY=0;
// Zwei Blickwinkel: Bau-Ansicht (steil, klares Raster) und Schau-Ansicht (schräg, plastisch)
const PB=80;let PV=56,tiltT=1,tiltTarget=1,tiltAuto=true,tiltMoving=false;
// Welt (x,y am Boden, z nach oben) -> Bildpunkt (ohne Zoom); s = Maßstab an dieser Stelle
let forestWide=false;
function P(x,y,z){
  if(MAP.garden){const s=FOC/CDIST;return{x:VCX+(x-W/2)*s,y:VCY+(y-H/2)*s,s};}
  if(forestWide){const s=FOC/CDIST;return{x:VCX+(y-H/2)*s,y:VCY+((W/2-x)*.83-(z||0)*.52)*s,s};}
const dy=y-CAMY,dz=(z||0)-CAMZ,depth=-dy*cP-dz*sP,up=-dy*sP+dz*cP,k=FOC/depth;return{x:VCX+(x-CAMX)*k,y:VCY-up*k,s:k};}
// Bildpunkt -> Weltpunkt auf der Höhe z
function unproject(vx,vy,z){
  if(MAP.garden){const s=FOC/CDIST;return{x:(vx-VCX)/s+W/2,y:(vy-VCY)/s+H/2};}
  if(forestWide){const s=FOC/CDIST;return{x:W/2-((vy-VCY)/s+(z||0)*.52)/.83,y:H/2+(vx-VCX)/s};}
const a=(vx-VCX)/FOC,b=-(vy-VCY)/FOC,dy=-cP-b*sP,dz=-sP+b*cP,t=((z||0)-CAMZ)/dz;return{x:CAMX+a*t,y:CAMY+dy*t};}
// Höhe eines Punkts in der Turm-Grafik (48er-Einheiten, Fuß bei +13) als Welthöhe
// cP nach unten begrenzt: bei sehr steilem Blick hat Höhe kaum Bildwirkung, aber die Flugbahnen sollen vernünftig bleiben
const hz=()=>Math.max(.45,cP);
const artZ=ay=>WH+(13-ay)*U/hz();
const ez=e=>(e.r*.85+(e.air?10:0))/hz(); // Körpermitte eines Gegners über dem Boden
function toClient(x,y,z){const p=P(x,y,z),rc=cv.getBoundingClientRect();return{x:rc.left+p.x*VZ+VX,y:rc.top+p.y*VZ+VY};}
function fit(){
  const r=$("stage").getBoundingClientRect();
  CW=Math.max(100,Math.floor(r.width));CH=Math.max(100,Math.floor(r.height));dpr=Math.min(kwDprCap,window.devicePixelRatio||1);
  cv.style.width=CW+"px";cv.style.height=CH+"px";cv.width=Math.floor(CW*dpr);cv.height=Math.floor(CH*dpr);
  forestWide=MAP===MAPS[0]&&CW>=CH*1.15;
  let best=null;
  for(let d=44;d<=62;d+=2){setPitch(d);const b=box(),score=b.vs*b.vs*Math.sin(d*PI/180);if(!best||score>best.score*1.0001)best={d,score};}
  PV=best.d;
  setPitch(PB);VSmax=box().vs;setPitch(PV);VSmax=Math.max(VSmax,box().vs); // Auflösung am größeren der beiden Maßstäbe ausrichten
  applyView();setQuality(true);
}
const pad=6;let VSmax=1;
function box(){FOC=CDIST;VCX=0;VCY=0;let x0=1e9,y0=1e9,x1=-1e9,y1=-1e9;
  for(const [x,y,z] of [[0,0,0],[W,0,0],[0,H,0],[W,H,0],[0,H,-CLIFF],[W,H,-CLIFF],[0,0,T*1.7],[W,0,T*1.7]]){const p=P(x,y,z);x0=Math.min(x0,p.x);x1=Math.max(x1,p.x);y0=Math.min(y0,p.y);y1=Math.max(y1,p.y);}
  return{x0,x1,y0,y1,vs:Math.min((CW-pad*2)/(x1-x0),(CH-pad*2)/(y1-y0))};}
// Blickwinkel aus tiltT (0 = Bau-Ansicht, 1 = Schau-Ansicht) anwenden
function applyView(){
  setPitch(MAP.garden?90:PV+(PB-PV)*(1-tiltT));
  const b=box();VS=b.vs;FOC=CDIST*VS;
  if(MAP.garden){VS*=.89;FOC=CDIST*VS;}
  if(forestWide){VS*=.88;FOC=CDIST*VS;}
  VCX=CW/2-(b.x0+b.x1)/2*VS;VCY=CH/2-(b.y0+b.y1)/2*VS;
  BB={x0:VCX+b.x0*VS,x1:VCX+b.x1*VS,y0:VCY+b.y0*VS,y1:VCY+b.y1*VS};
  clampView();
}
function setTilt(v){if(v===tiltTarget)return;tiltTarget=v;if(tiltT!==v){tiltMoving=true;blockCache.clear();}uiDirty=true;}
function stepTilt(dt){
  if(tiltT===tiltTarget){if(tiltMoving){tiltMoving=false;blockCache.clear();}return;}
  const f=Math.min(1,dt*7);tiltT+=(tiltTarget-tiltT)*f;
  if(Math.abs(tiltTarget-tiltT)<.006)tiltT=tiltTarget;
  applyView();
  if(tiltT===tiltTarget){tiltMoving=false;blockCache.clear();}
}
// Automatik: beim Bauen steil von oben, beim Zuschauen schräg
function autoTilt(){
  if(!tiltAuto||!S||!S.started||S.over)return;
  setTilt(S.build&&!S.active&&!S.sel?0:1);
}
// Zwischenspeicher passend zur Zoomstufe neu zeichnen (nur wenn nötig)
function setQuality(force){
  const q=VZ>1.55?2:1;if(!force&&q===VZq)return;VZq=q;
  R=Math.min(4.5,dpr*Math.max(VS,VSmax)*VZq*1.1);RB=Math.min(R,1700/W);
  spriteCache.clear();enemyCache.clear();blockCache.clear();projCache.clear();renderBg();renderVignette();renderGrid();
}
function clampView(){
  if(!(VZ>1.001)){VZ=1;VX=0;VY=0;return;}
  VZ=Math.min(3,VZ);const m=36;
  const fix=(a0,a1,len,v)=>{const b0=a0*VZ+v,b1=a1*VZ+v;if(b1-b0<=len)return(len-(a0+a1)*VZ)/2;if(b0>m)return v-(b0-m);if(b1<len-m)return v+(len-m-b1);return v;};
  VX=fix(BB.x0,BB.x1,CW,VX);VY=fix(BB.y0,BB.y1,CH,VY);
}
function zoomTo(z,vx,vy,cx_,cy_){zoomAnim={z,tx:cx_-vx*z,ty:cy_-vy*z};} // weich zoomen: Bildpunkt (vx,vy) wandert nach (cx_,cy_)
function stepZoom(dt){
  if(!zoomAnim)return;const a=zoomAnim,f=Math.min(1,dt*10);
  VZ+=(a.z-VZ)*f;VX+=(a.tx-VX)*f;VY+=(a.ty-VY)*f;if(Math.abs(a.z-VZ)<.01)VZ=a.z;clampView();
  if(VZ===a.z||(a.z===1&&VZ<=1.001)){zoomAnim=null;setQuality(false);}
}
window.addEventListener("resize",()=>{clearTimeout(fit.t);fit.t=setTimeout(fit,120);});
function resetView(){zoomAnim=null;if(VZ!==1){VZ=1;VX=0;VY=0;setQuality(false);}}
let toastT=0;
function toast(msg){const el=$("toast");el.textContent=msg;el.classList.add("on");clearTimeout(toastT);toastT=setTimeout(()=>el.classList.remove("on"),1500);}

// =====================================================================
//  HINTERGRUND
// =====================================================================
const bg=document.createElement("canvas"),vig=document.createElement("canvas");
function drawTree(b,x,y,s){
  const tr=TH.tr;
  if(!b.noShadow){ell(b,x+6,y+10,15*s,7*s);b.fillStyle="rgba(10,30,10,.35)";b.fill();}
  b.fillStyle="#7a4a24";rr(b,x-3*s,y-2,6*s,12*s,2);b.fill();
  const blobs=[[-7,-5,10],[7,-4,10],[0,-12,12],[0,-3,11]];
  for(const [ox,oy,r] of blobs){b.beginPath();b.arc(x+ox*s,y+oy*s,r*s+1.5,0,TAU);b.fillStyle=tr[3];b.fill();}
  for(const [ox,oy,r] of blobs){b.beginPath();b.arc(x+ox*s,y+oy*s,r*s,0,TAU);b.fillStyle=radial(b,x+ox*s-r*s*.4,y+oy*s-r*s*.5,1,r*s*1.2,[[0,tr[0]],[.45,tr[1]],[1,tr[2]]]);b.fill();}
  for(let i=0;i<8;i++){b.beginPath();b.arc(x+(rnd()-.6)*20*s,y-7*s+(rnd()-.7)*14*s,1.5,0,TAU);b.fillStyle="rgba(255,255,200,.45)";b.fill();}
}
function drawPine(b,x,y,s){
  if(!b.noShadow){ell(b,x+5,y+11,12*s,5*s);b.fillStyle="rgba(10,30,10,.35)";b.fill();}
  b.fillStyle="#5b3a1e";b.fillRect(x-2.5*s,y+4,5*s,7*s);
  const dark=TH===THEMES.dark;
  for(let i=0;i<3;i++){const ty=y-18*s+i*7*s,w=(8+i*3.5)*s;
    b.beginPath();b.moveTo(x,ty-3);b.lineTo(x+w,ty+11*s);b.lineTo(x-w,ty+11*s);b.closePath();
    b.fillStyle=linear(b,x-w,0,x+w,0,dark?[[0,"#4f8a7a"],[.5,"#2f5a50"],[1,"#1a3a34"]]:[[0,"#4f9a4a"],[.5,"#2f7a3a"],[1,"#1c5228"]]);b.fill();b.strokeStyle="rgba(0,0,0,.25)";b.lineWidth=1;b.stroke();}
}
function drawRock(b,x,y,s){
  if(!b.noShadow){ell(b,x+4,y+8,15*s,6*s);b.fillStyle="rgba(10,30,10,.35)";b.fill();}
  b.beginPath();b.moveTo(x-13*s,y+7*s);b.lineTo(x-10*s,y-5*s);b.lineTo(x-2*s,y-10*s);b.lineTo(x+8*s,y-8*s);b.lineTo(x+13*s,y+2*s);b.lineTo(x+9*s,y+8*s);b.closePath();
  b.fillStyle=linear(b,x-10,y-10,x+10,y+10,[[0,"#c8c3b6"],[.5,"#8d877a"],[1,"#56514a"]]);b.fill();b.strokeStyle="#3b3732";b.lineWidth=1.2;b.stroke();
  b.beginPath();b.moveTo(x-10*s,y-5*s);b.lineTo(x-2*s,y-10*s);b.lineTo(x+1*s,y-2*s);b.lineTo(x-7*s,y+1*s);b.closePath();b.fillStyle="rgba(255,255,255,.25)";b.fill();
  ell(b,x-4*s,y-7*s,6*s,2.5*s);b.fillStyle="rgba(110,170,70,.8)";b.fill();
}
function drawBush(b,x,y){
  if(!b.noShadow){ell(b,x+4,y+8,15,6);b.fillStyle="rgba(10,30,10,.3)";b.fill();}
  for(const [ox,oy,r] of [[-7,0,8],[7,1,8],[0,-5,9]]){b.beginPath();b.arc(x+ox,y+oy,r,0,TAU);b.fillStyle=radial(b,x+ox-3,y+oy-4,1,r*1.2,[[0,TH.tr[0]],[1,TH.tr[2]]]);b.fill();}
  for(let i=0;i<5;i++){b.beginPath();b.arc(x+(rnd()-.5)*18,y-3+(rnd()-.5)*10,1.8,0,TAU);b.fillStyle=["#ff6b8b","#ffe066","#fff"][i%3];b.fill();}
}
const GROUND={};for(const [th,n] of Object.entries({"grass": "assets/grass.webp", "stone": "assets/stone.webp", "autumn": "assets/autumn.webp", "dark": "assets/dark.webp", "sand": "assets/sand.webp", "snow": "assets/snow.webp", "lava": "assets/lava.webp"})){const im=new Image();im.onload=()=>{try{if(MAP&&MAP.theme===th)renderBg();}catch(e){}};im.src=n;GROUND[th]=im;}
const forestArt={};
for(const [key,url] of Object.entries({"wall": "assets/wall.webp", "arrow": "assets/arrow.webp", "cannon": "assets/cannon.webp", "portal": "assets/portal-2.webp", "normal": "assets/normal.webp", "armored": "assets/armored.webp", "healer": "assets/healer.webp", "crystal": "assets/crystal.webp"})){
  const im=new Image();forestArt[key]=im;
  im.onload=()=>{if(S?.map===0&&["arrow","cannon","wall"].includes(key))buildShop();};
  im.src=url;
}
const forestPlate=new Image();
forestPlate.src="assets/bild-8.webp";
function forestSprite(key){
  if(key==="wall")return null; // Mauern: neue Moos-Steinmauer (nahtlos verbunden)
  const im=forestArt[key];
  return MAP===MAPS[0]&&im?.complete&&im.naturalWidth?im:null;
}
const forestTiles=["assets/bild-9.webp", "assets/bild-10.webp", "assets/bild-11.webp", "assets/bild-12.webp", "assets/bild-13.webp", "assets/bild-14.webp", "assets/bild-15.webp", "assets/bild-16.webp"].map(url=>{
  const im=new Image();im.onload=()=>{if(MAP===MAPS[0])renderBg();};im.src=url;return im;
});
const forestStone=new Image();
forestStone.src="assets/bild-17.webp";
const forestMoss=new Image();
forestMoss.onload=()=>{if(MAP===MAPS[0])renderBg();};
forestMoss.src="assets/bild-18.webp";
function renderBg(){
  if(!R)return;seed=11+MAPS.indexOf(MAP)*97;const s=RB;bg.width=Math.ceil(W*s);bg.height=Math.ceil(H*s);const b=bg.getContext("2d");b.setTransform(s,0,0,s,0,0);
  // Comic-Wiese: kräftige, flache Farben, große weiche Flecken, wenige dicke Grasbüschel
  const GI_=GROUND[MAP.theme],GOK=GI_&&GI_.complete&&GI_.naturalWidth>0;
  if(GOK){b.drawImage(GI_,0,0,W,H);
    b.strokeStyle="rgba(0,0,0,.07)";b.lineWidth=1;b.beginPath();for(let c=1;c<COLS;c++){b.moveTo(c*T,0);b.lineTo(c*T,H);}for(let r=1;r<ROWS;r++){b.moveTo(0,r*T);b.lineTo(W,r*T);}b.stroke();}
  else{b.fillStyle=linear(b,0,0,W*.3,H,[[0,TH.g0],[1,TH.g1]]);b.fillRect(0,0,W,H);}
  if(!GOK){for(let i=0;i<70;i++){const x=rnd()*W,y=rnd()*H,rx=22+rnd()*46,ry=rx*(.55+rnd()*.3);ell(b,x,y,rx,ry);b.fillStyle=rnd()<.55?TH.lt:TH.dk;b.fill();}
  // feine Körnung, damit der Boden in der Schrägansicht nach Material aussieht
  for(let i=0;i<2600;i++){const x=rnd()*W,y=rnd()*H;b.fillStyle=rnd()<.5?"rgba(255,255,220,.10)":"rgba(20,60,10,.10)";b.fillRect(x,y,1.2+rnd()*1.4,1.2+rnd()*1.4);}
  for(let r=0;r<ROWS;r++)for(let c=0;c<COLS;c++){if((r+c)%2){b.fillStyle="rgba(255,255,255,.04)";b.fillRect(c*T,r*T,T,T);}}
  b.strokeStyle="rgba(20,60,10,.13)";b.lineWidth=1;b.beginPath();
  for(let c=1;c<COLS;c++){b.moveTo(c*T,0);b.lineTo(c*T,H);}for(let r=1;r<ROWS;r++){b.moveTo(0,r*T);b.lineTo(W,r*T);}b.stroke();
  b.lineCap="round";b.lineJoin="round";
  for(let i=0;i<190;i++){const x=rnd()*W,y=rnd()*H,col=TH.bl[(rnd()*TH.bl.length)|0];
    b.strokeStyle=col;b.lineWidth=2;b.beginPath();b.moveTo(x-3,y);b.lineTo(x-4.5,y-5);b.moveTo(x,y);b.lineTo(x,y-7);b.moveTo(x+3,y);b.lineTo(x+4.5,y-5);b.stroke();}
  for(let i=0;i<34;i++){const x=rnd()*W,y=rnd()*H,col=TH.fl[(rnd()*TH.fl.length)|0];
    for(let k=0;k<3;k++){const fx=x+(rnd()-.5)*12,fy=y+(rnd()-.5)*9;b.beginPath();b.arc(fx,fy,2.6,0,TAU);b.fillStyle=OUTLINE;b.fill();
      b.beginPath();b.arc(fx,fy,1.8,0,TAU);b.fillStyle=col;b.fill();b.beginPath();b.arc(fx,fy,.7,0,TAU);b.fillStyle="#ffcc33";b.fill();}}
  if(MAP.theme==="autumn")for(let i=0;i<90;i++){const x=rnd()*W,y=rnd()*H;b.save();b.translate(x,y);b.rotate(rnd()*TAU);ell(b,0,0,3.5,1.9);b.fillStyle=["#ff8a3a","#ffc04a","#e8522a"][(rnd()*3)|0];b.fill();b.restore();}
  }
  if(MAP===MAPS[0]&&forestMoss.naturalWidth){
    for(let r=0;r<ROWS;r++)for(let c=0;c<COLS;c++){
      const x=c*T,y=r*T,n=(c*13+r*19+c*r*3)%forestTiles.length;
      const tile=forestTiles[n].naturalWidth?forestTiles[n]:forestMoss;
      b.drawImage(tile,x,y,T,T);
      b.strokeStyle="#202d1633";b.lineWidth=.65;b.strokeRect(x+.5,y+.5,T-1,T-1);
    }
    b.fillStyle=linear(b,0,0,W,H,[[0,"#142e1460"],[.5,"#203d180c"],[1,"#ffe2a21e"]]);b.fillRect(0,0,W,H);
    if(forestWide){
      b.save();b.globalCompositeOperation="destination-out";
      const edge=T*.44;
      for(const [x,y,w,h,x0,y0,x1,y1] of [[0,0,edge,H,0,0,edge,0],[W-edge,0,edge,H,W,0,W-edge,0],[0,0,W,edge,0,0,0,edge],[0,H-edge,W,edge,0,H,0,H-edge]]){
        b.fillStyle=linear(b,x0,y0,x1,y1,[[0,"#000"],[1,"#0000"]]);b.fillRect(x,y,w,h);
      }
      b.restore();
    }
  }
  drawLava(b);
  drawTiles(b);
  for(const P_ of PORTALS){
    b.fillStyle=radial(b,P_.x,P_.y,2,T*1.1,[[0,"rgba(60,10,90,.5)"],[1,"rgba(60,10,90,0)"]]);b.fillRect(P_.x-T*1.2,P_.y-T*1.2,T*2.4,T*2.4);
  }
  // Sockel des Kristalls
  ell(b,CRY.x+3,CRY.y+4,21,12);b.fillStyle="rgba(0,40,0,.28)";b.fill();
  ell(b,CRY.x,CRY.y,19,17);b.fillStyle="#6a7080";b.fill();
  ell(b,CRY.x,CRY.y-1,17,15);b.fillStyle=linear(b,0,CRY.y-15,0,CRY.y+15,[[0,"#eef0f5"],[1,"#9aa0ae"]]);b.fill();
  b.strokeStyle="rgba(60,200,180,.85)";b.lineWidth=1.8;ell(b,CRY.x,CRY.y-1,11,9.5);b.stroke();
  b.strokeStyle=OUTLINE;b.lineWidth=1.6;ell(b,CRY.x,CRY.y,19,17);b.stroke();
  renderCliff();
}
function drawLava(b){
  const cells=[];for(let i=0;i<COLS*ROWS;i++)if(tile[i]===5)cells.push(i);if(!cells.length)return;
  const L=(c,r)=>c>=0&&c<COLS&&r>=0&&r<ROWS&&tile[idx(c,r)]===5,h=T/2;
  const shape=(i,pad,rad)=>{const c=i%COLS,r=(i/COLS)|0,x=c*T+h,y=r*T+h,l=L(c-1,r),ri=L(c+1,r),u=L(c,r-1),d=L(c,r+1);
    const x0=x+(l?-h-1:-h+4)-pad,x1=x+(ri?h+1:h-4)+pad,y0=y+(u?-h-1:-h+4)-pad,y1=y+(d?h+1:h-4)+pad;
    const tl=(l||u)?0:rad,tr=(ri||u)?0:rad,br=(ri||d)?0:rad,bl=(l||d)?0:rad;
    b.moveTo(x0+tl,y0);b.lineTo(x1-tr,y0);b.arcTo(x1,y0,x1,y0+tr,tr);b.lineTo(x1,y1-br);b.arcTo(x1,y1,x1-br,y1,br);b.lineTo(x0+bl,y1);b.arcTo(x0,y1,x0,y1-bl,bl);b.lineTo(x0,y0+tl);b.arcTo(x0,y0,x0+tl,y0,tl);b.closePath();};
  b.save();b.globalCompositeOperation="lighter";for(const i of cells){const x=(i%COLS)*T+h,y=((i/COLS)|0)*T+h;b.fillStyle=radial(b,x,y,h*.4,T*1.05,[[0,"rgba(255,110,30,.32)"],[1,"rgba(255,60,0,0)"]]);b.fillRect(x-T*1.1,y-T*1.1,T*2.2,T*2.2);}b.restore();
  b.beginPath();for(const i of cells)shape(i,3,11);b.fillStyle="#22100f";b.fill();
  b.beginPath();for(const i of cells)shape(i,0,8);b.fillStyle="#d8461a";b.fill();
  b.save();b.beginPath();for(const i of cells)shape(i,0,8);b.clip();
  for(const i of cells){const x=(i%COLS)*T+h,y=((i/COLS)|0)*T+h;for(let q=0;q<3;q++){const px=x+(rnd()-.5)*T*.7,py=y+(rnd()-.5)*T*.7;b.fillStyle=radial(b,px,py,1,T*.5,[[0,"rgba(255,236,140,.95)"],[.45,"rgba(255,165,45,.7)"],[1,"rgba(255,120,30,0)"]]);b.fillRect(px-T*.55,py-T*.55,T*1.1,T*1.1);}}
  for(const i of cells){const x=(i%COLS)*T+h,y=((i/COLS)|0)*T+h;for(let q=0;q<2;q++){const px=x+(rnd()-.5)*T*.75,py=y+(rnd()-.5)*T*.75,sz=4+rnd()*6,a0=rnd()*TAU;b.beginPath();
    for(let v=0;v<6;v++){const an=a0+v/6*TAU,rd=sz*(.7+rnd()*.5);b.lineTo(px+Math.cos(an)*rd,py+Math.sin(an)*rd*.8);}b.closePath();b.fillStyle="rgba(48,20,22,.92)";b.fill();b.strokeStyle="rgba(255,200,90,.75)";b.lineWidth=1.3;b.stroke();}}
  b.strokeStyle="rgba(255,248,190,.55)";b.lineWidth=1;b.lineCap="round";
  for(const i of cells){const x=(i%COLS)*T+h,y=((i/COLS)|0)*T+h;b.beginPath();let px=x+(rnd()-.5)*T*.5,py=y+(rnd()-.5)*T*.5;b.moveTo(px,py);for(let v=0;v<4;v++){px+=(rnd()-.5)*12;py+=(rnd()-.5)*12;b.lineTo(px,py);}b.stroke();}
  b.restore();
}
// Besondere Felder: Podest (1), Sumpf (2), Kristallader (3), Windrune (4)
function drawTiles(b){
  const snow=MAP.theme==="snow";
  for(let i=0;i<COLS*ROWS;i++){const k=tile[i];if(!k)continue;const x=cx(i),y=cy(i);b.save();b.translate(x,y);
    if(k===1){ // Podest: Steinplatte mit Goldring und Pfeil nach oben
      b.beginPath();for(let a=0;a<8;a++){const an=a/8*TAU+PI/8;b.lineTo(Math.cos(an)*18,Math.sin(an)*18);}b.closePath();
      b.fillStyle=linear(b,-18,-18,18,18,[[0,"#f4efe0"],[1,"#b9b09a"]]);b.fill();b.strokeStyle=OUTLINE;b.lineWidth=1.8;b.stroke();
      b.beginPath();b.arc(0,0,12.5,0,TAU);b.strokeStyle="#f2b830";b.lineWidth=3;b.stroke();b.strokeStyle="#7a4a00";b.lineWidth=.8;b.beginPath();b.arc(0,0,14.2,0,TAU);b.stroke();
      b.strokeStyle="#c98a12";b.lineWidth=2.6;b.lineCap="round";b.lineJoin="round";b.beginPath();b.moveTo(-5,3);b.lineTo(0,-3);b.lineTo(5,3);b.moveTo(-5,8);b.lineTo(0,2);b.lineTo(5,8);b.stroke();}
    else if(k===2){ // Sumpf bzw. Tiefschnee
      for(const [ox,oy,r] of [[-6,-4,12],[7,-2,11],[-2,7,12],[8,8,8],[-9,6,7]]){b.beginPath();b.arc(ox,oy,r+1.4,0,TAU);b.fillStyle=snow?"#7f9cc0":"#2a3a1c";b.fill();}
      for(const [ox,oy,r] of [[-6,-4,12],[7,-2,11],[-2,7,12],[8,8,8],[-9,6,7]]){b.beginPath();b.arc(ox,oy,r,0,TAU);b.fillStyle=snow?"#dfeeff":"#55682e";b.fill();}
      for(const [ox,oy,r] of [[-7,-5,6],[6,-3,5],[0,7,6]]){b.beginPath();b.arc(ox,oy,r,0,TAU);b.fillStyle=snow?"#ffffff":"#6f8438";b.fill();}
      if(!snow)for(const [ox,oy,r] of [[-9,-2,2.4],[3,2,3],[9,6,2],[-3,10,2.2],[6,-8,1.8]]){b.beginPath();b.arc(ox,oy,r,0,TAU);b.fillStyle="#3a4a20";b.fill();b.strokeStyle="rgba(200,230,120,.8)";b.lineWidth=.9;b.stroke();}
      else{b.strokeStyle="#9bb8dc";b.lineWidth=1.4;b.lineCap="round";for(const [ox,oy] of [[-8,-3],[4,1],[-1,9]]){b.beginPath();b.moveTo(ox-3,oy);b.lineTo(ox+3,oy);b.moveTo(ox,oy-3);b.lineTo(ox,oy+3);b.stroke();}}}
    else if(k===3){ // Kristallader
      b.fillStyle=radial(b,0,0,2,20,[[0,"rgba(90,240,220,.55)"],[1,"rgba(90,240,220,0)"]]);b.fillRect(-20,-20,40,40);
      b.strokeStyle="#1b8f86";b.lineWidth=2.2;b.lineCap="round";b.beginPath();b.moveTo(-15,10);b.lineTo(-5,2);b.lineTo(3,6);b.lineTo(14,-8);b.moveTo(-5,2);b.lineTo(-9,-11);b.stroke();
      for(const [ox,oy,s_] of [[-5,1,1.2],[9,-3,1],[-10,-10,.8],[4,9,.8],[-13,9,.7]]){b.save();b.translate(ox,oy);b.scale(s_,s_);
        b.beginPath();b.moveTo(0,-6);b.lineTo(4,0);b.lineTo(0,6);b.lineTo(-4,0);b.closePath();b.fillStyle="#5ee0c8";b.fill();b.strokeStyle="#0f5e57";b.lineWidth=1.2;b.stroke();
        b.beginPath();b.moveTo(0,-6);b.lineTo(0,6);b.lineTo(-4,0);b.closePath();b.fillStyle="rgba(255,255,255,.55)";b.fill();b.restore();}}
    else if(k===6){ // Felsbrocken: nicht bebaubar
      const th=MAP.theme,base=th==="sand"?["#e8c890","#c49a5a","#8a6430"]:th==="snow"?["#e6eef8","#a8b4c8","#6a7690"]:th==="dark"?["#8a86a8","#5e5a7e","#34304e"]:["#c8ccd6","#9298a8","#5a6070"];
      b.fillStyle="rgba(0,0,0,.28)";b.beginPath();b.ellipse(3,6,17,11,0,0,TAU);b.fill();
      const pts=[[-15,2],[-12,-9],[-3,-15],[9,-13],[16,-3],[14,9],[3,14],[-10,11]];
      b.beginPath();pts.forEach(([px,py],j)=>j?b.lineTo(px,py):b.moveTo(px,py));b.closePath();
      b.fillStyle=linear(b,-12,-14,12,14,[[0,base[0]],[.55,base[1]],[1,base[2]]]);b.fill();b.lineWidth=2.4;b.strokeStyle="#1e2230";b.stroke();
      b.beginPath();b.moveTo(-9,-8);b.lineTo(-2,-11);b.lineTo(5,-9);b.strokeStyle="rgba(255,255,255,.55)";b.lineWidth=2;b.lineCap="round";b.stroke();
      b.beginPath();b.moveTo(-2,2);b.lineTo(4,5);b.lineTo(3,10);b.strokeStyle="rgba(20,20,30,.35)";b.lineWidth=1.4;b.stroke();
      if(th==="snow"){b.beginPath();b.moveTo(-12,-8);b.quadraticCurveTo(-3,-17,9,-12);b.quadraticCurveTo(2,-6,-12,-8);b.fillStyle="#fff";b.fill();}
      else if(th!=="sand"){b.fillStyle=th==="autumn"?"#d0782a":"#5aa83a";b.beginPath();b.ellipse(-8,6,5,3,.4,0,TAU);b.ellipse(10,-6,4,2.6,-.5,0,TAU);b.fill();}
    }
    else if(k===5){}
    else{ // Windrune: Gegner werden schneller
      b.fillStyle=radial(b,0,0,2,20,[[0,"rgba(255,90,70,.4)"],[1,"rgba(255,90,70,0)"]]);b.fillRect(-20,-20,40,40);
      b.beginPath();b.arc(0,0,15,0,TAU);b.strokeStyle="rgba(120,20,20,.85)";b.lineWidth=3.4;b.stroke();b.strokeStyle="#ff8a6a";b.lineWidth=1.8;b.stroke();
      b.lineCap="round";b.lineJoin="round";
      for(const lw of [4.2,2.2]){b.strokeStyle=lw>3?"rgba(120,20,20,.9)":"#fff0d8";b.lineWidth=lw;b.beginPath();for(const ox of [-7,0,7]){b.moveTo(ox-3,-6);b.lineTo(ox+3,0);b.lineTo(ox-3,6);}b.stroke();}}
    b.restore();}
}
// Vorderkante der schwebenden Insel (Erde, Steine, Wurzeln)
const cliffCv=document.createElement("canvas");
function renderCliff(){
  const s=RB;cliffCv.width=Math.ceil(W*s);cliffCv.height=Math.ceil(CLIFF*s);const c=cliffCv.getContext("2d");c.setTransform(s,0,0,s,0,0);seed=777;
  const dark=MAP.theme==="dark";
  c.fillStyle=linear(c,0,0,0,CLIFF,dark?[[0,"#5a4a5a"],[1,"#2a2030"]]:[[0,"#9a6a3c"],[.5,"#74482a"],[1,"#432614"]]);c.fillRect(0,0,W,CLIFF);
  for(let i=0;i<70;i++){const x=rnd()*W,y=9+rnd()*(CLIFF-12),rx=5+rnd()*13,ry=3+rnd()*5;ell(c,x,y,rx,ry);
    c.fillStyle=linear(c,0,y-ry,0,y+ry,[[0,"#c7b69c"],[1,"#6e5f4e"]]);c.fill();c.strokeStyle="rgba(30,15,5,.65)";c.lineWidth=1;c.stroke();
    ell(c,x-rx*.25,y-ry*.4,rx*.45,ry*.3);c.fillStyle="rgba(255,255,255,.22)";c.fill();}
  c.strokeStyle="rgba(50,28,10,.75)";c.lineWidth=1.3;c.lineCap="round";
  for(let i=0;i<16;i++){let x=rnd()*W,y=5;c.beginPath();c.moveTo(x,y);for(let k=0;k<4;k++){x+=(rnd()-.5)*8;y+=3+rnd()*5;c.lineTo(x,y);}c.stroke();}
  c.fillStyle=TH.g1;c.beginPath();c.moveTo(0,0);for(let x=0;x<=W;x+=5)c.lineTo(x,4+rnd()*4.5);c.lineTo(W,0);c.closePath();c.fill();
  c.fillStyle="rgba(255,255,255,.18)";c.fillRect(0,0,W,1.4);
  c.fillStyle=linear(c,0,0,W,0,[[0,"rgba(0,0,0,.35)"],[.08,"rgba(0,0,0,0)"],[.92,"rgba(0,0,0,0)"],[1,"rgba(0,0,0,.35)"]]);c.fillRect(0,0,W,CLIFF);
  c.fillStyle=linear(c,0,CLIFF*.6,0,CLIFF,[[0,"rgba(0,0,0,0)"],[1,"rgba(0,0,0,.35)"]]);c.fillRect(0,CLIFF*.6,W,CLIFF*.4);
}
// Abdunklung der Bildecken (im Bildschirm-Raum)
function renderVignette(){
  vig.width=Math.ceil(CW*dpr/2);vig.height=Math.ceil(CH*dpr/2);const v=vig.getContext("2d");v.setTransform(dpr/2,0,0,dpr/2,0,0);
  // (bewusst leer: die Insel schwebt frei vor dem Himmel, ohne sichtbaren Bildrand)
}

// ---------- Stein-Texturen für Mauern und Turmsockel ----------
const TXS=4; // Texturpixel pro Welteinheit
function makeStoneTop(sd,ped){
  const c=mkCanvas(T*TXS,T*TXS),x=c.getContext("2d"),w=c.width,h=c.height;seed=sd;
  x.fillStyle=ped?"#4b5060":"#6f675b";x.fillRect(0,0,w,h);
  const sp=.42+rnd()*.16,sp2=.42+rnd()*.16;
  const cells=ped?[[0,0,1,1]]:[[0,0,sp,.5],[sp,0,1-sp,.5],[0,.5,sp2,.5],[sp2,.5,1-sp2,.5]];
  for(const [u,v,cw,ch] of cells){const px=u*w+4,py=v*h+4,pw=cw*w-8,ph=ch*h-8;
    rr(x,px,py,pw,ph,ped?22:12);
    x.fillStyle=ped?linear(x,px,py,px+pw,py+ph,[[0,"#d9dee8"],[.5,"#a3aab8"],[1,"#79808f"]]):linear(x,px,py,px+pw,py+ph,[[0,"#ece5d4"],[.5,"#c1b8a5"],[1,"#958c7a"]]);x.fill();
    for(let i=0;i<55;i++){x.fillStyle=rnd()<.5?"rgba(255,255,255,.14)":"rgba(60,50,40,.14)";x.beginPath();x.arc(px+rnd()*pw,py+rnd()*ph,1+rnd()*2.6,0,TAU);x.fill();}
    x.strokeStyle="rgba(255,255,255,.4)";x.lineWidth=2.5;rr(x,px+2,py+2,pw-4,ph-4,ped?20:10);x.stroke();
    if(!ped&&rnd()<.5){x.strokeStyle="rgba(70,60,48,.5)";x.lineWidth=1.6;x.beginPath();let qx=px+pw*rnd(),qy=py+4;x.moveTo(qx,qy);for(let k=0;k<3;k++){qx+=(rnd()-.5)*18;qy+=ph*.25;x.lineTo(qx,qy);}x.stroke();}
  }
  if(ped){x.strokeStyle="rgba(40,44,58,.55)";x.lineWidth=3;ell(x,w/2,h/2,w*.33,h*.33);x.stroke();x.strokeStyle="rgba(255,255,255,.25)";x.lineWidth=1.5;ell(x,w/2,h/2-2,w*.33,h*.33);x.stroke();}
  else for(let i=0;i<2;i++){if(rnd()<.7){const mx=rnd()*w,my=rnd()*h;for(let k=0;k<6;k++){x.beginPath();x.arc(mx+(rnd()-.5)*22,my+(rnd()-.5)*12,3+rnd()*5,0,TAU);x.fillStyle=k%2?"rgba(110,175,70,.75)":"rgba(80,145,50,.75)";x.fill();}}}
  return c;
}
function makeStoneSide(sd,ped){
  const w=T*TXS,h=Math.ceil(WH*TXS),c=mkCanvas(w,h),x=c.getContext("2d");seed=sd;
  x.fillStyle=ped?"#2f333f":"#4a443c";x.fillRect(0,0,w,h);
  const rows=3,rh=h/rows;
  for(let r=0;r<rows;r++){let bx=-(r%2?w*.22:0)-rnd()*12;
    while(bx<w){const bw=w*(.32+rnd()*.2),px=bx+3,py=r*rh+3,pw=bw-6,ph=rh-6;
      rr(x,px,py,pw,ph,7);
      x.fillStyle=ped?linear(x,0,py,0,py+ph,[[0,"#b8bfcc"],[.6,"#8a91a0"],[1,"#636a79"]]):linear(x,0,py,0,py+ph,[[0,"#d2c8b4"],[.6,"#a59a86"],[1,"#7d7362"]]);x.fill();
      for(let i=0;i<14;i++){x.fillStyle=rnd()<.5?"rgba(255,255,255,.13)":"rgba(50,40,30,.15)";x.beginPath();x.arc(px+rnd()*pw,py+rnd()*ph,1+rnd()*2,0,TAU);x.fill();}
      x.fillStyle="rgba(255,255,255,.35)";x.fillRect(px+4,py+1.5,pw-8,2.2);
      bx+=bw;}}
  if(!ped)for(let i=0;i<9;i++){const mx=rnd()*w;x.beginPath();x.arc(mx,h-rnd()*6,4+rnd()*7,0,TAU);x.fillStyle=i%2?"rgba(95,160,60,.8)":"rgba(70,130,45,.8)";x.fill();}
  return c;
}
let TOP_TEX=[],SIDE_TEX=[],PED_TOP=null,PED_SIDE=null;
function makeTextures(){TOP_TEX=[0,1,2].map(i=>makeStoneTop(301+i*57));SIDE_TEX=[0,1,2].map(i=>makeStoneSide(901+i*31));PED_TOP=makeStoneTop(55,true);PED_SIDE=makeStoneSide(77,true);}

// ---------- Blöcke (Mauern und Turmsockel) als echte Quader ----------
const blockCache=new Map();
const isBlock=(c,r)=>{if(c<0||c>=COLS||r<0||r>=ROWS)return false;const o=occ[idx(c,r)];return !!o&&o.type!=="plan"&&!o.open;};
const isBlockP=(c,r)=>{if(c<0||c>=COLS||r<0||r>=ROWS)return false;const o=occ[idx(c,r)];return !!o&&!o.open;};
function nbMask(c,r,f){f=f||isBlock;return (f(c-1,r)?1:0)|(f(c+1,r)?2:0)|(f(c,r-1)?4:0)|(f(c,r+1)?8:0);}
// sichtbare Flächen eines Quaders: pts = [Ursprung, Ende u, Ende v, Gegenecke]
function blockFaces(c,r,mask,hgt){
  const h=hgt||WH,x0=c*T+(mask&1?0:BIN),x1=(c+1)*T-(mask&2?0:BIN),y0=r*T+(mask&4?0:BIN),y1=(r+1)*T-(mask&8?0:BIN),f=[];
  if(!(mask&1)&&CAMX<x0)f.push({k:"L",pts:[P(x0,y0,h),P(x0,y1,h),P(x0,y0,0),P(x0,y1,0)]});
  if(!(mask&2)&&CAMX>x1)f.push({k:"R",pts:[P(x1,y1,h),P(x1,y0,h),P(x1,y1,0),P(x1,y0,0)]});
  if(!(mask&8))f.push({k:"F",pts:[P(x0,y1,h),P(x1,y1,h),P(x0,y1,0),P(x1,y1,0)]});
  f.push({k:"T",pts:[P(x0,y0,h),P(x1,y0,h),P(x0,y1,h),P(x1,y1,h)]});
  return f;
}
function facePath(c,f){const [a,b,d,e]=f.pts;c.beginPath();c.moveTo(a.x,a.y);c.lineTo(b.x,b.y);c.lineTo(e.x,e.y);c.lineTo(d.x,d.y);c.closePath();}
const lerpP=(a,b,f)=>({x:a.x+(b.x-a.x)*f,y:a.y+(b.y-a.y)*f});
function bandPath(c,f,v0,v1){const [a,b,d,e]=f.pts,p0=lerpP(a,d,v0),p1=lerpP(b,e,v0),p2=lerpP(b,e,v1),p3=lerpP(a,d,v1);c.beginPath();c.moveTo(p0.x,p0.y);c.lineTo(p1.x,p1.y);c.lineTo(p2.x,p2.y);c.lineTo(p3.x,p3.y);c.closePath();}
function texFace(c,f,img){ // Textur auf eine (fast) parallele Fläche legen
  const [a,b,d]=f.pts;facePath(c,f);c.save();c.clip();
  c.transform((b.x-a.x)/img.width,(b.y-a.y)/img.width,(d.x-a.x)/img.height,(d.y-a.y)/img.height,a.x,a.y);c.drawImage(img,0,0);c.restore();
}

// ---------- MOOS-STEINMAUER (Bild) – je Welt umgefärbt, nahtlos verbunden ----------
const MWALL=new Image();
MWALL.onload=()=>{MW.key="";blockCache.clear();try{buildShop();}catch(e){}};
MWALL.src="assets/bild-19.webp";
// Umfärbung je Welt: st = Faktoren für Stein, mo = Moos [dunkel, hell], gl = Glut auf hellen Moosstellen
const MWT={
  grass:null,stone:null,
  autumn:{st:[1.05,.98,.9],mo:["#4a1e08","#ffb347"]},
  dark:{st:[.62,.72,.82],mo:["#0b3236","#56d6b4"]},
  sand:{st:[1.18,1.04,.82],mo:["#5e5a22","#e2d88a"]},
  snow:{st:[.86,.94,1.08],mo:["#8eaacb","#ffffff"]},
  lava:{st:[.62,.5,.56],mo:["#1e1014","#5a3434"],gl:"#ff8a2a"}
};
let MW={key:"",img:null,top:null};
const hx=c=>[parseInt(c.slice(1,3),16),parseInt(c.slice(3,5),16),parseInt(c.slice(5,7),16)];
function mwPrep(){
  const th=MAP.theme;if(MW.key===th)return MW;if(!(MWALL.complete&&MWALL.naturalWidth))return null;
  const w=MWALL.naturalWidth,h=MWALL.naturalHeight,cv=mkCanvas(w,h),x=cv.getContext("2d");x.drawImage(MWALL,0,0);
  const m=MWT[th];
  if(m){const d=x.getImageData(0,0,w,h),p=d.data,lo=hx(m.mo[0]),hi=hx(m.mo[1]),gl=m.gl?hx(m.gl):null;
    for(let i=0;i<p.length;i+=4){const r=p[i],g=p[i+1],b=p[i+2],L=(.3*r+.59*g+.11*b)/255;
      const mo=Math.min(1,Math.max(0,(g-(r+b)/2-8)/30)),t=Math.min(1,L*1.15);
      let R=r*m.st[0],G=g*m.st[1],B=b*m.st[2];
      const mr=lo[0]+(hi[0]-lo[0])*t,mg=lo[1]+(hi[1]-lo[1])*t,mb=lo[2]+(hi[2]-lo[2])*t;
      R+=(mr-R)*mo;G+=(mg-G)*mo;B+=(mb-B)*mo;
      if(gl&&mo>.3&&L>.55){const k=Math.min(1,(L-.55)/.3)*mo;R+=(gl[0]-R)*k;G+=(gl[1]-G)*k;B+=(gl[2]-B)*k;}
      p[i]=R;p[i+1]=G;p[i+2]=B;}
    x.putImageData(d,0,0);}
  MW={key:th,img:cv};return MW;
}
function texSub(c,f,img,sx,sy,sw,sh,A,B,D){facePath(c,f);c.save();c.clip();
  c.transform((B.x-A.x)/sw,(B.y-A.y)/sw,(D.x-A.x)/sh,(D.y-A.y)/sh,A.x,A.y);c.drawImage(img,sx,sy,sw,sh,0,0,sw,sh);c.restore();}
// Frontbild über 2 Felder, jedes zweite Paar gespiegelt -> keine Kanten zwischen den Feldern
function mwSide(c,f,img,n,P0,P1,PD0,PD1){
  const w=img.width,h=img.height,x0=w*.03,cw=(w*.94)/2,sy=h*.1,sh=h*.9,mir=((n>>1)&1)===1,half=mir?1-(n&1):(n&1);
  const sx=x0+half*cw;
  if(!mir)texSub(c,f,img,sx,sy,cw,sh,P0,P1,PD0);else texSub(c,f,img,sx,sy,cw,sh,P1,P0,PD1);
}
function paintMossWall(c,t,faces,mask){
  const mw=mwPrep();if(!mw)return false;
  const cc=t.c,r=t.r,h=WH,X0=cc*T,X1=(cc+1)*T,Y0=r*T,Y1=(r+1)*T,fw=has("frostwall"),dn=has("dornen")||t.wk==="thorn";
  c.lineJoin="round";c.lineCap="round";const top=faces[faces.length-1];
  for(const f of faces){
    facePath(c,f);c.fillStyle=f.k==="T"?"#5a6a2c":"#6a6458";c.fill();
    if(f.k==="T"){ // Mauerkrone: Steinreihen laufen entlang der Mauer, alle 4 Felder gespiegelt
      const im=mw.img,vert=(mask&12)&&!(mask&3),n=vert?r:cc,cw=im.width*.94/4,mir=((n>>2)&1)===1,qu=mir?3-(n&3):(n&3),sx=im.width*.03+qu*cw,sy=im.height*.3,sh=im.height*.7;
      if(!vert){if(!mir)texSub(c,f,im,sx,sy,cw,sh,P(X0,Y0,h),P(X1,Y0,h),P(X0,Y1,h));else texSub(c,f,im,sx,sy,cw,sh,P(X1,Y0,h),P(X0,Y0,h),P(X1,Y1,h));}
      else{if(!mir)texSub(c,f,im,sx,sy,cw,sh,P(X1,Y0,h),P(X1,Y1,h),P(X0,Y0,h));else texSub(c,f,im,sx,sy,cw,sh,P(X1,Y1,h),P(X1,Y0,h),P(X0,Y1,h));}
      facePath(c,f);c.fillStyle="rgba(255,250,230,.08)";c.fill();}
    else if(f.k==="F"){const y=Y1-(mask&8?0:BIN);mwSide(c,f,mw.img,cc,P(X0,y,h),P(X1,y,h),P(X0,y,0),P(X1,y,0));}
    else if(f.k==="L"){const x=X0+(mask&1?0:BIN);mwSide(c,f,mw.img,r,P(x,Y0,h),P(x,Y1,h),P(x,Y0,0),P(x,Y1,0));}
    else {const x=X1-(mask&2?0:BIN);mwSide(c,f,mw.img,r,P(x,Y1,h),P(x,Y0,h),P(x,Y1,0),P(x,Y0,0));}
    if(f.k==="F"){const [a,,d]=f.pts;facePath(c,f);c.fillStyle=linear(c,0,a.y,0,d.y,[[0,"rgba(0,0,0,0)"],[1,"rgba(12,6,24,.3)"]]);c.fill();}
    if(f.k==="R"){facePath(c,f);c.fillStyle="rgba(10,6,30,.3)";c.fill();}
    if(f.k==="L"){facePath(c,f);c.fillStyle="rgba(10,6,30,.12)";c.fill();}
    if(fw){facePath(c,f);c.fillStyle="rgba(205,240,255,.35)";c.fill();}
  }
  // Umriss nur an den Außenkanten (keine Fugenlinien zwischen verbundenen Feldern)
  c.strokeStyle="rgba(22,16,31,.9)";c.lineWidth=1.3;
  const seg=(p,q)=>{c.beginPath();c.moveTo(p.x,p.y);c.lineTo(q.x,q.y);c.stroke();};
  {const [a,b,d,e]=top.pts;if(!(mask&4))seg(a,b);if(!(mask&1))seg(a,d);if(!(mask&2))seg(b,e);if(!(mask&8))seg(d,e);}
  for(const f of faces){if(f.k==="T")continue;const [a,b,d,e]=f.pts;seg(d,e);
    if(f.k==="F"){if(!(mask&1))seg(a,d);if(!(mask&2))seg(b,e);}
    else if(f.k==="L"){if(!(mask&4))seg(a,d);}else if(!(mask&4))seg(b,e);}
  if(fw){const [,,d,e]=top.pts;c.fillStyle="rgba(225,248,255,.92)";for(let k=0;k<5;k++){const p=lerpP(d,e,(k+.5)/5),L=3+((k*37+t.i)%4);c.beginPath();c.moveTo(p.x-1.6,p.y);c.lineTo(p.x+1.6,p.y);c.lineTo(p.x,p.y+L);c.closePath();c.fill();}}
  if(dn){const [,,d,e]=top.pts;c.fillStyle="#6a4422";c.strokeStyle="#2a170a";c.lineWidth=.7;
    for(let k=0;k<5;k++){const p=lerpP(d,e,(k+.5)/5);c.beginPath();c.moveTo(p.x-2,p.y-1);c.lineTo(p.x,p.y-7.5);c.lineTo(p.x+2,p.y-1);c.closePath();c.fill();c.stroke();}}
  if(t.wk==="thorn"){const [a,b,d,e]=top.pts;c.fillStyle="#c9d48a";c.strokeStyle="#2a170a";c.lineWidth=.8;
    for(let k=0;k<6;k++){const p=lerpP(lerpP(a,d,.3),lerpP(b,e,.3),(k+.5)/6);c.beginPath();c.moveTo(p.x-2.2,p.y);c.lineTo(p.x+(k%2?1.5:-1.5),p.y-9);c.lineTo(p.x+2.2,p.y);c.closePath();c.fill();c.stroke();}}
  if(t.wk==="crystal"){const [a,b,d,e]=top.pts,m=lerpP(lerpP(a,d,.5),lerpP(b,e,.5),.5);
    facePath(c,top);c.fillStyle="rgba(110,240,255,.28)";c.fill();
    for(const [ox,oy,s_] of [[0,0,1.25],[-6,1.5,.8],[6,1.8,.75]]){c.save();c.translate(m.x+ox,m.y+oy);c.scale(s_,s_);
      c.beginPath();c.moveTo(0,-13);c.lineTo(4.5,-4);c.lineTo(0,2);c.lineTo(-4.5,-4);c.closePath();c.fillStyle="#7af2ff";c.fill();c.strokeStyle="#0f4e66";c.lineWidth=1.3;c.stroke();
      c.beginPath();c.moveTo(0,-13);c.lineTo(0,2);c.lineTo(-4.5,-4);c.closePath();c.fillStyle="rgba(255,255,255,.55)";c.fill();c.restore();}}
  if(t.wk==="gate"){ // geschlossenes Holztor mit Eisenbändern
    for(const f of faces){if(f.k==="T")continue;facePath(c,f);c.fillStyle="rgba(150,92,40,.86)";c.fill();
      for(const v of [.22,.5,.78]){const [a,b,d,e]=f.pts,p0=lerpP(a,b,v),p1=lerpP(d,e,v);c.strokeStyle="rgba(60,30,10,.85)";c.lineWidth=1;c.beginPath();c.moveTo(p0.x,p0.y);c.lineTo(p1.x,p1.y);c.stroke();}
      bandPath(c,f,.2,.32);c.fillStyle="#4a4f5c";c.fill();bandPath(c,f,.68,.8);c.fillStyle="#4a4f5c";c.fill();}
    facePath(c,top);c.fillStyle="rgba(170,110,50,.9)";c.fill();c.strokeStyle="rgba(22,16,31,.9)";c.lineWidth=1.2;c.stroke();
    const [a,b,d,e]=top.pts,m=lerpP(lerpP(a,d,.5),lerpP(b,e,.5),.5);c.beginPath();c.arc(m.x,m.y,3.2,0,TAU);c.fillStyle="#ffd25e";c.fill();c.strokeStyle=OUTLINE;c.lineWidth=1;c.stroke();}
  return true;
}
const SHADE={L:"rgba(255,246,225,.07)",R:"rgba(18,10,40,.34)",T:null};
function paintBlock(c,t,faces){
  if(t.type==="wall"&&paintMossWall(c,t,faces,nbMask(t.c,t.r)))return;
  const tw=t.type!=="wall",fw=!tw&&has("frostwall"),dn=!tw&&has("dornen"),v=(t.i*7919)%3;
  c.lineJoin="round";
  for(const f of faces){
    const img=f.k==="T"?(tw?PED_TOP:TOP_TEX[v]):(tw?PED_SIDE:SIDE_TEX[v]);
    facePath(c,f);c.fillStyle="#6f675b";c.fill();texFace(c,f,img);
    if(f.k==="F"){const [a,,d]=f.pts;facePath(c,f);c.fillStyle=linear(c,0,a.y,0,d.y,[[0,"rgba(0,0,0,.04)"],[1,"rgba(12,6,24,.38)"]]);c.fill();}
    else if(SHADE[f.k]){facePath(c,f);c.fillStyle=SHADE[f.k];c.fill();}
    if(tw&&f.k!=="T"){const col=t.level>=7?"#ffd25e":t.level>=4?(t.branch?"#ff7ac8":"#6fd3ff"):TD[t.type].color;
      bandPath(c,f,.1,.3);c.fillStyle=col;c.fill();c.strokeStyle="rgba(22,16,31,.7)";c.lineWidth=.8;c.stroke();}
    if(fw){if(f.k==="T"){facePath(c,f);c.fillStyle="rgba(205,240,255,.45)";c.fill();}
      else{const [a,b]=f.pts;c.fillStyle="rgba(225,248,255,.92)";for(let k=0;k<5;k++){const p=lerpP(a,b,(k+.5)/5),L=3+((k*37+t.i)%4);c.beginPath();c.moveTo(p.x-1.6,p.y);c.lineTo(p.x+1.6,p.y);c.lineTo(p.x,p.y+L);c.closePath();c.fill();}}}
    facePath(c,f);c.strokeStyle="rgba(22,16,31,.85)";c.lineWidth=1.15;c.stroke();
  }
  const top=faces[faces.length-1];
  if(tw&&(tile[t.i]===1||tile[t.i]===3)){bandPath(c,top,.06,.94);c.strokeStyle=OUTLINE;c.lineWidth=3.4;c.stroke();c.strokeStyle=tile[t.i]===1?"#ffcf3a":"#5ee0c8";c.lineWidth=1.9;c.stroke();}
  if(dn){const [,,d,e]=top.pts;c.fillStyle="#6a4422";c.strokeStyle="#2a170a";c.lineWidth=.7;
    for(let k=0;k<5;k++){const p=lerpP(d,e,(k+.5)/5);c.beginPath();c.moveTo(p.x-2,p.y-1);c.lineTo(p.x,p.y-7.5);c.lineTo(p.x+2,p.y-1);c.closePath();c.fill();c.stroke();}}
}
// Während die Kamera kippt, ändert sich die Projektion in jedem Bild – dann ohne Zwischenspeicher malen
function drawBlockNow(t){paintBlock(g,t,blockFaces(t.c,t.r,t.type==="wall"?nbMask(t.c,t.r):0,t.type==="wall"?WH:5));}
function blockSprite(t){
  const mask=t.type==="wall"?nbMask(t.c,t.r):0,tw=t.type!=="wall",dn=t.type==="wall"&&(has("dornen")||t.wk==="thorn");
  const key=t.i+"|"+mask+"|"+(tw?t.type+t.level+"_"+t.branch:"w"+MAP.theme+(MW.key?1:0)+(t.wk||""))+"|"+(has("frostwall")?1:0)+(dn?1:0)+tile[t.i];
  let s=blockCache.get(key);if(s)return s;
  if(blockCache.size>700)blockCache.clear();
  const faces=blockFaces(t.c,t.r,mask,tw?5:WH);
  let x0=1e9,y0=1e9,x1=-1e9,y1=-1e9;for(const f of faces)for(const p of f.pts){x0=Math.min(x0,p.x);x1=Math.max(x1,p.x);y0=Math.min(y0,p.y);y1=Math.max(y1,p.y);}
  x0-=3;x1+=3;y0-=dn||t.wk==="crystal"?16:3;y1+=3;
  const q=Math.min(4,dpr*Math.max(1,VZq)),cvs=mkCanvas((x1-x0)*q,(y1-y0)*q),c=cvs.getContext("2d");
  c.setTransform(q,0,0,q,-x0*q,-y0*q);
  paintBlock(c,t,faces);
  s={cv:cvs,x:x0,y:y0,w:x1-x0,h:y1-y0};blockCache.set(key,s);return s;
}

// halbdurchsichtige Vorschau-Mauer (beim Ziehen mit dem Finger)
function drawGhostBlock(i,ok,alpha){
  const c=i%COLS,r=(i/COLS)|0,faces=blockFaces(c,r,nbMask(c,r,isBlockP));
  g.globalAlpha=alpha;g.lineJoin="round";
  for(const f of faces){facePath(g,f);g.fillStyle=f.k==="T"?(ok?"#f3e8be":"#ffc0c5"):f.k==="F"?(ok?"#d6c493":"#e0606c"):(ok?"#bfab79":"#c84a56");g.fill();
    g.strokeStyle="rgba(22,16,31,.85)";g.lineWidth=1.2;g.stroke();}
  // jedes geplante Feld einzeln umranden – sonst verschmilzt die Reihe zu einem Balken
  cellPath(c,r,WH,BIN+1);g.strokeStyle="rgba(22,16,31,.45)";g.lineWidth=1.1;g.stroke();
  cellPath(c,r,WH,BIN+2.4);g.strokeStyle=ok?"rgba(255,255,255,.9)":"rgba(255,225,225,.9)";g.lineWidth=1.6;g.stroke();
  g.globalAlpha=1;
}

// =====================================================================
//  TURM-GRAFIK (48er-Einheiten)
// =====================================================================
function drawWall(c){ // Shop-Symbol: Ausschnitt der Moos-Steinmauer in den Farben der Welt
  const mw=mwPrep();
  if(mw){const im=mw.img,sw=im.width*.55,sh=im.height,w=50,h=w*sh/sw;
    if(!c.noShadow){ell(c,0,10,26,6);c.fillStyle="rgba(0,20,0,.35)";c.fill();}
    c.drawImage(im,0,0,sw,sh,-w/2,10-h,w,h);return;}
  drawWallOld(c);
}
function drawWallOld(c){
  if(!c.noShadow){ell(c,3,17,23,8);c.fillStyle="rgba(0,20,0,.35)";c.fill();}
  rr(c,-22,-6,44,23,6);c.fillStyle=linear(c,0,-6,0,17,[[0,"#7a7264"],[1,"#45403a"]]);c.fill();
  c.strokeStyle="rgba(0,0,0,.3)";c.lineWidth=1;for(const x of [-12,2,15]){c.beginPath();c.moveTo(x,9);c.lineTo(x,17);c.stroke();}
  rr(c,-22,-22,44,31,6);c.fillStyle=linear(c,-12,-22,12,9,[[0,"#ddd5c3"],[.55,"#aaa18f"],[1,"#8d8473"]]);c.fill();
  c.strokeStyle="rgba(70,62,50,.45)";c.lineWidth=1;
  c.beginPath();c.moveTo(-22,-12);c.lineTo(22,-12);c.moveTo(-22,-2);c.lineTo(22,-2);
  c.moveTo(-6,-22);c.lineTo(-6,-12);c.moveTo(11,-22);c.lineTo(11,-12);c.moveTo(3,-12);c.lineTo(3,-2);c.moveTo(-14,-12);c.lineTo(-14,-2);c.moveTo(-5,-2);c.lineTo(-5,9);c.moveTo(13,-2);c.lineTo(13,9);c.stroke();
  c.strokeStyle="rgba(255,255,255,.45)";rr(c,-21.5,-21.5,43,30,5.5);c.stroke();
  ell(c,-11,-19,8,2.6);c.fillStyle="rgba(110,175,70,.75)";c.fill();ell(c,14,6,5,2);c.fill();
}
const TOPY=-16; // Höhe der Turmplattform (48er-Einheiten)
function merlon(c,a){const x=Math.cos(a)*17.5,y=TOPY+Math.sin(a)*6.8;rr(c,x-2.7,y-5.5,5.4,6,1.2);
  c.fillStyle=linear(c,0,y-5.5,0,y+.5,[[0,"#e0e4ec"],[1,"#8a91a2"]]);c.fill();c.strokeStyle="rgba(30,32,42,.55)";c.lineWidth=.7;c.stroke();}
function wallConn(c,dir){ // verbindet Mauer mit rechter (0) bzw. unterer (1) Nachbarmauer
  c.strokeStyle="rgba(70,62,50,.45)";c.lineWidth=1;
  if(dir===0){
    c.fillStyle=linear(c,0,-6,0,17,[[0,"#7a7264"],[1,"#45403a"]]);c.fillRect(8,-6,32,23);
    c.fillStyle=linear(c,0,-22,0,9,[[0,"#d4ccba"],[1,"#958c7b"]]);c.fillRect(8,-22,32,31);
    c.beginPath();c.moveTo(8,-12);c.lineTo(40,-12);c.moveTo(8,-2);c.lineTo(40,-2);c.moveTo(24,-22);c.lineTo(24,-12);c.moveTo(16,-12);c.lineTo(16,-2);c.moveTo(32,-12);c.lineTo(32,-2);c.moveTo(24,-2);c.lineTo(24,9);c.stroke();
    c.strokeStyle="rgba(0,0,0,.3)";c.beginPath();c.moveTo(20,9);c.lineTo(20,17);c.moveTo(32,9);c.lineTo(32,17);c.stroke();
    c.strokeStyle="rgba(255,255,255,.4)";c.beginPath();c.moveTo(8,-21.5);c.lineTo(40,-21.5);c.stroke();
    c.strokeStyle=OUTLINE;c.lineWidth=2.8;c.beginPath();c.moveTo(6,-23.2);c.lineTo(42,-23.2);c.moveTo(6,18.2);c.lineTo(42,18.2);c.stroke();
  }else{
    c.fillStyle=linear(c,-22,0,22,0,[[0,"#c4bba9"],[.45,"#d4ccba"],[1,"#9e9583"]]);c.fillRect(-22,0,44,30);
    c.beginPath();c.moveTo(-22,10);c.lineTo(22,10);c.moveTo(-22,20);c.lineTo(22,20);c.moveTo(-4,0);c.lineTo(-4,10);c.moveTo(12,0);c.lineTo(12,10);c.moveTo(4,10);c.lineTo(4,20);c.moveTo(-13,10);c.lineTo(-13,20);c.moveTo(-6,20);c.lineTo(-6,30);c.moveTo(13,20);c.lineTo(13,30);c.stroke();
    c.strokeStyle="rgba(255,255,255,.4)";c.beginPath();c.moveTo(-21.5,0);c.lineTo(-21.5,30);c.stroke();
    c.strokeStyle="rgba(0,0,0,.25)";c.beginPath();c.moveTo(21.5,0);c.lineTo(21.5,30);c.stroke();
    ell(c,-8,14,5,1.8);c.fillStyle="rgba(110,175,70,.6)";c.fill();
    c.strokeStyle=OUTLINE;c.lineWidth=2.8;c.beginPath();c.moveTo(-23.2,-2);c.lineTo(-23.2,32);c.moveTo(23.2,-2);c.lineTo(23.2,32);c.stroke();
  }
}
function drawBase(c,type,level,branch){
  const col=TD[type].color,rim=level>=7?"#ffd25e":level>=4?(branch?"#ff7ac8":"#6fd3ff"):level===3?"#f2c85b":"#eef1f6";
  if(!c.noShadow){ell(c,6,15,24,9);c.fillStyle="rgba(0,20,0,.38)";c.fill();}
  ell(c,0,13,20,7.5);c.fillStyle=linear(c,0,6,0,20,[[0,"#5a5f6c"],[1,"#2e313b"]]);c.fill();
  // Turmkörper (Zylinder aus Stein)
  c.save();c.beginPath();c.moveTo(-16,TOPY);c.lineTo(-17,11);c.ellipse(0,11,17,6,0,PI,0,true);c.lineTo(16,TOPY);c.closePath();
  {const PB={arrow:["#4a2f1a","#d4a066","#9a6438","#3a2412"],cannon:["#23262e","#a3abba","#636979","#1a1c22"],frost:["#35618c","#cdeeff","#85bde6","#264a72"],poison:["#2d4a28","#a8da80","#6c9c4a","#213a1d"],tesla:["#392c52","#c3b0ee","#8068b4","#281e3e"],sniper:["#4a3a2a","#e0cda8","#a58f68","#33281c"]}[type]||["#4a4f5e","#b8bec9","#8d94a4","#373b48"];
    c.fillStyle=linear(c,-17,0,17,0,[[0,PB[0]],[.28,PB[1]],[.55,PB[2]],[1,PB[3]]]);c.fill();}
  c.strokeStyle="rgba(20,22,30,.55)";c.lineWidth=1;c.stroke();c.clip();
  c.strokeStyle="rgba(30,32,42,.38)";c.lineWidth=.9;
  const arcY=(y,x)=>y+5.6*Math.sqrt(Math.max(0,1-(x/17)**2));
  for(let k=0;k<4;k++){const y=TOPY+5+k*7;c.beginPath();c.ellipse(0,y,17,5.6,0,0,PI);c.stroke();
    for(let j=-2;j<=2;j++){const x=(j+(k%2?.5:0))*6.5;if(Math.abs(x)>15)continue;c.beginPath();c.moveTo(x,arcY(y,x));c.lineTo(x,arcY(y+7,x));c.stroke();}}
  c.fillStyle="rgba(255,255,255,.07)";c.fillRect(-12,TOPY,5,40);
  c.restore();
  // Farbband in Turmfarbe
  if(type!=="wall"){c.beginPath();c.moveTo(-4.2,TOPY+8);c.lineTo(4.2,TOPY+8);c.lineTo(4.2,TOPY+19);c.lineTo(0,TOPY+15.5);c.lineTo(-4.2,TOPY+19);c.closePath();c.fillStyle=col;c.fill();c.strokeStyle="rgba(10,8,20,.7)";c.lineWidth=.9;c.stroke();
    c.fillStyle="rgba(255,255,255,.35)";c.fillRect(-3.2,TOPY+8.6,1.4,8);}
  c.beginPath();c.ellipse(0,TOPY+3.4,16.3,5.6,0,.05,PI-.05);c.strokeStyle=col;c.lineWidth=2.6;c.stroke();
  // Typ-Schmuck am Turmfuß
  {const sh=(pts,f,s)=>{c.beginPath();pts.forEach(([x,y],i)=>i?c.lineTo(x,y):c.moveTo(x,y));c.closePath();c.fillStyle=f;c.fill();c.strokeStyle=s||"rgba(10,8,20,.75)";c.lineWidth=1;c.stroke();};
  if(type==="arrow"){for(let i=-2;i<=2;i++){const x=i*7.2;sh([[x-2.6,19.5],[x,8.5+Math.abs(i)*1.2],[x+2.6,19.5]],linear(c,x-3,0,x+3,0,[[0,"#7a4c28"],[1,"#c48a52"]]));}}
  else if(type==="cannon"){for(const y of [TOPY+13,TOPY+22]){c.beginPath();c.ellipse(0,y,17,5.4,0,.02,PI-.02);c.strokeStyle="#15171d";c.lineWidth=3.4;c.stroke();c.strokeStyle="#7d8494";c.lineWidth=1.6;c.stroke();}
    c.fillStyle="#c9cfdb";for(const x of [-12,-4,4,12]){c.beginPath();c.arc(x,TOPY+13+5*Math.sqrt(1-(x/17)**2),1,0,TAU);c.fill();}}
  else if(type==="frost"){for(const s of [-1,1]){sh([[s*16,19],[s*19.5,6],[s*13,15]],"#bfe6ff","#1c3a57");sh([[s*11,20],[s*12,10],[s*7.5,18]],"#7fb6e0","#1c3a57");}}
  else if(type==="poison"){for(const x of [-12,-3,8,15]){ell(c,x,17+(x%3),3.2,5);c.fillStyle="#9be05a";c.fill();c.strokeStyle="rgba(10,40,10,.8)";c.lineWidth=.9;c.stroke();}}
  else if(type==="tesla"){c.beginPath();c.ellipse(0,TOPY+14,17,5.4,0,.02,PI-.02);c.strokeStyle="#6b3a12";c.lineWidth=4;c.stroke();c.strokeStyle="#ffc98a";c.lineWidth=2;c.stroke();
    c.fillStyle="#d8b0ff";for(const x of [-9,0,9]){c.beginPath();c.arc(x,TOPY+14+5.2*Math.sqrt(1-(x/17)**2),1.6,0,TAU);c.fill();}}
  else if(type==="sniper"){for(let i=-2;i<=2;i++){rr(c,i*7.4-4.2,15.5-(i%2?0:2.4),8.4,5.8,2.6);c.fillStyle="#c9b48c";c.fill();c.strokeStyle="rgba(10,8,20,.75)";c.lineWidth=1;c.stroke();}}}
  // Plattform mit Zinnen
  for(let i=0;i<5;i++)merlon(c,PI+PI*(.12+i*.19));
  ell(c,0,TOPY,19,7.5);c.fillStyle=linear(c,0,TOPY-7,0,TOPY+7,[[0,"#eceff4"],[1,"#a1a9b8"]]);c.fill();
  ell(c,0,TOPY+.5,14,5);c.fillStyle="rgba(60,65,80,.22)";c.fill();
  ell(c,0,TOPY,19,7.5);c.strokeStyle=rim;c.lineWidth=level>=7?3.2:level>=3?2.2:1.2;c.stroke();
  for(let i=0;i<7;i++)merlon(c,PI*(.06+i*.88/6));
  // Stufen-Edelsteine
  const gs=level>5?.74:1;
  for(let i=0;i<level;i++){const gx=(i-(level-1)/2)*6.4*gs,gy=12.8;
    c.beginPath();c.moveTo(gx,gy-3*gs);c.lineTo(gx+2.4*gs,gy);c.lineTo(gx,gy+3*gs);c.lineTo(gx-2.4*gs,gy);c.closePath();
    c.fillStyle=i>=3?rim:col;c.fill();c.strokeStyle="rgba(0,0,0,.55)";c.lineWidth=.7;c.stroke();
    c.fillStyle="rgba(255,255,255,.7)";c.fillRect(gx-.8,gy-1.9,1.1,1.2);}
}
function drawTop(c,type,level,branch,anim){
  const B=level>=4?branch:-1;
  if(type==="arrow"){
    c.beginPath();c.arc(0,0,12,0,TAU);c.fillStyle=radial(c,-4,-4,1,13,[[0,"#d8a06a"],[.6,"#9a6434"],[1,"#5c3818"]]);c.fill();c.strokeStyle="#3d2410";c.lineWidth=1.5;c.stroke();
    rr(c,-7,-3,24,6,2);c.fillStyle=linear(c,0,-3,0,3,[[0,"#c48a52"],[1,"#6b4322"]]);c.fill();c.strokeStyle="#3d2410";c.lineWidth=1;c.stroke();
    const bow=B===1?"#ffe27a":level>=3?"#e9c35a":"#5a361a",bl=B===1?17:14;
    c.beginPath();c.moveTo(9,-bl);c.quadraticCurveTo(19,0,9,bl);c.strokeStyle="#2a170a";c.lineWidth=4.5;c.stroke();
    c.beginPath();c.moveTo(9,-bl);c.quadraticCurveTo(19,0,9,bl);c.strokeStyle=bow;c.lineWidth=2.6;c.stroke();
    const pl=(anim||0)*2.8,nk=1-pl; // Sehne beim Spannen zurückgezogen
    c.beginPath();c.moveTo(9,-bl);c.lineTo(nk,0);c.lineTo(9,bl);c.strokeStyle="rgba(240,240,230,.9)";c.lineWidth=.8;c.stroke();
    for(const a of (B===0?[-.28,0,.28]:[0])){c.save();c.rotate(a);c.strokeStyle="#e8e2d0";c.lineWidth=1.6;c.beginPath();c.moveTo(nk,0);c.lineTo(20-pl,0);c.stroke();
      c.beginPath();c.moveTo(24-pl,0);c.lineTo(19-pl,-2.8);c.lineTo(19-pl,2.8);c.closePath();c.fillStyle="#cfd8e3";c.fill();c.restore();}
    c.fillStyle="#7be0a0";c.beginPath();c.moveTo(nk,0);c.lineTo(nk-4,-3);c.lineTo(nk+2,0);c.lineTo(nk-4,3);c.closePath();c.fill();
  }else if(type==="cannon"){
    c.beginPath();c.arc(0,0,13,0,TAU);c.fillStyle=radial(c,-5,-5,1,14,[[0,"#8b93a3"],[.5,"#4b5160"],[1,"#22252e"]]);c.fill();c.strokeStyle="#15171d";c.lineWidth=1.5;c.stroke();
    c.strokeStyle=B===1?"#ff5a2a":"#ff9f43";c.lineWidth=2;c.beginPath();c.arc(0,0,9.5,PI*.6,PI*1.4);c.stroke();
    const bw=B===0?17:level>=3?12:10,bl=B===0?19:level>=4?25:22;
    rr(c,0,-bw/2,bl,bw,3);c.fillStyle=linear(c,0,-bw/2,0,bw/2,[[0,"#3a3f4b"],[.35,"#b4bbc8"],[.6,"#6c7382"],[1,"#262a33"]]);c.fill();c.strokeStyle="#15171d";c.lineWidth=1;c.stroke();
    c.fillStyle="rgba(0,0,0,.35)";c.fillRect(7,-bw/2,2,bw);c.fillRect(13,-bw/2,2,bw);
    rr(c,bl-4,-bw/2-1.5,6,bw+3,2);c.fillStyle=B===1?linear(c,0,-bw/2,0,bw/2,[[0,"#7a1e0c"],[.4,"#ff7a3a"],[1,"#5a1408"]]):linear(c,0,-bw/2,0,bw/2,[[0,"#2a2e37"],[.4,"#8c94a3"],[1,"#1c1f26"]]);c.fill();c.stroke();
    c.beginPath();c.arc(-3,-3,3,0,TAU);c.fillStyle="rgba(255,255,255,.25)";c.fill();
  }else if(type==="frost"){
    ell(c,0,4,13,6);c.fillStyle=linear(c,0,-2,0,10,[[0,"#4f88b5"],[1,"#24496b"]]);c.fill();c.strokeStyle="#1c3a57";c.lineWidth=1;c.stroke();
    const dark=B===1?"#a98aff":"#6cb8ee",light=B===1?"#f1e8ff":"#e6f7ff";
    const shard=(x,y,h,w,rot)=>{c.save();c.translate(x,y);c.rotate(rot);
      c.beginPath();c.moveTo(0,-h);c.lineTo(w,-h*.35);c.lineTo(0,0);c.closePath();c.fillStyle=dark;c.fill();
      c.beginPath();c.moveTo(0,-h);c.lineTo(-w,-h*.35);c.lineTo(0,0);c.closePath();c.fillStyle=light;c.fill();
      c.beginPath();c.moveTo(0,-h);c.lineTo(w,-h*.35);c.lineTo(0,0);c.lineTo(-w,-h*.35);c.closePath();c.strokeStyle="rgba(20,70,120,.6)";c.lineWidth=.8;c.stroke();c.restore();};
    if(level>=3)shard(-10,4,12,3.5,-.6);
    shard(-6,4,15,4,-.3);shard(7,4,14,4,.35);if(level>=2)shard(11,5,10,3,.7);
    if(B===0){shard(-12,6,8,2.5,-1);shard(13,7,8,2.5,1);}
    shard(0,5,24+level*1.5,6,0);
  }else if(type==="poison"){
    c.fillStyle="#22252e";for(const x of [-9,9]){rr(c,x-2,4,4,8,1);c.fill();}
    c.beginPath();c.moveTo(-14,-5);c.quadraticCurveTo(-15,13,0,13);c.quadraticCurveTo(15,13,14,-5);c.closePath();
    c.fillStyle=radial(c,-5,0,1,16,[[0,"#7a818f"],[.5,"#3a3f4b"],[1,"#1a1c22"]]);c.fill();c.strokeStyle="#111";c.lineWidth=1.2;c.stroke();
    ell(c,0,-5,14,5);c.fillStyle="#2a2d35";c.fill();
    const liq=B===1?[[0,"#fff7a8"],[.6,"#e8c800"],[1,"#8a7400"]]:[[0,"#e4ff9a"],[.6,"#7ed23a"],[1,"#3a7a12"]];
    ell(c,0,-5,11.5,3.8);c.fillStyle=radial(c,-3,-6,0,12,liq);c.fill();
    c.strokeStyle=level>=3?"#f2c85b":"#4a4f5c";c.lineWidth=1.4;ell(c,0,-5,14,5);c.stroke();
  }else if(type==="tesla"){
    ell(c,0,5,11,5);c.fillStyle="#3a3240";c.fill();
    rr(c,-3.5,-22,7,27,2);c.fillStyle=linear(c,-3.5,0,3.5,0,[[0,"#4a4f5c"],[.4,"#c0c6d2"],[1,"#3a3e48"]]);c.fill();
    const n=3+(level>=3?1:0)+(B===0?1:0);
    for(let i=0;i<n;i++){const y=1-i*5.2,rx=11-i*1.4;
      ell(c,0,y,rx,3.2);c.strokeStyle="#6b3a12";c.lineWidth=3.4;c.stroke();
      ell(c,0,y,rx,3.2);c.strokeStyle=linear(c,-rx,0,rx,0,[[0,"#a85a22"],[.4,"#ffc98a"],[1,"#b8692c"]]);c.lineWidth=2;c.stroke();}
    c.beginPath();c.arc(0,-24,5.5,0,TAU);c.fillStyle="#2a1838";c.fill();
  }else if(type==="sniper"){
    c.beginPath();c.arc(0,0,10,0,TAU);c.fillStyle=radial(c,-3,-3,1,11,[[0,"#8b93a3"],[1,"#2a2e37"]]);c.fill();c.strokeStyle="#15171d";c.lineWidth=1.2;c.stroke();
    rr(c,-12,-3.5,11,7,2);c.fillStyle=linear(c,0,-3.5,0,3.5,[[0,"#b07a45"],[1,"#5c3818"]]);c.fill();
    rr(c,0,-2.2,31,4.4,1.5);c.fillStyle=B===1?linear(c,0,-2.2,0,2.2,[[0,"#8a5a00"],[.4,"#ffe27a"],[1,"#7a4a00"]]):linear(c,0,-2.2,0,2.2,[[0,"#2a2e37"],[.4,"#aab2c0"],[1,"#1c1f26"]]);c.fill();c.strokeStyle="#111";c.lineWidth=.8;c.stroke();
    rr(c,27,-3.2,5,6.4,1.5);c.fillStyle="#1c1f26";c.fill();
    rr(c,3,-7.5,13,4.2,2);c.fillStyle="#22252e";c.fill();c.beginPath();c.arc(16,-5.4,2,0,TAU);c.fillStyle=B===0?"#ff4040":"#7fd6ff";c.fill();
  }
}
// ---------- Comic-Umriss: dicke dunkle Kontur um jede Grafik ----------
const OUTLINE="#16101f",FONT="'KW','Avenir Next','Arial Rounded MT Bold','Nunito','Segoe UI',system-ui,sans-serif";
function outlined(src,px){
  const out=mkCanvas(src.width,src.height),o=out.getContext("2d"),sil=mkCanvas(src.width,src.height),s=sil.getContext("2d");
  s.drawImage(src,0,0);s.globalCompositeOperation="source-in";s.fillStyle=OUTLINE;s.fillRect(0,0,sil.width,sil.height);
  for(let a=0;a<12;a++){const an=a/12*TAU;o.drawImage(sil,Math.cos(an)*px,Math.sin(an)*px);}
  o.drawImage(src,0,0);return out;
}
const spriteCache=new Map();
function sprite(type,level,branch,anim){
  anim=anim||0;const k=type+level+"_"+branch+"_"+anim;let s=spriteCache.get(k);if(s)return s;
  const sz=84,W_=sz*U*R,f=U*R,mk=fn=>{const cv_=mkCanvas(W_,W_),c=cv_.getContext("2d");c.noShadow=true;c.setTransform(f,0,0,f,sz*f/2,sz*f/2);fn(c);return outlined(cv_,2.2*R);};
  const base=mkCanvas(W_,W_),bc=base.getContext("2d");bc.setTransform(f,0,0,f,sz*f/2,sz*f/2);
  bc.setTransform(1,0,0,1,0,0);bc.drawImage(mk(c=>type==="wall"?drawWall(c):drawBase(c,type,level,branch)),0,0);
  const top=type==="wall"?null:mk(c=>drawTop(c,type,level,branch,anim));
  s={base,top,sz:sz*U};spriteCache.set(k,s);return s;
}
function drawTowerIcon(canvas,type,level,branch){
  const wall=type==="wall",c=canvas.getContext("2d"),s=canvas.width/(wall?56:70);c.setTransform(1,0,0,1,0,0);c.clearRect(0,0,canvas.width,canvas.height);
  c.setTransform(s,0,0,s,canvas.width/2,canvas.height/2+(wall?4:12)*s);
  const ref=forestSprite(type);
  if(ref){const w=wall?51:62,h=w*ref.naturalHeight/ref.naturalWidth;c.drawImage(ref,-w/2,-h+13,w,h);return;}
  if(type==="wall"){drawWall(c);return;}
  if(TWI[type]&&artOk(TWI[type])){const im=ARTI[TWI[type]],h=62,w=h*im.naturalWidth/im.naturalHeight;c.drawImage(im,-w/2,-h+14,w,h);return;}
  drawBase(c,type,level,branch);c.translate(0,TOPY);if(type==="arrow"||type==="cannon"||type==="sniper")c.rotate(-PI/4);drawTop(c,type,level,branch);
}

// =====================================================================
//  ZUSTAND
// =====================================================================
let S=null;
const DF=()=>DIFF[S.diff];
const goldMul=()=>DF().gold*(S.mod==="turbo"?1.25:1);
function newTower(type,c,r){
  const t={type,c,r,i:idx(c,r),x:(c+.5)*T,y:(r+.5)*T,level:1,branch:-1,cd:0,ang:-PI/2,spent:0,recoil:0,pop:1,mode:0,fresh:true,auraT:0,kills:0,perk:-1,wind:0,flashT:0,wk:null,open:false};
  if(type!=="wall")t.st=tstats(t);return t;
}
function reset(cfg){
  cfg=Object.assign({map:0,diff:1,daily:false,mod:null},cfg||{});
  referenceLayout=cfg.map===0?cfg.referenceLayout||false:false;
  occ.fill(null);loadMap(MAPS[cfg.map]);
  document.body.classList.toggle("kw-forest",cfg.map===0);
  let lives=DIFF[cfg.diff].lives+5*lv("lives");if(cfg.mod==="glass")lives=5;
  const gold=120+25*lv("gold")+(cfg.mod==="saver"?150:0);
  S={map:cfg.map,diff:cfg.diff,daily:cfg.daily,mod:cfg.mod,intro:!!cfg.intro,goalW:cfg.intro?10:cfg.daily?15:MAPS[cfg.map].waves,endless:false,
     gold,lives,maxLives:lives,wave:0,towers:[],enemies:[],proj:[],parts:[],decals:[],texts:[],bolts:[],tracers:[],meteors:[],
     spawnQ:[],spawnT:0,spawnK:0,waveTotal:1,active:false,speed:1,over:false,started:false,sel:null,build:"wall",pending:null,t:0,shake:0,banner:null,cryHit:0,
     lost:0,bosses:0,metCd:0,aiming:false,D:null,routes:[],pathLen:0,rel:[],combo:0,comboT:-9,bestCombo:0,offer:null,rerolled:false,slowmo:0,flash:0,hurt:0,autoT:0,runUnlocked:[],
     pools:[],plan:[],planRoutes:null,planLen:0,undo:[],hover:-1,planBad:null,lastWhy:"",whyT:-9,traps:[]};
  applyMaze(bfs(-1));
  if(gridChanged){gridChanged=false;blockCache.clear();if(typeof fit==="function"&&R)fit();}
  $("bSpeed").innerHTML="1&times;";hideInfo();uiDirty=true;
}
function applyMaze(d){
  S.D=d;S.routes=SPAWNS.map((s,k)=>routeFrom(d,s,PORTALS[k]));S.pathLen=Math.min(...SPAWNS.map(s=>d[s]));
  if(S.pathLen>=50)ach("maze40");if(S.pathLen>=100)ach("maze70");
  const n=COLS*ROWS;S.blockMask=new Uint8Array(n);
  for(let i=0;i<n;i++){if(rock[i]||occ[i]||i===GI||SPAWNS.includes(i))continue;if(!reachAll(i))S.blockMask[i]=1;}
  renderGrid();
}
// Bau-Raster (vorgerendert): helle Rahmen = hier darfst du bauen, rot = würde den Weg versperren
const gridCv=document.createElement("canvas");
function renderGrid(){
  if(!R||!S||!S.blockMask)return;gridCv.width=Math.ceil(W*RB);gridCv.height=Math.ceil(H*RB);const c=gridCv.getContext("2d");c.setTransform(RB,0,0,RB,0,0);
  for(let i=0;i<COLS*ROWS;i++){if(rock[i]||occ[i]||i===GI||SPAWNS.includes(i))continue;const x=(i%COLS)*T,y=((i/COLS)|0)*T;
    if(zone[i]){rr(c,x+5,y+5,T-10,T-10,7);c.fillStyle="rgba(170,110,255,.16)";c.fill();c.strokeStyle="rgba(200,160,255,.5)";c.lineWidth=1.4;c.setLineDash([4,5]);c.stroke();c.setLineDash([]);}
    else if(S.blockMask[i]){rr(c,x+6,y+6,T-12,T-12,6);c.fillStyle="rgba(230,40,50,.2)";c.fill();
      c.strokeStyle="rgba(200,30,40,.55)";c.lineWidth=2.2;c.lineCap="round";c.beginPath();c.moveTo(x+14,y+14);c.lineTo(x+T-14,y+T-14);c.moveTo(x+T-14,y+14);c.lineTo(x+14,y+T-14);c.stroke();}
    else{rr(c,x+3,y+3,T-6,T-6,8);c.fillStyle="rgba(255,255,255,.10)";c.fill();c.strokeStyle="rgba(255,255,255,.5)";c.lineWidth=1.4;c.stroke();
      rr(c,x+4.5,y+4.5,T-9,T-9,7);c.strokeStyle="rgba(16,24,43,.18)";c.lineWidth=1;c.stroke();}}
}
function saveRun(){
  if(!S||!S.started||S.over||S.active)return;
  store.set("kw2_run",{map:S.map,diff:S.diff,daily:S.daily,mod:S.mod,endless:S.endless,gold:S.gold,lives:S.lives,maxLives:S.maxLives,wave:S.wave,lost:S.lost,bosses:S.bosses,metCd:S.metCd,rel:S.rel,intro:S.intro,referenceLayout,muts:S.muts,bu:S.bu,
    offer:S.offer?.map(r=>r.id),rerolled:S.rerolled,dailyKey:S.dailyKey,
    runUnlocked:S.runUnlocked,grid:COLS+"x"+ROWS,towers:S.towers.map(t=>[t.type,t.c,t.r,t.level,t.branch,t.spent,t.mode,t.kills,t.perk,t.wk||0,t.open?1:0]),traps:S.traps.map(t=>[t.kind,t.c,t.r,t.spent])});
}
function loadRun(){
  const sv=store.get("kw2_run",null);
  // Alte oder unvollständige Spielstände dürfen das Startmenü nicht blockieren.
  if(!sv||typeof sv!=="object"||!Array.isArray(sv.towers)||!Number.isFinite(sv.gold)||!Number.isFinite(sv.lives)||!Number.isFinite(sv.wave)||sv.wave<0)return false;
  if(!MAPS[sv.map??0]||!DIFF[sv.diff??1])return false;
  {const m=MAPS[sv.map??0];if((sv.grid||"11x17")!==(m.cols||11)+"x"+(m.rows||17))return false;} // Spielstand vom alten, kleineren Feld
  if(sv.towers.some(t=>!Array.isArray(t)||t.length<4||!TD[t[0]]||!Number.isInteger(t[1])||!Number.isInteger(t[2])||t[1]<0||t[1]>=COLS||t[2]<0||t[2]>=ROWS))return false;
  reset({map:sv.map||0,diff:sv.diff==null?1:sv.diff,daily:!!sv.daily,mod:sv.mod||null,intro:!!sv.intro,referenceLayout:sv.referenceLayout});
  Object.assign(S,{gold:sv.gold,lives:sv.lives,maxLives:sv.maxLives||sv.lives,wave:sv.wave,lost:sv.lost||0,bosses:sv.bosses||0,metCd:sv.metCd||0,rel:sv.rel||[],endless:!!sv.endless,runUnlocked:sv.runUnlocked||[]});
  S.muts=Array.isArray(sv.muts)?sv.muts.filter(id=>MUTS.some(m=>m.id===id)):[];
  S.bu=sv.bu||{};
  S.dailyKey=sv.dailyKey;
  const offer=Array.isArray(sv.offer)?sv.offer.map(id=>RELICS.find(r=>r.id===id)).filter(Boolean):[];
  S.offer=offer.length?offer:null;
  S.rerolled=!!sv.rerolled;
  for(const [type,c,r,level,branch,spent,mode,kills,perk,wk,open] of sv.towers){const t=newTower(type,c,r);Object.assign(t,{level,branch,spent,mode:mode||0,kills:kills||0,fresh:false,pop:0,perk:perk==null?-1:perk,wk:type==="wall"&&WK[wk]?wk:null,open:type==="wall"&&wk==="gate"&&!!open});
    occ[t.i]=t;S.towers.push(t);}
  for(const t of S.towers)if(t.type!=="wall")t.st=tstats(t);
  if(Array.isArray(sv.traps))for(const [kind,c,r,spent] of sv.traps){if(!TRAPS[kind]||!Number.isInteger(c)||!Number.isInteger(r)||c<0||c>=COLS||r<0||r>=ROWS)continue;const i=idx(c,r);if(occ[i]||trapAt[i])continue;const tp=newTrap(kind,c,r);tp.spent=spent||TRAPS[kind].cost;tp.fresh=false;trapAt[i]=tp;S.traps.push(tp);}
  applyMaze(bfs(-1));return true;
}
function refreshStats(){for(const t of S.towers)if(t.type!=="wall")t.st=tstats(t);}

// =====================================================================
//  UI
// =====================================================================
const shopBtns={};let unlockAsk=null;
const isLocked=type=>!!TD[type].unlock&&!lv(TD[type].unlock)&&!(S&&S.runUnlocked&&S.runUnlocked.includes(type));
const runUnlockCost=type=>TD[type].cost*2;
function buildShop(){
  const sh=$("shop");sh.innerHTML="";
  ORDER.forEach(type=>{
    const d=TD[type],b=document.createElement("button");b.className="tw";
    const ic=document.createElement("canvas");ic.width=112;ic.height=112;drawTowerIcon(ic,type,1,-1);b.appendChild(ic);
    const n=document.createElement("b");n.textContent=d.name;b.appendChild(n);
    const p=document.createElement("span");p.className="price";p.innerHTML=COIN+costOf(type);b.appendChild(p);
    if(d.air)b.insertAdjacentHTML("beforeend",'<svg class="air"><use href="#sWing"/></svg>');
    const locked=isLocked(type);
    if(locked){b.classList.add("lock");b.insertAdjacentHTML("beforeend",'<svg class="lk"><use href="#sLock"/></svg>');p.innerHTML=COIN+runUnlockCost(type);}
    else p.dataset.live=type;
    b.addEventListener("click",()=>{
      if(locked){
        const c=runUnlockCost(type);
        if(S.gold<c){toast(d.name+" freischalten: "+c+" Gold (oder dauerhaft in der Werkstatt)");beep(140,.15,"sawtooth",.03,true);return;}
        if(unlockAsk!==type){unlockAsk=type;toast("Nochmal tippen: "+d.name+" für diese Runde freischalten ("+c+" Gold)");return;}
        S.gold-=c;S.runUnlocked.push(type);unlockAsk=null;buildShop();S.build=type;uiDirty=true;saveRun();
        S.banner={t:0,txt:d.name+" freigeschaltet!",sub:d.desc,col:TD[type].color};beep(660,.15,"triangle",.05,true);setTimeout(()=>beep(990,.25,"triangle",.05,true),120);
        return;}
      unlockAsk=null;
      S.aiming=false;S.build=S.build===type?null:type;S.pending=null;uiDirty=true;
      if(S.build)toast(d.name+" – "+d.desc);
    });
    sh.appendChild(b);shopBtns[type]=b;
    if(type==="wall"){ // Fallen direkt nach der Mauer
      const tb=document.createElement("button");tb.className="tw";
      const tc=document.createElement("canvas");tc.width=112;tc.height=112;drawTrapIcon(tc,"spike");tb.appendChild(tc);
      const tn=document.createElement("b");tn.textContent="Falle";tb.appendChild(tn);
      const tp=document.createElement("span");tp.className="price";tp.innerHTML=COIN+TRAPS.spike.cost;tb.appendChild(tp);
      tb.addEventListener("click",()=>{unlockAsk=null;S.aiming=false;S.build=S.build==="trap"?null:"trap";S.pending=null;uiDirty=true;
        if(S.build)toast("Falle – auf ein freies Wegfeld tippen ("+S.traps.length+"/"+TRAPMAX+")");});
      sh.appendChild(tb);shopBtns.trap=tb;}
  });
}
// Symbol einer Falle (Shop, Infofenster)
function drawTrapIcon(cv_,kind){
  const c=cv_.getContext("2d"),w=cv_.width,h=cv_.height;c.clearRect(0,0,w,h);c.save();c.translate(w/2,h*.56);const k=w/112;c.scale(k,k);
  c.lineJoin="round";c.lineCap="round";
  c.save();c.scale(1,.62);
  rr(c,-40,-40,80,80,16);c.fillStyle=kind==="tar"?"#2a1d16":kind==="fire"?"#4a2a24":"#7d828e";c.fill();c.lineWidth=6;c.strokeStyle=OUTLINE;c.stroke();
  rr(c,-32,-32,64,64,11);c.fillStyle=kind==="tar"?"#1a120d":kind==="fire"?"#d8461a":"#a9aebb";c.fill();
  if(kind==="fire"){c.fillStyle=radial(c,0,0,4,34,[[0,"rgba(255,240,150,1)"],[.6,"rgba(255,140,40,.8)"],[1,"rgba(200,50,10,0)"]]);c.fillRect(-32,-32,64,64);
    c.strokeStyle="#3a160c";c.lineWidth=4;c.beginPath();c.moveTo(-24,-10);c.lineTo(-6,0);c.lineTo(4,-16);c.moveTo(-6,0);c.lineTo(8,18);c.lineTo(24,10);c.stroke();}
  if(kind==="tar"){for(const [x,y,r] of [[-12,-8,9],[10,4,12],[-4,16,6]]){c.beginPath();c.arc(x,y,r,0,TAU);c.fillStyle="#0e0907";c.fill();c.beginPath();c.arc(x-r*.35,y-r*.35,r*.3,0,TAU);c.fillStyle="rgba(255,255,255,.45)";c.fill();}}
  c.restore();
  if(kind==="spike"){for(const [x,y] of [[-18,-8],[0,-12],[18,-8],[-10,4],[10,4],[0,14]]){c.beginPath();c.moveTo(x-6,y);c.lineTo(x,y-22);c.lineTo(x+6,y);c.closePath();
    c.fillStyle=linear(c,x-6,0,x+6,0,[[0,"#f4f7fb"],[1,"#8d95a6"]]);c.fill();c.lineWidth=2.6;c.strokeStyle=OUTLINE;c.stroke();}}
  c.restore();
}
let uiDirty=true,infoKey="";
function renderTrapInfo(t,el){
  const d=TRAPS[t.kind],key=["trap",t.kind,t.fresh,Math.floor(S.gold/5),t.r>ROWS/2].join("|");
  el.classList.toggle("top",t.r>ROWS/2);
  if(key===infoKey&&el.style.display!=="none")return;infoKey=key;el.style.display="flex";
  let h='<div class="irow"><canvas class="iic" width="96" height="96"></canvas><div class="imain"><div><span class="iname">'+d.name+'</span></div><div class="ihint">'+d.desc+'. Fallen blockieren den Weg nicht.</div></div>'+'<button class="rb" data-act="close"><svg viewBox="0 0 20 20"><path d="M5 5l10 10M15 5L5 15" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"/></svg></button>'+'</div>';
  h+='<div class="ibtns two">'+TRAPK.filter(k=>k!==t.kind).map(k=>{const c=trapCost(t,k);return '<button class="btn3d b-br" data-act="tk_'+k+'"'+(S.gold<c?" disabled":"")+'><b>'+TRAPS[k].name+'</b><small>'+TRAPS[k].desc+'</small><span>'+COIN+c+'</span></button>';}).join("")+'</div>';
  h+='<div class="ibtns two"><div></div><button class="btn3d b-sell" data-act="sell">Verkaufen<small>+'+sellVal(t)+(t.fresh?" (100%)":"")+'</small></button></div>';
  el.innerHTML=h;drawTrapIcon(el.querySelector(".iic"),t.kind);
}
function hideInfo(){$("info").style.display="none";infoKey="";}
function select(t){S.sel=t;S.pending=null;S.aiming=false;infoKey="";uiDirty=true;}
function deselect(){if(S)S.sel=null;hideInfo();uiDirty=true;}
function renderInfo(){
  const t=S.sel,el=$("info");
  if(!t){if(el.style.display!=="none")hideInfo();return;}
  if(t.type==="trap"){renderTrapInfo(t,el);return;}
  const isWall=t.type==="wall",d=TD[t.type],rk=isWall?0:rankOf(t);
  const key=[t.type,t.level,t.branch,t.perk,t.mode,t.fresh,rk,isWall?Math.floor(S.gold/5):(S.gold>=upCost(t)?1:0),t.r>ROWS/2,isWall?0:Math.floor(t.kills/5),t.wk,t.open,isWall?0:crystalNb(t)].join("|");
  el.classList.toggle("top",t.r>ROWS/2);
  if(key===infoKey&&el.style.display!=="none")return;
  infoKey=key;el.style.display="flex";
  let h='<div class="irow"><canvas class="iic" width="96" height="96"></canvas><div class="imain"><div><span class="iname">'+(isWall&&t.wk?WK[t.wk].name:d.name)+'</span>';
  if(!isWall){h+='<span class="istars'+(t.level>=MAXL?' leg':'')+'">'+"★".repeat(t.level)+"☆".repeat(MAXL-t.level)+'</span>';
    if(t.branch>=0)h+='<span class="ibr">'+d.br[t.branch].name+'</span>';
    if(t.perk>=0)h+='<span class="ibr perk">'+PERKS[t.type+t.branch][t.perk].name+'</span>';
    if(rk)h+='<span class="ivet">'+VETN[rk]+'</span>';}
  h+='</div>';
  if(isWall){
    if(!t.wk)h+='<div class="ihint">Baue die Mauer um – oder wähle unten einen Turm und tippe sie an.</div>';
    else if(t.wk==="gate")h+='<div class="ihint">'+(t.open?"🟢 Offen – die Gegner dürfen hindurch.":"🔒 Geschlossen – die Gegner laufen außen herum.")+' Im Kampf reicht ein Tipp aufs Tor.</div>';
    else h+='<div class="ihint">'+WK[t.wk].desc+'.</div>';}
  else{const st=t.st;h+='<div class="istats"><span>Schaden <b>'+Math.round(st.dmg)+'</b></span><span>Reichw. <b>'+(st.range/T).toFixed(1)+'</b></span>';
    if(!st.aura)h+='<span>Tempo <b>'+st.rate.toFixed(1)+'/s</b></span>';
    if(st.multi>1)h+='<span>Ziele <b>'+st.multi+'</b></span>';if(st.chain)h+='<span>Kette <b>'+st.chain+'</b></span>';
    if(st.slow)h+='<span>Bremse <b>'+Math.round(st.slow*100)+'%</b></span>';if(st.dot)h+='<span>Gift <b>'+Math.round(st.dot)+'/s</b></span>';
    if(st.crit)h+='<span>Krit <b>'+Math.round(st.crit*100)+'%</b></span>';if(st.bounty>1)h+='<span>Gold <b>×'+st.bounty.toFixed(1)+'</b></span>';
    const nx=rk<3?VET[rk+1]:0;
    const dd=t.dmgDone||0;
    h+='<span>Abschüsse <b>'+t.kills+(nx?'/'+nx:'')+'</b></span><span>Gesamt <b>'+(dd>=1e4?(dd/1e3).toFixed(0)+"k":dd>=1e3?(dd/1e3).toFixed(1)+"k":Math.round(dd))+'</b></span><span><b>'+(st.air&&st.ground?"Boden + Luft":"Nur Boden")+'</b></span></div>';}
  if(t.combo&&t.combo.length)h+='<div class="itile combo">✦ '+t.combo.map(c=>c.name+": "+c.txt).join(" · ")+'</div>';
  else if(!isWall&&COMBOS.some(c=>c.to===t.type))h+='<div class="itile">Kombo-Tipp: '+COMBOS.filter(c=>c.to===t.type).map(c=>"neben "+({arrow:"Pfeil",cannon:"Kanone",frost:"Frost",poison:"Gift",tesla:"Blitz",sniper:"Schütze"})[c.a===t.type?c.b:c.a]+" → "+c.name).join(" · ")+'</div>';
  if(tile[t.i]===1)h+='<div class="itile">▲ Podest: +20% Reichweite'+(isWall?" für einen Turm":"")+'</div>';
  if(tile[t.i]===3)h+='<div class="itile ad">◆ Kristallader: +25% Schaden'+(isWall?" für einen Turm":"")+'</div>';
  if(!isWall&&crystalNb(t))h+='<div class="itile ad">💎 Kristallmauer daneben: +'+(12*crystalNb(t))+'% Schaden</div>';
  h+='</div><button class="rb" data-act="close"><svg viewBox="0 0 20 20"><path d="M5 5l10 10M15 5L5 15" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"/></svg></button></div>';
  const sell='<button class="btn3d b-sell" data-act="sell">Verkaufen<small>+'+sellVal(t)+(t.fresh?" (100%)":"")+'</small></button>';
  if(isWall){
    if(!t.wk){h+='<div class="ibtns three">'+Object.keys(WK).map(k=>{const w=WK[k];return '<button class="btn3d b-br" data-act="wk_'+k+'"'+(S.gold<w.cost?" disabled":"")+'><b>'+w.icon+' '+w.name+'</b><small>'+w.short+'</small><span>'+COIN+w.cost+'</span></button>';}).join("")+'</div>';
      h+='<div class="ibtns two"><div></div>'+sell+'</div>';}
    else if(t.wk==="gate")h+='<div class="ibtns two"><button class="btn3d b-up" data-act="gate">'+(t.open?"🔒 Schließen":"🟢 Öffnen")+'</button>'+sell+'</div>';
    else h+='<div class="ibtns two"><div></div>'+sell+'</div>';}
  else{
    const mode='<button class="btn3d b-mode" data-act="mode"><small>Ziel</small>'+MODES[t.mode]+'</button>',c=t.level<MAXL?upCost(t):0,no=S.gold<c?" disabled":"";
    if(t.level===BRL){
      h+='<div class="ichoose">Spezialisierung wählen</div><div class="ibtns two">'+[0,1].map(b=>'<button class="btn3d b-br '+(b?"alt":"")+'" data-act="b'+b+'"'+no+'><b>'+d.br[b].name+'</b><small>'+d.br[b].desc+'</small><span>'+COIN+c+'</span></button>').join("")+'</div>';
      h+='<div class="ibtns two">'+mode+sell+'</div>';}
    else if(t.level===PERKL){const pk=PERKS[t.type+t.branch];
      h+='<div class="ichoose">Meister-Fähigkeit wählen · Stufe 7 (legendär)</div><div class="ibtns two">'+[0,1].map(b=>'<button class="btn3d b-br b-perk '+(b?"alt":"")+'" data-act="p'+b+'"'+no+'><b>'+pk[b].name+'</b><small>'+pk[b].desc+'</small><span>'+COIN+c+'</span></button>').join("")+'</div>';
      h+='<div class="ibtns two">'+mode+sell+'</div>';}
    else if(t.level>=MAXL){h+='<div class="ibtns"><button class="btn3d b-up" disabled>Legendär ★</button>'+mode+sell+'</div>';}
    else{const nx=Object.assign({},t,{level:t.level+1}),ns=tstats(nx),gain=Math.round(ns.dmg)-Math.round(t.st.dmg);
      h+='<div class="ibtns"><button class="btn3d b-up" data-act="up"'+no+'><span class="ul">Stufe '+(t.level+1)+' '+COIN+c+'</span>'+(gain>0?'<small>Schaden +'+gain+'</small>':'')+'</button>'+mode+sell+'</div>';}
  }
  el.innerHTML=h;drawTowerIcon(el.querySelector(".iic"),t.type,t.level,t.branch);
}
$("info").addEventListener("click",e=>{
  const b=e.target.closest("[data-act]");if(!b||b.disabled)return;const a=b.dataset.act,t=S.sel;if(!t)return;
  if(a==="close")deselect();else if(a==="sell")sell();
  else if(a.startsWith("wk_"))setWallKind(t,a.slice(3));else if(a==="gate")toggleGate(t);
  else if(a.startsWith("tk_"))setTrapKind(t,a.slice(3));else if(a==="up")upgrade(-1);else if(a==="b0")upgrade(0);else if(a==="b1")upgrade(1);
  else if(a==="p0")upgrade(0);else if(a==="p1")upgrade(1);
  else if(a==="mode"){t.mode=(t.mode+1)%3;uiDirty=true;}
});
function updateUI(){
  renderBoosts();
  $("hGold").textContent=Math.floor(S.gold);$("hLives").textContent=S.lives;
  $("hWave").textContent=S.goalW&&!S.endless?S.wave+"/"+S.goalW:S.wave;$("hRelN").textContent=S.rel.length;
  if(S.gold>=500)ach("rich");
  ORDER.forEach(t=>{const b=shopBtns[t];if(!b)return;const lk=b.classList.contains("lock"),c=lk?runUnlockCost(t):costOf(t);
    b.classList.toggle("sel",S.build===t);b.classList.toggle("no",S.gold<c);
    const p=b.querySelector(".price");if(p&&p.dataset.c!==String(c)){p.dataset.c=c;p.innerHTML=COIN+c;}});
  if(shopBtns.trap){shopBtns.trap.classList.toggle("sel",S.build==="trap");shopBtns.trap.classList.toggle("no",S.gold<trapPrice("spike")||S.traps.length>=TRAPMAX);const tpp=shopBtns.trap.querySelector(".price"),pc=String(S.traps.length>=TRAPMAX?"max":trapPrice("spike"));if(tpp.dataset.c!==pc){tpp.dataset.c=pc;tpp.innerHTML=pc==="max"?"voll":COIN+pc;}}
  const go=$("go"),txt=$("goTxt"),fill=$("goFill");
  const nxt=S.wave+1,nm=WNAMES[(nxt-1)%10];
  if(!S.active){go.disabled=false;go.classList.remove("call");
    txt.innerHTML='<svg><use href="#sPlay"/></svg>Welle '+nxt+' <small>· '+(S.autoT>0?"startet in "+Math.ceil(S.autoT)+" s":waveSummary(nxt)+(isAirWave(nxt)?" ✈":""))+'</small>';
    fill.style.width=S.autoT>0?Math.round((1-S.autoT/4)*100)+"%":"0";}
  else if(S.spawnQ.length){go.disabled=true;go.classList.remove("call");const rem=S.enemies.length+S.spawnQ.length;
    txt.textContent="Welle "+S.wave+" · noch "+rem;fill.style.width=Math.round((1-rem/Math.max(1,S.waveTotal))*100)+"%";}
  else{go.disabled=false;go.classList.add("call");fill.style.width="0";txt.innerHTML='<svg><use href="#sFF"/></svg>Welle '+nxt+' rufen <small>+'+callBonus()+' Gold</small>';}
  const mm=metMax();$("met").style.setProperty("--p",(S.metCd/mm).toFixed(3));$("met").classList.toggle("aim",S.aiming);
  $("undo").classList.toggle("hide",!S.started||S.over||S.active||!S.undo.length);$("bZoom").classList.toggle("out",VZ>1.05);$("bTilt").classList.toggle("flat",!tiltTarget);
  renderInfo();updateCoach();
}
// ---------- Tutorial (erste Runde) ----------
const TUT=["Ziehe mit dem Finger über das Feld – die Mauern erscheinen als Vorschau und werden beim Loslassen gebaut.",
  "Je länger der Weg, desto besser! Wähle jetzt unten den Pfeil-Turm.",
  "Tippe ein freies Feld neben dem Weg an und tippe nochmal zum Bauen.",
  "Stark! Starte jetzt die erste Welle."];
function updateCoach(){
  const el=$("coach"),st=meta.tut||0;
  if(st>=TUT.length||!S.started||S.over){el.classList.add("hide");return;}
  const walls=S.towers.filter(t=>t.type==="wall").length,tw=S.towers.length-walls;
  let n=st;
  if(n===0&&walls>=4)n=1;if(n===1&&(S.build&&S.build!=="wall"||tw>0))n=2;if(n===2&&tw>0)n=3;if(n===3&&S.wave>=1)n=4;
  if(n!==st){meta.tut=n;saveMeta();if(n<TUT.length)beep(880,.1,"triangle",.04,true);}
  if(n>=TUT.length){el.classList.add("hide");return;}
  el.classList.toggle("hide",!!S.sel);$("coachStep").textContent=n+1;$("coachTxt").textContent=TUT[n];
}
const callBonus=()=>3+Math.floor(S.wave/2);
const metMax=()=>45*(1-.12*lv("meteor"))*(has("stern")?.5:1);

// =====================================================================
//  AKTIONEN
// =====================================================================
function startWave(){
  if(S.over||S.offer)return;
  saveRun();
  const early=S.active;if(early&&S.spawnQ.length)return;
  if(early){const b=callBonus();S.gold+=b;addText(W/2,H*.5,"+"+b+" Gold (früh gerufen)","#9ff5e2",true,50);}
  S.autoT=0;S.wave++;const q=makeWave(S.wave);S.spawnQ.push(...q);S.waveTotal=S.enemies.length+S.spawnQ.length;S.spawnT=.3;S.active=true;
  for(const t of S.towers)t.fresh=false;for(const t of S.traps)t.fresh=false;
  S.undo=[];cancelStroke();tiltAuto=true;
  const boss=S.wave%10===0;
  S.banner={t:0,txt:"Welle "+S.wave,sub:boss?"Ein Boss naht!":S.intro&&S.wave===2?"Verlängere den Weg mit Mauern.":S.intro&&S.wave===3?"Baue zwei Pfeiltürme nebeneinander für Salve.":waveSummary(S.wave),col:boss?"#ff5d6c":"#ffd25e"};
  beep(boss?160:330,.35,"triangle",.06,true);uiDirty=true;infoKey="";
}
function canPlace(i){
  if(zone[i]&&!SPAWNS.includes(i))return{ok:false,reason:"Schutzzone am Portal – hier darf nicht gebaut werden"};
  if(SPAWNS.includes(i)||i===GI||rock[i]||occ[i])return{ok:false,reason:"Hier kann nicht gebaut werden"};
  if(trapAt[i])return{ok:false,reason:"Hier liegt eine Falle"};
  for(const e of S.enemies){if(e.air)continue;if(e.ti===i||e.ci===i)return{ok:false,reason:"Ein Gegner steht im Weg"};}
  const d=bfs(i);
  for(const s of SPAWNS)if(d[s]<0)return{ok:false,reason:"Der Weg darf nicht versperrt werden!"};
  for(const e of S.enemies){if(!e.air&&!e.dead&&d[e.ti]<0)return{ok:false,reason:"Der Weg darf nicht versperrt werden!"};}
  return{ok:true,d};
}
const PLIM=4,PRAD=4.5;
function portalOK(c,r){const near=(cc,rr)=>SPAWNS.some(s=>Math.hypot((s%COLS)-cc,((s/COLS)|0)-rr)<PRAD);if(!near(c,r))return true;
  return S.towers.filter(t=>t.type!=="wall"&&near(t.c,t.r)).length<PLIM;}
function tryBuild(c,r,type,quiet,noUndo){
  const i=idx(c,r),cost=costOf(type);
  if(type!=="wall"&&!portalOK(c,r)){if(!quiet)toast("Höchstens "+PLIM+" Türme nahe am Portal – baue ein Labyrinth!");return false;}
  if(type!=="wall"&&S.muts&&S.muts.includes("pure")&&type!=="arrow"&&type!=="cannon"){if(!quiet)toast("Mutator „Reine Lehre“: nur Pfeil und Kanone");return false;}
  if(S.gold<cost){if(!quiet){toast("Zu wenig Gold");beep(140,.15,"sawtooth",.03,true);}return false;}
  const v=canPlace(i);if(!v.ok){if(!quiet||v.reason.startsWith("Der Weg")){toast(v.reason);beep(140,.15,"sawtooth",.03,true);}return false;}
  S.gold-=cost;const t=newTower(type,c,r);t.spent=cost;t.fresh=!S.active;occ[i]=t;S.towers.push(t);applyMaze(v.d);if(!noUndo)pushUndo([t]);
  S.pending=null;uiDirty=true;dust(t.x,t.y+6,type==="wall"?8:14);beep(type==="wall"?300:520,.1,"triangle",.045,true);saveRun();return true;
}
function convert(t,type){
  if(!portalOK(t.c,t.r)){toast("Höchstens "+PLIM+" Türme nahe am Portal – baue ein Labyrinth!");return;}
  if(S.muts&&S.muts.includes("pure")&&type!=="arrow"&&type!=="cannon"){toast("Mutator „Reine Lehre“: nur Pfeil und Kanone");return;}
  const cost=costOf(type)-costOf("wall");
  if(S.gold<cost){toast("Zu wenig Gold");return;}
  S.gold-=cost;Object.assign(t,{type,level:1,branch:-1,perk:-1,mode:0,cd:0,pop:1,kills:0,wind:0,wk:null,open:false});blockCache.clear();t.spent+=cost;t.fresh=t.fresh&&!S.active;t.st=tstats(t);
  S.pending=null;uiDirty=true;dust(t.x,t.y+6,14);beep(520,.12,"triangle",.05,true);saveRun();
}
function upgrade(b){
  const t=S.sel;if(!t||t.type==="wall"||t.type==="trap"||t.level>=MAXL)return;if((t.level===BRL||t.level===PERKL)&&b<0)return;
  const c=upCost(t);if(S.gold<c)return;
  S.gold-=c;t.spent+=c;if(t.level===BRL)t.branch=b;if(t.level===PERKL)t.perk=b;t.level++;t.st=tstats(t);t.pop=1;uiDirty=true;infoKey="";
  if(t.level>=5)ach("lvl5");
  const leg=t.level>=MAXL;
  if(leg){ach("lvl7");S.banner={t:0,txt:"Legendär!",sub:TD[t.type].name+" · "+PERKS[t.type+t.branch][t.perk].name,col:"#ffd25e"};S.flash=Math.max(S.flash,.2);}
  const col=leg?"#ffd25e":t.level>=4?(t.branch?"#ff7ac8":"#6fd3ff"):"#ffd25e",z=artZ(TOPY);
  for(let i=0;i<(leg?44:22);i++){const a=Math.random()*TAU,v=30+Math.random()*80;S.parts.push({k:"spark",x:t.x,y:t.y,z,vx:Math.cos(a)*v*.7,vy:Math.sin(a)*v*.7,vz:50+Math.random()*110,t:0,max:.6+Math.random()*.4,r:2,col,gr:140});}
  S.parts.push({k:"ring",x:t.x,y:t.y,z:WH+1,t:0,max:.45,r:T*.9,col});
  if(leg)S.parts.push({k:"ring",x:t.x,y:t.y,z:1,t:0,max:.7,r:T*1.9,col});
  beep(660,.18,"triangle",.05,true);setTimeout(()=>beep(990,.18,"triangle",.04,true),90);if(leg)setTimeout(()=>beep(1320,.3,"triangle",.05,true),200);saveRun();
}
function sell(){
  const t=S.sel;if(!t)return;const v=sellVal(t);S.gold+=v;
  if(t.type==="trap"){addText(t.x,t.y,"+"+v,"#ffd25e",true,12);dust(t.x,t.y,8);removeTrap(t);deselect();beep(260,.15,"triangle",.04,true);saveRun();return;}
  addText(t.x,t.y,"+"+v,"#ffd25e",true,WH+18);dust(t.x,t.y+6,14);
  occ[t.i]=null;S.towers.splice(S.towers.indexOf(t),1);applyMaze(bfs(-1));if(t.wk)refreshStats();blockCache.clear();deselect();beep(260,.15,"triangle",.04,true);saveRun();
}
function setPending(c,r,conv){
  const i=idx(c,r);S.pending={c,r,convert:conv,i};
  if(conv){S.pending.ok=true;S.pending.routes=null;}
  else{const v=canPlace(i);S.pending.ok=v.ok;S.pending.reason=v.reason;S.pending.routes=v.ok?SPAWNS.map((s,k)=>routeFrom(v.d,s,PORTALS[k])):null;}
  if(!S.pending.ok)toast(S.pending.reason);
  else toast((conv?"Nochmal tippen: Mauer zu "+TD[S.build].name+" ausbauen":"Nochmal tippen zum Bauen")+tileHint(i));
}
// =====================================================================
//  BEDIENUNG: Tippen, Mauern ziehen (mit Vorschau), Lupe, Zoomen & Verschieben
// =====================================================================
const ptrs=new Map();let gest=null,touch=null;
function cvPos(e){const rc=cv.getBoundingClientRect();return{x:e.clientX-rc.left,y:e.clientY-rc.top};}
// Bildschirmpunkt -> Feld. Hohe Türme kann man direkt antippen, sonst zählt die erste getroffene Fläche.
function pickAt(sx,sy){
  const vx=(sx-VX)/VZ,vy=(sy-VY)/VZ,gp=unproject(vx,vy,0),mk=(c,r)=>({c,r,i:idx(c,r),wx:gp.x,wy:gp.y});
  let best=null,by=-1e9;
  for(const t of S.towers){if(t.type==="wall")continue;const p=P(t.x,t.y,WH),s=p.s,hw=16*U*s;
    if(vx>p.x-hw&&vx<p.x+hw&&vy<p.y-4*U*s&&vy>p.y-60*U*s&&p.y>by){by=p.y;best=t;}}
  if(best)return mk(best.c,best.r);
  for(const z of [WH,WH*.5]){const w=unproject(vx,vy,z),c=Math.floor(w.x/T),r=Math.floor(w.y/T);
    if(c>=0&&c<COLS&&r>=0&&r<ROWS){const o=occ[idx(c,r)];if(o&&o.type!=="plan")return mk(c,r);}}
  const c=Math.floor(gp.x/T),r=Math.floor(gp.y/T);if(c<0||c>=COLS||r<0||r>=ROWS)return null;return mk(c,r);
}
function pickGround(sx,sy){const w=unproject((sx-VX)/VZ,(sy-VY)/VZ,0),c=Math.floor(w.x/T),r=Math.floor(w.y/T);
  if(c<0||c>=COLS||r<0||r>=ROWS)return null;return{c,r,i:idx(c,r)};}
// ---------- Tore, Mauer-Varianten, Fallen ----------
function setWallKind(t,k){
  const d=WK[k];if(!t||t.type!=="wall"||t.wk||!d)return;
  if(S.gold<d.cost){toast("Zu wenig Gold");beep(140,.15,"sawtooth",.03,true);return;}
  S.gold-=d.cost;t.spent+=d.cost;t.wk=k;t.open=false;blockCache.clear();if(k==="crystal")refreshStats();
  infoKey="";uiDirty=true;dust(t.x,t.y+6,10);S.parts.push({k:"ring",x:t.x,y:t.y,z:WH+1,t:0,max:.45,r:T*.8,col:k==="crystal"?"#6ff0ff":k==="thorn"?"#9be15d":"#ffd25e"});
  beep(560,.12,"triangle",.05,true);toast(d.name+" – "+d.desc);saveRun();
}
function toggleGate(t){
  if(!t||t.wk!=="gate")return;
  if(S.t-(t.gT??-99)<GATE_CD){toast("Das Tor bewegt sich noch …");return;}
  if(t.open){
    for(const e of S.enemies){if(e.air||e.dead)continue;if(e.ti===t.i||e.ci===t.i){toast("Ein Gegner steht im Tor");beep(140,.12,"sawtooth",.03,true);return;}}
    t.open=false;const d=bfs(-1);
    const bad=SPAWNS.some(s_=>d[s_]<0)||S.enemies.some(e=>!e.air&&!e.dead&&d[e.ti]<0);
    if(bad){t.open=true;toast("Zu geht nicht – dann wäre der Weg versperrt");beep(140,.12,"sawtooth",.03,true);return;}
    applyMaze(d);beep(220,.14,"square",.04,true);
  }else{t.open=true;applyMaze(bfs(-1));beep(420,.12,"triangle",.045,true);}
  t.gT=S.t;blockCache.clear();infoKey="";uiDirty=true;dust(t.x,t.y,8);
  addText(t.x,t.y,t.open?"offen":"zu",t.open?"#9ff5c2":"#ffd25e",false,WH+14);saveRun();
}
function newTrap(kind,c,r){return{type:"trap",kind,c,r,i:idx(c,r),x:(c+.5)*T,y:(r+.5)*T,spent:0,fresh:true,hitT:0};}
function removeTrap(t){trapAt[t.i]=null;const k=S.traps.indexOf(t);if(k>=0)S.traps.splice(k,1);}
const trapPrice=kind=>TRAPS[kind].cost+5*(S?S.traps.length:0);
function trapOK(i){
  if(occ[i]||rock[i]||SPAWNS.includes(i)||i===GI)return"Hier kann keine Falle liegen";
  if(zone[i])return"Schutzzone am Portal – hier darf nichts liegen";
  if(trapAt[i])return"Hier liegt schon eine Falle";
  if(S.traps.length>=TRAPMAX)return"Höchstens "+TRAPMAX+" Fallen pro Runde";
  return null;
}
function trapTap(c,r,i){
  const why=trapOK(i);
  if(S.pending&&S.pending.i===i&&S.pending.trap){if(why){toast(why);return;}buildTrap(c,r,"spike");return;}
  S.pending={c,r,i,trap:true,ok:!why,reason:why,routes:null};
  toast(why||"Nochmal tippen: Stachelfalle bauen ("+trapPrice("spike")+" Gold)");
}
function buildTrap(c,r,kind,quiet){
  const i=idx(c,r),d=TRAPS[kind],why=trapOK(i);
  if(why){if(!quiet)toast(why);return false;}
  const pr=trapPrice(kind);if(S.gold<pr){if(!quiet){toast("Zu wenig Gold");beep(140,.15,"sawtooth",.03,true);}return false;}
  S.gold-=pr;const t=newTrap(kind,c,r);t.spent=pr;t.fresh=!S.active;trapAt[i]=t;S.traps.push(t);pushUndo([t]);
  S.pending=null;uiDirty=true;dust(t.x,t.y,8);beep(380,.1,"triangle",.045,true);saveRun();return true;
}
function setTrapKind(t,kind){
  if(!t||t.type!=="trap"||t.kind===kind||!TRAPS[kind])return;
  const cost=Math.max(5,TRAPS[kind].cost-TRAPS[t.kind].cost);
  if(S.gold<cost){toast("Zu wenig Gold");return;}
  S.gold-=cost;t.spent+=cost;t.kind=kind;infoKey="";uiDirty=true;dust(t.x,t.y,8);beep(520,.1,"triangle",.045,true);toast(TRAPS[kind].name+" – "+TRAPS[kind].desc);saveRun();
}
function trapCost(t,kind){return Math.max(5,TRAPS[kind].cost-TRAPS[t.kind].cost);}
function handleTap(pk){
  const {c,r,i}=pk;
  if(S.aiming){castMeteor(pk.wx,pk.wy);return;}
  const o=occ[i],bt=S.build;
  if(o&&o.type!=="wall"){select(o);return;}
  if(o&&o.type==="wall"){
    if(bt&&bt!=="wall"&&bt!=="trap"){if(o.wk==="gate"){toast("Ein Tor kann nicht zum Turm ausgebaut werden");return;}
      if(S.sel)deselect();if(S.pending&&S.pending.i===i&&S.pending.convert)convert(o,bt);else setPending(c,r,true);return;}
    if(o.wk==="gate"&&S.active){toggleGate(o);return;} // im Kampf: Tor sofort öffnen/schließen
    select(o);return;}
  if(trapAt[i]&&bt!=="trap"){select(trapAt[i]);return;}
  if(S.sel)deselect();
  if(!bt||bt==="wall")return;
  if(bt==="trap"){trapTap(c,r,i);return;}
  if(rock[i]||SPAWNS.includes(i)||i===GI){S.pending=null;return;}
  if(S.pending&&S.pending.i===i&&!S.pending.convert){if(S.pending.ok)tryBuild(c,r,bt);else toast(S.pending.reason);}
  else setPending(c,r,false);
}
// ---------- Mauerreihe: erst planen (Vorschau), beim Loslassen bauen ----------
const PLAN={type:"plan"};
function strokeAdd(c,r){
  const i=idx(c,r),pl=S.plan;
  if(pl.length>1&&pl[pl.length-2]===i){occ[pl.pop()]=null;planChanged();return;} // Finger zurückgezogen
  if(pl.includes(i)||occ[i]||rock[i]||SPAWNS.includes(i)||i===GI)return;
  let why=null;
  if(S.gold<costOf("wall")*(pl.length+1))why="Zu wenig Gold";
  else{const v=canPlace(i);if(!v.ok)why=v.reason;}
  if(!why){occ[i]=PLAN;pl.push(i);planChanged();beep(280+Math.min(pl.length,20)*14,.05,"triangle",.03,true);return;}
  S.planBad={i,t:.45};
  if(why!==S.lastWhy||S.t-S.whyT>1.4){toast(why);S.lastWhy=why;S.whyT=S.t;beep(140,.1,"sawtooth",.025,true);}
}
function strokeTo(from,c,r){ // alle Felder auf der Linie – auch bei schnellem Wischen
  const c0=from%COLS,r0=(from/COLS)|0,n=Math.max(Math.abs(c-c0),Math.abs(r-r0));
  for(let k=1;k<=n;k++)strokeAdd(Math.round(c0+(c-c0)*k/n),Math.round(r0+(r-r0)*k/n));
}
function planChanged(){const d=bfs(-1);S.planRoutes=SPAWNS.map((s,k)=>routeFrom(d,s,PORTALS[k]));S.planLen=Math.min(...SPAWNS.map(s=>d[s]));}
function cancelStroke(){if(!S||!S.plan)return;for(const i of S.plan)if(occ[i]===PLAN)occ[i]=null;S.plan=[];S.planRoutes=null;}
function commitStroke(){
  const cells=S.plan.slice();cancelStroke();const built=[];
  for(const i of cells){if(tryBuild(i%COLS,(i/COLS)|0,"wall",true,true))built.push(occ[i]);}
  if(built.length){pushUndo(built);if(built.length>2)toast(built.length+" Mauern gebaut");}
}
// ---------- Rückgängig (nur in der Bauphase, volle Erstattung) ----------
function pushUndo(list){S.undo.push(list);if(S.undo.length>30)S.undo.shift();uiDirty=true;}
function undo(){
  if(!running()||S.active)return;const L=S.undo.pop();if(!L)return;let back=0;
  for(const t of L){if(t.type==="trap"){if(!S.traps.includes(t))continue;back+=sellVal(t);removeTrap(t);if(S.sel===t)deselect();continue;}if(!S.towers.includes(t))continue;back+=sellVal(t);occ[t.i]=null;S.towers.splice(S.towers.indexOf(t),1);dust(t.x,t.y,6);if(S.sel===t)deselect();}
  blockCache.clear();
  if(back){S.gold+=back;applyMaze(bfs(-1));const t=L[L.length-1];addText(t.x,t.y,"+"+back,"#ffd25e",true,WH+16);saveRun();beep(240,.14,"triangle",.045,true);}
  S.pending=null;uiDirty=true;
}
$("undo").addEventListener("click",undo);
// ---------- Lupe über dem Finger ----------
const loupe=$("loupe"),lpc=$("lpc"),lctx=lpc.getContext("2d");let lp=null;
function loupeOn(x,y){lp={x,y};loupe.style.display="block";loupeMove(x,y);}
function loupeMove(x,y){if(!lp)return;lp.x=x;lp.y=y;const sz=124;let lx=x-sz/2,ly=y-sz-62;if(ly<6)ly=y+48;lx=Math.max(6,Math.min(window.innerWidth-sz-6,lx));loupe.style.transform="translate("+lx+"px,"+ly+"px)";}
function loupeOff(){lp=null;loupe.style.display="none";}
function drawLoupe(){
  if(!lp)return;const n=Math.round(124*dpr);if(lpc.width!==n){lpc.width=lpc.height=n;}
  const rc=cv.getBoundingClientRect(),px=(lp.x-rc.left)*dpr,py=(lp.y-rc.top)*dpr,src=36*dpr;
  lctx.setTransform(1,0,0,1,0,0);lctx.fillStyle="#2f86e6";lctx.fillRect(0,0,n,n);
  lctx.drawImage(cv,px-src,py-src,src*2,src*2,0,0,n,n);
  lctx.strokeStyle="rgba(255,255,255,.9)";lctx.lineWidth=2*dpr;lctx.beginPath();lctx.arc(n/2,n/2,5*dpr,0,TAU);lctx.stroke();
}
// ---------- Zeiger-Ereignisse ----------
cv.addEventListener("pointerdown",e=>{
  if(!running())return;
  try{cv.setPointerCapture(e.pointerId);}catch(_){}
  const pos=cvPos(e);ptrs.set(e.pointerId,pos);
  if(ptrs.size>=2){ // zwei Finger: zoomen/verschieben – angefangene Mauerreihe verwerfen
    cancelStroke();touch=null;loupeOff();S.hover=-1;zoomAnim=null;
    const [a,b]=[...ptrs.values()];gest={d0:Math.hypot(a.x-b.x,a.y-b.y)||1,mx:(a.x+b.x)/2,my:(a.y+b.y)/2,z0:VZ,x0:VX,y0:VY};return;}
  if(gest)return;
  const pk=pickAt(pos.x,pos.y);
  touch={id:e.pointerId,sx:pos.x,sy:pos.y,x:pos.x,y:pos.y,cx:e.clientX,cy:e.clientY,moved:false,pan:false,pk,wall:false,startI:pk?pk.i:-1,lastI:pk?pk.i:-1,t0:performance.now(),lw:false};
  if(S.aiming||!pk)return;
  if(S.build==="wall"){touch.wall=true;if(!occ[pk.i]&&!trapAt[pk.i])strokeAdd(pk.c,pk.r);}
  if(S.build){S.hover=pk.i;touch.lw=true;} // Lupe erst bei Halten oder Ziehen
});
cv.addEventListener("pointermove",e=>{
  if(!ptrs.has(e.pointerId))return;
  const pos=cvPos(e);ptrs.set(e.pointerId,pos);
  if(gest){if(ptrs.size<2)return;const [a,b]=[...ptrs.values()],d=Math.hypot(a.x-b.x,a.y-b.y)||1,mx=(a.x+b.x)/2,my=(a.y+b.y)/2;
    VZ=Math.max(1,Math.min(3,gest.z0*d/gest.d0));
    const vx=(gest.mx-gest.x0)/gest.z0,vy=(gest.my-gest.y0)/gest.z0;VX=mx-vx*VZ;VY=my-vy*VZ;clampView();return;}
  if(!touch||touch.id!==e.pointerId)return;
  const dx=pos.x-touch.x,dy=pos.y-touch.y;touch.x=pos.x;touch.y=pos.y;touch.cx=e.clientX;touch.cy=e.clientY;
  if(Math.hypot(pos.x-touch.sx,pos.y-touch.sy)>9)touch.moved=true;
  if(touch.lw&&!lp&&touch.moved)loupeOn(e.clientX,e.clientY);
  if(touch.wall){strokeMove();loupeMove(e.clientX,e.clientY);return;}
  if(S.build&&!S.aiming){const pk=pickAt(pos.x,pos.y);S.hover=pk?pk.i:-1;loupeMove(e.clientX,e.clientY);return;}
  if(touch.moved&&VZ>1){touch.pan=true;zoomAnim=null;VX+=dx;VY+=dy;clampView();}
});
function strokeMove(){const g_=pickGround(touch.x,touch.y);S.hover=g_?g_.i:-1;if(g_&&g_.i!==touch.lastI){strokeTo(touch.lastI,g_.c,g_.r);touch.lastI=g_.i;}}
function ptrEnd(e,cancel){
  if(!ptrs.has(e.pointerId))return;ptrs.delete(e.pointerId);
  if(gest){if(!ptrs.size){gest=null;setQuality(false);}return;}
  if(!touch||touch.id!==e.pointerId)return;
  const tc=touch;touch=null;loupeOff();S.hover=-1;
  if(cancel||!running()){cancelStroke();return;}
  if(tc.wall){
    if(S.plan.length){commitStroke();return;}
    if(!tc.moved||tc.lastI===tc.startI){if(tc.pk&&(occ[tc.pk.i]||trapAt[tc.pk.i]))handleTap(tc.pk);}
    return;}
  if(tc.pan)return;
  const pk=tc.moved&&S.build?pickAt(tc.x,tc.y):tc.pk; // mit Lupe gezielt: Feld unter dem Finger beim Loslassen
  if(pk)handleTap(pk);
}
cv.addEventListener("pointerup",e=>ptrEnd(e,false));cv.addEventListener("pointercancel",e=>ptrEnd(e,true));
// Am Rand verschieben, während man im Zoom eine Mauerreihe zieht
function edgePan(dt){
  if(touch&&touch.lw&&!lp&&performance.now()-touch.t0>170)loupeOn(touch.cx,touch.cy);
  if(!touch||!touch.wall||VZ<=1.01)return;const m=34,sp=320*dt;let dx=0,dy=0;
  if(touch.x<m)dx=sp;else if(touch.x>CW-m)dx=-sp;if(touch.y<m)dy=sp;else if(touch.y>CH-m)dy=-sp;
  if(dx||dy){const ox=VX,oy=VY;VX+=dx;VY+=dy;clampView();if(VX!==ox||VY!==oy)strokeMove();}
}
$("bPath").addEventListener("click",()=>{
  if(!S||!S.started)return;showPath=!showPath;$("bPath").classList.toggle("on",showPath);
  toast(showPath?"Weg hervorgehoben: ≈"+pathSec(S.plan.length?S.planLen:S.pathLen)+" Sekunden":"Weg-Anzeige aus");
});
$("bTilt").addEventListener("click",()=>{
  if(!S||!S.started)return;tiltAuto=false;const b=tiltTarget?0:1;setTilt(b);
  toast(b?"Bau-Ansicht: Raster von oben":"Schau-Ansicht: schräg und plastisch");
  if(!meta.tiltTip){meta.tiltTip=1;saveMeta();setTimeout(()=>{if(running())toast("Beim Bauen kippt die Kamera von selbst");},1800);}
});
$("bZoom").addEventListener("click",()=>{
  if(!S||!S.started)return;
  if(VZ>1.05)zoomTo(1,(CW/2-VX)/VZ,(CH/2-VY)/VZ,CW/2,CH/2);
  else{let fx=CW/2,fy=CH/2;const t=S.sel||S.pending;if(t){const p=P((t.c+.5)*T,(t.r+.5)*T,0);fx=p.x;fy=p.y;}zoomTo(2,fx,fy,CW/2,CH/2);}
});
// Mausrad (Computer): zoomen um den Mauszeiger
cv.addEventListener("wheel",e=>{
  if(!running())return;e.preventDefault();const p=cvPos(e),z0=VZ,vx=(p.x-VX)/z0,vy=(p.y-VY)/z0;zoomAnim=null;
  VZ=Math.max(1,Math.min(3,VZ*Math.exp(-e.deltaY*.0018)));VX=p.x-vx*VZ;VY=p.y-vy*VZ;clampView();
  clearTimeout(cv._wq);cv._wq=setTimeout(()=>setQuality(false),200);
},{passive:false});
$("go").addEventListener("click",startWave);
$("met").addEventListener("click",()=>{
  if(!running())return;
  if(S.metCd>0){toast("Meteor lädt noch ("+Math.ceil(S.metCd)+" s)");return;}
  S.aiming=!S.aiming;S.pending=null;if(S.aiming){deselect();toast("Tippe auf das Spielfeld");}uiDirty=true;
});
$("bSpeed").addEventListener("click",()=>{S.speed=S.speed%3+1;$("bSpeed").innerHTML=S.speed+"&times;";});

// =====================================================================
//  RELIKT-AUSWAHL
// =====================================================================
function rollRelics(){
  const pool=RELICS.filter(r=>!S.rel.includes(r.id)),out=[];const boost=lv("relic");
  const w=[RAR[0].w-boost*8,RAR[1].w+boost*5,RAR[2].w+boost*3];
  while(out.length<3&&pool.length){
    let roll=Math.random()*(w[0]+w[1]+w[2]),rar=roll<w[0]?0:roll<w[0]+w[1]?1:2;
    let cand=pool.filter(r=>r.rar===rar);if(!cand.length)cand=pool;
    const pick=cand[(Math.random()*cand.length)|0];out.push(pick);pool.splice(pool.indexOf(pick),1);
  }
  return out;
}
function offerRelic(){
  S.offer=rollRelics();S.rerolled=false;if(!S.offer.length)return;
  openOv("ovRelic");beep(660,.2,"triangle",.05,true);
}
function relicHTML(r){const R_=RAR[r.rar];return '<svg class="rico" style="color:'+R_.c+'"><use href="#sRel"/></svg><div class="t"><small class="rar" style="color:'+R_.c+'">'+R_.n+'</small><b>'+r.name+'</b><small>'+r.desc+'</small></div>';}
function renderRelicOffer(){
  $("relicSub").textContent="Welle "+S.wave+" geschafft – wähle eine Belohnung für diese Runde.";
  const L=$("relicList");L.innerHTML="";
  for(const r of S.offer){const b=document.createElement("button");b.className="li relic";b.style.borderColor=RAR[r.rar].c;b.innerHTML=relicHTML(r);
    b.addEventListener("click",()=>takeRelic(r));L.appendChild(b);}
  const rb=$("bReroll");rb.innerHTML="Neu würfeln "+COIN+"25";rb.disabled=S.rerolled||S.gold<25;rb.style.opacity=rb.disabled?.45:1;
}
$("bReroll").addEventListener("click",()=>{if(S.rerolled||S.gold<25)return;S.gold-=25;S.rerolled=true;S.offer=rollRelics();renderRelicOffer();saveRun();uiDirty=true;beep(500,.12,"triangle",.04,true);});
function takeRelic(r){
  try{const A=meta.alb||(meta.alb={e:{},r:{}});A.r[r.id]=1;saveMeta();}catch(x){}
  S.rel.push(r.id);S.offer=null;
  if(r.id==="herz"){S.lives+=8;S.maxLives+=8;}
  refreshStats();buildShop();openOv(null);
  S.banner={t:0,txt:r.name,sub:r.desc,col:RAR[r.rar].c};
  if(S.rel.length>=6)ach("relic6");saveRun();uiDirty=true;beep(880,.2,"triangle",.05,true);
}
function renderOwned(){
  const L=$("ownList");L.innerHTML="";
  if(!S.rel.length)L.innerHTML='<div class="li"><div class="t"><small>Noch keine Relikte. Das erste gibt es nach Welle 5.</small></div></div>';
  for(const id of S.rel){const r=RELICS.find(x=>x.id===id);const d=document.createElement("div");d.className="li relic";d.style.borderColor=RAR[r.rar].c;d.innerHTML=relicHTML(r);L.appendChild(d);}
}
$("hRel").addEventListener("click",()=>{if(!running())return;backTo=null;openOv("ovRelics");});

// =====================================================================
//  MENÜS
// =====================================================================
let overlay="ovMenu",backTo="ovMenu",selMap=0;
function openOv(id){if(S&&S.plan&&S.plan.length)cancelStroke();touch=null;ptrs.clear();gest=null;loupeOff();document.querySelectorAll(".overlay").forEach(o=>o.classList.add("hide"));overlay=id;if(id)$(id).classList.remove("hide");
  if(id==="ovMenu")renderMenu();if(id==="ovShop")renderWorkshop();if(id==="ovAch")renderAch();if(id==="ovDiff")renderDiff();
  if(id==="ovEdition")renderEdition();
  if(id==="ovMaps")renderMaps();if(id==="ovRelic")renderRelicOffer();if(id==="ovRelics")renderOwned();if(id==="ovPause")renderBp();
  document.querySelectorAll(".gemCount").forEach(e=>e.textContent=meta.shards);document.querySelectorAll(".starCount").forEach(e=>e.textContent=totalStars());}
const running=()=>S&&S.started&&!overlay&&!S.over;
document.querySelectorAll("[data-back]").forEach(b=>b.addEventListener("click",()=>openOv(backTo)));
const TIPS=["Je länger der Weg durch dein Labyrinth, desto öfter schießen deine Türme.",
  "Mauern kosten nur 3 Gold – du kannst sie später durch Türme ersetzen.",
  "Vor Wellenstart bekommst du beim Verkaufen 100% zurück. Probier ruhig herum!",
  "Flieger ignorieren dein Labyrinth und fliegen direkt zum Kristall.",
  "Gold, das du sparst, bringt nach jeder Welle Zinsen.",
  "Ab Stufe 3 wählst du eine Spezialisierung für deinen Turm.",
  "Türme mit vielen Abschüssen werden zu Veteranen und machen mehr Schaden.",
  "Elite-Gegner leuchten golden – sie bringen dreifaches Gold und manchmal Kristallsplitter.",
  "Töte Gegner schnell hintereinander für Combo-Gold.",
  "Alle 5 Wellen wählst du ein Relikt – manche passen perfekt zusammen.",
  "Rufst du die nächste Welle früher, gibt es Bonus-Gold.",
  "Gift ignoriert die Rüstung gepanzerter Gegner.",
  "Mit zwei Fingern zoomen und verschieben – oder die Lupe oben rechts antippen.",
  "Beim Bauen kippt die Kamera steil nach oben – so siehst du das Raster klar.",
  "Mit dem Würfel-Knopf rechts wechselst du jederzeit die Ansicht.",
  "Auf Stufe 6 wählst du eine Meister-Fähigkeit – Stufe 7 ist legendär.",
  "Ein Turm auf einem goldenen Podest schießt 20% weiter.",
  "Türme auf einer Kristallader machen 25% mehr Schaden.",
  "Sumpf bremst Gegner – lass den Weg ruhig hindurchführen.",
  "Rote Windrunen machen Gegner schneller. Bau eine Mauer darauf!",
  "Falsch gebaut? Der Rückgängig-Knopf gibt dir vor der Welle alles zurück."];


// ---------- Booster: Logik ----------
const BUSE=2; // pro Runde je Booster höchstens so oft
document.querySelectorAll(".bb").forEach(b=>{const s=b.querySelector("span");if(s)s.innerHTML=BICON[b.dataset.b];});
$("bBoost").addEventListener("click",e=>{e.stopPropagation();$("boosts").classList.toggle("open");clearTimeout(window.__bt);if($("boosts").classList.contains("open"))window.__bt=setTimeout(()=>$("boosts").classList.remove("open"),5000);});
function renderBoosts(){
  const bar=$("boosts");if(!bar)return;const on=!!(S&&S.started&&!S.over&&!S.daily0);bar.classList.toggle("hide",!on);
  if(!on)return;const B=BS();
  bar.querySelectorAll(".bb").forEach(b=>{const k=b.dataset.b,n=B[k]||0,u=(S.bu&&S.bu[k])||0;b.querySelector("i").textContent=n;b.classList.toggle("zero",n<=0);b.classList.toggle("used",u>=BUSE);});
}
function useBoost(k){
  if(!S||!S.started||S.over||overlay)return;S.bu=S.bu||{};const B=BS();
  if((S.bu[k]||0)>=BUSE){toast("Pro Runde höchstens "+BUSE+"× nutzbar");return;}
  if((B[k]||0)<=0){toast("Keine Booster mehr – du verdienst neue durchs Spielen");return;}
  if(k==="ice"&&!S.enemies.length){toast("Gerade keine Gegner da");return;}
  if(k==="bomb"&&!S.enemies.some(e=>!e.air&&!e.dead)){toast("Gerade keine Bodengegner da");return;}
  B[k]--;S.bu[k]=(S.bu[k]||0)+1;saveMeta();
  if(k==="gold"){S.gold+=120;addText(CRY.x,CRY.y,"+120","#ffd25e",true,40);toast("Startgold: +120");sparks(CRY.x,CRY.y,"#ffd25e",30,200,.8,30);}
  else if(k==="life"){S.lives+=3;S.maxLives+=3;toast("Zusatzleben: +3");S.flash=Math.max(S.flash,.15);sparks(CRY.x,CRY.y,"#ff7a8a",30,200,.8,30);}
  else if(k==="ice"){for(const e of S.enemies)if(!e.dead){slowE(e,e.type==="boss"?.5:.85,4);sparks(e.x,e.y,"#bfe6ff",8,120,.6,10);}toast("Eis-Welle!");S.flash=Math.max(S.flash,.12);beep(880,.3,"triangle",.05,true);}
  else if(k==="bomb"){for(const e of S.enemies)if(!e.air&&!e.dead){damage(e,e.max*(e.type==="boss"?.12:.35),null,true);sparks(e.x,e.y,"#ffb347",14,200,.6,10);}toast("Bombe!");S.shake=Math.max(S.shake||0,.5);beep(120,.5,"sawtooth",.06,true);}
  if(S.active){
    const checkpoint=store.get("kw2_run",null);
    if(checkpoint){
      checkpoint.bu=S.bu;
      if(k==="gold")checkpoint.gold+=120;
      if(k==="life"){checkpoint.lives+=3;checkpoint.maxLives=(checkpoint.maxLives||checkpoint.lives-3)+3;}
      store.set("kw2_run",checkpoint);
    }
  }else saveRun();
  uiDirty=true;renderBoosts();$("boosts").classList.remove("open");
}
document.querySelectorAll(".bb").forEach(b=>b.addEventListener("click",e=>{e.stopPropagation();useBoost(b.dataset.b);}));
// ---------- Laden ----------
function renderLaden(){
  const B=BS();$("ladenList").innerHTML=BOL.map(([k,e,n,d])=>'<div class="bitem"><span class="bi">'+BICON[k]+'</span><div><b>'+n+'</b><small>'+d+'</small></div><em>×'+(B[k]||0)+'</em></div>').join("");

}
$("bStat").addEventListener("click",()=>{const L=Object.entries(meta.ls||{}).map(([k,o])=>{const [m,d]=k.split("_");return (MAPS[m]?MAPS[m].name:m)+" ["+DIFFN[d]+"]: "+o.t+" Versuche, "+o.w+" Siege, beste Welle "+o.bw+"/"+(MAPS[m]?MAPS[m].waves:"?")+", verlorene Leben "+o.lost+", Booster "+o.bu;});
  const txt="Kristallwacht Statistik\n"+(L.join("\n")||"noch keine Daten");try{navigator.clipboard.writeText(txt).then(()=>toast("Statistik kopiert – schick sie mir"),()=>prompt("Statistik:",txt));}catch(e){prompt("Statistik:",txt);}});
function renderAlbum(){const A=meta.alb||{e:{},r:{}},ks=Object.keys(ED).filter(k=>k!=="mini");let seen=0,rs=0;
  $("albE").innerHTML=ks.map(k=>{const n=A.e[k]||0;if(n)seen++;const im=ENI[k]&&ARTI[ENI[k]]?ARTI[ENI[k]].src:"";
    return '<div class="albc'+(n?'':' unk')+'">'+(im?'<img src="'+im+'" alt="">':'')+'<b>'+(n?ENAMES[k]||k:'???')+'</b><small>'+(n?n+' besiegt':'noch nicht gesehen')+'</small></div>';}).join("");
  $("albR").innerHTML=RELICS.map(r=>{const h=A.r[r.id];if(h)rs++;return '<div class="albr'+(h?'':' unk')+'"><b>'+(h?r.name:'???')+'</b><small>'+(h?r.desc:'noch nicht gefunden')+'</small></div>';}).join("");
  $("albSum").textContent="Gegner "+seen+"/"+ks.length+" · Relikte "+rs+"/"+RELICS.length;}
$("bAlbum").addEventListener("click",()=>{backTo="ovMenu";renderAlbum();openOv("ovAlbum");});
$("bLaden").addEventListener("click",()=>{backTo="ovMenu";renderLaden();openOv("ovLaden");});


function renderMenu(){renderBoosts();
  try{const ce=document.querySelector(".coachEmmi");if(ce&&!$("menuTipEmmi").src)$("menuTipEmmi").src=ce.src;$("menuTip").innerHTML="<b>Tipp:</b> "+TIPS[Math.floor(Math.random()*TIPS.length)];}catch(e){}
  const sv=store.get("kw2_run",null);
  const valid=sv&&MAPS[sv.map??0]&&(sv.intro||campaignAvailable());
  $("ovMenu").dataset.primary=valid?"continue":(!meta.introWon&&!Object.keys(meta.stars).length)?"prologue":"campaign";
  $("bCampaign").classList.toggle("hide",!campaignAvailable());
  $("bDaily").classList.toggle("hide",!campaignAvailable());
  $("bEdition").classList.toggle("hide",campaignAvailable());
  $("bContinue").classList.toggle("hide",!valid);
  $("bPrologue").classList.toggle("hide",!!valid||(campaignAvailable()&&(!!meta.introWon||Object.keys(meta.stars).length>0)));
  if(valid)$("bContinue").innerHTML='<svg class="ic"><use href="#sPlay"/></svg>Fortsetzen · '+(sv.intro?"Emmis erster Einsatz":sv.daily?"Tagesaufgabe":MAPS[sv.map||0].name)+' · W'+(sv.wave+1);
  const dc=dailyCfg(),done=meta.daily===dc.key;
  $("bDaily").innerHTML='<span>Tägliche Herausforderung'+(done?" ✓":"")+'</span><small>'+MAPS[dc.map].name+' · '+dc.mod.name+(done?" · heute geschafft":" · +15 Splitter")+'</small>';
}
const mapUnlocked=i=>{if(i===0||i===10)return true;if((meta.stars[i]||0)>0)return true;if(i===5)return(meta.stars[0]||0)>0;if(i===6)return(meta.stars[4]||0)>0;return(meta.stars[MORDER[MORDER.indexOf(i)-1]]||0)>0;};
function renderMaps(){
  const L=$("mapList");L.innerHTML="";
  const WORLDS=[["Das Grüne Land","g",[0,1,2,3,4,16,17,18,19,20]],["Besondere Orte","s",[6,7,8,9,21,22,23,24,25,26]],["Der Vulkan","v",[10,11,12,13,14,15,27,28,29,30]],["Endlos","e",[5]]];
  const XS=[62,150,238,150],EM="<img class=\"emmiMark\" alt=\"\" src=\"assets/bild-20.webp\">";let num=0,curDone=false;
  WORLDS.forEach(([wn,cls,ids])=>{
    const h=document.createElement("div");h.className="wh "+cls;h.textContent=wn;L.appendChild(h);
    const p=document.createElement("div");p.className="wp "+cls;const H=ids.length*104+16;p.style.height=H+"px";
    let d="";ids.forEach((i,k)=>{const x=XS[k%4],y=k*104+54;d+=(k?" L":"M")+x+" "+y;});
    p.innerHTML='<svg viewBox="0 0 300 '+H+'" preserveAspectRatio="none"><path d="'+d+'" fill="none" stroke="rgba(255,255,255,.55)" stroke-width="5" stroke-linecap="round" stroke-linejoin="round" stroke-dasharray="1 11" vector-effect="non-scaling-stroke"/></svg>';
    ids.forEach((i,k)=>{
      const m=MAPS[i],ok=mapUnlocked(i),st=meta.stars[i]||0,x=XS[k%4],y=k*104+54,endless=i===5;if(!endless)num++;
      const b=document.createElement("button");b.className="wn"+(ok?"":" locked")+(st>0?" done":"")+(ok&&!st&&!curDone&&!endless?" cur":"");
      b.style.left=(x/300*100)+"%";b.style.top=y+"px";
      b.innerHTML='<span class="wc">'+(ok?(endless?"∞":num):'<svg><use href="#sLock"/></svg>')+(ok&&!st&&!curDone&&!endless?EM:'')+'</span>'+
        (m.waves?'<span class="mstars">'+starsHTML(st)+'</span>':'')+'<small>'+m.name+'</small>';
      if(ok&&!st&&!curDone&&!endless)curDone=true;
      if(ok)b.addEventListener("click",()=>{selMap=i;backTo="ovMaps";openOv("ovDiff");});else b.disabled=true;
      p.appendChild(b);});
    L.appendChild(p);});
}
let shopTab=0;
document.querySelectorAll(".tabs button").forEach(b=>b.addEventListener("click",()=>{shopTab=+b.dataset.tab;renderWorkshop();}));
function buyMeta(id,cost){if(meta.shards<cost)return;meta.shards-=cost;meta.lv[id]=lv(id)+1;saveMeta();beep(880,.15,"triangle",.05,true);buildShop();
  document.querySelectorAll(".gemCount").forEach(e=>e.textContent=meta.shards);renderWorkshop();}
function renderResearch(L){
  for(const type of ORDER){if(type==="wall")continue;const d=TD[type],locked=d.unlock&&!lv(d.unlock);
    const row=document.createElement("div");row.className="li tres"+(locked?" locked":"");
    const ic=document.createElement("canvas");ic.width=84;ic.height=84;row.appendChild(ic);drawTowerIcon(ic,type,1,-1);
    const t=document.createElement("div");t.className="t";
    let h='<b>'+d.name+'</b>';
    if(locked)h+='<small>Zuerst unter „Allgemein“ freischalten</small>';
    else{h+='<div class="rgrid">'+RES.map(x=>{const id=rkey(type,x.k),l=lv(id),c=x.cost(l),mx=l>=x.max;
      return '<div class="rcell"><small>'+x.name+' '+x.desc+'</small><div class="pips">'+Array.from({length:x.max},(_,i)=>'<i class="'+(i<l?"on":"")+'"></i>').join("")+'</div>'+
        (mx?'<span class="rew">MAX</span>':'<button class="buy" data-id="'+id+'" data-c="'+c+'"'+(meta.shards<c?" disabled":"")+'>'+GEM+c+'</button>')+'</div>';}).join("")+'</div>';}
    t.innerHTML=h;row.appendChild(t);
    t.querySelectorAll(".buy").forEach(b=>b.addEventListener("click",()=>buyMeta(b.dataset.id,+b.dataset.c)));
    L.appendChild(row);}
}
function renderWorkshop(){
  const L=$("shopList");L.innerHTML="";
  document.querySelectorAll(".tabs button").forEach(b=>b.classList.toggle("on",+b.dataset.tab===shopTab));
  if(shopTab===1){renderResearch(L);return;}
  for(const m of META_DEF){const l=lv(m.id),max=l>=m.max,c=m.cost(l);
    const row=document.createElement("div");row.className="li"+(max?" done":"");
    let pips="";if(m.max>1){pips='<div class="pips">'+Array.from({length:m.max},(_,i)=>'<i class="'+(i<l?"on":"")+'"></i>').join("")+'</div>';}
    row.innerHTML='<div class="t"><b>'+m.name+'</b><small>'+m.desc+'</small>'+pips+'</div>'+
      (max?'<span class="rew">'+(m.max===1?"Frei ✓":"MAX")+'</span>':'<button class="buy"'+(meta.shards<c?" disabled":"")+'>'+GEM+c+'</button>');
    if(!max)row.querySelector(".buy").addEventListener("click",()=>buyMeta(m.id,c));
    L.appendChild(row);}
}
function renderAch(){
  const L=$("achList");L.innerHTML="";let n=0;
  for(const a of ACH){const d=!!meta.ach[a.id];if(d)n++;
    const row=document.createElement("div");row.className="li"+(d?" done":"");
    row.innerHTML='<svg class="tro"><use href="#sTro"/></svg><div class="t"><b>'+a.name+'</b><small>'+a.desc+'</small></div><span class="rew">'+(d?"✓ ":"")+GEM+a.r+'</span>';L.appendChild(row);}
  $("achCount").textContent=n+" von "+ACH.length+" freigeschaltet · "+meta.kills+" Gegner besiegt · "+meta.elites+" Elite";
}
const MUTS=[{id:"fast",name:"Eile",desc:"Gegner 20 % schneller",b:.3},{id:"poor",name:"Sparflamme",desc:"30 % weniger Startgold",b:.25},
  {id:"glass",name:"Glaskristall",desc:"Nur halbe Leben",b:.4},{id:"pure",name:"Reine Lehre",desc:"Nur Mauern, Pfeil und Kanone",b:.3}];
let selMuts=[];const mutBonus=()=>(S&&S.muts||[]).reduce((a,id)=>a+(MUTS.find(m=>m.id===id)||{b:0}).b,0);
function renderMuts(){const L=$("mutList");L.innerHTML="";MUTS.forEach(m=>{const on=selMuts.includes(m.id),b=document.createElement("button");b.className="mut"+(on?" on":"");
  b.innerHTML="<b>"+m.name+"</b><small>"+m.desc+"</small><em>+"+Math.round(m.b*100)+" %</em>";
  b.addEventListener("click",()=>{selMuts=on?selMuts.filter(x=>x!==m.id):[...selMuts,m.id];renderMuts();});L.appendChild(b);});}
function renderDiff(){renderMuts();
  $("diffMap").textContent=MAPS[selMap].name+" – "+(MAP_TACTICS[selMap]?.hint||"Schwerer = mehr Kristallsplitter.");
  const L=$("diffList");L.innerHTML="";
  DIFF.forEach((d,i)=>{const ok=diffUnlocked(i),b=document.createElement("button");b.className="li diff"+(ok?"":" locked");b.style.borderColor=d.col;
    const rec=meta.bestD[i]?' · Rekord: Welle '+meta.bestD[i]:'';
    b.innerHTML='<div class="t"><b style="color:'+d.col+'">'+d.name+'</b><small>'+(ok?d.desc:"Freischalten: "+d.need)+'</small><small class="dm">'+d.lives+' Leben · Splitter ×'+d.shard+rec+'</small></div>'+
      '<span class="go2">'+(ok?'<svg><use href="#sPlay"/></svg>':'<svg><use href="#sLock"/></svg>')+'</span>';
    if(ok)b.addEventListener("click",()=>startRun({map:selMap,diff:i,muts:selMuts.slice()}));else b.disabled=true;
    L.appendChild(b);});
}
const nativeStore=window.Capacitor?.getPlatform?.()==="ios"&&window.Capacitor.isPluginAvailable?.("WachtStore")
  ?window.Capacitor.registerPlugin("WachtStore"):null;
let editionOwned=false,editionPrice="",editionBusy=false;
const campaignAvailable=()=>!nativeStore||editionOwned;
function renderEdition(message){
  if(message!==undefined)$("editionStatus").textContent=message;
  $("bBuyEdition").classList.toggle("hide",editionOwned);
  $("bBuyEdition").disabled=editionBusy||!editionPrice;
  $("bBuyEdition").textContent=editionPrice?"Kaufen · "+editionPrice:"Kaufen";
  $("bRestoreEdition").disabled=editionBusy;
}
async function updateEdition(action){
  if(!nativeStore||editionBusy)return;
  editionBusy=true;
  renderEdition("Verbindung zum App Store …");
  try{
    const result=await nativeStore[action]();
    editionOwned=result.owned===true;
    editionPrice=result.price||editionPrice;
    const message=editionOwned?"Vollversion ist freigeschaltet."
      :result.pending?"Der Kauf wartet auf Bestätigung."
      :action==="restore"?"Für dieses Apple-Konto wurde kein Kauf gefunden."
      :action==="purchase"?"Kauf abgebrochen."
      :editionPrice?"":"Preis derzeit nicht verfügbar. Öffne den Shop erneut.";
    renderEdition(message);
    if(overlay==="ovMenu")renderMenu();
  }catch(error){renderEdition("App Store gerade nicht erreichbar. Versuche es erneut.");}
  finally{editionBusy=false;renderEdition();}
}
function openEdition(){
  backTo="ovMenu";openOv("ovEdition");void updateEdition("status");
}
$("bEdition").addEventListener("click",openEdition);
$("bBuyEdition").addEventListener("click",()=>void updateEdition("purchase"));
$("bRestoreEdition").addEventListener("click",()=>void updateEdition("restore"));
document.addEventListener("visibilitychange",()=>{if(!document.hidden)void updateEdition("status");});
let lastCfg=null;
function startRun(cfg){
  if(!cfg.intro&&!campaignAvailable()){openEdition();return;}
  if(cfg.intro)cfg={...cfg,referenceLayout:2};
  lastCfg=cfg;reset(cfg);store.del("kw2_run");S.started=true;
  S.muts=(!cfg.daily&&cfg.muts)||[];
  S.dailyKey=cfg.daily?dailyCfg().key:null;
  if(S.intro){
    S.gold+=120;
    const path=[[0,2],[4,2],[4,3],[8,3],[8,4],[13,4],[13,6],[10,6],[10,8],[15,8],[15,9],[16,9]];
    const lane=new Set();
    for(let i=1;i<path.length;i++){
      let [x,y]=path[i-1];const [ex,ey]=path[i];
      lane.add(idx(COLS-1-y,x));
      while(x!==ex||y!==ey){x+=Math.sign(ex-x);y+=Math.sign(ey-y);lane.add(idx(COLS-1-y,x));}
    }
    const towers=[[5,6,"arrow"],[5,12,"cannon"]];
    const reserved=new Set(towers.map(([c,r])=>idx(c,r)));
    for(const i of lane){
      const c=i%COLS,r=(i/COLS)|0;
      for(const [cc,rr] of [[c-1,r],[c+1,r],[c,r-1],[c,r+1]]){
        const n=idx(cc,rr);
        if(cc<0||cc>=COLS||rr<0||rr>=ROWS||lane.has(n)||reserved.has(n)||zone[n]||occ[n])continue;
        const t=newTower("wall",cc,rr);t.fresh=false;occ[n]=t;S.towers.push(t);
      }
    }
    for(const [c,r,type] of towers){
      const t=newTower(type,c,r);t.fresh=false;occ[t.i]=t;S.towers.push(t);
    }
    applyMaze(bfs(-1));
    S.undo=[];
  }
  if(MAP.garden){
    const rows=[[3,3],[4,3],[5,3],[6,3],[3,4],[3,5],[2,5],[6,9],[7,9],[8,9],[6,10],[6,11],[5,11],[2,11],[2,12],[2,13],[0,13],[1,13],[3,13],[7,13],[8,13],[9,13],[10,13]];
    for(const [c,r,type="wall"] of [...rows,[0,5,"arrow"],[10,5,"cannon"]]){
      const t=newTower(type,c,r);t.fresh=false;occ[t.i]=t;S.towers.push(t);
    }
    applyMaze(bfs(-1));
  }
  if(S.muts.includes("poor"))S.gold=Math.round(S.gold*.7);
  if(S.muts.includes("glass")){S.lives=Math.ceil(S.lives/2);S.maxLives=S.lives;}openOv(null);buildShop();uiDirty=true;resetView();fit();
  S.banner={t:0,txt:cfg.daily?"Tagesaufgabe":MAP.name,sub:cfg.daily?MODS.find(m=>m.id===cfg.mod).name+": "+MODS.find(m=>m.id===cfg.mod).desc:tacticalHint(),col:"#ffd25e"};
  setTimeout(()=>{if(S&&S.started&&!S.towers.length)toast("Baue mit Mauern ein Labyrinth!");},2200);
  if(MAP.tiles)setTimeout(()=>{if(S&&S.started&&S.wave===0)toast("Gold = Podest · Türkis = Kristallader");},4300);
  if(MAP.tiles)setTimeout(()=>{if(S&&S.started&&S.wave===0)toast(MAP.tiles.ei?"Rot = Windrune: Gegner werden schneller":"Dunkel = Sumpf: Gegner werden langsamer");},6400);
  if(MAP_TACTICS[S.map])setTimeout(()=>{if(S&&S.started&&S.wave===0)toast(tacticalHint());},1200);
  if(!cfg.intro&&(meta.mazeTips||0)<2){meta.mazeTips=(meta.mazeTips||0)+1;saveMeta();
    setTimeout(()=>{if(S&&S.started&&S.wave===0)toast("Neu: Mauer antippen → Tor, Dornen oder Kristall");},8700);
    setTimeout(()=>{if(S&&S.started&&S.wave===0)toast("Neu: Fallen liegen auf dem Weg und blockieren nicht");},10500);}
  saveRun();
  beep(440,.2,"triangle",.05,true);
}
function continueRun(){
  if(!campaignAvailable()&&!store.get("kw2_run",null)?.intro){openEdition();return;}
  if(!loadRun()){toast("Dieser Spielstand lässt sich nicht laden.");return;}
  S.started=true;openOv(S.offer?"ovRelic":null);buildShop();uiDirty=true;resetView();fit();
  lastCfg={map:S.map,diff:S.diff,daily:S.daily,mod:S.mod,muts:S.muts,intro:S.intro,referenceLayout};
}
$("bGarden").addEventListener("click",()=>{selMap=gardenIndex;backTo="ovMenu";openOv("ovDiff");});
$("bPrologue").addEventListener("click",()=>startRun({map:0,diff:0,intro:true}));
$("bCampaign").addEventListener("click",()=>{backTo="ovMenu";openOv("ovMaps");});
$("bDaily").addEventListener("click",()=>{const dc=dailyCfg();startRun({map:dc.map,diff:1,daily:true,mod:dc.mod.id});});
$("bContinue").addEventListener("click",continueRun);
$("bShop").addEventListener("click",()=>{backTo="ovMenu";openOv("ovShop");});
$("bAch").addEventListener("click",()=>{backTo="ovMenu";openOv("ovAch");});
$("bPause").addEventListener("click",()=>{if(running())openOv("ovPause");});
$("bResume").addEventListener("click",()=>openOv(null));
// ---------- Baupläne: Labyrinth je Karte speichern und wieder aufbauen ----------
const bpKey=()=>S.daily?null:String(S.map);
function bpSave(){
  const k=bpKey();if(!k){toast("In der Tagesaufgabe gibt es keine Baupläne");return;}
  const list=S.towers.filter(t=>t.type==="wall").map(t=>[t.c,t.r,t.wk||0]);
  if(!list.length){toast("Noch keine Mauern – erst bauen, dann speichern");return;}
  meta.bp=meta.bp||{};meta.bp[k]={g:COLS+"x"+ROWS,w:list};saveMeta();renderBp();toast("Bauplan gespeichert: "+list.length+" Mauern");
}
function bpData(){const k=bpKey(),b=k&&meta.bp&&meta.bp[k];return b&&b.g===COLS+"x"+ROWS?b:null;}
function bpBuild(){
  const b=bpData();if(!b){toast("Für diese Karte gibt es noch keinen Bauplan");return;}
  openOv(null);let built=[],todo=0;
  for(const [c,r,wk] of b.w){const i=idx(c,r),o=occ[i];
    if(o&&o.type==="wall"){if(wk&&!o.wk&&WK[wk]&&S.gold>=WK[wk].cost){S.gold-=WK[wk].cost;o.spent+=WK[wk].cost;o.wk=wk;}else if(wk&&!o.wk)todo++;continue;}
    if(o||trapAt[i]){continue;}
    if(S.gold<costOf("wall")){todo++;continue;}
    if(!tryBuild(c,r,"wall",true,true)){continue;}
    const t=occ[i];built.push(t);
    if(wk&&WK[wk]){if(S.gold>=WK[wk].cost){S.gold-=WK[wk].cost;t.spent+=WK[wk].cost;t.wk=wk;}else todo++;}}
  if(built.length)pushUndo(built);blockCache.clear();refreshStats();applyMaze(bfs(-1));uiDirty=true;saveRun();
  toast(built.length?"Bauplan: "+built.length+" Mauern gebaut"+(todo?" – den Rest baust du später mit mehr Gold":""):todo?"Zu wenig Gold für den Bauplan":"Der Bauplan steht schon");
  if(built.length)beep(520,.15,"triangle",.05,true);
}
function renderBp(){const b=$("bBpLoad");if(!b||!S)return;const d=bpData();b.disabled=!d;b.textContent=d?"📐 Bauplan aufbauen ("+d.w.length+")":"📐 Kein Bauplan";}
$("bBpSave").addEventListener("click",bpSave);$("bBpLoad").addEventListener("click",bpBuild);
function applyOne(){document.body.classList.toggle("onehand",!!meta.one);const b=$("bOne");if(b)b.textContent="Einhand-Modus: "+(meta.one?"an":"aus");}
async function shareMaze(){try{
  const cv=$("cv"),txt="Mein Labyrinth in Kristallwacht – "+MAP.name+": Weg "+Math.round(S.pathLen)+" Felder (≈"+pathSec(S.pathLen)+" s)"+(S.wave?", Welle "+S.wave:"")+".";
  const blob=await new Promise(r=>cv.toBlob(r,"image/png"));const file=new File([blob],"kristallwacht-labyrinth.png",{type:"image/png"});
  if(navigator.canShare&&navigator.canShare({files:[file]})){await navigator.share({files:[file],text:txt});return;}
  if(navigator.share){await navigator.share({text:txt});return;}
  const a=document.createElement("a");a.href=URL.createObjectURL(blob);a.download="kristallwacht-labyrinth.png";a.click();toast("Bild gespeichert");
}catch(x){if(!(x&&x.name==="AbortError"))toast("Teilen hat nicht geklappt");}}
function renderSound(){applyOne();$("bSound").textContent="Effekte: "+(meta.sound?"an":"aus");$("bMusic").textContent="Musik: "+(meta.music?"an":"aus");$("bAuto").textContent="Auto-Wellen: "+(meta.auto?"an":"aus");}
$("bSound").addEventListener("click",()=>{meta.sound=!meta.sound;saveMeta();renderSound();});
$("bMusic").addEventListener("click",()=>{meta.music=!meta.music;musT=0;musMode="";saveMeta();renderSound();});
$("bAuto").addEventListener("click",()=>{meta.auto=!meta.auto;saveMeta();renderSound();});
$("bOne").addEventListener("click",()=>{meta.one=!meta.one;saveMeta();renderSound();});
$("bShare").addEventListener("click",shareMaze);$("bShare2").addEventListener("click",shareMaze);
applyOne();
$("coachX").addEventListener("click",()=>{meta.tut=9;saveMeta();$("coach").classList.add("hide");});
$("bMenu").addEventListener("click",()=>{S.started=false;saveMeta();openOv("ovMenu");});
$("bAgain").addEventListener("click",()=>startRun(lastCfg||{map:S.map,diff:S.diff}));
$("bOverShop").addEventListener("click",()=>{backTo="ovOver";openOv("ovShop");});
$("bOverMenu").addEventListener("click",()=>{S.started=false;openOv("ovMenu");});
$("bWinNext").addEventListener("click",()=>{S.started=false;store.del("kw2_run");backTo="ovMenu";if(S.intro&&!campaignAvailable())openEdition();else openOv(S.daily?"ovMenu":"ovMaps");});
$("bEndless").addEventListener("click",()=>{S.endless=true;S.over=false;openOv(null);saveRun();uiDirty=true;toast("Endlos-Modus – wie weit kommst du?");});
document.addEventListener("visibilitychange",()=>{if(document.hidden){saveMeta();cancelStroke();saveRun();if(running()&&S.active)openOv("ovPause");}});

// =====================================================================
//  EFFEKTE
// =====================================================================
function sparks(x,y,col,n,spd=110,max=.5,z=8){for(let i=0;i<n;i++){const a=Math.random()*TAU,v=spd*(.3+Math.random()*.7),u=Math.random();S.parts.push({k:"spark",x,y,z,vx:Math.cos(a)*v*(1-u*.5),vy:Math.sin(a)*v*(1-u*.5),vz:(u*.9+.1)*v*.9,t:0,max:max*(.5+Math.random()*.6),r:1.3+Math.random()*1.6,col,gr:150});}}
function debris(x,y,col,n,z=6){for(let i=0;i<n;i++){const a=Math.random()*TAU,v=40+Math.random()*90;S.parts.push({k:"debris",x,y,z,vx:Math.cos(a)*v,vy:Math.sin(a)*v,vz:70+Math.random()*120,t:0,max:.7+Math.random()*.5,r:1.6+Math.random()*2,col,gr:420,bounce:1});}}
function smoke(x,y,n,r=7,z=6){for(let i=0;i<n;i++)S.parts.push({k:"smoke",x:x+(Math.random()-.5)*10,y:y+(Math.random()-.5)*8,z,vx:(Math.random()-.5)*20,vy:(Math.random()-.5)*14,vz:14+Math.random()*24,t:0,max:.7+Math.random()*.6,r:r*(.6+Math.random()*.6)});}
function dust(x,y,n){for(let i=0;i<n;i++){const a=Math.random()*TAU,v=20+Math.random()*50;S.parts.push({k:"smoke",x,y,z:2,vx:Math.cos(a)*v,vy:Math.sin(a)*v,vz:6+Math.random()*10,t:0,max:.5+Math.random()*.3,r:3.5+Math.random()*3.5,tone:1});}}
function spikes(x,y,rad,n){for(let i=0;i<n;i++){const a=Math.random()*TAU,d=Math.sqrt(Math.random())*rad;S.parts.push({k:"spike",x:x+Math.cos(a)*d,y:y+Math.sin(a)*d,t:-Math.random()*.08,max:.5+Math.random()*.15,h:9+Math.random()*9});}}
function addText(x,y,txt,col,big,z){S.texts.push({x,y,z:z==null?30:z,txt,col,t:0,big});}
function stepParts(dt){
  for(const p of S.parts){p.t+=dt;p.x+=(p.vx||0)*dt;p.y+=(p.vy||0)*dt;
    if(p.z!=null){p.z+=(p.vz||0)*dt;if(p.gr)p.vz-=p.gr*dt;
      if(p.z<0){p.z=0;if(p.bounce&&p.vz<-30){p.vz*=-.38;p.vx*=.55;p.vy*=.55;}else{p.vz=0;p.vx*=.8;p.vy*=.8;}}}
    if(p.k==="spark"||p.k==="smoke"){p.vx*=.93;p.vy*=.93;if(p.k==="smoke")p.vz*=.97;}}
  S.parts=S.parts.filter(p=>p.t<p.max);if(S.parts.length>650)S.parts.splice(0,S.parts.length-650);
}
// kleine Effekte, während ein Turm seinen Angriff auflädt
function windFx(t,TZ){
  const w=t.wind,r=Math.random();
  if(t.type==="cannon"){if(w>.3&&r<.35){const bx=t.x-Math.cos(t.ang)*6*U,by=t.y-Math.sin(t.ang)*6*U;S.parts.push({k:"spark",x:bx,y:by,z:TZ+3,vx:(Math.random()-.5)*30,vy:(Math.random()-.5)*30,vz:40+Math.random()*30,t:0,max:.3,r:1.4,col:"#ffcf6a",gr:120});}}
  else if(t.type==="frost"){if(r<.3){const a=Math.random()*TAU;S.parts.push({k:"spark",x:t.x+Math.cos(a)*12,y:t.y+Math.sin(a)*12,z:WH+6,vx:-Math.sin(a)*20,vy:Math.cos(a)*20,vz:50+w*40,t:0,max:.5,r:1.6,col:"#cfeeff"});}}
  else if(t.type==="tesla"){if(r<.3*w)S.parts.push({k:"spark",x:t.x+(Math.random()-.5)*10,y:t.y+(Math.random()-.5)*10,z:artZ(TOPY-24)+(Math.random()-.5)*8,vx:0,vy:0,vz:0,t:0,max:.15,r:1.8,col:"#e6c4ff"});}
  else if(t.type==="poison"){if(r<.25*w)S.parts.push({k:"spark",x:t.x+(Math.random()-.5)*8,y:t.y+(Math.random()-.5)*8,z:artZ(TOPY-7),vx:0,vy:0,vz:30,t:0,max:.4,r:2,col:"#b8ff7a"});}
}

// =====================================================================
//  KAMPF
// =====================================================================
function spawnEnemy(type,w,from,sp){
  const _e=spawnEnemy0(type,w,from,sp);try{const e=S.enemies[S.enemies.length-1];if(e&&e.type==="burrow"&&!e.trav){e.bur=true;e.trav=0;}}catch(x){}return _e;}
function spawnEnemy0(type,w,from,sp){
  const d=ED[type],D_=DF();let hp;
  if(type==="mini")hp=from.max*.3;else hp=d.hp*hpMult(w)*D_.hp*(MAP.hp||1);
  const P=PORTALS[(sp||0)%PORTALS.length],si=SPAWNS[(sp||0)%SPAWNS.length];
  const e={type,hp,max:hp,spd:d.spd*D_.spd*spdMult(w)*(S.mod==="turbo"?1.25:1),rew:Math.max(1,Math.round(d.rew*(1+w*.03)*goldMul())),r:d.r,col:d.col,dmg:d.dmg,armor:(d.armor||0)*(1+w*.08),air:!!d.air,
    x:P.ex,y:P.ey,bx:P.ex,by:P.ey,ax:P.ex,ay:P.ey,ap:0,ti:si,ci:-1,dir:P.dir.slice(),face:1,rem:9999,slowF:0,slowT:0,stunT:0,poisonT:0,poisonDps:0,burnT:0,burnDps:0,brittleT:0,brittle:0,acidT:0,
    plague:false,hit:0,dead:false,ph:Math.random()*TAU,healT:1,w,ox:(Math.random()-.5)*T*.3,oy:(Math.random()-.5)*T*.22,shield:0,shieldMax:0,elite:null};
  if(from){e.x=from.x+(Math.random()-.5)*8;e.y=from.y+(Math.random()-.5)*8;e.ti=from.ti;e.ci=from.ci;e.dir=from.dir.slice();e.face=from.face;e.bx=null;}
  else if(type!=="boss"){
    const ch=S.mod==="elite"?(w>=3?.3+w*.005:0):(w>=6?Math.min(.25,.03+w*.006):0);
    if(Math.random()<ch){const a=AFFIX[(Math.random()*AFFIX.length)|0];e.elite=a.id;e.hp*=1.6;e.rew*=3;
      if(a.id==="giant"){e.hp*=2.2;e.r*=1.35;}if(a.id==="swift")e.spd*=1.45;e.max=e.hp;if(a.id==="shield"){e.shield=e.shieldMax=e.max*.5;}}
  }
  if(S.muts&&S.muts.includes("fast"))e.spd*=1.2;
  if(S.diff>=1&&type!=="mini"){const f=(1+Math.max(0,w-4)*.03)*(type==="boss"?1.3:1);e.hp*=f;e.max*=f;}
  S.enemies.push(e);return e;
}
function slowE(e,f,dur){if(f>=e.slowF||e.slowT<=0)e.slowF=f;e.slowT=Math.max(e.slowT,dur);}
function damage(e,amt,src,pure){
  if(e.dead||e.bur)return;let dm=amt;
  if(src&&src.st&&src.st.luck&&Math.random()<src.st.luck){dm*=3;if(Math.random()<.3)addText(e.x,e.y,"Glück!","#7ef0a0",false,ez(e)+e.r+16);}
  if(!pure){const a=e.acidT>0?0:e.armor*(has("brecher")?.5:1);dm=Math.max(dm*.3,dm-a);e.hit=.08;}
  if(e.brittleT>0)dm*=1+e.brittle;
  if(e.bx!=null){const dd=Math.hypot(e.x-e.bx,e.y-e.by)/T;if(dd<ANL)dm*=.45+.55*dd/ANL;}
  if(e.shield>0){const s=Math.min(e.shield,dm);e.shield-=s;dm-=s;if(e.shield<=0){sparks(e.x,e.y,"#8fd3ff",14,110,.45,ez(e));beep(1800,.12,"triangle",.03,true);}}
  if(src&&src.st)src.dmgDone=(src.dmgDone||0)+Math.min(dm,Math.max(0,e.hp));
  e.hp-=dm;if(e.hp<=0)kill(e,src);
  else if(src&&src.st&&src.st.execute&&e.type!=="boss"&&e.hp<e.max*src.st.execute){addText(e.x,e.y,"Hingerichtet!","#ff6b6b",true,ez(e)+e.r+18);kill(e,src);}
}
let coinN=0;
function flyCoin(x,y,z){
  if(coinN>12)return;const cp_=toClient(x,y,z==null?14:z),tg=$("hGold").getBoundingClientRect();
  const sx=cp_.x,sy=cp_.y,dx=tg.left+6-sx,dy=tg.top+8-sy;
  const el=document.createElement("div");el.className="fcoin";document.body.appendChild(el);coinN++;
  const a=el.animate([{transform:"translate("+sx+"px,"+sy+"px) scale(.5)"},{transform:"translate("+(sx+dx*.25+(Math.random()-.5)*40)+"px,"+(sy-30)+"px) scale(1.1)",offset:.3},
    {transform:"translate("+(sx+dx)+"px,"+(sy+dy)+"px) scale(.7)"}],{duration:620+Math.random()*120,easing:"cubic-bezier(.45,0,.75,.5)"});
  a.onfinish=()=>{el.remove();coinN--;const c=$("hGold").parentElement;c.classList.remove("bump");void c.offsetWidth;c.classList.add("bump");sfx.coin();};
}
function kill(e,src){
  try{const A=meta.alb||(meta.alb={e:{},r:{}});const k=e.type==="mini"?"splitter":e.type;A.e[k]=(A.e[k]||0)+1;}catch(x){}
  e.dead=true;let gold=Math.max(1,Math.round(e.rew*(src&&src.st?src.st.bounty:1)))+(has("kopfgeld")?1:0);
  if(e.elite&&has("schatz"))gold*=2;
  S.gold+=gold;addText(e.x,e.y,"+"+gold,e.elite?"#ffe27a":"#ffd25e",false,ez(e)+e.r+8);flyCoin(e.x+(e.ox||0),e.y+(e.oy||0),ez(e));
  if(e.elite){S.slowmo=Math.max(S.slowmo,.18);S.flash=Math.max(S.flash,.18);}
  meta.kills++;if(meta.kills>=1000)ach("k1000");
  // Veteranen
  if(src&&src.st){const before=rankOf(src);src.kills+=has("drill")?2:1;const after=rankOf(src);
    if(after>before){src.st=tstats(src);addText(src.x,src.y,VETN[after]+"!","#ffe27a",true,artZ(-44));sparks(src.x,src.y,"#ffd25e",16,90,.6,artZ(TOPY));if(after>=3)ach("vet3");infoKey="";}}
  // Combo
  if(S.t-S.comboT<1.5)S.combo++;else S.combo=1;S.comboT=S.t;
  if(S.combo>S.bestCombo)S.bestCombo=S.combo;if(S.combo>=30)ach("combo30");
  if(S.combo>=10&&S.combo%10===0){const b=Math.floor(S.combo/2);S.gold+=b;addText(W/2,H*.3,"COMBO ×"+S.combo+"  +"+b+" Gold","#ff9f43",true,50);beep(1000,.12,"triangle",.05,true);}
  // Elite
  if(e.elite){meta.elites++;if(meta.elites>=50)ach("elite50");
    if(Math.random()<(has("schatz")?.4:.2)){meta.shards+=1;addText(e.x,e.y,"+1 Kristallsplitter","#9ff5e2",true,ez(e)+e.r+22);sparks(e.x,e.y,"#5ee0c8",14,120,.6,ez(e));}}
  const boss=e.type==="boss";
  const zc=ez(e);sparks(e.x,e.y,e.col,boss?50:12,boss?220:120,.5,zc);debris(e.x,e.y,e.col,boss?20:6,zc);smoke(e.x,e.y,boss?8:2,boss?14:6,zc);
  S.parts.push({k:"flash",x:e.x,y:e.y,z:zc,t:0,max:boss?.5:.16,r:boss?90:e.r*2.4,col:e.col});
  if(boss){S.bosses++;ach("boss");S.shake=.6;S.slowmo=.9;S.flash=.7;sfx.boom(true);for(let k=0;k<6;k++)setTimeout(()=>flyCoin(e.x+(Math.random()-.5)*30,e.y+(Math.random()-.5)*30),k*70);S.parts.push({k:"ring",x:e.x,y:e.y,t:0,max:.6,r:T*2.2,col:"#ffd25e"});}
  if(e.type==="splitter"){for(let k=0;k<2;k++)spawnEnemy("mini",e.w,e);}
  if(e.plague&&e.poisonT>0){for(const o of S.enemies){if(o.dead||o===e)continue;if((o.x-e.x)**2+(o.y-e.y)**2<((e.plagueR||1.3)*T)**2){o.poisonT=Math.max(o.poisonT,e.poisonT+1);o.poisonDps=Math.max(o.poisonDps,e.poisonDps);o.plague=true;o.plagueR=e.plagueR;}}}
  if(has("kette")){S.parts.push({k:"ring",x:e.x,y:e.y,t:0,max:.3,r:T*1.1,col:"#ff9f43"});
    for(const o of S.enemies){if(o.dead||o===e)continue;if((o.x-e.x)**2+(o.y-e.y)**2<(1.1*T)**2)damage(o,e.max*.2,null,true);}}
  if(!boss)sfx.pop();uiDirty=true;
}
function leak(e){
  e.dead=true;S.lives=Math.max(0,S.lives-e.dmg);S.lost+=e.dmg;uiDirty=true;S.cryHit=.5;S.combo=0;
  sparks(CRY.x,CRY.y,"#ff5d6c",20,150,.5,30);S.parts.push({k:"ring",x:CRY.x,y:CRY.y,t:0,max:.4,r:T,col:"#ff5d6c"});
  sfx.leak();S.shake=.35;S.hurt=.6;if(S.lives<=0)gameOver();
}
function findTargets(t,st,n){
  const r2=st.range*st.range,c=[];
  for(const e of S.enemies){if(e.dead||e.bur||(e.air?!st.air:!st.ground))continue;const d2=(e.x-t.x)**2+(e.y-t.y)**2;if(d2<=r2){e._d=d2;c.push(e);}}
  if(c.length<=1)return c;
  if(t.mode===0)c.sort((a,b)=>a.rem-b.rem);else if(t.mode===1)c.sort((a,b)=>b.hp-a.hp);else c.sort((a,b)=>a._d-b._d);
  return c.slice(0,n);
}
function applyHit(p,e){
  let d=p.dmg;if(e.air)d*=p.airMul||1;
  if(p.crit&&Math.random()<p.crit){d*=p.critMul||3;addText(e.x,e.y,"KRITISCH!","#ff6b6b",false,ez(e)+e.r+14);}
  damage(e,d,p.src);if(e.dead)return;
  e.kb=Math.max(e.kb||0,p.type==="cannon"?.16:.1);
  if(p.stun&&Math.random()<p.stun)e.stunT=Math.max(e.stunT,(p.stunT||.5)*(e.type==="boss"?.4:1));
  if(p.slow){slowE(e,p.slow,p.slowT);if(p.brittle){e.brittle=p.brittle;e.brittleT=p.slowT;}}
  if(p.dot){e.poisonDps=Math.max(e.poisonT>0?e.poisonDps:0,p.dot);e.poisonT=p.dotT;if(p.plague){e.plague=true;e.plagueR=p.plagueR||1.3;}
    if(p.acid){e.acidT=p.dotT;if(p.acidBrittle){e.brittle=Math.max(e.brittleT>0?e.brittle:0,p.acidBrittle);e.brittleT=Math.max(e.brittleT,p.dotT);}}}
  if(p.burn){e.burnDps=Math.max(e.burnT>0?e.burnDps:0,p.burn);e.burnT=2.5;}
}
function hit(p){
  if(p.splash){
    for(const e of S.enemies){if(e.dead||(e.air?!p.air:!p.ground))continue;if((e.x-p.x)**2+(e.y-p.y)**2<=(p.splash+e.r)**2)applyHit(p,e);}
    if(p.type==="frost"){S.parts.push({k:"ring",x:p.x,y:p.y,z:1,t:0,max:.35,r:p.splash,col:"#bfe8ff"});spikes(p.x,p.y,p.splash*.7,4+Math.round(p.splash/T*3));
      for(let i=0;i<8;i++){const a=Math.random()*TAU,v=30+Math.random()*60;S.parts.push({k:"flake",x:p.x,y:p.y,z:4,vx:Math.cos(a)*v,vy:Math.sin(a)*v,vz:30+Math.random()*50,gr:90,t:0,max:.5+Math.random()*.3,r:1.4+Math.random()*1.4});}
      burst(p.x,p.y,5,p.splash*.6,"#bfe8ff",6);sfx.hit("ice",p.lv);}
    else if(p.type==="poison"){S.parts.push({k:"ring",x:p.x,y:p.y,z:1,t:0,max:.3,r:p.splash,col:p.acid?"#ffe46b":"#9be15d"});
      debris(p.x,p.y,p.acid?"#ffe46b":"#8ee04a",6,3);burst(p.x,p.y,4,p.splash*.7,p.acid?"#ffe46b":"#9be15d",7);sfx.hit("splash",p.lv,p.acid);S.decals.push({x:p.x,y:p.y,r:p.splash*.8,t:0,max:2.2,kind:"poison"});}
    else{S.parts.push({k:"flash",x:p.x,y:p.y,z:6,t:0,max:.22,r:p.splash*1.3,col:p.burn?"#ff6a2a":"#ffb347"});
      S.parts.push({k:"ring",x:p.x,y:p.y,z:1,t:0,max:.3,r:p.splash,col:"#ffcf8a"});
      sparks(p.x,p.y,"#ffb347",14,140,.45,5);smoke(p.x,p.y,4,9,4);debris(p.x,p.y,"#7a5a36",5,3);burst(p.x,p.y,7,p.splash*.85,p.burn?"#ff8a3a":"#ffcf6a",9,.24);sfx.hit("boom",p.lv,p.burn);S.shake=Math.max(S.shake,.08);
      S.decals.push({x:p.x,y:p.y,r:p.splash*.6,t:0,max:4,fire:!!p.burn});}
    if(p.pool){if(S.pools.length>24)S.pools.shift();S.pools.push({x:p.x,y:p.y,r:p.pool.r,dps:p.pool.dps,t:0,max:p.pool.t,kind:p.pool.kind,src:p.src});}
  }else if(p.target&&!p.target.dead){applyHit(p,p.target);sparks(p.x,p.y,"#fff2c0",3,70,.22,p.z);burst(p.x,p.y,p.z,8,p.dot?"#b8ff7a":"#fff2c0",6,.14);sfx.hit("arrow",p.lv);}
}
function castMeteor(x,y){S.aiming=false;S.metCd=metMax();S.meteors.push({x,y,t:0});uiDirty=true;beep(220,.6,"sawtooth",.04,true);}
function updateMeteors(dt){
  for(const m of S.meteors){m.t+=dt;
    if(m.t>=.6&&!m.done){m.done=true;const dmg=40*hpMult(Math.max(1,S.wave))*(1+.25*lv("meteor")),rad=1.7*T;let n=0;
      for(const e of S.enemies){if(e.dead)continue;if((e.x-m.x)**2+(e.y-m.y)**2<=(rad+e.r)**2){damage(e,dmg,null,true);n++;}}
      if(n>=10)ach("meteor10");
      S.parts.push({k:"flash",x:m.x,y:m.y,z:10,t:0,max:.45,r:rad*1.6,col:"#ff7a2a"});S.parts.push({k:"ring",x:m.x,y:m.y,t:0,max:.5,r:rad,col:"#ffd27a"});
      sparks(m.x,m.y,"#ffb347",40,240,.7);debris(m.x,m.y,"#5a3a20",14);smoke(m.x,m.y,10,14);S.decals.push({x:m.x,y:m.y,r:rad*.7,t:0,max:6,fire:true});
      S.shake=.55;S.flash=.35;S.slowmo=.25;sfx.boom(true);}
  }
  S.meteors=S.meteors.filter(m=>m.t<.9);
}
function moveGround(e,v){
  let mv=v,guard=0;
  while(mv>0&&guard++<6){
    const tx=cx(e.ti),ty=cy(e.ti),dx=tx-e.x,dy=ty-e.y,dist=Math.hypot(dx,dy);
    if(dist<=mv){e.x=tx;e.y=ty;mv-=dist;
      if(e.ti===GI){leak(e);return;}
      const n=nextCell(e.type==="smart"&&S.DS?S.DS:S.D,e.ti,e.dir);if(n<0){mv=0;break;}
      e.dir=[n%COLS-e.ti%COLS,((n/COLS)|0)-((e.ti/COLS)|0)];if(e.dir[0])e.face=e.dir[0];e.ci=e.ti;e.ti=n;
    }else{e.x+=dx/dist*mv;e.y+=dy/dist*mv;if(Math.abs(dx)>1)e.face=Math.sign(dx);mv=0;}
  }
  e.rem=(S.D[e.ti]>=0?S.D[e.ti]:99)*T+Math.hypot(cx(e.ti)-e.x,cy(e.ti)-e.y);
}
function thornNear(c,r){let n=0;for(const [dx,dy] of [[1,0],[-1,0],[0,1],[0,-1]]){const nc=c+dx,nr=r+dy;if(nc<0||nc>=COLS||nr<0||nr>=ROWS)continue;const o=occ[idx(nc,nr)];if(o&&o.wk==="thorn")n++;}return n;}
function wallNear(e){
  const c=Math.floor(e.x/T),r=Math.floor(e.y/T);let n=0;
  for(const [dx,dy] of [[1,0],[-1,0],[0,1],[0,-1]]){const nc=c+dx,nr=r+dy;if(nc<0||nc>=COLS||nr<0||nr>=ROWS)continue;const o=occ[idx(nc,nr)];if(o&&o.type==="wall")n++;}
  return n;
}
const COMBOS=[{a:"cannon",b:"frost",name:"Frostbruch",txt:"Kanone +30 % Schaden",to:"cannon",dmg:1.3},
  {a:"tesla",b:"poison",name:"Ätzblitz",txt:"Blitz +30 % Schaden",to:"tesla",dmg:1.3},
  {a:"arrow",b:"arrow",name:"Salve",txt:"Pfeil +15 % Tempo",to:"arrow",rate:1.15},
  {a:"sniper",b:"frost",name:"Eiskalter Blick",txt:"Schütze +25 % Schaden",to:"sniper",dmg:1.25},
  {a:"poison",b:"cannon",name:"Giftwolke",txt:"Gift +30 % Giftschaden",to:"poison",dot:1.3},
  {a:"frost",b:"tesla",name:"Supraleiter",txt:"Frost +20 % Reichweite",to:"frost",range:1.2}];
function applyCombos(){if(!S||!S.towers)return;const TS=S.towers.filter(t=>t.type!=="wall");let fresh=null;
  for(const t of TS){t.st=tstats(t);const had=t.combo||[];t.combo=[];
    for(const c of COMBOS){if(c.to!==t.type)continue;const partner=c.a===t.type?c.b:c.a;
      if(TS.some(o=>o!==t&&o.type===partner&&Math.max(Math.abs(o.c-t.c),Math.abs(o.r-t.r))<=1)){t.combo.push(c);
        if(c.dmg)t.st.dmg*=c.dmg;if(c.rate)t.st.rate*=c.rate;if(c.dot)t.st.dot*=c.dot;if(c.range)t.st.range*=c.range;
        if(!had.includes(c)&&!had.some(h=>h.name===c.name))fresh=c;}}}
  if(fresh&&S.started){toast("Kombo: "+fresh.name+" – "+fresh.txt);beep(990,.12,"triangle",.05,true);}}
function calcDS(){const D=S.D,N=COLS*ROWS,pen=new Float32Array(N),ds=new Float32Array(N).fill(-1);
  for(const t of S.towers){if(t.type==="wall")continue;const rr=(t.st&&t.st.range?t.st.range:2.6*T)+T*.3;for(let i=0;i<N;i++){if(D[i]<0)continue;if((cx(i)-t.x)**2+(cy(i)-t.y)**2<=rr*rr)pen[i]+=1;}}
  const done=new Uint8Array(N),best=new Float32Array(N).fill(1e9);best[GI]=0;
  for(;;){let u=-1,bv=1e9;for(let i=0;i<N;i++)if(!done[i]&&best[i]<bv){bv=best[i];u=i;}if(u<0)break;done[u]=1;ds[u]=bv;
    const c=u%COLS,r=(u/COLS)|0;for(const [dx,dy,w] of NBM){const nc=c+dx,nr=r+dy;if(nc<0||nc>=COLS||nr<0||nr>=ROWS)continue;const j=idx(nc,nr);if(D[j]<0||done[j])continue;
      if(dx&&dy&&(D[idx(c+dx,r)]<0||D[idx(c,r+dy)]<0))continue;const nv=bv+w*(1+.9*pen[j]);if(nv<best[j])best[j]=nv;}}
  S.DS=ds;}
const EMMI_WATCH=[new Image(),new Image()];
EMMI_WATCH[0].src="assets/bild-21.webp";
EMMI_WATCH[1].src="assets/bild-22.webp";
function drawEmmiWatch(now){
  if(!S.started||S.lives<=0)return;
  let enemy=null,distance=(T*2.7)**2;
  for(const e of S.enemies){
    if(e.dead||e.bur)continue;
    const d=(e.x-CRY.x)**2+(e.y-CRY.y)**2;
    if(d<distance){enemy=e;distance=d;}
  }
  const im=EMMI_WATCH[enemy?1:0];
  if(!im.complete||!im.naturalWidth)return;
  const side=GC===0?1:-1;
  const p=P(CRY.x+side*T*.37,CRY.y+T*.27,0);
  const w=enemy?32:34,h=w*im.naturalHeight/im.naturalWidth;
  const breath=reducedAnimation.matches?1:1+Math.sin(now*2.5)*.023;
  const facing=enemy&&P(enemy.x,enemy.y,0).x>p.x?-1:1;
  g.save();g.translate(p.x,p.y);g.scale(p.s,p.s);
  ell(g,0,1,13,4);g.fillStyle="rgba(0,25,14,.28)";g.fill();
  g.scale(facing,breath);g.drawImage(im,-w/2,-h,w,h);
  const outfit=equippedCosmetic("emmi");
  if(outfit){
    const x=-w*.19,y=-h*(enemy?.58:.39);
    g.strokeStyle=outfit.color;g.lineWidth=1.7;g.beginPath();g.moveTo(x-2,y-1);
    g.quadraticCurveTo(x+1,y+4,x+5,y+2);g.stroke();
  }
  g.restore();
}
function update(dt){
  S.comboT=(S.comboT||0)-dt;if(S.comboT<=0){S.comboT=.5;applyCombos();}
  if(S.active&&S.enemies.some(e=>e.type==="smart"&&!e.dead)){S.dsT=(S.dsT||0)-dt;if(S.dsT<=0||!S.DS){S.dsT=.7;calcDS();}}
  S.t+=dt;S.metCd=Math.max(0,S.metCd-dt);
  if(!S.active&&S.autoT>0){S.autoT-=dt;uiDirty=true;if(S.autoT<=0)startWave();}
  if(S.spawnQ.length){S.spawnT-=dt;
    if(S.spawnT<=0){const s=S.spawnQ.shift();spawnEnemy(s.type,s.w,null,S.spawnK++);S.spawnT=S.spawnQ.length?S.spawnQ[0].gap:0;uiDirty=true;}}
  const thorns=has("dornen"),fwall=has("frostwall");
  for(const e of S.enemies){
    if(e.dead)continue;
    if(e.slowT>0){e.slowT-=dt;if(e.slowT<=0)e.slowF=0;}
    e.stunT=Math.max(0,e.stunT-dt);e.brittleT=Math.max(0,e.brittleT-dt);e.acidT=Math.max(0,e.acidT-dt);e.hit=Math.max(0,e.hit-dt);e.kb=Math.max(0,(e.kb||0)-dt);
    if(e.elite==="regen"&&e.hp<e.max){e.hp=Math.min(e.max,e.hp+e.max*.03*dt);if(Math.random()<dt*4)S.parts.push({k:"spark",x:e.x,y:e.y,z:ez(e)+e.r,vx:0,vy:0,vz:24,t:0,max:.4,r:2,col:"#7dff9a"});}
    if(e.poisonT>0){e.poisonT-=dt;damage(e,e.poisonDps*dt,null,true);if(Math.random()<dt*5)S.parts.push({k:"spark",x:e.x+(Math.random()-.5)*e.r,y:e.y,z:ez(e),vx:0,vy:0,vz:22,t:0,max:.5,r:2,col:e.acidT>0?"#ffe46b":"#9be15d"});if(e.dead)continue;}
    if(e.burnT>0){e.burnT-=dt;damage(e,e.burnDps*dt,null,true);if(Math.random()<dt*10)S.parts.push({k:"spark",x:e.x+(Math.random()-.5)*e.r*1.4,y:e.y,z:ez(e)*.7,vx:0,vy:0,vz:40,t:0,max:.4,r:2.4,col:"#ff7a2a"});if(e.dead)continue;}
    if(!e.air&&!e.bur&&!(e.jump>0)){const ec=Math.floor(e.x/T),er=Math.floor(e.y/T);
      if(ec>=0&&ec<COLS&&er>=0&&er<ROWS){const tp=trapAt[idx(ec,er)],hm=hpMult(Math.max(1,Math.min(S.wave,12))); // wächst nur bis Welle 12 mit – später zählen die Türme
        if(tp){tp.hitT=.25;
          if(tp.kind==="spike"){damage(e,3*hm*dt,tp,true);if(Math.random()<dt*6)sparks(e.x,e.y,"#e8eef6",2,60,.25,4);}
          else if(tp.kind==="tar"){slowE(e,.55,.5);if(Math.random()<dt*4)S.parts.push({k:"smoke",x:e.x,y:e.y,z:2,vx:0,vy:0,vz:6,t:0,max:.5,r:3,tone:1});}
          else if(e.burnT<2.5){const had=e.burnT>0;e.burnDps=Math.max(had?e.burnDps:0,1.6*hm);e.burnT=3;}
          if(e.dead)continue;}
        const tn=thornNear(ec,er);if(tn){damage(e,1.5*hm*tn*dt,null,true);if(Math.random()<dt*3)sparks(e.x,e.y,"#c9d48a",2,50,.25,6);if(e.dead)continue;}}}
    if(!e.air&&(thorns||fwall)){const n=wallNear(e);if(n){if(thorns){damage(e,2.5*hpMult(Math.max(1,S.wave))*n*dt,null,true);if(e.dead)continue;}if(fwall)slowE(e,.25,.3);}}
    if(e.type==="healer"){e.healT-=dt;if(e.healT<=0){e.healT=1.2;let any=false;
      for(const o of S.enemies){if(o===e||o.dead||o.type==="boss")continue;if((o.x-e.x)**2+(o.y-e.y)**2<(1.6*T)**2&&o.hp<o.max){o.hp=Math.min(o.max,o.hp+o.max*.08);any=true;S.parts.push({k:"spark",x:o.x,y:o.y,z:ez(o)+o.r,vx:0,vy:0,vz:28,t:0,max:.5,r:2.5,col:"#7dff9a"});}}
      if(any)S.parts.push({k:"ring",x:e.x,y:e.y,z:1,t:0,max:.5,r:1.6*T,col:"#7dff9a"});}}
    e.ph+=dt*(6+e.spd*5*(1-e.slowF));
    if(e.stunT>0)continue;
    const v=e.spd*(1-e.slowF)*T*dt*(e.air?1:tileSpd(e));
    if(e.air){const dx=CRY.x-e.ax,dy=CRY.y-e.ay,L=Math.hypot(dx,dy)||1;e.ap+=v;const f=Math.min(1,e.ap/L),amp=T*.7*Math.max(0,Math.min(1,(L-e.ap)/(3*T))),
      wv=Math.sin(e.ap*.025+e.ph*.05)*amp,nx=e.ax+dx*f-dy/L*wv,ny=e.ay+dy*f+dx/L*wv;
      e.face=nx>=e.x?1:-1;e.x=nx;e.y=ny;e.rem=L-e.ap;if(e.ap>=L)leak(e);}
    else{if(e.bur){e.trav=(e.trav||0)+v;if(e.trav>6*T){e.bur=false;for(let i=0;i<14;i++)S.parts.push({k:"spark",x:e.x,y:e.y,z:2,vx:(Math.random()-.5)*90,vy:(Math.random()-.5)*90,vz:60+Math.random()*60,t:0,max:.6,r:2.4,col:"#8a5a2a",gr:-160});}}
      if(e.type==="jumper"){e.jump=Math.max(0,(e.jump||0)-dt);e.jt=(e.jt==null?2:e.jt)-dt;if(e.jt<=0&&e.slowF<.3){e.jt=3;e.jump=.45;moveGround(e,1.8*T);}}
      moveGround(e,v);}
    if(S.over)return;
  }
  const TZ=artZ(TOPY);
  for(const t of S.towers){
    if(t.type==="wall")continue;
    t.recoil=Math.max(0,t.recoil-dt*5);t.pop=Math.max(0,t.pop-dt*4);t.flashT=Math.max(0,(t.flashT||0)-dt);
    const st=t.st;
    if(st.aura){t.auraT-=dt;const r2=st.range*st.range;
      if(t.auraT<=0){t.auraT=.25;for(const e of S.enemies){if(e.dead)continue;if((e.x-t.x)**2+(e.y-t.y)**2<=r2){slowE(e,st.slow,.45);damage(e,st.dmg*.25,t);}}}
      if(st.freeze){t.frzT=(t.frzT==null?st.freeze:t.frzT)-dt;t.wind=Math.max(0,1-t.frzT/1.2);
        if(t.frzT<=0){t.frzT=st.freeze;let n=0;
          for(const e of S.enemies){if(e.dead)continue;if((e.x-t.x)**2+(e.y-t.y)**2<=r2){e.stunT=Math.max(e.stunT,st.freezeT*(e.type==="boss"?.4:1));slowE(e,.7,1.6);
            e.brittle=Math.max(e.brittleT>0?e.brittle:0,.2);e.brittleT=Math.max(e.brittleT,1.6);n++;if(n<12)spikes(e.x,e.y,8,3);}}
          S.parts.push({k:"ring",x:t.x,y:t.y,z:1,t:0,max:.5,r:st.range,col:"#d8f2ff"});spikes(t.x,t.y,st.range*.85,14);t.flashT=.12;
          if(n)sfx.hit("nova",7);}}
      continue;}
    t.cd-=dt;
    const WIND=Math.min(.32,.62/st.rate);
    if(t.cd>WIND){t.wind=Math.max(0,(t.wind||0)-dt*4);continue;}
    const tg=findTargets(t,st,st.multi);
    if(!tg.length){t.wind=Math.max(0,(t.wind||0)-dt*4);t.tgt=null;if(t.cd<0)t.cd=0;continue;}
    // zielen (Turm dreht sich weich) und Angriff aufladen
    const want=Math.atan2(tg[0].y-t.y,tg[0].x-t.x);let da=want-t.ang;da=Math.atan2(Math.sin(da),Math.cos(da));t.ang+=da*Math.min(1,dt*16);
    t.wind=Math.min(1,(t.wind||0)+dt/WIND);t.tgt=tg[0];windFx(t,TZ);
    if(t.cd>0)continue;
    t.ang=want;t.cd=1/st.rate;t.recoil=1;t.wind=0;t.flashT=.12;
    if(t.type==="tesla"){
      const oz=artZ(TOPY-24),first=tg[0],pts=[{x:t.x,y:t.y,z:oz},{x:first.x,y:first.y,z:ez(first)}],hitL=[first];let cur=first,dm=st.dmg;
      damage(first,dm,t);first.kb=.12;if(st.stun&&Math.random()<st.stun)first.stunT=Math.max(first.stunT,st.stunT);
      for(let i=0;i<st.chain;i++){let nb=null,nd=(1.6*T)**2;
        for(const e of S.enemies){if(e.dead||hitL.includes(e))continue;const q=(e.x-cur.x)**2+(e.y-cur.y)**2;if(q<nd){nd=q;nb=e;}}
        if(!nb)break;if(!st.noFall)dm*=.8;hitL.push(nb);pts.push({x:nb.x,y:nb.y,z:ez(nb)});damage(nb,dm,t);nb.kb=.12;if(st.stun&&Math.random()<st.stun)nb.stunT=Math.max(nb.stunT,st.stunT);cur=nb;}
      S.bolts.push({pts,t:0});
      for(let i=1;i<pts.length;i++){sparks(pts[i].x,pts[i].y,"#e0b0ff",4,90,.3,pts[i].z);burst(pts[i].x,pts[i].y,pts[i].z,i===1?11:8,"#d9a0ff",7);S.parts.push({k:"flash",x:pts[i].x,y:pts[i].y,z:pts[i].z,t:0,max:.12,r:12,col:"#c77dff"});}
      S.parts.push({k:"flash",x:t.x,y:t.y,z:oz,t:0,max:.16,r:20,col:"#d9a0ff"});sfx.shoot("tesla",t.level);
    }else if(t.type==="sniper"){
      const e=tg[0],ox=t.x+Math.cos(t.ang)*30*U,oy=t.y+Math.sin(t.ang)*30*U;let d=st.dmg,crit=false;
      if(st.crit&&Math.random()<st.crit){d*=st.critMul;crit=true;}
      if(crit)addText(e.x,e.y,"KRITISCH!","#ff6b6b",true,ez(e)+e.r+16);
      let ex=e.x,ey=e.y,ez_=ez(e);
      if(st.pierce){const dx=Math.cos(t.ang),dy=Math.sin(t.ang),L=st.range+T;ex=t.x+dx*L;ey=t.y+dy*L;ez_=ez(e)*.6;
        for(const o of S.enemies){if(o.dead||o===e)continue;const rx=o.x-t.x,ry=o.y-t.y,along=rx*dx+ry*dy;if(along<0||along>L)continue;
          if(Math.abs(rx*dy-ry*dx)<.45*T+o.r){damage(o,d*.7,t);o.kb=.14;sparks(o.x,o.y,"#fff2c0",4,80,.25,ez(o));}}}
      damage(e,d,t);e.kb=.18;S.tracers.push({x1:ox,y1:oy,z1:TZ,x2:ex,y2:ey,z2:ez_,t:0,crit});
      S.parts.push({k:"flash",x:ox,y:oy,z:TZ,t:0,max:.12,r:14,col:"#ffe27a"});sparks(e.x,e.y,"#fff2c0",6,90,.3,ez(e));
      const sa=t.ang+PI/2;S.parts.push({k:"debris",x:t.x,y:t.y,z:TZ,vx:Math.cos(sa)*55,vy:Math.sin(sa)*55,vz:110,t:0,max:1,r:1.8,col:"#f0c860",gr:420,bounce:1});
      smoke(ox,oy,1,4,TZ);burst(ox,oy,TZ,9,"#ffe27a",6,.12);burst(e.x,e.y,ez(e),crit?19:12,crit?"#ff6b6b":"#ffe9a0",crit?10:8);sfx.shoot("sniper",t.level,crit);
    }else{
      for(const e of tg){
        let ox,oy,oz=TZ;const ang=Math.atan2(e.y-t.y,e.x-t.x);
        if(t.type==="frost"){ox=t.x;oy=t.y;oz=artZ(TOPY-21);}else if(t.type==="poison"){ox=t.x;oy=t.y;oz=artZ(TOPY-7);}
        else{ox=t.x+Math.cos(ang)*20*U;oy=t.y+Math.sin(ang)*20*U;}
        const d0=Math.max(1,Math.hypot(e.x-ox,e.y-oy)),arc=t.type==="cannon"||t.type==="poison"?Math.min(80,d0*.5):t.type==="arrow"?Math.min(14,d0*.08):4;
        S.proj.push({x:ox,y:oy,z:oz,lx:ox,ly:oy,lz:oz,z0:oz,arc,tx:e.x,ty:e.y,tz:ez(e),target:e,spd:TD[t.type].pspd,dmg:st.dmg,splash:st.splash,slow:st.slow,slowT:st.slowT,brittle:st.brittle,
          dot:st.dot,dotT:st.dotT,plague:st.plague,plagueR:st.plagueR,acid:st.acid,acidBrittle:st.acidBrittle,burn:st.burn,airMul:st.airMul,air:st.air,ground:st.ground,
          crit:st.crit,critMul:st.critMul,stun:st.stun,stunT:st.stunT,pool:st.pool,src:t,lv:t.level,br:t.branch,tr:[],col:TD[t.type].color,type:t.type,d0,ang,prog:0});
      }
      if(t.type==="cannon"){const mx=t.x+Math.cos(t.ang)*24*U,my=t.y+Math.sin(t.ang)*24*U;
        S.parts.push({k:"flash",x:mx,y:my,z:TZ,t:0,max:.12,r:16,col:"#ffcf6a"});
        for(let i=0;i<4;i++)S.parts.push({k:"smoke",x:mx,y:my,z:TZ,vx:Math.cos(t.ang)*(30+Math.random()*30)+(Math.random()-.5)*16,vy:Math.sin(t.ang)*(30+Math.random()*30)+(Math.random()-.5)*16,vz:8+Math.random()*16,t:0,max:.6+Math.random()*.4,r:4+Math.random()*3});
        S.shake=Math.max(S.shake,.04);burst(mx,my,TZ,10,"#ffcf6a",7,.12);sfx.shoot("cannon",t.level);}
      else if(t.type==="arrow")sfx.shoot("arrow",t.level);
      else if(t.type==="poison"){sfx.shoot("poison",t.level);for(let i=0;i<4;i++)S.parts.push({k:"spark",x:t.x,y:t.y,z:artZ(TOPY-7),vx:(Math.random()-.5)*40,vy:(Math.random()-.5)*40,vz:40+Math.random()*40,t:0,max:.45,r:2,col:"#9be15d",gr:200});}
      else{sfx.shoot("frost",t.level);S.parts.push({k:"flash",x:t.x,y:t.y,z:artZ(TOPY-21),t:0,max:.14,r:16,col:"#bfe8ff"});}
    }
  }
  for(const p of S.proj){
    p.lx=p.x;p.ly=p.y;p.lz=p.z;p.tr.push(p.x,p.y,p.z);if(p.tr.length>21)p.tr.splice(0,3);
    if(p.target&&!p.target.dead){p.tx=p.target.x;p.ty=p.target.y;p.tz=ez(p.target);}
    const dx=p.tx-p.x,dy=p.ty-p.y,dist=Math.hypot(dx,dy),step=p.spd*dt;
    if(dist>.01)p.ang=Math.atan2(dy,dx);p.prog=Math.min(1,Math.max(0,1-dist/p.d0));
    if(dist<=step+2){p.x=p.tx;p.y=p.ty;p.done=true;if(p.splash||(p.target&&!p.target.dead))hit(p);}
    else{p.x+=dx/dist*step;p.y+=dy/dist*step;}
    const zt=p.splash?2:p.tz;p.z=p.z0+(zt-p.z0)*p.prog+Math.sin(p.prog*PI)*p.arc;
    if(p.type==="frost"&&Math.random()<.5)S.parts.push({k:"spark",x:p.x,y:p.y,z:p.z,vx:0,vy:0,vz:0,t:0,max:.22,r:1.8,col:"#9fdcff"});
    if(p.burn&&Math.random()<.5)S.parts.push({k:"spark",x:p.x,y:p.y,z:p.z,vx:0,vy:0,vz:10,t:0,max:.25,r:2,col:"#ff8a3a"});
  }
  S.proj=S.proj.filter(p=>!p.done);
  // brennende Pfützen / Giftwolken
  for(const pl of S.pools){pl.t+=dt;const r2=pl.r*pl.r;
    for(const e of S.enemies){if(e.dead||e.air)continue;if((e.x-pl.x)**2+(e.y-pl.y)**2<=r2)damage(e,pl.dps*dt,pl.src,true);}
    if(Math.random()<dt*14){const a=Math.random()*TAU,d=Math.random()*pl.r*.8,x=pl.x+Math.cos(a)*d,y=pl.y+Math.sin(a)*d;
      S.parts.push(pl.kind==="fire"?{k:"spark",x,y,z:1,vx:0,vy:0,vz:40+Math.random()*30,t:0,max:.45,r:2.4,col:"#ff8a3a"}:{k:"smoke",x,y,z:2,vx:0,vy:0,vz:12,t:0,max:.8,r:5,green:1});}}
  S.pools=S.pools.filter(p=>p.t<p.max);
  for(const tp of S.traps)tp.hitT=Math.max(0,tp.hitT-dt);
  updateMeteors(dt);
  S.enemies=S.enemies.filter(e=>!e.dead);
  stepParts(dt);
  for(const d of S.decals){d.t+=dt;if(d.fire&&d.t<d.max*.5&&Math.random()<dt*8)S.parts.push({k:"spark",x:d.x+(Math.random()-.5)*d.r*1.4,y:d.y+(Math.random()-.5)*d.r,z:2,vx:0,vy:0,vz:34,t:0,max:.45,r:2.4,col:"#ff8a3a"});}
  S.decals=S.decals.filter(d=>d.t<d.max);
  for(const b of S.bolts)b.t+=dt;S.bolts=S.bolts.filter(b=>b.t<.16);
  for(const b of S.tracers)b.t+=dt;S.tracers=S.tracers.filter(b=>b.t<.18);
  for(const x of S.texts){x.t+=dt;x.z+=30*dt;}S.texts=S.texts.filter(x=>x.t<.9);
  if(S.active&&!S.spawnQ.length&&!S.enemies.length)waveCleared();
}
function waveCleared(){
  S.active=false;tiltAuto=true;
  const bonus=Math.round((5+S.wave)*goldMul()*(has("ernte")?2:1)),rate=S.mod==="saver"?0:.03+.01*lv("interest"),cap=(15+S.wave*2)*(has("zins")?2:1),intr=Math.min(cap,Math.floor(S.gold*rate));
  S.gold+=bonus+intr;
  S.banner={t:0,txt:"Geschafft!",sub:"+"+bonus+" Bonus  ·  +"+intr+" Zinsen",col:"#7ef0a0"};
  beep(523,.15,"triangle",.05,true);setTimeout(()=>beep(784,.2,"triangle",.05,true),130);
  const w=S.wave;if(w>=5)ach("w5");if(w>=10)ach("w10");if(w>=20)ach("w20");if(w>=30)ach("w30");if(w>=50)ach("w50");
  if(w>=10&&S.lost===0)ach("perfect");
  if(w>meta.best)meta.best=w;
  const wasLocked=!diffUnlocked(3);if(w>(meta.bestD[S.diff]||0))meta.bestD[S.diff]=w;
  if(wasLocked&&diffUnlocked(3))setTimeout(()=>toast("Neu freigeschaltet: Albtraum-Modus!"),1500);
  uiDirty=true;infoKey="";
  if(S.goalW&&!S.endless&&w>=S.goalW){saveMeta();victory();return;}
  if(w%5===0)offerRelic();
  if(meta.auto&&!S.offer)S.autoT=4;
  saveMeta();saveRun();
}
function victory(){
  S.over=true;
  $("bEndless").classList.toggle("hide",S.intro);
  if(S.intro){
    meta.introWon=true;saveMeta();store.del("kw2_run");
    $("winStars").textContent="★";
    $("winTxt").textContent="Emmis erster Einsatz geschafft!";
    $("winRes").textContent="Der erste Boss ist besiegt. In der Kampagne warten 30 Level, neue Gegner und weitere Turm-Kombos.";
    $("bWinNext").textContent=campaignAvailable()?"Zur Kampagne":"Vollversion ansehen";
    openOv("ovWin");return;
  }
  $("bWinNext").textContent="Weiter";
  recStat(true);
  const bu=S.bu?Object.values(S.bu).reduce((a,b)=>a+b,0):0,stars=S.lost===0&&bu<=1?3:S.lives>=S.maxLives*.7?2:1,mul=DF().shard;
  const fromW=Math.round(S.wave*mul),fromB=Math.round(S.bosses*5*mul);
  let lines='<div><span>Wellen ('+DF().name+' ×'+mul+')</span><b>+'+fromW+GEM+'</b></div>';
  if(fromB)lines+='<div><span>Besiegte Bosse</span><b>+'+fromB+GEM+'</b></div>';
  let total=fromW+fromB;if(S.muts&&S.muts.length)total=Math.round(total*(1+mutBonus()));
  if(S.daily){const dc=dailyCfg();if((!S.dailyKey||S.dailyKey===dc.key)&&meta.daily!==dc.key){meta.daily=dc.key;total+=15;lines+='<div><span>Tägliche Herausforderung</span><b>+15'+GEM+'</b></div>';}ach("daily");}
  else{const old=meta.stars[S.map]||0;if(stars>old){const nw=(stars-old)*5;total+=nw;meta.stars[S.map]=stars;lines+='<div><span>Neue Sterne ('+(stars-old)+')</span><b>+'+nw+GEM+'</b></div>';}}
  {const first=!S.daily&&((meta.stars[S.map]||0)<stars||false);const rw=(stars===3&&!S.daily)||S.daily||Math.random()<.5;
    if(rw){const k=rndBoost();giveBoost(k);const it=BOL.find(x=>x[0]===k);lines+='<div><span>Booster-Belohnung</span><b>+1 '+it[2]+'</b></div>';}}
  meta.shards+=total;meta.runs++;ach("win");if(stars===3&&!S.daily)ach("perfect3");
  const ts=totalStars();if(ts>=10)ach("stars10");if(ts>=15)ach("stars15");if(ts>=27)ach("stars27");
  saveMeta();store.del("kw2_run");
  $("winStars").innerHTML=[1,2,3].map(i=>'<span class="'+(i<=stars?"on":"")+'">★</span>').join("");
  $("winTxt").textContent=(S.daily?"Tägliche Herausforderung":MAP.name)+" gewonnen! "+(stars===3?"Perfekt – kein Leben verloren.":stars===2?"Für 3 Sterne: kein Leben verlieren und höchstens 1 Booster.":"Für 2 Sterne: höchstens 30 % der Leben verlieren.");
  $("winRes").innerHTML=lines+'<div><span><b style="color:var(--txt)">Kristallsplitter gesamt</b></span><b>'+meta.shards+GEM+'</b></div>';
  for(let i=0;i<5;i++)setTimeout(()=>{sparks(W*Math.random(),H*.3*Math.random()+H*.2,["#ffd25e","#7ef0a0","#5ec8ff","#ff7ac8"][i%4],40,240,1,70);},i*180);
  beep(523,.2,"triangle",.06,true);setTimeout(()=>beep(659,.2,"triangle",.06,true),150);setTimeout(()=>beep(784,.4,"triangle",.06,true),300);
  setTimeout(()=>openOv("ovWin"),900);
}
function gameOver(){
  if(S.over)return;S.over=true;S.active=false;recStat(false);
  const done=Math.max(0,S.wave-1),mul=DF().shard,total=Math.round((done+S.bosses*5)*mul);
  const rec=done>(meta.bestD[S.diff]||0);
  meta.shards+=total;meta.runs++;if(done>meta.best)meta.best=done;if(rec)meta.bestD[S.diff]=done;saveMeta();store.del("kw2_run");
  $("overTxt").textContent="Du hast "+done+" Welle"+(done===1?"":"n")+" überstanden"+(S.goalW&&!S.endless?" (Ziel: "+S.goalW+")":"")+".";
  $("overRes").innerHTML='<div><span>Wellen'+(S.bosses?" + Bosse":"")+' ×'+mul+'</span><b>+'+total+GEM+'</b></div>'+
    (S.bestCombo>=5?'<div><span>Beste Combo</span><b style="color:var(--gold)">×'+S.bestCombo+'</b></div>':'')+
    '<div><span><b style="color:var(--txt)">Kristallsplitter gesamt</b></span><b>'+meta.shards+GEM+'</b></div>';
  $("overBest").textContent=rec?"Neuer Rekord auf "+DF().name+"!":"Rekord auf "+DF().name+": Welle "+(meta.bestD[S.diff]||0);
  for(let i=0;i<3;i++)setTimeout(()=>{sparks(CRY.x,CRY.y,"#5ee0c8",40,220,.9,30);debris(CRY.x,CRY.y,"#a8fff0",14,30);},i*150);
  setTimeout(()=>openOv("ovOver"),1000);uiDirty=true;
}

// =====================================================================
//  ZEICHNEN
// =====================================================================
// ---------- Gegner: Comic-Sprites (8 Animationsbilder je Typ, mit Umriss, zwischengespeichert) ----------
const EFR=8,enemyCache=new Map();
function eyesC(c,r,ox,oy,er,pupil){
  for(const ex of [ox,ox+.46]){ell(c,r*ex,r*oy,r*er,r*er*1.2);c.fillStyle="#fff";c.fill();c.strokeStyle=OUTLINE;c.lineWidth=Math.max(.8,r*.07);c.stroke();
    c.beginPath();c.arc(r*(ex+.07),r*(oy+.04),r*er*.6,0,TAU);c.fillStyle=pupil||"#1a0b14";c.fill();
    c.beginPath();c.arc(r*(ex+.02),r*(oy-.07),r*er*.24,0,TAU);c.fillStyle="#fff";c.fill();}
}
function impC(c,r,s,pal,horns,pupil){
  const sq=1+s*.08;c.scale(1/sq,sq);
  c.fillStyle=pal[3];ell(c,-r*.45,r*.85,r*.34,r*.2);c.fill();ell(c,r*.45,r*.85,r*.34,r*.2);c.fill();
  if(horns){c.fillStyle="#fff1d6";c.beginPath();c.moveTo(-r*.55,-r*.6);c.lineTo(-r*.8,-r*1.3);c.lineTo(-r*.2,-r*.85);c.fill();c.beginPath();c.moveTo(r*.25,-r*.85);c.lineTo(r*.6,-r*1.35);c.lineTo(r*.72,-r*.6);c.fill();}
  ell(c,0,0,r,r*.93);c.fillStyle=radial(c,-r*.35,-r*.45,1,r*1.2,[[0,pal[0]],[.4,pal[1]],[1,pal[2]]]);c.fill();
  ell(c,-r*.42,-r*.48,r*.24,r*.14);c.fillStyle="rgba(255,255,255,.6)";c.fill();
  eyesC(c,r,.06,-.2,.27,pupil);
  c.beginPath();c.arc(r*.34,r*.3,r*.2,.25,PI-.25);c.strokeStyle=OUTLINE;c.lineWidth=Math.max(1,r*.1);c.lineCap="round";c.stroke();
}
function enemyBody(c,type,r,ph,armorRing){
  const s=Math.sin(ph);c.lineCap="round";c.lineJoin="round";
  switch(type){
    case "normal":impC(c,r,s,["#ffd0da","#ff4d6d","#d42a52","#5a0a22"],true);break;
    case "fast":impC(c,r,s,["#fff6c0","#ffd02e","#e89a00","#5c3800"],false);break;
    case "healer":
      c.strokeStyle="#8a5a2a";c.lineWidth=r*.2;c.beginPath();c.moveTo(r*.9,r*.9);c.lineTo(r*1.15,-r*1.3);c.stroke();
      c.beginPath();c.arc(r*1.15,-r*1.4,r*.3,0,TAU);c.fillStyle="#9dffb0";c.fill();
      c.beginPath();c.moveTo(-r*.85,-r*.3);c.quadraticCurveTo(0,-r*2.1,r*.85,-r*.3);c.closePath();c.fillStyle="#5a2fb0";c.fill();
      impC(c,r,s,["#efe0ff","#a77bff","#6f43d6","#2a1450"],false,"#1aa84a");break;
    case "air":{
      const f=Math.sin(ph*2);c.fillStyle="#5b2fc0";
      for(const sd of [-1,1]){c.beginPath();c.moveTo(-2,0);c.quadraticCurveTo(-r*1.2,sd*r*(1.6*f+.2)-r*.2,-r*2,sd*r*(1.1*f)-r*.4);
        c.quadraticCurveTo(-r*1.3,sd*r*.4,-r*1.1,sd*r*.6);c.quadraticCurveTo(-r*.6,sd*r*.3,-2,0);c.fill();}
      c.beginPath();c.moveTo(r*.1,-r*.7);c.lineTo(r*.25,-r*1.4);c.lineTo(r*.62,-r*.65);c.fillStyle="#7a4ad8";c.fill();
      c.beginPath();c.arc(0,0,r,0,TAU);c.fillStyle=radial(c,-r*.3,-r*.4,1,r*1.2,[[0,"#ecd9ff"],[.45,"#9a66ff"],[1,"#5b2fc0"]]);c.fill();
      eyesC(c,r,.12,-.15,.24,"#ff7a00");break;}
    case "armored":{
      const sw=s*.35;
      c.save();c.translate(-r*.95,r*.1);c.rotate(sw);rr(c,-r*.32,-r*.2,r*.64,r*.95,r*.28);c.fillStyle="#8f8070";c.fill();c.restore();
      rr(c,-r,-r*.95,r*2,r*1.85,r*.45);c.fillStyle=radial(c,-r*.4,-r*.5,1,r*1.6,[[0,"#ece4d6"],[.5,"#ab9c8b"],[1,"#7a6c5c"]]);c.fill();
      c.strokeStyle="rgba(60,45,30,.55)";c.lineWidth=r*.09;c.beginPath();c.moveTo(-r*.5,-r*.4);c.lineTo(-r*.2,0);c.lineTo(-r*.45,r*.4);c.moveTo(r*.1,r*.35);c.lineTo(r*.4,r*.62);c.stroke();
      if(armorRing){c.strokeStyle="#dfe5f2";c.lineWidth=r*.12;rr(c,-r*.8,-r*.75,r*1.6,r*1.45,r*.35);c.stroke();}
      ell(c,-r*.2,-r*.85,r*.62,r*.22);c.fillStyle="#7ccf4a";c.fill();
      c.save();c.translate(r*.95,r*.1);c.rotate(-sw);rr(c,-r*.32,-r*.2,r*.64,r*.95,r*.28);c.fillStyle="#9d8e7c";c.fill();c.restore();
      c.fillStyle="#ffcf3a";rr(c,r*.02,-r*.38,r*.32,r*.18,2);c.fill();rr(c,r*.46,-r*.38,r*.32,r*.18,2);c.fill();break;}
    case "swarm":{
      c.strokeStyle=OUTLINE;c.lineWidth=Math.max(1,r*.18);
      for(let i=-1;i<=1;i++){const lw=Math.sin(ph*3+i)*r*.4;c.beginPath();c.moveTo(i*r*.5,0);c.lineTo(i*r*.5+lw,-r*1.05);c.moveTo(i*r*.5,0);c.lineTo(i*r*.5-lw,r*1.05);c.stroke();}
      c.beginPath();c.arc(r*.95,0,r*.48,0,TAU);c.fillStyle="#1d5a44";c.fill();
      ell(c,0,0,r*1.1,r*.85);c.fillStyle=radial(c,-r*.3,-r*.4,0,r*1.3,[[0,"#d8ffe8"],[.45,"#33e8a0"],[1,"#13a06a"]]);c.fill();
      c.strokeStyle=OUTLINE;c.lineWidth=Math.max(1,r*.14);c.beginPath();c.moveTo(-r*1.05,0);c.lineTo(r*.6,0);c.stroke();break;}
    case "splitter":case "mini":{
      const sq=1+s*.15;c.scale(1/sq,sq);
      ell(c,0,r*.1,r*1.12,r*.88);c.fillStyle=radial(c,-r*.35,-r*.35,1,r*1.3,[[0,"#e6ffd6"],[.45,"#78eb5a"],[1,"#32aa32"]]);c.fill();
      if(type==="splitter"){c.beginPath();c.arc(-r*.3,r*.3,r*.24,0,TAU);c.arc(r*.28,r*.4,r*.18,0,TAU);c.fillStyle="rgba(30,120,40,.45)";c.fill();}
      ell(c,-r*.45,-r*.42,r*.27,r*.15);c.fillStyle="rgba(255,255,255,.8)";c.fill();
      eyesC(c,r,.05,-.12,.2);break;}
    case "boss":{
      c.fillStyle="#3a0a1c";for(let i=0;i<7;i++){const a=PI*.55+i*.32;c.beginPath();c.moveTo(Math.cos(a-.16)*r*.9,Math.sin(a-.16)*r*.9);c.lineTo(Math.cos(a)*r*1.5,Math.sin(a)*r*1.5);c.lineTo(Math.cos(a+.16)*r*.9,Math.sin(a+.16)*r*.9);c.fill();}
      const sq=1+s*.05;c.scale(1/sq,sq);
      c.beginPath();c.arc(0,0,r,0,TAU);c.fillStyle=radial(c,-r*.35,-r*.4,2,r*1.2,[[0,"#ff9ab2"],[.45,"#e8164c"],[1,"#8a0026"]]);c.fill();
      ell(c,-r*.4,-r*.5,r*.25,r*.15);c.fillStyle="rgba(255,255,255,.55)";c.fill();
      for(const sd of [-1,1]){c.beginPath();c.moveTo(sd*r*.45-r*.05,-r*.7);c.quadraticCurveTo(sd*r*1.35,-r*1.2,sd*r*1.08,-r*1.95);c.quadraticCurveTo(sd*r*.95,-r*1.25,sd*r*.15,-r*.85);
        c.fillStyle=linear(c,0,-r*1.95,0,-r*.7,[[0,"#ffffff"],[1,"#d9c49a"]]);c.fill();}
      c.fillStyle="#ffe14d";c.beginPath();c.moveTo(-r*.08,-r*.36);c.lineTo(r*.34,-r*.12);c.lineTo(-r*.04,-r*.04);c.fill();c.beginPath();c.moveTo(r*.44,-r*.12);c.lineTo(r*.84,-r*.36);c.lineTo(r*.8,-r*.04);c.fill();
      c.beginPath();c.moveTo(-r*.1,r*.3);c.quadraticCurveTo(r*.4,r*.68,r*.86,r*.25);c.lineTo(r*.76,r*.44);c.quadraticCurveTo(r*.35,r*.75,-r*.05,r*.46);c.closePath();c.fillStyle="#2a0010";c.fill();
      c.fillStyle="#fff";for(let i=0;i<4;i++){const tx=r*(.05+i*.2);c.beginPath();c.moveTo(tx,r*.36+i*.02);c.lineTo(tx+r*.07,r*.52);c.lineTo(tx+r*.14,r*.36+i*.02);c.fill();}
      break;}
  }
}
function enemySprite(type,r,f,ring){
  const key=type+"|"+r.toFixed(1)+"|"+f+"|"+(ring?1:0);let sp=enemyCache.get(key);if(sp)return sp;
  const sz=r*5.4,cvs=mkCanvas(sz*R,sz*R),c=cvs.getContext("2d");c.setTransform(R,0,0,R,sz*R/2,sz*R/2);
  enemyBody(c,type,r,f/EFR*TAU,ring);
  sp={img:outlined(cvs,Math.max(1.4,r*.17)*R),sz};enemyCache.set(key,sp);return sp;
}
// ---------- Geschoss-Grafiken (vorgezeichnet, mit Comic-Umriss) ----------
const projCache=new Map(),PSZ=44;
function projSprite(kind){
  let sp=projCache.get(kind);if(sp)return sp;
  const f=Math.min(6,R*1.25),cvs=mkCanvas(PSZ*f,PSZ*f),c=cvs.getContext("2d");c.setTransform(f,0,0,f,PSZ*f/2,PSZ*f/2);c.lineJoin="round";c.lineCap="round";
  if(kind[0]==="a"){ // Pfeile: a=normal, aG=Falke (gold), aP=Giftpfeil
    const gold=kind==="aG",pois=kind==="aP";
    c.strokeStyle=linear(c,0,-1.2,0,1.2,[[0,"#f0d9a8"],[1,"#8a5a2a"]]);c.lineWidth=2.2;c.beginPath();c.moveTo(-11,0);c.lineTo(8,0);c.stroke();
    for(const sd of [-1,1]){c.beginPath();c.moveTo(-12,0);c.lineTo(-15,sd*4.4);c.lineTo(-8.5,sd*4.4);c.lineTo(-5.5,0);c.closePath();c.fillStyle=sd<0?(gold?"#ffe27a":"#9ff0b8"):(gold?"#e0a020":"#4fc07a");c.fill();}
    c.strokeStyle="rgba(0,60,30,.5)";c.lineWidth=.6;c.beginPath();for(const fx of [-12.5,-10.5,-8.5]){c.moveTo(fx,-3.6);c.lineTo(fx+2,0);c.lineTo(fx,3.6);}c.stroke();
    c.beginPath();c.moveTo(15,0);c.lineTo(7,-4);c.lineTo(8.6,0);c.lineTo(7,4);c.closePath();c.fillStyle=gold?linear(c,0,-4,0,4,[[0,"#fff6c0"],[.5,"#ffc93c"],[1,"#a86a00"]]):linear(c,0,-4,0,4,[[0,"#ffffff"],[.5,"#c3ccd8"],[1,"#5f6a7a"]]);c.fill();
    if(pois){c.beginPath();c.arc(11,0,2.6,0,TAU);c.fillStyle="#8ee04a";c.fill();c.beginPath();c.arc(8,2.6,1.4,0,TAU);c.fill();}
  }else if(kind[0]==="b"){ // Kugeln: b=Eisen, bF=Brandkugel, bM=Mörser
    const r=kind==="bM"?8:6;
    if(kind==="bF"){c.beginPath();c.moveTo(-r*2.4,0);c.quadraticCurveTo(-r*.8,-r*1.25,r*.3,-r*.95);c.lineTo(r*.3,r*.95);c.quadraticCurveTo(-r*.8,r*1.25,-r*2.4,0);c.fillStyle=linear(c,-r*2.4,0,r,0,[[0,"#ffe46b"],[.5,"#ff8a2a"],[1,"#d8380c"]]);c.fill();}
    c.beginPath();c.arc(0,0,r,0,TAU);c.fillStyle=kind==="bF"?radial(c,-r*.3,-r*.35,.5,r*1.2,[[0,"#fff0b0"],[.5,"#ff7a2a"],[1,"#8a1e08"]]):radial(c,-r*.35,-r*.4,.5,r*1.25,[[0,"#c9d0dc"],[.4,"#5a6170"],[1,"#15171d"]]);c.fill();
    if(kind==="bF"){c.strokeStyle="rgba(90,20,0,.7)";c.lineWidth=1;c.beginPath();c.moveTo(-2,-3);c.lineTo(1,0);c.lineTo(-1,3);c.moveTo(1,0);c.lineTo(4,1);c.stroke();}
    else{c.strokeStyle="rgba(0,0,0,.35)";c.lineWidth=1;c.beginPath();c.arc(0,0,r*.62,.3,PI*.9);c.stroke();if(kind==="bM"){c.fillStyle="#3a3f4b";c.fillRect(-1.5,-r-2.5,3,3.5);}}
    ell(c,-r*.38,-r*.42,r*.3,r*.18);c.fillStyle="rgba(255,255,255,.8)";c.fill();
  }else if(kind[0]==="i"){ // Eiskristall: i=blau, iV=violett (Spröde)
    const v=kind==="iV",L=v?"#f1e8ff":"#f2fbff",M=v?"#c9a6ff":"#9fdcff",D=v?"#7a4ad8":"#3f8fd0";
    c.beginPath();c.moveTo(13,0);c.lineTo(3,-5);c.lineTo(-9,-3);c.lineTo(-13,0);c.lineTo(-9,3);c.lineTo(3,5);c.closePath();c.fillStyle=M;c.fill();
    c.beginPath();c.moveTo(13,0);c.lineTo(3,-5);c.lineTo(-9,-3);c.lineTo(-13,0);c.closePath();c.fillStyle=L;c.fill();
    c.beginPath();c.moveTo(13,0);c.lineTo(3,5);c.lineTo(1,0);c.closePath();c.fillStyle=D;c.fill();
    c.strokeStyle="rgba(20,70,120,.55)";c.lineWidth=.7;c.beginPath();c.moveTo(13,0);c.lineTo(-13,0);c.moveTo(3,-5);c.lineTo(1,0);c.lineTo(3,5);c.stroke();
    for(const sd of [-1,1]){c.beginPath();c.moveTo(-3,sd*4);c.lineTo(-7,sd*9);c.lineTo(-8,sd*3);c.closePath();c.fillStyle=sd<0?L:M;c.fill();}
  }else{ // Giftklumpen: g=grün, gA=Säure
    const A=kind==="gA";
    c.beginPath();c.moveTo(-15,0);c.quadraticCurveTo(-5,-7.5,2,-6.5);c.arc(2,0,6.5,-PI/2,PI/2);c.quadraticCurveTo(-5,7.5,-15,0);c.closePath();
    c.fillStyle=A?radial(c,1,-2,.5,12,[[0,"#fffbd0"],[.5,"#ffd92e"],[1,"#b08a00"]]):radial(c,1,-2,.5,12,[[0,"#efffc0"],[.5,"#8ee04a"],[1,"#3a8a14"]]);c.fill();
    ell(c,3.5,-3,2.4,1.5);c.fillStyle="rgba(255,255,255,.85)";c.fill();
    c.fillStyle=A?"rgba(140,100,0,.55)":"rgba(40,110,20,.55)";c.beginPath();c.arc(-1,2,1.6,0,TAU);c.arc(4,2.5,1.1,0,TAU);c.arc(-5,-1,1.1,0,TAU);c.fill();
  }
  sp=outlined(cvs,1.5*f);projCache.set(kind,sp);return sp;
}
const projKind=p=>p.type==="arrow"?(p.dot?"aP":p.br===1&&p.lv>=4?"aG":"a"):p.type==="cannon"?(p.burn?"bF":p.br===0&&p.lv>=4?"bM":"b"):p.type==="frost"?(p.br===1&&p.lv>=4?"iV":"i"):(p.acid?"gA":"g");
const TRAIL={arrow:"255,255,255",cannon:"90,90,100",frost:"150,215,255",poison:"150,235,90"};
// V3: deterministic ambient lighting and readable tactical silhouettes.
function kwAura(x,y,z,r,color,alpha,now,seed){
  const p=P(x,y,z),pulse=1+Math.sin(now*2.1+seed)*.09,rad=r*p.s*pulse;
  g.save();g.globalCompositeOperation="lighter";
  g.fillStyle=radial(g,p.x,p.y,0,rad,[[0,`rgba(${color},${alpha})`],[.45,`rgba(${color},${alpha*.34})`],[1,`rgba(${color},0)`]]);
  g.fillRect(p.x-rad,p.y-rad,rad*2,rad*2);g.restore();
}
function kwEnemyMarker(e,now){
  if(e.dead)return;
  const col=e.type==="boss"?"255,72,121":e.type==="healer"?"110,255,162":e.type==="armored"?"255,190,94":e.air?"143,205,255":null;
  if(col)kwAura(e.x+(e.ox||0),e.y+(e.oy||0),2,e.r*(e.type==="boss"?2.5:1.7),col,e.type==="boss"?.23:.12,now,e.ph);
}
function kwTowerMarker(t,now){
  if(t.type==="wall")return;
  const colors={arrow:"255,219,117",cannon:"255,135,85",frost:"108,218,255",poison:"153,245,99",tesla:"204,144,255",sniper:"255,238,157"};
  const c=colors[t.type];if(!c)return;
  kwAura(t.x,t.y,WH+9,24*U,c,t.level>=4?.21:.105,now,t.x*.01+t.y*.02);
}
const reducedAnimation=matchMedia("(prefers-reduced-motion: reduce)");
function drawEnemy(e,now){
  kwEnemyMarker(e,now);
  if(TH===THEMES.lava&&!e.dead){const q=P(e.x,e.y,3),rr_=(e.r+10)*q.s;g.globalCompositeOperation="lighter";g.fillStyle=radial(g,q.x,q.y,0,rr_,[[0,"rgba(255,120,30,"+(.22+.07*Math.sin(now*6+e.ph))+")"],[1,"rgba(255,60,0,0)"]]);g.fillRect(q.x-rr_,q.y-rr_,rr_*2,rr_*2);g.globalCompositeOperation="source-over";
    if(Math.random()<.05)S.parts.push({k:"spark",x:e.x,y:e.y,z:6+Math.random()*8,vx:(Math.random()-.5)*20,vy:(Math.random()-.5)*20,vz:30,t:0,max:.5,r:1.3,col:"#ffa040",gr:-20});}
  if(e.bur){const q=P(e.x,e.y,0);g.save();g.translate(q.x,q.y);g.scale(q.s,q.s);ell(g,0,0,13,6);g.fillStyle="#6a4422";g.fill();ell(g,0,-2,10,4.5);g.fillStyle="#8a5a2a";g.fill();
    for(let i=0;i<4;i++){const a=now*7+i*1.7+e.ph;g.fillStyle="#b07a40";g.beginPath();g.arc(Math.cos(a)*8,-3-Math.abs(Math.sin(a))*6,1.8,0,TAU);g.fill();}g.restore();return;}
  const p=P(e.x+(e.ox||0),e.y+(e.oy||0),0),r=e.r,s=Math.sin(e.ph),bob=Math.abs(s)*2.4,fly=e.air;
  g.save();g.translate(p.x,p.y);g.scale(p.s,p.s);
  ell(g,0,0,r*(fly?.75:1.05),r*(fly?.32:.42));g.fillStyle=fly?"rgba(0,40,0,.18)":"rgba(0,40,0,.3)";g.fill();
  g.translate(0,-r*.85);
  const lift=(fly?18+Math.sin(now*6+e.ph)*3:bob)+(e.jump>0?Math.sin(e.jump/.45*PI)*24:0);
  if(e.elite){g.save();g.globalCompositeOperation="lighter";g.fillStyle=radial(g,0,-lift,r*.4,r*2.1,[[0,"rgba(255,215,90,.6)"],[1,"rgba(255,180,40,0)"]]);g.fillRect(-r*2.1,-lift-r*2.1,r*4.2,r*4.2);g.restore();}
  g.save();g.translate(0,-lift);
  const kb=e.kb||0;if(kb>0)g.scale(1+kb*1.4,1-kb*1.1);
  g.scale(e.face||1,1);
  if(e.type==="boss"){g.globalCompositeOperation="lighter";g.fillStyle=radial(g,0,0,r*.5,r*2.2,[[0,"rgba(255,40,90,.4)"],[1,"rgba(255,40,90,0)"]]);g.beginPath();g.arc(0,0,r*2.2+Math.sin(now*4)*3,0,TAU);g.fill();g.globalCompositeOperation="source-over";}
  if(e.type==="fast"||e.elite==="swift"){g.strokeStyle="rgba(255,255,255,.7)";g.lineWidth=2;g.lineCap="round";for(let i=-1;i<=1;i++){const l=r*(1.9+Math.random()*.5);g.beginPath();g.moveTo(-r*1.25,i*r*.42);g.lineTo(-l,i*r*.42);g.stroke();}}
  const f=((Math.floor(e.ph/TAU*EFR)%EFR)+EFR)%EFR,sp=enemySprite(e.type,r,f,e.type==="armored"&&e.acidT<=0);
  const ref=forestSprite(e.type==="fast"?"normal":e.type);
  if(ref||ENI[e.type]&&artOk(ENI[e.type])){
    const im=ref||ARTI[ENI[e.type]],k=r*(ref?3.65:3.4)/Math.max(im.naturalWidth,im.naturalHeight),w=im.naturalWidth*k,h=im.naturalHeight*k;
    g.save();
    if(!reducedAnimation.matches&&e.stunT<=0){
      const stride=Math.cos(e.ph*2),weight=e.type==="boss"||e.type==="armored"?.55:1;
      g.rotate(s*.105*weight);
      g.translate(s*r*.09,0);
      g.scale(1-stride*.055*weight,1+stride*.075*weight);
    }
    g.drawImage(im,-w/2,-h*.62,w,h);g.restore();
  }
  else g.drawImage(sp.img,-sp.sz/2,-sp.sz/2,sp.sz,sp.sz);
  g.globalCompositeOperation="lighter";
  if(e.type==="jumper"||e.type==="smart"||e.type==="burrow"){g.globalCompositeOperation="source-over";const bc=e.type==="jumper"?"#ffa040":e.type==="smart"?"#4ad0ff":"#c08040";g.save();g.scale(e.face||1,1);
    g.beginPath();g.arc(0,-r*1.75,4.6,0,TAU);g.fillStyle=bc;g.fill();g.lineWidth=1.6;g.strokeStyle="#10182b";g.stroke();g.fillStyle="#fff";g.font="900 9px "+FONT;g.textAlign="center";g.textBaseline="middle";
    g.fillText(e.type==="jumper"?"↑":e.type==="smart"?"◉":"▼",0,-r*1.75+.5);g.restore();g.globalCompositeOperation="lighter";}
  if(e.type==="healer"){g.fillStyle=radial(g,r*1.15,-r*1.4,0,r,[[0,"rgba(150,255,170,.85)"],[1,"rgba(80,255,120,0)"]]);g.fillRect(r*.15,-r*2.4,r*2,r*2);}
  if(e.type==="armored"){g.fillStyle=radial(g,r*.4,-r*.3,0,r*.6,[[0,"rgba(255,180,40,.8)"],[1,"rgba(255,120,0,0)"]]);g.fillRect(-r*.3,-r,r*1.4,r*1.4);}
  if(e.type==="boss"){g.fillStyle="rgba(255,230,80,.5)";g.beginPath();g.arc(r*.12,-r*.2,r*.3,0,TAU);g.arc(r*.62,-r*.2,r*.27,0,TAU);g.fill();}
  g.globalCompositeOperation="source-over";
  if(e.slowT>0){g.globalAlpha=e.brittleT>0?.45:.32;g.fillStyle=e.brittleT>0?"#e6f6ff":"#a8dcff";g.beginPath();g.arc(0,0,r*.95,0,TAU);g.fill();g.globalAlpha=1;}
  if(e.poisonT>0){g.globalAlpha=.25;g.fillStyle=e.acidT>0?"#ffe46b":"#8ee04a";g.beginPath();g.arc(0,0,r*.95,0,TAU);g.fill();g.globalAlpha=1;}
  if(e.hit>0){g.globalAlpha=e.hit/.08*.6;g.fillStyle="#fff";g.beginPath();g.arc(0,0,r*.92,0,TAU);g.fill();g.globalAlpha=1;}
  g.restore();
  if(e.elite){const ky=-lift-r-(e.type==="normal"?r*.45:3);g.fillStyle="#ffd25e";g.strokeStyle="#7a4a00";g.lineWidth=.8;
    g.beginPath();g.moveTo(-5,ky);g.lineTo(-5,ky-4);g.lineTo(-2.5,ky-2);g.lineTo(0,ky-5.5);g.lineTo(2.5,ky-2);g.lineTo(5,ky-4);g.lineTo(5,ky);g.closePath();g.fill();g.stroke();}
  if(e.shield>0){const a=.35+.5*(e.shield/e.shieldMax);g.beginPath();g.arc(0,-lift,r*1.4,0,TAU);g.fillStyle="rgba(130,200,255,"+(a*.25)+")";g.fill();g.strokeStyle="rgba(170,225,255,"+a+")";g.lineWidth=1.6;g.stroke();}
  if(e.stunT>0){for(let i=0;i<3;i++){const a=now*6+i*TAU/3;g.fillStyle="#ffe14d";g.beginPath();g.arc(Math.cos(a)*r*.8,-lift-r-5+Math.sin(a)*2.5,1.8,0,TAU);g.fill();}}
  if(e.hp<e.max||e.shield<e.shieldMax){
    const boss=e.type==="boss",w=boss?50:Math.max(20,r*2.2),h=boss?6:4,x=-w/2,y=-lift-r-(boss?26:e.elite?14:8);
    rr(g,x-1.5,y-1.5,w+3,h+3,3);g.fillStyle="rgba(10,10,20,.75)";g.fill();
    const fr=Math.max(0,e.hp/e.max);
    if(fr>0){rr(g,x,y,Math.max(2,w*fr),h,2);g.fillStyle=fr>.5?linear(g,0,y,0,y+h,[[0,"#a6ffc8"],[1,"#2fbf6a"]]):fr>.25?linear(g,0,y,0,y+h,[[0,"#ffe9a0"],[1,"#f0a020"]]):linear(g,0,y,0,y+h,[[0,"#ffb0b0"],[1,"#e0303f"]]);g.fill();}
    if(e.shieldMax&&e.shield>0){g.fillStyle="#8fd3ff";g.fillRect(x,y-3,w*(e.shield/e.shieldMax),2);}
  }
  g.restore();
}
const ROT=t=>t.type==="arrow"||t.type==="cannon"||t.type==="sniper";
const gardenArt={};
for(const [key,url] of Object.entries({"arrow": "assets/garden-arrow.webp", "cannon": "assets/garden-cannon.webp", "frost": "assets/garden-frost.webp", "tesla": "assets/garden-tesla.webp", "poison": "assets/garden-poison.webp", "portal": "assets/garden-portal.webp", "crystal": "assets/garden-crystal.webp", "board": "assets/garden-board.webp", "hedge": "assets/garden-hedge.webp"})){
  const img=new Image();img.src=url;gardenArt[key]=img;
}
function gardenStamp(img,x,y,width,height){
  if(!img?.naturalWidth)return false;
  const p=P(x,y,0);
  g.drawImage(img,p.x-width*p.s/2,p.y-height*p.s/2,width*p.s,height*p.s);return true;
}
function gardenTower(t){
  if(t.type!=="wall"){
    const key=t.type==="sniper"?ARTI[TWI.sniper]:gardenArt[t.type];
    if(!gardenStamp(key,t.x,t.y,T*.93,T*.93))return false;
    if(t.level>1){const p=P(t.x,t.y+T*.35,0);g.fillStyle="#433827";g.fillRect(p.x-9*p.s,p.y,18*p.s,4*p.s);g.fillStyle=t.branch===1?"#a8eaff":"#ffd675";g.fillRect(p.x-9*p.s,p.y,18*p.s*t.level/MAXL,4*p.s);}
    return true;
  }
  const p=P(t.x,t.y,0),u=T*p.s;
  g.save();g.translate(p.x,p.y);g.scale(u,u);
  const hedge=(x,y,w,h)=>{
    g.fillStyle="#34431b";g.fillRect(x,y+.04,w,h);
    if(gardenArt.hedge.naturalWidth)g.drawImage(gardenArt.hedge,x,y,w,h);
    else{g.fillStyle="#829039";g.fillRect(x,y,w,h);}
  };
  if(t.wk==="gate"){
    g.fillStyle="#99723a";g.fillRect(-.44,-.29,.14,.58);g.fillRect(.3,-.29,.14,.58);
    if(!t.open){g.fillStyle="#c39a4c";g.fillRect(-.32,-.22,.64,.44);}
  }else{
    for(const [dc,dr] of [[1,0],[-1,0],[0,1],[0,-1]]){
      const c=t.c+dc,r=t.r+dr;if(c<0||c>=COLS||r<0||r>=ROWS||occ[idx(c,r)]?.type!=="wall")continue;
      hedge(dc>0?0:dc<0?-.51:-.35,dr>0?0:dr<0?-.51:-.35,dc?.52:.7,dr?.52:.7);
    }
    hedge(-.36,-.36,.72,.72);
    if(t.wk){g.fillStyle=t.wk==="crystal"?"#88f2ff":"#f4d497";g.beginPath();g.moveTo(0,-.23);g.lineTo(.16,.06);g.lineTo(0,.2);g.lineTo(-.16,.06);g.closePath();g.fill();}
  }
  g.restore();return true;
}
function drawTower(t,now){
  if(MAP.garden&&gardenTower(t))return;
  const ref=forestSprite(t.type);
  if(t.type==="wall"&&ref){
    const p=P(t.x,t.y,0),vertical=forestWide
      ?(t.c>0&&occ[t.i-1]?.type==="wall")||(t.c<COLS-1&&occ[t.i+1]?.type==="wall")
      :(t.r>0&&occ[t.i-COLS]?.type==="wall")||(t.r<ROWS-1&&occ[t.i+COLS]?.type==="wall");
    const w=T*p.s*(vertical?.94:1.26),h=T*p.s*(vertical?.73:.63);
    g.save();g.translate(p.x,p.y);
    ell(g,0,2,w*.53,h*.25);g.fillStyle="#23321461";g.fill();
    g.rotate(vertical?-.83:.4);
    g.drawImage(ref,-w/2,-h*.62,w,h);
    g.restore();return;
  }
  if(t.wk==="gate"&&t.open){drawOpenGate(t,now);return;}
  const NOB=!!ref||!!TWI[t.type]&&artOk(TWI[t.type]);
  kwTowerMarker(t,now);
  if(!NOB){if(tiltMoving)drawBlockNow(t);else{const bs=blockSprite(t);g.drawImage(bs.cv,bs.x,bs.y,bs.w,bs.h);}}
  if(t.type==="wall"){if(artOk("mauer")){}return;}
  const p=P(t.x,t.y,NOB?0:5),wind=t.wind||0,anim=t.type==="arrow"?Math.round(wind*2):0,sp=sprite(t.type,t.level,t.branch,anim),sz=sp.sz,pop=1+t.pop*.18;
  g.save();g.translate(p.x,p.y);g.scale(p.s*.78,p.s*.78);
  const fy=-13*U,ty=fy+TOPY*U;
  if(t.level>=MAXL){g.globalCompositeOperation="lighter";const a=.3+Math.sin(now*3+t.x)*.1;g.fillStyle=radial(g,0,ty+4,2,34,[[0,"rgba(255,220,110,"+a+")"],[1,"rgba(255,180,40,0)"]]);g.fillRect(-36,ty-30,72,72);g.globalCompositeOperation="source-over";}
  if(TH===THEMES.lava){g.globalCompositeOperation="lighter";g.fillStyle=radial(g,0,-1,0,20,[[0,"rgba(255,120,40,"+(.20+.06*Math.sin(now*2+t.x))+")"],[1,"rgba(255,60,0,0)"]]);g.fillRect(-20,-21,40,40);g.globalCompositeOperation="source-over";}
  const TK=TWI[t.type],ART=!!ref||!!TK&&artOk(TK);
  if(ART&&t.combo&&t.combo.length){g.save();g.globalCompositeOperation="lighter";g.fillStyle=radial(g,0,0,4,26*U,[[0,"rgba(255,215,90,"+(.35+.12*Math.sin(now*4+t.c))+")"],[1,"rgba(255,180,40,0)"]]);g.beginPath();g.ellipse(0,0,26*U,11*U,0,0,TAU);g.fill();g.restore();}
  if(ART){ell(g,2*U,3*U,22*U,8*U);g.fillStyle="rgba(0,30,0,.32)";g.fill();}
  if(ART){const im=ref||ARTI[TK],w=(ref?72:48)*U,h=w*im.naturalHeight/im.naturalWidth,sq=1-t.recoil*.06;g.save();if(ROT(t)&&Math.cos(t.ang)<0)g.scale(-1,1);g.drawImage(im,-w/2,fy+17*U-h*sq,w,h*sq);g.restore();}
  else g.drawImage(sp.base,-sz/2,fy-sz/2,sz,sz);
  if(ART&&ROT(t)){
    if(t.flashT>0&&!reducedAnimation.matches){
      const q=P(t.x+Math.cos(t.ang)*20,t.y+Math.sin(t.ang)*20,5);
      const aim=Math.atan2(q.y-p.y,q.x-p.x),fade=Math.min(1,t.flashT/.12);
      g.save();g.translate(0,ty+4*U);g.rotate(aim);g.globalCompositeOperation="lighter";
      const radius=(t.type==="cannon"?18:11)*U;
      g.fillStyle=radial(g,15*U,0,0,radius,[[0,"rgba(255,239,171,"+fade+")"],[1,"rgba(255,138,55,0)"]]);
      g.fillRect(15*U-radius,-radius,radius*2,radius*2);g.restore();
    }
  }else if(ROT(t)){
    const q=P(t.x+Math.cos(t.ang)*20,t.y+Math.sin(t.ang)*20,5),sang=Math.atan2(q.y-p.y,q.x-p.x);
    g.save();g.translate(0,ty);
    if(t.type==="cannon"&&wind>.5)g.translate((Math.random()-.5)*1.2,(Math.random()-.5)*1.2);
    g.rotate(sang);g.translate(-t.recoil*(t.type==="arrow"?2:t.type==="sniper"?5:4.5)*U,0);g.drawImage(sp.top,-sz/2,-sz/2,sz,sz);
    if(t.type==="cannon"&&wind>.15){g.globalCompositeOperation="lighter";g.fillStyle=radial(g,-6,0,0,9,[[0,"rgba(255,200,90,"+(wind*.8)+")"],[1,"rgba(255,90,0,0)"]]);g.fillRect(-16,-10,20,20);g.globalCompositeOperation="source-over";}
    if((t.flashT||0)>0){const a=t.flashT/.12,mx=t.type==="sniper"?34:t.type==="cannon"?(t.branch===0&&t.level>=4?21:26):22;g.globalCompositeOperation="lighter";
      g.fillStyle=radial(g,mx,0,0,14,[[0,"rgba(255,250,210,"+a+")"],[.4,"rgba(255,190,80,"+(a*.8)+")"],[1,"rgba(255,120,0,0)"]]);g.fillRect(mx-16,-16,32,32);g.globalCompositeOperation="source-over";}
    g.restore();
  }else{
    if(!ART)g.drawImage(sp.top,-sz/2,ty-sz/2,sz,sz);
    g.globalCompositeOperation="lighter";
    if(t.type==="frost"){const a=.22+Math.sin(now*3+t.x)*.08+wind*.4+(t.flashT||0)*3,fy2=ty-11*U;g.fillStyle=radial(g,0,fy2,0,20+wind*8,[[0,"rgba(150,215,255,"+a+")"],[1,"rgba(150,215,255,0)"]]);g.fillRect(-30,fy2-30,60,60);
      }
    else if(t.type==="tesla"){const a=.55+Math.sin(now*7+t.x)*.2+t.recoil*.4+wind*.5,oy=ty-24*U,col=t.branch===1&&t.level>=4?"255,150,80":"200,140,255",rg=14+wind*10+(t.flashT||0)*80;
      g.fillStyle=radial(g,0,oy,0,rg,[[0,"rgba("+col+","+Math.min(1,a)+")"],[1,"rgba("+col+",0)"]]);g.fillRect(-rg,oy-rg,rg*2,rg*2);
      g.fillStyle="#fff";g.beginPath();g.arc(0,oy,2.8+wind*1.6,0,TAU);g.fill();
      const n=Math.random()<.12+wind*.7?1+(wind>.6?2:0):0;
      for(let k=0;k<n;k++){g.strokeStyle="rgba(230,190,255,.9)";g.lineWidth=1;g.beginPath();g.moveTo(0,oy);let x=0,y=oy;for(let i=0;i<3;i++){x+=(Math.random()-.5)*(9+wind*8);y+=(Math.random()-.3)*(6+wind*6);g.lineTo(x,y);}g.stroke();}}
    else if(t.type==="poison"){const col=t.branch===1&&t.level>=4?"255,230,100":"170,255,110",spd=1.3+wind*2.2;
      for(let i=0;i<3+(wind>.4?2:0);i++){const ph=(now*spd+i*.27+t.x*.01)%1;g.globalAlpha=1-ph;g.fillStyle="rgba("+col+",.9)";g.beginPath();g.arc(Math.sin(i*2+now)*5*U,ty-5*U-ph*14,1.6+ph*1.4,0,TAU);g.fill();}g.globalAlpha=1;
      if((t.flashT||0)>0){g.fillStyle=radial(g,0,ty-6*U,0,16,[[0,"rgba("+col+","+(t.flashT/.12*.8)+")"],[1,"rgba(0,0,0,0)"]]);g.fillRect(-16,ty-6*U-16,32,32);}}
    g.globalCompositeOperation="source-over";
  }
  const rk=rankOf(t);
  if(rk){g.fillStyle="#ffd25e";g.strokeStyle="#7a4a00";g.lineWidth=.7;for(let i=0;i<rk;i++){const x=(-5+i*5)*U,y=fy+(TOPY+9)*U;g.beginPath();g.moveTo(x,y-3);g.lineTo(x+2,y);g.lineTo(x,y+3);g.lineTo(x-2,y);g.closePath();g.fill();g.stroke();}}
  g.restore();
  if(t.type==="frost"&&t.st.aura){g.globalCompositeOperation="lighter";g.globalAlpha=.65;g.fillStyle="#eaf8ff";
    for(let i=0;i<14;i++){const a2=now*.8+i*TAU/14,rr2=t.st.range*(.55+.35*((i*37)%10)/10),q=P(t.x+Math.cos(a2)*rr2,t.y+Math.sin(a2)*rr2,5+Math.sin(now*2+i)*3);g.beginPath();g.arc(q.x,q.y,1.7*q.s,0,TAU);g.fill();}
    g.globalAlpha=1;g.globalCompositeOperation="source-over";}
  // Laservisier des Schützen beim Anlegen
  if(t.type==="sniper"&&wind>.05&&t.tgt&&!t.tgt.dead){const m=P(t.x+Math.cos(t.ang)*30*U,t.y+Math.sin(t.ang)*30*U,artZ(TOPY)),e2=P(t.tgt.x,t.tgt.y,ez(t.tgt));
    g.strokeStyle="rgba(255,70,60,"+(wind*.75)+")";g.lineWidth=1.2;g.beginPath();g.moveTo(m.x,m.y);g.lineTo(e2.x,e2.y);g.stroke();
    g.fillStyle="rgba(255,90,80,"+wind+")";g.beginPath();g.arc(e2.x,e2.y,2.2,0,TAU);g.fill();}
}
// offenes Tor: zwei Pfosten, die Torflügel liegen flach daneben
function drawOpenGate(t,now){
  const vert=isBlock(t.c-1,t.r)||isBlock(t.c+1,t.r)?false:(isBlock(t.c,t.r-1)||isBlock(t.c,t.r+1));
  cellPath(t.c,t.r,.6,3);g.fillStyle="rgba(150,92,40,.35)";g.fill();g.setLineDash([4,4]);g.strokeStyle="rgba(255,214,120,.9)";g.lineWidth=1.6;g.stroke();g.setLineDash([]);
  const posts=vert?[[t.x,t.r*T+4],[t.x,(t.r+1)*T-4]]:[[t.c*T+4,t.y],[(t.c+1)*T-4,t.y]];
  for(const [x,y] of posts){const a=P(x,y,0),b=P(x,y,WH*1.25);g.strokeStyle=OUTLINE;g.lineWidth=6*a.s;g.beginPath();g.moveTo(a.x,a.y);g.lineTo(b.x,b.y);g.stroke();
    g.strokeStyle="#8a5a2a";g.lineWidth=3.6*a.s;g.beginPath();g.moveTo(a.x,a.y);g.lineTo(b.x,b.y);g.stroke();
    g.beginPath();g.arc(b.x,b.y,2.6*a.s,0,TAU);g.fillStyle="#ffd25e";g.fill();g.strokeStyle=OUTLINE;g.lineWidth=1;g.stroke();}
}
// Fallen am Boden (gleiche Grafik wie im Shop, flach auf das Feld gelegt)
const trapSpr={};
function trapSprite(kind){if(!trapSpr[kind]){const c=mkCanvas(224,224);drawTrapIcon(c,kind);trapSpr[kind]=c;}return trapSpr[kind];}
function drawTraps(now){
  for(const tp of S.traps){const p=P(tp.x,tp.y,0),on=tp.hitT>0,w=T*p.s*1.32*(on&&tp.kind==="spike"?1.06:1);
    if(tp.kind==="fire"){g.globalCompositeOperation="lighter";const rd=T*.75*p.s,a=.28+.12*Math.sin(now*4+tp.c)+(on?.2:0);
      g.fillStyle=radial(g,p.x,p.y,0,rd,[[0,"rgba(255,160,60,"+a+")"],[1,"rgba(255,60,0,0)"]]);g.fillRect(p.x-rd,p.y-rd,rd*2,rd*2);g.globalCompositeOperation="source-over";}
    g.drawImage(trapSprite(tp.kind),p.x-w/2,p.y-w*.56,w,w);
    if(tp.kind==="fire"&&Math.random()<.06)S.parts.push({k:"spark",x:tp.x+(Math.random()-.5)*T*.5,y:tp.y+(Math.random()-.5)*T*.5,z:2,vx:0,vy:0,vz:30,t:0,max:.5,r:1.8,col:"#ffb347"});
  }
}
function equippedCosmetic(kind){
  const id=meta.kw5?.equipped?.[kind];
  return id?KW5.cosmetics.find(item=>item.id===id):null;
}
function drawCrystal(now){
  if(MAP.garden&&!equippedCosmetic("crystal")&&gardenStamp(gardenArt.crystal,CRY.x,CRY.y,T,T))return;
  const ref=forestSprite("crystal");
  if(ref||artOk("kristall")){const p=P(CRY.x,CRY.y,0),f=S.lives/Math.max(1,S.maxLives),pulse=.38+Math.sin(now*3)*.12+S.cryHit,im=ref||ARTI.kristall;
    g.save();g.translate(p.x,p.y);g.scale(p.s,p.s);g.globalCompositeOperation="lighter";
    g.fillStyle=radial(g,0,-24,0,46,[[0,f>.35?"rgba(110,255,225,"+pulse+")":"rgba(255,70,70,"+pulse+")"],[1,"rgba(0,0,0,0)"]]);g.fillRect(-46,-70,92,92);g.globalCompositeOperation="source-over";
    if(S.cryHit>0)g.translate((Math.random()-.5)*4,0);const w=ref?48:38,h=w*im.naturalHeight/im.naturalWidth,skin=equippedCosmetic("crystal");
    if(skin?.id==="crystal_rose")g.filter="hue-rotate(140deg) saturate(1.25)";
    if(skin?.id==="crystal_mint")g.filter="hue-rotate(325deg) saturate(1.15)";
    if(!reducedAnimation.matches){g.translate(0,Math.sin(now*2.3)*3);g.rotate(Math.sin(now*1.65)*.045);}
    g.drawImage(im,-w/2,9-h,w,h);g.restore();return;}
  const p=P(CRY.x,CRY.y,0),f=S.lives/Math.max(1,S.maxLives),hue=170*Math.min(1,f)-5*(1-f);
  const col=(l,a=1)=>"hsla("+hue+",85%,"+l+"%,"+a+")";
  g.save();g.translate(p.x,p.y);g.scale(p.s,p.s);
  const y=-30+Math.sin(now*2)*2.5;
  g.save();g.globalCompositeOperation="lighter";g.translate(0,y);g.rotate(now*.3);
  for(let i=0;i<6;i++){g.rotate(TAU/6);g.beginPath();g.moveTo(0,0);g.lineTo(-5,-48);g.lineTo(5,-48);g.closePath();g.fillStyle=col(70,.06);g.fill();}
  g.restore();
  g.save();g.globalCompositeOperation="lighter";const pulse=.45+Math.sin(now*3)*.12+S.cryHit;
  g.fillStyle=radial(g,0,y,0,40,[[0,col(70,pulse)],[1,col(60,0)]]);g.fillRect(-40,y-40,80,80);g.restore();
  ell(g,0,0,12,5);g.fillStyle=col(60,.35);g.fill();
  g.save();g.translate(0,y);g.scale(.95,.95);if(S.cryHit>0)g.translate((Math.random()-.5)*4,0);
  const Pt=[[0,-24],[10,-11],[10,6],[0,17],[-10,6],[-10,-11]];
  g.beginPath();Pt.forEach(([a,b],i)=>i?g.lineTo(a,b):g.moveTo(a,b));g.closePath();g.fillStyle=col(45);g.fill();
  g.beginPath();g.moveTo(0,-24);g.lineTo(0,17);g.lineTo(-10,6);g.lineTo(-10,-11);g.closePath();g.fillStyle=col(78);g.fill();
  g.beginPath();g.moveTo(0,-24);g.lineTo(4,-8);g.lineTo(0,17);g.closePath();g.fillStyle=col(92,.7);g.fill();
  g.beginPath();Pt.forEach(([a,b],i)=>i?g.lineTo(a,b):g.moveTo(a,b));g.closePath();g.strokeStyle=col(22);g.lineWidth=1.3;g.stroke();
  g.beginPath();g.moveTo(-10,-11);g.lineTo(0,-6);g.lineTo(10,-11);g.moveTo(0,-6);g.lineTo(0,17);g.strokeStyle=col(30,.6);g.lineWidth=.8;g.stroke();
  for(let i=0;i<3;i++){const a=now*1.4+i*TAU/3;g.save();g.translate(Math.cos(a)*19,Math.sin(a)*7-2);g.beginPath();g.moveTo(0,-4);g.lineTo(2.5,0);g.lineTo(0,4);g.lineTo(-2.5,0);g.closePath();g.fillStyle=col(80);g.fill();g.restore();}
  g.restore();g.restore();
}
function drawPortal(Pt,now){
  if(MAP.garden&&gardenStamp(gardenArt.portal,Pt.x,Pt.y,T,T))return; // aufrecht stehendes Tor
  const ref=forestSprite("portal");
  if(ref||artOk("portal")){const p=P(Pt.x,Pt.y,0),im=ref||ARTI.portal;g.save();g.translate(p.x,p.y);g.scale(p.s,p.s);
    g.globalCompositeOperation="lighter";g.fillStyle=radial(g,0,-22,0,40,[[0,"rgba(190,90,255,"+(.45+.12*Math.sin(now*3))+")"],[1,"rgba(120,40,200,0)"]]);g.fillRect(-40,-62,80,80);g.globalCompositeOperation="source-over";
    const h=ref?64:46,w=h*im.naturalWidth/im.naturalHeight;g.drawImage(im,-w/2,4-h,w,h);g.restore();return;}
  const p=P(Pt.x,Pt.y,0);g.save();g.translate(p.x,p.y);g.scale(p.s,p.s);
  const rx=Pt.h?15:9,ry=20,cy=-ry-2;
  g.globalCompositeOperation="lighter";g.fillStyle=radial(g,0,cy,0,38,[[0,"rgba(190,90,255,.55)"],[1,"rgba(120,40,200,0)"]]);g.fillRect(-40,cy-40,80,80);g.globalCompositeOperation="source-over";
  ell(g,0,0,rx+5,6);g.fillStyle="rgba(40,10,70,.45)";g.fill();
  ell(g,0,cy,rx+3,ry+3);g.fillStyle="#3a3046";g.fill();g.strokeStyle=OUTLINE;g.lineWidth=2;g.stroke();
  ell(g,0,cy,rx,ry);g.fillStyle=radial(g,0,cy,0,ry,[[0,"#05000c"],[.7,"#2a0a4a"],[1,"#6a2aa8"]]);g.fill();
  g.save();g.beginPath();g.ellipse(0,cy,rx,ry,0,0,TAU);g.clip();
  g.globalCompositeOperation="lighter";g.lineWidth=1.6;g.lineCap="round";
  for(let k=0;k<4;k++){g.save();g.translate(0,cy);g.scale(rx/ry,1);g.rotate(now*2.2+k*TAU/4);g.beginPath();
    for(let i=0;i<=16;i++){const a=i/16*PI*1.3,rad=3+i*1.05;i?g.lineTo(Math.cos(a)*rad,Math.sin(a)*rad):g.moveTo(Math.cos(a)*rad,Math.sin(a)*rad);}
    g.strokeStyle="rgba(210,150,255,.6)";g.stroke();g.restore();}
  g.restore();
  for(let i=0;i<3;i++){const a=now*1.5+i*TAU/3;g.fillStyle="#d8b0ff";g.beginPath();g.arc(Math.cos(a)*(rx+4),cy+Math.sin(a)*(ry+4),1.6,0,TAU);g.fill();}
  g.restore();g.globalCompositeOperation="source-over";
}
// ---------- Hilfen für Flächen auf dem Boden ----------
function drawWorldLayer(img,alpha){
  if(MAP.garden){const a=P(0,0,0);g.save();g.globalAlpha=alpha??1;g.drawImage(img,a.x,a.y,W*a.s,H*a.s);g.restore();return;}
  if(forestWide){
    const a=P(0,0,0),k=a.s;
    g.save();g.globalAlpha=alpha??1;g.translate(a.x,a.y);
    g.transform(0,-.83*k,k,0,0,0);g.drawImage(img,0,0,W,H);g.restore();return;
  }
 // weltflaches Bild perspektivisch auf die Bodenebene legen
  const n=ROWS*4,ih=img.height,iw=img.width;g.globalAlpha=alpha==null?1:alpha;
  for(let i=0;i<n;i++){const a=P(W/2,i/n*H,0),b=P(W/2,(i+1)/n*H,0),k=(a.s+b.s)/2;g.drawImage(img,0,i/n*ih,iw,ih/n,a.x-W/2*k,a.y,W*k,b.y-a.y+.7);}
  g.globalAlpha=1;
}
function drawCliff(){
  const n=6,ih=cliffCv.height,iw=cliffCv.width;
  for(let i=0;i<n;i++){const a=P(W/2,H,-i/n*CLIFF),b=P(W/2,H,-(i+1)/n*CLIFF),k=(a.s+b.s)/2;g.drawImage(cliffCv,0,i/n*ih,iw,ih/n,a.x-W/2*k,a.y,W*k,b.y-a.y+.7);}
  const a=P(0,H,0),b=P(W,H,0),c=P(W,H,-CLIFF),d=P(0,H,-CLIFF),e=P(0,0,0),f=P(W,0,0);
  g.beginPath();g.moveTo(e.x,e.y);g.lineTo(f.x,f.y);g.lineTo(b.x,b.y);g.lineTo(c.x,c.y);g.lineTo(d.x,d.y);g.lineTo(a.x,a.y);g.closePath();
  g.strokeStyle=OUTLINE;g.lineWidth=2.6;g.lineJoin="round";g.stroke();
}
function cellPath(c,r,z,ins){const i=ins||0,x0=c*T+i,x1=(c+1)*T-i,y0=r*T+i,y1=(r+1)*T-i,a=P(x0,y0,z),b=P(x1,y0,z),d=P(x1,y1,z),e=P(x0,y1,z);
  g.beginPath();g.moveTo(a.x,a.y);g.lineTo(b.x,b.y);g.lineTo(d.x,d.y);g.lineTo(e.x,e.y);g.closePath();}
function groundCircle(x,y,r,z){g.beginPath();for(let k=0;k<=44;k++){const a=k/44*TAU,p=P(x+Math.cos(a)*r,y+Math.sin(a)*r,z||0);k?g.lineTo(p.x,p.y):g.moveTo(p.x,p.y);}g.closePath();}
function groundEll(x,y,r,z){const p=P(x,y,z||0);ell(g,p.x,p.y,r*p.s,r*p.s*sP);return p;}
function routePath(pts,z){g.beginPath();pts.forEach((q,i)=>{const p=P(q.x,q.y,z||1);i?g.lineTo(p.x,p.y):g.moveTo(p.x,p.y);});}
function drawShadows(){
  const dx=WH*.8,dy=-WH*.55;g.save();{const a=P(0,0,0),b=P(W,0,0),c=P(W,H,0),d=P(0,H,0);g.beginPath();g.moveTo(a.x,a.y);g.lineTo(b.x,b.y);g.lineTo(c.x,c.y);g.lineTo(d.x,d.y);g.closePath();g.clip();}
  g.beginPath();
  for(const t of S.towers){if(t.type!=="wall"&&TWI[t.type]&&artOk(TWI[t.type]))continue;const x0=t.c*T+BIN,x1=(t.c+1)*T-BIN,y0=t.r*T+BIN,y1=(t.r+1)*T-BIN;
    [[x0,y1],[x0,y0],[x0+dx,y0+dy],[x1+dx,y0+dy],[x1+dx,y1+dy],[x1,y1]].forEach(([x,y],k)=>{const p=P(x,y,0);k?g.lineTo(p.x,p.y):g.moveTo(p.x,p.y);});g.closePath();}
  g.fillStyle="rgba(8,34,24,.27)";g.fill();
  g.lineCap="round";g.strokeStyle="rgba(8,34,24,.15)";
  for(const t of S.towers){if(t.type==="wall")continue;const a=P(t.x+dx*.7,t.y+dy*.7,0),b=P(t.x+dx*2.3,t.y+dy*2.3,0);g.lineWidth=17*U*a.s;g.beginPath();g.moveTo(a.x,a.y);g.lineTo(b.x,b.y);g.stroke();}
  g.restore();
}
function drawBanner(){
  const b=S.banner;if(!b)return;const T1=2.2;if(b.t>T1){S.banner=null;return;}
  const inA=Math.min(1,b.t/.25),outA=b.t>T1-.35?(T1-b.t)/.35:1,a=Math.min(inA,outA),sc=.7+.3*(1-Math.pow(1-inA,3));
  g.save();g.globalAlpha=a;g.translate(CW/2,CH*.4);g.scale(sc,sc);
  g.fillStyle=linear(g,-CW/2,0,CW/2,0,[[0,"rgba(10,14,28,0)"],[.2,"rgba(10,14,28,.82)"],[.8,"rgba(10,14,28,.82)"],[1,"rgba(10,14,28,0)"]]);g.fillRect(-CW/2,-38,CW,76);
  g.fillStyle=linear(g,-CW/2,0,CW/2,0,[[0,"rgba(255,210,94,0)"],[.5,b.col],[1,"rgba(255,210,94,0)"]]);g.fillRect(-CW/2,-38,CW,2);g.fillRect(-CW/2,36,CW,2);
  g.textAlign="center";g.textBaseline="middle";
  g.lineJoin="round";g.font="900 36px "+FONT;g.lineWidth=8;g.strokeStyle=OUTLINE;g.strokeText(b.txt,0,-8);
  g.fillStyle=linear(g,0,-26,0,8,[[0,"#ffffff"],[.5,b.col],[1,b.col]]);g.fillText(b.txt,0,-8);
  g.font="800 16px "+FONT;g.lineWidth=4.5;g.strokeText(b.sub,0,22);g.fillStyle="#ffffff";g.fillText(b.sub,0,22);
  g.restore();
}
let gridA=.12;
const embers=Array.from({length:70},()=>({x:Math.random()*W,y:Math.random()*H,s:.4+Math.random()*1.1,p:Math.random()*TAU,ph:Math.random()}));
const motes=Array.from({length:24},()=>({x:Math.random()*W,y:Math.random()*H,z:20+Math.random()*70,s:.5+Math.random(),p:Math.random()*TAU}));
function draw(now){
  g.setTransform(1,0,0,1,0,0);g.clearRect(0,0,cv.width,cv.height);
  if(S.shake>0){const m=S.shake*10;shX=(Math.random()-.5)*m;shY=(Math.random()-.5)*m;}else shX=shY=0;
  const Z=dpr*VZ;g.setTransform(Z,0,0,Z,dpr*(VX+shX*VZ),dpr*(VY+shY*VZ));
  // Schatten unter der schwebenden Insel
  {const p=P(W/2,H,-CLIFF);g.fillStyle=radial(g,p.x,p.y+8,4,W*p.s*.62,[[0,"rgba(5,20,60,.35)"],[1,"rgba(5,20,60,0)"]]);g.save();g.translate(p.x,p.y+8);g.scale(1,.22);g.beginPath();g.arc(0,0,W*p.s*.62,0,TAU);g.restore();g.fill();}
  if(MAP.garden){
    const a=P(0,0),scale=T*a.s/42;
    if(gardenArt.board.naturalWidth)g.drawImage(gardenArt.board,a.x-27*scale,a.y-36*scale,516*scale,786*scale);
    else drawWorldLayer(bg);
  }else if(forestWide&&forestPlate.complete&&forestPlate.naturalWidth){
    g.save();g.setTransform(dpr,0,0,dpr,0,0);g.drawImage(forestPlate,0,0,CW,CH);g.restore();
    drawWorldLayer(bg);
  }else{
    if(!forestWide)drawCliff();drawWorldLayer(bg);
  }
  for(const d of S.decals){const a=(d.kind==="poison"?.45:.38)*(1-d.t/d.max),p=P(d.x,d.y,0),rx=d.r*p.s;g.save();g.translate(p.x,p.y);g.scale(1,sP);
    g.fillStyle=radial(g,0,0,0,rx,d.kind==="poison"?[[0,"rgba(120,220,60,"+a+")"],[1,"rgba(80,160,30,0)"]]:[[0,d.fire?"rgba(60,20,0,"+a+")":"rgba(30,20,10,"+a+")"],[1,"rgba(30,20,10,0)"]]);
    g.beginPath();g.arc(0,0,rx,0,TAU);g.fill();g.restore();}
  for(const pl of S.pools){const a=Math.min(1,(pl.max-pl.t)*2)*Math.min(1,pl.t*6),fire=pl.kind==="fire",p=P(pl.x,pl.y,0),rx=pl.r*p.s;g.save();g.translate(p.x,p.y);g.scale(1,sP);
    g.globalAlpha=a*.75;g.fillStyle=radial(g,0,0,0,rx,fire?[[0,"rgba(255,220,120,.9)"],[.5,"rgba(255,110,20,.7)"],[1,"rgba(160,30,0,0)"]]:[[0,"rgba(200,255,120,.8)"],[.6,"rgba(110,200,40,.55)"],[1,"rgba(60,120,20,0)"]]);
    g.beginPath();g.arc(0,0,rx*(1+Math.sin(now*5+pl.x)*.04),0,TAU);g.fill();g.restore();g.globalAlpha=1;}
  g.lineCap="round";g.lineJoin="round";
  const building=S.build&&S.started&&!S.over;
  if(building){const act=touch||S.pending||S.plan.length||S.hover>=0;gridA+=((act?.85:.12)-gridA)*.15;drawWorldLayer(gridCv,gridA);}
  if(!forestWide&&!MAP.garden)drawShadows();
  if(MAP!==MAPS[0]||showPath||S.plan.length)for(const si of SPAWNS){const zx=cx(si),zy=cy(si),zk=P(zx,zy,0).s;groundCircle(zx,zy,(ZR+.2)*T,.6);g.fillStyle="rgba(170,110,255,.10)";g.fill();
    g.setLineDash([6*zk,8*zk]);g.lineDashOffset=-now*16*zk;g.strokeStyle="rgba(215,185,255,.7)";g.lineWidth=2*zk;g.stroke();g.setLineDash([]);}
  const routes=S.planRoutes||S.routes;
  for(const rt of routes){if(rt.length<2)continue;const k=P(W/2,H/2,0).s;
    if(MAP.garden){
      g.setLineDash([.4*k,8*k]);g.lineDashOffset=-now*12*k;routePath(rt,0);
      g.strokeStyle="#426157";g.lineWidth=5*k;g.stroke();g.strokeStyle="#b4ffdf";g.lineWidth=3*k;g.stroke();g.setLineDash([]);continue;
    }
    if(MAP===MAPS[0]){
      routePath(rt,.5);g.strokeStyle="#534427b5";g.lineWidth=T*.79*k;g.stroke();
      routePath(rt,.6);g.strokeStyle="#b69a71";g.lineWidth=T*.72*k;g.stroke();
      const texture=forestStone.complete&&forestStone.naturalWidth?g.createPattern(forestStone,"repeat"):null;
      routePath(rt,.7);g.strokeStyle=texture||"#d5b987";g.lineWidth=T*.66*k;g.stroke();
      if(!S.planRoutes)continue;
    }
    routePath(rt,.5);g.strokeStyle="rgba(150,105,55,.32)";g.lineWidth=T*.42*k;g.stroke();
    g.setLineDash([2*k,11*k]);g.lineDashOffset=-now*40*k;routePath(rt,1.5);g.strokeStyle=S.planRoutes?"rgba(200,255,215,.9)":"rgba(255,250,225,.7)";g.lineWidth=3.2*k;g.stroke();g.setLineDash([]);}
  if(showPath&&S.started&&!S.over){for(const rt of routes){if(rt.length<2)continue;const k=P(W/2,H/2,0).s;
    routePath(rt,2);g.strokeStyle="rgba(255,170,60,.28)";g.lineWidth=T*.9*k;g.stroke();
    routePath(rt,2.5);g.strokeStyle="rgba(255,225,120,.55)";g.lineWidth=T*.38*k;g.stroke();
    g.setLineDash([10*k,16*k]);g.lineDashOffset=-now*60*k;routePath(rt,3);g.strokeStyle="rgba(255,255,255,.95)";g.lineWidth=3.6*k;g.stroke();g.setLineDash([]);}}
  if(TH===THEMES.lava&&MAP.lava){g.globalCompositeOperation="lighter";
    for(const [lc,lr] of MAP.lava){const q=P((lc+.5)*T,(lr+.5)*T,2),a=.13+.07*Math.sin(now*1.7+lc*1.3+lr*.9),rd=T*1.15*q.s;
      g.fillStyle=radial(g,q.x,q.y,0,rd,[[0,"rgba(255,140,40,"+a+")"],[1,"rgba(255,60,0,0)"]]);g.fillRect(q.x-rd,q.y-rd,rd*2,rd*2);}
    g.globalCompositeOperation="source-over";}
  drawTraps(now);
  const Pd=S.pending;
  if(Pd&&Pd.trap){const k=P((Pd.c+.5)*T,(Pd.r+.5)*T,0).s;cellPath(Pd.c,Pd.r,.5,2);g.fillStyle=Pd.ok?"rgba(126,240,160,.3)":"rgba(255,93,108,.32)";g.fill();g.strokeStyle=Pd.ok?"#7ef0a0":"#ff5d6c";g.lineWidth=2*k;g.stroke();}
  else if(Pd){
    const x=(Pd.c+.5)*T,y=(Pd.r+.5)*T,d=TD[S.build],cost=Pd.convert?costOf(S.build)-costOf("wall"):costOf(S.build),ok=Pd.ok&&S.gold>=cost,k=P(x,y,0).s;
    if(Pd.routes)for(const rt of Pd.routes){if(rt.length<2)continue;g.setLineDash([6*k,6*k]);g.lineDashOffset=-now*30*k;routePath(rt,2);g.strokeStyle="rgba(126,240,160,.95)";g.lineWidth=2.5*k;g.stroke();g.setLineDash([]);}
    if(d.range){groundCircle(x,y,d.range*T,1);g.fillStyle=ok?"rgba(255,255,255,.12)":"rgba(255,80,90,.12)";g.fill();g.setLineDash([6*k,5*k]);g.strokeStyle=ok?"rgba(255,255,255,.8)":"rgba(255,93,108,.85)";g.lineWidth=1.6*k;g.stroke();g.setLineDash([]);}
    cellPath(Pd.c,Pd.r,Pd.convert?WH+.5:.5,2);g.fillStyle=ok?"rgba(126,240,160,.3)":"rgba(255,93,108,.32)";g.fill();g.strokeStyle=ok?"#7ef0a0":"#ff5d6c";g.lineWidth=2*k;g.stroke();
  }
  if(S.sel&&S.sel.st){const st=S.sel.st,k=P(S.sel.x,S.sel.y,0).s;groundCircle(S.sel.x,S.sel.y,st.range,1);g.fillStyle="rgba(255,210,94,.16)";g.fill();
    g.setLineDash([6*k,5*k]);g.strokeStyle="rgba(255,210,94,.9)";g.lineWidth=1.7*k;g.stroke();g.setLineDash([]);}
  // ---------- Objekte von hinten nach vorne ----------
  const list=[];
  for(const t of S.towers)list.push([(t.r+.5)*T+.02+t.x*1e-5,0,t]);
  for(const i of S.plan)list.push([(((i/COLS)|0)+.5)*T+.02,3,i]);
  for(const e of S.enemies)list.push([e.air?e.y+1000:e.y+(e.oy||0),1,e]);
  list.push([CRY.y+.03,2,null],[CRY.y+T*.27,6,null]);
  for(const Pt of PORTALS)list.push([Pt.y-.5,4,Pt]);
  if(Pd&&Pd.ok&&!Pd.trap)list.push([(Pd.r+.5)*T+.04,5,Pd]);
  if(forestWide){
    const depth=([y,k,o])=>k===3?P(cx(o),cy(o),0).y:k===2||k===6?P(CRY.x,y,0).y:k===5?P((o.c+.5)*T,y,0).y:P(o.x,y,0).y;
    list.sort((a,b)=>depth(a)-depth(b));
  }else list.sort((a,b)=>a[0]-b[0]);
  for(const [,k,o] of list){
    if(k===0)drawTower(o,now);
    else if(k===1)drawEnemy(o,now);
    else if(k===2){if(!S.over||S.t%1>.5||S.lives>0)drawCrystal(now);}
    else if(k===3)drawGhostBlock(o,true,.78+Math.sin(now*8)*.12);
    else if(k===4)drawPortal(o,now);
    else if(k===6)drawEmmiWatch(now);
    else{const x=(o.c+.5)*T,y=(o.r+.5)*T,p=P(x,y,WH),sp=sprite(S.build,1,-1),sz=sp.sz;
      if(!o.convert&&S.build!=="wall")drawGhostBlock(o.i,true,.45);
      g.save();g.translate(p.x,p.y);g.scale(p.s,p.s);g.globalAlpha=.65+Math.sin(now*6)*.15;
      if(S.build!=="wall"){g.drawImage(sp.base,-sz/2,-13*U-sz/2,sz,sz);g.drawImage(sp.top,-sz/2,(TOPY-13)*U-sz/2,sz,sz);}
      g.globalAlpha=1;
      const cost=o.convert?costOf(S.build)-costOf("wall"):costOf(S.build),ok=S.gold>=cost,lb=ok?"✓ Nochmal tippen":"Zu wenig Gold";
      g.font="900 13px "+FONT;g.textAlign="center";g.textBaseline="middle";const bw=g.measureText(lb).width+14,by=-58*U+Math.sin(now*5)*2;
      rr(g,-bw/2,by-10,bw,20,10);g.fillStyle=ok?"rgba(30,130,70,.95)":"rgba(150,30,40,.95)";g.fill();g.strokeStyle="rgba(255,255,255,.7)";g.lineWidth=1;g.stroke();g.fillStyle="#fff";g.fillText(lb,0,by+.5);
      g.restore();}
  }
  // Markierungen auf den Mauerkronen / am Finger
  if(building&&S.build!=="wall"&&S.build!=="trap"){g.setLineDash([5,4]);g.lineDashOffset=-now*20;
    for(const t of S.towers)if(t.type==="wall"&&t.wk!=="gate"){cellPath(t.c,t.r,WH+.3,BIN+1.5);g.strokeStyle=OUTLINE;g.lineWidth=3.6;g.stroke();g.strokeStyle="#ffe14d";g.lineWidth=1.9;g.stroke();}
    g.setLineDash([]);}
  if(S.sel){const z=S.sel.type==="trap"||S.sel.open?.6:WH+.4;cellPath(S.sel.c,S.sel.r,z,1);g.strokeStyle="#ffd25e";g.lineWidth=2.4;g.stroke();}
  if(S.hover>=0&&touch){const c=S.hover%COLS,r=(S.hover/COLS)|0,o=occ[S.hover],free=!o&&!rock[S.hover]&&!SPAWNS.includes(S.hover)&&S.hover!==GI;
    cellPath(c,r,o&&o!==PLAN?WH+.5:.5,1);g.strokeStyle=OUTLINE;g.lineWidth=4;g.stroke();g.strokeStyle=free||o===PLAN||(o&&S.build!=="wall")?"#ffffff":"#ff8a94";g.lineWidth=2.2;g.stroke();}
  if(S.planBad&&S.planBad.t>0){const i=S.planBad.i;cellPath(i%COLS,(i/COLS)|0,.5,2);g.fillStyle="rgba(255,60,70,"+(S.planBad.t*1.2)+")";g.fill();}
  // ---------- Geschosse: Leuchtspur, Schatten, detailreiche Grafik ----------
  for(const p of S.proj){
    const a=P(p.x,p.y,p.z),b=P(p.lx,p.ly,p.lz),ang=Math.atan2(a.y-b.y,a.x-b.x),s=a.s,sc=1+.07*((p.lv||1)-1),tr=p.tr,n=tr.length/3;
    const sh=P(p.x,p.y,0);ell(g,sh.x,sh.y,5*s*sc,2.3*s*sc);g.fillStyle="rgba(0,0,0,.24)";g.fill();
    if(n>1){const col=p.burn?"255,140,50":p.acid?"255,225,90":TRAIL[p.type],add=p.type!=="cannon"||p.burn;if(add)g.globalCompositeOperation="lighter";
      let q0=P(tr[0],tr[1],tr[2]);
      for(let k=1;k<=n;k++){const q1=k<n?P(tr[k*3],tr[k*3+1],tr[k*3+2]):a,f=k/n;g.strokeStyle="rgba("+col+","+(f*f*(p.type==="arrow"?.5:.6))+")";g.lineWidth=(p.type==="arrow"?2.2:p.type==="cannon"?7:5.5)*f*s*sc;
        g.beginPath();g.moveTo(q0.x,q0.y);g.lineTo(q1.x,q1.y);g.stroke();q0=q1;}
      g.globalCompositeOperation="source-over";}
    g.save();g.translate(a.x,a.y);g.scale(s*sc,s*sc);
    if(p.lv>=MAXL||p.type==="frost"||p.type==="poison"||p.burn){g.globalCompositeOperation="lighter";const gc=p.lv>=MAXL?"255,215,100":p.burn?"255,140,40":p.type==="frost"?"150,215,255":p.acid?"255,235,120":"170,255,110";
      g.fillStyle=radial(g,0,0,0,13,[[0,"rgba("+gc+",.7)"],[1,"rgba("+gc+",0)"]]);g.fillRect(-13,-13,26,26);g.globalCompositeOperation="source-over";}
    if(p.type==="cannon"&&!p.burn)g.rotate(p.prog*9);
    else{g.rotate(ang);if(p.type==="poison"){const w=Math.sin(now*22+p.d0)*.1;g.scale(1+w,1-w);}}
    const sp=projSprite(projKind(p));g.drawImage(sp,-PSZ/2,-PSZ/2,PSZ,PSZ);
    g.restore();
  }
  for(const m of S.meteors){
    if(m.t<.6){const f=m.t/.6,k=P(m.x,m.y,0).s;
      groundCircle(m.x,m.y,1.7*T*(1-f*.3),1);g.strokeStyle="rgba(255,90,60,"+(.45+.4*f)+")";g.lineWidth=2.2*k;g.setLineDash([6*k,5*k]);g.stroke();g.setLineDash([]);
      const z=520*(1-f),mx=m.x+90*(1-f),my=m.y-130*(1-f),a=P(mx,my,z),tl=P(mx+40,my-60,z+160),s=a.s;
      const sh=P(m.x,m.y,0);ell(g,sh.x,sh.y,(10+f*14)*sh.s,(4+f*6)*sh.s);g.fillStyle="rgba(0,0,0,"+(.15+f*.25)+")";g.fill();
      g.globalCompositeOperation="lighter";
      g.strokeStyle="rgba(255,170,80,.55)";g.lineWidth=12*s;g.beginPath();g.moveTo(tl.x,tl.y);g.lineTo(a.x,a.y);g.stroke();
      g.fillStyle=radial(g,a.x,a.y,0,24*s,[[0,"rgba(255,240,200,1)"],[.4,"rgba(255,150,50,.85)"],[1,"rgba(255,60,0,0)"]]);g.fillRect(a.x-24*s,a.y-24*s,48*s,48*s);
      g.globalCompositeOperation="source-over";g.beginPath();g.arc(a.x,a.y,7.5*s,0,TAU);g.fillStyle="#5a2a10";g.fill();g.strokeStyle=OUTLINE;g.lineWidth=1.2*s;g.stroke();}
  }
  g.globalCompositeOperation="lighter";
  for(const b of S.bolts){const a=1-b.t/.16,pts=[];
    const pp=b.pts.map(q=>P(q.x,q.y,q.z));pts.push(pp[0]);
    for(let i=1;i<pp.length;i++){const p0=pp[i-1],p1=pp[i];for(let k=1;k<=5;k++){const f=k/5,j=k<5?10*p1.s:0;pts.push({x:p0.x+(p1.x-p0.x)*f+(Math.random()-.5)*j,y:p0.y+(p1.y-p0.y)*f+(Math.random()-.5)*j});}}
    for(const [lw,col] of [[8,"rgba(160,80,255,"+(.25*a)+")"],[3.5,"rgba(200,140,255,"+(.6*a)+")"],[1.4,"rgba(255,255,255,"+a+")"]]){g.beginPath();pts.forEach((q,i)=>i?g.lineTo(q.x,q.y):g.moveTo(q.x,q.y));g.strokeStyle=col;g.lineWidth=lw;g.stroke();}}
  for(const b of S.tracers){const a=1-b.t/.18,p1=P(b.x1,b.y1,b.z1),p2=P(b.x2,b.y2,b.z2);
    for(const [lw,col] of [[b.crit?11:8,b.crit?"rgba(255,60,60,"+(a*.3)+")":"rgba(255,200,90,"+(a*.3)+")"],[b.crit?4:3,b.crit?"rgba(255,110,110,"+a+")":"rgba(255,235,150,"+a+")"],[1.2,"rgba(255,255,255,"+a+")"]]){g.strokeStyle=col;g.lineWidth=lw*p2.s/VS*.8;g.beginPath();g.moveTo(p1.x,p1.y);g.lineTo(p2.x,p2.y);g.stroke();}}
  g.globalCompositeOperation="source-over";
  // ---------- Partikel ----------
  for(const p of S.parts){const a=1-p.t/p.max;
    if(p.k==="smoke"){const q=P(p.x,p.y,p.z);g.fillStyle=p.green?"rgba(150,225,90,"+(.42*a)+")":p.tone?"rgba(205,180,138,"+(.5*a)+")":"rgba(70,70,78,"+(.38*a)+")";g.beginPath();g.arc(q.x,q.y,p.r*q.s*(1+(1-a)*1.4),0,TAU);g.fill();}
    else if(p.k==="debris"){const q=P(p.x,p.y,p.z);g.globalAlpha=Math.min(1,a*2);g.fillStyle=p.col;const r_=p.r*q.s;g.fillRect(q.x-r_/2,q.y-r_/2,r_,r_);g.globalAlpha=1;}
    else if(p.k==="flake"){const q=P(p.x,p.y,p.z);g.globalAlpha=a;g.fillStyle="#eaf8ff";g.beginPath();g.arc(q.x,q.y,p.r*q.s,0,TAU);g.fill();g.globalAlpha=1;}
    else if(p.k==="ring"){g.globalAlpha=a;g.strokeStyle=p.col;const q=groundEll(p.x,p.y,p.r*(.3+.7*(1-a)),p.z||1);g.lineWidth=(3*a+.5)*q.s;g.stroke();g.globalAlpha=1;}
    else if(p.k==="burst"){const q=P(p.x,p.y,p.z),f=Math.min(1,p.t/p.max),e=1-(1-f)*(1-f),ro=p.r*q.s*(.35+.65*e),ri=ro*.5,n=p.n;
      g.globalAlpha=f<.55?1:1-(f-.55)/.45;g.beginPath();for(let k=0;k<n*2;k++){const an=p.rot+k*PI/n,rd=k%2?ri:ro;g.lineTo(q.x+Math.cos(an)*rd,q.y+Math.sin(an)*rd);}g.closePath();
      g.fillStyle=p.col;g.fill();g.strokeStyle=OUTLINE;g.lineWidth=1.3*q.s/VS;g.lineJoin="round";g.stroke();
      g.beginPath();for(let k=0;k<n*2;k++){const an=p.rot+k*PI/n,rd=(k%2?ri:ro)*.55;g.lineTo(q.x+Math.cos(an)*rd,q.y+Math.sin(an)*rd);}g.closePath();g.fillStyle="#fffdf0";g.fill();g.globalAlpha=1;}
    else if(p.k==="spike"){const q=P(p.x,p.y,0),gr=Math.max(0,Math.min(1,p.t/.08))*(1-Math.max(0,(p.t-p.max*.6)/(p.max*.4))),h=p.h*gr*q.s,w=3.2*q.s;
      g.beginPath();g.moveTo(q.x-w,q.y);g.lineTo(q.x,q.y-h);g.lineTo(q.x+w,q.y);g.closePath();g.fillStyle=linear(g,q.x-w,0,q.x+w,0,[[0,"#f2fbff"],[.5,"#bfe6ff"],[1,"#6cb8ee"]]);g.fill();g.strokeStyle="rgba(20,70,120,.7)";g.lineWidth=.8;g.stroke();}}
  g.globalCompositeOperation="lighter";
  for(const p of S.parts){const a=1-p.t/p.max;
    if(p.k==="spark"){const q=P(p.x,p.y,p.z);g.globalAlpha=a;g.fillStyle=p.col;g.beginPath();g.arc(q.x,q.y,p.r*q.s*(.4+.6*a),0,TAU);g.fill();}
    else if(p.k==="flash"){const q=P(p.x,p.y,p.z==null?8:p.z);g.globalAlpha=a;const rad=p.r*q.s*(.5+.5*(1-a));g.fillStyle=radial(g,q.x,q.y,0,rad,[[0,"rgba(255,255,230,.9)"],[.3,p.col],[1,"rgba(0,0,0,0)"]]);g.fillRect(q.x-rad,q.y-rad,rad*2,rad*2);}}
  if(TH===THEMES.lava){for(const m of embers){const ph=(now*.09*m.s+m.ph)%1,q=P((m.x+Math.sin(now*.8*m.s+m.p)*18+W)%W,((m.y-now*5*m.s)%H+H)%H,6+ph*120),a=Math.sin(ph*PI)*(.55+.35*Math.sin(now*9*m.s+m.p));
    g.globalAlpha=Math.max(0,a);g.fillStyle=ph<.5?"#ffb347":"#ff6a2a";g.beginPath();g.arc(q.x,q.y,1.5*q.s*(1.2-ph*.6),0,TAU);g.fill();
    g.globalAlpha=Math.max(0,a)*.35;g.fillStyle=radial(g,q.x,q.y,0,5*q.s,[[0,"rgba(255,150,50,1)"],[1,"rgba(255,80,0,0)"]]);g.fillRect(q.x-5*q.s,q.y-5*q.s,10*q.s,10*q.s);}}
  else for(const m of motes){const q=P((m.x+Math.sin(now*.6*m.s+m.p)*14+W)%W,((m.y-now*7*m.s)%H+H)%H,m.z);g.globalAlpha=.25+.25*Math.sin(now*2*m.s+m.p);g.fillStyle=TH===THEMES.dark?"#c9b6ff":"#fff6c0";g.beginPath();g.arc(q.x,q.y,1.3*q.s,0,TAU);g.fill();}
  g.globalAlpha=1;g.globalCompositeOperation="source-over";
  g.textAlign="center";g.textBaseline="middle";g.lineJoin="round";
  for(const x of S.texts){const q=P(x.x,x.y,x.z);g.globalAlpha=1-Math.max(0,x.t-.5)/.4;g.font=(x.big?"900 19px ":"900 15px ")+FONT;
    const sc=(1+Math.max(0,.15-x.t)*3)*Math.min(1.15,Math.max(.8,q.s/VS));g.save();g.translate(q.x,q.y);g.scale(sc,sc);g.lineWidth=4;g.strokeStyle=OUTLINE;g.strokeText(x.txt,0,0);g.fillStyle=x.col;g.fillText(x.txt,0,0);g.restore();}
  g.globalAlpha=1;
  // ---------- Bildschirm-Ebene (ohne Zoom) ----------
  g.setTransform(dpr,0,0,dpr,0,0);
  g.drawImage(vig,0,0,CW,CH);
  if(TH===THEMES.lava){const pu=.5+.5*Math.sin(now*1.4),R=Math.max(CW,CH);
    g.fillStyle=radial(g,CW/2,CH*.5,Math.min(CW,CH)*.35,R*.8,[[0,"rgba(40,0,10,0)"],[1,"rgba(60,6,10,.42)"]]);g.fillRect(0,0,CW,CH);
    g.globalCompositeOperation="lighter";g.fillStyle=linear(g,0,CH,0,CH*.6,[[0,"rgba(255,90,20,"+(.10+.05*pu)+")"],[1,"rgba(255,90,20,0)"]]);g.fillRect(0,CH*.6,CW,CH*.4);g.globalCompositeOperation="source-over";}
  if(S.started){g.font="800 13.5px "+FONT;const txt=(S.daily?"Tagesaufgabe":MAP.name)+" · "+DF().name+" · Weg "+Math.round(S.plan.length?S.planLen:S.pathLen)+" (≈"+pathSec(S.plan.length?S.planLen:S.pathLen)+" s)",w=g.measureText(txt).width+18;
    rr(g,8,8,w,22,11);g.fillStyle="rgba(10,14,28,.7)";g.fill();g.strokeStyle="rgba(255,210,94,.4)";g.lineWidth=1;g.stroke();
    g.fillStyle="#ffe9b0";g.textAlign="left";g.fillText(txt,17,19.5);
    if(S.combo>=5&&S.t-S.comboT<1.5){const f=1-(S.t-S.comboT)/1.5,tx="Combo ×"+S.combo;g.font="900 17px "+FONT;g.textAlign="right";
      g.lineWidth=3.5;g.strokeStyle="rgba(40,20,0,.85)";g.strokeText(tx,CW-10,20);g.fillStyle=S.combo>=20?"#ff7a3a":"#ffd25e";g.fillText(tx,CW-10,20);
      g.fillStyle="rgba(0,0,0,.5)";g.fillRect(CW-80,31,70,3);g.fillStyle="#ffd25e";g.fillRect(CW-80,31,70*f,3);}}
  if(S.aiming){g.fillStyle="rgba(255,60,30,.08)";g.fillRect(0,0,CW,CH);}
  if(S.hurt>0){g.fillStyle=radial(g,CW/2,CH/2,Math.min(CW,CH)*.3,Math.max(CW,CH)*.7,[[0,"rgba(255,0,30,0)"],[1,"rgba(255,20,40,"+(S.hurt*.7)+")"]]);g.fillRect(0,0,CW,CH);}
  if(S.flash>0){g.fillStyle="rgba(255,250,235,"+(S.flash*.55)+")";g.fillRect(0,0,CW,CH);}
  if(S.slowmo>0){g.strokeStyle="rgba(255,210,94,"+Math.min(.6,S.slowmo)+")";g.lineWidth=6;g.strokeRect(3,3,CW-6,CH-6);}
  drawBanner();
}

// =====================================================================
//  LOOP
// =====================================================================
let last=performance.now(),uiT=0;
// In Hintergrund-Tabs keine Frames zeichnen; nach Rückkehr keine Zeit nachholen.
document.addEventListener("visibilitychange",()=>{last=performance.now();});
function loop(now){
  if(document.hidden){last=now;requestAnimationFrame(loop);return;}
  try{step(now);}catch(err){console.error("KW",err&&err.stack||err);}
  requestAnimationFrame(loop);
}
// V8: automatische Grafikstufe – wenn das Gerät dauerhaft unter ~40 fps fällt, Auflösung einmalig senken
let kwPerfT=0,kwPerfN=0,kwPerfSlow=0;
function kwPerfWatch(raw){
  if(!running()||raw>100)return;kwPerfT+=raw;kwPerfN++;
  if(kwPerfT<3000)return;const avg=kwPerfT/kwPerfN;kwPerfT=0;kwPerfN=0;
  kwPerfSlow=avg>25?kwPerfSlow+1:0;
  if(kwPerfSlow>=2&&kwDprCap>1.25&&(window.devicePixelRatio||1)>1.25){kwPerfSlow=0;kwDprCap=Math.max(1.25,kwDprCap-.5);fit();}
}
function step(now){
  kwPerfWatch(now-last);
  const dt=Math.min(.05,(now-last)/1000);last=now;
  const ts=S.slowmo>0?.3:1;S.slowmo=Math.max(0,S.slowmo-dt);S.flash=Math.max(0,S.flash-dt*2);S.hurt=Math.max(0,S.hurt-dt);
  if(running()){for(let i=0;i<S.speed;i++){update(dt*ts);if(S.over)break;}}
  else if(S.over){S.t+=dt;stepParts(dt);}
  autoTilt();stepTilt(dt);stepZoom(dt);edgePan(dt);if(S.planBad)S.planBad.t-=dt;
  if(S.banner&&!overlay)S.banner.t+=dt;
  S.shake=Math.max(0,S.shake-dt);S.cryHit=Math.max(0,S.cryHit-dt);
  draw(now/1000);drawLoupe();
  uiT+=dt;if((uiDirty&&uiT>.08)||uiT>.25){updateUI();uiDirty=false;uiT=0;}
}
document.addEventListener("gesturestart",e=>e.preventDefault());
document.addEventListener("dblclick",e=>e.preventDefault(),{passive:false});
try{document.fonts&&document.fonts.load("900 16px KW").then(()=>{try{uiDirty=true;buildShop();}catch(e){}});}catch(e){}
// Laufende Runde aus einer Version mit kleinerem Feld verwerfen (passt nicht mehr aufs große Feld)
{const sv=store.get("kw2_run",null);if(sv&&typeof sv==="object"){const m=MAPS[sv.map??0];if(!m||(sv.grid||"11x17")!==(m.cols||11)+"x"+(m.rows||17))store.del("kw2_run");}}
makeTextures();reset({map:0,diff:1});buildShop();renderSound();fit();openOv("ovMenu");
setTimeout(fit,60);
void updateEdition("status");
if(nativeStore?.addListener)void nativeStore.addListener("editionChanged",result=>{
  editionOwned=result.owned===true;
  renderEdition(editionOwned?"Vollversion ist freigeschaltet.":"Vollversion ist derzeit nicht freigeschaltet.");
  if(overlay==="ovMenu")renderMenu();
}).catch(()=>{});
requestAnimationFrame(loop);
// Balance-Simulation (nur mit #sim in der Adresse): spielt Wellen im Schnelldurchlauf ohne Grafik
if(SIM)window.__kw={
  start(map,diff){startRun({map:map||0,diff:diff==null?1:diff});S.gold=1e6;},
  wall(c,r){return tryBuild(c,r,"wall",true);},
  tower(type,c,r,level,branch,perk){const o=occ[idx(c,r)];if(o)return false;if(!tryBuild(c,r,type,true))return false;const t=occ[idx(c,r)];t.level=level||1;t.branch=branch==null?-1:branch;t.perk=perk==null?-1:perk;t.st=tstats(t);return true;},
  cell(c,r,z){return toClient((c+.5)*T,(r+.5)*T,z||0);},
  state(){return{gold:Math.round(S.gold),walls:S.towers.filter(t=>t.type==="wall").length,towers:S.towers.length,undo:S.undo.length,plan:S.plan.length,VZ:+VZ.toFixed(2),pitch:Math.round(PITCH*180/PI),sel:S.sel?S.sel.type+S.sel.level:null,pending:!!S.pending,build:S.build};},
  sel(c,r){const o=occ[idx(c,r)];if(o)select(o);},
  info(){return{cols:COLS,rows:ROWS,path:+S.pathLen.toFixed(1),spawns:SPAWNS.length,traps:S.traps.length,gates:S.towers.filter(t=>t.wk==="gate").length};},
  tap(c,r){const pk={c,r,i:idx(c,r),wx:(c+.5)*T,wy:(r+.5)*T};handleTap(pk);return this.state();},
  ev(code){return eval(code);},
  setBuild(b){S.build=b;uiDirty=true;},
  gold(n){S.gold=n;uiDirty=true;},
  ls(){return meta.ls;},
  botM(map,diff,maxW,K,wf){startRun({map,diff});openOv(null);
    const placed=[];let k=0;
    const walls=()=>{let w=0;while(w<K&&S.gold>=costOf("wall")){let best=null;
        for(let r=0;r<ROWS;r++)for(let c=0;c<COLS;c++){const i=idx(c,r);if(rock[i]||occ[i]||zone[i]||SPAWNS.includes(i)||i===GI)continue;
          const v=canPlace(i);if(!v.ok)continue;const L=Math.min(...SPAWNS.map(s=>v.d[s]));if(!best||L>best.L)best={c,r,L};}
        if(!best||!tryBuild(best.c,best.r,"wall",true,true))break;w++;}};
    const towers=()=>{const R=S.routes.flat(),cells=[];
      for(let r=0;r<ROWS;r++)for(let c=0;c<COLS;c++){const i=idx(c,r);if(rock[i]||zone[i]||SPAWNS.includes(i)||i===GI)continue;const o=occ[i];if(o&&o.type!=="wall")continue;
        const x=(c+.5)*T,y=(r+.5)*T;let cov=0;for(const q of R)if(Math.hypot(q.x-x,q.y-y)<3.2*T)cov++;cells.push({c,r,cov});}
      cells.sort((a,b)=>b.cov-a.cov);
      for(const cl of cells){if(S.gold<costOf("arrow"))break;if(placed.some(p=>Math.hypot(p.c-cl.c,p.r-cl.r)<2.2))continue;const o=occ[idx(cl.c,cl.r)];
        const ty=k%3===2?"cannon":"arrow";if(S.gold<costOf(ty))break;
        if(o){if(S.gold>=costOf(ty)-costOf("wall")){convert(o,ty);placed.push(cl);k++;}}else if(tryBuild(cl.c,cl.r,ty,true,true)){placed.push(cl);k++;}}
      for(let g=0;g<60&&S.gold>0;g++){const ts=S.towers.filter(t=>t.type!=="wall"&&t.level<MAXL).sort((a,b)=>a.level-b.level);if(!ts.length)break;const t=ts[0];S.sel=t;const c0=S.gold;upgrade(t.level===BRL||t.level===PERKL?0:-1);if(S.gold===c0)break;}};
    const spend=()=>{const g0=S.gold;const keep=S.gold*(1-(wf==null?.15:wf));const saved=S.gold;S.gold=Math.min(S.gold,saved*(wf==null?.15:wf));const a=S.gold;walls();const used=a-S.gold;S.gold=saved-used;towers();};
    spend();let steps=0;
    while(!S.over&&steps++<4e6){if(!S.active){if(S.wave>=maxW)break;spend();startWave();}update(.05);}
    openOv(null);return{wave:S.wave,lives:S.lives,of:MAP.waves,over:S.over,walls:S.towers.filter(t=>t.type==="wall").length,towers:S.towers.filter(t=>t.type!=="wall").length,path:+S.pathLen.toFixed(1)};},
  botZ(map,diff,maxW,hpm,wf){
    const mk=(o,off,gap)=>{const p=[];let side=gap;if(o===0){for(let r=off;r<ROWS-1;r+=3){for(let c=0;c<COLS;c++){if(side===0?c===COLS-1:c===0)continue;p.push([c,r]);}side^=1;}}
      else{for(let c=off;c<COLS-1;c+=3){for(let r=0;r<ROWS;r++){if(side===0?r===ROWS-1:r===0)continue;p.push([c,r]);}side^=1;}}return p;};
    let plan=null,bestL=-1,info="";
    for(const o of [0,1])for(const off of [1,2,3])for(const gp of [0,1]){const pl=mk(o,off,gp);startRun({map,diff});S.gold=1e6;
      for(const [c,r] of pl){const i=idx(c,r);if(rock[i]||occ[i]||zone[i]||SPAWNS.includes(i)||i===GI)continue;if(canPlace(i).ok)tryBuild(c,r,"wall",true,true);}
      if(S.pathLen>bestL){bestL=S.pathLen;plan=pl;info=o+"/"+off+"/"+gp;}}
    startRun({map,diff});openOv(null);if(hpm)MAP.hp=hpm;let k=0;wf=wf||.35;
    const cov=(x,y)=>{let n=0;for(const rt of S.routes)for(const q of rt)if(Math.hypot(q.x-x,q.y-y)<3.1*T)n++;return n;};
    const build=()=>{
      const firstT=S.towers.filter(t=>t.type!=="wall").length<2;
      if(!firstT){let budget=S.gold*wf;for(const [c,r] of plan){if(budget<costOf("wall"))break;const i=idx(c,r);if(rock[i]||occ[i]||zone[i]||SPAWNS.includes(i)||i===GI)continue;if(!canPlace(i).ok)continue;if(tryBuild(c,r,"wall",true,true))budget-=costOf("wall");}}
      const want=Math.min(3+S.wave*1.2,24);let guard=0;
      while(guard++<20){const nt=S.towers.filter(t=>t.type!=="wall").length,ty=k%3===2?"cannon":"arrow";if(nt>=want)break;
        let best=null;for(const t of S.towers){if(t.type!=="wall")continue;const s=cov(t.x,t.y);if(!best||s>best.s)best={t,s,conv:1};}
        for(let r=0;r<ROWS;r++)for(let c=0;c<COLS;c++){const i=idx(c,r);if(rock[i]||occ[i]||zone[i]||SPAWNS.includes(i)||i===GI)continue;const s=cov((c+.5)*T,(r+.5)*T)*.8;if(!best||s>best.s){if(canPlace(i).ok)best={c,r,s,conv:0};}}
        if(!best)break;if(best.conv){const cost=costOf(ty)-costOf("wall");if(S.gold<cost)break;convert(best.t,ty);}else{if(S.gold<costOf(ty))break;if(!tryBuild(best.c,best.r,ty,true,true))break;}k++;}
      for(let g=0;g<60;g++){const ts=S.towers.filter(t=>t.type!=="wall"&&t.level<MAXL).sort((a,b)=>a.level-b.level);if(!ts.length)break;const t=ts[0];if(S.gold<upCost(t))break;S.sel=t;upgrade(t.level===BRL||t.level===PERKL?0:-1);}
    };
    build();let steps=0;const tr=[];let lv0=S.lives;
    while(!S.over&&steps++<4e6){if(S.offer&&S.offer.length){takeRelic(S.offer[0]);openOv(null);}
      if(S.active&&S.metCd<=0&&S.enemies.length>2){let b=null;for(const e of S.enemies){if(e.dead||e.air)continue;let n=0;for(const f of S.enemies)if(!f.dead&&Math.hypot(f.x-e.x,f.y-e.y)<1.7*T)n++;if(!b||n>b.n)b={e,n};}if(b&&b.n>=3)castMeteor(b.e.x,b.e.y);}
      if(!S.active){if(S.wave>0){tr.push(lv0-S.lives);lv0=S.lives;}if(S.wave>=maxW)break;build();startWave();}update(.05);}
    if(S.over)tr.push(lv0-S.lives);
    openOv(null);return{w:S.wave,of:MAP.waves,lives:S.lives,tr:tr.join(""),pl:info+":"+bestL.toFixed(0),max:S.maxLives,lost:S.lost,path:+S.pathLen.toFixed(1),t:S.towers.filter(t=>t.type!=="wall").length,wl:S.towers.filter(t=>t.type==="wall").length};},
  botS(map,diff,maxW,hpm){startRun({map,diff});openOv(null);if(hpm)MAP.hp=hpm;let k=0;
    const cov=(x,y)=>{let n=0;for(const rt of S.routes)for(const q of rt)if(Math.hypot(q.x-x,q.y-y)<3.1*T)n++;return n;};
    const build=()=>{const want=Math.min(5+S.wave*1.3,22);let guard=0;
      while(guard++<30){const nt=S.towers.filter(t=>t.type!=="wall").length,ty=k%3===2?"cannon":"arrow";
        if(nt>=want||S.gold<costOf(ty))break;let best=null;const L0=S.pathLen;
        for(let r=0;r<ROWS;r++)for(let c=0;c<COLS;c++){const i=idx(c,r);if(rock[i]||occ[i]||zone[i]||SPAWNS.includes(i)||i===GI)continue;
          const v=canPlace(i);if(!v.ok)continue;const L=Math.min(...SPAWNS.map(s=>v.d[s]));const x=(c+.5)*T,y=(r+.5)*T;
          const sc=(L-L0)*6+cov(x,y);if(!best||sc>best.sc)best={c,r,sc};}
        if(!best||!tryBuild(best.c,best.r,ty,true,true))break;k++;}
      for(let g=0;g<60;g++){const ts=S.towers.filter(t=>t.type!=="wall"&&t.level<MAXL).sort((a,b)=>a.level-b.level);if(!ts.length)break;const t=ts[0];if(S.gold<upCost(t))break;S.sel=t;upgrade(t.level===BRL||t.level===PERKL?0:-1);}
      let w=0;while(w++<6&&S.gold>=costOf("wall")){let best=null;const L0=S.pathLen;
        for(let r=0;r<ROWS;r++)for(let c=0;c<COLS;c++){const i=idx(c,r);if(rock[i]||occ[i]||zone[i]||SPAWNS.includes(i)||i===GI)continue;const v=canPlace(i);if(!v.ok)continue;const L=Math.min(...SPAWNS.map(s=>v.d[s]));if(L>L0+.5&&(!best||L>best.L))best={c,r,L};}
        if(!best||!tryBuild(best.c,best.r,"wall",true,true))break;}};
    build();let steps=0;
    while(!S.over&&steps++<4e6){if(!S.active){if(S.wave>=maxW)break;build();startWave();}update(.05);}
    openOv(null);return{w:S.wave,of:MAP.waves,lives:S.lives,max:S.maxLives,win:!S.over||S.lives>0,path:+S.pathLen.toFixed(1),t:S.towers.filter(t=>t.type!=="wall").length};},
  bot(map,diff,strat,maxW){startRun({map,diff});openOv(null);
    const R=S.routes.flat(),cells=[];
    for(let r=0;r<ROWS;r++)for(let c=0;c<COLS;c++){const i=idx(c,r);if(rock[i]||zone[i]||SPAWNS.includes(i)||i===GI)continue;
      const x=(c+.5)*T,y=(r+.5)*T;let cov=0;for(const q of R)if(Math.hypot(q.x-x,q.y-y)<3.2*T)cov++;
      const ds=Math.min(...SPAWNS.map(s=>Math.hypot(((s%COLS)+.5)*T-x,(((s/COLS)|0)+.5)*T-y)));
      cells.push({c,r,cov,ds});}
    cells.sort(strat==="burg"?(a,b)=>a.ds-b.ds:(a,b)=>b.cov-a.cov);
    let n=0,k=0;const placed=[];
    const spend=()=>{for(const cl of cells){if(S.gold<costOf("arrow"))break;if(occ[idx(cl.c,cl.r)])continue;if(placed.some(p=>Math.hypot(p.c-cl.c,p.r-cl.r)<(strat==="burg"?1.4:2.2)))continue;
        const ty=k%3===2?"cannon":"arrow";if(S.gold<costOf(ty))break;if(tryBuild(cl.c,cl.r,ty,true,true)){placed.push(cl);k++;}}
      for(let g=0;g<40&&S.gold>0;g++){const ts=S.towers.filter(t=>t.type!=="wall"&&t.level<MAXL).sort((a,b)=>a.level-b.level);if(!ts.length)break;const t=ts[0];S.sel=t;const c0=S.gold;upgrade(t.level===BRL||t.level===PERKL?0:-1);if(S.gold===c0)break;}};
    spend();let steps=0;
    while(!S.over&&steps++<4e6){if(!S.active){if(S.wave>=maxW)break;spend();startWave();}update(.05);}
    openOv(null);return{wave:S.wave,lives:S.lives,of:MAP.waves,over:S.over,towers:S.towers.length};},
  run(maxW){S.gold=0;let n=0;while(!S.over&&n++<2e6){if(!S.active){if(S.wave>=maxW)break;startWave();}update(.05);}
    openOv(null);return{wave:S.wave,lives:S.lives,over:S.over,path:+S.pathLen.toFixed(1),walls:S.towers.filter(t=>t.type==="wall").length};}
};

// ================= V5: fairer Fortschritt, Kosmetik und QA =================
// Keine echten Zahlungen oder Werbeeinblendungen ohne SDK/StoreKit und Einwilligung.
const KW5={
  cosmetics:[
    {id:'emmi_blue',name:'Emmi: Sternenschal',icon:'🐕',cost:20,kind:'emmi',color:'#73d7ff'},
    {id:'emmi_gold',name:'Emmi: Goldhalsband',icon:'🐕',cost:45,kind:'emmi',color:'#ffd36b'},
    {id:'crystal_rose',name:'Rosakristall',icon:'💎',cost:30,kind:'crystal',color:'#ff8dc5'},
    {id:'crystal_mint',name:'Minzkristall',icon:'💎',cost:30,kind:'crystal',color:'#77f3d2'},
    {id:'badge_guard',name:'Wächterwappen',icon:'🛡️',cost:15,kind:'badge',color:'#b9a3ff'}
  ],
  get(){const x=meta.kw5||{};return {owned:Array.isArray(x.owned)?x.owned:[],equipped:x.equipped||{},events:Array.isArray(x.events)?x.events:[],helpSeen:!!x.helpSeen};},
  set(x){meta.kw5=x;saveMeta();},
  event(name,detail){try{const x=this.get();x.events.push({name,detail:String(detail||'').slice(0,64),at:Date.now()});x.events=x.events.slice(-150);this.set(x);}catch(e){}},
  purchase(id){const it=this.cosmetics.find(c=>c.id===id);if(!it)return;const x=this.get();if(x.owned.includes(id)){x.equipped[it.kind]=id;this.set(x);this.render();return;}if(meta.shards<it.cost){toast('Nicht genug Splitter – erspiele weitere Herausforderungen');return;}meta.shards-=it.cost;x.owned.push(id);x.equipped[it.kind]=id;this.set(x);this.event('cosmetic_unlock',id);this.render();toast(it.name+' freigeschaltet!');},
  challenge(){const day=new Date(),k=day.getFullYear()+'-'+String(day.getMonth()+1).padStart(2,'0')+'-'+String(day.getDate()).padStart(2,'0');const n=Object.keys(meta.stars||{}).length;return {key:k,goal:3,progress:Math.min(3,n),label:'Schließe drei unterschiedliche Kampagnenkarten ab'};},
  render(){const x=this.get(),c=this.challenge(),panel=document.getElementById('kw5Panel');if(!panel)return;
    const stars=Object.values(meta.stars||{}).reduce((a,b)=>a+(Number(b)||0),0);
    const items=this.cosmetics.filter(it=>it.kind!=='badge').map(it=>{const own=x.owned.includes(it.id),on=x.equipped[it.kind]===it.id;return '<div class="kw5-item"><span class="kw5-itemicon" style="color:'+it.color+'">'+it.icon+'</span><div><strong>'+it.name+'</strong><small>'+(on?'Aktiv':own?'Freigeschaltet':it.cost+' Splitter')+'</small></div><button data-cos="'+it.id+'">'+(on?'Aktiv':own?'Anlegen':'Freischalten')+'</button></div>'}).join('');
    panel.innerHTML='<div class="kw5-head"><div><span class="kw5-kicker">DEIN ABENTEUER</span><h2>Wächterzentrale</h2></div><button id="kw5Close" aria-label="Schließen">✕</button></div><p class="kw5-lead">Erkunde neue Karten, verbessere deine Strategien und schalte Outfits ohne Echtgeld frei.</p><div class="kw5-stats"><div><b>'+stars+'</b><small>Gesammelte Sterne</small></div><div><b>'+meta.shards+'</b><small>Kristallsplitter</small></div><div><b>'+Object.keys(meta.stars||{}).length+'</b><small>Abgeschlossene Karten</small></div></div><h3>Deine nächste Mission</h3><p>'+c.label+'</p><div class="kw5-progress" role="progressbar" aria-valuenow="'+c.progress+'" aria-valuemin="0" aria-valuemax="3"><i style="width:'+(c.progress/3*100)+'%"></i></div><p class="kw5-muted">'+c.progress+' / 3 Karten · Bereits abgeschlossene Karten zählen mit</p><h3>Emmis Garderobe & Kristall-Looks</h3><p class="kw5-muted">Kosmetische Sammlerstücke. Keine spielerischen Vorteile.</p>'+items+'<h3>Fair spielen</h3><p class="kw5-muted">Keine Zwangswerbung, keine gekauften Zufallsbelohnungen, keine künstlichen Wartezeiten. Echtgeld-Shop und belohnte Werbung sind noch nicht aktiviert.</p><button id="kw5Export" class="kw5-secondary">Lokale Testdaten exportieren</button>';
    panel.querySelector('#kw5Close').onclick=()=>this.hide();panel.querySelectorAll('[data-cos]').forEach(b=>b.onclick=()=>this.purchase(b.dataset.cos));panel.querySelector('#kw5Export').onclick=()=>{const data={version:5,progress:{stars:meta.stars,best:meta.best,runs:meta.runs},events:this.get().events};const a=document.createElement('a');a.href=URL.createObjectURL(new Blob([JSON.stringify(data,null,2)],{type:'application/json'}));a.download='kristallwacht-testdaten.json';a.click();setTimeout(()=>URL.revokeObjectURL(a.href),500);};
  },
  show(){const el=document.getElementById('kw5Overlay');el.hidden=false;this.render();},hide(){document.getElementById('kw5Overlay').hidden=true;}
};
(function installKW5(){
 const style=document.createElement('style');style.textContent=`
 #kw5Overlay[hidden]{display:none!important}#kw5Overlay{position:fixed;inset:0;z-index:99999;background:rgba(3,12,30,.86);display:flex;align-items:center;justify-content:center;padding:max(12px,env(safe-area-inset-top)) 12px max(12px,env(safe-area-inset-bottom));overflow:auto;overscroll-behavior:contain}
 #kw5Panel{box-sizing:border-box;width:min(520px,100%);max-height:95dvh;overflow:auto;border:3px solid #f8ce70;border-radius:22px;background:linear-gradient(145deg,#183b61,#101c3e 80%);color:#fff;padding:18px;box-shadow:0 16px 50px #000b;font:15px/1.4 system-ui,sans-serif}
 #kw5Panel h2{margin:0;font-size:25px;color:#ffe7a4}#kw5Panel h3{font-size:17px;margin:22px 0 6px;color:#ffe3a0}#kw5Panel p{margin:7px 0 12px}#kw5Panel button{cursor:pointer;min-height:44px;border:2px solid #eacb7c;border-radius:12px;padding:8px 12px;background:linear-gradient(#ffdb83,#d49c40);color:#25203b;font-weight:800;touch-action:manipulation}
 .kw5-head{display:flex;justify-content:space-between;align-items:start;gap:12px}.kw5-kicker{font-size:11px;letter-spacing:.14em;color:#9be9ed}.kw5-lead{color:#cbe4f6}.kw5-stats{display:grid;grid-template-columns:repeat(3,1fr);gap:8px}.kw5-stats>div{background:#081d3c;border:1px solid #477caa;border-radius:12px;padding:10px 4px;text-align:center}.kw5-stats b{display:block;font-size:24px;color:#ffe6a5}.kw5-stats small,.kw5-item small{display:block;color:#b8d4ed;font-size:11px}.kw5-progress{height:13px;border:1px solid #75a6c7;background:#0a1d37;border-radius:15px;overflow:hidden}.kw5-progress i{display:block;height:100%;background:linear-gradient(90deg,#47cfb2,#ffdc75)}.kw5-muted{color:#b9d0e4;font-size:12px}.kw5-item{display:flex;align-items:center;gap:10px;padding:10px 0;border-bottom:1px solid #416182}.kw5-item>div{flex:1}.kw5-itemicon{font-size:26px}.kw5-item button{min-width:100px}.kw5-secondary{margin-top:12px;width:100%}#kw5Open{margin:10px auto;display:block;max-width:360px;width:92%;min-height:54px;font-weight:900;background:linear-gradient(135deg,#ffe6a3,#e6a448);color:#1b2645;border:3px solid #fff1bf;border-radius:14px;box-shadow:0 4px 0 #805324}
 `;document.head.appendChild(style);
 const layer=document.createElement('div');layer.id='kw5Overlay';layer.hidden=true;layer.innerHTML='<section id="kw5Panel" role="dialog" aria-modal="true" aria-label="Wächterzentrale"></section>';document.body.appendChild(layer);layer.addEventListener('click',e=>{if(e.target===layer)KW5.hide();});document.addEventListener('keydown',e=>{if(e.key==='Escape'&&!layer.hidden)KW5.hide();});
 const menu=document.querySelector('.home-tools');if(menu){const btn=document.createElement('button');btn.id='kw5Open';btn.textContent='✨ Wächterzentrale · Missionen & Outfits';btn.onclick=()=>KW5.show();menu.appendChild(btn);}
 const pause=document.querySelector('#ovPause .card');if(pause){const btn=document.createElement('button');btn.textContent='✨ Wächterzentrale';btn.style.cssText='min-height:48px;margin:8px';btn.onclick=()=>KW5.show();pause.appendChild(btn);}
 // Fortschritt wird lokal gespeichert. Keine externen Tracking-Dienste.
 KW5.event('app_open','v5');
})();

if(location.hash==="#tick")setInterval(()=>{try{step(performance.now());}catch(e){console.error("KW",e&&e.stack||e);}},20); // nur zum Testen

})();
