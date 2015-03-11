var Nightmare = require('./lib/index.js');
var Q = require('q');
Q.longStackSupport = true;

var n = new Nightmare({
    loadImages: false,
    timeout: 10000
});


Nightmare.addAction('checkCaptcha', function(selector) {

    return Q.Promise(function(resolve, reject) {

        var n = this;

        n.wait(selector)().then(function() {
            resolve();
        }).fail(function() {


            resolve();
        });

    }.bind(this));

});

var login = '#';
var oldPass = '#';
var newPass = '#';

n.run()
    .then(n.goto('http://m.vk.com'))
    .then(n.wait('input[name=email]'))
    .then(n.type('input[name=email]', login))
    .then(n.type('input[name=pass]', oldPass))
    .then(n.click('input[type=submit]'))
    .then(n.checkCaptcha('.mmi_settings'))
    .then(function() {
        console.log('1. ВХОД В ВК');
    })
    .then(n.click('.mmi_settings a'))
    .then(n.wait('input[name="old_password"]'))
    .then(function() {
        console.log('2. ВХОД НА ВКЛАДКУ С НАСТРОЙКАМИ');
    })
    .then(n.type('input[name="old_password"]', oldPass))
    .then(n.type('input[name="new_password"]', newPass))
    .then(n.type('input[name="confirm_password"]', newPass))
    .then(n.click('form[action*=changepass] input[type=submit]'))
    .then(n.checkCaptcha('.service_msg_ok'))
    .then(n.title())
    .then(function(title) {
        console.log(title);
        n.teardownInstance();
    })
    .done();


