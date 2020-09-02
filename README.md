# Updater.js
This repository contains code designed to be used in a broadcast situation, and provides a simple framework to allow a broadcast moderator to control overlays using a Google Sheet. It was created for [Rewind Gaming](https://twitter.com/RewindRL) by [Barnaby 'bucketman' Collins](https://twitter.com/bucketman21). Versions of this program have been used in overlays for several tournaments including:

<table><tr>
    <td><img alt="Rewind Gaming: The Colosseum" src="https://liquipedia.net/commons/images/3/3a/Colosseum_Rewind_Gaming.png" width="500"></td>
    <td><img alt="Rewind Gaming x Psyonix: Neon Dream (EU Renegade Cup)" src="https://liquipedia.net/commons/images/a/a3/Neon_Dream.png" width="500"></td>
    <td><img alt="Johnnyboi_i: Salt Mine II" src="readme-assets/smii.jpg" width="500"></td>
</tr></table>

It is designed to be included inside a set of HTML overlays to be imported into broadcasting software such as OBS, and runs entirely on the client side. An earlier version of this program was used by Rewind Gaming for all of our large events, and it has proven reliable.

When using this system, the main latency bottleneck is Google's servers propagating new values to the API. Generally I've found that updates take 2-10 seconds to reach overlays, which is very much satisfactory for most broadcast needs.

Note: for more advanced users, this updater is configurable with your own overlay updating operations. More information on this is available at [Customisation.md](Customisation.md).

## A note on Google API versions
This branch now contains the version of Updater.js for Google Sheets API v4. If you are looking for the previous version, which doesn't require an API key but uses a deprecated API version, that can be found on the [`APIv3` branch](https://github.com/rewindrl/updater/tree/APIv3).

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
    <span id="team-name"></span>
    <img id="team-photo">

    <!-- JAVASCRIPT STUFF -->
    <!-- Import Updater -->
    <script src="Updater.js"></script>
    <script>
        // Define settings to use
        const settings = {
            'string': {
                'H1': 'team-name'
            },
            "image": {
                'H2': 'team-photo'
            }
        };

        // Define spreadsheet to use
        const spreadsheetID = '0B-klwLEjaXWcZHR5SmJJWEwtYnc';

        // Select worksheet
        const worksheetName = 'Sheet1';

        // Specify the API key to use
        // (this is just a random string, it won't work okay)
        const apiKey = "4fBv9O3L9rR0SeLf6P1l5I679D08s4zP5xX4iZc";

        // Update the overlay every 3 seconds
        const updateInterval = 3000;

        // Pass those values into a new GraphicsUpdater object
        // The code will deal with it from here
        const u = new GraphicsUpdater(settings, spreadsheetID, worksheetName, apiKey, updateInterval);
    </script>
</body>
</html>
```

`Updater.js` and `Updater.min.js` both do exactly the same thing; `Updater.min.js` is just smaller ('minified') and so will take up less disk space and run marginally quicker. I recommend developing with `Updater.js` because it contains [JSDoc](https://jsdoc.app/) comments which should be picked up automatically by most IDEs, and will give you information on things like parameter types. `Updater.min.js` can always be dropped in once development is completed if necessary.

## Class Parameters
In this section:

`GraphicsUpdater(`

- [`settings`](#settings)`,`
- [`spreadsheetID`](###spreadsheetID)`,`
- [`worksheetName`](###worksheetName)`,`
- [`apiKey`](###apiKey)`,`
- [`updateInterval`](###updateInterval-(optional;-default-3000))`,`
- [`updateNow`](###updatenow-optional-default-true)

`)`

&nbsp;

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

&nbsp;

### `spreadsheetID`
This is the [ID of the spreadsheet](https://developers.google.com/sheets/api/guides/concepts#spreadsheet_id), as given in the URL of the Google Sheets page for that spreadsheet. It's usually a long alphanumeric string.

The system used by this updater can only access public spreadsheets, so make sure that your spreadsheet is set to at least 'Anyone with the link can view'. If it's private, the API will throw an error and your overlay won't be able to update.

&nbsp;

### `worksheetName`
This is the name of the worksheet inside the spreadsheet document (ie, corresponding to the tab along the bottom that you'd click to get to that worksheet in the desktop web UI). Here's a picture I found to illustrate:

![Worksheet tabs along the bottom of a Google Sheets document](https://cdn-7dee.kxcdn.com/wp-content/uploads/2019/07/how-add-color-tabs-google-sheets-1.jpg)

&nbsp;

### `apiKey`
This is an API key for the script to use when it accesses the Google Sheets API. You need to generate one of these with Google yourself at [this page](https://console.cloud.google.com/apis/credentials). There's more information on that [here](https://cloud.google.com/docs/authentication/api-keys#creating_an_api_key), or a [slightly more in-depth guide](https://developers.google.com/maps/documentation/embed/get-api-key#get-the-api-key) on the Google Maps documentation. You might have to create a new project before you can generate one.

Either way, make sure you've got the Google Sheets API enabled for the project containing your key - you can do it [here](https://console.cloud.google.com/apis/library/sheets.googleapis.com) with your project selected in the top bar.

You should end up with a long string of letters, numbers and symbols. This should be passed straight into the `GraphicsUpdater` as a string.

Basically, an API key allows an application to do stuff on Google on your behalf. That means it can be abused too, so make sure that you take care to protect it. Treat it like a password. It's a good idea to restrict your key so that it can only be used on Google Sheets - there's a guide for that [here](https://cloud.google.com/docs/authentication/api-keys#api_key_restrictions).

#### Important note:
Google imposes usage limits on API keys: you are allowed a maximum of [100 requests per 100 seconds per user, and 500 requests per 100 seconds per project](https://developers.google.com/sheets/api/limits). As such, if you are planning to use several different overlays in the same broadcast, you may want to generate several API keys and use a different one in each overlay so that you stay well under this limit. You can see statistics on this for your project [here](https://console.cloud.google.com/apis/dashboard).

Exceeding this limit won't break the updater, but will negatively impact the latency between a value being updated and that change being represented on the overlay. The best way to check if you are below the limits is probably to open an instance of each of your overlays, and keep an eye on the consoles for each instance. If you start consistently getting errors after a certain amount of time, you are exceeding your usage limits.

&nbsp;

### `updateInterval` (optional; default `3000`)
This is simply the interval in milliseconds at which the updater should grab the latest info from the Google Sheet. For example, if `updateInterval` is set to `3000`, the overlay will be updated every 3 seconds (3000 milliseconds).

Bear in mind that it may take more than the given time for an inputted value to reach the overlay, given that it has to make the journey from writing client machine to Google Drive servers to API endpoint before it is visible to the script. For example, setting your interval to 1ms would be pointless because it takes much more than 1ms for the value to propagate to the API on Google's servers, by which time the script would have refreshed hundreds of times before getting the update. We've found that timings in the range of 2000-10000 are pretty reasonable values for this (as this is the typical time taken for Google Sheets to propagate).

&nbsp;

### `updateNow` (optional; default `true`)
This parameter specifies whether the GraphicsUpdater should start updating straight away after being initialised. It should be set to `false` if you intend to add configuration of your own.

The updater can be instructed to start updating once configured by calling `GraphicsUpdater.startUpdating()`.