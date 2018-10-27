var markdown = require( "markdown" ).markdown
var xss = require("xss")
var moment = require("moment")

class GrowInt {
    constructor(raw, config) {
        if (!config.min)
            config.min = Number.MIN_SAFE_INTEGER
        if (!config.max)
            config.max = Number.MAX_SAFE_INTEGER
        this.v = raw.v
        this.t = raw.t
        this.config = config
    }

    grow(time) {
        if (time < this.t) return
        if (this.config.growth == 0) return {
            v: this.v,
            t: time
        }

        var tmpValue = this.v
        tmpValue += (time-this.t)*this.config.growth
        
        if (this.config.growth > 0) {
            var newValue = Math.floor(tmpValue)
            var newTime = Math.ceil(this.t + ((newValue-this.v)/this.config.growth))
        } else {
            var newValue = Math.ceil(tmpValue)
            var newTime = Math.floor(this.t + ((newValue-this.v)/this.config.growth))
        }

        if (newValue > this.config.max)
            newValue = this.config.max

        if (newValue < this.config.min)
            newValue = this.config.min

        return {
            v: newValue,
            t: newTime
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
template.defaults.imports.markdown = function(raw) {
    return filterXSS(markdown.toHTML(raw))
}
template.defaults.imports.growBandwidth = function(raw) {
    return new GrowInt(raw, {growth:proxy.user.balance/(60000), max:1048576})
        .grow(new Date().getTime()).v
}
template.defaults.imports.growVoteTokens = function(raw, balance) {
    return new GrowInt(raw, {growth:proxy.user.balance/(3600000)})
        .grow(new Date().getTime()).v
}
template.defaults.imports.formatKb = function(num) {
    return Math.floor(num/1024)+'KB'
}
template.defaults.imports.cuteNumber = function(num, digits) {
    if (typeof digits === 'undefined') digits = 2
    var units = ['K', 'M', 'G', 'T', 'P', 'E', 'Z', 'Y']
    var decimal
    var newNum = num

    for(var i=units.length-1; i>=0; i--) {
        decimal = Math.pow(1000, i+1)

        if(num <= -decimal || num >= decimal) {
            newNum = +(num / decimal).toFixed(digits) + units[i]
            break
        }
    }
    var limit = (newNum<0 ? 5 : 4)
    if (newNum.toString().length > limit && digits>0)
        return template.defaults.imports.cuteNumber(num, digits-1)

    return newNum;
}
template.defaults.imports.formatTime = function(id) {
    var date = new Date(parseInt( id.toString().substring(0,8), 16 ) * 1000)
    return moment(date).fromNow()
}