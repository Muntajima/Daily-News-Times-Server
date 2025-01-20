require('dotenv').config()
const express = require('express');
const cors = require('cors');
const app = express();
const port = process.env.PORT || 5000;

const { MongoClient, ServerApiVersion, ObjectId, MongoCryptAzureKMSRequestError } = require('mongodb');

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
    const userCollection = client.db('newsDB').collection('users');
    const publisherCollection = client.db('newsDB').collection('publishers');

    // users db
    app.get('/users', async(req, res) =>{
      const cursor = userCollection.find();
      const result = await cursor.toArray();
      res.send(result);
    })

    app.post('/users', async(req, res) =>{
      const newUser = req.body;
      console.log('new user: ', newUser);

      const query = {email: newUser.email}
      const existingUser = await userCollection.findOne(query)
      if(existingUser) {
        returnres.send({message: "User already existed", insertedId: null})
      }
      const result = await userCollection.insertOne(newUser);
      res.send(result);
    })

    app.patch('/users/:id/make-admin', async(req, res) =>{
      const userId = req.params.id;
      const result = await userCollection.updateOne(
        {_id: new ObjectId(userId)},
        {$set: {role: 'admin'}}
      );
      res.send(result);
    })

    //news apis
    app.get('/news', async(req, res) =>{
        const result = await newsCollection.find().toArray();
        res.send(result);
    })

    //publisher apis
    app.get('/publishers', async(req, res) =>{
      const result = await newsCollection.find().toArray();
      res.send(result);
  })

    app.post('/publishers', async(req, res) =>{
      const newPublisher = req.body;
      console.log('new publisher: ', newPublisher);
      const result = await publisherCollection.insertOne(newPublisher);
      res.send(result);
    })
   
    // // Send a ping to confirm a successful connection
    //await client.db("admin").command({ ping: 1 });
    console.log("Pinged your deployment. You successfully connected to MongoDB!");
  } 
  catch {
  }
}
run();

app.get('/', (req, res) =>{
    res.send('news is waiting')
})
app.listen(port, () =>{
    console.log(`daily news is sitting on port: ${port}` )
})