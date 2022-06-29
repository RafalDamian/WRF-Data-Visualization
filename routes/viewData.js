const express = require('express')
const router = express.Router();
const Data = require('../models/Data')

router.get('/', async (req, res) => {
    try{
        const data = await Data.find().select('title');
        res.render('browse', {data})
    }catch(error){
        res.json({"error": error})
    }
})

module.exports = router