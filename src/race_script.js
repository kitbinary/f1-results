document.getElementById('fetchResults').addEventListener('click', async () => {
    const inputUrl = document.getElementById('urlInput').value.trim();

    if (!inputUrl) {
        alert("Please enter a URL.");
        return;
    }

    // Use the input URL and replace "race-result" with "starting-grid" for the grid data
    const raceResultsUrl = inputUrl;
    const startingGridUrl = inputUrl.replace('race-result', 'starting-grid');
    const pitStopUrl = inputUrl.replace('race-result', 'pit-stop-summary');
    
    const proxyUrl = 'https://api.allorigins.win/raw?url='

    try {
        // Fetch both race results and starting grid data
        const [raceResultsResponse, startingGridResponse, pitStopResponse] = await Promise.all([
            fetch(`${proxyUrl}${encodeURIComponent(raceResultsUrl)}`),
            fetch(`${proxyUrl}${encodeURIComponent(startingGridUrl)}`),
            fetch(`${proxyUrl}${encodeURIComponent(pitStopUrl)}`)
        ]);

        // Check if the responses are OK
        if (!raceResultsResponse.ok) {
            console.error('Failed to fetch race results:', raceResultsResponse.status, raceResultsResponse.statusText);
            alert("Failed to fetch race results.");
            return;
        }

        if (!startingGridResponse.ok) {
            console.error('Failed to fetch starting grid:', startingGridResponse.status, startingGridResponse.statusText);
            alert("Failed to fetch starting grid.");
            return;
        }

        if (!pitStopResponse.ok) {
            console.error('Failed to fetch pit stop summary:', pitStopResponse.status, pitStopResponse.statusText);
            alert("Failed to fetch pit stop summary.");
            return;
        }

        const raceResultsHtml = await raceResultsResponse.text();
        const startingGridHtml = await startingGridResponse.text();
        const pitStopHtml = await pitStopResponse.text();

        const parser = new DOMParser();
        const resultsTable = parser.parseFromString(raceResultsHtml, 'text/html').querySelector('.f1-table.f1-table-with-data.w-full');
        const gridTable = parser.parseFromString(startingGridHtml, 'text/html').querySelector('.f1-table.f1-table-with-data.w-full');
        const pitStopTable = parser.parseFromString(pitStopHtml, 'text/html').querySelector('.f1-table.f1-table-with-data.w-full');

        if (!resultsTable || !gridTable) {
            alert("One or more tables not found.");
            console.log("Results table found:", !!resultsTable);
            console.log("Grid table found:", !!gridTable);
            console.log("Pit stop table found:", !!pitStopTable);
            return;
        }
        
        // Get grid positions
        const gridPositions = {};
        const gridRows = gridTable.querySelectorAll('tbody tr');
        gridRows.forEach(row => {
            const columns = row.querySelectorAll('td');
            if (columns.length === 0) return;

            let driverName = columns[2].textContent.trim().slice(0, -3).replace(/\u00A0/, " ");
            gridPositions[driverName] = columns[0].textContent.trim();
        });

        // Get pit stops
        const pitStopCount = {};
        const pitRows = pitStopTable.querySelectorAll('tbody tr');
        pitRows.forEach(row => {
            const columns = row.querySelectorAll('td');
            if (columns.length === 0) return;

            let driverName = columns[2].textContent.trim().slice(0, -3).replace(/\u00A0/, " ");
            pitStopCount[driverName] = columns[0].textContent.trim();
        });

        const rows = resultsTable.querySelectorAll('tbody tr');
        let lastDriverGapTime = null;
        let resultsText = '';
        let interval = '';

        const teamCodes = {
            "mer": "Mercedes",
            "fer": "Ferrari",
            "rbr": "Red Bull Racing Honda RBPT",
            "mcl": "McLaren Mercedes",
            "amr": "Aston Martin Aramco Mercedes",
            "wil": "Williams Mercedes",
            "haas": "Haas Ferrari",
            "alp": "Alpine Renault",
            "stake": "Kick Sauber Ferrari",
            "alfa": "Alfa Romeo Ferrari",
            "at": "AlphaTauri Honda RBPT",
            "amr": "Aston Martin Mercedes",
            "rp": "Racing Point BWT Mercedes",
            "renault": "Renault"
        };

        const driversFlags = {
            "Lewis Hamilton": "uk",
            "George Russell": "uk",
            "Charles Leclerc": "mc",
            "Oscar Piastri": "au",
            "Lando Norris": "uk",
            "Max Verstappen": "nl",
            "Carlos Sainz": "es",
            "Alexander Albon": "th",
            "Franco Colapinto": "ag",
            "Nico Hulkenberg": "de",
            "Fernando Alonso": "es",
            "Daniel Ricciardo": "au",
            "Yuki Tsunoda": "jp",
            "Pierre Gasly": "fr",
            "Lance Stroll": "ca",
            "Kevin Magnussen": "dk",
            "Esteban Ocon": "fr",
            "Sergio Perez": "mx",
            "Valtteri Bottas": "fi",
            "Zhou Guanyu": "cn",
            "Logan Sargeant": "us",
            "Andrea Kimi Antonelli": "it",
            "Nyck De Vries": "nl",
            "Liam Lawson": "nz",
            "Sebastian Vettel": "de",
            "Mick Schumacher": "de",
            "Robert Kubica": "pl",
            "Kimi Räikkönen": "fi",
            "Antonio Giovinazzi": "it",
            "Nikita Mazepin": "ru",
            "Nicholas Latifi": "ca",
            "Jack Aitken": "uk",
            "Pietro Fittipaldi": "br",
            "Romain Grosjean": "fr",
            "Daniil Kvyat": "ru"
        };

        function timeToSeconds(timeStr) {
            if (!timeStr || !timeStr.includes(':')) {
                console.warn('Invalid time format:', timeStr);
                return 0;
            }

            const parts = timeStr.split(':');
            if (parts.length < 2) {
                console.warn('Unexpected time format:', timeStr);
                return 0;
            }

            const minutes = parseInt(parts[0], 10);
            const seconds = parseFloat(parts[1].replace(',', '.'));
            return minutes * 60 + seconds;
        }

        function parseGapTime(gapStr) {
            const match = gapStr.match(/([+-]?\d*\.?\d+)s?/);
            return match ? parseFloat(match[1].replace(',', '.')) : 0;
        }

        function formatInterval(seconds) {
            if (isNaN(seconds) || seconds <= 0) return '';
            return `+${seconds.toFixed(3)}`;
        }

        // Process results table
        rows.forEach((row, index) => {
            const columns = row.querySelectorAll('td');
            if (columns.length === 0) return;

            const data = Array.from(columns).map(col => col.textContent.trim());

            const position = data[0];
            let driverName = data[2].replace('\xa0', ' ').trim().slice(0, -3);
            const teamCode = data[3];
            let gap = data[5];
            const points = data[6];

            const teamKey = Object.keys(teamCodes).find(key => teamCodes[key] === teamCode);
            const teamCodeDisplay = teamKey ? teamKey.toLowerCase() : '';

            const flag = driversFlags[driverName] || "";

            const gapSeconds = parseGapTime(gap);

            // Interval and Gap calculations
            if (index === 0) { // First driver
                firstDriverGapTime = timeToSeconds(gap);
                interval = '-';
            } else if (index === 1) { // Second driver
                lastDriverGapTime = (gapSeconds).toFixed(3);
                interval = '+' + lastDriverGapTime;
                
                // Remove the trailing 's' from gap if it exists
                gap = gap.replace('s', '');
            }
            else {
                if (gap.includes('lap')) {
                    interval = '';
                } else {
                    // Subtract the last drivers gap from the current and format for display
                    interval = '+' + Math.abs((lastDriverGapTime - gapSeconds)).toFixed(3);
                    lastDriverGapTime = gapSeconds;
                    
                    // Remove the trailing 's' from gap if it exists
                    gap = gap.replace('s', '');
                }
            }

            const gridPosition = gridPositions[driverName] || '-';
            const gain = gridPosition !== '-' ? parseInt(gridPosition) - parseInt(position) : '-';
            const formattedGain = gain !== '-' && gain > 0 ? `+${gain}` : gain;
            
            const pits = pitStopCount[driverName] || '-';

            const resultLine = `|{{RaceResults/Row|pos=${position}` +
                                ` |driver=${driverName}` +
                                ` |flag=${flag}` +
                                ` |team=${teamCodeDisplay}` +
                                ` |grid=${gridPosition}` +
                                ` |gain=${formattedGain}` +
                                ` |gap=${gap.toUpperCase()}` +
                                ` |pits=${pits}` +
                                ` |points=${points}\n` +
                                `|interval=${interval}` +
                                ` |tyres=\n}}\n`;
            resultsText += resultLine;
        });

        document.getElementById('resultsOutput').textContent = resultsText;

    } catch (error) {
        alert("Failed to fetch results.");
        console.error('Fetch error:', error);
    }
});

// Add event listener for the "Select All" button
document.getElementById('selectAll').addEventListener('click', () => {
    const resultsOutput = document.getElementById('resultsOutput');
    const range = document.createRange();
    range.selectNode(resultsOutput);
    const sel = window.getSelection();
    sel.removeAllRanges();
    sel.addRange(range);
});
