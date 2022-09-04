const express = require('express')
const router = express.Router()
const Data = require('../models/Data')
const fs = require('fs');
const { json, header } = require('express/lib/response');


router.get('/', (req, res) => {
    res.render('upload')
})

router.post('/', async (req, res) => {
    const vars = req.body.vars; 
    let data1 = {
        title: req.body.title,
        date: req.body.date, //yyyy-mm-dd
        wind: req.body.wind,
        level: req.body.level,
        nlevels: req.body.nlevels,
        time: req.body.time,
        ntimes: req.body.ntimes,
        stime: req.body.ntimes,
        vars: vars,
        header: req.body.header,
        units: req.body.units
    }
    for (let i in vars){
        data1[vars[i]] = req.body[vars[i]]
    }
    const data = new Data(data1)
    console.log(data)
    try{
        const dataSaved = await data.save()
        res.json(dataSaved)
    }catch(error){
        res.json({"error": error})
    }
})
 
module.exports = router