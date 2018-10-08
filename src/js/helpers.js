template.defaults.imports.percent = function(float) {
    return Math.round(10000*float)/100
}
template.defaults.imports.length = function(array) {
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