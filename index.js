const express = require('express')
const sqlite3 = require('sqlite3').verbose()
const path = require('path')
const fs = require('fs')

const app = express()
app.use(express.json())
app.use(express.static(path.join(__dirname, 'public')))


let statusInterval = 5
let checkInterval = 10

function getDatabase(sitename) {
    const dbPath = `./Database/${sitename}_sensors.db`
    if (!fs.existsSync(dbPath)) {
        const db = new sqlite3.Database(dbPath)
        db.serialize(() => {
            db.run(`CREATE TABLE IF NOT EXISTS sensors (
                sensorID INTEGER PRIMARY KEY AUTOINCREMENT,
                timestamp TEXT,
                status INTEGER,
                pin0 REAL,
                pin2 REAL,
                pin3 REAL,
                pin7 REAL,
                pin8 REAL
            )`)
        })
        return db
    }
    return new sqlite3.Database(dbPath)
}

function loadPinSettings() {
    const data = fs.readFileSync('./pinSettings.json', 'utf8')
    return JSON.parse(data)
}

function savePinSettings(settings) {
    try {
        fs.writeFileSync('./pinSettings.json', JSON.stringify(settings, null, 2))
    } catch (error) {
        console.error(error)
    }
}

let pinSettings = loadPinSettings()

app.post('/sensors', (req, res) => {
    const { sitename, timestamp, status, pin0, pin2, pin3, pin7, pin8 } = req.body
    const db = getDatabase(sitename)

    if (!pinSettings[sitename]) {
        pinSettings[sitename] = {
            monitorPin0: true,
            monitorPin2: true,
            monitorPin3: true,
            monitorPin7: true,
            monitorPin8: true
        }
        savePinSettings(pinSettings)
    }

    const settings = pinSettings[sitename]
    const adjustedPin0 = settings.monitorPin0 ? pin0 : -1
    const adjustedPin2 = settings.monitorPin2 ? pin2 : -1
    const adjustedPin3 = settings.monitorPin3 ? pin3 : -1
    const adjustedPin7 = settings.monitorPin7 ? pin7 : -1
    const adjustedPin8 = settings.monitorPin8 ? pin8 : -1

    const monitoredPins = [
        settings.monitorPin0 ? adjustedPin0 : null,
        settings.monitorPin2 ? adjustedPin2 : null,
        settings.monitorPin3 ? adjustedPin3 : null,
        settings.monitorPin7 ? adjustedPin7 : null,
        settings.monitorPin8 ? adjustedPin8 : null
    ].filter(pin => pin !== null)

    const allMonitoredPinsOn = monitoredPins.length > 0 && monitoredPins.every(pin => pin === 1)
    const finalStatus = allMonitoredPinsOn ? 2 : status

    db.all(
        'SELECT status FROM sensors ORDER BY timestamp DESC LIMIT 5',
        [],
        (err, rows) => {
            if (err) {
                res.status(500).send(err.message)
                return
            }

            const allSystemOk = rows.length === 5 && rows.every((row) => row.status === 2)

            if (allSystemOk && finalStatus === 2) {
                db.run(
                    `UPDATE sensors SET 
                    timestamp=?, status=?, pin0=?, pin2=?, pin3=?, pin7=?, pin8=?
                    WHERE timestamp = (SELECT MAX(timestamp) FROM sensors)`,
                    [
                        timestamp,
                        finalStatus,
                        adjustedPin0,
                        adjustedPin2,
                        adjustedPin3,
                        adjustedPin7,
                        adjustedPin8
                    ],
                    function (err) {
                        if (err) {
                            res.status(500).send(err.message)
                            return
                        }
                        res.status(200).json({ message: 'Record updated' })
                    }
                )
            } else {
                db.run(
                    'INSERT INTO sensors (timestamp, status, pin0, pin2, pin3, pin7, pin8) VALUES (?, ?, ?, ?, ?, ?, ?)',
                    [
                        timestamp,
                        finalStatus,
                        adjustedPin0,
                        adjustedPin2,
                        adjustedPin3,
                        adjustedPin7,
                        adjustedPin8
                    ],
                    function (err) {
                        if (err) {
                            res.status(500).send(err.message)
                            return
                        }
                        res.status(201).json({ sensorID: this.lastID })
                    }
                )
            }
        }
    )
})


app.get('/sensors/top10', (req, res) => {
    const { sitename } = req.query
    const db = getDatabase(sitename)
    
    db.all(
        'SELECT * FROM sensors ORDER BY timestamp DESC LIMIT 10',
        [],
        (err, rows) => {
            if (err) {
                res.status(500).send(err.message)
                return
            }
            db.close((err) => {
                if (err) console.error('Error closing database:', err)
            })
            res.status(200).json(rows)
        }
    )
})

app.get('/sensors/history/:limit', (req, res) => {
    const { sitename } = req.query
    const limit = parseInt(req.params.limit) || 20
    const db = getDatabase(sitename)
    db.all(
        'SELECT * FROM sensors ORDER BY timestamp DESC LIMIT ?',
        [limit],
        (err, rows) => {
            if (err) {
                res.status(500).send(err.message)
                return
            }
            res.status(200).json(rows.reverse())
        }
    )
})

//TODO porbs remove this like it can be done with system state
app.post('/system/state', (req, res) => {
    const { state } = req.body
    if (state === 0 || state === 1 || state === 2) {
        systemState = state
        res.status(200).json({ message: 'System state updated successfully' })
        resetStateTimer() 
    } else {
        res.status(400).json({ message: 'Invalid state value' })
    }
})

app.get('/system/state', (req, res) => {
    res.json({ state: systemState })
})

app.get('/pinSettings', (req, res) => {
    res.json(pinSettings)
})

app.post('/pinSettings', (req, res) => {
    pinSettings = req.body
    savePinSettings(pinSettings)
    res.status(200).json({ message: 'Pin Settings updated successfully' })
})

let lastCheckTime = Date.now()

app.post('/check', (req, res) => {
    lastCheckTime = Date.now()
    res.json({ status: "✓" })
})

// TODO: actually do something with this i keep forgetting todo anything with it but its kinda needed 
app.get('/health', (req, res) => {
    const timeSinceLastCheck = Date.now() - lastCheckTime
    const isOnline = timeSinceLastCheck < (statusInterval + 5) * 1000

    res.json({
        status: isOnline,
        settings: {
            checkInterval: checkInterval,
            statusInterval: statusInterval
        },
        lastCheck: lastCheckTime,
        timeSince: timeSinceLastCheck
    })
})
const PORT = 4000
app.listen(PORT, () => {
    console.log(`Power Monitor API running on port ${PORT}`)
})
