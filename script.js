// API Configuration
const API_URL = 'https://www.optcgapi.com/api/allSetCards/';
const ST_API_URL = 'https://www.optcgapi.com/api/allSTCards/';
const PROMO_API_URL = 'https://www.optcgapi.com/api/allPromos/';
let allLeaders = []; // Store fetched leaders
let allCardsData = []; // Store all cards for alternate art lookup

// Fetch leaders from both APIs
async function fetchLeadersFromAPI() {
    try {
        console.log('Fetching leaders from main API, starter decks, and promos...');
        
        // Fetch from all three APIs in parallel
        const [setCardsResponse, stCardsResponse, promoCardsResponse] = await Promise.all([
            fetch(API_URL),
            fetch(ST_API_URL),
            fetch(PROMO_API_URL)
        ]);
        
        const setCardsData = await setCardsResponse.json();
        const stCardsData = await stCardsResponse.json();
        const promoCardsData = await promoCardsResponse.json();
        
        // Combine all card data for later alternate art lookup
        allCardsData = [...setCardsData, ...stCardsData, ...promoCardsData];
        
        // Filter for Leader cards only and exclude alternate art versions
        const processCards = (data) => data.filter(card => {
            // Must be a Leader card
            if (card.card_type !== 'Leader') return false;
            
            // Exclude reprint starter decks (ST-15 to ST-20, ST-23 to ST-28)
            if (card.set_id) {
                const setMatch = card.set_id.match(/ST-(\d+)/);
                if (setMatch) {
                    const setNum = parseInt(setMatch[1]);
                    if ((setNum >= 15 && setNum <= 20) || (setNum >= 23 && setNum <= 28)) {
                        return false;
                    }
                }
            }
            
            // Exclude alternate art cards (Parallel, Alternate Art, SPR, etc.)
            const name = card.card_name.toLowerCase();
            if (name.includes('parallel') || 
                name.includes('alternate art') || 
                name.includes('alt art') ||
                name.includes('manga rare') ||
                name.includes('championship') ||
                name.includes('spr')) {
                return false;
            }
            
            return true;
        });
        
        // Process cards from all three sources
        const setLeaders = processCards(setCardsData);
        const stLeaders = processCards(stCardsData);
        const promoLeaders = processCards(promoCardsData);
        
        // Combine and process all leaders
        const allLeadersRaw = [...setLeaders, ...stLeaders, ...promoLeaders];
        
        // Remove duplicates based on card_set_id (unique identifier)
        const uniqueLeadersMap = new Map();
        allLeadersRaw.forEach(card => {
            const uniqueKey = card.card_set_id; // e.g., "OP01-001", "ST01-001", "P-001"
            if (!uniqueLeadersMap.has(uniqueKey)) {
                uniqueLeadersMap.set(uniqueKey, card);
            }
        });
        
        const leaders = Array.from(uniqueLeadersMap.values())
            .map(card => ({
                name: card.card_name,
                colors: card.card_color.split(' '), // Split "Blue Purple" into ["Blue", "Purple"]
                set: card.set_id,
                cardId: card.card_set_id,
                image: card.card_image
            }))
            .sort((a, b) => a.name.localeCompare(b.name));
        
        console.log(`Loaded ${leaders.length} unique leaders from API (${setLeaders.length} from sets, ${stLeaders.length} from starter decks, ${promoLeaders.length} from promos, ${allLeadersRaw.length - leaders.length} duplicates removed)`);
        return leaders;
    } catch (error) {
        console.error('Error fetching leaders from API:', error);
        return getFallbackLeaders(); // Use fallback if API fails
    }
}

// Fallback leader list in case API is down
function getFallbackLeaders() {
    console.log('Using fallback leader list');
    return [
        { name: "Monkey D. Luffy", colors: ["Red"], set: "OP-01" },
        { name: "Roronoa Zoro", colors: ["Green"], set: "OP-01" },
        { name: "Trafalgar Law", colors: ["Blue"], set: "OP-01" },
        { name: "Boa Hancock", colors: ["Blue"], set: "OP-01" },
        { name: "Donquixote Doflamingo", colors: ["Black"], set: "OP-01" },
        { name: "Perona", colors: ["Purple"], set: "OP-01" },
        { name: "Eustass Kid", colors: ["Red"], set: "OP-01" },
        { name: "Shanks", colors: ["Red"], set: "OP-01" }
    ];
}

const colorEmojis = {
    "Red": "🔴",
    "Blue": "🔵",
    "Green": "🟢",
    "Yellow": "🟡",
    "Purple": "🟣",
    "Black": "⚫"
};

function getLeaderDisplayName(leader) {
    if (!leader || !leader.name) return "Unknown";
    const colors = leader.colors || [];
    const colorIcons = colors.map(c => colorEmojis[c] || c).join("");
    const set = leader.set || "?";
    return `${leader.name} ${colorIcons} [${set}]`;
}

function getLeaderKey(leader) {
    if (!leader || !leader.name) return "unknown";
    const colors = leader.colors || [];
    const set = leader.set || "?";
    return `${leader.name}|${colors.join(",")}|${set}`;
}

let matches = [];
let selectedResult = null;
let selectedTurnOrder = null;
let selectedMyLeader = null; // Store selected leader object
let selectedOpponentLeader = null; // Store selected opponent leader object
let editingMatchId = null; // Track if we're editing an existing match
let backgroundCards = []; // Store selected background cards
let backgroundCarouselInterval = null;
let userName = ''; // Store user's name
let tournaments = []; // Store tournaments
let currentTournamentId = null; // Track current tournament being viewed
let tournamentSelectedMyLeader = null;
let tournamentSelectedOpponentLeader = null;
let tournamentSelectedResult = null;
let tournamentSelectedTurnOrder = null;

// Initialize app
async function init() {
    loadMatches();
    loadBackgroundCards();
    loadUserName();
    loadTournaments();
    
    // Show loading state
    const myLeaderSelect = document.getElementById('myLeaderName');
    const opponentLeaderSelect = document.getElementById('opponentLeaderName');
    myLeaderSelect.innerHTML = '<option value="">Loading leaders...</option>';
    opponentLeaderSelect.innerHTML = '<option value="">Loading leaders...</option>';
    
    // Fetch leaders from API
    allLeaders = await fetchLeadersFromAPI();
    
    populateLeaderSelects();
    populateFilterDropdowns();
    attachEventListeners();
    updateUI();
    startBackgroundCarousel();
    updateTitle();
    updateTournamentsList();
}

// Load matches from localStorage
function loadMatches() {
    const stored = localStorage.getItem('opTcgMatches');
    if (stored) {
        matches = JSON.parse(stored);
    }
}

// Save matches to localStorage
function saveMatches() {
    localStorage.setItem('opTcgMatches', JSON.stringify(matches));
}

// Populate leader name datalist
function populateLeaderSelects() {
    const myLeaderSelect = document.getElementById('myLeaderName');
    const opponentLeaderSelect = document.getElementById('opponentLeaderName');
    
    // Clear existing options
    myLeaderSelect.innerHTML = '<option value="">Select leader...</option>';
    opponentLeaderSelect.innerHTML = '<option value="">Select leader...</option>';
    
    // Populate leader dropdowns from API data
    allLeaders.forEach((leader, index) => {
        const displayName = getLeaderDisplayName(leader);
        const option1 = new Option(displayName, index);
        const option2 = new Option(displayName, index);
        myLeaderSelect.add(option1);
        opponentLeaderSelect.add(option2);
    });
}

// Populate filter dropdowns
function populateFilterDropdowns() {
    const filterMyLeader = document.getElementById('filterMyLeader');
    
    // Store current selections
    const currentSelections = Array.from(filterMyLeader.querySelectorAll('input[type="checkbox"]:checked'))
        .map(cb => cb.value);
    
    // Clear existing checkboxes
    filterMyLeader.innerHTML = '';
    
    // Populate filter dropdowns with leaders from matches
    const myLeadersUsed = new Set();
    
    matches.forEach(match => {
        myLeadersUsed.add(getLeaderKey(match.myLeader));
    });
    
    // Convert to arrays with leader data
    const myLeadersArray = Array.from(myLeadersUsed).map(key => {
        const match = matches.find(m => getLeaderKey(m.myLeader) === key);
        return match ? match.myLeader : null;
    }).filter(Boolean).sort((a, b) => a.name.localeCompare(b.name));
    
    myLeadersArray.forEach(leader => {
        const displayName = getLeaderDisplayName(leader);
        const key = getLeaderKey(leader);
        const isChecked = currentSelections.includes(key);
        
        const label = document.createElement('label');
        label.className = 'checkbox-label';
        label.innerHTML = `
            <input type="checkbox" value="${key}" ${isChecked ? 'checked' : ''}>
            ${displayName}
        `;
        
        // Add change listener
        label.querySelector('input').addEventListener('change', updateMatchHistory);
        
        filterMyLeader.appendChild(label);
    });
}

// Attach event listeners
function attachEventListeners() {
    // Leader selection - auto-populate from API data
    document.getElementById('myLeaderName').addEventListener('change', function() {
        const index = parseInt(this.value);
        if (!isNaN(index) && allLeaders[index]) {
            selectedMyLeader = allLeaders[index];
        }
        updateSubmitButton();
    });
    
    document.getElementById('opponentLeaderName').addEventListener('change', function() {
        const index = parseInt(this.value);
        if (!isNaN(index) && allLeaders[index]) {
            selectedOpponentLeader = allLeaders[index];
        }
        updateSubmitButton();
    });

    // Filter listeners (for checkbox filters)
    // Leader filter listeners are attached dynamically in populateFilterDropdowns
    document.querySelectorAll('#filterFormat input[type="checkbox"]').forEach(cb => {
        cb.addEventListener('change', updateMatchHistory);
    });
    document.querySelectorAll('#filterColor input[type="checkbox"]').forEach(cb => {
        cb.addEventListener('change', updateMatchHistory);
    });
    document.querySelectorAll('#filterResult input[type="checkbox"]').forEach(cb => {
        cb.addEventListener('change', updateMatchHistory);
    });
    document.querySelectorAll('#filterTurnOrder input[type="checkbox"]').forEach(cb => {
        cb.addEventListener('change', updateMatchHistory);
    });

    // Detail view filter listeners
    document.querySelectorAll('#detailFilterFormat input[type="checkbox"]').forEach(cb => {
        cb.addEventListener('change', updateDetailMatchHistory);
    });
    document.querySelectorAll('#detailFilterColor input[type="checkbox"]').forEach(cb => {
        cb.addEventListener('change', updateDetailMatchHistory);
    });
    document.querySelectorAll('#detailFilterResult input[type="checkbox"]').forEach(cb => {
        cb.addEventListener('change', updateDetailMatchHistory);
    });
    document.querySelectorAll('#detailFilterTurnOrder input[type="checkbox"]').forEach(cb => {
        cb.addEventListener('change', updateDetailMatchHistory);
    });

    // Turn order buttons
    document.querySelectorAll('.turn-btn').forEach(btn => {
        btn.addEventListener('click', function() {
            // Only clear other turn buttons
            document.querySelectorAll('.turn-btn').forEach(b => b.classList.remove('active'));
            this.classList.add('active');
            selectedTurnOrder = this.dataset.turn;
            document.getElementById('turnOrder').value = selectedTurnOrder;
            updateSubmitButton();
        });
    });

    // Result buttons
    document.querySelectorAll('.result-btn:not(.turn-btn)').forEach(btn => {
        btn.addEventListener('click', function() {
            // Only clear other result buttons (not turn buttons)
            document.querySelectorAll('.result-btn:not(.turn-btn)').forEach(b => b.classList.remove('active'));
            this.classList.add('active');
            selectedResult = this.dataset.result;
            document.getElementById('result').value = selectedResult;
            updateSubmitButton();
        });
    });
    
    // Edit form - Leader selection
    document.getElementById('editMyLeaderName')?.addEventListener('change', function() {
        const index = parseInt(this.value);
        if (!isNaN(index) && allLeaders[index]) {
            selectedMyLeader = allLeaders[index];
        }
    });
    
    document.getElementById('editOpponentLeaderName')?.addEventListener('change', function() {
        const index = parseInt(this.value);
        if (!isNaN(index) && allLeaders[index]) {
            selectedOpponentLeader = allLeaders[index];
        }
    });

    // Edit form - Turn order buttons
    document.querySelectorAll('.turn-btn-edit').forEach(btn => {
        btn.addEventListener('click', function() {
            document.querySelectorAll('.turn-btn-edit').forEach(b => b.classList.remove('selected'));
            this.classList.add('selected');
            selectedTurnOrder = this.dataset.turn;
            document.getElementById('editTurnOrder').value = selectedTurnOrder;
        });
    });

    // Edit form - Result buttons
    document.querySelectorAll('.win-btn-edit, .loss-btn-edit').forEach(btn => {
        btn.addEventListener('click', function() {
            document.querySelectorAll('.win-btn-edit, .loss-btn-edit').forEach(b => b.classList.remove('selected'));
            this.classList.add('selected');
            selectedResult = this.dataset.result;
            document.getElementById('editResult').value = selectedResult;
        });
    });
    
    // Edit form - Notes character counter
    document.getElementById('editMatchNotes')?.addEventListener('input', function() {
        document.getElementById('editCharCount').textContent = this.value.length;
    });
    
    // Edit form submission
    document.getElementById('editMatchForm')?.addEventListener('submit', handleEditSubmit);


    // Form submission
    document.getElementById('matchForm').addEventListener('submit', handleSubmit);
    
    // Clear form button
    document.getElementById('clearBtn').addEventListener('click', function() {
        clearForm();
    });
    
    // Character counter for notes
    const notesField = document.getElementById('matchNotes');
    const charCount = document.getElementById('charCount');
    notesField.addEventListener('input', function() {
        charCount.textContent = this.value.length;
    });
}

// Clear form function
function clearForm() {
    document.getElementById('matchForm').reset();
    document.querySelectorAll('.result-btn').forEach(b => b.classList.remove('active'));
    document.querySelectorAll('.turn-btn').forEach(b => b.classList.remove('active'));
    selectedResult = null;
    selectedTurnOrder = null;
    selectedMyLeader = null;
    selectedOpponentLeader = null;
    editingMatchId = null;
    document.getElementById('charCount').textContent = '0';
    document.getElementById('submitBtn').textContent = 'Save Match';
    updateSubmitButton();
}

// Update submit button state
function updateSubmitButton() {
    const myLeaderName = document.getElementById('myLeaderName').value;
    const opponentLeaderName = document.getElementById('opponentLeaderName').value;
    const submitBtn = document.getElementById('submitBtn');
    
    const isValid = myLeaderName && opponentLeaderName && selectedTurnOrder && selectedResult;
    
    submitBtn.disabled = !isValid;
}

// Handle form submission
function handleSubmit(e) {
    e.preventDefault();
    
    const notes = document.getElementById('matchNotes').value.trim();
    const gameFormat = document.getElementById('gameFormat').value;
    
    if (editingMatchId) {
        // Update existing match
        const matchIndex = matches.findIndex(m => m.id === editingMatchId);
        if (matchIndex !== -1) {
            matches[matchIndex] = {
                ...matches[matchIndex],
                myLeader: {
                    name: selectedMyLeader.name,
                    colors: selectedMyLeader.colors,
                    set: selectedMyLeader.set,
                    cardId: selectedMyLeader.cardId,
                    image: selectedMyLeader.image
                },
                opponentLeader: {
                    name: selectedOpponentLeader.name,
                    colors: selectedOpponentLeader.colors,
                    set: selectedOpponentLeader.set,
                    cardId: selectedOpponentLeader.cardId,
                    image: selectedOpponentLeader.image
                },
                turnOrder: selectedTurnOrder,
                result: selectedResult,
                notes: notes,
                gameFormat: gameFormat
            };
        }
        editingMatchId = null;
    } else {
        // Create new match
        const match = {
            id: Date.now(),
            myLeader: {
                name: selectedMyLeader.name,
                colors: selectedMyLeader.colors,
                set: selectedMyLeader.set,
                cardId: selectedMyLeader.cardId,
                image: selectedMyLeader.image
            },
            opponentLeader: {
                name: selectedOpponentLeader.name,
                colors: selectedOpponentLeader.colors,
                set: selectedOpponentLeader.set,
                cardId: selectedOpponentLeader.cardId,
                image: selectedOpponentLeader.image
            },
            turnOrder: selectedTurnOrder,
            result: selectedResult,
            notes: notes,
            gameFormat: gameFormat,
            date: new Date().toISOString()
        };
        matches.unshift(match);
    }

    saveMatches();
    
    // Update UI
    updateUI();
    
    // Show feedback
    showFeedback();
    
    // Reset form
    clearForm();
}

// Show feedback animation
function showFeedback() {
    const submitBtn = document.getElementById('submitBtn');
    const originalText = submitBtn.textContent;
    submitBtn.textContent = '✓ Match Saved!';
    submitBtn.style.background = 'var(--success)';
    
    setTimeout(() => {
        submitBtn.textContent = originalText;
        submitBtn.style.background = '';
    }, 2000);
}

// Toggle collapsible sections
function toggleSection(sectionId) {
    const content = document.getElementById(sectionId);
    const icon = document.getElementById(sectionId + 'Icon');
    
    if (content.style.display === 'none') {
        content.style.display = 'block';
        icon.textContent = '▼';
    } else {
        content.style.display = 'none';
        icon.textContent = '▶';
    }
}

// Edit match
function editMatch(id) {
    const match = matches.find(m => m.id === id);
    if (!match) return;
    
    // Store editing ID
    editingMatchId = id;
    
    // Find the leader indices in allLeaders array
    const myLeaderIndex = allLeaders.findIndex(l => 
        l.name === match.myLeader.name && 
        l.set === match.myLeader.set &&
        JSON.stringify(l.colors) === JSON.stringify(match.myLeader.colors)
    );
    
    const opponentLeaderIndex = allLeaders.findIndex(l => 
        l.name === match.opponentLeader.name && 
        l.set === match.opponentLeader.set &&
        JSON.stringify(l.colors) === JSON.stringify(match.opponentLeader.colors)
    );
    
    // Populate form with existing data
    if (myLeaderIndex !== -1) {
        document.getElementById('myLeaderName').value = myLeaderIndex;
        selectedMyLeader = allLeaders[myLeaderIndex];
    }
    
    if (opponentLeaderIndex !== -1) {
        document.getElementById('opponentLeaderName').value = opponentLeaderIndex;
        selectedOpponentLeader = allLeaders[opponentLeaderIndex];
    }
    
    // Set turn order
    if (match.turnOrder) {
        selectedTurnOrder = match.turnOrder;
        document.getElementById('turnOrder').value = match.turnOrder;
        document.querySelectorAll('.turn-btn').forEach(btn => {
            if (btn.dataset.turn === match.turnOrder) {
                btn.classList.add('active');
            }
        });
    }
    
    // Set result
    selectedResult = match.result;
    document.getElementById('result').value = match.result;
    document.querySelectorAll('.result-btn').forEach(btn => {
        if (btn.dataset.result === match.result) {
            btn.classList.add('active');
        }
    });
    
    // Update submit button
    updateSubmitButton();
    document.getElementById('submitBtn').textContent = 'Update Match';
    
    // Scroll to form
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

// Delete match
function deleteMatch(id) {
    const isInDetailView = document.getElementById('detailView').style.display !== 'none';
    
    matches = matches.filter(m => m.id !== id);
    saveMatches();
    
    // If in detail view, check if we need to refresh or go back
    if (isInDetailView && window.currentDetailLeaderKey) {
        // Check if there are still matches for this leader
        const hasMatches = matches.some(m => {
            if (window.currentDetailType === 'my') {
                return getLeaderKey(m.myLeader) === window.currentDetailLeaderKey;
            } else {
                return getLeaderKey(m.opponentLeader) === window.currentDetailLeaderKey;
            }
        });
        
        if (hasMatches) {
            // Refresh the detail view with updated data
            showLeaderDetail(window.currentDetailLeaderKey, window.currentDetailType);
        } else {
            // No more matches for this leader, go back to main view
            showMainView();
        }
    } else {
        // On main view, just update UI
        updateUI();
    }
}

// Update all UI components
function updateUI() {
    updateMyLeadersStats();
    updateMatchupStats();
    updateMatchHistory();
}

// Update my leaders statistics
function updateMyLeadersStats() {
    const container = document.getElementById('myLeadersStats');
    
    if (matches.length === 0) {
        container.innerHTML = '<p class="empty-state">Leader stats will appear after recording matches.</p>';
        return;
    }

    // Calculate stats for each leader I used
    const leaderStats = {};
    
    matches.forEach(match => {
        const key = getLeaderKey(match.myLeader);
        if (!leaderStats[key]) {
            leaderStats[key] = { 
                leader: match.myLeader,
                wins: 0, 
                losses: 0, 
                total: 0 
            };
        }
        leaderStats[key].total++;
        if (match.result === 'win') {
            leaderStats[key].wins++;
        } else {
            leaderStats[key].losses++;
        }
    });

    // Convert to array and sort by usage
    const leaderArray = Object.values(leaderStats)
        .sort((a, b) => b.total - a.total);

    if (leaderArray.length === 0) {
        container.innerHTML = '<p class="empty-state">No leader data available.</p>';
        return;
    }

    container.innerHTML = leaderArray.map(stat => {
        const winRate = ((stat.wins / stat.total) * 100).toFixed(1);
        const displayName = getLeaderDisplayName(stat.leader);
        const key = getLeaderKey(stat.leader);
        const leaderImage = stat.leader.image || 'https://via.placeholder.com/80x112?text=No+Image';
        const winRateColor = getWinRateColor(winRate);
        
        return `
            <div class="leader-stat-item clickable" onclick="showLeaderDetail('${key}', 'my')">
                <img src="${leaderImage}" alt="${stat.leader.name}" class="leader-stat-image" title="${displayName}">
                <div class="leader-stat-content">
                    <div class="leader-name">${displayName}</div>
                    <div class="leader-record">
                        <span class="record-detail"><strong>${stat.wins}W</strong> - <strong>${stat.losses}L</strong></span>
                        <span class="record-detail" style="color: ${winRateColor}; font-weight: 600;">(${winRate}% win rate)</span>
                        <span class="record-detail">${stat.total} matches</span>
                    </div>
                    <div class="progress-bar">
                        <div class="progress-fill" style="width: ${winRate}%; background: ${winRateColor};"></div>
                    </div>
                </div>
            </div>
        `;
    }).join('');
}

// Update matchup statistics
function updateMatchupStats() {
    const container = document.getElementById('matchupStats');
    
    if (matches.length === 0) {
        container.innerHTML = '<p class="empty-state">Matchup stats will appear after recording matches.</p>';
        return;
    }

    // Calculate matchup stats (vs opponent leaders)
    const matchupStats = {};
    matches.forEach(match => {
        const key = getLeaderKey(match.opponentLeader);
        if (!matchupStats[key]) {
            matchupStats[key] = { 
                leader: match.opponentLeader,
                wins: 0, 
                losses: 0, 
                total: 0 
            };
        }
        matchupStats[key].total++;
        if (match.result === 'win') {
            matchupStats[key].wins++;
        } else {
            matchupStats[key].losses++;
        }
    });

    // Convert to array and sort by usage
    const matchupArray = Object.values(matchupStats)
        .sort((a, b) => b.total - a.total);

    if (matchupArray.length === 0) {
        container.innerHTML = '<p class="empty-state">No matchup data available.</p>';
        return;
    }

    container.innerHTML = matchupArray.map(stat => {
        const winRate = ((stat.wins / stat.total) * 100).toFixed(1);
        const displayName = getLeaderDisplayName(stat.leader);
        const key = getLeaderKey(stat.leader);
        const leaderImage = stat.leader.image || 'https://via.placeholder.com/80x112?text=No+Image';
        const winRateColor = getWinRateColor(winRate);
        
        return `
            <div class="leader-stat-item clickable" onclick="showLeaderDetail('${key}', 'opponent')">
                <img src="${leaderImage}" alt="${stat.leader.name}" class="leader-stat-image" title="${displayName}">
                <div class="leader-stat-content">
                    <div class="leader-name">vs ${displayName}</div>
                    <div class="leader-record">
                        <span class="record-detail"><strong>${stat.wins}W</strong> - <strong>${stat.losses}L</strong></span>
                        <span class="record-detail" style="color: ${winRateColor}; font-weight: 600;">(${winRate}% win rate)</span>
                        <span class="record-detail">${stat.total} matches</span>
                    </div>
                    <div class="progress-bar">
                        <div class="progress-fill" style="width: ${winRate}%; background: ${winRateColor};"></div>
                    </div>
                </div>
            </div>
        `;
    }).join('');
}

// Update match history
function updateMatchHistory() {
    const container = document.getElementById('matchHistory');
    
    if (matches.length === 0) {
        container.innerHTML = '<p class="empty-state">No matches recorded yet. Start tracking your battles!</p>';
        populateFilterDropdowns();
        return;
    }

    // Get filter values (checkboxes)
    const filterMyLeaders = Array.from(document.querySelectorAll('#filterMyLeader input[type="checkbox"]:checked'))
        .map(cb => cb.value);
    const filterFormats = Array.from(document.querySelectorAll('#filterFormat input[type="checkbox"]:checked'))
        .map(cb => cb.value);
    const filterColors = Array.from(document.querySelectorAll('#filterColor input[type="checkbox"]:checked'))
        .map(cb => cb.value);
    const filterResults = Array.from(document.querySelectorAll('#filterResult input[type="checkbox"]:checked'))
        .map(cb => cb.value);
    const filterTurnOrders = Array.from(document.querySelectorAll('#filterTurnOrder input[type="checkbox"]:checked'))
        .map(cb => cb.value);

    // Apply filters (OR logic within each category, AND logic between categories)
    const filteredMatches = matches.filter(match => {
        // Filter by my leader (OR logic - match any selected)
        if (filterMyLeaders.length > 0 && !filterMyLeaders.includes(getLeaderKey(match.myLeader))) {
            return false;
        }
        
        // Filter by format (OR logic - match any selected)
        if (filterFormats.length > 0 && !filterFormats.includes(match.gameFormat)) {
            return false;
        }
        
        // Filter by color (OR logic - check if any selected color is in my leader's colors only)
        if (filterColors.length > 0) {
            const myLeaderHasColor = filterColors.some(color => 
                match.myLeader.colors && match.myLeader.colors.includes(color)
            );
            if (!myLeaderHasColor) {
                return false;
            }
        }
        
        // Filter by result (OR logic - match any selected)
        if (filterResults.length > 0 && !filterResults.includes(match.result)) {
            return false;
        }
        
        // Filter by turn order (OR logic - match any selected)
        if (filterTurnOrders.length > 0 && !filterTurnOrders.includes(match.turnOrder)) {
            return false;
        }
        
        return true;
    });

    // Update filter dropdowns
    populateFilterDropdowns();

    // Display filtered matches
    if (filteredMatches.length === 0) {
        container.innerHTML = '<p class="empty-state">No matches found with the selected filters.</p>';
        return;
    }

    container.innerHTML = filteredMatches.map(match => {
        const date = new Date(match.date);
        const dateStr = date.toLocaleDateString() + ' ' + date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        
        const myLeaderDisplay = getLeaderDisplayName(match.myLeader);
        const oppLeaderDisplay = getLeaderDisplayName(match.opponentLeader);
        const turnOrderText = match.turnOrder === 'first' ? '🥇 1st' : '🥈 2nd';
        
        // Get images (use placeholder if not available for old matches)
        const myLeaderImage = match.myLeader.image || 'https://via.placeholder.com/60x84?text=No+Image';
        const oppLeaderImage = match.opponentLeader.image || 'https://via.placeholder.com/60x84?text=No+Image';
        
        return `
            <div class="match-item ${match.result}">
                <div class="match-leaders-container">
                    <div class="leader-images">
                        <img src="${myLeaderImage}" alt="${match.myLeader.name}" class="leader-card-img" title="${myLeaderDisplay}">
                        <span class="vs-text">VS</span>
                        <img src="${oppLeaderImage}" alt="${match.opponentLeader.name}" class="leader-card-img" title="${oppLeaderDisplay}">
                    </div>
                    <div class="match-info">
                        <div class="match-leaders">
                            ${myLeaderDisplay} vs ${oppLeaderDisplay}
                        </div>
                        <div class="match-date">
                            ${dateStr} ${match.turnOrder ? `• ${turnOrderText}` : ''}${match.gameFormat ? ` • ${match.gameFormat}` : ''}
                        </div>
                        ${match.notes ? `<div class="match-notes">📝 ${match.notes}</div>` : ''}
                    </div>
                </div>
                <div class="match-actions">
                    <div class="match-result ${match.result}">
                        ${match.result === 'win' ? 'WIN' : 'LOSS'}
                    </div>
                    <button class="match-edit-btn" onclick="editMatch(${match.id})" title="Edit match">✎</button>
                    <button class="match-delete-btn" onclick="confirmDeleteMatch(${match.id})" title="Delete match">×</button>
                </div>
            </div>
        `;
    }).join('');
}

// Edit match
function editMatch(id) {
    const match = matches.find(m => m.id === id);
    if (!match) return;
    
    // Store editing ID
    editingMatchId = id;
    
    // Find the leader indices in allLeaders array
    const myLeaderIndex = allLeaders.findIndex(l => 
        l.name === match.myLeader.name && 
        l.set === match.myLeader.set &&
        JSON.stringify(l.colors) === JSON.stringify(match.myLeader.colors)
    );
    
    const opponentLeaderIndex = allLeaders.findIndex(l => 
        l.name === match.opponentLeader.name && 
        l.set === match.opponentLeader.set &&
        JSON.stringify(l.colors) === JSON.stringify(match.opponentLeader.colors)
    );
    
    // Populate form with existing data
    if (myLeaderIndex !== -1) {
        document.getElementById('myLeaderName').value = myLeaderIndex;
        selectedMyLeader = allLeaders[myLeaderIndex];
    }
    
    if (opponentLeaderIndex !== -1) {
        document.getElementById('opponentLeaderName').value = opponentLeaderIndex;
        selectedOpponentLeader = allLeaders[opponentLeaderIndex];
    }
    
    // Set turn order
    if (match.turnOrder) {
        selectedTurnOrder = match.turnOrder;
        document.getElementById('turnOrder').value = match.turnOrder;
        document.querySelectorAll('.turn-btn').forEach(btn => {
            if (btn.dataset.turn === match.turnOrder) {
                btn.classList.add('active');
            }
        });
    }
    
    // Set result
    selectedResult = match.result;
    document.getElementById('result').value = match.result;
    document.querySelectorAll('.result-btn:not(.turn-btn)').forEach(btn => {
        if (btn.dataset.result === match.result) {
            btn.classList.add('active');
        }
    });
    
    // Set notes
    if (match.notes) {
        document.getElementById('matchNotes').value = match.notes;
        document.getElementById('charCount').textContent = match.notes.length;
    }
    
    // Set game format
    if (match.gameFormat) {
        document.getElementById('gameFormat').value = match.gameFormat;
    }
    
    // Update submit button
    updateSubmitButton();
    document.getElementById('submitBtn').textContent = 'Update Match';
    
    // Scroll to form
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

// Confirm and delete match
function confirmDeleteMatch(id) {
    const match = matches.find(m => m.id === id);
    if (!match) return;
    
    const myLeaderDisplay = getLeaderDisplayName(match.myLeader);
    const oppLeaderDisplay = getLeaderDisplayName(match.opponentLeader);
    const resultText = match.result === 'win' ? 'WIN' : 'LOSS';
    
    if (confirm(`Delete this match?\n\n${myLeaderDisplay} vs ${oppLeaderDisplay}\nResult: ${resultText}`)) {
        deleteMatch(id);
    }
}

// Show leader detail view
async function showLeaderDetail(leaderKey, type) {
    const leader = matches.find(m => {
        if (type === 'my') {
            return getLeaderKey(m.myLeader) === leaderKey;
        } else {
            return getLeaderKey(m.opponentLeader) === leaderKey;
        }
    });

    if (!leader) return;

    // Store current leader key for potential navigation after deletion
    window.currentDetailLeaderKey = leaderKey;
    window.currentDetailType = type;

    const leaderData = type === 'my' ? leader.myLeader : leader.opponentLeader;
    const displayName = getLeaderDisplayName(leaderData);

    // Filter matches for this leader
    let filteredMatches;
    if (type === 'my') {
        filteredMatches = matches.filter(m => getLeaderKey(m.myLeader) === leaderKey);
    } else {
        filteredMatches = matches.filter(m => getLeaderKey(m.opponentLeader) === leaderKey);
    }

    const wins = filteredMatches.filter(m => m.result === 'win').length;
    const losses = filteredMatches.filter(m => m.result === 'loss').length;
    const total = wins + losses;
    const winRate = total > 0 ? ((wins / total) * 100).toFixed(1) : 0;

    // Fetch alternate art BEFORE displaying the page
    let imageToDisplay = leaderData.image || 'https://via.placeholder.com/300x420?text=No+Image';
    
    try {
        // Use cached allCardsData if available, otherwise fetch
        let data = allCardsData;
        if (!data || data.length === 0) {
            const [setResponse, stResponse, promoResponse] = await Promise.all([
                fetch(API_URL),
                fetch(ST_API_URL),
                fetch(PROMO_API_URL)
            ]);
            const setData = await setResponse.json();
            const stData = await stResponse.json();
            const promoData = await promoResponse.json();
            data = [...setData, ...stData, ...promoData];
        }
        
        const alternateCard = data.find(card => 
            card.card_type === 'Leader' &&
            card.card_set_id === leaderData.cardId &&
            (card.card_name.toLowerCase().includes('parallel') || 
             card.card_name.toLowerCase().includes('alternate art') ||
             card.card_name.toLowerCase().includes('spr'))
        );
        
        if (alternateCard && alternateCard.card_image) {
            imageToDisplay = alternateCard.card_image;
        }
    } catch (err) {
        console.log('Could not fetch alternate art, using standard image:', err);
    }

    // Update detail view with the correct image
    document.getElementById('detailLeaderName').textContent = displayName;
    document.getElementById('detailLeaderImage').src = imageToDisplay;
    document.getElementById('detailLeaderImage').alt = displayName;
    document.getElementById('detailWins').textContent = wins;
    document.getElementById('detailLosses').textContent = losses;
    document.getElementById('detailWinRate').textContent = winRate + '%';

    // Calculate matchup breakdown
    const matchupBreakdown = {};
    filteredMatches.forEach(match => {
        const opposingLeader = type === 'my' ? match.opponentLeader : match.myLeader;
        const key = getLeaderKey(opposingLeader);
        
        if (!matchupBreakdown[key]) {
            matchupBreakdown[key] = {
                leader: opposingLeader,
                wins: 0,
                losses: 0,
                total: 0,
                firstWins: 0,
                firstTotal: 0,
                secondWins: 0,
                secondTotal: 0
            };
        }
        matchupBreakdown[key].total++;
        if (match.result === 'win') {
            matchupBreakdown[key].wins++;
        } else {
            matchupBreakdown[key].losses++;
        }
        
        // Track turn order stats
        if (match.turnOrder === 'first') {
            matchupBreakdown[key].firstTotal++;
            if (match.result === 'win') {
                matchupBreakdown[key].firstWins++;
            }
        } else if (match.turnOrder === 'second') {
            matchupBreakdown[key].secondTotal++;
            if (match.result === 'win') {
                matchupBreakdown[key].secondWins++;
            }
        }
    });

    const matchupArray = Object.values(matchupBreakdown).sort((a, b) => b.total - a.total);

    const matchupsContainer = document.getElementById('detailMatchups');
    if (matchupArray.length === 0) {
        matchupsContainer.innerHTML = '<p class="empty-state">No matchup data available.</p>';
    } else {
        matchupsContainer.innerHTML = matchupArray.map(stat => {
            const matchupWinRate = ((stat.wins / stat.total) * 100).toFixed(1);
            const opposingDisplayName = getLeaderDisplayName(stat.leader);
            const opposingImage = stat.leader.image || 'https://via.placeholder.com/80x112?text=No+Image';
            const opposingLeaderKey = getLeaderKey(stat.leader);
            
            // Calculate turn order win rates
            const firstWinRate = stat.firstTotal > 0 ? ((stat.firstWins / stat.firstTotal) * 100).toFixed(1) : 'N/A';
            const secondWinRate = stat.secondTotal > 0 ? ((stat.secondWins / stat.secondTotal) * 100).toFixed(1) : 'N/A';
            
            // Get colors for win rates
            const overallColor = getWinRateColor(matchupWinRate);
            const firstColor = getWinRateColor(firstWinRate);
            const secondColor = getWinRateColor(secondWinRate);
            
            return `
                <div class="leader-stat-item matchup-filter-item clickable" data-leader-key="${opposingLeaderKey}" onclick="filterMatchupHistory('${opposingLeaderKey}', '${type}')">
                    <img src="${opposingImage}" alt="${stat.leader.name}" class="leader-stat-image" title="${opposingDisplayName}">
                    <div class="leader-stat-content">
                        <div class="leader-name">${type === 'my' ? 'vs' : 'as'} ${opposingDisplayName}</div>
                        <div class="leader-record">
                            <span class="record-detail"><strong>${stat.wins}W</strong> - <strong>${stat.losses}L</strong></span>
                            <span class="record-detail" style="color: ${overallColor}; font-weight: 600;">(${matchupWinRate}% overall)</span>
                        </div>
                        <div class="turn-order-stats">
                            <span class="turn-stat" style="background-color: ${firstColor}20; color: ${firstColor}; font-weight: 600;">First: ${firstWinRate}${firstWinRate !== 'N/A' ? '%' : ''} (${stat.firstWins}W-${stat.firstTotal - stat.firstWins}L)</span>
                            <span class="turn-stat" style="background-color: ${secondColor}20; color: ${secondColor}; font-weight: 600;">Second: ${secondWinRate}${secondWinRate !== 'N/A' ? '%' : ''} (${stat.secondWins}W-${stat.secondTotal - stat.secondWins}L)</span>
                        </div>
                        <div class="leader-record">
                            <span class="record-detail">${stat.total} total matches</span>
                        </div>
                        <div class="progress-bar">
                            <div class="progress-fill" style="width: ${matchupWinRate}%; background: ${overallColor};"></div>
                        </div>
                    </div>
                </div>
            `;
        }).join('');
    }

    // Store unfiltered matches for filtering
    window.currentDetailMatches = filteredMatches;
    window.currentDetailLeaderType = type;
    
    // Render match history (initially unfiltered)
    renderDetailMatchHistory(filteredMatches, type);

    // Switch views
    document.getElementById('mainView').style.display = 'none';
    document.getElementById('detailView').style.display = 'block';
    window.scrollTo(0, 0);
}

// Render detail match history
function renderDetailMatchHistory(matchesToShow, type) {
    const historyContainer = document.getElementById('detailMatchHistory');
    
    // Apply filters if on detail view
    if (window.currentDetailMatches && matchesToShow === window.currentDetailMatches) {
        matchesToShow = applyDetailFilters(matchesToShow, type);
    }
    
    // Populate opponent leader filter
    populateDetailOpponentFilter(window.currentDetailMatches, type);
    
    if (matchesToShow.length === 0) {
        historyContainer.innerHTML = '<p class="empty-state">No matches found.</p>';
        return;
    }
    
    historyContainer.innerHTML = matchesToShow.map(match => {
        const date = new Date(match.date);
        const dateStr = date.toLocaleDateString() + ' ' + date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        
        const myLeaderDisplay = getLeaderDisplayName(match.myLeader);
        const oppLeaderDisplay = getLeaderDisplayName(match.opponentLeader);
        const turnOrderText = match.turnOrder === 'first' ? '🥇 1st' : '🥈 2nd';
        
        // Get images (use placeholder if not available for old matches)
        const myLeaderImage = match.myLeader.image || 'https://via.placeholder.com/60x84?text=No+Image';
        const oppLeaderImage = match.opponentLeader.image || 'https://via.placeholder.com/60x84?text=No+Image';
        
        return `
            <div class="match-item ${match.result}">
                <div class="match-leaders-container">
                    <div class="leader-images">
                        <img src="${myLeaderImage}" alt="${match.myLeader.name}" class="leader-card-img" title="${myLeaderDisplay}">
                        <span class="vs-text">VS</span>
                        <img src="${oppLeaderImage}" alt="${match.opponentLeader.name}" class="leader-card-img" title="${oppLeaderDisplay}">
                    </div>
                    <div class="match-info">
                        <div class="match-leaders">
                            ${myLeaderDisplay} vs ${oppLeaderDisplay}
                        </div>
                        <div class="match-date">
                            ${dateStr} ${match.turnOrder ? `• ${turnOrderText}` : ''}${match.gameFormat ? ` • ${match.gameFormat}` : ''}
                        </div>
                        ${match.notes ? `<div class="match-notes">📝 ${match.notes}</div>` : ''}
                    </div>
                </div>
                <div class="match-actions">
                    <div class="match-result ${match.result}">
                        ${match.result === 'win' ? 'WIN' : 'LOSS'}
                    </div>
                    <button class="match-edit-btn" onclick="editMatchFromDetail(${match.id})" title="Edit match">✎</button>
                    <button class="match-delete-btn" onclick="confirmDeleteMatchFromDetail(${match.id})" title="Delete match">×</button>
                </div>
            </div>
        `;
    }).join('');
}

// Filter match history by opposing leader
function filterMatchupHistory(opposingLeaderKey, type) {
    // Toggle selection
    const allMatchupItems = document.querySelectorAll('.matchup-filter-item');
    const clickedItem = document.querySelector(`.matchup-filter-item[data-leader-key="${opposingLeaderKey}"]`);
    
    // If already selected, deselect and show all matches
    if (clickedItem && clickedItem.classList.contains('selected')) {
        clickedItem.classList.remove('selected');
        renderDetailMatchHistory(window.currentDetailMatches, type);
        return;
    }
    
    // Deselect all other items
    allMatchupItems.forEach(item => item.classList.remove('selected'));
    
    // Select clicked item
    if (clickedItem) {
        clickedItem.classList.add('selected');
    }
    
    // Filter matches
    const filteredMatches = window.currentDetailMatches.filter(match => {
        const opposingLeader = type === 'my' ? match.opponentLeader : match.myLeader;
        return getLeaderKey(opposingLeader) === opposingLeaderKey;
    });
    
    renderDetailMatchHistory(filteredMatches, type);
}

// Show main view
function showMainView() {
    document.getElementById('mainView').style.display = 'block';
    document.getElementById('detailView').style.display = 'none';
    window.scrollTo(0, 0);
}

// Edit match from detail view
function editMatchFromDetail(id) {
    const match = matches.find(m => m.id === id);
    if (!match) return;
    
    // Store editing ID
    editingMatchId = id;
    
    // Populate edit form leader dropdowns if not already populated
    const editMyLeaderSelect = document.getElementById('editMyLeaderName');
    const editOpponentLeaderSelect = document.getElementById('editOpponentLeaderName');
    
    if (editMyLeaderSelect.options.length <= 1) {
        editMyLeaderSelect.innerHTML = '<option value="">Select leader...</option>';
        editOpponentLeaderSelect.innerHTML = '<option value="">Select leader...</option>';
        
        allLeaders.forEach((leader, index) => {
            const displayName = getLeaderDisplayName(leader);
            const option1 = new Option(displayName, index);
            const option2 = new Option(displayName, index);
            editMyLeaderSelect.add(option1);
            editOpponentLeaderSelect.add(option2);
        });
    }
    
    // Find leader indices
    const myLeaderIndex = allLeaders.findIndex(l => l.cardId === match.myLeader.cardId);
    const opponentLeaderIndex = allLeaders.findIndex(l => l.cardId === match.opponentLeader.cardId);
    
    // Set form values
    if (myLeaderIndex !== -1) {
        editMyLeaderSelect.value = myLeaderIndex;
        selectedMyLeader = allLeaders[myLeaderIndex];
    }
    
    if (opponentLeaderIndex !== -1) {
        editOpponentLeaderSelect.value = opponentLeaderIndex;
        selectedOpponentLeader = allLeaders[opponentLeaderIndex];
    }
    
    // Set turn order
    selectedTurnOrder = match.turnOrder;
    document.getElementById('editTurnOrder').value = match.turnOrder || '';
    document.querySelectorAll('.turn-btn-edit').forEach(btn => {
        if (btn.dataset.turn === match.turnOrder) {
            btn.classList.add('selected');
        } else {
            btn.classList.remove('selected');
        }
    });
    
    // Set result
    selectedResult = match.result;
    document.getElementById('editResult').value = match.result;
    document.querySelectorAll('.win-btn-edit').forEach(btn => {
        btn.classList.toggle('selected', match.result === 'win');
    });
    document.querySelectorAll('.loss-btn-edit').forEach(btn => {
        btn.classList.toggle('selected', match.result === 'loss');
    });
    
    // Set notes
    if (match.notes) {
        document.getElementById('editMatchNotes').value = match.notes;
        document.getElementById('editCharCount').textContent = match.notes.length;
    } else {
        document.getElementById('editMatchNotes').value = '';
        document.getElementById('editCharCount').textContent = '0';
    }
    
    // Set game format
    if (match.gameFormat) {
        document.getElementById('editGameFormat').value = match.gameFormat;
    } else {
        document.getElementById('editGameFormat').value = '';
    }
    
    // Show edit form, hide success message
    document.getElementById('editMatchFormContainer').style.display = 'block';
    document.getElementById('editSuccessMessage').style.display = 'none';
    
    // Scroll to form
    document.getElementById('editMatchFormContainer').scrollIntoView({ behavior: 'smooth' });
}

// Cancel edit
function cancelEdit() {
    editingMatchId = null;
    document.getElementById('editMatchFormContainer').style.display = 'none';
    document.getElementById('editMatchForm').reset();
    selectedMyLeader = null;
    selectedOpponentLeader = null;
    selectedResult = null;
    selectedTurnOrder = null;
    document.querySelectorAll('.turn-btn-edit, .win-btn-edit, .loss-btn-edit').forEach(btn => {
        btn.classList.remove('selected');
    });
}

// Handle edit form submission
function handleEditSubmit(e) {
    e.preventDefault();
    
    if (!editingMatchId) return;
    
    const notes = document.getElementById('editMatchNotes').value.trim();
    const gameFormat = document.getElementById('editGameFormat').value;
    
    // Update existing match
    const matchIndex = matches.findIndex(m => m.id === editingMatchId);
    if (matchIndex !== -1) {
        matches[matchIndex] = {
            ...matches[matchIndex],
            myLeader: {
                name: selectedMyLeader.name,
                colors: selectedMyLeader.colors,
                set: selectedMyLeader.set,
                cardId: selectedMyLeader.cardId,
                image: selectedMyLeader.image
            },
            opponentLeader: {
                name: selectedOpponentLeader.name,
                colors: selectedOpponentLeader.colors,
                set: selectedOpponentLeader.set,
                cardId: selectedOpponentLeader.cardId,
                image: selectedOpponentLeader.image
            },
            turnOrder: selectedTurnOrder,
            result: selectedResult,
            notes: notes,
            gameFormat: gameFormat
        };
    }
    
    saveMatches();
    
    // Store the updated match's leader info to refresh the detail view
    const updatedMatch = matches[matchIndex];
    const detailLeaderKey = window.currentDetailLeaderKey;
    const detailType = window.currentDetailType;
    
    // Hide form and show success message
    document.getElementById('editMatchFormContainer').style.display = 'none';
    document.getElementById('editSuccessMessage').style.display = 'block';
    
    // Clear form
    document.getElementById('editMatchForm').reset();
    const tempEditingMatchId = editingMatchId;
    editingMatchId = null;
    selectedMyLeader = null;
    selectedOpponentLeader = null;
    selectedResult = null;
    selectedTurnOrder = null;
    document.querySelectorAll('.turn-btn-edit, .win-btn-edit, .loss-btn-edit').forEach(btn => {
        btn.classList.remove('selected');
    });
    
    // Refresh the detail view if we're still on it
    if (detailLeaderKey && detailType) {
        showLeaderDetail(detailLeaderKey, detailType);
    } else {
        updateUI();
    }
    
    // Hide success message after 3 seconds
    setTimeout(() => {
        document.getElementById('editSuccessMessage').style.display = 'none';
    }, 3000);
    
    // Scroll to top
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

// Delete match from detail view
function confirmDeleteMatchFromDetail(id) {
    if (confirm('Are you sure you want to delete this match?')) {
        deleteMatch(id);
        // Refresh the current detail view if we're still on it
        updateUI();
    }
}

// Update leader statistics
function updateLeaderStats() {
    // This function is deprecated - now using updateMyLeadersStats and updateMatchupStats
    updateMyLeadersStats();
    updateMatchupStats();
}

// Clear all filters
function clearAllFilters() {
    // Clear all checkboxes
    document.querySelectorAll('#filterMyLeader input[type="checkbox"]').forEach(cb => cb.checked = false);
    document.querySelectorAll('#filterFormat input[type="checkbox"]').forEach(cb => cb.checked = false);
    document.querySelectorAll('#filterColor input[type="checkbox"]').forEach(cb => cb.checked = false);
    document.querySelectorAll('#filterResult input[type="checkbox"]').forEach(cb => cb.checked = false);
    document.querySelectorAll('#filterTurnOrder input[type="checkbox"]').forEach(cb => cb.checked = false);
    updateMatchHistory();
}

// Apply filters for detail view
function applyDetailFilters(matchesToShow, type) {
    // Get filter values
    const filterOpponentLeaders = Array.from(document.querySelectorAll('#detailFilterOpponentLeader input[type="checkbox"]:checked'))
        .map(cb => cb.value);
    const filterFormats = Array.from(document.querySelectorAll('#detailFilterFormat input[type="checkbox"]:checked'))
        .map(cb => cb.value);
    const filterColors = Array.from(document.querySelectorAll('#detailFilterColor input[type="checkbox"]:checked'))
        .map(cb => cb.value);
    const filterResults = Array.from(document.querySelectorAll('#detailFilterResult input[type="checkbox"]:checked'))
        .map(cb => cb.value);
    const filterTurnOrders = Array.from(document.querySelectorAll('#detailFilterTurnOrder input[type="checkbox"]:checked'))
        .map(cb => cb.value);

    // Apply filters
    return matchesToShow.filter(match => {
        // Filter by opponent leader
        if (filterOpponentLeaders.length > 0) {
            const opposingLeader = type === 'my' ? match.opponentLeader : match.myLeader;
            if (!filterOpponentLeaders.includes(getLeaderKey(opposingLeader))) {
                return false;
            }
        }
        
        // Filter by format
        if (filterFormats.length > 0 && !filterFormats.includes(match.gameFormat)) {
            return false;
        }
        
        // Filter by color (check opponent's leader colors)
        if (filterColors.length > 0) {
            const opposingLeader = type === 'my' ? match.opponentLeader : match.myLeader;
            const hasColor = filterColors.some(color => 
                opposingLeader.colors && opposingLeader.colors.includes(color)
            );
            if (!hasColor) {
                return false;
            }
        }
        
        // Filter by result
        if (filterResults.length > 0 && !filterResults.includes(match.result)) {
            return false;
        }
        
        // Filter by turn order
        if (filterTurnOrders.length > 0 && !filterTurnOrders.includes(match.turnOrder)) {
            return false;
        }
        
        return true;
    });
}

// Populate opponent leader filter for detail view
function populateDetailOpponentFilter(matchesToShow, type) {
    const filterOpponentLeader = document.getElementById('detailFilterOpponentLeader');
    
    if (!filterOpponentLeader) return;
    
    // Store current selections
    const currentSelections = Array.from(filterOpponentLeader.querySelectorAll('input[type="checkbox"]:checked'))
        .map(cb => cb.value);
    
    // Clear existing checkboxes
    filterOpponentLeader.innerHTML = '';
    
    // Get unique opponent leaders from matches
    const opponentLeadersUsed = new Set();
    matchesToShow.forEach(match => {
        const opposingLeader = type === 'my' ? match.opponentLeader : match.myLeader;
        opponentLeadersUsed.add(getLeaderKey(opposingLeader));
    });
    
    // Convert to array with leader data
    const opponentLeadersArray = Array.from(opponentLeadersUsed).map(key => {
        const match = matchesToShow.find(m => {
            const opposingLeader = type === 'my' ? m.opponentLeader : m.myLeader;
            return getLeaderKey(opposingLeader) === key;
        });
        return match ? (type === 'my' ? match.opponentLeader : match.myLeader) : null;
    }).filter(Boolean).sort((a, b) => a.name.localeCompare(b.name));
    
    opponentLeadersArray.forEach(leader => {
        const displayName = getLeaderDisplayName(leader);
        const key = getLeaderKey(leader);
        const isChecked = currentSelections.includes(key);
        
        const label = document.createElement('label');
        label.className = 'checkbox-label';
        label.innerHTML = `
            <input type="checkbox" value="${key}" ${isChecked ? 'checked' : ''}>
            ${displayName}
        `;
        
        // Add change listener
        label.querySelector('input').addEventListener('change', () => {
            renderDetailMatchHistory(window.currentDetailMatches, window.currentDetailLeaderType);
        });
        
        filterOpponentLeader.appendChild(label);
    });
}

// Update detail match history with filters
function updateDetailMatchHistory() {
    if (window.currentDetailMatches && window.currentDetailLeaderType) {
        renderDetailMatchHistory(window.currentDetailMatches, window.currentDetailLeaderType);
    }
}

// Clear detail filters
function clearDetailFilters() {
    document.querySelectorAll('#detailFilterOpponentLeader input[type="checkbox"]').forEach(cb => cb.checked = false);
    document.querySelectorAll('#detailFilterFormat input[type="checkbox"]').forEach(cb => cb.checked = false);
    document.querySelectorAll('#detailFilterColor input[type="checkbox"]').forEach(cb => cb.checked = false);
    document.querySelectorAll('#detailFilterResult input[type="checkbox"]').forEach(cb => cb.checked = false);
    document.querySelectorAll('#detailFilterTurnOrder input[type="checkbox"]').forEach(cb => cb.checked = false);
    updateDetailMatchHistory();
}

// Get color based on win rate (0-100%)
function getWinRateColor(winRate) {
    if (winRate === 'N/A' || isNaN(winRate)) {
        return '#8E8E93'; // Gray for N/A
    }
    
    const rate = parseFloat(winRate);
    
    if (rate >= 50) {
        // Transition from yellow (50%) to green (100%)
        // At 50%: rgb(255, 193, 7) - yellow/amber
        // At 100%: rgb(52, 199, 89) - green
        const progress = (rate - 50) / 50; // 0 to 1
        const r = Math.round(255 - (203 * progress)); // 255 -> 52
        const g = Math.round(193 + (6 * progress)); // 193 -> 199
        const b = Math.round(7 + (82 * progress)); // 7 -> 89
        return `rgb(${r}, ${g}, ${b})`;
    } else {
        // Transition from red (0%) to yellow (50%)
        // At 0%: rgb(255, 59, 48) - red
        // At 50%: rgb(255, 193, 7) - yellow/amber
        const progress = rate / 50; // 0 to 1
        const r = 255; // stays 255
        const g = Math.round(59 + (134 * progress)); // 59 -> 193
        const b = Math.round(48 - (41 * progress)); // 48 -> 7
        return `rgb(${r}, ${g}, ${b})`;
    }
}

// Confirm and clear all match history
function confirmClearAllHistory() {
    const matchCount = matches.length;
    
    if (matchCount === 0) {
        alert('No match history to clear.');
        return;
    }
    
    const confirmMessage = `⚠️ WARNING ⚠️\n\nAre you absolutely sure you want to delete ALL ${matchCount} match${matchCount > 1 ? 'es' : ''}?\n\nThis action CANNOT be undone!\n\nAll your:\n• Match records\n• Leader statistics\n• Win rates\n• Match notes\n\nwill be permanently deleted.`;
    
    if (confirm(confirmMessage)) {
        // Double confirmation
        if (confirm(`Last chance!\n\nClick OK to permanently delete all ${matchCount} matches.`)) {
            matches = [];
            saveMatches();
            updateUI();
            alert('✓ All match history has been cleared.');
        }
    }
}

// Load background cards from localStorage
function loadBackgroundCards() {
    const stored = localStorage.getItem('opTcgBackgroundCards');
    if (stored) {
        backgroundCards = JSON.parse(stored);
    }
}

// Save background cards to localStorage
function saveBackgroundCards() {
    localStorage.setItem('opTcgBackgroundCards', JSON.stringify(backgroundCards));
}

// Start background carousel
async function startBackgroundCarousel() {
    const carousel = document.getElementById('backgroundCarousel');
    
    // If no background cards selected, use all leader cards
    let cardsToUse = backgroundCards;
    if (backgroundCards.length === 0) {
        // Fetch all leader cards
        try {
            const [setResponse, stResponse, promoResponse] = await Promise.all([
                fetch(API_URL),
                fetch(ST_API_URL),
                fetch(PROMO_API_URL)
            ]);
            
            const setData = await setResponse.json();
            const stData = await stResponse.json();
            const promoData = await promoResponse.json();
            
            const allCards = [...setData, ...stData, ...promoData];
            const leaderCards = allCards.filter(card => card.card_type === 'Leader');
            
            // Get all leader card images
            cardsToUse = leaderCards.map(card => card.card_image);
            
            // Shuffle the array for random order
            cardsToUse = cardsToUse.sort(() => Math.random() - 0.5);
            
            console.log(`Using ${cardsToUse.length} random leader cards as background`);
        } catch (error) {
            console.error('Error loading leader cards for background:', error);
            return;
        }
    }
    
    if (cardsToUse.length === 0) return;
    
    let currentIndex = 0;
    
    // Set initial background
    carousel.style.backgroundImage = `url('${cardsToUse[0]}')`;
    
    if (cardsToUse.length === 1) return; // No need to cycle with only one image
    
    // Clear any existing interval
    if (backgroundCarouselInterval) {
        clearInterval(backgroundCarouselInterval);
    }
    
    // Cycle through backgrounds every 10 seconds
    backgroundCarouselInterval = setInterval(() => {
        currentIndex = (currentIndex + 1) % cardsToUse.length;
        
        // Fade out
        carousel.style.opacity = '0';
        
        // Change image after fade out
        setTimeout(() => {
            carousel.style.backgroundImage = `url('${cardsToUse[currentIndex]}')`;
            carousel.style.opacity = '1';
        }, 750); // Half of transition time
        
    }, 10000); // Change every 10 seconds
}

// Open background settings modal
async function openBackgroundSettings() {
    const modal = document.getElementById('backgroundSettingsModal');
    modal.style.display = 'block';
    
    // Populate with current selections
    updateSelectedCardsDisplay();
    
    // Fetch and display all available cards
    await loadAvailableCards();
}

// Close background settings modal
function closeBackgroundSettings() {
    const modal = document.getElementById('backgroundSettingsModal');
    modal.style.display = 'none';
}

// Load available leader cards
async function loadAvailableCards() {
    const container = document.getElementById('availableCardsGrid');
    container.innerHTML = '<p class="empty-state">Loading cards...</p>';
    
    try {
        // Fetch all cards (including parallels and alternate arts)
        const [setResponse, stResponse, promoResponse] = await Promise.all([
            fetch(API_URL),
            fetch(ST_API_URL),
            fetch(PROMO_API_URL)
        ]);
        
        const setData = await setResponse.json();
        const stData = await stResponse.json();
        const promoData = await promoResponse.json();
        
        const allCards = [...setData, ...stData, ...promoData];
        
        // Filter for Leader cards only
        const leaderCards = allCards.filter(card => card.card_type === 'Leader');
        
        // Sort by name
        leaderCards.sort((a, b) => a.card_name.localeCompare(b.card_name));
        
        // Store for filtering
        window.allLeaderCards = leaderCards;
        
        displayAvailableCards(leaderCards);
        
        // Setup search
        document.getElementById('cardSearch').addEventListener('input', function(e) {
            const searchTerm = e.target.value.toLowerCase();
            const filtered = leaderCards.filter(card => 
                card.card_name.toLowerCase().includes(searchTerm) ||
                card.card_set_id.toLowerCase().includes(searchTerm)
            );
            displayAvailableCards(filtered);
        });
        
    } catch (error) {
        console.error('Error loading cards:', error);
        container.innerHTML = '<p class="empty-state">Error loading cards. Please try again.</p>';
    }
}

// Display available cards in grid
function displayAvailableCards(cards) {
    const container = document.getElementById('availableCardsGrid');
    
    if (cards.length === 0) {
        container.innerHTML = '<p class="empty-state">No cards found.</p>';
        return;
    }
    
    container.innerHTML = cards.map(card => `
        <div class="card-item ${backgroundCards.includes(card.card_image) ? 'selected' : ''}" 
             onclick="toggleCardSelection('${card.card_image}')"
             title="${card.card_name} [${card.card_set_id}]">
            <img src="${card.card_image}" alt="${card.card_name}">
        </div>
    `).join('');
}

// Toggle card selection
function toggleCardSelection(imageUrl) {
    const index = backgroundCards.indexOf(imageUrl);
    
    if (index > -1) {
        // Remove card
        backgroundCards.splice(index, 1);
    } else {
        // Add card (max 10)
        if (backgroundCards.length >= 10) {
            alert('You can only select up to 10 cards.');
            return;
        }
        backgroundCards.push(imageUrl);
    }
    
    updateSelectedCardsDisplay();
    
    // Update available cards display to show selection state
    if (window.allLeaderCards) {
        displayAvailableCards(window.allLeaderCards);
    }
}

// Update selected cards display
function updateSelectedCardsDisplay() {
    const container = document.getElementById('selectedCardsGrid');
    const countSpan = document.getElementById('selectedCount');
    
    countSpan.textContent = backgroundCards.length;
    
    if (backgroundCards.length === 0) {
        container.innerHTML = '<p class="empty-state">No cards selected yet</p>';
        return;
    }
    
    container.innerHTML = backgroundCards.map(imageUrl => `
        <div class="card-item">
            <img src="${imageUrl}" alt="Selected card">
            <button class="card-item-remove" onclick="removeBackgroundCard('${imageUrl}')" title="Remove">×</button>
        </div>
    `).join('');
}

// Remove card from selection
function removeBackgroundCard(imageUrl) {
    const index = backgroundCards.indexOf(imageUrl);
    if (index > -1) {
        backgroundCards.splice(index, 1);
        updateSelectedCardsDisplay();
        
        // Update available cards display to show selection state
        if (window.allLeaderCards) {
            displayAvailableCards(window.allLeaderCards);
        }
    }
}

// Save background settings
function saveBackgroundSettings() {
    saveBackgroundCards();
    startBackgroundCarousel();
    closeBackgroundSettings();
    alert('✓ Background settings saved! Your selected cards will now cycle in the background.');
}

// Load user name from localStorage
function loadUserName() {
    const stored = localStorage.getItem('opTcgUserName');
    if (stored) {
        userName = stored;
    }
}

// Save user name to localStorage
function saveUserName() {
    const input = document.getElementById('userName');
    userName = input.value.trim();
    localStorage.setItem('opTcgUserName', userName);
    updateTitle();
    closeNameEditor();
}

// Update title with user name
function updateTitle() {
    const titleElement = document.getElementById('appTitle');
    const logo = '<img src="icons/Straw-Hat-Logo.png" alt="Straw Hat" class="title-logo">';
    if (userName) {
        titleElement.innerHTML = `${logo} ${userName}'s One Piece TCG Tracker`;
    } else {
        titleElement.innerHTML = `${logo} One Piece TCG Tracker`;
    }
}

// Open name editor modal
function openNameEditor() {
    const modal = document.getElementById('nameEditorModal');
    const input = document.getElementById('userName');
    
    // Set current name in input
    input.value = userName;
    
    // Show modal
    modal.style.display = 'block';
    
    // Focus input
    setTimeout(() => input.focus(), 100);
    
    // Setup live preview
    input.addEventListener('input', updateNamePreview);
    updateNamePreview();
}

// Close name editor modal
function closeNameEditor() {
    const modal = document.getElementById('nameEditorModal');
    modal.style.display = 'none';
    
    const input = document.getElementById('userName');
    input.removeEventListener('input', updateNamePreview);
}

// Update name preview
function updateNamePreview() {
    const input = document.getElementById('userName');
    const preview = document.getElementById('titlePreview');
    const name = input.value.trim();
    
    if (name) {
        preview.textContent = `${name}'s One Piece TCG Tracker`;
    } else {
        preview.textContent = 'One Piece TCG Tracker';
    }
}

// ==================== TOURNAMENT FUNCTIONS ====================

// Load tournaments from localStorage
function loadTournaments() {
    const stored = localStorage.getItem('opTcgTournaments');
    if (stored) {
        tournaments = JSON.parse(stored);
    }
}

// Save tournaments to localStorage
function saveTournaments() {
    localStorage.setItem('opTcgTournaments', JSON.stringify(tournaments));
}

// Open create tournament modal
function openCreateTournament() {
    const modal = document.getElementById('createTournamentModal');
    document.getElementById('createTournamentForm').reset();
    // Set today's date as default
    document.getElementById('tournamentDate').valueAsDate = new Date();
    modal.style.display = 'block';
}

// Close create tournament modal
function closeCreateTournament() {
    const modal = document.getElementById('createTournamentModal');
    modal.style.display = 'none';
}

// Save tournament and start recording matches
function saveTournament() {
    console.log('saveTournament called');
    const type = document.getElementById('tournamentType').value;
    const date = document.getElementById('tournamentDate').value;
    const rounds = parseInt(document.getElementById('tournamentRounds').value);
    const format = document.getElementById('tournamentFormat').value;
    const location = document.getElementById('tournamentLocation').value.trim();
    
    console.log('Form values:', { type, date, rounds, format, location });
    
    if (!type || !date || !rounds || isNaN(rounds)) {
        alert('Please fill in required fields (Tournament Type, Date, and Rounds)');
        return;
    }
    
    const tournament = {
        id: Date.now(),
        type,
        date,
        rounds,
        format,
        location,
        matches: [], // Store match data directly in tournament
        completed: false,
        createdAt: new Date().toISOString()
    };
    
    console.log('Tournament created:', tournament);
    
    tournaments.push(tournament);
    saveTournaments();
    updateTournamentsList();
    closeCreateTournament();
    
    // Open match recording interface
    currentTournamentId = tournament.id;
    console.log('Opening match recording for tournament:', currentTournamentId);
    openTournamentMatchRecording();
}

// Open tournament match recording modal
function openTournamentMatchRecording() {
    const tournament = tournaments.find(t => t.id === currentTournamentId);
    if (!tournament) return;
    
    const modal = document.getElementById('recordTournamentMatchModal');
    const title = document.getElementById('tournamentMatchTitle');
    
    // Populate leader selects
    const myLeaderSelect = document.getElementById('tournamentMyLeader');
    const opponentLeaderSelect = document.getElementById('tournamentOpponentLeader');
    
    myLeaderSelect.innerHTML = '<option value="">Select your leader...</option>';
    opponentLeaderSelect.innerHTML = '<option value="">Select opponent\'s leader...</option>';
    
    allLeaders.forEach((leader, index) => {
        const displayName = getLeaderDisplayName(leader);
        myLeaderSelect.innerHTML += `<option value="${index}">${displayName}</option>`;
        opponentLeaderSelect.innerHTML += `<option value="${index}">${displayName}</option>`;
    });
    
    // Update title and progress
    const currentRound = tournament.matches.length + 1;
    title.textContent = `🏆 ${tournament.type} - Round ${currentRound}`;
    
    updateTournamentProgress();
    
    // Reset form
    document.getElementById('tournamentMatchForm').reset();
    tournamentSelectedMyLeader = null;
    tournamentSelectedOpponentLeader = null;
    tournamentSelectedResult = null;
    tournamentSelectedTurnOrder = null;
    
    // Auto-fill user's leader from previous match (if exists)
    if (tournament.matches.length > 0) {
        const lastMatch = tournament.matches[tournament.matches.length - 1];
        const lastLeaderIndex = allLeaders.findIndex(leader => 
            getLeaderKey(leader) === getLeaderKey(lastMatch.myLeader)
        );
        
        if (lastLeaderIndex !== -1) {
            myLeaderSelect.value = lastLeaderIndex;
            tournamentSelectedMyLeader = allLeaders[lastLeaderIndex];
            console.log('Auto-filled leader from previous match:', getLeaderDisplayName(tournamentSelectedMyLeader));
        }
    }
    
    // Clear button selections
    document.querySelectorAll('#recordTournamentMatchModal .choice-btn').forEach(btn => btn.classList.remove('selected'));
    document.querySelectorAll('#recordTournamentMatchModal .result-btn').forEach(btn => btn.classList.remove('selected'));
    
    modal.style.display = 'block';
}

// Update tournament progress display
function updateTournamentProgress() {
    const tournament = tournaments.find(t => t.id === currentTournamentId);
    if (!tournament) return;
    
    const progress = document.getElementById('tournamentProgress');
    const currentRound = tournament.matches.length + 1;
    const wins = tournament.matches.filter(m => m.result === 'win').length;
    const losses = tournament.matches.filter(m => m.result === 'loss').length;
    
    progress.innerHTML = `
        <h3>${tournament.type} - ${new Date(tournament.date).toLocaleDateString()}</h3>
        <div class="progress-info">Round ${currentRound} of ${tournament.rounds}</div>
        <div class="progress-record">Current Record: ${wins}W - ${losses}L</div>
    `;
}

// Close tournament match modal
function closeTournamentMatchModal() {
    const tournament = tournaments.find(t => t.id === currentTournamentId);
    if (tournament && tournament.matches.length < tournament.rounds) {
        if (!confirm(`You have only completed ${tournament.matches.length} of ${tournament.rounds} rounds. Are you sure you want to close? You can continue later.`)) {
            return;
        }
    }
    
    const modal = document.getElementById('recordTournamentMatchModal');
    modal.style.display = 'none';
    currentTournamentId = null;
}

// Select tournament my leader
function selectTournamentMyLeader() {
    const select = document.getElementById('tournamentMyLeader');
    const index = parseInt(select.value);
    if (!isNaN(index)) {
        tournamentSelectedMyLeader = allLeaders[index];
    }
}

// Select tournament opponent leader
function selectTournamentOpponentLeader() {
    const select = document.getElementById('tournamentOpponentLeader');
    const index = parseInt(select.value);
    if (!isNaN(index)) {
        tournamentSelectedOpponentLeader = allLeaders[index];
    }
}

// Select tournament turn order
function selectTournamentTurnOrder(order) {
    tournamentSelectedTurnOrder = order;
    document.querySelectorAll('#recordTournamentMatchModal .choice-btn').forEach(btn => {
        btn.classList.remove('selected');
    });
    event.target.classList.add('selected');
}

// Select tournament result
function selectTournamentResult(result) {
    tournamentSelectedResult = result;
    document.querySelectorAll('#recordTournamentMatchModal .result-btn').forEach(btn => {
        btn.classList.remove('selected');
    });
    event.target.classList.add('selected');
}

// Save tournament match
function saveTournamentMatch() {
    const tournament = tournaments.find(t => t.id === currentTournamentId);
    if (!tournament) return;
    
    const notes = document.getElementById('tournamentMatchNotes').value.trim();
    
    if (!tournamentSelectedMyLeader || !tournamentSelectedOpponentLeader || !tournamentSelectedResult) {
        alert('Please select your leader, opponent\'s leader, and match result');
        return;
    }
    
    const match = {
        id: Date.now(),
        myLeader: tournamentSelectedMyLeader,
        opponentLeader: tournamentSelectedOpponentLeader,
        result: tournamentSelectedResult,
        turnOrder: tournamentSelectedTurnOrder,
        format: tournament.format,
        notes,
        date: new Date().toISOString(),
        tournamentId: tournament.id
    };
    
    // Add to tournament
    tournament.matches.push(match);
    
    // Also add to global matches array
    matches.push(match);
    saveMatches();
    
    // Check if tournament is complete
    if (tournament.matches.length >= tournament.rounds) {
        tournament.completed = true;
        saveTournaments();
        updateTournamentsList();
        updateUI();
        closeTournamentMatchModal();
        alert(`🏆 Tournament Complete!\n\nFinal Record: ${tournament.matches.filter(m => m.result === 'win').length}W - ${tournament.matches.filter(m => m.result === 'loss').length}L`);
        return;
    }
    
    // Save and continue to next round
    saveTournaments();
    updateTournamentsList();
    updateUI();
    
    // Reset form for next match
    document.getElementById('tournamentMatchForm').reset();
    tournamentSelectedMyLeader = null;
    tournamentSelectedOpponentLeader = null;
    tournamentSelectedResult = null;
    tournamentSelectedTurnOrder = null;
    document.querySelectorAll('#recordTournamentMatchModal .choice-btn').forEach(btn => btn.classList.remove('selected'));
    document.querySelectorAll('#recordTournamentMatchModal .result-btn').forEach(btn => btn.classList.remove('selected'));
    
    // Update progress
    updateTournamentProgress();
    const currentRound = tournament.matches.length + 1;
    document.getElementById('tournamentMatchTitle').textContent = `🏆 ${tournament.type} - Round ${currentRound}`;
}

// Update tournaments list
function updateTournamentsList() {
    const container = document.getElementById('tournamentsList');
    const clearAllBtn = document.querySelector('#tournamentsSection .clear-all-btn');
    
    if (tournaments.length === 0) {
        container.innerHTML = '<p class="empty-state">No tournaments recorded yet. Create one to start tracking!</p>';
        if (clearAllBtn) clearAllBtn.style.display = 'none';
        return;
    }
    
    // Show clear all button when there are tournaments
    if (clearAllBtn) clearAllBtn.style.display = 'block';
    
    // Sort by date (newest first)
    const sortedTournaments = [...tournaments].sort((a, b) => new Date(b.date) - new Date(a.date));
    
    container.innerHTML = sortedTournaments.map(tournament => {
        // Handle both old format (matchIds) and new format (matches array)
        const tournamentMatches = tournament.matches || [];
        const wins = tournamentMatches.filter(m => m.result === 'win').length;
        const losses = tournamentMatches.filter(m => m.result === 'loss').length;
        const total = tournamentMatches.length;
        const winRate = total > 0 ? ((wins / total) * 100).toFixed(1) : '0.0';
        const winRateColor = total > 0 ? getWinRateColor(winRate) : '#8E8E93';
        
        const dateObj = new Date(tournament.date);
        const dateStr = dateObj.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
        
        const tournamentName = tournament.type || tournament.name || 'Tournament';
        const totalRounds = tournament.rounds || total;
        const status = tournament.completed ? '✅ Completed' : `⏳ In Progress (${total}/${totalRounds})`;
        
        return `
            <div class="tournament-item" onclick="openTournamentDetail(${tournament.id})">
                <div class="tournament-header">
                    <div>
                        <div class="tournament-name">${tournamentName}</div>
                        <div class="tournament-date">📅 ${dateStr}${tournament.location ? ` • 📍 ${tournament.location}` : ''}${tournament.format ? ` • ${tournament.format}` : ''}</div>
                    </div>
                    <div class="tournament-placement" style="${tournament.completed ? '' : 'background: linear-gradient(135deg, #FFA500 0%, #FF8C00 100%);'}">${status}</div>
                </div>
                <div class="tournament-stats">
                    <div class="tournament-stat">
                        <span class="tournament-stat-label">Record</span>
                        <span class="tournament-stat-value">${wins}-${losses}</span>
                    </div>
                    <div class="tournament-stat">
                        <span class="tournament-stat-label">Win Rate</span>
                        <span class="tournament-stat-value" style="color: ${winRateColor}">${winRate}%</span>
                    </div>
                    <div class="tournament-stat">
                        <span class="tournament-stat-label">Rounds</span>
                        <span class="tournament-stat-value">${total}/${totalRounds}</span>
                    </div>
                </div>
                ${!tournament.completed && tournament.rounds ? `
                    <button class="add-tournament-btn" onclick="event.stopPropagation(); continueTournament(${tournament.id})" style="margin-top: 15px; padding: 10px;">➕ Continue Tournament</button>
                ` : ''}
            </div>
        `;
    }).join('');
}

// Continue tournament
function continueTournament(tournamentId) {
    currentTournamentId = tournamentId;
    openTournamentMatchRecording();
}

// Open tournament detail modal
function openTournamentDetail(tournamentId) {
    const tournament = tournaments.find(t => t.id === tournamentId);
    if (!tournament) return;
    
    currentTournamentId = tournamentId;
    const modal = document.getElementById('tournamentDetailModal');
    const title = document.getElementById('tournamentDetailTitle');
    const content = document.getElementById('tournamentDetailContent');
    
    const tournamentName = tournament.type || tournament.name || 'Tournament';
    title.textContent = `🏆 ${tournamentName}`;
    
    const tournamentMatches = tournament.matches || [];
    const wins = tournamentMatches.filter(m => m.result === 'win').length;
    const losses = tournamentMatches.filter(m => m.result === 'loss').length;
    const total = tournamentMatches.length;
    const winRate = total > 0 ? ((wins / total) * 100).toFixed(1) : '0.0';
    const winRateColor = total > 0 ? getWinRateColor(winRate) : '#8E8E93';
    
    // Calculate turn order stats
    const firstMatches = tournamentMatches.filter(m => m.turnOrder === 'first');
    const firstWins = firstMatches.filter(m => m.result === 'win').length;
    const firstWinRate = firstMatches.length > 0 ? ((firstWins / firstMatches.length) * 100).toFixed(1) : 'N/A';
    const firstColor = getWinRateColor(firstWinRate);
    
    const secondMatches = tournamentMatches.filter(m => m.turnOrder === 'second');
    const secondWins = secondMatches.filter(m => m.result === 'win').length;
    const secondWinRate = secondMatches.length > 0 ? ((secondWins / secondMatches.length) * 100).toFixed(1) : 'N/A';
    const secondColor = getWinRateColor(secondWinRate);
    
    // Get matchup breakdown
    const matchupBreakdown = {};
    tournamentMatches.forEach(match => {
        const key = getLeaderKey(match.opponentLeader);
        if (!matchupBreakdown[key]) {
            matchupBreakdown[key] = {
                leader: match.opponentLeader,
                wins: 0,
                losses: 0,
                total: 0
            };
        }
        matchupBreakdown[key].total++;
        if (match.result === 'win') {
            matchupBreakdown[key].wins++;
        } else {
            matchupBreakdown[key].losses++;
        }
    });
    
    const matchupArray = Object.values(matchupBreakdown).sort((a, b) => b.total - a.total);
    
    const dateStr = new Date(tournament.date).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
    
    content.innerHTML = `
        <div class="tournament-info-grid">
            <div class="tournament-info-item">
                <div class="tournament-info-label">Date</div>
                <div class="tournament-info-value">${dateStr}</div>
            </div>
            ${tournament.format ? `
                <div class="tournament-info-item">
                    <div class="tournament-info-label">Format</div>
                    <div class="tournament-info-value">${tournament.format}</div>
                </div>
            ` : ''}
            ${tournament.location ? `
                <div class="tournament-info-item">
                    <div class="tournament-info-label">Location</div>
                    <div class="tournament-info-value">${tournament.location}</div>
                </div>
            ` : ''}
            <div class="tournament-info-item">
                <div class="tournament-info-label">Status</div>
                <div class="tournament-info-value">${tournament.completed ? '✅ Completed' : '⏳ In Progress'}</div>
            </div>
        </div>
        
        <div class="tournament-stats" style="margin-bottom: 30px;">
            <div class="tournament-stat">
                <span class="tournament-stat-label">Record</span>
                <span class="tournament-stat-value">${wins}W - ${losses}L</span>
            </div>
            <div class="tournament-stat">
                <span class="tournament-stat-label">Win Rate</span>
                <span class="tournament-stat-value" style="color: ${winRateColor}">${winRate}%</span>
            </div>
            <div class="tournament-stat">
                <span class="tournament-stat-label">${tournament.rounds ? 'Rounds' : 'Matches'}</span>
                <span class="tournament-stat-value">${tournament.rounds ? `${total}/${tournament.rounds}` : total}</span>
            </div>
        </div>
        
        ${!tournament.completed && tournament.rounds ? `
            <button class="add-tournament-btn" onclick="continueTournament(${tournament.id}); closeTournamentDetail();" style="margin-bottom: 20px;">➕ Continue Tournament</button>
        ` : ''}
        
        ${total > 0 ? `
            <div style="margin-bottom: 30px;">
                <h3 style="margin-bottom: 15px;">Turn Order Performance</h3>
                <div class="turn-order-stats">
                    <span class="turn-stat" style="background-color: ${firstColor}20; color: ${firstColor}; font-weight: 600;">
                        First: ${firstWinRate}${firstWinRate !== 'N/A' ? '%' : ''} (${firstWins}W-${firstMatches.length - firstWins}L)
                    </span>
                    <span class="turn-stat" style="background-color: ${secondColor}20; color: ${secondColor}; font-weight: 600;">
                        Second: ${secondWinRate}${secondWinRate !== 'N/A' ? '%' : ''} (${secondWins}W-${secondMatches.length - secondWins}L)
                    </span>
                </div>
            </div>
        ` : ''}
        
        ${matchupArray.length > 0 ? `
            <div style="margin-bottom: 30px;">
                <h3 style="margin-bottom: 15px;">Matchup Breakdown</h3>
                <div class="leader-stats">
                    ${matchupArray.map(stat => {
                        const matchupWinRate = ((stat.wins / stat.total) * 100).toFixed(1);
                        const opposingDisplayName = getLeaderDisplayName(stat.leader);
                        const opposingImage = stat.leader.image || 'https://via.placeholder.com/80x112?text=No+Image';
                        const matchupColor = getWinRateColor(matchupWinRate);
                        
                        return `
                            <div class="leader-stat-item">
                                <img src="${opposingImage}" alt="${stat.leader.name}" class="leader-stat-image" title="${opposingDisplayName}">
                                <div class="leader-stat-content">
                                    <div class="leader-name">vs ${opposingDisplayName}</div>
                                    <div class="leader-record">
                                        <span class="record-detail"><strong>${stat.wins}W</strong> - <strong>${stat.losses}L</strong></span>
                                        <span class="record-detail" style="color: ${matchupColor}; font-weight: 600;">(${matchupWinRate}%)</span>
                                    </div>
                                    <div class="progress-bar">
                                        <div class="progress-fill" style="width: ${matchupWinRate}%; background: ${matchupColor};"></div>
                                    </div>
                                </div>
                            </div>
                        `;
                    }).join('')}
                </div>
            </div>
        ` : ''}
        
        <div>
            <h3 style="margin-bottom: 15px;">Matches (${total})</h3>
            ${total > 0 ? `
                <div class="match-history">
                    ${tournamentMatches.map((match, index) => {
                        const date = new Date(match.date);
                        const dateStr = date.toLocaleDateString() + ' ' + date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
                        const myLeaderDisplay = getLeaderDisplayName(match.myLeader);
                        const oppLeaderDisplay = getLeaderDisplayName(match.opponentLeader);
                        const turnOrderText = match.turnOrder === 'first' ? '🥇 1st' : match.turnOrder === 'second' ? '🥈 2nd' : '';
                        const myLeaderImage = match.myLeader.image || 'https://via.placeholder.com/60x84?text=No+Image';
                        const oppLeaderImage = match.opponentLeader.image || 'https://via.placeholder.com/60x84?text=No+Image';
                        
                        return `
                            <div class="match-item ${match.result}">
                                <div class="match-leaders-container">
                                    <div class="leader-images">
                                        <img src="${myLeaderImage}" alt="${match.myLeader.name}" class="leader-card-img" title="${myLeaderDisplay}">
                                        <span class="vs-text">VS</span>
                                        <img src="${oppLeaderImage}" alt="${match.opponentLeader.name}" class="leader-card-img" title="${oppLeaderDisplay}">
                                    </div>
                                    <div class="match-info">
                                        <div class="match-leaders">
                                            Round ${index + 1}: ${myLeaderDisplay} vs ${oppLeaderDisplay}
                                        </div>
                                        <div class="match-date">
                                            ${dateStr} ${turnOrderText ? `• ${turnOrderText}` : ''}
                                        </div>
                                        ${match.notes ? `<div class="match-notes">📝 ${match.notes}</div>` : ''}
                                    </div>
                                </div>
                                <div class="match-actions">
                                    <div class="match-result ${match.result}">
                                        ${match.result === 'win' ? 'WIN' : 'LOSS'}
                                    </div>
                                </div>
                            </div>
                        `;
                    }).join('')}
                </div>
            ` : '<p class="empty-state">No matches recorded yet.</p>'}
        </div>
    `;
    
    modal.style.display = 'block';
}

// Close tournament detail modal
function closeTournamentDetail() {
    const modal = document.getElementById('tournamentDetailModal');
    modal.style.display = 'none';
    currentTournamentId = null;
}

// Delete tournament
function deleteTournament() {
    const tournament = tournaments.find(t => t.id === currentTournamentId);
    if (!tournament) return;
    
    if (!confirm('Are you sure you want to delete this tournament? The matches will remain in your match history.')) return;
    
    tournaments = tournaments.filter(t => t.id !== currentTournamentId);
    saveTournaments();
    updateTournamentsList();
    closeTournamentDetail();
}

// Clear all tournaments
function clearAllTournaments() {
    if (tournaments.length === 0) return;
    
    const confirmMessage = `Are you sure you want to delete ALL ${tournaments.length} tournament${tournaments.length > 1 ? 's' : ''}?\n\nThis action cannot be undone.\nAll tournament matches will remain in your match history.`;
    
    if (!confirm(confirmMessage)) return;
    
    // Double confirmation for safety
    if (!confirm('This will permanently delete all tournaments. Are you absolutely sure?')) return;
    
    tournaments = [];
    saveTournaments();
    updateTournamentsList();
    updateUI(); // Update main UI in case tournament matches affected stats
}

// Initialize app when DOM is ready
document.addEventListener('DOMContentLoaded', init);

// Register Service Worker for PWA
if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('/service-worker.js')
            .then(registration => {
                console.log('ServiceWorker registered: ', registration);
            })
            .catch(error => {
                console.log('ServiceWorker registration failed: ', error);
            });
    });
}
