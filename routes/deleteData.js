const express = require('express')
const router = express.Router();
const Data = require('../models/Data')

router.get('/:dataID', async (req, res) => {
    id = req.params.dataID
    try{
        const data = await Data.remove({_id: id});
        res.json(data)
    }catch(error){
        res.json({"error": error})
    }
})
module.exports = router