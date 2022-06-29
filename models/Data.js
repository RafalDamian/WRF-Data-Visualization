const { MongoExpiredSessionError } = require('mongodb')
const mongoose = require('mongoose')

const DataSchema = mongoose.Schema({
    title:{type: String,require: true},
    wind: {type: {}, require: true},
    vars: {type: {}, require: true},
    time: {type: Number, require: true},
    ntimes: {type: Number, require: true},
    date: {type: String, require: true},
    date_uploaded: {type: Date, defoult: Date.now},
    level: {type: Number, require: true},
    nlevels: {type: Number, require: true},
    header: {type: {}, require: true}, 
}, {strict: false})

module.exports = mongoose.model('Data', DataSchema)