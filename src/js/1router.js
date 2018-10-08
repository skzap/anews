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
            results[i].totals = results[i].ups - results[i].downs
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
        content.totals = content.ups - content.downs
        console.log(content)
        document.getElementById('content').innerHTML = template('post.html', content)
        bind.post()
    })
})
.add(function() {
    document.getElementById('content').innerHTML = template('404.html', {})
})
.listen()