document.getElementById('fetchResults').addEventListener('click', async () => {
    const url = document.getElementById('urlInput').value;

    if (!url) {
        alert("Please enter a URL.");
        return;
    }

    try {
        const response = await fetch(`https://api.allorigins.win/raw?url=${encodeURIComponent(url)}`);
        const html = await response.text();

        const parser = new DOMParser();
        const doc = parser.parseFromString(html, 'text/html');

        const resultsTable = doc.querySelector('.f1-table.f1-table-with-data');
        if (!resultsTable) {
            alert("Results table not found.");
            return;
        }

        const rows = resultsTable.querySelectorAll('tbody tr');
        let previousBestLapSeconds = null;
        let resultsText = '';

        // Flipped team codes dictionary
        const teamCodes = {
            "mer": "Mercedes",
            "fer": "Ferrari",
            "rbr": "Red Bull Racing Honda RBPT",
            "mcl": "McLaren Mercedes",
            "amr": "Aston Martin Aramco Mercedes",
            "wil": "Williams Mercedes",
            "haas": "Haas Ferrari",
            "rb": "RB Honda RBPT",
            "alp": "Alpine Renault",
            "stake": "Kick Sauber Ferrari",
            "rbr": "Red Bull Racing RBPT",
            "alfa": "Alfa Romeo Ferrari",
            "at": "AlphaTauri Honda RBPT",
            "at": "AlphaTauri RBPT",
            "at": "AlphaTauri Honda",
            "rbr": "Red Bull Racing Honda",
            "alfa": "Alfa Romeo Racing Ferrari",
            "amr": "Aston Martin Mercedes",
            "rp": "Racing Point BWT Mercedes",
            "mcl": "McLaren Renault",
            "renault": "Renault"
        };

        // Drivers flags dictionary
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
            "Kimi Raikkonen": "fi",
            "Antonio Giovinazzi": "it",
            "Nikita Mazepin": "ru",
            "Nicholas Latifi": "ca",
            "Jack Aitken": "uk",
            "Pietro Fittipaldi": "br",
            "Romain Grosjean": "fr",
            "Daniil Kvyat": "ru"
        };

        rows.forEach(row => {
            const columns = row.querySelectorAll('td');
            if (columns.length === 0) return;

            const data = Array.from(columns).map(col => col.textContent.trim());

            const position = data[0];
            let driverName = data[2].replace('\xa0', ' ').trim();
            driverName = driverName.slice(0, -3); // Remove the last 3 characters
            const teamCode = data[3];
            const bestLap = data[4];
            let gap = data[5];
            const laps = data[6];

            // Use the team code to get the key from the dictionary
            const teamKey = Object.keys(teamCodes).find(key => teamCodes[key] === teamCode);
            const teamCodeDisplay = teamKey ? teamKey.toLowerCase() : '';

            const flag = driversFlags[driverName] || "";

            function timeToSeconds(timeStr) {
                if (timeStr) {
                    const parts = timeStr.split(':');
                    const minutes = parseInt(parts[0], 10);
                    const seconds = parseFloat(parts[1].replace(',', '.'));
                    return minutes * 60 + seconds;
                }
                return 0;
            }

            const bestLapSeconds = timeToSeconds(bestLap);
            let interval = '-';
            if (previousBestLapSeconds !== null) {
                const intervalSeconds = bestLapSeconds - previousBestLapSeconds;
                interval = `+${intervalSeconds.toFixed(3)}`;
            }

            previousBestLapSeconds = bestLapSeconds;

            gap = gap.replace(/s$/, '').trim();

            const resultLine = `|{{PracticeResults/Row|pos=${position}` +
                                    ` |driver=${driverName}` +
                                    ` |flag=${flag}` +
                                    ` |team=${teamCodeDisplay}` +
                                    ` |gap=${gap.trim() || '-'}` +
                                    ` |interval=${interval}\n` +
                                    `|bestlap=${bestLap}` +
                                    ` |tyres=` +
                                    ` |laps=${laps}\n}}\n`;
            resultsText += resultLine;
        });

        document.getElementById('resultsOutput').textContent = resultsText;

    } catch (error) {
        alert("Failed to fetch results.");
        console.error(error);
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
