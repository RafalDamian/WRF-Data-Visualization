const express = require('express')
const router = express.Router();
const Data = require('../models/Data')

router.get('/:dataID', async (req, res) => {
    id = req.params.dataID
    try{
        const data = await Data.findById(id); 
        let ids = []
        let id_i = []
        for(l=0; l<data.nlevels; l++){
            ids[l] = []
            for(t=0; t<data.ntimes; t++){
                    id_i = await Data.find({title: data.title,
                                         level: l, time: t}).select(['_id'])
                    ids[l].push(id_i[0]['_id'])
                    }}
        const files = await Data.find({time: 0, level: 0}).select('title');
        res.render("plot", { data: {data: data, ids: ids, files: files, 
                                    units: data.units, plot:true}})
    }catch(error){
        res.json({"error": error})
    }
})

module.exports = router