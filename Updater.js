// THIS SCRIPT WAS WRITTEN FOR REWIND GAMING BY BUCKETMAN. ANY USE FOR OTHER PURPOSES
// IS NOT PERMITTED WITHOUT PRIOR PERMISSION, WHICH WILL NOT BE WITHHELD UNREASONABLY.

class GraphicsUpdater {
    /**
     * Start updating given elements from the given spreadsheet
     * @param {object} settings the set of cells and IDs that should be updated
     * @param {string} ssId the ID of the spreadsheet
     * @param {number} [interval=2000] the interval to update at (in milliseconds)
     */
    constructor(settings, ssId, interval) {
        this.settings = settings;
        this.url = "https://spreadsheets.google.com/feeds/cells/" + ssId + "/1/public/full?alt=json";
        this.keys = {};

        for (let i of Object.keys(settings)) {
            this.keys[i] = Object.keys(settings[i]);
        }

        this.update();
        setInterval(this.update.bind(this), interval);
    }

    async update() {
        try {
            let response = await fetch(this.url);
            if (!response.ok) {
                throw 'Failed to find your spreadsheet!';
            }
            var ss = await response.json();
        }
        catch (error) {
            throw 'Failed to access spreadsheet on Google Sheets API';
        }

        ss = ss.feed.entry;

        for (let cell of ss) {
            let cellName = cell.title.$t;
            let cellData = cell.content.$t;
            let cellType;
            for (let type of Object.keys(this.keys)) {
                if (this.keys[type].includes(cellName)) {
                    cellType = type;
                    break;
                }
            }
            if (!cellType) {
                continue;
            }

            let cellHtml = this.settings[cellType][cellName];

            if (cellType === 'string') {
                if (typeof cellHtml === 'string') {
                    document.getElementById(cellHtml).innerHTML = cellData;
                }
                else {
                    for (let i of cellHtml) {
                        document.getElementById(i).innerHTML = cellData;
                    }
                }
            }
            else if (cellType === 'image') {
                if (typeof cellHtml === 'string') {
                    document.getElementById(cellHtml).src = cellData;
                }
                else {
                    for (let i of cellHtml) {
                        document.getElementById(i).src = cellData;
                    }
                }
            }
            else if (cellType === 'counter') {
                try {
                    cellData = parseInt(cellData);
                }
                catch (error) {
                    throw 'Failed to parse number from spreadsheet: make sure it\'s a number!';
                }
                for (let i = 0; i < cellData; i++) {
                    document.getElementById(cellHtml[i]).style.display = '';
                }
                for (let i = cellData; i < cellHtml.length; i++) {
                    document.getElementById(cellHtml[i]).style.display = 'none';
                }
            }
            else if (cellType === 'switch') {
                let switchKeys = Object.keys(cellHtml);
                for (let i of switchKeys) {
                    if (i == cellData) {
                        document.getElementById(cellHtml[i]).style.display = '';
                    }
                    else {
                        document.getElementById(cellHtml[i]).style.display = 'none';
                    }
                }
            }
        }
    }
}