let sensorChart = null
let datasetVisibility = {}

function formatTimestamp(timestamp) {
    const date = new Date(timestamp)
    const day = String(date.getDate()).padStart(2, '0')
    const month = String(date.getMonth() + 1).padStart(2, '0')
    const year = date.getFullYear()
    const hours = String(date.getHours()).padStart(2, '0')
    const minutes = String(date.getMinutes()).padStart(2, '0')
    const seconds = String(date.getSeconds()).padStart(2, '0')
    return `${day}/${month}/${year}, ${hours}:${minutes}:${seconds}`
}

function getPinStatus(pinValue, isMonitored) {
    return isMonitored ? pinValue : -1
}

function toggleColumnVisibility() {
    const monitorPin0 = document.getElementById('monitorPin0').checked
    const monitorPin2 = document.getElementById('monitorPin2').checked
    const monitorPin3 = document.getElementById('monitorPin3').checked
    const monitorPin7 = document.getElementById('monitorPin7').checked
    const monitorPin8 = document.getElementById('monitorPin8').checked

    document.querySelectorAll('.pin0').forEach(cell => cell.style.display = monitorPin0 ? '' : 'none')
    document.querySelectorAll('.pin2').forEach(cell => cell.style.display = monitorPin2 ? '' : 'none')
    document.querySelectorAll('.pin3').forEach(cell => cell.style.display = monitorPin3 ? '' : 'none')
    document.querySelectorAll('.pin7').forEach(cell => cell.style.display = monitorPin7 ? '' : 'none')
    document.querySelectorAll('.pin8').forEach(cell => cell.style.display = monitorPin8 ? '' : 'none')
}
async function fetchSensorData(sitename) {
    const response = await fetch(`/sensors/top10?sitename=${sitename}`)
    if (!response.ok) {
        throw new Error('Failed to fetch sensor data')
    }
    const data = await response.json()

    const tbody = document.getElementById('sensorData')
    tbody.innerHTML = ''

    const monitorPin0 = document.getElementById('monitorPin0').checked
    const monitorPin2 = document.getElementById('monitorPin2').checked
    const monitorPin3 = document.getElementById('monitorPin3').checked
    const monitorPin7 = document.getElementById('monitorPin7').checked
    const monitorPin8 = document.getElementById('monitorPin8').checked

    data.forEach((sensor, index) => {
        const row = document.createElement('tr')
        if (index < 5) {
            row.classList.add('highlight')
        }

        const pin0Status = getPinStatus(sensor.pin0, monitorPin0)
        const pin2Status = getPinStatus(sensor.pin2, monitorPin2)
        const pin3Status = getPinStatus(sensor.pin3, monitorPin3)
        const pin7Status = getPinStatus(sensor.pin7, monitorPin7)
        const pin8Status = getPinStatus(sensor.pin8, monitorPin8)

        const isCritical = [pin0Status, pin2Status, pin3Status, pin7Status, pin8Status].some(pin => pin === 0)

        if (isCritical) {
            row.classList.add('status-critical')
        } else if (sensor.status === 2) {
            row.classList.add('status-info')
        } else {
            row.classList.add('status-ok')
        }

        row.innerHTML = `
            <td class="border px-4 py-2">${sensor.sensorID}</td>
            <td class="border px-4 py-2">${formatTimestamp(sensor.timestamp)}</td>
            <td class="border px-4 py-2">${isCritical ? 1 : sensor.status}</td>
            <td class="border px-4 py-2 pin0 ${pin0Status === 1 ? 'bg-green-500' : 'bg-red-500'}">${pin0Status === 1 ? 'ON' : 'OFF'}</td>
            <td class="border px-4 py-2 pin2 ${pin2Status === 1 ? 'bg-green-500' : 'bg-red-500'}">${pin2Status === 1 ? 'ON' : 'OFF'}</td>
            <td class="border px-4 py-2 pin3 ${pin3Status === 1 ? 'bg-green-500' : 'bg-red-500'}">${pin3Status === 1 ? 'ON' : 'OFF'}</td>
            <td class="border px-4 py-2 pin7 ${pin7Status === 1 ? 'bg-green-500' : 'bg-red-500'}">${pin7Status === 1 ? 'ON' : 'OFF'}</td>
            <td class="border px-4 py-2 pin8 ${pin8Status === 1 ? 'bg-green-500' : 'bg-red-500'}">${pin8Status === 1 ? 'ON' : 'OFF'}</td>
        `
        tbody.appendChild(row)
    })
    toggleColumnVisibility()
}

async function fetchPinSettings() {
    const sitename = document.getElementById('deviceSelect').value
    const settings = await getCurrentPinSettings()
    const deviceSettings = settings[sitename] || {
        monitorPin0: true,
        monitorPin2: true,
        monitorPin3: true,
        monitorPin7: true,
        monitorPin8: true
    }
    document.getElementById('monitorPin0').checked = deviceSettings.monitorPin0
    document.getElementById('monitorPin2').checked = deviceSettings.monitorPin2
    document.getElementById('monitorPin3').checked = deviceSettings.monitorPin3
    document.getElementById('monitorPin7').checked = deviceSettings.monitorPin7
    document.getElementById('monitorPin8').checked = deviceSettings.monitorPin8

    toggleColumnVisibility()
}

async function updatePinSettings() {
    const sitename = document.getElementById('deviceSelect').value
    const allSettings = await getCurrentPinSettings()
    const newSiteSettings = {
        monitorPin0: document.getElementById('monitorPin0').checked,
        monitorPin2: document.getElementById('monitorPin2').checked,
        monitorPin3: document.getElementById('monitorPin3').checked,
        monitorPin7: document.getElementById('monitorPin7').checked,
        monitorPin8: document.getElementById('monitorPin8').checked
    }
    
    const updatedSettings = {
        ...allSettings,
        [sitename]: newSiteSettings
    }

    const response = await fetch('/pinSettings', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(updatedSettings)
    })
    fetchSensorData(sitename)
    await updateChart()
    toggleColumnVisibility()
}

async function updateChart(limit = 40) {
    const sitename = document.getElementById('deviceSelect').value
    const response = await fetch(`/sensors/history/${limit}?sitename=${sitename}`)
    const data = await response.json()

    const monitorPin0 = document.getElementById('monitorPin0').checked
    const monitorPin2 = document.getElementById('monitorPin2').checked
    const monitorPin3 = document.getElementById('monitorPin3').checked
    const monitorPin7 = document.getElementById('monitorPin7').checked
    const monitorPin8 = document.getElementById('monitorPin8').checked

    const timestamps = data.map(record => formatTimestamp(record.timestamp))
    const datasets = []

    const pinConfigs = [
        { enabled: monitorPin0, label: 'Pin 0', key: 'pin0', color: 'rgb(75, 192, 192)' },
        { enabled: monitorPin2, label: 'Pin 2', key: 'pin2', color: 'rgb(255, 99, 132)' },
        { enabled: monitorPin3, label: 'Pin 3', key: 'pin3', color: 'rgb(255, 205, 86)' },
        { enabled: monitorPin7, label: 'Pin 7', key: 'pin7', color: 'rgb(54, 162, 235)' },
        { enabled: monitorPin8, label: 'Pin 8', key: 'pin8', color: 'rgb(153, 102, 255)' }
    ]

    pinConfigs.forEach(config => {
        if (config.enabled) {
            datasets.push({
                label: config.label,
                data: data.map(record => record[config.key] === 1 ? 1 : 0),
                borderColor: config.color,
                fill: false,
                tension: 0.1,
                hidden: datasetVisibility[config.label] === false
            })
        }
    })

    if (sensorChart) {
        sensorChart.data.labels = timestamps
        sensorChart.data.datasets = datasets
        sensorChart.update('none') 
    } else {
       
        sensorChart = new Chart(document.getElementById('sensorChart'), {
            type: 'line',
            data: {
                labels: timestamps,
                datasets: datasets,
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                animation: false,
                scales: {
                    y: {
                        min: -0.5,
                        max: 1.5,
                        ticks: {
                            stepSize: 1,
                            callback: function(value) {
                                return value === 1 ? 'High' : 'Low'
                            }
                        },
                        title: {
                            display: true,
                            text: 'Status'
                        }
                    },
                },
                plugins: {
                    tooltip: {
                        mode: 'index',
                        intersect: false,
                        callbacks: {
                            label: function(context) {
                                return `${context.dataset.label}: ${context.raw === 1 ? 'On' : 'Off'}`
                            }
                        }
                    },
                    legend: {
                        onClick: (e, legendItem, legend) => {
                            const index = legendItem.datasetIndex
                            const chart = legend.chart
                            const datasetLabel = chart.data.datasets[index].label

                            datasetVisibility[datasetLabel] = !datasetVisibility[datasetLabel]
                            chart.update()
                        }
                    }
                }
            }
        })
    }
}


async function fetchSites() {
    const response = await fetch('/pinSettings')
    const settings = await response.json()

    const deviceSelect = document.getElementById('deviceSelect')
    const currentSites = Array.from(deviceSelect.options).map(option => option.value)

    Object.keys(settings).forEach(site => {
        if (!currentSites.includes(site)) {
            const option = document.createElement('option')
            option.value = site
            option.textContent = site
            deviceSelect.appendChild(option)
        }
    })
}


async function getCurrentPinSettings() {
    const response = await fetch('/pinSettings')
    const settings = await response.json()
    return settings
}


document.addEventListener('DOMContentLoaded', () => {
    const deviceSelect = document.getElementById('deviceSelect')
    const timeRange = document.getElementById('timeRange')

    setInterval(fetchSites, 1000)

    deviceSelect.addEventListener('change', async () => {
        await fetchPinSettings()
        await fetchSensorData(deviceSelect.value)
        await updateChart(timeRange.value)
    })

    timeRange.addEventListener('change', async () => {
        await updateChart(timeRange.value)
    })

    const pinCheckboxes = ['monitorPin0', 'monitorPin2', 'monitorPin3', 'monitorPin7', 'monitorPin8']
    pinCheckboxes.forEach(id => {
        document.getElementById(id).addEventListener('change', async () => {
            await updatePinSettings()
        })
    })

    
    setInterval(async () => {
        await fetchSensorData(deviceSelect.value)  
    }, 10000)

    fetchSites()
    fetchPinSettings()
   fetchSensorData(deviceSelect.value)
})
