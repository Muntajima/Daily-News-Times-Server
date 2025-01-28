require('dotenv').config()
const express = require('express');
const cors = require('cors');
const app = express();
const jwt = require('jsonwebtoken');
const port = process.env.PORT || 5000;
const UserModel = require('./models/User');

//middlewear
app.use(cors());
app.use(express.json());

const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');

const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.oi99s.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0`;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  }
});
//console.log("Database URI:", uri);
async function run() {
  try {
    //await client.connect();
    //news apis
    const db = client.db('newsDB');
    const userModel = new UserModel(db);
    const newsCollection = db.collection('news');
    const userCollection = db.collection('users');
    const publisherCollection = db.collection('publishers');

    //create jwt
    app.post("/jwt", async (req, res) => {
      const user = req.body;
      const token = jwt.sign(user, process.env.SECURITY_PASS, { expiresIn: "1h" });
      res.send({ token });
    });

    // Middleware
    const verifyToken = (req, res, next) => {
      const authHeader = req.headers.authorization;
      if (!authHeader) {
        return res.status(401).json({ message: "No token provided" });
      }
      const token = authHeader.split(" ")[1];
      jwt.verify(token, process.env.SECURITY_PASS, (err, decoded) =>{
        if(err){
          return res.status(401).json({ message: "Forbidden access!" });
        }
        req.decoded = decoded;
        next();
      })
    }

    const verifyAdmin = async (req, res, next) => {
      const authHeader = req.headers.authorization;
      if (!authHeader) {
        return res.status(401).json({ message: "No token provided" });
      }
      const token = authHeader.split(" ")[1];

      try {
        const decoded = jwt.verify(token, process.env.secret_key);
        req.user = decoded;

        const user = await userCollection.findOne({ email: req.decoded.email });
        if (!user || user.role !== "admin") {
          return res
            .status(403)
            .send({ message: "Forbidden access: Admins only" });
        }

        next();
      } catch (error) {
        res.status(403).json({ message: "Invalid or expired token" });
      }
    };

    // users db
    app.get('/users',  async (req, res) => {
      console.log(req.headers);
      const cursor = userCollection.find();
      const result = await cursor.toArray();
      res.send(result);
    })

    app.post('/users', async (req, res) => {
      const newUser = req.body;
      console.log('new user: ', newUser);

      const query = { email: newUser.email }
      const existingUser = await userCollection.findOne(query)
      // if (existingUser) {
      //   express.return.send({ message: "User already existed", insertedId: null })
      // }
      const result = await userCollection.insertOne(newUser);
      res.send(result);
    })

    app.patch('/users/:id/make-admin', verifyAdmin, verifyToken, async (req, res) => {
      const userId = req.params.id;
      const result = await userCollection.updateOne(
        { _id: new ObjectId(userId) },
        { $set: { role: 'admin' } }
      );
      res.send(result);
    })
    app.get('/adminUser',  async(req, res) =>{
      const email = req.query.email;
      try{
        const user = await userCollection.findOne({email});
        if(!user) {
          return res.status(404).json({ message: "User not found" });
        }
        res.json(user)
      }
      catch (error) {
        res.status(500).json({ error: "Error fetching user" });
      }
    });

    //news apis
    app.get('/news', async (req, res) => {
      const result = await newsCollection.find().toArray();
      res.send(result);
    })
    app.post('/news', async (req, res) => {
      const newArticle = req.body;
      console.log('new article: ', newArticle);

      const result = await newsCollection.insertOne(newArticle);
      res.send(result);
    })

    //publisher api
    app.get('/publishers',  async (req, res) => {
      const result = await publisherCollection.find().toArray();
      res.send(result);
    })

    app.post('/publishers', async (req, res) => {
      const newPublisher = req.body;
      console.log('new publisher: ', newPublisher);
      const result = await publisherCollection.insertOne(newPublisher);
      res.send(result);
    })

    //for all article all user

    app.get('/news', verifyAdmin, async (req, res) => {
      const { search = "", publisher = "", tags = "" } = req.body.query;

      console.log("Query received:", req.query);
      res.json({ message: "Request successful", query: req.query });

      const filter = {
        status: "approved", // Fetch only approved articles
      };

      if (search) {
        filter.title = { $regex: search, $options: "i" }; // Case-insensitive search for title
      }

      if (publisher) {
        filter.publisher = publisher; // Exact match for publisher
        console.log(publisher)
      }

      if (tags) {
        filter.tags = { $in: tags.split(",") }; // Match any of the provided tags
        console.log(tags)
      }

      try {
        const articles = await newsCollection.find(filter).toArray();
        res.send(articles);
      } catch (error) {
        console.error("Error fetching articles:", error);
        res.status(500).json({ message: "Error fetching articles" });
      }
    });

    //details page
    app.get('/news/:id', async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) }
      const result = await newsCollection.findOne(query)
      console.log(result);
      res.send(result);
    })

    // detail page view increment
    app.patch('/news/:id/increment-views', async (req, res) => {
      const id = req.params.id;
      try {
        const result = await newsCollection.updateOne(
          { _id: new ObjectId(id) },
          { $inc: { views: 1 } }
        );
        if (result.modifiedCount === 1) {
          res.status(200).json({ message: "View count incremented successfully" });
        } else {
          res.status(404).json({ message: "Article not found" });
        }
      } catch (error) {
        console.error("Error incrementing view count:", error);
        res.status(500).json({ message: "Error incrementing view count" });
      }
    });

    /**
    * Payment API: Update User Subscription
    */
    // Backend route to handle user registration/login
    const User = require('./models/User'); // Adjust path as necessary

    app.post('/users', async (req, res) => {
      const { name, email, photoURL, password, firebaseUid } = req.body;

      try {
        // Check if the user already exists
        let user = await User.findOne({ firebaseUid });

        if (!user) {
          // If the user does not exist, create a new user
          user = new User({
            name,
            email,
            photoURL,
            password,
            firebaseUid
            // Other fields like name, etc.
          });

          await user.save();
        }

        res.status(200).json({ success: true, userId: user._id });
      } catch (error) {
        res.status(500).json({ success: false, message: error.message });
      }
    });


    app.get('/users/:id', async (req, res) => {
      const id = req.query.id;
      const query = { firebaseUid: id }
      const cursor = userCollection.find(query);
      const result = await cursor.toArray();
      res.send(result);
    })
    app.post('/users/:id', async (req, res) => {
      console.log('Payment request received for:', req.params.firebaseUid);
      //const { firebaseUid } = req.params; // Use firebaseUid from the URL parameter
      const { firebaseUid, subscriptionType, period } = req.body;

      try {
        const user = await User.findOne({ firebaseUid }); // Find user by firebaseUid

        if (!user) {
          return res.status(404).json({ success: false, message: 'User not found' });
        }

        // Handle the payment logic here...

        res.status(200).json({ success: true, message: 'Payment processed successfully' });
      } catch (error) {
        res.status(500).json({ success: false, message: error.message });
      }


      // Calculate subscription expiry date
      const currentDate = new Date();
      let expiryDate = null;

      // Map subscription period to time
      if (period === "1") {
        expiryDate = new Date(currentDate.getTime() + 1 * 60 * 1000); // 1 minute
      } else if (period === "5") {
        expiryDate = new Date(currentDate.getTime() + 5 * 24 * 60 * 60 * 1000); // 5 days
      } else if (period === "10") {
        expiryDate = new Date(currentDate.getTime() + 10 * 24 * 60 * 60 * 1000); // 10 days
      } else {
        return res.status(400).json({ success: false, message: "Invalid subscription period" });
      }

      // Update user's subscription in the database
      const updateResult = await userCollection.updateOne(
        { firebaseUid: firebaseUid },  // Use firebaseUid to find the user
        {
          $set: {
            premiumExpiry: expiryDate,
            premiumPlan: plan,
            premiumTaken: expiryDate
          }
        }
      );

      if (updateResult.modifiedCount === 1) {
        res.status(200).json({ success: true, message: "Payment successful", expiryDate });
      } else {
        res.status(500).json({ success: false, message: "Failed to update subscription" });
      }


    });



    /**
     * Check Premium Status for a User
     */
    // Check Premium Status for a User
    app.get('/users/:id/premium-status', async (req, res) => {
      const userId = req.params.id;

      try {
        const user = await userCollection.findOne({ firebaseUid: userId });
        if (!user) {
          return res.status(404).json({ success: false, message: "User not found" });
        }

        // Determine if the user has a valid premium subscription
        const isPremium = user.premiumExpiry && new Date(user.premiumExpiry) > new Date();
        res.status(200).send({ success: true, isPremium, premiumExpiry: user.premiumExpiry });
      } catch (error) {
        console.error("Error checking premium status:", error);
        res.status(500).json({ success: false, message: "Error checking premium status" });
      }
    });



    app.patch('/news/:id/approve', async (req, res) => {
      const articleId = req.params.id;

      const article = await newsCollection.findOne({ _id: new ObjectId(articleId) });

      const result = await newsCollection.updateOne(
        { _id: new ObjectId(articleId) },
        { $set: { status: 'approved' } }
      );
      res.send(result);
    }
    );

    app.patch('/news/:id/decline', async (req, res) => {
      const articleId = req.params.id;
      const { reason } = req.body; // Reason for declining

      const result = await newsCollection.updateOne(
        { _id: new ObjectId(articleId) },
        { $set: { status: 'declined', declineReason: reason } }
      );
      res.send(result);
    });

    app.delete('/news/:id', async (req, res) => {
      const articleId = req.params.id;
      const result = await newsCollection.deleteOne({ _id: new ObjectId(articleId) });
      res.send(result);
    }
    );

    app.patch('/news/:id/premium', async (req, res) => {
      const articleId = req.params.id;

      const result = await newsCollection.updateOne(
        { _id: new ObjectId(articleId) },
        { $set: { isPremium: true } }
      );
      res.send(result);

    });
    
    //update my profile
    app.put('/users', async (req, res) => {
      const { userId, displayName, photoURL } = req.body;
     
      console.log(req.body)
         
      try {
        const updatedUser = await userCollection.updateOne(
          { _id: new ObjectId(userId) },
          { $set: { displayName, photoURL } }
          
        );
    
        if (!updatedUser) {
          return res.status(404).json({ error: "User not found" });
        }
    
        res.send(updatedUser);
      } catch (error) {
        console.error("Error updating profile:", error);
        res.status(500).json({ error: "Internal server error" });
      }
    });
     
    //admin stats
    app.get('/admin-stats', async(req, res) =>{
      try {
        const users = await userCollection.estimatedDocumentCount();
        const news = await newsCollection.estimatedDocumentCount();
        const publishers = await publisherCollection.estimatedDocumentCount();

        res.send({ users, news, publishers });
      } catch (error) {
        console.error(error);
        res.status(500).send({ error: 'Server error' });
      }
    })

    app.get('/news', async (req, res) => {
      const result = await newsCollection.find().toArray();
      res.send(result);
    })
    //for line chart
    app.get('/news/authors-with-news', async (req, res) => {
      try {
        const authorNewsCount = await userCollection.aggregate([
          {
            $lookup: {
              from: 'news', // The name of the news collection
              localField: 'email',
              foreignField: 'authorEmail',
              as: 'authorNews',
            },
          },
          {
            $project: {
              name: 1,
              email: 1,
              newsCount: { $size: '$authorNews' },
            },
          },
        ]).toArray();
    
        res.status(200).json(authorNewsCount);
      } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Error fetching author data' });
      }
    });

    //my article
    app.get("/my-article", async (req, res) => {
      const { email } = req.query;
    
      try {
        const articles = await newsCollection.find({ authorEmail: email }).toArray();
        res.send(articles);
      } catch (error) {
        console.error("Error fetching articles:", error);
        res.status(500).send({ error: "Failed to fetch articles" });
      }
    });
    
    // Delete an article by ID
    app.delete("/news/:id", async (req, res) => {
      const { id } = req.params;
    
      try {
        const result = await newsCollection.deleteOne({ _id: id });
        if (result.deletedCount > 0) {
          res.status(200).send({ message: "Article deleted successfully." });
        } else {
          res.status(404).send({ error: "Article not found." });
        }
      } catch (error) {
        console.error("Error deleting article:", error);
        res.status(500).json({ error: "Failed to delete article" });
      }
    });

    // Update article by ID
app.put("/news/:id", async (req, res) => {
  const { id } = req.params;
  const { title, description, isPremium } = req.body;
console.log(title, description)
  try {
    // Find and update the article
    const result = await newsCollection.updateOne(
      { _id: new ObjectId(id) },  
      {
        $set: { 
          title,
          description,
          isPremium,
        },
      }
    );
    res.send(result);

   
  } catch (error) {
    console.error("Error updating article:", error);
    res.status(500).json({ message: "Internal server error" });
  }
});

    // // Send a ping to confirm a successful connection
    // await client.db("admin").command({ ping: 1 });
    // console.log("Pinged your deployment. You successfully connected to MongoDB!");
  }
  catch (error) {
    console.error("Error connecting to MongoDB:", error);
    process.exit(1); // Stop further execution if connection fails
  }
}
run();

app.get('/', (req, res) => {
  res.send('news is waiting')
})
app.listen(port, () => {
  console.log(`daily news is sitting on port: ${port}`)
})