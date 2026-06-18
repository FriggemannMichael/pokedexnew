class PokemonTeamAnalyzerCore {
  constructor(){
    this.typeChart = this.initializeTypeChart();
  }
  initializeTypeChart(){
    // Single Source of Truth: script/utils/type-effectiveness.js (Hybrid-Sync).
    return (window.TypeEffectiveness && window.TypeEffectiveness.getChart()) || {};
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
