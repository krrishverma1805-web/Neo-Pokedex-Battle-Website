// Simple sci-fi Pokedex + battle system using PokeAPI and axios

const API_BASE = "https://pokeapi.co/api/v2/pokemon";

let pokemonList = [];
let filteredList = [];
let selected = {
  left: null,
  right: null,
};

// DOM refs
const pokemonGrid = document.getElementById("pokemonGrid");
const typeFilterSelect = document.getElementById("typeFilter");
const searchInput = document.getElementById("searchInput");
const limitSelect = document.getElementById("limitSelect");
const loader = document.getElementById("loader");
const pokemonCountEl = document.getElementById("pokemonCount");

const leftSprite = document.getElementById("leftSprite");
const rightSprite = document.getElementById("rightSprite");
const leftNameEl = document.getElementById("leftName");
const rightNameEl = document.getElementById("rightName");
const leftTypesEl = document.getElementById("leftTypes");
const rightTypesEl = document.getElementById("rightTypes");
const leftStatsEl = document.getElementById("leftStats");
const rightStatsEl = document.getElementById("rightStats");

const startBattleBtn = document.getElementById("startBattleBtn");
const clearSelectionBtn = document.getElementById("clearSelectionBtn");
const battleResultEl = document.getElementById("battleResult");
const battleLogEl = document.getElementById("battleLog");

// Initialize
document.addEventListener("DOMContentLoaded", () => {
  const limit = Number(limitSelect.value);
  fetchPokemonBatch(limit);
  setupEventListeners();
});

function setupEventListeners() {
  searchInput.addEventListener("input", applyFilters);
  typeFilterSelect.addEventListener("change", applyFilters);
  limitSelect.addEventListener("change", () => {
    const limit = Number(limitSelect.value);
    fetchPokemonBatch(limit);
  });

  startBattleBtn.addEventListener("click", handleBattle);
  clearSelectionBtn.addEventListener("click", clearSelection);
}

// Fetch Pokémon

async function fetchPokemonBatch(limit) {
  showLoader(true);
  pokemonGrid.innerHTML = "";
  battleLogEl.innerHTML = "";
  battleResultEl.textContent = "";
  pokemonCountEl.textContent = "Loading...";

  try {
    const listResponse = await axios.get(`${API_BASE}?limit=${limit}&offset=0`);
    const results = listResponse.data.results;

    const detailPromises = results.map((entry) => axios.get(entry.url));
    const detailResponses = await Promise.all(detailPromises);

    pokemonList = detailResponses.map((res) => mapPokemonData(res.data));
    pokemonList.sort((a, b) => a.id - b.id);

    filteredList = [...pokemonList];

    buildTypeFilterOptions();
    renderPokemonGrid(filteredList);
    pokemonCountEl.textContent = `${filteredList.length} Loaded`;
  } catch (error) {
    console.error(error);
    pokemonGrid.innerHTML =
      '<p style="padding:0.6rem;font-size:0.85rem;color:#f97373;">Error loading data from PokeAPI. Check your internet and refresh.</p>';
    pokemonCountEl.textContent = "Error";
  } finally {
    showLoader(false);
  }
}

function showLoader(show) {
  loader.classList.toggle("hidden", !show);
}

// Transform API data

function mapPokemonData(data) {
  const statsObj = {};
  data.stats.forEach((s) => {
    statsObj[s.stat.name] = s.base_stat;
  });

  const sprite =
    (data.sprites.other &&
      data.sprites.other["official-artwork"] &&
      data.sprites.other["official-artwork"].front_default) ||
    data.sprites.front_default;

  const types = data.types.map((t) => t.type.name);

  const baseHp = statsObj["hp"] || 50;
  const attack = statsObj["attack"] || 50;
  const defense = statsObj["defense"] || 50;
  const speed = statsObj["speed"] || 50;

  const powerScore = Math.round(
    baseHp * 0.6 + attack * 1.1 + defense * 0.7 + speed * 0.8
  );

  return {
    id: data.id,
    name: capitalize(data.name),
    sprite: sprite,
    types: types,
    stats: {
      hp: baseHp,
      attack,
      defense,
      speed,
      specialAttack: statsObj["special-attack"] || 50,
      specialDefense: statsObj["special-defense"] || 50,
    },
    powerScore,
  };
}

// Rendering

function renderPokemonGrid(list) {
  pokemonGrid.innerHTML = "";

  list.forEach((pokemon) => {
    const card = document.createElement("article");
    card.className = "pokemon-card";
    card.dataset.id = String(pokemon.id);

    const typeBadgesHtml = pokemon.types
      .map(
        (t) =>
          `<span class="type-badge type-${t.toLowerCase()}">${t}</span>`
      )
      .join("");

    card.innerHTML = `
      <div class="card-header">
        <span class="poke-id">#${String(pokemon.id).padStart(3, "0")}</span>
        <div class="type-badges">${typeBadgesHtml}</div>
      </div>
      <div class="card-body">
        <div class="card-image-wrapper">
          ${
            pokemon.sprite
              ? `<img src="${pokemon.sprite}" alt="${pokemon.name}" loading="lazy" />`
              : `<span class="placeholder-text">NO IMAGE</span>`
          }
        </div>
        <div class="card-main-info">
          <h3>${pokemon.name}</h3>
          <div class="stat-line">
            <span>HP</span><span>${pokemon.stats.hp}</span>
          </div>
          <div class="stat-line">
            <span>ATK</span><span>${pokemon.stats.attack}</span>
          </div>
          <div class="stat-line">
            <span>DEF</span><span>${pokemon.stats.defense}</span>
          </div>
          <div class="stat-line">
            <span>SPD</span><span>${pokemon.stats.speed}</span>
          </div>
        </div>
      </div>
      <div class="card-footer">
        <span class="power">Power: ${pokemon.powerScore}</span>
        <span class="select-hint">Click to select</span>
      </div>
    `;

    card.addEventListener("click", () => handleCardClick(pokemon.id));
    pokemonGrid.appendChild(card);
  });

  updateCardSelectionStyles();
}

// Filters

function buildTypeFilterOptions() {
  const typeSet = new Set();
  pokemonList.forEach((p) => p.types.forEach((t) => typeSet.add(t)));

  const currentValue = typeFilterSelect.value;
  typeFilterSelect.innerHTML = '<option value="">All Types</option>';

  Array.from(typeSet)
    .sort()
    .forEach((type) => {
      const option = document.createElement("option");
      option.value = type;
      option.textContent = capitalize(type);
      typeFilterSelect.appendChild(option);
    });

  if (currentValue) {
    typeFilterSelect.value = currentValue;
  }
}

function applyFilters() {
  const query = searchInput.value.trim().toLowerCase();
  const type = typeFilterSelect.value;

  filteredList = pokemonList.filter((p) => {
    const matchesName = p.name.toLowerCase().includes(query);
    const matchesType = !type || p.types.includes(type);
    return matchesName && matchesType;
  });

  renderPokemonGrid(filteredList);
  pokemonCountEl.textContent = `${filteredList.length} Loaded`;
}

// Selection

function handleCardClick(id) {
  const pokemon = pokemonList.find((p) => p.id === id);
  if (!pokemon) return;

  // Toggle if already selected
  if (selected.left && selected.left.id === pokemon.id) {
    selected.left = null;
  } else if (selected.right && selected.right.id === pokemon.id) {
    selected.right = null;
  } else if (!selected.left) {
    selected.left = pokemon;
  } else if (!selected.right) {
    selected.right = pokemon;
  } else {
    // both occupied -> replace the one with lower power (for fun)
    if (selected.left.powerScore <= selected.right.powerScore) {
      selected.left = pokemon;
    } else {
      selected.right = pokemon;
    }
  }

  updateBattleSlots();
  updateCardSelectionStyles();
}

function updateCardSelectionStyles() {
  const cards = pokemonGrid.querySelectorAll(".pokemon-card");
  cards.forEach((card) => {
    const id = Number(card.dataset.id);
    const isSelected =
      (selected.left && selected.left.id === id) ||
      (selected.right && selected.right.id === id);
    card.classList.toggle("selected", !!isSelected);
  });
}

function clearSelection() {
  selected.left = null;
  selected.right = null;
  updateBattleSlots();
  updateCardSelectionStyles();
  battleResultEl.textContent = "";
  battleLogEl.innerHTML = "";
}

// Battle slot display

function updateBattleSlots() {
  // LEFT
  if (selected.left) {
    leftSprite.innerHTML = selected.left.sprite
      ? `<img src="${selected.left.sprite}" alt="${selected.left.name}"/>`
      : `<span class="placeholder-text">NO IMAGE</span>`;
    leftNameEl.textContent = selected.left.name;
    leftTypesEl.textContent = selected.left.types.join(" / ");
    leftStatsEl.textContent = formatStatLine(selected.left);
  } else {
    leftSprite.innerHTML = `<span class="placeholder-text">SELECT FROM GRID</span>`;
    leftNameEl.textContent = "No Pokémon Selected";
    leftTypesEl.textContent = "";
    leftStatsEl.textContent = "";
  }

  // RIGHT
  if (selected.right) {
    rightSprite.innerHTML = selected.right.sprite
      ? `<img src="${selected.right.sprite}" alt="${selected.right.name}"/>`
      : `<span class="placeholder-text">NO IMAGE</span>`;
    rightNameEl.textContent = selected.right.name;
    rightTypesEl.textContent = selected.right.types.join(" / ");
    rightStatsEl.textContent = formatStatLine(selected.right);
  } else {
    rightSprite.innerHTML = `<span class="placeholder-text">SELECT FROM GRID</span>`;
    rightNameEl.textContent = "No Pokémon Selected";
    rightTypesEl.textContent = "";
    rightStatsEl.textContent = "";
  }
}

function formatStatLine(p) {
  return `HP ${p.stats.hp} • ATK ${p.stats.attack} • DEF ${p.stats.defense} • SPD ${p.stats.speed}`;
}

// Battle logic

function handleBattle() {
  const p1 = selected.left;
  const p2 = selected.right;

  if (!p1 || !p2) {
    battleResultEl.textContent = "SELECT TWO POKÉMON FIRST.";
    return;
  }

  battleLogEl.innerHTML = "";
  battleResultEl.textContent = "SIMULATING BATTLE...";

  const result = simulateBattle(p1, p2);

  battleResultEl.textContent = `${result.winner.name} WINS IN ${result.rounds} ROUNDS!`;
  renderBattleLog(result.log);
}

function simulateBattle(p1, p2) {
  // Scale HP up to feel like a fight
  let hp1 = p1.stats.hp * 2;
  let hp2 = p2.stats.hp * 2;

  const log = [];

  log.push({
    type: "system",
    text: `Battle started: ${p1.name} vs ${p2.name}`,
  });

  // Determine who goes first based on SPEED
  let attackerIsP1 = p1.stats.speed >= p2.stats.speed;

  let rounds = 0;
  const MAX_ROUNDS = 30;

  while (hp1 > 0 && hp2 > 0 && rounds < MAX_ROUNDS) {
    rounds++;

    if (attackerIsP1) {
      const dmg = calculateDamage(p1, p2);
      hp2 -= dmg;
      if (hp2 < 0) hp2 = 0;
      log.push({
        type: dmg.crit ? "crit" : "hit",
        text: `${p1.name} hits ${p2.name} for ${dmg.amount} damage (HP ${hp2})`,
      });
    } else {
      const dmg = calculateDamage(p2, p1);
      hp1 -= dmg;
      if (hp1 < 0) hp1 = 0;
      log.push({
        type: dmg.crit ? "crit" : "hit",
        text: `${p2.name} hits ${p1.name} for ${dmg.amount} damage (HP ${hp1})`,
      });
    }

    // KO?
    if (hp1 <= 0 || hp2 <= 0) break;

    attackerIsP1 = !attackerIsP1;
  }

  let winner, loser;
  if (hp1 === hp2) {
    // speed tiebreaker
    if (p1.stats.speed >= p2.stats.speed) {
      winner = p1;
      loser = p2;
      log.push({
        type: "system",
        text: "Tie resolved: higher speed wins.",
      });
    } else {
      winner = p2;
      loser = p1;
      log.push({
        type: "system",
        text: "Tie resolved: higher speed wins.",
      });
    }
  } else if (hp1 > hp2) {
    winner = p1;
    loser = p2;
  } else {
    winner = p2;
    loser = p1;
  }

  log.push({
    type: "ko",
    text: `${winner.name} knocks out ${loser.name}!`,
  });

  return {
    winner,
    loser,
    rounds,
    log,
  };
}

// Damage calculation: arcade-style, not real Pokémon rules
function calculateDamage(attacker, defender) {
  const atk =
    attacker.stats.attack * 0.7 + attacker.stats.specialAttack * 0.5;
  const def =
    defender.stats.defense * 0.6 + defender.stats.specialDefense * 0.4;

  let base = atk - def * 0.45;
  if (base < 8) base = 8;

  const randomFactor = 0.8 + Math.random() * 0.4; // 0.8 - 1.2
  let damage = Math.round(base * randomFactor);

  let crit = false;
  if (Math.random() < 0.16) {
    damage = Math.round(damage * 1.8);
    crit = true;
  }

  if (damage < 5) damage = 5;

  return { amount: damage, crit };
}

function renderBattleLog(entries) {
  battleLogEl.innerHTML = "";
  entries.forEach((entry) => {
    const p = document.createElement("p");
    p.textContent = entry.text;
    if (entry.type) p.classList.add(entry.type);
    battleLogEl.appendChild(p);
  });

  battleLogEl.scrollTop = battleLogEl.scrollHeight;
}

// Helpers

function capitalize(str) {
  if (!str) return "";
  return str.charAt(0).toUpperCase() + str.slice(1);
}