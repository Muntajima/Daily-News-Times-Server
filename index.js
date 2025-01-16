require('dotenv').config()
const express = require('express');
const cors = require('cors');
const app = express();
const port = process.env.PORT || 5000;

const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');

//middlewear
app.use(cors());
app.use(express.json());



const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.oi99s.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0`;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  }
});

async function run() {
  try {
    await client.connect();
    //news apis
    const newsCollection = client.db('newsDB').collection('news');

    app.get('/news', async(req, res) =>{
        const result = await newsCollection.find().toArray();
        res.send(result);
    })

   
    // // Send a ping to confirm a successful connection
    await client.db("admin").command({ ping: 1 });
    console.log("Pinged your deployment. You successfully connected to MongoDB!");
  } 
  catch {
  }
}
run().catch(console.dir);

app.get('/', (req, res) =>{
    res.send('news is waiting')
})
app.listen(port, () =>{
    console.log(`daily news is sitting on port: ${port}` )
})