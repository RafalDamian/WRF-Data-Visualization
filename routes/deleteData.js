const express = require('express')
const router = express.Router();
const Data = require('../models/Data')

router.get('/:dataID', async (req, res) => {
    id = req.params.dataID
    try{
        const title = await Data.findById(id).select(['title']);
        await Data.remove({title: title.title})
        const files = await Data.find({time: 0, level: 0}).select('title');
        res.render('delete', {title: title, data:{files:files, plot:false}})
    }catch(error){
        res.json({"error": error})
    }
})
module.exports = router