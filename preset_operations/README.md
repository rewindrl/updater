# Creating and using custom operation presets

This directory is intended as a place to share custom operations made by those who use this updater.

## Creating

To share a custom operation here, simply:
- Create a new file with a name that describes your operation
- Add some information in a comment
- Add your operation in the following format:

```js
const exampleOperation = {
    'name': 'example',
    'operation': (id, _) => document.getElementById(id).innerHTML = 'big bucket',
    'isSimple': true
};
```

Name the object appropriately.

## Using

To use a preset, just download and import (in a `<script>` tag) the file that contains it. Then, when configuring your updater, you can use `GraphicsUpdater.importPreset()` with the name of the preset object defined in the file. For example, for the operation above:

```html
<script src="Updater.js"></script>
<script src="preset_operations/example.js"></script>
<script>
    // set parameters as desired
    const settings, id, name, key, interval;

    // Important: note updateNow (the last parameter) is set to false.
    // This means that u is just initialised, and does not try to update yet.
    const u = GraphicsUpdater(settings, id, name, key, interval, false);

    // Import operation preset
    u.importPreset(exampleOperation);

    // With u fully configured, start it updating.
    u.startUpdating();
</script>
```
