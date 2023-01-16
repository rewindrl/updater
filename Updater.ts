// REWIND GAMING BROADCAST OVERLAY UPDATER
// VERSION 1.3
// LICENSED UNDER GPL-3.0

// FOR DOCUMENTATION AND LICENSING INFORMATION PLEASE SEE:
// https://github.com/rewindrl/updater

export type OperationType = (id: string, cellValue: string | number | Date) => any;

export type SettingsType = { [operationName: string]: { [cellName: string]: string } };

class GraphicsUpdater {
    updating: boolean;
    url: string;
    arrayMap: { [setting: string]: { [coords: string]: any } }
    simpleOperations: string[];
    operations: { [operationName: string]: OperationType };
    updateInterval: number;

    /**
     * Start updating given elements from the given spreadsheet
     * @param {object} settings - The set of cells and IDs that should be updated
     * @param {string} spreadsheetID - The ID of the spreadsheet to use
     * @param {string} worksheetName - The name of the worksheet in the Google Sheets document
     * @param {string} googleApiKey - The Google API key to use (see https://cloud.google.com/docs/authentication/api-keys)
     * @param {number} [updateInterval=3000] - The interval to update at (in milliseconds)
     * @param {boolean} [updateNow=true] - Whether to start updating straight away
     */
    constructor(settings: SettingsType, spreadsheetID: string, worksheetName: string, googleApiKey: string, updateInterval: number = 3000, updateNow: boolean = true) {

        this.updating = false;

        // Generate an array of all cells required (with each cell stored as ["A", "1"])
        const cellsNeeded = (() => {
            let cells: string[][] = []
            for (let i of Object.values(settings)) {
                for (let j of Object.keys(i)) {
                    const cellName = j.match(/[a-zA-Z]+|[0-9]+/g);
                    if (cellName !== null) cells.push(cellName);
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
        this.url = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetID}/values/${worksheetName}!${rangeText}?key=${googleApiKey}&majorDimension=COLUMNS&valueRenderOption=FORMATTED_VALUE`;

        // Convert cell names like "A1" in the settings dictionary into x-y co-ordinate pairs
        // relative to the top left corner of the range requested from the API
        this.arrayMap = (() => {
            let map = {};
            for (let i of Object.keys(settings)) {
                map[i] = {}
                for (let j of Object.keys(settings[i])) {
                    const coords = j.match(/[a-zA-Z]+|[0-9]+/g);
                    if (coords === null) continue;

                    const numericColumn = this.colToIndex(coords[0]);
                    const relativeCoords = [
                        numericColumn - cellRange[0],
                        parseInt(coords[1]) - cellRange[1]
                    ];
                    map[i][relativeCoords.toString()] = settings[i][j];
                }
            }

            return map;
        })();

        // Define the operations that can be run with multiple given IDs if a list is given in settings
        this.simpleOperations = ['string', 'image'];

        // Define the functions to run for each data type
        /** {Object.<string, updaterFunction>} */
        this.operations = {
            'string': (id, cellValue) => {
                const element = document.getElementById(id);
                if (element === null) {
                    console.warn(`Failed to update string element with ID ${id}!`);
                    return;
                }

                element.innerHTML = cellValue.toString()
            },
            'image': (id, cellValue) => {
                const element = document.getElementById(id);
                if (element === null) {
                    console.warn(`Failed to update number element with ID ${id}!`);
                    return;
                }

                element.setAttribute("src", cellValue.toString());
            },
            'counter': (ids, cellValue) => {
                // Cast falsy values (including an empty cell, represented by '') to 0
                if (!cellValue) {
                    cellValue = 0;
                }
                else {
                    // If we have a truthy value, try to cast it to a number
                    if (typeof cellValue === "string") cellValue = parseInt(cellValue);

                    // If casting failed, default to 0
                    if (typeof cellValue !== "number") {
                        console.warn('Failed to parse counter value from spreadsheet: make sure it\'s a number!\nDefaulting to 0.');
                        cellValue = 0;
                    }
                }
                // Show the first n counter tallies
                for (let i = 0; i < cellValue; i++) {
                    const element = document.getElementById(ids[i]);
                    if (element === null) {
                        console.warn(`Failed to update counter element with ID ${ids[i]}!`);
                        return;
                    }

                    element.style.display = '';
                }
                // Hide the rest
                for (let i = cellValue; i < ids.length; i++) {
                    const element = document.getElementById(ids[i]);
                    if (element === null) {
                        console.warn(`Failed to update counter element with ID ${ids[i]}!`);
                        return;
                    }

                    element.style.display = 'none';
                }
            },
            'switch': (valueSwitch, cellValue) => {
                let switched = false;
                // Iterate over the dictionary; show only the one that corresponds to the current cell value
                for (let i of Object.keys(valueSwitch)) {
                    if (i == cellValue) {
                        const element = document.getElementById(valueSwitch[i]);
                        if (element === null) {
                            console.warn(`Failed to update switch element with ID ${valueSwitch[i]}!`);
                            return;
                        }

                        element.style.display = '';
                        switched = true;
                    }
                    else {
                        const element = document.getElementById(valueSwitch[i]);
                        if (element === null) {
                            console.warn(`Failed to update switch element with ID ${valueSwitch[i]}!`);
                            return;
                        }

                        element.style.display = 'none';
                    }
                }

                if (!switched) console.warn(`Hid all elements in a switch: none of the keys matched cell value ${cellValue}!`)
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
                throw 'Failed to find your spreadsheet! Make sure it\'s public and the given ID is correct.';
            }
            cells = await response.json();
        }
        catch (error) {
            throw 'Failed to access spreadsheet on Google Sheets API! Make sure your API key is correct, and enabled on the Google Sheets API.';
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
                catch (error) {
                    console.warn(`Failed to update ${this.arrayMap[type][locationString].toString()} with value ${cellValue.toString()}!\nReceived the following error:\n${error.toString()}`);
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
    addOperation(name: string, operation: OperationType, isSimple: boolean = false) {
        if (!(name in this.operations)) {
            this.operations[name] = operation;

            if (isSimple) {
                this.simpleOperations.push(name);
            }
        }
        else {
            console.warn(`Failed to add operation ${name} to operation structure - it already exists! Try a different name.`);
        }
    }

    /**
     * Imports a preset operation object
     * @param {Object} operationObject 
     */
    importPreset(operationObject: {name: string, operation: OperationType, isSimple: boolean}) {
        this.addOperation(operationObject.name, operationObject.operation, operationObject.isSimple);
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
            console.warn(`Failed to start updating: the updater is already updating!`);
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
            result = String.fromCharCode(((num % b) / a) + 65) + result;
        }
        return result;
    }
}

module.exports = GraphicsUpdater;

export default GraphicsUpdater;
