# Customisation

The updater also includes the option to add your own operations to update the overlay.
This can be achieved with the function `GraphicsUpdater.addOperation()`.

For example, the default `string` operation would be added as follows:

```js
// set parameters as desired
const settings, id, name, key, interval;

// Important: note updateNow (the last parameter) is set to false.
// This means that u is just initialised, and does not try to update yet.
const u = GraphicsUpdater(settings, id, name, key, interval, false);

// Add any configuration changes
const stringOperation = (id, cellValue) => {
    document.getElementById(id).innerHTML = cellValue;
}

// This operation is simple, so isSimple = true
u.addOperation('string', stringOperation, true);

// With u fully configured, start it updating.
u.startUpdating();
```

If you make your own operations, please check out the (preset_operations directory)[preset_operations/] where I've written out some information on how to make importable presets for other people to use!

## Parameters
### `name`
This parameter specifies the name of the operation, as it should be used in the `settings` structure. For example, the default operations would have the names `string`, `image`, `counter` and `switch`.

### `operation`
This is the actual function to execute for each spreadsheet cell. It should take the format:
```js
(settingsEntry, cellValue) => {
    // update the overlay with the given information
}
```

- `settingsEntry` is whatever has been placed in the settings structure next to the name of the current cell. For the more basic default operations, this takes the form of an ID whose content would be derived from `cellValue`.
- `cellValue` is the current value in the cell that corresponds to `settingsEntry`.

For example, the default `string` operation is defined as follows:

```js
(id, cellValue) => document.getElementById(id).innerHTML = cellValue
```

If you want more examples, the default operations are implemented towards the end of the `GraphicsUpdater` constructor.

### `isSimple`
False by default, this boolean tells the updater whether it can automatically map the operation to items in an array instead of running it on the array as a whole.

For example, with the `string` operation, the user may wish to update several IDs with the same string. As such, the `settings` entry can look like either just `'D4': 'id_1'` or `'D4': ['id_1', 'id_2', 'id_3']`.

Instead of having to handle both of these cases, simple operations can just be defined for the first case. The updater will then map the operation onto items in any array that it receives.

Put another way:
The `string` operation is defined for just one ID, but because it is labelled as 'simple', the updater will run the `string` operation on each ID separately rather than calling it on the whole list.

This functionality was added with the intention of making simpler operations more abstract and legible.
