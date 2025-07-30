Chart.register(ChartDataLabels);

const estadoNomes = {
        AC: "Acre",
        AL: "Alagoas",
        AM: "Amazonas",
        AP: "Amapá",
        BA: "Bahia",
        CE: "Ceará",
        DF: "Distrito Federal",
        ES: "Espírito Santo",
        GO: "Goiás",
        MA: "Maranhão",
        MG: "Minas Gerais",
        MS: "Mato Grosso do Sul",
        MT: "Mato Grosso",
        PA: "Pará",
        PB: "Paraíba",
        PE: "Pernambuco",
        PI: "Piauí",
        PR: "Paraná",
        RJ: "Rio de Janeiro",
        RN: "Rio Grande do Norte",
        RO: "Rondônia",
        RR: "Roraima",
        RS: "Rio Grande do Sul",
        SC: "Santa Catarina",
        SE: "Sergipe",
        SP: "São Paulo",
        TO: "Tocantins"
    };

    document.addEventListener('DOMContentLoaded', function () {
        // Elementos da UI
        //const startPeriodInput = document.getElementById('startPeriod');
        //const endPeriodInput = document.getElementById('endPeriod');
        const specificFiltersContainer = document.getElementById('specific-filters');
        const specificFiltersContent = document.getElementById('specific-filters-content');
        const applyFiltersButton = document.getElementById('apply-filters');
        
        // Botões de filtro
        const dataTypeButtons = document.querySelectorAll('[data-type="desmatamento"], [data-type="degradacao"]');
        const territoryTypeButtons = document.querySelectorAll('[data-type="estados"], [data-type="municipios"], [data-type="terrasIndigenas"], [data-type="unidadesConservacao"], [data-type="assentamentos"]');

        // Títulos dos Gráficos
        const barChartTitle = document.getElementById('bar-chart-title');
        const mapTitle = document.getElementById('map-title');
        const lineChartTitle = document.getElementById('line-chart-title');
        const yearlyChartTitle = document.getElementById('yearly-chart-title');

        // Elementos de estatísticas
        const totalAreaEl = document.getElementById('total-area');
        const avgAreaEl = document.getElementById('avg-area');
        const affectedTerritoriesEl = document.getElementById('affected-territories');
        const annualChangeEl = document.getElementById('annual-change');

        // Painel de informações
        const infoPanel = document.getElementById('info-panel');
        const selectedTerritoryEl = document.getElementById('selected-territory');
        const selectedAreaEl = document.getElementById('selected-area');
        const selectedStateEl = document.getElementById('selected-state');
        const selectedPercentageEl = document.getElementById('selected-percentage');

        // Instâncias dos Gráficos e Mapa
        let barChart, lineChart, yearlyChart;
        const map = L.map('map').setView([-5, -55], 4);
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        }).addTo(map);
        let geoJsonLayer;
        let legend;

        // Variáveis para armazenar dados do gráfico e mapa
        let currentTopTerritories = [];
        let territoryBounds = {};

        // Dados reais para assentamentos (desmatamento e degradação)
        const dataSources = {
            desmatamento: {
                assentamentos: { 
                    csv: "/dataset/sad/csv/alertas_sad_desmatamento_08_2008_04_2024_assentamentos.csv",
                    geojson: "/dataset/sad/geojson/AMZ_assentamentos.geojson"
                },
                estados: {
                    csv: "/dataset/sad/csv/alertas_sad_desmatamento_08_2008_04_2024_municipios.csv",
                    geojson: "/dataset/sad/geojson/AMZ_estados.geojson"
                },
                municipios: { 
                    csv: "/dataset/sad/csv/alertas_sad_desmatamento_08_2008_04_2024_municipios.csv",
                    geojson: "/dataset/sad/geojson/AMZ_municipios.geojson"
                },
                terrasIndigenas: {  
                    csv: "/dataset/sad/csv/alertas_sad_desmatamento_08_2008_04_2024_terraIndigena.csv",
                    geojson: "/dataset/sad/geojson/AMZ_terra_indigena.geojson"
                },
                unidadesConservacao: {  
                    csv: "/dataset/sad/csv/alertas_sad_desmatamento_08_2008_04_2024_unidadeConservacao.csv",
                    geojson: "/dataset/sad/geojson/AMZ_unidade_conservacao.geojson"
                }
            },
            degradacao:{
                assentamentos: { 
                    csv: "/dataset/sad/csv/alertas_sad_degradacao_09_2008_04_2024_assentamento.csv",
                    geojson: "/dataset/sad/geojson/AMZ_assentamentos.geojson"
                },
                estados: {
                    csv: "/dataset/sad/csv/alertas_sad_degradacao_09_2008_04_2024_municipio.csv",
                    geojson: "/dataset/sad/geojson/AMZ_estados.geojson"
                },
                municipios: { 
                    csv: "/dataset/sad/csv/alertas_sad_degradacao_09_2008_04_2024_municipio.csv",
                    geojson: "/dataset/sad/geojson/AMZ_municipios.geojson"
                },
                terrasIndigenas: {  
                    csv: "/dataset/sad/csv/alertas_sad_degradacao_09_2008_04_2024_terraIndigena.csv",
                    geojson: "/dataset/sad/geojson/AMZ_terra_indigena.geojson"
                },
                unidadesConservacao: {  
                    csv: "/dataset/sad/csv/alertas_sad_degradacao_09_2008_04_2024_ucs.csv",
                    geojson: "/dataset/sad/geojson/AMZ_unidade_conservacao.geojson"
                }
            }
        };
        function preencherSelectsAno() {
  const startYear = document.getElementById('startYear');
  const endYear = document.getElementById('endYear');
  const currentYear = new Date().getFullYear();

  for (let y = 2008; y <= currentYear; y++) {
    const optStart = document.createElement('option');
    optStart.value = y;
    optStart.textContent = y;
    startYear.appendChild(optStart);

    const optEnd = document.createElement('option');
    optEnd.value = y;
    optEnd.textContent = y;
    endYear.appendChild(optEnd);
  }

  startYear.value = "2024";
  endYear.value = "2024";
  document.getElementById('startMonth').value = "01";
  document.getElementById('endMonth').value = "12";
}

preencherSelectsAno();

        // Mapeamento de nomes de colunas para cada tipo de território
        const territoryNameMapping = {
            assentamentos: 'ASSENTAMEN',
            estados: 'ESTADO',
            municipios: 'MUNICIPIO',
            terrasIndigenas: 'TERRA_INDI',
            unidadesConservacao: 'UNID_CONSE'
        };

        // Função para carregar e processar dados
        async function loadData() {
            const dataType = getSelectedDataType();
            const territoryType = getSelectedTerritoryType();
            
            // Carrega dados para assentamentos, estados ou municípios com desmatamento
            if ((dataType === 'desmatamento' || dataType === 'degradacao') && 
                (territoryType === 'assentamentos' || 
                territoryType === 'estados' || 
                territoryType === 'municipios' ||
                territoryType === 'terrasIndigenas' ||
                territoryType === 'unidadesConservacao')) {
                try {
                    // Carregar CSV
                    const csvData = await d3.csv(dataSources[dataType][territoryType].csv);
                    // Converter AREAKM2 para número
                    csvData.forEach(d => {
                        d.AREAKM2 = +d.AREAKM2 || 0;
                    });
                    
                    // Carregar GeoJSON
                    const geojsonResponse = await fetch(dataSources[dataType][territoryType].geojson);
                    const geojsonData = await geojsonResponse.json();
                    
                    return { csvData, geojsonData };
                } catch (error) {
                    console.error('Erro ao carregar dados:', error);
                    return { csvData: [], geojsonData: null };
                }
            }
            
            // Para outros tipos, retornar dados vazios
            return { csvData: [], geojsonData: null };
        }

        // Obter tipo de dado selecionado
        function getSelectedDataType() {
            const activeButton = document.querySelector('.filter-btn.active[data-type="desmatamento"], .filter-btn.active[data-type="degradacao"]');
            return activeButton ? activeButton.getAttribute('data-type') : 'desmatamento';
        }

        // Obter tipo de território selecionado
        function getSelectedTerritoryType() {
            const activeButton = document.querySelector('.filter-btn.active[data-type="estados"], .filter-btn.active[data-type="municipios"], .filter-btn.active[data-type="terrasIndigenas"], .filter-btn.active[data-type="unidadesConservacao"], .filter-btn.active[data-type="assentamentos"]');
            return activeButton ? activeButton.getAttribute('data-type') : 'estados';
        }

        // Atualizar botões ativos
        function updateActiveButtons() {
            const currentDataType = getSelectedDataType();
            const currentTerritoryType = getSelectedTerritoryType();
            
            // Atualizar botões de tipo de dado
            dataTypeButtons.forEach(btn => {
                if (btn.getAttribute('data-type') === currentDataType) {
                    btn.classList.add('active');
                } else {
                    btn.classList.remove('active');
                }
            });
            
            // Atualizar botões de território
            territoryTypeButtons.forEach(btn => {
                if (btn.getAttribute('data-type') === currentTerritoryType) {
                    btn.classList.add('active');
                } else {
                    btn.classList.remove('active');
                }
            });
        }

        async function updateDashboard() {
            const { csvData, geojsonData } = await loadData();
            if (!csvData.length || !geojsonData) return;

            const territoryType = getSelectedTerritoryType();
            const nameKey = territoryNameMapping[territoryType];
            
            // Lógica de filtragem de período
            const currentYear = new Date().getFullYear();
            const startYear = 2008;
            const allPeriodData = csvData.filter(d => {
                return d.ANO >= startYear && d.ANO <= currentYear-1;
            });

            const start = new Date(`${document.getElementById('startYear').value}-${document.getElementById('startMonth').value}-01`);
const end = new Date(`${document.getElementById('endYear').value}-${document.getElementById('endMonth').value}-01`);


            let filteredData = csvData.filter(d => {
                const date = new Date(`${d.ANO}-${String(d.MES).padStart(2, '0')}-01`);
                return date >= start && date <= end;
            });

            // Aplicar filtros específicos
            filteredData = applySpecificFilters(filteredData, territoryType);

            // Agregação de dados
            const aggregatedData = {};
            filteredData.forEach(d => {
                const name = d[nameKey];
                const area = parseFloat(d.AREAKM2) || 0;
                if (name) {
                    aggregatedData[name] = (aggregatedData[name] || 0) + area;
                }
            });

            const sortedData = Object.entries(aggregatedData)
                .sort(([, a], [, b]) => b - a)
                .slice(0, 10); // Top 15

            const labels = sortedData.map(([name]) => {
                if (territoryType === 'estados' && estadoNomes[name]) {
                    return estadoNomes[name];
                }
                return name;
            });

            const dataValues = sortedData.map(([, area]) => area);

            // Armazenar territórios visíveis
            currentTopTerritories = sortedData.map(([sigla]) => sigla);

            // Atualizar estatísticas
            const anoAtual = new Date().getFullYear();
            const currentYearData = filteredData.filter(d => +d.ANO === anoAtual);

            updateStatistics(aggregatedData, filteredData, territoryType, currentYearData);


            updateBarChart(labels, dataValues);
            updateLineChart(allPeriodData, territoryType);
            updateYearlyChart(allPeriodData);
            updateMap(geojsonData, aggregatedData, territoryType);
            updateTitles();
        }

        // Atualizar estatísticas
        function updateStatistics(aggregatedData, filteredData, territoryType, currentYearData) {

            // Área total
            const totalArea = Object.values(aggregatedData).reduce((sum, area) => sum + area, 0);
            totalAreaEl.textContent = totalArea.toLocaleString('pt-BR', { maximumFractionDigits: 2 }) + ' km²';
            
            // Área média mensal em 2024
            
            const monthsCount = new Set(currentYearData.map(d => d.MES)).size;
            const avgArea = monthsCount > 0 ? 
                currentYearData.reduce((sum, d) => sum + d.AREAKM2, 0) / monthsCount : 0;
            avgAreaEl.textContent = avgArea.toLocaleString('pt-BR', { maximumFractionDigits: 2 }) + ' km²';
            
            // Territórios afetados
            const affectedTerritories = Object.keys(aggregatedData).length;
            affectedTerritoriesEl.textContent = affectedTerritories;
            
            // Variação anual (simulado)
            const variation = Math.round((Math.random() * 20) - 10);
            annualChangeEl.textContent = (variation > 0 ? '+' : '') + variation + '%';
            annualChangeEl.style.color = variation > 0 ? '#ff5252' : '#4caf50';
        }

        // Função para aplicar filtros específicos
        function applySpecificFilters(data, territoryType) {
            let filteredData = [...data];
            const dataType = getSelectedDataType();

            if (dataType === 'desmatamento' || dataType === 'degradacao') {
                if (territoryType === 'assentamentos') {
                    const stateFilter = document.getElementById('stateFilter');
                    if (stateFilter && stateFilter.value !== 'all') {
                        filteredData = filteredData.filter(d => d.ESTADO === stateFilter.value);
                    }
                }
                else if (territoryType === 'estados') {
                    const stateFilter = document.getElementById('stateFilterEstados');
                    if (stateFilter && stateFilter.value !== 'all') {
                        filteredData = filteredData.filter(d => d.ESTADO === stateFilter.value);
                    }
                }
                else if (territoryType === 'municipios') {
                    const stateFilter = document.getElementById('stateFilterMunicipios');
                    const municipioFilter = document.getElementById('municipioFilter');
                                
                    if (stateFilter && stateFilter.value !== 'all') {
                        filteredData = filteredData.filter(d => d.ESTADO === stateFilter.value);
                    }
                    if (municipioFilter && municipioFilter.value !== 'all') {
                        filteredData = filteredData.filter(d => d.MUNICIPIO === municipioFilter.value);
                    }
                }

                else if (territoryType === 'terrasIndigenas') {
    const stateFilter = document.getElementById('stateFilterTerrasIndigenas');
    if (stateFilter && stateFilter.value !== 'all') {
        filteredData = filteredData.filter(d => d.ESTADO === stateFilter.value);
    }

    const checkboxes = document.querySelectorAll('.terra-checkbox:checked');
    if (checkboxes.length > 0) {
        const selecionadas = Array.from(checkboxes).map(cb => cb.value);
        filteredData = filteredData.filter(d => selecionadas.includes(d.TERRA_INDI));
    }


                }
                else if (territoryType === 'unidadesConservacao') {
                    const stateFilter = document.getElementById('stateFilterUC');
                    const jurisdicaoFilter = document.getElementById('jurisdicaoFilter');
                    const modalidadeFilter = document.getElementById('modalidadeFilter');

                    if (stateFilter && stateFilter.value !== 'all') {
                        filteredData = filteredData.filter(d => d.ESTADO === stateFilter.value);
                    }
                    if (jurisdicaoFilter && jurisdicaoFilter.value !== 'all') {
                        filteredData = filteredData.filter(d => d.JURISDICAO === jurisdicaoFilter.value);
                    }
                    if (modalidadeFilter && modalidadeFilter.value !== 'all') {
                        filteredData = filteredData.filter(d => d.USO === modalidadeFilter.value);
                    }
                }
            }
            
            return filteredData;
        }

        // Função para atualizar o gráfico de barras
       function updateBarChart(labels, dataValues) {
    const ctx = document.getElementById('barChart').getContext('2d');
    if (barChart) {
        barChart.destroy();
    }

    const dataType = getSelectedDataType();
    const maxVal = Math.max(...dataValues);

    // Escala de cores gradiente (como no mapa)
    const colorScale = d3.scaleSequential()
        .domain([0, maxVal])
        .interpolator(dataType === 'desmatamento' ? d3.interpolateReds : d3.interpolateOranges);

    const barColors = dataValues.map(v => colorScale(v));

    barChart = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: labels,
            datasets: [{
                label: 'Área (km²)',
                data: dataValues,
                backgroundColor: barColors,
                borderColor: barColors,
                borderWidth: 1,
                borderRadius: 4,
                borderSkipped: false
            }]
        },
        options: {
            indexAxis: 'y',
            responsive: true,
            maintainAspectRatio: false,
            layout: {
                padding: {
                    right: 40  // espaço para texto fora da barra
                }
            },
            plugins: {
                legend: {
                    display: false
                },
                datalabels: {
                    anchor: 'end',
                    align: 'right',
                    offset: 8,
                    clamp: true,
                    clip: false,
                    color: '#111',
                    font: {
                        weight: 'bold',
                        size: 12
                    },
                    formatter: value =>
                        `${value.toLocaleString('pt-BR', { maximumFractionDigits: 2 })}`
                },
                tooltip: {
                    backgroundColor: 'rgba(0, 0, 0, 0.8)',
                    titleColor: 'white',
                    bodyColor: 'white',
                    borderColor: '#444',
                    borderWidth: 1,
                    callbacks: {
                        label: context =>
                            `Área: ${context.parsed.x.toLocaleString('pt-BR', { maximumFractionDigits: 2 })} km²`
                    }
                }
            },
            onClick: (e, elements) => {
                if (elements.length > 0) {
                    const index = elements[0].index;
                    const territoryName = labels[index];
                    if (territoryBounds[territoryName]) {
                        map.fitBounds(territoryBounds[territoryName], {
                            padding: [50, 50],
                            animate: true,
                            duration: 1.5
                        });
                    }
                }
            },
            scales: {
                x: {
                    beginAtZero: true,
                    title: {
                        display: true,
                        text: 'Área (km²)',
                        font: { weight: 'bold' }
                    },
                    grid: { display: false },
                    ticks: {
                        callback: value => value.toLocaleString('pt-BR')
                    }
                },
                y: {
                    grid: { display: false },
                    ticks: {
                        font: { size: 11 }
                    }
                }
            },
            animation: {
                duration: 1000,
                easing: 'easeInOutQuart'
            }
        },
        plugins: [ChartDataLabels]
    });
}




        // Função para atualizar o gráfico de linha (série histórica)
       function updateLineChart(csvData, territoryType) {
    const ctx = document.getElementById('lineChart').getContext('2d');
    if (lineChart) {
        lineChart.destroy();
    }

    const dataType = getSelectedDataType();
    const years = Array.from(new Set(csvData.map(d => d.ANO))).sort();

    const nameKey = territoryNameMapping[territoryType];
    const groupedData = {};

    // Agrupamento dos dados
    csvData.forEach(d => {
        const key = (territoryType === 'estados' || territoryType === 'municipios') ? d.ESTADO : d[nameKey];
        const ano = d.ANO;
        const area = parseFloat(d.AREAKM2) || 0;

        if (!groupedData[key]) groupedData[key] = {};
        if (!groupedData[key][ano]) groupedData[key][ano] = 0;
        groupedData[key][ano] += area;
    });

    // Paleta de cores fixa (10 tons)
    const pal = d3.schemeTableau10.concat(d3.schemeSet2); // Mais contraste


    const datasets = [];

    currentTopTerritories.slice(0, 10).forEach((territorio, index) => {
        const anos = groupedData[territorio] || {};
        const data = years.map(year => anos[year] || 0);
        const cor = pal[index % pal.length];

        datasets.push({
    label: (estadoNomes[territorio] || territorio),
    data: years.map(year => {
        const raw = anos[year] || 0;
        return parseFloat(raw.toFixed(2));  // ✅ Aqui você controla a precisão
    }),
    borderColor: cor,
    backgroundColor: cor + '20',
    fill: false,
    tension: 0.4,
    datalabels: {
        align: 'top',
        anchor: 'end',
        color: '#333',
        font: {
            weight: 'bold',
            size: 10
        },
        formatter: function(value, context) {
            const ano = context.chart.data.labels[context.dataIndex];
            return ano === 2024
                ? value.toLocaleString('pt-BR', { maximumFractionDigits: 2 })
                : '';
        }
    }
});

    }); 

    lineChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: years,
            datasets: datasets
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    display: true,
                    position: 'top',
                    labels: {
                        font: { weight: 'bold' }
                    }
                },
                tooltip: {
                    backgroundColor: 'rgba(0, 0, 0, 0.8)',
                    titleColor: 'white',
                    bodyColor: 'white',
                    borderColor: dataType === 'desmatamento' ? '#008055' : '#FF6D00',
                    borderWidth: 1,
                    callbacks: {
                        label: function(context) {
                            return `${context.dataset.label}: ${context.parsed.y.toLocaleString('pt-BR', { maximumFractionDigits: 2 })} km²`;
                        }
                    }
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    title: {
                        display: true,
                        text: 'Área (km²)',
                        font: { weight: 'bold' }
                    },
                    grid: { display: false },
                    ticks: {
                        callback: value => value.toLocaleString('pt-BR')
                    }
                },
                x: {
                    title: {
                        display: true,
                        text: 'Ano',
                        font: { weight: 'bold' }
                    },
                    grid: { display: false }
                }
            },
            animation: {
                duration: 1500,
                easing: 'easeInOutQuart'
            }
        }
    });
}




        // Função para atualizar o gráfico anual
        function updateYearlyChart(csvData) {
            const ctx = document.getElementById('yearlyChart').getContext('2d');
            if (yearlyChart) {
                yearlyChart.destroy();
            }
            const groupedData = {};
            // Agregar dados por ano
            const yearlyData = {};
            csvData.forEach(d => {
                const year = d.ANO;
                const area = parseFloat(d.AREAKM2) || 0;
                if (year) {
                    yearlyData[year] = (yearlyData[year] || 0) + area;
                }
            });

            // Preencher todos os anos de 2008 até o atual
            const currentYear = new Date().getFullYear();
            const years = [];
            for (let year = 2008; year <= currentYear-1; year++) {
                years.push(year);
            }

            const values = years.map(year => yearlyData[year] || 0);
            
            const dataType = getSelectedDataType();
            const bgColor = dataType === 'desmatamento' ? 'rgba(198, 40, 40, 0.7)' : 'rgba(255, 109, 0, 0.7)';
            const borderColor = dataType === 'desmatamento' ? 'rgba(198, 40, 40, 1)' : 'rgba(255, 109, 0, 1)';

            yearlyChart = new Chart(ctx, {
                plugins: [ChartDataLabels],
                type: 'bar',
                data: {
                    labels: years,
                    datasets: [{
                        label: 'Área Total (km²)',
                        data: values,
                        backgroundColor: bgColor,
                        borderColor: borderColor,
                        borderWidth: 1,
                        borderRadius: 4,
                        borderSkipped: false,
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
    legend: {
        display: false
    },
    datalabels: {
        anchor: 'end',
        align: 'top',
        color: '#333',
        font: {
            weight: 'bold',
            size: 11
        },
        formatter: value =>
            `${value.toLocaleString('pt-BR', { maximumFractionDigits: 2 })}`
    },
    tooltip: { backgroundColor: 'rgba(0, 0, 0, 0.8)',
                            titleColor: 'white',
                            bodyColor: 'white',
                            borderColor: borderColor,
                            borderWidth: 1,
                            callbacks: {
                                label: function(context) {
                                    return `Área: ${context.parsed.y.toLocaleString('pt-BR', { maximumFractionDigits: 2 })} km²`;
                                }
                            }
                        }
                    },
                    scales: {
                        y: {
                            beginAtZero: true,
                            title: {
                                display: true,
                                text: 'Área (km²)',
                                font: { weight: 'bold' }
                            },
                            grid: {
                                display: false
                            },
                            ticks: {
                                callback: function(value) {
                                    return value.toLocaleString('pt-BR');
                                }
                            }
                        },
                        x: {
                            title: {
                                display: true,
                                text: 'Ano',
                                font: { weight: 'bold' }
                            },
                            grid: {
                                display: false
                            }
                        }
                    },
                    animation: {
                        duration: 1200,
                        easing: 'easeInOutQuart'
                    }
                }
            });
        }

        // Função para atualizar o mapa
        function updateMap(geojsonData, aggregatedData, territoryType) {
            if (geoJsonLayer) {
                map.removeLayer(geoJsonLayer);
            }
            
            // Remover legenda anterior se existir
            if (legend) {
                legend.remove();
            }

            const nameKey = territoryNameMapping[territoryType];
            const values = Object.values(aggregatedData).filter(v => v > 0);
            const maxVal = values.length ? Math.max(...values) : 1;
            
            // Criar escala de cores
            const dataType = getSelectedDataType();
            const colorScale = d3.scaleSequential()
                .domain([0, maxVal])
                .interpolator(dataType === 'desmatamento' ? d3.interpolateReds : d3.interpolateOranges);


            // Filtrar apenas os territórios que estão no top 15
            const filteredGeojson = {
                ...geojsonData,
                features: geojsonData.features.filter(feature => {
                    const name = feature.properties[nameKey];
                    return currentTopTerritories.includes(feature.properties[nameKey]);

                })
            };

            // Resetar bounds
            territoryBounds = {};

            geoJsonLayer = L.geoJSON(filteredGeojson, {
                style: feature => {
                    const name = feature.properties[nameKey];
                    const value = aggregatedData[name] || 0;
                    return {
                        fillColor: colorScale(value),
                        weight: 1.2,
                        opacity: 1,
                        color: '#555',
                        fillOpacity: 0.75,
                        dashArray: territoryType === 'estados' || territoryType === 'municipios' ? '' : '3',
                    };
                },
                onEachFeature: (feature, layer) => {
                    const name = feature.properties[nameKey];
                    const value = aggregatedData[name] || 0;
                    const state = feature.properties.ESTADO || feature.properties.ESTADO1 || 'Não disponível';
                    const percentage = maxVal > 0 ? (value / maxVal * 100).toFixed(2) : 0;
                    
                    // Armazenar bounding box para zoom
                    territoryBounds[name] = layer.getBounds();
                    
                    // Popup com informações detalhadas
                    const rankPosition = currentTopTerritories.findIndex(t => t === name) + 1;
                    const popupContent = `
                        <div style="font-family: 'Montserrat', sans-serif; min-width: 200px;">
                            <h6 style="margin: 0 0 8px 0; color: #008055; font-weight: bold;">${name || 'Nome não disponível'}</h6>
                            <p style="margin: 0; font-size: 14px;">
                                <strong>Posição no Ranking:</strong> ${rankPosition}º<br>
                                <strong>Área:</strong> ${value.toLocaleString('pt-BR', { maximumFractionDigits: 2 })} km²
                            </p>
                        </div>
                    `;

                    
                    layer.bindPopup(popupContent);
                    
                    // Eventos de hover
                    layer.on({
                        mouseover: function(e) {
                            const layer = e.target;
                            layer.setStyle({
                                weight: 3,
                                color: '#000',
                                dashArray: '',
                                fillOpacity: 0.9
                            });
                            if (!L.Browser.ie && !L.Browser.opera && !L.Browser.edge) {
                                layer.bringToFront();
                            }

                            // Exibe popup ao passar o mouse
                            layer.openPopup();

                            selectedTerritoryEl.textContent = name || 'Território';
                            selectedAreaEl.textContent = value.toLocaleString('pt-BR', { maximumFractionDigits: 2 });
                            selectedStateEl.textContent = state;
                            selectedPercentageEl.textContent = percentage;
                            infoPanel.style.display = 'block';
                        },

                        mouseout: function(e) {
                            geoJsonLayer.resetStyle(e.target);
                            infoPanel.style.display = 'none';
                        },
                        click: function(e) {
                            map.fitBounds(e.target.getBounds(), {
                                padding: [50, 50],
                                animate: true,
                                duration: 1.5
                            });
                            e.target.openPopup(); // <-- aqui está a linha que exibe o popup ao clicar
                        }
                    });
                }
            }).addTo(map);

            // Adicionar legenda do mapa
            //addMapLegend(maxVal, colorScale);

            // Ajustar visualização do mapa
            if (geoJsonLayer.getBounds().isValid()) {
                map.fitBounds(geoJsonLayer.getBounds(), { padding: [20, 20] });
            }
        }

        // Função para adicionar legenda ao mapa
        
        const territoryNaming = {
            estados: { artigo: 'dos', nome: 'Estados', genero: 'm' },
            municipios: { artigo: 'dos', nome: 'Municípios', genero: 'm' },
            terrasIndigenas: { artigo: 'das', nome: 'Terras Indígenas', genero: 'f' },
            unidadesConservacao: { artigo: 'das', nome: 'Unidades de Conservação', genero: 'f' },
            assentamentos: { artigo: 'dos', nome: 'Assentamentos', genero: 'm' }
        };

        const dataTypeLabel = {
            desmatamento: { m: 'Mais Desmatados', f: 'Mais Desmatadas' },
            degradacao: { m: 'Mais Degradados', f: 'Mais Degradadas' }
        };
        const dataTypeFrase = {
            desmatamento: { artigo: 'do', preposicao: 'nos' },
            degradacao: { artigo: 'da', preposicao: 'nas' }
        };
        const territorySingular = {
            estados: 'Estado',
            municipios: 'Município',
            terrasIndigenas: 'Terra Indígena',
            unidadesConservacao: 'Unidade de Conservação',
            assentamentos: 'Assentamento'
        };

        function updateTitles() {
    const dataKey = getSelectedDataType();
    const territoryKey = getSelectedTerritoryType();

    const { artigo, nome, genero } = territoryNaming[territoryKey];
    const tipoLabel = dataTypeLabel[dataKey][genero];
    const singularNome = territorySingular[territoryKey];
    const dataLabel = dataKey === 'desmatamento' ? 'alertas de desmatamento' : 'alertas de degradação';

    function formatarPeriodo(ano, mes) {
        const meses = ["Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
                       "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"];
        return `${meses[parseInt(mes, 10) - 1]} de ${ano}`;
    }

    // pega valores dos selects (com fallback seguro)
    const startYearEl = document.getElementById('startYear');
    const startMonthEl = document.getElementById('startMonth');
    const endYearEl   = document.getElementById('endYear');
    const endMonthEl  = document.getElementById('endMonth');

    const startAno = startYearEl?.value || '2008';
    const startMes = startMonthEl?.value || '01';
    const endAno   = endYearEl?.value || String(new Date().getFullYear());
    const endMes   = endMonthEl?.value || '12';

    const startLabel = formatarPeriodo(startAno, startMes);
    const endLabel   = formatarPeriodo(endAno, endMes);

    // Título do ranking
    if (territoryKey === 'estados') {
        barChartTitle.innerHTML = `<i class="fas fa-chart-bar me-2"></i>Ranking ${artigo} ${nome} ${tipoLabel}`;
    } else {
        barChartTitle.innerHTML = `<i class="fas fa-chart-bar me-2"></i>Ranking ${artigo} 10 ${nome} ${tipoLabel}`;
    }

    // Título do mapa (período dinâmico)
    mapTitle.innerHTML = `<i class="fas fa-map me-2"></i>Mapa de ${dataLabel} por ${singularNome} (${startLabel} a ${endLabel})`;

    // Séries históricas (2008 até o ano passado)
    const fraseArtigo = dataTypeFrase[dataKey].artigo;
    const preposicao  = dataTypeFrase[dataKey].preposicao;
    const lastYear    = new Date().getFullYear() - 1;

    lineChartTitle.innerHTML   = `<i class="fas fa-chart-line me-2"></i>Série histórica ${fraseArtigo} ${dataKey} ${preposicao} ${nome} (2008 - ${lastYear})`;
    yearlyChartTitle.innerHTML = `<i class="fas fa-chart-area me-2"></i>Série histórica anual na Amazônia Legal ${fraseArtigo} ${dataKey} ${preposicao} ${nome} (2008 - ${lastYear})`;
}


        // Event Listeners para botões de filtro
        dataTypeButtons.forEach(btn => {
            btn.addEventListener('click', function() {
                // Remover classe 'active' de todos os botões do mesmo grupo
                dataTypeButtons.forEach(b => b.classList.remove('active'));
                
                // Adicionar classe 'active' ao botão clicado
                this.classList.add('active');
                
                // Atualizar dashboard
                updateSpecificFilters();
                updateDashboard();
            });
        });

        territoryTypeButtons.forEach(btn => {
            btn.addEventListener('click', function() {
                // Remover classe 'active' de todos os botões do mesmo grupo
                territoryTypeButtons.forEach(b => b.classList.remove('active'));
                
                // Adicionar classe 'active' ao botão clicado
                this.classList.add('active');
                
                // Atualizar dashboard
                updateSpecificFilters();
                updateDashboard();
            });
        });

        applyFiltersButton.addEventListener('click', updateDashboard);
        const clearFiltersButton = document.getElementById('clear-filters');
            clearFiltersButton.addEventListener('click', () => {
            // Limpar todos os filtros específicos, se existirem
            const selects = specificFiltersContent.querySelectorAll('select');
            selects.forEach(select => {
                if (select) select.value = 'all';
            });
        
            // Atualiza checkboxes do modal (se existirem)
            const checkboxes = document.querySelectorAll('.terra-checkbox');
            checkboxes.forEach(cb => cb.checked = false);
        
            // Atualiza resumo e contagem, se existirem
            const resumo = document.getElementById('terraSelecionadasResumo');
            const contagem = document.getElementById('contagemSelecionados');
            if (resumo) resumo.textContent = 'Nenhuma selecionada.';
            if (contagem) contagem.textContent = '0 selecionadas';
        
            // Atualizar dashboard com filtros limpos
            updateDashboard();
});




        // Função para atualizar os filtros específicos
        function updateSpecificFilters() {
            const territoryType = getSelectedTerritoryType();
            const dataType = getSelectedDataType();
            specificFiltersContent.innerHTML = '';

            if (dataType === 'desmatamento' || dataType === 'degradacao') {
                if (territoryType === 'assentamentos') {
                    specificFiltersContent.innerHTML = `
                        <div class="col-md-4">
                            <label for="stateFilter" class="form-label fw-bold">Filtrar por Estado:</label>
                            <select id="stateFilter" class="form-select">
                                <option value="all">Todos os Estados</option>
                                <option value="AC">Acre</option>
                                <option value="AP">Amapá</option>
                                <option value="AM">Amazonas</option>
                                <option value="MA">Maranhão</option>
                                <option value="MT">Mato Grosso</option>
                                <option value="PA">Pará</option>
                                <option value="RO">Rondônia</option>
                                <option value="RR">Roraima</option>
                                <option value="TO">Tocantins</option>
                            </select>
                        </div>`;
                    specificFiltersContainer.style.display = 'block';
                } 
                else if (dataType === 'desmatamento' && territoryType === 'estados') {
                    specificFiltersContent.innerHTML = `
                        <div class="col-md-4">
                            <label for="stateFilterEstados" class="form-label fw-bold">Filtrar por Estado:</label>
                            <select id="stateFilterEstados" class="form-select">
                                <option value="all">Todos os Estados</option>
                                <option value="AC">Acre</option>
                                <option value="AP">Amapá</option>
                                <option value="AM">Amazonas</option>
                                <option value="MA">Maranhão</option>
                                <option value="MT">Mato Grosso</option>
                                <option value="PA">Pará</option>
                                <option value="RO">Rondônia</option>
                                <option value="RR">Roraima</option>
                                <option value="TO">Tocantins</option>
                                <option value="RO/AM">RO/AM</option>
                                <option value="RO/AC">RO/AC</option>
                                <option value="AC/AM">AC/AM</option>
                            </select>
                        </div>`;
                    specificFiltersContainer.style.display = 'block';
                }
                else if (territoryType === 'municipios') {
    specificFiltersContent.innerHTML = `
        <div class="col-md-4">
            <label for="stateFilterMunicipios" class="form-label fw-bold">Filtrar por Estado:</label>
            <select id="stateFilterMunicipios" class="form-select">
                <option value="all">Todos os Estados</option>
                <option value="AC">Acre</option>
                <option value="AP">Amapá</option>
                <option value="AM">Amazonas</option>
                <option value="MA">Maranhão</option>
                <option value="MT">Mato Grosso</option>
                <option value="PA">Pará</option>
                <option value="RO">Rondônia</option>
                <option value="RR">Roraima</option>
                <option value="TO">Tocantins</option>
            </select>
        </div>
        <div class="col-md-4">
            <label for="municipioFilter" class="form-label fw-bold">Filtrar por Município:</label>
            <select id="municipioFilter" class="form-select">
                <option value="all">Todos os Municípios</option>
            </select>
        </div>`;

    specificFiltersContainer.style.display = 'block';

    // Espera o CSV estar carregado para popular dinamicamente
    setTimeout(async () => {
        const estadoSelect = document.getElementById('stateFilterMunicipios');
        const municipioSelect = document.getElementById('municipioFilter');

        const dataType = getSelectedDataType();
        const territoryType = 'municipios';
        const csvPath = dataSources[dataType][territoryType].csv;
        const csvData = await d3.csv(csvPath);

        estadoSelect.addEventListener('change', () => {
            const estadoSelecionado = estadoSelect.value;
            const municipiosFiltrados = new Set();

            csvData.forEach(d => {
                if (estadoSelecionado === 'all' || d.ESTADO === estadoSelecionado) {
                    municipiosFiltrados.add(d.MUNICIPIO);
                }
            });

            municipioSelect.innerHTML = '<option value="all">Todos os Municípios</option>';
            Array.from(municipiosFiltrados).sort().forEach(mun => {
                const opt = document.createElement('option');
                opt.value = mun;
                opt.textContent = mun;
                municipioSelect.appendChild(opt);
            });
        });

        // Disparar evento para preencher ao abrir
        estadoSelect.dispatchEvent(new Event('change'));
    }, 0);
}

               else if (territoryType === 'terrasIndigenas') {
    specificFiltersContent.innerHTML = `
        <div class="col-md-6">
            <label for="stateFilterTerrasIndigenas" class="form-label fw-bold">Filtrar por Estado:</label>
            <select id="stateFilterTerrasIndigenas" class="form-select">
                <option value="all">Todos os Estados</option>
                <option value="AC">Acre</option>
                <option value="AP">Amapá</option>
                <option value="AM">Amazonas</option>
                <option value="MA">Maranhão</option>
                <option value="MT">Mato Grosso</option>
                <option value="PA">Pará</option>
                <option value="RO">Rondônia</option>
                <option value="RR">Roraima</option>
                <option value="TO">Tocantins</option>
            </select>
        </div>
        <div class="col-md-6">
            <label class="form-label fw-bold">Selecionar Terras Indígenas:</label><br>
            <button class="btn btn-outline-primary" data-bs-toggle="modal" data-bs-target="#terraModal">Selecionar Terras</button>
            <div id="terraSelecionadasResumo" class="mt-2 small text-muted">Nenhuma selecionada.</div>
        </div>

        <!-- Modal -->
<div class="modal fade" id="terraModal" tabindex="-1" aria-labelledby="terraModalLabel" aria-hidden="true">
  <div class="modal-dialog modal-dialog-scrollable modal-lg">
    <div class="modal-content">
      <div class="modal-header">
        <h5 class="modal-title" id="terraModalLabel">Selecione até 10 Terras Indígenas</h5>
        <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Fechar"></button>
      </div>
      <div class="modal-body">
        <input type="text" id="terraSearchInput" class="form-control mb-3" placeholder="Pesquisar por nome da terra...">
        <div id="checkboxContainer" class="row"></div>
      </div>
      <div class="modal-footer">
        <small class="text-muted me-auto" id="contagemSelecionados">0 selecionadas</small>
        <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Fechar</button>
      </div>
    </div>
  </div>
</div>

    `;
    specificFiltersContainer.style.display = 'block';

    // Aguarda para carregar terras
    setTimeout(async () => {
        const estadoSelect = document.getElementById('stateFilterTerrasIndigenas');
        const container = document.getElementById('checkboxContainer');
        const resumoSelecionadas = document.getElementById('terraSelecionadasResumo');
        const contagemEl = document.getElementById('contagemSelecionados');

        const csvPath = dataSources[getSelectedDataType()].terrasIndigenas.csv;
        const csvData = await d3.csv(csvPath);

        
        let terrasDisponiveis = [];
        let terrasFiltradas = [];
        function drawCheckboxes(lista) {
    container.innerHTML = '';
    lista.forEach(nome => {
        const col = document.createElement('div');
        col.className = 'col-md-4 mb-2';
        col.innerHTML = `
            <div class="form-check">
                <input class="form-check-input terra-checkbox" type="checkbox" value="${nome}" id="${nome}">
                <label class="form-check-label" for="${nome}">${nome}</label>
            </div>`;
        container.appendChild(col);
    });

    // Lógica de limite
    const checkboxes = container.querySelectorAll('.terra-checkbox');
    checkboxes.forEach(cb => {
        cb.addEventListener('change', () => {
            const selecionados = container.querySelectorAll('.terra-checkbox:checked');
            if (selecionados.length > 10) {
                cb.checked = false;
                alert('Você só pode selecionar até 10 terras.');
            }
            updateContagem();
        });
    });

    updateContagem();
}

        function renderCheckboxes(estadoSelecionado = 'all') {
            

            const nomes = new Set();
            container.innerHTML = '';
            csvData.forEach(d => {
                if (estadoSelecionado === 'all' || d.ESTADO === estadoSelecionado) {
                    nomes.add(d.TERRA_INDI);
                }
            });

            terrasDisponiveis = Array.from(nomes).sort();
            terrasFiltradas = [...terrasDisponiveis]; // inicia com todas

            drawCheckboxes(terrasFiltradas);

            terrasDisponiveis.forEach(nome => {
                const col = document.createElement('div');
                col.className = 'col-md-4 mb-2';
                col.innerHTML = `
                    <div class="form-check">
                        <input class="form-check-input terra-checkbox" type="checkbox" value="${nome}" id="${nome}">
                        <label class="form-check-label" for="${nome}">${nome}</label>
                    </div>`;
                container.appendChild(col);
            });

            // Limitar seleção
            const checkboxes = container.querySelectorAll('.terra-checkbox');
            checkboxes.forEach(cb => {
                cb.addEventListener('change', () => {
                    const selecionados = container.querySelectorAll('.terra-checkbox:checked');
                    if (selecionados.length > 10) {
                        cb.checked = false;
                        alert('Você só pode selecionar até 10 terras.');
                    }
                    updateContagem();
                });
            });

            updateContagem();
        }

        function updateContagem() {
            const selecionados = container.querySelectorAll('.terra-checkbox:checked');
            contagemEl.textContent = `${selecionados.length} selecionadas`;
            resumoSelecionadas.textContent = selecionados.length
                ? Array.from(selecionados).map(el => el.value).join(', ')
                : 'Nenhuma selecionada.';
        }

        estadoSelect.addEventListener('change', () => {
            renderCheckboxes(estadoSelect.value);
        });

        renderCheckboxes('all');
        const searchInput = document.getElementById('terraSearchInput');
searchInput.addEventListener('input', () => {
    const termo = searchInput.value.trim().toLowerCase();
    const filtradas = terrasDisponiveis.filter(nome =>
        nome.toLowerCase().includes(termo)
    );
    drawCheckboxes(filtradas);
});

    }, 0);
}


                else if (territoryType === 'unidadesConservacao') {
                    specificFiltersContent.innerHTML = `
                        <div class="col-md-3">
                            <label for="stateFilterUC" class="form-label fw-bold">Filtrar por Estado:</label>
                            <select id="stateFilterUC" class="form-select">
                                <option value="all">Todos os Estados</option>
                                <option value="AC">Acre</option>
                                <option value="AP">Amapá</option>
                                <option value="AM">Amazonas</option>
                                <option value="MA">Maranhão</option>
                                <option value="MT">Mato Grosso</option>
                                <option value="PA">Pará</option>
                                <option value="RO">Rondônia</option>
                                <option value="RR">Roraima</option>
                                <option value="TO">Tocantins</option>
                            </select>
                        </div>
                        <div class="col-md-3">
                            <label for="jurisdicaoFilter" class="form-label fw-bold">Filtrar por Jurisdição:</label>
                            <select id="jurisdicaoFilter" class="form-select">
                                <option value="all">Todas</option>
                                <option value="Federal">Federal</option>
                                <option value="Estadual">Estadual</option>
                            </select>
                        </div>
                        <div class="col-md-3">
                            <label for="modalidadeFilter" class="form-label fw-bold">Filtrar por Modalidade:</label>
                            <select id="modalidadeFilter" class="form-select">
                                <option value="all">Todas</option>
                                <option value="Uso Sustentável">Uso Sustentável</option>
                                <option value="Proteção Integral">Proteção Integral</option>
                            </select>
                        </div>`;
                    specificFiltersContainer.style.display = 'block';
                }
                else {
                    specificFiltersContainer.style.display = 'none';
                }
            }
            else {
                specificFiltersContainer.style.display = 'none';
            }
        }

        // Inicialização
        updateSpecificFilters();
        updateDashboard();
    });