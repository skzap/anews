var templates = []

proxy.user = null

// init the navbar
window.navbar = document.getElementById('navbar-container')
navbar.innerHTML = template('navbar.html', proxy)
bind.navbar()
const $navbarBurgers = Array.prototype.slice.call(document.querySelectorAll('.navbar-burger'), 0);
if ($navbarBurgers.length > 0) {
    $navbarBurgers.forEach( el => {
        el.addEventListener('click', () => {
            const target = el.dataset.target;
            const $target = document.getElementById(target);
            el.classList.toggle('is-active');
            $target.classList.toggle('is-active');
        });
    });
}

// start router
Router.navigate(Router.getFragment());
Router.check()

// hide the loader
pageloader.classList.remove('is-active')

// auto login
var user = JSON.parse(localStorage.getItem("user"))
if (user) {
    avalon.getAccounts([user.username], function(err, result) {
        if (err) throw err;
        var chainuser = result[0]
        if (chainuser.pub == user.publickey) {
            user.balance = chainuser.balance
            localStorage.setItem('user', JSON.stringify(user));
            proxy.user = user
            console.log('Logged in as '+proxy.user.username)
            navbar.innerHTML = template('navbar.html', proxy)
            bind.navbar()
        } else {
            throw "Existing key but not matching username"
        }
    })
}