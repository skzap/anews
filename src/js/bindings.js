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

