var Nightmare = require('./lib/index.js');

    var n = new Nightmare({
        loadImages: false
    });

    n.run()
    .then(n.goto('http://google.ru'))
    .then(n.wait())
    .then(function (result) {
        result.nightmare.teardownInstance();
    });