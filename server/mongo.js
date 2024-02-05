
const express = require('express')
const  mongoose = require('mongoose')
const app = express()
app.use(express.json())

mongoose.connect('mongodb://localhost:27017/newDb')

const userSchema =new mongoose.Schema({
    id:Number,
    price: Number,
    description: String,
    category: String,
    image:String,
    solid:Boolean,
    dataOfSale:String,
    title:String
})


const userModel =  mongoose.model('newTable',userSchema)

async function fetchData() {
  const apiUrl = 'https://s3.amazonaws.com/roxiler.com/product_transaction.json';

  try {
    const response = await fetch(apiUrl);

    // Check if the request was successful (status code 200)
    if (!response.ok) {
      throw new Error(`HTTP error! Status: ${response.status}`);
    }

    // Parse the response body as JSON
    const data = await response.json();
    newData = data 
    await userModel.create(data);
    // Process the fetched data
    console.log('Fetched data successfully:');
  } catch (error) {
    console.error('Fetch error:', error.message);
  }
}

fetchData();

app.listen(3000,()=>{
    console.log("server started at http://localhost:3000")
})

app.get('/getData',async(req,res)=>{


  console.log('request',req)
    const query = {};

    let skip = 1
    let limit = 10

    if (req.query.title !== undefined && req.query.title !== '') {
      query.title = req.query.title;
    }

    if (req.query.description !== undefined && req.query.description !== '') {
      query.description = req.query.description;
    }

    if (req.query.price !== undefined && req.query.price !== '') {
      query.price = req.query.price;
    }
    if (req.query.skip !== undefined && req.query.skip !== '') {
      query.skip = req.query.skip;
    }

    if (req.query.limit !== undefined && req.query.limit !== '') {
      query.limit = req.query.limit;
    }
    console.log(query)

    
   
    const result = await userModel.find(query).skip(skip).limit(limit)
    
    res.send(result)
    

})


app.get('/getStatistics',async(req,res)=>{
  
})