let areaChartInstance;
let municipioChartInstance;
let areaChartLargeInstance;
let municipioChartLargeInstance;

// --- Guard reentrante para evitar stack overflow ---
let isApplyingYearFilter = false;

const chartColors = [
  'rgba(27, 94, 32, 0.8)',    // Verde primário
  'rgba(0, 121, 107, 0.8)',   // Verde-azulado
  'rgba(255, 109, 0, 0.8)',   // Laranja accent
  'rgba(21, 101, 192, 0.8)',  // Azul
  'rgba(94, 53, 177, 0.8)',   // Roxo
  'rgba(183, 28, 28, 0.8)',   // Vermelho
  'rgba(0, 150, 136, 0.8)',   // Teal
  'rgba(255, 152, 0, 0.8)',   // Laranja
  'rgba(63, 81, 181, 0.8)',   // Indigo
  'rgba(156, 39, 176, 0.8)'   // Roxo
];

const chartBorders = [
  'rgba(27, 94, 32, 1)',
  'rgba(0, 121, 107, 1)',
  'rgba(255, 109, 0, 1)',
  'rgba(21, 101, 192, 1)',
  'rgba(94, 53, 177, 1)',
  'rgba(183, 28, 28, 1)',
  'rgba(0, 150, 136, 1)',
  'rgba(255, 152, 0, 1)',
  'rgba(63, 81, 181, 1)',
  'rgba(156, 39, 176, 1)'
];

// ---- Helpers UI ----
function showLoader() {
  const el = document.getElementById('loader');
  if (el) el.style.display = 'flex';
}

function hideLoader() {
  const el = document.getElementById('loader');
  if (el) el.style.display = 'none';
}

function destroyChart(chartInstance) {
  if (chartInstance) chartInstance.destroy();
}

// Modal de aviso (Bootstrap)
function showWarningModal(title, message) {
  // Espera-se que exista um modal com id="genericWarningModal" no HTML
  // com .modal-title e .modal-body. Se não existir, cria um simples alert().
  const modalEl = document.getElementById('genericWarningModal');
  if (!modalEl) {
    alert(`${title}\n\n${message}`);
    return;
  }
  const titleEl = modalEl.querySelector('.modal-title');
  const bodyEl = modalEl.querySelector('.modal-body');
  if (titleEl) titleEl.textContent = title;
  if (bodyEl) bodyEl.innerHTML = message;

  // Se estiver usando Bootstrap 5:
  if (window.bootstrap && bootstrap.Modal) {
    const modal = bootstrap.Modal.getOrCreateInstance(modalEl);
    modal.show();
  } else {
    // fallback
    modalEl.style.display = 'block';
  }
}


function getYearFilters() {
  const startEl = document.getElementById('startYear');
  const endEl = document.getElementById('endYear');

  const startYearRaw = parseInt(startEl?.value, 10);
  const endYearRaw   = parseInt(endEl?.value, 10);

  return {
    startYear: Number.isFinite(startYearRaw) ? startYearRaw : 1986,
    // Importantíssimo: quando usuário não preenche o fim, deixamos como null
    endYear:   Number.isFinite(endYearRaw) ? endYearRaw : null
  };
}


// Cache simples para limites de ano do CSV (evita fetch repetido)
// Substitua completamente sua função getDataYearBounds() por esta:
let _yearBoundsCache = null;

async function getDataYearBounds() {
  if (_yearBoundsCache) return _yearBoundsCache;

  const res = await fetch('/area-data', { cache: 'no-store' });
  if (!res.ok) throw new Error('Falha ao obter /area-data');

  const data = await res.json();

  // Iterativo (evita Math.min(...arr)/Math.max(...arr) que estouram a stack)
  let min = Infinity;
  let max = -Infinity;

  for (const d of data) {
    const y = Number(d?.year);
    if (Number.isFinite(y)) {
      if (y < min) min = y;
      if (y > max) max = y;
    }
  }

  if (!Number.isFinite(min) || !Number.isFinite(max)) {
    throw new Error('Dataset sem anos válidos em /area-data');
  }

  _yearBoundsCache = { minYear: min, maxYear: max };
  return _yearBoundsCache;
}


// ---- Mapa ----
async function loadMap() {
  try {
    const srtmResponse = await fetch('/srtm-url');
    const srtmData = await srtmResponse.json();

    if (L.DomUtil.get('map') !== null) {
      L.DomUtil.get('map')._leaflet_id = null;
    }

    const map = L.map('map').setView([-3.4653, -62.2159], 6);

    const osm = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { attribution: 'OpenStreetMap' });
    const dark = L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}.png', { attribution: 'CartoDB Dark' });
    const satellite = L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', { attribution: 'ESRI Satellite' });

    dark.addTo(map);

    const srtmLayer = L.tileLayer(srtmData.url, { attribution: 'Earth Engine', opacity: 0.9 });
    srtmLayer.addTo(map);

    let municipiosLayer;

    function style() {
      return {
        color: '#FFFFFF',
        weight: 0.5,
        opacity: 0.2,
        fillOpacity: 0.0
      };
    }

    function highlightFeature(e) {
      const layer = e.target;
      layer.setStyle({
        color: '#FF6D00',
        weight: 2,
        opacity: 1.0,
        fillOpacity: 0.1
      });
      layer.bringToFront();

      if (!layer.tooltip) {
        const props = e.target.feature.properties;
        layer.tooltip = L.tooltip({
          permanent: false,
          direction: 'top',
          className: 'custom-tooltip'
        })
          .setContent(`<strong>${props.NM_MUN}</strong><br>${props.NM_UF}`)
          .setLatLng(e.latlng);
        layer.tooltip.addTo(map);
      }
    }

    function resetHighlight(e) {
      if (municipiosLayer) municipiosLayer.resetStyle(e.target);
      if (e.target.tooltip) {
        map.removeLayer(e.target.tooltip);
        e.target.tooltip = null;
      }
    }

    function onEachFeature(feature, layer) {
      layer.on({
        mouseover: highlightFeature,
        mouseout: resetHighlight,
        click: async () => {
          showLoader();
          const props = feature.properties;
          const municipio = props.NM_MUN;
          const state = props.NM_UF;

          const stateFilter = document.getElementById('stateFilter');
          const municipioFilter = document.getElementById('municipioFilter');

          stateFilter.value = state;
          await loadMunicipioFilter(state);
          municipioFilter.value = municipio;

          await applyYearFilter(); // usa fluxo único com clamp e guard
          hideLoader();
        }
      });
    }

    municipiosLayer = L.geoJSON(null, { style, onEachFeature });

    const geojsonResponse = await fetch('/municipios-amazonia');
    const geojsonData = await geojsonResponse.json();
    municipiosLayer.addData(geojsonData);
    municipiosLayer.addTo(map);

    const baseMaps = { 'OpenStreetMap': osm, 'Dark': dark, 'Satellite': satellite };
    const overlayMaps = {
      'FLORESER 2024': srtmLayer,
      'Municípios da Amazônia Legal': municipiosLayer
    };

    L.control.layers(baseMaps, overlayMaps, {
      collapsed: true,
      position: 'topright'
    }).addTo(map);

    L.control.scale({
      imperial: false,
      position: 'bottomleft'
    }).addTo(map);

  } catch (error) {
    console.error('Erro ao carregar o mapa:', error);
  } finally {
    hideLoader();
  }
}

// ---- Filtros Estado/Município ----
async function loadStateFilter() {
  try {
    showLoader();
    const response = await fetch('/lista-estados', { cache: 'no-store' });
    if (!response.ok) throw new Error('Erro na requisição');
    const states = await response.json();

    const stateFilter = document.getElementById('stateFilter');
    stateFilter.innerHTML = `<option value="">Todos os Estados</option>`;
    states.forEach(state => {
      const option = document.createElement('option');
      option.value = state;
      option.textContent = state;
      stateFilter.appendChild(option);
    });
  } catch (error) {
    console.error('Erro ao carregar os estados:', error);
    // fallback para não travar a página
    const stateFilter = document.getElementById('stateFilter');
    if (stateFilter) {
      stateFilter.innerHTML = `<option value="">Todos os Estados</option>`;
    }
    showWarningModal(
      'Não foi possível carregar os Estados',
      'Verifique se a rota <code>/lista-estados</code> está ativa, se não há bloqueio de CORS e se o protocolo (http/https) coincide com o da página.'
    );
  } finally {
    hideLoader();
  }
}

async function loadMunicipioFilter(state) {
  try {
    showLoader();
    const response = await fetch(`/lista-municipios/${encodeURIComponent(state)}`, { cache: 'no-store' });
    if (!response.ok) throw new Error('Erro na requisição');
    const municipios = await response.json();
    const municipioFilter = document.getElementById('municipioFilter');
    municipioFilter.innerHTML = '<option value="">Todos os Municípios</option>';
    municipios.forEach(municipio => {
      const option = document.createElement('option');
      option.value = municipio;
      option.textContent = municipio;
      municipioFilter.appendChild(option);
    });
  } catch (error) {
    console.error('Erro ao carregar os municípios:', error);
    const municipioFilter = document.getElementById('municipioFilter');
    if (municipioFilter) {
      municipioFilter.innerHTML = '<option value="">Todos os Municípios</option>';
    }
  } finally {
    hideLoader();
  }
}

// ---- Apply Year Filter (com guard + clamp + modal) ----
let applyYearFilterPending = false;     // novo: fila uma execução se reentrar
async function applyYearFilter() {
  if (isApplyingYearFilter) {            // evita reentrância
    applyYearFilterPending = true;       // agenda uma única execução após terminar
    return;
  }
  isApplyingYearFilter = true;

  try {
    showLoader();

    const state     = document.getElementById('stateFilter')?.value || '';
    const municipio = document.getElementById('municipioFilter')?.value || '';

    let { startYear, endYear } = getYearFilters();
    const { minYear, maxYear } = await getDataYearBounds();

    // Se o usuário não definiu ano final, use o último do CSV
    if (endYear === null) {
      endYear = maxYear;
    }

    // Clamp + coleta de mensagens para modal
    const msgs = [];
    let adjusted = false;

    if (endYear > maxYear) {
      msgs.push(`Ano final (${endYear}) ajustado para <strong>${maxYear}</strong>.`);
      endYear = maxYear; adjusted = true;
    }
    if (startYear > maxYear) {
      msgs.push(`Ano inicial (${startYear}) sem dados; ajustado para <strong>${maxYear}</strong>.`);
      startYear = maxYear; adjusted = true;
    }
    if (startYear < minYear) {
      msgs.push(`Ano inicial (${startYear}) ajustado para <strong>${minYear}</strong>.`);
      startYear = minYear; adjusted = true;
    }
    if (startYear > endYear) {
      msgs.push(`Intervalo inválido (${startYear}-${endYear}); ajustado para <strong>${endYear}</strong>.`);
      startYear = endYear; adjusted = true;
    }

    if (adjusted) {
      showWarningModal(
        'Ajuste de período',
        `Os anos escolhidos foram ajustados aos limites do dataset:<br>${msgs.join('<br>')}`
      );
      // Importante: NÃO escrever nos inputs aqui para não disparar eventos e reentrar.
    }

    // Carregamento dos gráficos
    if (municipio) {
      await loadChartByState(state, municipio, startYear, endYear);
    } else if (state) {
      await loadChartByState(state, '', startYear, endYear);
      await loadMunicipioChartByMunicipio(state, startYear, endYear);
    } else {
      await loadChartByState('', '', startYear, endYear);
      await loadMunicipioChartByMunicipio('', startYear, endYear);
    }

  } catch (e) {
    console.error('Erro ao aplicar filtro de ano:', e);
  } finally {
    hideLoader();
    isApplyingYearFilter = false;
    if (applyYearFilterPending) {
      applyYearFilterPending = false;
      applyYearFilter(); // roda uma única vez após liberar a flag
    }
  }
}

// ---- Format helpers ----
function formatNumber(value) {
  return new Intl.NumberFormat('pt-BR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(value);
}

function formatCompactNumber(value) {
  return new Intl.NumberFormat('pt-BR', {
    notation: 'compact',
    compactDisplay: 'short'
  }).format(value);
}

// ---- Charts ----
async function loadChartByState(state = '', municipio = '', startYear = 1986, endYear = 2024) {
  try {
    const response = await fetch('/area-data', { cache: 'no-store' });
    const data = await response.json();

    // Filtra por município/estado/anos
    let filteredData;
    if (municipio) {
      filteredData = data.filter(item =>
        item.name === municipio &&
        item.year >= startYear && item.year <= endYear
      );
    } else if (state) {
      filteredData = data.filter(item =>
        item.state === state &&
        item.year >= startYear && item.year <= endYear
      );
    } else {
      filteredData = data.filter(item =>
        item.year >= startYear && item.year <= endYear
      );
    }

    // Labels contínuos do intervalo (mesmo se algum ano não tiver dado)
    const labels = [];
    for (let y = startYear; y <= endYear; y++) labels.push(y);

    let datasets;

    if (municipio) {
      const municipioData = filteredData.filter(item => item.name === municipio);
      datasets = [{
        label: municipio,
        data: labels.map(year => {
          const entry = municipioData.find(item => item.year === year);
          return entry ? entry.area : 0;
        }),
        backgroundColor: chartColors[0],
        borderColor: chartBorders[0],
        borderWidth: 2,
        fill: false,
        tension: 0.1,
        pointRadius: 4,
        pointHoverRadius: 6
      }];
    } else if (state) {
      const stateData = filteredData; // já filtrado por estado
      datasets = [{
        label: state,
        data: labels.map(year => {
          const entry = stateData.find(item => item.year === year);
          return entry ? entry.area : 0;
        }),
        backgroundColor: chartColors[0],
        borderColor: chartBorders[0],
        borderWidth: 2,
        fill: false,
        tension: 0.1,
        pointRadius: 4,
        pointHoverRadius: 6
      }];
    } else {
      const states = [...new Set(filteredData.map(item => item.state))];
      datasets = states.map((stateLabel, index) => {
        const stateData = filteredData.filter(item => item.state === stateLabel);
        return {
          label: stateLabel,
          data: labels.map(year => {
            const yearData = stateData.filter(item => item.year === year);
            const totalArea = yearData.reduce((sum, item) => sum + item.area, 0);
            return totalArea;
          }),
          backgroundColor: chartColors[index % chartColors.length],
          borderColor: chartBorders[index % chartBorders.length],
          borderWidth: 2,
          fill: false,
          tension: 0.1,
          pointRadius: 3,
          pointHoverRadius: 5
        };
      });
    }

    // Opções do gráfico (x categórico)
    const chartOptions = {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          position: 'top',
          labels: {
            font: { family: "'Montserrat', sans-serif", size: 12 },
            padding: 15,
            usePointStyle: true,
            pointStyle: 'circle'
          }
        },
        title: { display: false },
        tooltip: {
          enabled: true,
          mode: 'index',
          intersect: false,
          backgroundColor: 'rgba(255, 255, 255, 0.9)',
          titleColor: '#212121',
          bodyColor: '#212121',
          borderColor: '#ddd',
          borderWidth: 1,
          cornerRadius: 8,
          padding: 12,
          boxPadding: 6,
          titleFont: { family: "'Montserrat', sans-serif", size: 14, weight: 'bold' },
          bodyFont: { family: "'Montserrat', sans-serif", size: 13 },
          callbacks: {
            label: function (ctx) {
              let label = ctx.dataset.label || '';
              if (label) label += ': ';
              if (ctx.parsed.y !== null) label += formatNumber(ctx.parsed.y) + ' ha';
              return label;
            }
          }
        }
      },
      scales: {
        x: {
          type: 'category',
          grid: { display: true, color: 'rgba(0, 0, 0, 0.05)' },
          ticks: { font: { family: "'Montserrat', sans-serif", size: 12 } },
          title: { display: true, text: 'Ano', font: { family: "'Montserrat'", size: 14, weight: 'bold' } }
        },
        y: {
          beginAtZero: true,
          grid: { color: 'rgba(0, 0, 0, 0.05)' },
          ticks: {
            font: { family: "'Montserrat', sans-serif", size: 12 },
            callback: v => formatCompactNumber(v)
          },
          title: { display: true, text: 'Área (ha)', font: { family: "'Montserrat'", size: 14, weight: 'bold' } }
        }
      },
      animation: { duration: 1000, easing: 'easeOutQuart' },
      hover: { mode: 'index', intersect: false },
      interaction: { mode: 'index', intersect: false }
    };

    destroyChart(areaChartInstance);
    destroyChart(areaChartLargeInstance);

    areaChartInstance = new Chart(document.getElementById('areaChart'), {
      type: 'line',
      data: { labels, datasets },
      options: chartOptions
    });

    areaChartLargeInstance = new Chart(document.getElementById('areaChartLarge'), {
      type: 'line',
      data: { labels, datasets },
      options: { ...chartOptions, maintainAspectRatio: false }
    });

    const modalTitle = document.querySelector('#modalAreaChart .modal-title');
    if (modalTitle) {
      modalTitle.textContent = municipio
        ? `Série Temporal (${startYear}-${endYear}) - ${municipio}`
        : state
          ? `Série Temporal (${startYear}-${endYear}) - ${state}`
          : `Série Temporal por Estado (${startYear}-${endYear})`;
    }

  } catch (error) {
    console.error('Erro ao carregar gráfico por estado:', error);
  } finally {
    hideLoader();
  }
}

async function loadMunicipioChartByMunicipio(state = '', startYear = 1986, endYear = 2024) {
  try {
    const response = await fetch(`/municipios-area-data?startYear=${startYear}&endYear=${endYear}`, { cache: 'no-store' });
    const data = await response.json();

    const filteredData = state ? data.filter(item => item.state === state) : data;

    const top10 = filteredData
      .sort((a, b) => b.area - a.area)
      .slice(0, 10);

    const greenBase = [27, 94, 32];
    const greenColors = [];
    const borderColors = [];

    for (let i = 0; i < top10.length; i++) {
      const intensity = 0.5 + (i * 0.05);
      const r = Math.min(255, Math.round(greenBase[0] * intensity));
      const g = Math.min(255, Math.round(greenBase[1] * intensity * 1.1));
      const b = Math.min(255, Math.round(greenBase[2] * intensity * 0.9));
      greenColors.push(`rgba(${r}, ${g}, ${b}, 0.8)`);
      borderColors.push(`rgba(${r}, ${g}, ${b}, 1)`);
    }

    const chartOptions = {
      responsive: true,
      maintainAspectRatio: false,
      indexAxis: 'y',
      plugins: {
        legend: { display: false },
        title: { display: false },
        tooltip: {
          enabled: true,
          backgroundColor: 'rgba(255, 255, 255, 0.9)',
          titleColor: '#212121',
          bodyColor: '#212121',
          borderColor: '#ddd',
          borderWidth: 1,
          cornerRadius: 8,
          padding: 12,
          titleFont: { family: "'Montserrat', sans-serif", size: 14, weight: 'bold' },
          bodyFont: { family: "'Montserrat', sans-serif", size: 13 },
          callbacks: {
            label: function (context) {
              let label = 'Área: ';
              if (context.parsed.x !== null) {
                label += formatNumber(context.parsed.x) + ' ha';
              }
              return label;
            },
            afterLabel: function (context) {
              const index = context.dataIndex;
              const rank = index + 1;
              return `Posição: ${rank}º`;
            }
          }
        }
      },
      scales: {
        x: {
          beginAtZero: true,
          grid: { color: 'rgba(0, 0, 0, 0.05)' },
          ticks: {
            font: { family: "'Montserrat', sans-serif", size: 12 },
            callback: value => formatCompactNumber(value)
          },
          title: { display: true, text: 'Área de Vegetação Secundária (ha)', font: { family: "'Montserrat'", size: 14, weight: 'bold' } }
        },
        y: {
          grid: { display: false },
          ticks: {
            font: { family: "'Montserrat', sans-serif", size: 12 },
            callback: function (value) {
              const municipio = this.getLabelForValue(value);
              return municipio.length > 30 ? municipio.substring(0, 27) + '...' : municipio;
            }
          },
          title: { display: true, text: 'Municípios', font: { family: "'Montserrat'", size: 14, weight: 'bold' } }
        }
      },
      animation: { duration: 1000, easing: 'easeOutQuart' }
    };

    destroyChart(municipioChartInstance);
    destroyChart(municipioChartLargeInstance);

    const labels = top10.map(item => item.municipio);
    const series = top10.map(item => item.area);

    municipioChartInstance = new Chart(document.getElementById('municipioChart'), {
      type: 'bar',
      data: { labels, datasets: [{ label: 'Área Acumulada', data: series, backgroundColor: greenColors, borderColor: borderColors, borderWidth: 1, borderRadius: 4 }] },
      options: chartOptions
    });

    municipioChartLargeInstance = new Chart(document.getElementById('municipioChartLarge'), {
      type: 'bar',
      data: { labels, datasets: [{ label: 'Área Acumulada', data: series, backgroundColor: greenColors, borderColor: borderColors, borderWidth: 1, borderRadius: 4 }] },
      options: { ...chartOptions, maintainAspectRatio: false }
    });

    const modalTitle = document.querySelector('#modalMunicipioChart .modal-title');
    if (modalTitle) modalTitle.textContent = '';

  } catch (error) {
    console.error('Erro ao carregar gráfico dos municípios:', error);
  } finally {
    hideLoader();
  }
}

// ---- Eventos ----
document.getElementById('stateFilter').addEventListener('change', async function () {
  const state = this.value;
  if (state) {
    await loadMunicipioFilter(state);
  } else {
    const municipioFilter = document.getElementById('municipioFilter');
    if (municipioFilter) {
      municipioFilter.innerHTML = '<option value="">Todos os Municípios</option>';
    }
  }
  await applyYearFilter(); // chama uma única vez
});

document.getElementById('municipioFilter').addEventListener('change', async function () {
  await applyYearFilter();
});

document.getElementById('applyYearFilter').addEventListener('click', applyYearFilter);

// ---- Inicialização ----
window.addEventListener('DOMContentLoaded', async () => {
  showLoader();
  await loadStateFilter(); // se falhar, mostra modal e segue
  await loadMap();
  await applyYearFilter(); // fluxo único com guard
  hideLoader();
});
