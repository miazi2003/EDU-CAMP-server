const express = require("express");
const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
const app = express();
const port = process.env.PORT || 3000;
const cors = require("cors");
require("dotenv").config();

app.use(cors());

app.use(express.json());

const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.3crt5al.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0`;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});

async function run() {
  try {
    const database = client.db("edu-camp");
    const createCollection = database.collection("assignment-create");
    const submittedCollection = database.collection("assignment-submit");

    app.get("/createAssignment", async (req, res) => {
      const cursor = createCollection.find();
      const result = await cursor.toArray();
      res.send(result);
    });

    app.post("/createAssignment", async (req, res) => {
      const newAssignment = req.body;

      const result = await createCollection.insertOne(newAssignment);
      res.send(result);
    });

    app.post("/deleteAssignment/:id", async (req, res) => {
      const id = req.params.id;
      const userEmail = req.body.email;
      console.log(userEmail);
      const query = {
        _id: new ObjectId(id),
        email: userEmail,
      };
      const result = await createCollection.deleteOne(query);
      res.send(result);
    });

    app.get("/viewAssignment/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const result = await createCollection.findOne(query);
      res.send(result);
    });

    app.get("/allAssignment/:id", async (req, res) => {
      const id = req.params.id;
 

      const result = await createCollection.findOne({ _id: new ObjectId(id) });
 
      res.send(result);
    });

    app.post("/submittedAssignment", async (req, res) => {
      const newSubmit = req.body;

      const { email, assignmentId } = newSubmit;

      const exist = await submittedCollection.findOne({ email, assignmentId });
      console.log(exist);
      if (exist) {
        return res
          .status(409)
          .send({ message: "you have already submitted this assignment" });
      }

      const result = await submittedCollection.insertOne(newSubmit);

      res.send(result);
    });

    app.get("/submittedAssignment", async (req, res) => {
      const email = req.query.email;
      console.log(email);
      const query = { email: email };
      const result = await submittedCollection.find(query).toArray();
      res.send(result);
    });

    app.put("/updateAssignment/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const newAssignment = req.body;
      console.log(newAssignment)
      const updateDoc = {
        $set: newAssignment,
      };
      const option = { upsert: true };
      const result = await createCollection.updateOne(query, updateDoc, option);
      res.send(result);
    });

    // Connect the client to the server	(optional starting in v4.7)
    await client.connect();
    // Send a ping to confirm a successful connection
    await client.db("admin").command({ ping: 1 });
    console.log(
      "Pinged your deployment. You successfully connected to MongoDB!"
    );
  } finally {
  }
}
run().catch(console.dir);

app.get("/", (req, res) => {
  console.log("server running");
  res.send("server is cooking for eduCamp");
});

app.listen(port, () => {
  console.log("server running on ", port);
});
