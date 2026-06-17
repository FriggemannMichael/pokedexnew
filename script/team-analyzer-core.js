class PokemonTeamAnalyzerCore {
  constructor(){
    this.typeChart = this.initializeTypeChart();
  }
  initializeTypeChart(){
    return {
      normal:{weak:['fighting'],resist:[],immune:['ghost']},
      fire:{weak:['water','ground','rock'],resist:['fire','grass','ice','bug','steel','fairy'],immune:[]},
      water:{weak:['electric','grass'],resist:['fire','water','ice','steel'],immune:[]},
      electric:{weak:['ground'],resist:['electric','flying','steel'],immune:[]},
      grass:{weak:['fire','ice','poison','flying','bug'],resist:['water','electric','grass','ground'],immune:[]},
      ice:{weak:['fire','fighting','rock','steel'],resist:['ice'],immune:[]},
      fighting:{weak:['flying','psychic','fairy'],resist:['bug','rock','dark'],immune:[]},
      poison:{weak:['ground','psychic'],resist:['grass','fighting','poison','bug','fairy'],immune:[]},
      ground:{weak:['water','grass','ice'],resist:['poison','rock'],immune:['electric']},
      flying:{weak:['electric','ice','rock'],resist:['grass','fighting','bug'],immune:['ground']},
      psychic:{weak:['bug','ghost','dark'],resist:['fighting','psychic'],immune:[]},
      bug:{weak:['fire','flying','rock'],resist:['grass','fighting','ground'],immune:[]},
      rock:{weak:['water','grass','fighting','ground','steel'],resist:['normal','fire','poison','flying'],immune:[]},
      ghost:{weak:['ghost','dark'],resist:['poison','bug'],immune:['normal','fighting']},
      dragon:{weak:['ice','dragon','fairy'],resist:['fire','water','electric','grass'],immune:[]},
      dark:{weak:['fighting','bug','fairy'],resist:['ghost','dark'],immune:['psychic']},
      steel:{weak:['fire','fighting','ground'],resist:['normal','grass','ice','flying','psychic','bug','rock','dragon','steel','fairy'],immune:['poison']},
      fairy:{weak:['poison','steel'],resist:['fighting','bug','dark'],immune:['dragon']}
    };
  }
  init(){ if(window.POKE_DEBUG) console.debug('[TeamAnalyzer] init'); this.setupTeamAnalysisModal(); this.attachGlobalListeners(); }
  attachGlobalListeners(){ document.addEventListener('DOMContentLoaded',()=> this.addAnalysisButtonToDroppoint()); }
  getCurrentTeam(){
    if(window.teamOffcanvas && typeof window.teamOffcanvas.getTeam==='function'){
      return window.teamOffcanvas.getTeam().map(p=>({id:p.id,name:p.name,types:p.types,image:p.image}));
    }
    const dropPoint=document.querySelector('.drop-point'); if(!dropPoint) return [];
    const VALID=new Set(['normal','fire','water','grass','electric','ice','fighting','poison','ground','flying','psychic','bug','rock','ghost','dragon','dark','steel','fairy']);
    return Array.from(dropPoint.querySelectorAll('.pokemon-card')).map(card=>{
      const id=parseInt(card.dataset.pokemonId||card.dataset.id); const name=card.querySelector('.pokemon-name')?.textContent||'';
      const types=Array.from(card.querySelectorAll('.type-badge, .pokemon-types span')).map(el=> (el.textContent||'').toLowerCase().trim().replace(/[^a-z]/g,'')).filter(t=>VALID.has(t));
      return (id && name && types.length)?{id,name,types}:null;
    }).filter(Boolean);
  }
  openTeamAnalysis(){ const team=this.getCurrentTeam(); if(team.length===0){ alert('Füge erst Pokemon zu deinem Team hinzu!'); return; }
    const modal=document.getElementById('teamAnalysisModal'); if(!modal){ console.error('Team Analysis Modal not found'); return; }
    document.querySelectorAll('.modal.show').forEach(mo=>{ if(mo!==modal){ if(mo.contains(document.activeElement)) document.activeElement.blur(); const inst=bootstrap.Modal.getInstance(mo); if(inst) inst.hide(); }});
    let m=bootstrap.Modal.getInstance(modal); if(!m) m=new bootstrap.Modal(modal,{backdrop:true,keyboard:true,focus:true});
    this.displayTeamAnalysis(team); m.show(); }
  closeTeamAnalysis(){ const modal=document.getElementById('teamAnalysisModal'); if(!modal) return; const m=bootstrap.Modal.getInstance(modal); if(m) m.hide(); }
}

window.PokemonTeamAnalyzerCore = PokemonTeamAnalyzerCore;
