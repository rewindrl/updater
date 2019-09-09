# Updater.js
The contents of this repository are currently property of Rewind Gaming ('RG'). If you want to use anything from this repository for a purpose that is not affiliated with RG, you must first obtain written permission from one of our Directors. We may change this in future.

## Basic Implementation
To use Updater.js, simply import it into an overlay page and define a new `GraphicsUpdater` object.

The `GraphicsUpdater` object is defined as below:
```js
let u = new GraphicsUpdater(settings, spreadsheetId, refreshInterval);
```
It can be given any variable name you want. You could even call it `bucket_is_a_thot` if you wanted.

## Parameters
I'm going to address the parameters in ascending order of how complicated they are to explain, so that it's easy to find simpler parameters.

### `refreshInterval`
This is simply the interval in milliseconds at which the updater should grab the latest info from the Google Sheet. For example, if `refreshInterval` is set to `3000`, the overlay will be updated every 3 seconds (3000 milliseconds).

Bear in mind that it may take more than the given time for an inputted value to reach the overlay, given that it has to make the journey from writing client machine to Google Drive servers to API endpoint before it is visible to the script. For example, setting your interval to 1ms would be pointless because it takes much more than 1ms for the value to propagate to the API, by which time the script would have refreshed hundreds of times before getting the update.

### `spreadsheetId`
This is the ID of the spreadsheet, as given in the URL of the Google Sheets page for that spreadsheet. It's usually a 44-character string.

Bear in mind that the spreadsheet has to be public before it's visible to the API that the updater uses. Just setting it to 'anyone with the link can view' isn't enough - you have to **publish** it. You can do this by paying a visit to `File -> Publish to the web` on the desktop web UI and making sure that the checkbox marked `Automatically republish when changes are made` is ticked.

*note: I don't know how different sheets on the same document work; I think it just uses the first sheet from the document but I need to look into it properly*

### `settings`
`settings` is defined as a JavaScript object. It defines the relationships between the cells in the spreadsheet and the HTML elements in the overlay.

#### Supported element types
I'm defining an element type here as a type of thing that can be updated in the overlay. For example, a string value, an image or a counter.

##### `"string"`
A string property simply replaces the content of the given HTML ID(s) with the content of the spreadsheet cell. It is useful for text content such as team names, social media tags or the name of your epic mixtape.

A `settings` structure using `"string"` might look like:
```js
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
```js
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
```js
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
A switch is the last element type, designed to show different things depending on, as well as to allow you to do a lot of other things that aren't natively supported by the updater system. It basically allows you to specify a list of possible values for each spreadsheet cell, with an element ID given for each possible value. The script will show any elements given for the current cell value, and hide the elements affiliated with all other values.

A `settings` structure using `"switch"` might look like:
```js
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
