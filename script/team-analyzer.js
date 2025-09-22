// Team-Analyse-System für Pokemon-Teams
// Logging-Richtlinie: Nur console.error / console.warn dauerhaft. Zusätzliche Debug-Ausgaben
// können über (window.POKE_DEBUG && console.debug(...)) in zukünftigen Erweiterungen ergänzt werden.
class PokemonTeamAnalyzer {
    constructor() {
        this.typeChart = this.initializeTypeChart();
        this.init();
    }

    init() {
        this.setupTeamAnalysisModal();
        this.attachEventListeners();
    }

    // Typ-Effektivitäts-Tabelle
    initializeTypeChart() {
        return {
            normal: { weak: ['fighting'], resist: [], immune: ['ghost'] },
            fire: { weak: ['water', 'ground', 'rock'], resist: ['fire', 'grass', 'ice', 'bug', 'steel', 'fairy'], immune: [] },
            water: { weak: ['electric', 'grass'], resist: ['fire', 'water', 'ice', 'steel'], immune: [] },
            electric: { weak: ['ground'], resist: ['electric', 'flying', 'steel'], immune: [] },
            grass: { weak: ['fire', 'ice', 'poison', 'flying', 'bug'], resist: ['water', 'electric', 'grass', 'ground'], immune: [] },
            ice: { weak: ['fire', 'fighting', 'rock', 'steel'], resist: ['ice'], immune: [] },
            fighting: { weak: ['flying', 'psychic', 'fairy'], resist: ['bug', 'rock', 'dark'], immune: [] },
            poison: { weak: ['ground', 'psychic'], resist: ['grass', 'fighting', 'poison', 'bug', 'fairy'], immune: [] },
            ground: { weak: ['water', 'grass', 'ice'], resist: ['poison', 'rock'], immune: ['electric'] },
            flying: { weak: ['electric', 'ice', 'rock'], resist: ['grass', 'fighting', 'bug'], immune: ['ground'] },
            psychic: { weak: ['bug', 'ghost', 'dark'], resist: ['fighting', 'psychic'], immune: [] },
            bug: { weak: ['fire', 'flying', 'rock'], resist: ['grass', 'fighting', 'ground'], immune: [] },
            rock: { weak: ['water', 'grass', 'fighting', 'ground', 'steel'], resist: ['normal', 'fire', 'poison', 'flying'], immune: [] },
            ghost: { weak: ['ghost', 'dark'], resist: ['poison', 'bug'], immune: ['normal', 'fighting'] },
            dragon: { weak: ['ice', 'dragon', 'fairy'], resist: ['fire', 'water', 'electric', 'grass'], immune: [] },
            dark: { weak: ['fighting', 'bug', 'fairy'], resist: ['ghost', 'dark'], immune: ['psychic'] },
            steel: { weak: ['fire', 'fighting', 'ground'], resist: ['normal', 'grass', 'ice', 'flying', 'psychic', 'bug', 'rock', 'dragon', 'steel', 'fairy'], immune: ['poison'] },
            fairy: { weak: ['poison', 'steel'], resist: ['fighting', 'bug', 'dark'], immune: ['dragon'] }
        };
    }

    // Team-Stärken und Schwächen analysieren
    analyzeTeam(pokemonTeam) {
        const analysis = {
            weaknesses: {},
            resistances: {},
            immunities: {},
            coverage: {},
            recommendations: []
        };

        // Sammle alle Typen im Team
        const teamTypes = new Set();
        pokemonTeam.forEach(pokemon => {
            pokemon.types.forEach(type => teamTypes.add(type));
        });

        // Analysiere Schwächen
        for (const attackType of Object.keys(this.typeChart)) {
            let effectivenessScore = 0;
            let affectedPokemon = [];

            pokemonTeam.forEach(pokemon => {
                const effectiveness = this.calculateTypeEffectiveness(attackType, pokemon.types);
                if (effectiveness > 1) {
                    effectivenessScore += effectiveness;
                    affectedPokemon.push({ name: pokemon.name, effectiveness });
                }
            });

            if (effectivenessScore > 0) {
                analysis.weaknesses[attackType] = {
                    score: effectivenessScore,
                    affected: affectedPokemon,
                    severity: this.getSeverityLevel(effectivenessScore, pokemonTeam.length)
                };
            }
        }

        // Analysiere Resistenzen
        for (const defendType of Array.from(teamTypes)) {
            const typeData = this.typeChart[defendType];
            if (!typeData) continue;

            typeData.resist.forEach(resistType => {
                if (!analysis.resistances[resistType]) {
                    analysis.resistances[resistType] = { count: 0, types: [] };
                }
                analysis.resistances[resistType].count++;
                analysis.resistances[resistType].types.push(defendType);
            });

            typeData.immune.forEach(immuneType => {
                if (!analysis.immunities[immuneType]) {
                    analysis.immunities[immuneType] = { count: 0, types: [] };
                }
                analysis.immunities[immuneType].count++;
                analysis.immunities[immuneType].types.push(defendType);
            });
        }

        // Analysiere offensive Coverage
        analysis.coverage = this.analyzeCoverage(teamTypes);

        // Generiere Empfehlungen
        analysis.recommendations = this.generateRecommendations(analysis, teamTypes);

        return analysis;
    }

    calculateTypeEffectiveness(attackType, defendTypes) {
        let effectiveness = 1;

        defendTypes.forEach(defendType => {
            const typeData = this.typeChart[defendType];
            if (!typeData) return;

            if (typeData.immune.includes(attackType)) {
                effectiveness = 0;
            } else if (typeData.resist.includes(attackType)) {
                effectiveness *= 0.5;
            } else if (typeData.weak.includes(attackType)) {
                effectiveness *= 2;
            }
        });

        return effectiveness;
    }

    analyzeCoverage(teamTypes) {
        const coverage = {};
        const allTypes = Object.keys(this.typeChart);

        allTypes.forEach(defendType => {
            let bestEffectiveness = 0;
            let coveringTypes = [];

            Array.from(teamTypes).forEach(attackType => {
                const effectiveness = this.calculateOffensiveEffectiveness(attackType, defendType);
                if (effectiveness > bestEffectiveness) {
                    bestEffectiveness = effectiveness;
                    coveringTypes = [attackType];
                } else if (effectiveness === bestEffectiveness && effectiveness > 1) {
                    coveringTypes.push(attackType);
                }
            });

            coverage[defendType] = {
                effectiveness: bestEffectiveness,
                coveringTypes: coveringTypes,
                covered: bestEffectiveness > 1
            };
        });

        return coverage;
    }

    calculateOffensiveEffectiveness(attackType, defendType) {
        // Vereinfachte offensive Typ-Tabelle
        const offensiveChart = {
            fire: { superEffective: ['grass', 'ice', 'bug', 'steel'], notVeryEffective: ['fire', 'water', 'rock', 'dragon'] },
            water: { superEffective: ['fire', 'ground', 'rock'], notVeryEffective: ['water', 'grass', 'dragon'] },
            grass: { superEffective: ['water', 'ground', 'rock'], notVeryEffective: ['fire', 'grass', 'poison', 'flying', 'bug', 'dragon', 'steel'] },
            electric: { superEffective: ['water', 'flying'], notVeryEffective: ['grass', 'electric', 'dragon'], noEffect: ['ground'] },
            psychic: { superEffective: ['fighting', 'poison'], notVeryEffective: ['psychic', 'steel'], noEffect: ['dark'] },
            ice: { superEffective: ['grass', 'ground', 'flying', 'dragon'], notVeryEffective: ['fire', 'water', 'ice', 'steel'] },
            dragon: { superEffective: ['dragon'], notVeryEffective: ['steel'], noEffect: ['fairy'] },
            fighting: { superEffective: ['normal', 'ice', 'rock', 'dark', 'steel'], notVeryEffective: ['poison', 'flying', 'psychic', 'bug', 'fairy'], noEffect: ['ghost'] }
        };

        const attackData = offensiveChart[attackType];
        if (!attackData) return 1;

        if (attackData.noEffect && attackData.noEffect.includes(defendType)) return 0;
        if (attackData.superEffective && attackData.superEffective.includes(defendType)) return 2;
        if (attackData.notVeryEffective && attackData.notVeryEffective.includes(defendType)) return 0.5;

        return 1;
    }

    getSeverityLevel(score, teamSize) {
        const avgScore = score / teamSize;
        if (avgScore >= 4) return { level: 'critical', text: 'Kritische Schwäche' };
        if (avgScore >= 2) return { level: 'high', text: 'Hohe Schwäche' };
        if (avgScore >= 1) return { level: 'medium', text: 'Moderate Schwäche' };
        return { level: 'low', text: 'Geringe Schwäche' };
    }

    generateRecommendations(analysis, teamTypes) {
        const recommendations = [];

        // Schwächen-basierte Empfehlungen
        const criticalWeaknesses = Object.entries(analysis.weaknesses)
            .filter(([type, data]) => data.severity.level === 'critical')
            .map(([type]) => type);

        if (criticalWeaknesses.length > 0) {
            recommendations.push({
                type: 'weakness',
                priority: 'high',
                message: `Kritische Schwäche gegen: ${criticalWeaknesses.join(', ')}. Erwäge Pokemon mit Resistenz gegen diese Typen.`
            });
        }

        // Coverage-Empfehlungen
        const uncoveredTypes = Object.entries(analysis.coverage)
            .filter(([type, data]) => !data.covered)
            .map(([type]) => type);

        if (uncoveredTypes.length > 12) {
            recommendations.push({
                type: 'coverage',
                priority: 'medium',
                message: `Schlechte offensive Coverage. Erwäge vielseitigere Angreifer-Typen.`
            });
        }

        // Balance-Empfehlungen
        if (teamTypes.size < 3) {
            recommendations.push({
                type: 'diversity',
                priority: 'medium',
                message: 'Team hat wenig Typ-Diversität. Füge Pokemon mit verschiedenen Typen hinzu.'
            });
        }

        return recommendations;
    }

    setupTeamAnalysisModal() {
        const modalHTML = this.createTeamAnalysisModalHTML();
        document.body.insertAdjacentHTML('beforeend', modalHTML);
        
        // Event Listeners für das Modal hinzufügen
        this.attachModalEventListeners();
    }

    attachModalEventListeners() {
        const modal = document.getElementById('teamAnalysisModal');
        if (!modal) return;
        // Bootstrap regelt aria-hidden & aria-modal selbst – wir beschränken uns auf Fokus-Verbesserung
        modal.addEventListener('shown.bs.modal', () => {
            const closeButton = modal.querySelector('.btn-close');
            if (closeButton) closeButton.focus();
        });

        modal.addEventListener('hidden.bs.modal', () => {
            // Optional: Fokus zurück auf Analyse-Button (falls vorhanden)
            const analysisBtn = document.querySelector('.drop-point button.btn-info');
            if (analysisBtn) analysisBtn.focus();
        });
    }

    createTeamAnalysisModalHTML() {
        return `
            <!-- aria-hidden entfernt: Bootstrap kontrolliert Sichtbarkeit & Accessibility selbst -->
            <div id="teamAnalysisModal" class="modal fade" tabindex="-1" aria-labelledby="teamAnalysisModalLabel" aria-describedby="teamAnalysisContent">
                <div class="modal-dialog modal-xl">
                    <div class="modal-content">
                        <div class="modal-header">
                            <h5 class="modal-title" id="teamAnalysisModalLabel">🔬 Team-Analyse</h5>
                            <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Schließen"></button>
                        </div>
                        <div class="modal-body">
                            <div id="teamAnalysisContent">
                                <div class="analysis-loading">
                                    <div class="spinner-border text-primary" role="status" aria-label="Analysiere Team"></div>
                                    <p>Analysiere Team...</p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }

    attachEventListeners() {
        // Team-Analyse-Button zur Droppoint hinzufügen
        document.addEventListener('DOMContentLoaded', () => {
            this.addAnalysisButtonToDroppoint();
        });
    }

    addAnalysisButtonToDroppoint() {
        const dropPoint = document.querySelector('.drop-point');
        if (!dropPoint) return;

        const analysisButton = document.createElement('button');
        analysisButton.className = 'btn btn-info mt-3 w-100';
        analysisButton.innerHTML = '🔬 Team analysieren';
        analysisButton.addEventListener('click', () => this.openTeamAnalysis());

        dropPoint.appendChild(analysisButton);
    }

    openTeamAnalysis() {
        const pokemonTeam = this.getCurrentTeam();
        if (pokemonTeam.length === 0) {
            alert('Füge erst Pokemon zu deinem Team hinzu!');
            return;
        }

        const modal = document.getElementById('teamAnalysisModal');
        if (!modal) {
            console.error('Team Analysis Modal not found');
            return;
        }

        // Korrekte Initialisierung des Bootstrap Modals
        let bootstrap_modal = bootstrap.Modal.getInstance(modal);
        if (!bootstrap_modal) {
            bootstrap_modal = new bootstrap.Modal(modal, {
                backdrop: true,
                keyboard: true,
                focus: true
            });
        }
        
        // Team-Analyse anzeigen bevor das Modal geöffnet wird
        this.displayTeamAnalysis(pokemonTeam);
        
        // Modal öffnen
        bootstrap_modal.show();
    }

    closeTeamAnalysis() {
        const modal = document.getElementById('teamAnalysisModal');
        if (!modal) return;

        const bootstrap_modal = bootstrap.Modal.getInstance(modal);
        if (bootstrap_modal) {
            bootstrap_modal.hide();
        }
    }

    getCurrentTeam() {
        // Nutze das neue TeamOffcanvas-System
        if (window.teamOffcanvas && typeof window.teamOffcanvas.getTeam === 'function') {
            const team = window.teamOffcanvas.getTeam();
            return team.map(pokemon => ({
                id: pokemon.id,
                name: pokemon.name,
                types: pokemon.types,
                image: pokemon.image
            }));
        }
        
        // Fallback: Alte Drop-Point Methode (falls noch verwendet)
        const dropPoint = document.querySelector('.drop-point');
        if (!dropPoint) return [];

        const pokemonCards = dropPoint.querySelectorAll('.pokemon-card');
        const team = [];

        pokemonCards.forEach(card => {
            const id = parseInt(card.dataset.pokemonId || card.dataset.id);
            const name = card.querySelector('.pokemon-name')?.textContent || '';
            const typeElements = card.querySelectorAll('.type-badge, .pokemon-types span');
            const VALID_TYPES = new Set([
                'normal','fire','water','grass','electric','ice','fighting','poison','ground','flying','psychic','bug','rock','ghost','dragon','dark','steel','fairy'
            ]);
            const types = Array.from(typeElements)
                .map(el => (el.textContent||'').toLowerCase().trim())
                .map(t => t.replace(/[^a-z]/g,''))
                .filter(t => VALID_TYPES.has(t));

            if (id && name && types.length > 0) {
                team.push({ id, name, types });
            }
        });

        return team;
    }

    displayTeamAnalysis(pokemonTeam) {
        const analysis = this.analyzeTeam(pokemonTeam);
        const content = document.getElementById('teamAnalysisContent');
        
        content.innerHTML = this.createAnalysisHTML(pokemonTeam, analysis);
    }

    createAnalysisHTML(team, analysis) {
        return `
            <div class="team-analysis-results">
                ${this.createTeamOverviewHTML(team)}
                ${this.createWeaknessesHTML(analysis.weaknesses)}
                ${this.createStrengthsHTML(analysis.resistances, analysis.immunities)}
                ${this.createCoverageHTML(analysis.coverage)}
                ${this.createRecommendationsHTML(analysis.recommendations)}
            </div>
        `;
    }

    createTeamOverviewHTML(team) {
        const teamCards = team.map((pokemon, index) => {
            const primaryType = pokemon.types[0] || 'normal';
            const pokemonNumber = pokemon.id ? `#${pokemon.id.toString().padStart(3, '0')}` : '';
            const pokemonImage = this.getPokemonImageUrl(pokemon);
            
            return `
                <div class="team-member type-${primaryType}">
                    <div class="team-position">#${index + 1}</div>
                    <div class="team-member-image">
                        <img src="${pokemonImage}" alt="${pokemon.name}" loading="lazy">
                    </div>
                    <div class="team-member-info">
                        <div class="team-member-number">${pokemonNumber}</div>
                        <div class="team-member-name">${pokemon.name}</div>
                        <div class="team-member-types">
                            ${pokemon.types.map(type => `<span class="type-badge type-${type}">${type.toUpperCase()}</span>`).join('')}
                        </div>
                    </div>
                </div>
            `;
        }).join('');

        return `
            <div class="analysis-section">
                <h6><img src="assets/img/9.png" alt="Team" class="icon-team icon-team--inline"> Team-Übersicht</h6>
                <div class="team-overview">
                    ${teamCards}
                </div>
            </div>
        `;
    }

    // Hilfsfunktion um Pokemon-Bild-URL zu erhalten
    getPokemonImageUrl(pokemon) {
        // Versuche zuerst das Bild aus dem Pokemon-Objekt zu bekommen
        if (pokemon.image) {
            return pokemon.image;
        }
        
        // Fallback zu Standard Pokemon-API-Bild
        if (pokemon.id) {
            const imageUrl = `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/${pokemon.id}.png`;
            return imageUrl;
        }
        
        // Letzter Fallback zu Placeholder
        return 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/0.png';
    }

    createWeaknessesHTML(weaknesses) {
        if (Object.keys(weaknesses).length === 0) {
            return `
                <div class="analysis-section">
                    <h6><i class="fas fa-shield-alt text-success"></i> Schwächen</h6>
                    <p class="text-success">Keine kritischen Schwächen gefunden!</p>
                </div>
            `;
        }

        const weaknessItems = Object.entries(weaknesses)
            .sort(([,a], [,b]) => b.score - a.score)
            .map(([type, data]) => `
                <div class="weakness-item severity-${data.severity.level}">
                    <div class="weakness-header">
                        <span class="type-badge type-${type}">${type.toUpperCase()}</span>
                        <span class="severity-badge ${data.severity.level}">${data.severity.text}</span>
                    </div>
                    <div class="affected-pokemon">
                        Betroffene Pokemon: ${data.affected.map(p => `${p.name} (${p.effectiveness}x)`).join(', ')}
                    </div>
                </div>
            `).join('');

        return `
            <div class="analysis-section">
                <h6><i class="fas fa-exclamation-triangle text-warning"></i> Team-Schwächen</h6>
                <div class="weaknesses-list">
                    ${weaknessItems}
                </div>
            </div>
        `;
    }

    createStrengthsHTML(resistances, immunities) {
        const resistanceItems = Object.entries(resistances).map(([type, data]) => `
            <div class="strength-item">
                <span class="type-badge type-${type}">${type.toUpperCase()}</span>
                <span class="strength-count">${data.count}x Resistenz</span>
            </div>
        `).join('');

        const immunityItems = Object.entries(immunities).map(([type, data]) => `
            <div class="strength-item immunity">
                <span class="type-badge type-${type}">${type.toUpperCase()}</span>
                <span class="strength-count">${data.count}x Immunität</span>
            </div>
        `).join('');

        return `
            <div class="analysis-section">
                <h6><i class="fas fa-shield-alt text-success"></i> Team-Stärken</h6>
                <div class="strengths-list">
                    ${resistanceItems}
                    ${immunityItems}
                </div>
            </div>
        `;
    }

    createCoverageHTML(coverage) {
        const coveredTypes = Object.entries(coverage).filter(([,data]) => data.covered).length;
        const totalTypes = Object.keys(coverage).length;
        const coveragePercentage = Math.round((coveredTypes / totalTypes) * 100);

        const coverageItems = Object.entries(coverage)
            .filter(([,data]) => data.covered)
            .map(([type, data]) => `
                <div class="coverage-item">
                    <span class="type-badge type-${type}">${type.toUpperCase()}</span>
                    <span class="effectiveness">${data.effectiveness}x</span>
                </div>
            `).join('');

        return `
            <div class="analysis-section">
                <h6><i class="fas fa-crosshairs text-info"></i> Offensive Coverage</h6>
                <div class="coverage-stats">
                    <div class="coverage-percentage">
                        <span class="percentage">${coveragePercentage}%</span>
                        <span class="coverage-text">Coverage (${coveredTypes}/${totalTypes} Typen)</span>
                    </div>
                    <div class="progress">
                        <div class="progress-bar" data-coverage="${coveragePercentage}"></div>
                    </div>
                </div>
                <div class="coverage-list">
                    ${coverageItems}
                </div>
            </div>
        `;
    }

    createRecommendationsHTML(recommendations) {
        if (recommendations.length === 0) {
            return `
                <div class="analysis-section">
                    <h6><i class="fas fa-lightbulb text-success"></i> Empfehlungen</h6>
                    <p class="text-success">Dein Team ist gut ausbalanciert!</p>
                </div>
            `;
        }

        const recommendationItems = recommendations.map(rec => `
            <div class="recommendation-item priority-${rec.priority}">
                <div class="recommendation-icon">
                    ${rec.type === 'weakness' ? '⚠️' : rec.type === 'coverage' ? '🎯' : '🔄'}
                </div>
                <div class="recommendation-text">${rec.message}</div>
            </div>
        `).join('');

        return `
            <div class="analysis-section">
                <h6><i class="fas fa-lightbulb text-warning"></i> Verbesserungsvorschläge</h6>
                <div class="recommendations-list">
                    ${recommendationItems}
                </div>
            </div>
        `;
    }
}

// Globale Instanz
window.pokemonTeamAnalyzer = new PokemonTeamAnalyzer();