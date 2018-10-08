window.proxy = new Proxy({},{
    get: function(obj, prop) {
        return get(obj, prop)
    },
    set: function(obj, prop, value) {
        return set(obj, prop, value)
    }
  })
  
function set(obj, prop, value) {
    obj[prop] = value;
    console.log(obj, prop, value)
    // for single values where we dont want to update the full template
    if (!obj._template && document.getElementById(prop)) {
        document.getElementById(prop).innerHTML = value
        return true;
    }
    for (let i = 0; i < templates.length; i++) {
        if (!obj || !obj._template) break;
        if (obj._template.startsWith(templates[i])) {
            if (!window[templates[i]]) return true;
            window[templates[i]].outerHTML = template(templates[i]+'.html', proxy)
            bind[templates[i]]()
        }
    }
    return true;
}
  
function get(obj, prop) {
    if (prop == 'toJSON') return
    if (!(prop in obj))
        obj[prop] = new Proxy({_template: prop},{
            get: function(obj, prop) {
                return get(obj, prop)
            },
            set: function(obj, prop, value) {
                return set(obj, prop, value)
            }
        })
  
    return obj[prop]
}

window.Router = {
    routes: [],
    mode: null,
    root: '/',
    config: function(options) {
        this.mode = options && options.mode && options.mode == 'history' 
                    && !!(history.pushState) ? 'history' : 'hash';
        this.root = options && options.root ? '/' + this.clearSlashes(options.root) + '/' : '/';
        return this;
    },
    getFragment: function() {
        var fragment = '';
        if(this.mode === 'history') {
            fragment = this.clearSlashes(decodeURI(location.pathname + location.search));
            fragment = fragment.replace(/\?(.*)$/, '');
            fragment = this.root != '/' ? fragment.replace(this.root, '') : fragment;
        } else {
            var match = window.location.href.match(/#(.*)$/);
            fragment = match ? match[1] : '';
        }
        return this.clearSlashes(fragment);
    },
    clearSlashes: function(path) {
        return path.toString().replace(/\/$/, '').replace(/^\//, '');
    },
    add: function(re, handler) {
        if(typeof re == 'function') {
            handler = re;
            re = '';
        }
        this.routes.push({ re: re, handler: handler});
        return this;
    },
    remove: function(param) {
        for(var i=0, r; i<this.routes.length, r = this.routes[i]; i++) {
            if(r.handler === param || r.re.toString() === param.toString()) {
                this.routes.splice(i, 1); 
                return this;
            }
        }
        return this;
    },
    flush: function() {
        this.routes = [];
        this.mode = null;
        this.root = '/';
        return this;
    },
    check: function(f) {
        var fragment = f || this.getFragment();
        for(var i=0; i<this.routes.length; i++) {
            var match = fragment.match(this.routes[i].re);
            if(match) {
                match.shift();
                this.routes[i].handler.apply({}, match);
                return this;
            }           
        }
        return this;
    },
    listen: function() {
        window.addEventListener("hashchange", function(){
            Router.check()
            Router.navigate(Router.getFragment());
        }, false);
        
    },
    navigate: function(path) {
        path = path ? path : '';
        if(this.mode === 'history') {
            history.pushState(null, null, this.root + this.clearSlashes(path));
        } else {
            window.location.href = window.location.href.replace(/#(.*)$/, '') + '#' + path;
        }
        return this;
    }
}

// configuration
Router.config({ mode: 'hash'});

// adding routes
Router
// .add(/about/, function() {
//     document.getElementById('content').innerHTML = template('about.html', {})
// })
// .add(/addannounce/, function() {
//     document.getElementById('content').innerHTML = template('addannounce.html', {})
// })
// .add(/addcategory/, function() {
//     document.getElementById('content').innerHTML = template('addcategory.html', {})
// })
// .add(/products\/(.*)\/edit\/(.*)/, function() {
//     console.log('products', arguments);
// })
.add(/new/, function() {
    avalon.getNewDiscussions(function(err, results) {
        proxy.new.contents = []
        for (let i = 0; i < results.length; i++) {
            const element = results[i];
            results[i].ups = 0
            results[i].downs = 0
            if (results[i].votes) {
                for (let y = 0; y < results[i].votes.length; y++) {
                    if (results[i].votes[y].vt > 0)
                        results[i].ups += results[i].votes[y].vt
                    if (results[i].votes[y].vt < 0)
                        results[i].downs += results[i].votes[y].vt
                }
            }
            results[i].totals = results[i].ups + results[i].downs
            if (results[i].json.title)
                proxy.new.contents.push(results[i])
        }
        
        document.getElementById('content').innerHTML = template('new.html', proxy.new)
        bind.new()
    })
})
.add(/submit/, function() {
    document.getElementById('content').innerHTML = template('submit.html', {})
    bind.submit()
})
.add(/post\/(.*)\/(.*)/, function() {
    var author = arguments[0]
    var link = arguments[1]
    avalon.getContent(author, link, function(err, content) {
        content.replies = avalon.generateCommentTree(content, content.author, content.link)
        content.ups = 0
        content.downs = 0
        if (content.votes) {
            for (let i = 0; i < content.votes.length; i++) {
                if (content.votes[i].vt > 0)
                    content.ups += content.votes[i].vt
                if (content.votes[i].vt < 0)
                    content.downs += content.votes[i].vt
            }
        }
        content.totals = content.ups + content.downs
        console.log(content)
        document.getElementById('content').innerHTML = template('post.html', content)
        bind.post()
    })
})
.add(function() {
    document.getElementById('content').innerHTML = template('404.html', {})
})
.listen()
var CryptoJS = require("crypto-js")
const { randomBytes } = require('crypto')
const secp256k1 = require('secp256k1')
const bs58 = require('bs58')
var crypto = (self.crypto || self.msCrypto), QUOTA = 65536;

window.avalon = {
    config: {
        api: ['https://api.avalon.wtf']
    },
    init: (config) => {
        avalon.config = config
    },
    getAccount: (name, cb) => {
        fetch(avalon.randomNode()+'/account/'+name, {
            method: 'get',
            headers: {
              'Accept': 'application/json, text/plain, */*',
              'Content-Type': 'application/json'
            }
        }).then(res => res.json()).then(function(res) {
            cb(null, res)
        });
    },
    getAccounts: (names, cb) => {
        fetch(avalon.randomNode()+'/accounts/'+names.join(','), {
            method: 'get',
            headers: {
              'Accept': 'application/json, text/plain, */*',
              'Content-Type': 'application/json'
            }
        }).then(res => res.json()).then(function(res) {
            cb(null, res)
        });
    },
    getContent: (name, link, cb) => {
        fetch(avalon.randomNode()+'/content/'+name+'/'+link, {
            method: 'get',
            headers: {
              'Accept': 'application/json, text/plain, */*',
              'Content-Type': 'application/json'
            }
        }).then(res => res.json()).then(function(res) {
            cb(null, res)
        });
    },
    generateCommentTree(root, author, link) {
        var replies = []
        if (author == root.author && link == root.link) {
            var content = root
        } else {
            var content = root.comments[author+'/'+link]
        }
        if (!content || !content.child) return []
        for (var i = 0; i < content.child.length; i++) {
            var comment = root.comments[content.child[i][0]+'/'+content.child[i][1]]
            comment.replies = avalon.generateCommentTree(root, comment.author, comment.link)
            comment.ups = 0
            comment.downs = 0
            if (comment.votes) {
                for (let i = 0; i < comment.votes.length; i++) {
                    if (comment.votes[i].vt > 0)
                        comment.ups += comment.votes[i].vt
                    if (comment.votes[i].vt < 0)
                        comment.downs += comment.votes[i].vt
                }
            }
            comment.totals = comment.ups + comment.downs
            console.log(comment)
            replies.push(comment)
        }
        replies = replies.sort(function(a,b) {
            return b.totals-a.totals
        })
        return replies
    },
    getNewDiscussions: (cb) => {
        fetch(avalon.randomNode()+'/new', {
            method: 'get',
            headers: {
              'Accept': 'application/json, text/plain, */*',
              'Content-Type': 'application/json'
            }
        }).then(res => res.json()).then(function(res) {
            cb(null, res)
        });
    },
    randomBytes: (n) => {
        var a = new Uint8Array(n);
        for (var i = 0; i < n; i += QUOTA) {
        crypto.getRandomValues(a.subarray(i, i + Math.min(n - i, QUOTA)));
        }
        return a;
    },
    keypair: () => {
        let priv, pub
        do {
            priv = Buffer.from(avalon.randomBytes(32).buffer)
            pub = secp256k1.publicKeyCreate(priv)
        } while (!secp256k1.privateKeyVerify(priv))
    
        return {
            pub: bs58.encode(pub),        
            priv: bs58.encode(priv)
        }
    },
    pubToPriv: (priv) => {
        return bs58.encode(
                secp256k1.publicKeyCreate(
                    bs58.decode(priv)))
    },
    sign: (privKey, sender, tx) => {
        if (typeof tx !== 'object') {
            try {
                tx = JSON.parse(tx)
            } catch(e) {
                console.log('invalid transaction')
                return
            }
        }
        
        tx.sender = sender
        // add timestamp to seed the hash (avoid transactions reuse)
        tx.ts = new Date().getTime()
        // hash the transaction
        tx.hash = CryptoJS.SHA256(JSON.stringify(tx)).toString()
        // sign the transaction
        var signature = secp256k1.sign(new Buffer(tx.hash, "hex"), bs58.decode(privKey))
        tx.signature = bs58.encode(signature.signature)
        return tx
    },
    sendTransaction: (tx, cb) => {
        fetch(avalon.randomNode()+'/transact', {
            method: 'post',
            headers: {
              'Accept': 'application/json, text/plain, */*',
              'Content-Type': 'application/json'
            },
            body: JSON.stringify(tx)
        }).then(function(res) {
            cb(res.statusText)
        });
    },
    randomNode: () => {
        var nodes = avalon.config.api
        return nodes[Math.floor(Math.random()*nodes.length)]
    }
}
window.bind = {
    navbar: function() {
        var loginModal = navbar.getElementsByClassName('modal')[0]
        var closeModal = navbar.getElementsByClassName('modal-close')[0]
        var loginButton = navbar.getElementsByClassName('button login')[0]
        var loginConfirm = navbar.getElementsByClassName('button confirm')[0]
        var loginCancel = navbar.getElementsByClassName('button cancel')[0]

        if (!proxy.user)
            loginButton.onclick = () => loginModal.classList.add('is-active')
        closeModal.onclick = () => loginModal.classList.remove('is-active')
        loginCancel.onclick = () => loginModal.classList.remove('is-active')
        loginConfirm.onclick = () => login()

        function login() {
            var username = document.getElementById('inputLoginUser').value.trim()
            var key = document.getElementById('inputLoginKey').value.trim()
            if (!username || !key) throw "Need username AND key"
            avalon.getAccounts([username], function(err, result) {
                if (err) throw err;
                var chainuser = result[0]
                var user = {
                  privatekey: key
                }
                try {
                  user.publickey = avalon.pubToPriv(user.privatekey)
                } catch (e) {
                  throw "Wrong key"
                  return
                }

                if (chainuser.pub == user.publickey) {
                    user.username = username
                    user.balance = chainuser.balance
                    localStorage.setItem('user', JSON.stringify(user));
                    proxy.user = user
                    console.log('Logged in as '+proxy.user.username)
                    loginModal.classList.remove('is-active')
                    navbar.innerHTML = template('navbar.html', proxy)
                    bind.navbar()
                } else {
                    throw "Existing key but not matching username"
                }
            })
        }
    },
    submit: function() {
        var inputTitle = submit.getElementsByClassName('input')[0]
        var inputMessage = submit.getElementsByClassName('textarea')[0]
        var submitButton = submit.getElementsByClassName('button submit')[0]
        var cancelButton = submit.getElementsByClassName('button cancel')[0]

        submitButton.onclick = () => {
            if (!proxy.user || !proxy.user.privatekey || !proxy.user.username) {
                console.log('Needs to be logged in')
                navbar.getElementsByClassName('modal')[0].classList.add('is-active')
                return
            }
            var title = inputTitle.value
            var message = inputMessage.value
            var link = Math.random().toString(36).replace(/[^a-z]+/g, '').substr(0, 7);
            var content = {
                title: title,
                message: message,
                app: 'news'
            }
            var tx = {
                type: 4,
                data: {
                    link: link,
                    json: content
                }
            }
            tx = avalon.sign(proxy.user.privatekey, proxy.user.username, tx)
            submitButton.classList.add('is-loading')
            avalon.sendTransaction(tx, function(res) {
                submitButton.classList.remove('is-loading')
                console.log(res)
                inputTitle.value = ""
                inputMessage.value = ""
            })
        }
        cancelButton.onclick = () => {
            inputTitle.value = ""
            inputMessage.value = ""
        }
    },
    new: function() {
        
    },
    post: function() {
        var replyButton = post.getElementsByClassName('submit')[0]
        var replyMessage = post.getElementsByClassName('textarea')[0]

        replyButton.onclick = () => {
            if (!proxy.user || !proxy.user.privatekey || !proxy.user.username) {
                console.log('Needs to be logged in')
                navbar.getElementsByClassName('modal')[0].classList.add('is-active')
                return
            }
            var message = replyMessage.value
            var link = Math.random().toString(36).replace(/[^a-z]+/g, '').substr(0, 7);
            var content = {
                message: message,
                app: 'news'
            }
            var tx = {
                type: 4,
                data: {
                    pa: Router.getFragment().split('/')[1],
                    pp: Router.getFragment().split('/')[2],
                    link: link,
                    json: content
                }
            }
            tx = avalon.sign(proxy.user.privatekey, proxy.user.username, tx)
            replyButton.classList.add('is-loading')
            avalon.sendTransaction(tx, function(res) {
                replyButton.classList.remove('is-loading')
                console.log(res)
                replyMessage.value = ""
            })
        }
    },
    replies: function(item) {
        var replyDiv = item.parentElement.parentElement.parentElement
        if (replyDiv.getElementsByClassName('reply')[0].style.display == 'none') {
            replyDiv.getElementsByClassName('reply')[0].style.display = 'block'
            var replyButton = replyDiv.getElementsByClassName('submit')[0]
            var replyMessage = replyDiv.getElementsByClassName('textarea')[0]
    
            replyButton.onclick = () => {
                if (!proxy.user || !proxy.user.privatekey || !proxy.user.username) {
                    console.log('Needs to be logged in')
                    navbar.getElementsByClassName('modal')[0].classList.add('is-active')
                    return
                }
                var message = replyMessage.value
                var link = Math.random().toString(36).replace(/[^a-z]+/g, '').substr(0, 7);
                var content = {
                    message: message,
                    app: 'news'
                }
                var tx = {
                    type: 4,
                    data: {
                        pa: replyDiv.getAttribute("data-author"),
                        pp: replyDiv.getAttribute("data-link"),
                        link: link,
                        json: content
                    }
                }
                tx = avalon.sign(proxy.user.privatekey, proxy.user.username, tx)
                replyButton.classList.add('is-loading')
                avalon.sendTransaction(tx, function(res) {
                    replyButton.classList.remove('is-loading')
                    console.log(res)
                    replyMessage.value = ""
                    replyDiv.getElementsByClassName('reply')[0].style.display = 'none'
                })
            }
        }
        else
            replyDiv.getElementsByClassName('reply')[0].style.display = 'none'
    },
    arrows: {
        upvote: function(item) {
            if (!proxy.user || !proxy.user.privatekey || !proxy.user.username) {
                console.log('Needs to be logged in')
                navbar.getElementsByClassName('modal')[0].classList.add('is-active')
                return
            }
            var vt = window.prompt("How many vote tokens to spend on the upvote?", 1);
            var tx = {
                type: 5,
                data: {
                    author: item.getAttribute("data-author"),
                    link: item.getAttribute("data-link"),
                    vt: parseInt(vt)
                }
            }
            tx = avalon.sign(proxy.user.privatekey, proxy.user.username, tx)
            avalon.sendTransaction(tx, function(res) {
                console.log(res)
            })
        },
        downvote: function(item) {
            if (!proxy.user || !proxy.user.privatekey || !proxy.user.username) {
                console.log('Needs to be logged in')
                navbar.getElementsByClassName('modal')[0].classList.add('is-active')
                return
            }
            var vt = window.prompt("How many vote tokens to spend on the downvote?", 1);
            var tx = {
                type: 5,
                data: {
                    author: item.getAttribute("data-author"),
                    link: item.getAttribute("data-link"),
                    vt: -parseInt(vt)
                }
            }
            tx = avalon.sign(proxy.user.privatekey, proxy.user.username, tx)
            avalon.sendTransaction(tx, function(res) {
                console.log(res)
            })
        }
    }
}


template.defaults.imports.percent = function(float) {
    return Math.round(10000*float)/100
}
template.defaults.imports.arrayLength = function(array) {
    if (!array || !array.length)
        return 0;
    return array.length
}
template.defaults.imports.isPlural = function(array) {
    if (!array || !array.length)
        return false
    if (array.length > 1)
        return true
    else
        return false
}
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
