//------------- Express setup ----------------
console.log("============================================================");
console.log(new Date().toISOString() + " - Starting");
const express = require("express");
const app = express();

//-------------Body Parser---------------------
const bodyParser = require('body-parser')
app.use(bodyParser.json({
    limit: "5000mb"
}))

//------------ Static Files -------------------
app.use(express.static("public"));
app.use('/styles', express.static('./public/styles'))
app.use('/libs', express.static('./public/libs'))
app.use('/img', express.static('./public/img'))

//-------------- Set Views --------------------
app.set('views', './views')
app.set('view engine', 'ejs')

//--------------- Routes ----------------------
const fileUpload = require('express-fileupload');
app.use(fileUpload({
    useTempFiles : true,
    tempFileDir : '/tmp/'
}));  
const Data = require('./models/Data')
const dirRoutes = './routes'
const uploadRoute = require(dirRoutes+'/uploadData')
const plotRoute = require(dirRoutes+'/plotData')
const deleteRoute = require(dirRoutes+'/deleteData')

app.use('/upload', uploadRoute)
app.use('/plot', plotRoute)
app.use('/delete', deleteRoute)

app.get('', async (req, res) => {
    try{
        const files = await Data.find({time: 0, level: 0}).select('title');
        res.render('index', {data:{files:files, plot:false}})
    }catch(error){
        res.json({"error": error})
    }
})

//------------ DB connection ------------------
const mongoose = require('mongoose')
const url = 'mongodb://127.0.0.1:27017'
mongoose.connect(url, {
    useNewUrlParser: true,
}, (error, result) => {
    console.log("============================================================");
    if (error)
        console.log('Can not connect to DB!', error)
    console.log('Connected to DB')
})
//---------------------------------------------

const port = 2115;
app.listen(port);
console.log("Listening on port " + port + "...");
 

