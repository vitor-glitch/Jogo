const cv=document.getElementById('gc'),ctx=cv.getContext('2d');

function resizeCanvas(){
  cv.width=window.innerWidth;
  cv.height=window.innerHeight;
}

resizeCanvas();
window.addEventListener('resize',resizeCanvas);

let W=cv.width,H=cv.height;
const ENEMY_ZONE_MAX=H*0.45;
let diff='facil';
let shootCooldown=0;

// Sistema de Áudio
const shotSound=new Audio('tiro_naveA.mp3');
shotSound.volume=0.20;
const enemyShotSound=new Audio('tiro-inimigo.mp3');
enemyShotSound.volume=0.26;
const bossShotSound=new Audio('tiro-boss.mp3');
bossShotSound.volume=0.32;
const enemiesMusic=new Audio('musicas/inimigosm.mp3');
enemiesMusic.loop=true;
enemiesMusic.volume=0.70;
const bossMusic=new Audio('musicas/bossm.mp3');
bossMusic.loop=true;
bossMusic.volume=0.70;
let currentMusic=null;

// Sistema de Skins
const SKINS=['Aurora-07.png','Eclipse-R-7.png','Falcao-x-27.png','NYX-9.png','Raptor-V-21.png','Specter-1X.png','Tempest-x-10.png','Voidstalker.png'];
const ENEMY_SKINS=['Azure_Phantom.png','Blaze_Hound.png','Crimson_Viper.png','Emerald_Stalker.png','Iron_Talon.png','Shadow_Fang.png','Solar_Reaver.png'];
const BOSS_SKINS=['Abyss_Monarch.png','Eclipse_Sovereign.png','Inferno_Juggernaut.png','Oblivion_Serpent.png','Titan_Warlord.png','Void_Scorpion.png'];
let skinImages={},enemySkinImages={},bossSkinImages={};
let currentSkin=null,currentBossSkin=null;

function loadSkins(){
  SKINS.forEach(skin=>{
    const img=new Image();
    img.src='skins/'+skin;
    skinImages[skin]=img;
  });
  ENEMY_SKINS.forEach(skin=>{
    const img=new Image();
    img.src='inimigos-s/'+skin;
    enemySkinImages[skin]=img;
  });
  BOSS_SKINS.forEach(skin=>{
    const img=new Image();
    img.src='boss/'+skin;
    bossSkinImages[skin]=img;
  });
}

function getRandomSkin(){
  return SKINS[Math.floor(Math.random()*SKINS.length)];
}

function getRandomEnemySkin(){
  return ENEMY_SKINS[Math.floor(Math.random()*ENEMY_SKINS.length)];
}

function getRandomBossSkin(){
  return BOSS_SKINS[Math.floor(Math.random()*BOSS_SKINS.length)];
}

function getBossAttackPattern(skinName, phase){
  const patterns={
    'Void_Scorpion.png':{
      normal:[0,45,-45,90,-90],
      phase2:[0,30,-30,60,-60,90,-90,120,-120],
      speedMult:1.2,name:'Escorpião - Disparo Duplo'
    },
    'Titan_Warlord.png':{
      normal:[0,20,-20,40,-40,60,-60],
      phase2:[0,15,-15,30,-30,45,-45,60,-60,75,-75],
      speedMult:0.8,name:'Titã - Chuva Densa'
    },
    'Inferno_Juggernaut.png':{
      normal:[0,25,-25,50,-50,75,-75],
      phase2:[0,18,-18,36,-36,54,-54,72,-72,90,-90],
      speedMult:1.5,name:'Inferno - Ataques Rápidos'
    },
    'Abyss_Monarch.png':{
      normal:[0,30,-30,60,-60],
      phase2:[0,20,-20,40,-40,60,-60,80,-80],
      speedMult:0.9,name:'Abismo - Ondas Lentas'
    },
    'Oblivion_Serpent.png':{
      normal:[0,40,-40,80,-80,120,-120],
      phase2:[0,25,-25,50,-50,75,-75,100,-100,125,-125],
      speedMult:1.3,name:'Serpente - Spreads Amplos'
    },
    'Eclipse_Sovereign.png':{
      normal:[0,22,-22,44,-44,66,-66,88,-88],
      phase2:[0,15,-15,30,-30,45,-45,60,-60,75,-75,90,-90],
      speedMult:1.1,name:'Eclipse - Equilibrado'
    }
  };
  const skin=skinName||'Void_Scorpion.png';
  const pattern=patterns[skin]||patterns['Void_Scorpion.png'];
  return {
    angles: phase===1?pattern.phase2:pattern.normal,
    speedMult: pattern.speedMult,
    name: pattern.name
  };
}

loadSkins();
const DIFF={
facil:  {lives:5,enemyHpMult:0.7,enemySpeedMult:0.6,shootRateMult:1.6,puChance:0.28,bossHpMult:0.6,pointBase:4,scoreMult:0.5},
normal: {lives:3,enemyHpMult:1.0,enemySpeedMult:1.0,shootRateMult:1.0,puChance:0.18,bossHpMult:1.0,pointBase:14,scoreMult:1.0},
dificil:{lives:2,enemyHpMult:1.4,enemySpeedMult:1.3,shootRateMult:0.7,puChance:0.12,bossHpMult:1.4,pointBase:16,scoreMult:1.4},
};
function setDiff(d,el){diff=d;document.querySelectorAll('.dbtn').forEach(b=>b.classList.remove('sel'));el.classList.add('sel')}
function diffScale(w){return 1+(w-1)*0.12}

let state='menu',score=0,lives=3,wave=1,frame=0,waveTransitioning=false;
let shooting=false,mX=W/2,mY=H-60;
let pu={spread:false,laser:false,shield:0,rapid:false,drain:false,timeSlow:false,pierce:false,homing:false,power:false},bombCount=0;
let player,bullets,enemies,eBullets,parts,puItems,boss,bossSpawning=false;
let shootInterval=null,waveMsgTimer=0,bossEnemyTimer=0;

function cfg(){return DIFF[diff]}

function initGame(){
  const c=cfg();
  score=0;lives=c.lives;wave=1;frame=0;waveTransitioning=false;
  shooting=false;bossSpawning=false;bombCount=0;
  enemiesMusic.currentTime=0;
  enemiesMusic.play();
  currentMusic=enemiesMusic;
  pu={spread:false,laser:false,shield:0,rapid:false,drain:false,timeSlow:false,pierce:false,homing:false,power:false};
  player={x:W/2,y:H-60,inv:0};
  bullets=[];enemies=[];eBullets=[];parts=[];puItems=[];boss=null;
  currentSkin=getRandomSkin();
  spawnWave();updateHUD();
}

function spawnWave(){
  enemies=[];boss=null;bossSpawning=false;
  document.getElementById('bossRow').style.display='none';
  const c=cfg();
  let waveAdj;
  if(wave<=15){
    waveAdj=wave>8?8+Math.floor((wave-8)*0.4):wave;
  }else{
    waveAdj=15+Math.floor((wave-15)*0.5);
  }
  
  let cols, rows;
  if(wave>=21){
    cols=7;rows=3;
  }else{
    cols=Math.min(3+Math.floor(waveAdj*0.4),7);
    rows=Math.min(1+Math.floor(waveAdj/5),3);
  }
  let baseHp=Math.ceil((1+Math.floor(waveAdj/5))*c.enemyHpMult);
  if(wave>=13){baseHp=Math.ceil(baseHp*(1+Math.floor((wave-13)*0.15)));}
  const baseSpd=(0.5+waveAdj*0.065)*c.enemySpeedMult;
  for(let r=0;r<rows;r++){
    for(let cl=0;cl<cols;cl++){
      const yPos=35+r*42;
      enemies.push({
        x:55+cl*(W-110)/(cols-1||1),
        y:yPos,
        baseY:yPos,
        w:150,h:130,
        hp:baseHp,maxHp:baseHp,
        type:r%3,
        vx:baseSpd*(cl%2===0?1:-1),
        shootT:30+Math.random()*90,
        bobOffset:Math.random()*Math.PI*2,
        skin:getRandomEnemySkin()
      });
    }
  }
  showWaveMsg(wave<=1?'PREPARE-SE!':'ONDA '+wave);
}

function spawnBoss(){
  if(currentMusic!==bossMusic){
    enemiesMusic.pause();
    bossMusic.currentTime=0;
    bossMusic.play();
    currentMusic=bossMusic;
  }
  const c=cfg();
  let waveAdj;
  if(wave<=15){
    waveAdj=wave>8?8+Math.floor((wave-8)*0.4):wave;
  }else{
    waveAdj=15+Math.floor((wave-15)*0.5);
  }
  const hp=Math.floor((20+waveAdj*12)*c.bossHpMult);
  currentBossSkin=getRandomBossSkin();
  const bossSpecs={
    'Void_Scorpion.png':{speed:1.2,shootRate:0.9},
    'Titan_Warlord.png':{speed:0.7,shootRate:1.3},
    'Inferno_Juggernaut.png':{speed:1.4,shootRate:0.8},
    'Abyss_Monarch.png':{speed:0.6,shootRate:1.1},
    'Oblivion_Serpent.png':{speed:0.9,shootRate:1.0},
    'Eclipse_Sovereign.png':{speed:1.0,shootRate:1.0}
  };
  const spec=bossSpecs[currentBossSkin]||{speed:1,shootRate:1};
  boss={x:W/2,y:60,w:260,h:210,hp,maxHp:hp,
    vx:(1.8+waveAdj*0.14)*c.enemySpeedMult*spec.speed,
    shootT:0,phase:0,angle:0,skin:currentBossSkin,shootRateMult:spec.shootRate};
  bossEnemyTimer=0;
  document.getElementById('bossRow').style.display='block';
  const bossNames={
    'Void_Scorpion.png':'ESCORPIÃO DO VÁCUO',
    'Titan_Warlord.png':'TITÃ GUERREIRO',
    'Inferno_Juggernaut.png':'JUGGERNAUTA INFERNAL',
    'Abyss_Monarch.png':'MONARCA DO ABISMO',
    'Oblivion_Serpent.png':'SERPENTE DO ESQUECIMENTO',
    'Eclipse_Sovereign.png':'SOBERANO DO ECLIPSE'
  };
  const name=bossNames[currentBossSkin]||'CHEFE DESCONHECIDO';
  showWaveMsg(name);
}

function spawnBossEnemies(){
  const c=cfg();
  let baseHp=Math.ceil((1+Math.floor(wave/4))*c.enemyHpMult);
  if(wave>=13){baseHp=Math.ceil(baseHp*(1+Math.floor((wave-13)*0.15)));}
  const baseSpd=(0.5+wave*0.1)*c.enemySpeedMult;
  const count=1;
  for(let i=0;i<count;i++){
    const cl=Math.random()>0.5?10:W-160;
    enemies.push({
      x:cl,y:35,baseY:35,w:150,h:130,
      hp:baseHp,maxHp:baseHp,type:Math.floor(Math.random()*3),
      vx:baseSpd*(Math.random()>0.5?1:-1),shootT:30+Math.random()*90,
      bobOffset:Math.random()*Math.PI*2,skin:getRandomEnemySkin()
    });
  }
}

function showWaveMsg(txt){
  const el=document.getElementById('waveMsg');
  el.textContent=txt;el.style.opacity='1';waveMsgTimer=100;
}

function updateHUD(){
  document.getElementById('sBox').textContent='SCORE: '+score;
  document.getElementById('wBox').textContent='ONDA: '+wave;
  let h='';for(let i=0;i<lives;i++)h+='♥';
  document.getElementById('lBox').textContent='VIDAS: '+h;
  ['p0','p1','p2','p3','p4','p5','p6','p7','p8','p9'].forEach((id,i)=>{
    const el=document.getElementById(id);
    const states=[pu.spread,pu.laser,pu.shield>0,bombCount>0,pu.rapid>0,pu.drain>0,pu.timeSlow>0,pu.pierce>0,pu.homing>0,pu.power>0];
    if(el) el.className='ps'+(states[i]?' on':'');
  });
}

function spawnParts(x,y,col,n=8){
  for(let i=0;i<n;i++){
    const a=Math.random()*Math.PI*2,s=1+Math.random()*3;
    parts.push({x,y,vx:Math.cos(a)*s,vy:Math.sin(a)*s,life:35+Math.random()*20,col,r:2+Math.random()*3});
  }
}

function fire(){
  shotSound.currentTime=0;
  shotSound.play().catch(e=>{}); // Catch promise rejection se browser bloquear
  if(pu.spread){
    [-22,-11,0,11,22].forEach(a=>{
      const r=a*Math.PI/180;
      bullets.push({x:player.x,y:player.y-14,vx:Math.sin(r)*7,vy:-11,laser:pu.laser,homing:pu.homing});
    });
  }else{
    [-5,5].forEach(ox=>bullets.push({x:player.x+ox,y:player.y-14,vx:0,vy:-11,laser:pu.laser,homing:pu.homing}));
  }
}

function useBomb(){
  if(bombCount<=0)return;
  bombCount--;
  enemies.forEach(e=>spawnParts(e.x+e.w/2,e.y+e.h/2,'#ffaa00',8));
  enemies=[];eBullets=[];
  if(boss){
    boss.hp=Math.max(1,boss.hp-Math.floor(boss.maxHp*0.3));
    spawnParts(boss.x,boss.y,'#ff8800',30);
    if(boss.hp<=0)killBoss();
  }
  spawnParts(W/2,H/2,'#ff6600',40);updateHUD();
}

function killBoss(){
  spawnParts(boss.x,boss.y,'#ff4400',40);spawnParts(boss.x,boss.y,'#ffcc00',30);
  score+=Math.floor((200+wave*60)*cfg().scoreMult);
  boss=null;document.getElementById('bossRow').style.display='none';
  bossMusic.pause();
  enemiesMusic.currentTime=0;
  enemiesMusic.play();
  currentMusic=enemiesMusic;
  wave++;updateHUD();
  setTimeout(()=>spawnWave(),1400);
}

cv.addEventListener('mousemove',e=>{const r=cv.getBoundingClientRect();mX=e.clientX-r.left;mY=e.clientY-r.top});
cv.addEventListener('mousedown',()=>{if(state==='playing')shooting=true});
cv.addEventListener('mouseup',()=>{shooting=false});
document.addEventListener('keydown',e=>{
  if(e.code==='Space'&&state==='playing'){e.preventDefault();shooting=true}
  if(e.code==='KeyB'&&state==='playing')useBomb();
});
document.addEventListener('keyup',e=>{
  if(e.code==='Space')shooting=false;
});

function drawShip(x,y,shielded,inv,shieldVal){
  if(inv>0&&Math.floor(inv/7)%2===0)ctx.globalAlpha=0.35;
  ctx.save();ctx.translate(x,y);
  if(shielded){
    const shieldAlpha=shieldVal<=60?Math.floor(shieldVal/15)%2===0?0.2:0.8:0.75;
    ctx.beginPath();ctx.arc(0,0,50,0,Math.PI*2);ctx.strokeStyle=`rgba(0,200,255,${shieldAlpha})`;ctx.lineWidth=3;ctx.stroke();
  }
  
  // Desenhar skin
  if(currentSkin&&skinImages[currentSkin]&&skinImages[currentSkin].complete){
    ctx.drawImage(skinImages[currentSkin],-35,-35,70,70);
  }else{
    // Fallback se skin não carregar
    ctx.fillStyle='#00cfff';
    ctx.beginPath();ctx.moveTo(0,-16);ctx.lineTo(14,14);ctx.lineTo(0,7);ctx.lineTo(-14,14);ctx.closePath();ctx.fill();
    ctx.fillStyle='rgba(255,255,255,0.25)';
    ctx.beginPath();ctx.moveTo(0,-12);ctx.lineTo(5,2);ctx.lineTo(0,6);ctx.lineTo(-5,2);ctx.closePath();ctx.fill();
  }
  
  ctx.restore();ctx.globalAlpha=1;
}

function drawEnemy(e){
  ctx.save();ctx.translate(e.x+e.w/2,e.y+e.h/2);
  
  // Desenhar skin do inimigo
  if(e.skin&&enemySkinImages[e.skin]&&enemySkinImages[e.skin].complete){
    ctx.drawImage(enemySkinImages[e.skin],-e.w/2,-e.h/2,e.w,e.h);
  }else{
    // Fallback
    const cols=['#ff4444','#ff8800','#cc44ff'];
    ctx.fillStyle=cols[e.type];
    if(e.type===0){ctx.beginPath();ctx.moveTo(0,e.h/2);ctx.lineTo(-e.w/2,-e.h/2);ctx.lineTo(e.w/2,-e.h/2);ctx.closePath();ctx.fill()}
    else if(e.type===1){ctx.beginPath();for(let i=0;i<6;i++){const a=i*Math.PI/3-Math.PI/6,rv=i%2===0?e.w/2:e.w/3.2;ctx.lineTo(Math.cos(a)*rv,Math.sin(a)*rv)}ctx.closePath();ctx.fill()}
    else{ctx.beginPath();ctx.ellipse(0,0,e.w/2,e.h/2,0,0,Math.PI*2);ctx.fill();ctx.fillStyle='rgba(255,255,255,0.35)';ctx.beginPath();ctx.ellipse(-3,-2,4,3,-0.3,0,Math.PI*2);ctx.fill()}
  }
  
  if(e.maxHp>1){const p=e.hp/e.maxHp;ctx.fillStyle='rgba(0,0,0,0.5)';ctx.fillRect(-e.w/2,e.h/2+3,e.w,4);ctx.fillStyle=p>0.5?'#44ff44':'#ffaa00';ctx.fillRect(-e.w/2,e.h/2+3,e.w*p,4)}
  ctx.restore();
}

function drawBoss(b){
  const p=b.hp/b.maxHp;
  ctx.save();ctx.translate(b.x,b.y);b.angle+=0.012;
  
  // Desenhar skin do boss
  if(b.skin&&bossSkinImages[b.skin]&&bossSkinImages[b.skin].complete){
    ctx.drawImage(bossSkinImages[b.skin],-b.w/2,-b.h/2,b.w,b.h);
  }else{
    // Fallback
    ctx.fillStyle=p>0.5?'#ff2244':'#ff6600';
    ctx.beginPath();ctx.ellipse(0,0,b.w/2,b.h/2,b.angle*0.25,0,Math.PI*2);ctx.fill();
    for(let i=0;i<6;i++){const a=i*Math.PI/3+b.angle;ctx.fillStyle=p>0.5?'rgba(255,50,100,0.65)':'rgba(255,150,0,0.65)';ctx.beginPath();ctx.ellipse(Math.cos(a)*(b.w/2-9),Math.sin(a)*(b.h/2-9),7,5,a,0,Math.PI*2);ctx.fill()}
    ctx.fillStyle='rgba(255,0,0,0.9)';ctx.beginPath();ctx.arc(0,0,11,0,Math.PI*2);ctx.fill();
    ctx.fillStyle='#fff';ctx.beginPath();ctx.arc(0,0,5,0,Math.PI*2);ctx.fill();
  }
  
  document.getElementById('bossFill').style.width=(p*100)+'%';
  ctx.restore();
}

let stars=null;
function drawStars(){
  if(!stars)stars=Array.from({length:90},()=>({x:Math.random()*W,y:Math.random()*H,s:Math.random()*1.5+0.3,v:Math.random()*0.5+0.2}));
  stars.forEach(s=>{s.y+=s.v;if(s.y>H){s.y=0;s.x=Math.random()*W}ctx.fillStyle=`rgba(255,255,255,${0.25+s.s*0.25})`;ctx.fillRect(s.x,s.y,s.s,s.s)});
}

function startGame(){
  document.getElementById('ov').style.display='none';
  state='playing';initGame();
  shootCooldown=0;
  requestAnimationFrame(loop);
}

function showOver(title,sub){
  const ov=document.getElementById('ov');
  ov.style.display='flex';
  ov.innerHTML=`<h2>${title}</h2><div class="sc">SCORE: ${score}</div><p>Onda máxima: ${wave} &nbsp;|&nbsp; ${sub}</p>
  <div id="diffRow"><button class="dbtn ${diff==='facil'?'sel':''}" onclick="setDiff('facil',this)">Fácil</button><button class="dbtn ${diff==='normal'?'sel':''}" onclick="setDiff('normal',this)">Normal</button><button class="dbtn ${diff==='dificil'?'sel':''}" onclick="setDiff('dificil',this)">Difícil</button></div>
  <button class="btn" onclick="startGame()">JOGAR DE NOVO</button>`;
}

function loop(){
  if(state!=='playing')return;
  W=cv.width;H=cv.height;
  frame++;
  ctx.clearRect(0,0,W,H);
  drawStars();

  if(waveMsgTimer>0){
    waveMsgTimer--;
    const el=document.getElementById('waveMsg');
    if(waveMsgTimer<=20)el.style.opacity=waveMsgTimer/20;
    if(waveMsgTimer===0)el.style.opacity='0';
  }

  const c=cfg(),sc=diffScale(wave);

  player.x+=(mX-player.x)*0.16;
  player.y+=(mY-player.y)*0.16;
  player.x=Math.max(35,Math.min(W-35,player.x));
  player.y=Math.max(35,Math.min(H-35,player.y));
  if(player.inv>0)player.inv--;
  if(pu.shield>0)pu.shield--;
  if(pu.drain>0)pu.drain--;
  if(shooting&&shootCooldown<=0){fire();if(pu.rapid)fire();shootCooldown=190}
  if(shootCooldown>0)shootCooldown-=16.67;
  drawShip(player.x,player.y,pu.shield>0,player.inv,pu.shield);

  if(!boss&&!bossSpawning&&enemies.length===0&&!waveTransitioning){
    waveTransitioning=true;
    if(wave%5===0){
      bossSpawning=true;setTimeout(()=>{spawnBoss();waveTransitioning=false;},1200);
    }else{
      wave++;updateHUD();
      setTimeout(()=>{spawnWave();waveTransitioning=false;},1200);
    }
  }

  enemies.forEach((e,ei)=>{
    e.x+=e.vx*sc;
    const margin=10;
    if(e.x<margin||e.x+e.w>W-margin)e.vx*=-1;
    e.x=Math.max(margin,Math.min(W-e.w-margin,e.x));

    e.bobOffset+=0.03;
    e.y=e.baseY+Math.sin(e.bobOffset)*5;

    e.shootT-=sc;
    if(e.shootT<=0){
      let shootDelay=110+Math.random()*90;
      if(wave>=13){shootDelay=280+Math.random()*180;}
      e.shootT=shootDelay*c.shootRateMult/sc;
      const dx=player.x-(e.x+e.w/2),dy=player.y-(e.y+e.h/2),d=Math.sqrt(dx*dx+dy*dy);
      let spd=(1.2+wave*0.06)*sc;
      if(wave>=13){spd*=0.7;}
      let adjDx, adjDy;
      if(wave>=15){
        const randomAngle=Math.random()*Math.PI*2;
        adjDx=Math.cos(randomAngle);
        adjDy=Math.sin(randomAngle);
      }else{
        adjDx=dx;adjDy=dy;
        if(wave>=13){
          const inaccuracy=1+Math.random()*0.7;
          const angleError=(Math.random()-0.5)*1.2;
          adjDx=dx*inaccuracy+Math.cos(angleError)*50;
          adjDy=dy*inaccuracy+Math.sin(angleError)*50;
        }
      }
      const adjD=Math.sqrt(adjDx*adjDx+adjDy*adjDy)||1;
      eBullets.push({x:e.x+e.w/2,y:e.y+e.h,vx:adjDx/adjD*spd,vy:adjDy/adjD*spd+0.8,t:e.type});
      enemyShotSound.currentTime=0;
      enemyShotSound.play().catch(e=>{});
    }
    drawEnemy(e);
  });

  // Colisão player com inimigos
  enemies.forEach((e,ei)=>{
    if(player.x>e.x&&player.x<e.x+e.w&&player.y>e.y&&player.y<e.y+e.h&&player.inv===0){
      if(pu.shield>0){pu.shield=0;spawnParts(player.x,player.y,'#00cfff',14);updateHUD()}
      else{
        lives--;player.inv=80;spawnParts(player.x,player.y,'#ff4444',12);
        pu={spread:false,laser:false,shield:0,rapid:false,drain:false,timeSlow:false,pierce:false,homing:false,power:false};updateHUD();
        if(lives<=0){state='gameover';showOver('GAME OVER','Boa batalha, piloto!');return}
      }
    }
  });

  if(boss){
    bossEnemyTimer++;
    if(bossEnemyTimer>=240){bossEnemyTimer=0;spawnBossEnemies()}
    boss.x+=boss.vx;
    if(boss.x<50||boss.x>W-50)boss.vx*=-1;
    boss.y=60+Math.sin(frame*0.018)*12;
    boss.phase=boss.hp<boss.maxHp*0.5?1:0;
    boss.shootT++;
    const rate=Math.max(14,(55-wave*2)*c.shootRateMult/boss.shootRateMult);
    if(boss.shootT>=rate){
      boss.shootT=0;
      const attackData=getBossAttackPattern(boss.skin,boss.phase);
      const baseSpeed=(3.2+wave*0.15)*c.enemySpeedMult;
      const bspd=baseSpeed*attackData.speedMult;
      attackData.angles.forEach((a,idx)=>{
        const r=(90+a)*Math.PI/180;
        const delay=idx*2;
        setTimeout(()=>{
          if(boss&&state==='playing'){
            eBullets.push({x:boss.x,y:boss.y+boss.h/2,vx:Math.cos(r)*bspd,vy:Math.sin(r)*bspd,t:2,big:boss.phase===1,bossType:boss.skin});
            bossShotSound.currentTime=0;
            bossShotSound.play().catch(e=>{});
          }
        },delay);
      });
    }
    drawBoss(boss);
  }
bullets=bullets.filter(b=>b.y>-20&&b.y<H+20&&b.x>-10&&b.x<W+10);
  bullets.forEach((b,bi)=>{
    // HOMING: se o tiro for homing, ajuste vx/vy para perseguir o inimigo mais próximo
    if(b.homing){
      let closest=null,cdist=99999;
      enemies.forEach(e=>{
        const ex=e.x+e.w/2,ey=e.y+e.h/2;
        const dx=ex-b.x,dy=ey-b.y;
        const dist=dx*dx+dy*dy;
        if(dist<cdist){cdist=dist;closest={ex,ey};}
      });
      if(closest){
        const dx=closest.ex-b.x,dy=closest.ey-b.y;
        const d=Math.sqrt(dx*dx+dy*dy)||1;
        const speed=Math.sqrt(b.vx*b.vx+b.vy*b.vy);
        // Suaviza a curva para não ficar "teleportando"
      b.vx+=(dx/d*speed-b.vx)*0.06;
      b.vy+=(dy/d*speed-b.vy)*0.06;
      }
    }
    b.x+=b.vx;b.y+=b.vy;
    if(b.laser){ctx.strokeStyle='#00ffff';ctx.lineWidth=3;ctx.beginPath();ctx.moveTo(b.x,b.y);ctx.lineTo(b.x-b.vx*3,b.y-b.vy*3);ctx.stroke();ctx.lineWidth=1}
    else{ctx.fillStyle='#ffff00';ctx.fillRect(b.x-2,b.y,4,10)}
    enemies.forEach((e,ei)=>{
      if(b.x>e.x&&b.x<e.x+e.w&&b.y>e.y&&b.y<e.y+e.h){
        let dmg = pu.power ? 2 : 1;
        e.hp -= dmg;
        if(pu.drain){lives=Math.min(lives+1,5);score+=10}
        if(pu.timeSlow)e.vx*=0.5;
        spawnParts(e.x+e.w/2,e.y+e.h/2,'#ff8800',3);
        if(!pu.pierce)bullets.splice(bi,1);
        if(e.hp<=0){
          spawnParts(e.x+e.w/2,e.y+e.h/2,'#ff4400',9);
         score+=Math.floor((c.pointBase+wave*4)*sc*c.scoreMult);
          if(Math.random()<c.puChance){const tp=['spread','laser','shield','bomb','rapid','drain','timeSlow','pierce','homing','power'];puItems.push({x:e.x+e.w/2,y:e.y,type:tp[Math.floor(Math.random()*tp.length)],vy:1.4})}
          enemies.splice(ei,1);updateHUD();
        }
      }
    });
    if(boss&&b.x>boss.x-boss.w/2&&b.x<boss.x+boss.w/2&&b.y>boss.y-boss.h/2&&b.y<boss.y+boss.h/2){
      let dmg = pu.power ? 2 : 1;
      boss.hp -= dmg;
      spawnParts(b.x,b.y,'#ff8800',3);bullets.splice(bi,1);
      if(boss.hp<=0)killBoss();updateHUD();
    }
  });

  puItems=puItems.filter(p=>p.y<H+20);
  puItems.forEach((p,pi)=>{
    p.y+=p.vy;
    const cols={spread:'#ff6600',laser:'#00ccff',shield:'#4488ff',bomb:'#ff2200',rapid:'#ff00ff',drain:'#00ff00',timeSlow:'#ffff00',pierce:'#ff9900',homing:'#00ffea',power:'#ff0077'};
    const icons={spread:'🔥',laser:'⚡',shield:'🛡',bomb:'💥',rapid:'🚀',drain:'💀',timeSlow:'⏱️',pierce:'🔓',homing:'🎯',power:'💪'};
    ctx.fillStyle=cols[p.type];ctx.beginPath();ctx.arc(p.x,p.y,11,0,Math.PI*2);ctx.fill();
    ctx.font='12px sans-serif';ctx.textAlign='center';ctx.fillText(icons[p.type],p.x,p.y+4);
    const dx=player.x-p.x,dy=player.y-p.y;
    if(dx*dx+dy*dy<28*28){
      if(p.type==='bomb')bombCount++;
      else if(p.type==='shield')pu.shield=280;
      else if(p.type==='drain')pu.drain=320;
      else pu[p.type]=true;
      spawnParts(p.x,p.y,cols[p.type],10);puItems.splice(pi,1);updateHUD();
    }
  });

  eBullets=eBullets.filter(b=>b.y<H+20&&b.x>-10&&b.x<W+10);
  eBullets.forEach((b,bi)=>{
    b.x+=b.vx;b.y+=b.vy;
    const bossColors={
      'Void_Scorpion.png':'#ff00ff',
      'Titan_Warlord.png':'#ff4444',
      'Inferno_Juggernaut.png':'#ffaa00',
      'Abyss_Monarch.png':'#6600ff',
      'Oblivion_Serpent.png':'#00ffff',
      'Eclipse_Sovereign.png':'#ffff00'
    };
    const bc=['#ff4444','#ff8800','#cc44ff'];
    ctx.fillStyle=b.bossType?bossColors[b.bossType]||'#ff4444':bc[b.t]||'#ff4444';
    ctx.beginPath();ctx.arc(b.x,b.y,b.big?7:4,0,Math.PI*2);ctx.fill();
    if(b.bossType){ctx.strokeStyle='rgba(255,255,255,0.5)';ctx.lineWidth=1;ctx.stroke()}
    const projRadius=b.big?7:4;
    const closestX=Math.max(player.x-25,Math.min(b.x,player.x+25));
    const closestY=Math.max(player.y-25,Math.min(b.y,player.y+25));
    const dx=b.x-closestX,dy=b.y-closestY;
    if(dx*dx+dy*dy<projRadius*projRadius&&player.inv===0){
      if(pu.shield>0){pu.shield=0;spawnParts(player.x,player.y,'#00cfff',14);eBullets.splice(bi,1);updateHUD()}
      else{
        lives--;player.inv=80;spawnParts(player.x,player.y,'#ff4444',12);
        pu={spread:false,laser:false,shield:0,rapid:false,drain:false,timeSlow:false,pierce:false,homing:false,power:false};updateHUD();
        if(lives<=0){state='gameover';showOver('GAME OVER','Boa batalha, piloto!');return}
      }
    }
  });

  parts=parts.filter(p=>p.life>0);
  parts.forEach(p=>{
    p.x+=p.vx;p.y+=p.vy;p.vx*=0.94;p.vy*=0.94;p.life--;
    ctx.globalAlpha=p.life/55;ctx.fillStyle=p.col;ctx.beginPath();ctx.arc(p.x,p.y,p.r,0,Math.PI*2);ctx.fill();ctx.globalAlpha=1;
  });

  requestAnimationFrame(loop);
}

// Leaderboard code
let leaderboard = [];
try {
  const stored = localStorage.getItem('leaderboard');
  if (stored) leaderboard = JSON.parse(stored);
} catch (e) {
  console.error('Error loading leaderboard', e);
}

function normalizeLeaderboard() {
  const map = new Map();
  leaderboard.forEach(entry => {
    const name = entry.name.trim();
    if (!name) return;
    const key = name.toLowerCase();
    const existing = map.get(key);
    if (!existing || entry.score > existing.score) {
      map.set(key, {name, score: entry.score});
    }
  });
  leaderboard = Array.from(map.values()).sort((a, b) => b.score - a.score).slice(0, 10);
}

function updateLeaderboardDisplay() {
  normalizeLeaderboard();
  const el = document.getElementById('leaderboard');
  if (!el) return;
  let html = leaderboard.length ? '<h3>Placar</h3><ol>' + leaderboard.map(entry => `<li>${entry.name}: ${entry.score}</li>`).join('') + '</ol>' : '';
  el.innerHTML = html;
}

function clearLeaderboard() {
  if (confirm('Tem certeza que quer limpar o placar?')) {
    leaderboard = [];
    localStorage.removeItem('leaderboard');
    updateLeaderboardDisplay();
  }
}

function saveScore(name, score) {
  if (!name) return;
  name = name.trim();
  if (!name) return;
  const key = name.toLowerCase();
  const existingIndex = leaderboard.findIndex(entry => entry.name.toLowerCase() === key);
  if (existingIndex >= 0) {
    if (score > leaderboard[existingIndex].score) {
      leaderboard[existingIndex].score = score;
    }
  } else {
    leaderboard.push({name, score});
  }
  normalizeLeaderboard();
  localStorage.setItem('leaderboard', JSON.stringify(leaderboard));
}

function showOver(title, sub) {
  const name = document.getElementById('nameInput')?.value.trim() || 'Anônimo';
  saveScore(name, score);
  const lbHtml = leaderboard.length ? '<h3>Placar</h3><ol>' + leaderboard.map(entry => `<li>${entry.name}: ${entry.score}</li>`).join('') + '</ol>' : '';
  const ov = document.getElementById('ov');
  ov.style.display = 'flex';
  ov.innerHTML = `<h2>${title}</h2><div class="sc">SCORE: ${score}</div><p>Onda máxima: ${wave} &nbsp;|&nbsp; ${sub}</p>
  <div id="diffRow"><button class="dbtn ${diff==='facil'?'sel':''}" onclick="setDiff('facil',this)">Fácil</button><button class="dbtn ${diff==='normal'?'sel':''}" onclick="setDiff('normal',this)">Normal</button><button class="dbtn ${diff==='dificil'?'sel':''}" onclick="setDiff('dificil',this)">Difícil</button></div>
  <input id="nameInput" placeholder="Digite seu nome"><br>
  <div id="leaderboard">${lbHtml}</div>
  <button class="btn" onclick="startGame()">JOGAR DE NOVO</button>`;
}

document.addEventListener('DOMContentLoaded', updateLeaderboardDisplay);