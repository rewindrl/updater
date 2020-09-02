# Updater.js
This repository contains code designed to be used in a broadcast situation, and provides a simple framework to allow a broadcast moderator to control overlays using a Google Sheet. It was created for [Rewind Gaming](https://twitter.com/RewindRL) by [Barnaby 'bucketman' Collins](https://twitter.com/bucketman21).

It is designed to be included inside a set of HTML overlays to be imported into broadcasting software such as OBS, and runs entirely on the client side. An earlier version of this program was used by Rewind Gaming for all of our large events, and it has proven reliable.

**Important notice:** It uses the [Google Sheets API v3](https://developers.google.com/sheets/api/v3) which is a legacy API and is unfortunately scheduled for deprecation on **30/09/2020**. I originally chose this API version because it can be used without authentication or API keys on public spreadsheets. This version of the updater is no longer supported; see the [`master` branch](https://github.com/rewindrl/updater) for the new version.

When using this system, the main latency bottleneck is Google's servers propagating new values to the API. Generally I've found that updates take 2-10 seconds to reach overlays, which is very much satisfactory for most broadcast needs.

## Basic Implementation
To use Updater.js, simply import it into an overlay page in a `<script>` tag and define a new `GraphicsUpdater` object. It doesn't require JQuery so can just be included as a standalone file.

For example:
```html
<!DOCTYPE html>
<html>
<head>
    <!-- stuff -->
</head>
<body>
    <p id="team-name"></p>
    <img id="team-photo">

    <!-- JAVASCRIPT STUFF -->
    <!-- Import Updater -->
    <script src="Updater.js"></script>
    <script>
        // Define settings to use
        const settings = {
            "string": {
                "H1": "team-name"
            },
            "image": {
                "H2": "team-photo"
            }
        };

        // Define spreadsheet to use
        const spreadsheetID = "0B-klwLEjaXWcZHR5SmJJWEwtYnc";

        // Use the first worksheet in the document
        const worksheetIndex = 1;

        // Update the overlay every 3 seconds
        const updateInterval = 3000;

        // Pass those values into a new GraphicsUpdater object
        // The code will deal with it from here
        const u = new GraphicsUpdater(settings, ssId, worksheetIndex, updateInterval);
    </script>
</body>
</html>
```

Updater.js and Updater.min.js both do exactly the same thing; Updater.min.js is just smaller ('minified') and so will take up less disk space and run marginally quicker, if you're not interested in how it works.

## Parameters
In this section:

`GraphicsUpdater(`
- [`settings`](###settings)`,`
- [`spreadsheetID`](###spreadsheetID)`,`
- [`worksheetIndex`](###worksheetIndex-(optional;-default-1))`,`
- [`updateInterval`](###updateInterval-(optional;-default-3000))

)

### `settings`
`settings` is defined as a JavaScript object. It defines the relationships between the cells in the spreadsheet and the HTML elements in the overlay.

#### Supported element types
I'm defining an element type here as a type of thing that can be updated in the overlay. For example, a string value, an image or a counter.

##### `"string"`
A string property simply replaces the content of the given HTML ID(s) with the content of the spreadsheet cell. It is useful for text content such as team names, social media tags or the name of your epic mixtape.

A `settings` structure using `"string"` might look like:
```json
{
    "string": {
        "H6": "team-name-1",
        "A1": "moderator-of-the-month",
        "D7": [
            "buckets-name-big",
            "buckets-name-small"
        ]
    }
}
```
In this example, `#team-name-1` and `#moderator-of-the-month` would be updated with the values in H6 and A1 respectively, and `#buckets-name-big` and `#buckets-name-small` would both be updated with the value in D7.

&nbsp;

##### `"image"`
An image element has its `src` attribute set to whatever text content is contained inside the given cell. This URI can point to a file stored locally on the broadcast machine, or an image that's hosted on the web. This can be useful for any dynamic image you'd want to display, from a caster's profile photo to your meme of the day.

A `settings` structure using `"image"` might look like:
```json
{
    "image": {
        "F5": "metal-bucket",
        "C4": [
            "anti-bucket-ordnance",
            "bucket-secret-weapon",
            "bucket-assault-squad"
        ],
        "B2": "plastic-bucket"
    }
}
```
In this example, the HTML `img` elements with the IDs `plastic-bucket` and `metal-bucket` would use the image at the URI specified in B2 and F5 respectively, and those with the IDs `anti-bucket-ordnance`, `bucket-secret-weapon` and `bucket-assault-squad` would all use the image at the URI specified in C4.

Fun fact: `"image"` can also be used to specify sources for other tags that use `src`, such as `iframe`s.

&nbsp;

##### `"counter"`
The `"counter"` element type is a specialised type designed for use with overlays using 'tallies' to display scores. It will reveal or hide elements in a given ID list based on a number given in a single cell in the spreadsheet. For example, for a given score of 2, it will show the first two elements and hide any later elements in the list.

A `settings` structure using `"counter"` might look like:
```json
{
    "counter": {
        "B2": [
            "score-tally-1",
            "score-tally-2",
            "score-tally-3",
            "score-tally-4"
        ]
    }
}
```
In this example, the updater script would show the first `n` elements in the list and hide the rest, where `n` is the value in B2. Note that you can't update multiple sets of tallies with just one cell (though specifying the same cell twice for two different sets of tallies might work; I haven't tested that though and you do so at your own risk).

&nbsp;

##### `"switch"`
A switch is the last element type, designed to show different elements depending on a cell's value, as well as to allow you to do a lot of other things that aren't natively supported by the updater system. It basically allows you to specify a list of possible values for each spreadsheet cell, with an element ID given for each possible value. The script will show any elements given for the current cell value, and hide the elements affiliated with all other values.

A `settings` structure using `"switch"` might look like:
```json
{
    "switch": {
        "Z14": {
            "bob": "bob-overlay",
            "bucket": "cartoon-bucket-drawing",
            "doris": "doris-esports",
            "linda": "linda-overlay"
        }
    }
}
```
In this example, the value in Z14 would decide which of `#bob-overlay`, `#cartoon-bucket-drawing`, `#doris-esports` and `#linda-overlay` to show. If Z14 contained 'bob', the HTML element with ID `#bob-overlay` would be shown, if it contained 'bucket' it would show `#cartoon-bucket-drawing` and so on. Note that you can't specify multiple tags for a value in a switch statement: if you want to be able to toggle several different things, you could either use containing HTML divs that you pass into the updater instead or, in a similar vein to the counter, specify the same cell multiple times. Again, not strictly supported.

### `spreadsheetID`
This is the ID of the spreadsheet, as given in the URL of the Google Sheets page for that spreadsheet. It's usually a 44-character string.

Bear in mind that the spreadsheet has to be public before it's visible to the API that the updater uses. Just setting it to 'anyone with the link can view' isn't enough - you have to **publish** it. You can do this by paying a visit to `File -> Publish to the web` on the desktop web UI, making sure that the checkbox marked `Automatically republish when changes are made` is ticked and hitting `Start publishing`.

### `worksheetIndex` (optional; default `1`)
This is the index of the worksheet inside the spreadsheet document (ie, a number corresponding to the tab along the bottom that you'd click to get to that worksheet in the desktop web UI).

**Important: It is 1-indexed: That is, the first worksheet on the document is at number 1 and it goes up from there. Trying to read worksheet 0 will return an error.**

### `updateInterval` (optional; default `3000`)
This is simply the interval in milliseconds at which the updater should grab the latest info from the Google Sheet. For example, if `updateInterval` is set to `3000`, the overlay will be updated every 3 seconds (3000 milliseconds).

Bear in mind that it may take more than the given time for an inputted value to reach the overlay, given that it has to make the journey from writing client machine to Google Drive servers to API endpoint before it is visible to the script. For example, setting your interval to 1ms would be pointless because it takes much more than 1ms for the value to propagate to the API on Google's servers, by which time the script would have refreshed hundreds of times before getting the update. We've found that timings in the range of 2000-10000 are pretty reasonable values for this (as this is the typical time taken for Google Sheets to propagate).
