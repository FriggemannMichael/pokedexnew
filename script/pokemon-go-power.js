(function(){
  const PGF = PokemonGoFeatures.prototype;

  PGF.generateIVs = function(id){
    const hash32 = (n) => {
      let x = n >>> 0;
      x ^= x >>> 16;
      x = Math.imul(x, 0x45d9f3b);
      x ^= x >>> 16;
      x = Math.imul(x, 0x45d9f3b);
      x ^= x >>> 16;
      return x >>> 0;
    };

    const base = hash32((id >>> 0) ^ 0x9e3779b9);

    if ((base % 97) === 0) {
      return { attack: 15, defense: 15, stamina: 15 };
    }

    return {
      attack: hash32(base ^ 0xa5a5a5a5) & 15,
      defense: hash32(base ^ 0x3c6ef372) & 15,
      stamina: hash32(base ^ 0x1bf5a9c4) & 15
    };
  };
  PGF.getPokemonLevel = function(id){ return Math.max(1, Math.min(40, (id % 40) + 1)); };
  PGF.getCPM = function(level){ const t={1:.094,5:.2157,10:.4225,15:.5974,20:.7317,25:.8408,30:.9164,35:.9648,40:.7903}; for(let l=level;l>=1;l--){ if(t[l]) return t[l]; } const low=Math.floor(level/5)*5,up=low+5; const lc=t[low]||.094,uc=t[up]||.7903; return lc + (uc-lc)*((level-low)/5); };
  PGF.getBaseStats = function(id){ const d={1:{attack:118,defense:111,stamina:128},2:{attack:151,defense:143,stamina:155},3:{attack:198,defense:189,stamina:190},4:{attack:116,defense:93,stamina:118},5:{attack:158,defense:126,stamina:151},6:{attack:223,defense:173,stamina:186},7:{attack:94,defense:121,stamina:127},8:{attack:126,defense:155,stamina:151},9:{attack:171,defense:207,stamina:188},10:{attack:55,defense:55,stamina:128},11:{attack:45,defense:80,stamina:137},12:{attack:167,defense:106,stamina:155},13:{attack:63,defense:50,stamina:120},14:{attack:46,defense:75,stamina:137},15:{attack:169,defense:130,stamina:163},16:{attack:85,defense:73,stamina:120},17:{attack:117,defense:105,stamina:160},18:{attack:166,defense:154,stamina:195},19:{attack:103,defense:70,stamina:102},20:{attack:161,defense:139,stamina:146},150:{attack:300,defense:182,stamina:214},144:{attack:192,defense:236,stamina:207},145:{attack:253,defense:185,stamina:207},146:{attack:251,defense:181,stamina:207}}; if(d[id]) return d[id]; const s=id*123456; return { attack:80+(s%120), defense:80+((s*2)%120), stamina:110+((s*3)%90) }; };
  PGF.calculatePowerLevel = function(p){ if(!p||!p.id) return 15; const b=this.getBaseStats(p.id), iv=this.generateIVs(p.id), lvl=this.getPokemonLevel(p.id), c=this.getCPM(lvl); const atk=b.attack+iv.attack, def=b.defense+iv.defense, sta=b.stamina+iv.stamina; const cp=Math.floor((atk*Math.sqrt(def)*Math.sqrt(sta)*Math.pow(c,2))/10); const pct=Math.min(100,(cp/4500)*100); if(window.POKE_DEBUG) console.debug(`[PowerLevel] ${p.name} (#${p.id}) CP:${cp} => ${Math.round(pct)}%`); return Math.round(pct); };
  PGF.getPerformanceRating = function(p){ if(p>=25) return {rating:'Excellent',class:'excellent',stars:5}; if(p>=20) return {rating:'Great',class:'great',stars:4}; if(p>=15) return {rating:'Good',class:'good',stars:3}; if(p>=10) return {rating:'Average',class:'average',stars:2}; return {rating:'Poor',class:'poor',stars:1}; };
  PGF.getPowerLevelHTML = function(p){ const lvl=this.calculatePowerLevel(p), perf=this.getPerformanceRating(lvl), iv=this.generateIVs(p.id), tot=iv.attack+iv.defense+iv.stamina, ivPct=Math.round((tot/45)*100), type=(p.types&&p.types[0])?p.types[0].toLowerCase():'normal'; return `<div class="power-level type-${type} ${perf.class}" data-pokemon-id="${p.id}" data-primary-type="${type}"><div class="power-label">CP Level</div><div class="power-value">${lvl}%</div><div class="iv-info">IVs: ${ivPct}% (${tot}/45)</div><div class="performance-rating">${perf.rating}</div></div>`; };
  PGF.calculateGoAppraisalStarsFromIVTotal = function(total){
    if (total === 45) return 4;
    if (total >= 37) return 3;
    if (total >= 30) return 2;
    if (total >= 23) return 1;
    return 0;
  };
  PGF.calculateAutoRating = function(p){
    if(!p || !p.id) return 0;
    const iv=this.generateIVs(p.id);
    const total=(iv.attack||0)+(iv.defense||0)+(iv.stamina||0);
    const stars=this.calculateGoAppraisalStarsFromIVTotal(total);
    if(window.POKE_DEBUG) console.debug(`[GO Appraisal] ${p.name||'pokemon'} (#${p.id}) IV ${total}/45 => ${stars}*`);
    return stars;
  };
})();
