// Example custom operation for Rewind Gaming's broadcast updater
// Author: Barnaby 'bucketman' Collins

const exampleOperation = {
    'name': 'example',
    'operation': (id, _) => document.getElementById(id).innerHTML = 'big bucket',
    'isSimple': true
};