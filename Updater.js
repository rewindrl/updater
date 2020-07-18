// REWIND GAMING BROADCAST OVERLAY UPDATER
// VERSION 0.5
// LICENSED UNDER GPL-3.0

// FOR DOCUMENTATION AND LICENSING INFORMATION PLEASE SEE:
// https://github.com/rewindrl/updater

class GraphicsUpdater {
    /**
     * Start updating given elements from the given spreadsheet
     * @param {object} settings - The set of cells and IDs that should be updated
     * @param {string} spreadsheetID - The ID of the spreadsheet to use
     * @param {string} worksheetName - The name of the worksheet in the Google Sheets document
     * @param {string} apiKey - The Google API key to use (see https://cloud.google.com/docs/authentication/api-keys)
     * @param {number} [updateInterval=3000] - The interval to update at (in milliseconds)
     * @param {boolean} [updateNow=true] - Whether to start updating straight away
     */
    constructor(settings, spreadsheetID, worksheetName, apiKey, updateInterval=3000, updateNow=true) {

        this.updating = false;
        
        // Generate an array of all cells required (with each cell stored as ["A", "1"])
        const cellsNeeded = (() => {
            let cells = []
            for (let i of Object.values(settings)){
                for (let j of Object.keys(i)) {
                    cells.push(j.match(/[a-zA-Z]+|[0-9]+/g));
                }
            }
            return cells;
        })();
        
        // Convert row and column labels to integers (eg above cell would become [1, 1])
        const cellsNumeric = cellsNeeded.map(coords => [this.colToIndex(coords[0]), parseInt(coords[1])]);

        // Find the top left and bottom right corners of the minimum range that covers the required cells
        const cellRange = (() => {
            const cols = cellsNumeric.map(val => val[0])
            const rows = cellsNumeric.map(val => val[1]);
            return [
                Math.min(...cols),
                Math.min(...rows),
                Math.max(...cols),
                Math.max(...rows)
            ];
        })();

        // Generate the string that specifies the required range for the Google Sheets API (in format A1:F7)
        const rangeText = `${this.indexToCol(cellRange[0])}${cellRange[1]}:${this.indexToCol(cellRange[2])}${cellRange[3]}`;

        // Generate and store the API URL to use for the rest of the program
        this.url = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetID}/values/${worksheetName}!${rangeText}?key=${apiKey}&majorDimension=COLUMNS&valueRenderOption=FORMATTED_VALUE`;

        // Convert cell names like "A1" in the settings dictionary into x-y co-ordinate pairs
        // relative to the top left corner of the range requested from the API
        this.arrayMap = (() => {
            let map = {};
            for (let i of Object.keys(settings)) {
                map[i] = {}
                for (let j of Object.keys(settings[i])) {
                    let coords = j.match(/[a-zA-Z]+|[0-9]+/g);
                    coords[0] = this.colToIndex(coords[0]);
                    coords = coords.map((v, i) => v - cellRange[i]);
                    map[i][coords.toString()] = settings[i][j];
                }
            }

            return map;
        })();

        // Define the operations that can be run with multiple given IDs if a list is given in settings
        this.simpleOperations = ['string', 'image'];

        // Define the functions to run for each data type
        /** {Object.<string, updaterFunction>} */
        this.operations = {
            'string': (id, cellValue) => document.getElementById(id).innerHTML = cellValue,
            'image': (id, cellValue) => document.getElementById(id).src = cellValue,
            'counter': (ids, cellValue) => {
                try {
                    cellValue = parseInt(cellValue);
                }
                catch (error) {
                    throw 'Failed to parse number from spreadsheet: make sure it\'s a number!';
                }
                for (let i = 0; i < cellValue; i++) {
                    document.getElementById(ids[i]).style.display = '';
                }
                for (let i = cellValue; i < ids.length; i++) {
                    document.getElementById(ids[i]).style.display = 'none';
                }
            },
            'switch': (valueSwitch, cellValue) => {
                for (let i of Object.keys(valueSwitch)) {
                    if (i == cellValue) {
                        document.getElementById(valueSwitch[i]).style.display = '';
                    }
                    else {
                        document.getElementById(valueSwitch[i]).style.display = 'none';
                    }
                }
            }
        }
        
        this.updateInterval = updateInterval;

        if (updateNow) {
            // Start updating the overlay
            this.startUpdating();
        }
    }

    /**
     * Update the overlay once
     */
    async update() {
        // Get sheet data from Google Sheets API
        let cells;
        try {
            let response = await fetch(this.url);
            if (!response.ok) {
                throw 'Failed to find your spreadsheet!';
            }
            cells = await response.json();
        }
        catch (error) {
            throw 'Failed to access spreadsheet on Google Sheets API';
        }
        cells = cells.values;

        // Iterate over this.arrayMap, writing the received values into the overlay
        let coords, run;
        for (let type of Object.keys(this.arrayMap)) {
            // Okay this bit is pretty meta
            // When a new type is used, check if it's a simple operation
            if (this.simpleOperations.includes(type)) {
                // If it is a simple operation, put a check into the run function
                // to iterate over IDs if they're given in an array
                run = (ids, cellValue) => {
                    if (Array.isArray(ids)) {
                        for (let id of ids) {
                            this.operations[type](id, cellValue);
                        }
                    }
                    else {
                        this.operations[type](ids, cellValue)
                    }
                };
            }
            else {
                // If it's not a simple operation, just run the given function as normal
                run = (ids, cellValue) => this.operations[type](ids, cellValue);
            }

            // Once the run function has been defined for the type, iterate over the cells for that type
            // and use the operations defined in this.operations to write spreadsheet values to the overlay
            for (let locationString of Object.keys(this.arrayMap[type])) {
                coords = locationString.split(',').map(v => v.toString());
                
                const cellValue = (() => {
                    const col = cells[coords[0]];
                    if (col) {
                        const value = col[coords[1]];
                        if (typeof value === 'string') {
                            return col[coords[1]];
                        }
                    }
                    return '';
                })();

                try {
                    run(this.arrayMap[type][locationString], cellValue);
                }
                catch {
                    throw `Failed to update ${this.arrayMap[type][locationString]}!`;
                }
            }
        }
    }


    /**
     * A function which takes relevant information and uses it to update the overlay.
     * 
     * For example, for a simple string function:
     * - settingsEntry would be the ID or list of IDs to update from a certain cell
     * - cellValue would be the current value in that cell
     * - The updaterFunction instance would write cellValue to all elements matching the ID(s) in ids
     * 
     * @callback updaterFunction
     * @param {*} settingsEntry - an entry in the settings structure (usually an ID or set of IDs, but can be whatever you need)
     * @param {string} cellValue - the value in the cell that corresponds to that entry
     */

    /**
     * Takes a name and a function and adds it to the pool of methods of updating graphics.
     * @param {string} name - The name to use
     * @param {updaterFunction} operation - A function that takes the structure from settings and the current value in the relevant cell, and uses them to update the overlay.
     * @param {boolean} [isSimple=false] - Whether the operation is 'simple': that is, whether the updater should automatically run the function for each item in an array of IDs.
     */
    addOperation(name, operation, isSimple=false) {
        if (!(name in this.operations)) {
            this.operations[name] = operation;
            
            if (isSimple) {
                this.simpleOperations.push(name);
            }
        }
        else {
            throw `Failed to add operation ${name} to operation structure - it already exists! Try a different name.`;
        }
    }

    importPreset(operationObject) {
        this.addOperation(...Object.values(operationObject));
    }

    /**
     * Start the overlay updating with the configured values.
     */
    startUpdating() {
        if (!this.updating) {
            // Start updating the overlay
            this.update();
            setInterval(this.update.bind(this), this.updateInterval);
            this.updating = true;
        }
        else {
            throw `Failed to start updating: the updater is already updating!`;
        }
    }

    /**
     * Takes a column name and converts it into a 1-indexed positive number.
     * https://stackoverflow.com/a/9906193/5094386
     * @param {string} colString - The string to convert (eg 'AA')
     * @return {number} - The corresponding index
     */
    colToIndex(colString) {
        let base = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ', i, j, result = 0;
        for (i = 0, j = colString.length - 1; i < colString.length; i += 1, j -= 1) {
            result += Math.pow(base.length, j) * (base.indexOf(colString[i]) + 1);
        }
        return result;
    }

    /**
     * Takes a positive integer and returns the corresponding column name.
     * https://cwestblog.com/2013/09/05/javascript-snippet-convert-number-to-column-name/
     * @param {number} num - The positive integer to convert to a column name
     * @return {string} - The column name
     */
    indexToCol(num) {
        for (var result = '', a = 1, b = 26; (num -= a) >= 0; a = b, b *= 26) {
            result = String.fromCharCode(parseInt((num % b) / a) + 65) + result;
        }
        return result;
    }
}
